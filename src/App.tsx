import { useEffect, lazy, Suspense, useRef, useMemo } from 'react';
import { TopBar } from './components/layout/TopBar';
import { LeftPanel } from './components/layout/LeftPanel';
import { WorldMap } from './components/map/WorldMap';
import { ParchmentToastContainer } from './components/common/ParchmentToastContainer';
import { ParchmentConfirmModal } from './components/common/ParchmentConfirmModal';
import { EndgameModal } from './components/common/EndgameModal';
import { TimelineWheelScrubber } from './components/layout/topbar/TimelineWheelScrubber';
import { useGameStore } from './store/gameStore';

// Code-splitting các modal chiến thuật & danh tướng có kích thước lớn để tăng tốc tải trang
const GeneralsModal = lazy(() => import('./components/generals/GeneralsModal').then(m => ({ default: m.GeneralsModal })));
const TacticalFormationModal = lazy(() => import('./components/army/TacticalFormationModal').then(m => ({ default: m.TacticalFormationModal })));

function App() {
  const isPaused = useGameStore(state => state.isPaused);
  const gameSpeed = useGameStore(state => state.gameSpeed);
  const isWarMode = useGameStore(state => state.isWarMode);
  const canhHour = useGameStore(state => state.canhHour);
  const setWarMode = useGameStore(state => state.setWarMode);
  const tick = useGameStore(state => state.tick);
  const tickCanh = useGameStore(state => state.tickCanh);
  const stepArmies = useGameStore(state => state.stepArmies);
  const formations = useGameStore(state => state.formations);

  // Tự động kích hoạt Chế độ Chiến Sự khi có đạo quân xuất trận (marching / retreating, không tính cắm trại)
  const hasActiveMarching = useMemo(() => {
    return formations.some(f => (f.status === 'marching' || f.status === 'retreating') && Boolean(f.marchOrder));
  }, [formations]);

  const prevMarchingRef = useRef(false);

  useEffect(() => {
    if (hasActiveMarching && !prevMarchingRef.current) {
      if (!isWarMode) {
        setWarMode(true);
      }
    }
    prevMarchingRef.current = hasActiveMarching;
  }, [hasActiveMarching, isWarMode, setWarMode]);

  // Vòng lặp thời gian: Trong Chiến Sự đếm theo Canh Giờ (1 ngày = 12 canh giờ), bình thường đếm theo ngày
  useEffect(() => {
    if (isPaused) return;

    if (isWarMode) {
      // Mỗi 1000ms / speed trôi qua 1 Canh Giờ (1/12 ngày)
      const canhInterval = Math.max(25, Math.round(1000 / Math.max(1, gameSpeed)));
      const intervalId = setInterval(() => {
        tickCanh();
      }, canhInterval);
      return () => clearInterval(intervalId);
    } else {
      // Chế độ hòa bình: 1000ms / speed trôi qua 1 Ngày
      const tickInterval = Math.max(16, Math.round(1000 / Math.max(1, gameSpeed)));
      const intervalId = setInterval(() => { 
        tick(); 
      }, tickInterval);
      return () => clearInterval(intervalId);
    }
  }, [isPaused, isWarMode, gameSpeed, tick, tickCanh]);

  // Vòng lặp bước đi mượt mà của đạo quân (đồng bộ tốc độ theo Canh Giờ khi ở Chế độ Chiến Sự)
  // Ban đêm (5 Canh: Giờ Tuất index 10, Hợi 11, Tý 0, Sửu 1, Dần 2 -> từ 19:00 đến 05:00 sáng hôm sau):
  // Nghĩa quân tạm hạ trại nghỉ ngơi qua đêm, không tiếp tục hành quân cho đến khi bình minh (Giờ Mão 05:00)
  useEffect(() => {
    if (isPaused) return;

    const isNightTime = isWarMode && (canhHour >= 10 || canhHour <= 2);
    if (isNightTime) return; // Tạm dừng bước chân hành quân khi đêm xuống để hạ trại nghỉ ngơi

    const stepMs = 50; // Tần số 20 FPS cho bước di chuyển mượt mà
    // Nếu ở Chiến Sự: 1 giây thực = 1 canh giờ = 1/12 ngày (nhân gameSpeed)
    // Nếu ở Ngày thường: 1 giây thực = 1 ngày (nhân gameSpeed)
    const dayFractionPerSec = isWarMode ? (1 / 12) : 1;
    const deltaDays = (stepMs / 1000) * dayFractionPerSec * Math.max(1, gameSpeed);

    const armyInterval = setInterval(() => {
      stepArmies(deltaDays);
    }, stepMs);
    return () => clearInterval(armyInterval);
  }, [isPaused, isWarMode, canhHour, gameSpeed, stepArmies]);

  return (
    <div className="w-screen h-screen overflow-hidden relative bg-stone-950 select-none">
      <WorldMap />
      <TopBar />
      <TimelineWheelScrubber />
      <LeftPanel />
      <Suspense fallback={null}>
        <GeneralsModal />
        <TacticalFormationModal />
      </Suspense>
      <ParchmentToastContainer />
      <ParchmentConfirmModal />
      <EndgameModal />
    </div>
  );
}

export default App;
