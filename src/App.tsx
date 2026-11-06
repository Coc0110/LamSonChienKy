import { useEffect, lazy, Suspense, useRef, useMemo } from 'react';
import { TopBar } from './components/layout/TopBar';
import { LeftPanel } from './components/layout/LeftPanel';
import { WorldMap } from './components/map/WorldMap';
import { ParchmentToastContainer } from './components/common/ParchmentToastContainer';
import { ParchmentConfirmModal } from './components/common/ParchmentConfirmModal';
import { EndgameModal } from './components/common/EndgameModal';
import { RefugeeIntakeModal } from './components/common/RefugeeIntakeModal';
import { TimelineWheelScrubber } from './components/layout/topbar/TimelineWheelScrubber';
import { useGameStore } from './store/gameStore';
import { useUIStore } from './store/uiStore';

// Code-splitting các modal chiến thuật & danh tướng có kích thước lớn để tăng tốc tải trang
const GeneralsModal = lazy(() => import('./components/generals/GeneralsModal').then(m => ({ default: m.GeneralsModal })));
const TacticalFormationModal = lazy(() => import('./components/army/TacticalFormationModal').then(m => ({ default: m.TacticalFormationModal })));

function App() {
  const isPaused = useGameStore(state => state.isPaused);
  const timeMode = useGameStore(state => state.timeMode);
  const setTimeMode = useGameStore(state => state.setTimeMode);
  const enterAutoPause = useGameStore(state => state.enterAutoPause);
  const exitAutoPause = useGameStore(state => state.exitAutoPause);
  const isWarMode = useGameStore(state => state.isWarMode);
  const canhHour = useGameStore(state => state.canhHour);
  const tick = useGameStore(state => state.tick);
  const tickCanh = useGameStore(state => state.tickCanh);
  const stepArmies = useGameStore(state => state.stepArmies);
  const stepScoutMissions = useGameStore(state => state.stepScoutMissions);
  const formations = useGameStore(state => state.formations);
  const isRefugeeModalOpen = useGameStore(state => state.isRefugeeModalOpen);

  // Trạng thái các giao diện "không trên dòng thời gian"
  const activeModal = useUIStore(state => state.activeModal);
  const isBuildPaperOpen = useUIStore(state => state.isBuildPaperOpen);
  const placementMode = useUIStore(state => state.placementMode);
  const baseRelocateMode = useUIStore(state => state.baseRelocateMode);
  const selectedStructureModal = useUIStore(state => state.selectedStructureModal);
  const activeForgeModalStructureId = useUIStore(state => state.activeForgeModalStructureId);

  // Tự động ngưng thời gian khi mở các chế độ "không trên dòng thời gian"
  // (xây dựng, di dời, xem chi tiết công trình, xem danh tướng, sa bàn bố trận, danh sách lưu dân)
  const isOutOfTime = Boolean(
    isBuildPaperOpen ||
    placementMode ||
    baseRelocateMode ||
    activeModal === 'generals' ||
    activeModal === 'army' ||
    selectedStructureModal ||
    activeForgeModalStructureId ||
    isRefugeeModalOpen
  );

  const prevOutOfTimeRef = useRef(false);

  useEffect(() => {
    const wasOutOfTime = prevOutOfTimeRef.current;
    if (!wasOutOfTime && isOutOfTime) {
      enterAutoPause();
    } else if (wasOutOfTime && !isOutOfTime) {
      exitAutoPause();
    }
    prevOutOfTimeRef.current = isOutOfTime;
  }, [isOutOfTime, enterAutoPause, exitAutoPause]);

  // Tự động chuyển sang Chế độ Giờ khi có đạo quân xuất trận (marching / retreating, không tính cắm trại)
  const hasActiveMarching = useMemo(() => {
    return formations.some(f => (f.status === 'marching' || f.status === 'retreating') && Boolean(f.marchOrder));
  }, [formations]);

  const prevMarchingRef = useRef(false);

  useEffect(() => {
    if (hasActiveMarching && !prevMarchingRef.current) {
      if (timeMode !== 'hour' && timeMode !== 'pause') {
        setTimeMode('hour');
      }
    }
    prevMarchingRef.current = hasActiveMarching;
  }, [hasActiveMarching, timeMode, setTimeMode]);

  // Vòng lặp thời gian:
  // - Chế độ Giờ: Mỗi 1000ms trôi qua 1 Canh Giờ (1/12 ngày)
  // - Chế độ Ngày: Mỗi 1000ms trôi qua 1 Ngày
  useEffect(() => {
    if (isPaused) return;

    if (timeMode === 'hour' || isWarMode) {
      const intervalId = setInterval(() => {
        tickCanh();
      }, 1000);
      return () => clearInterval(intervalId);
    } else {
      const intervalId = setInterval(() => { 
        tick(); 
      }, 1000);
      return () => clearInterval(intervalId);
    }
  }, [isPaused, timeMode, isWarMode, tick, tickCanh]);

  // Vòng lặp bước đi mượt mà của đạo quân (đồng bộ tốc độ theo Canh Giờ khi ở Chế độ Giờ)
  // Ban đêm (5 Canh: Giờ Tuất index 10, Hợi 11, Tý 0, Sửu 1, Dần 2 -> từ 19:00 đến 05:00 sáng hôm sau):
  // Nghĩa quân tạm hạ trại nghỉ ngơi qua đêm, không tiếp tục hành quân cho đến khi bình minh (Giờ Mão 05:00)
  useEffect(() => {
    if (isPaused) return;

    const isHourMode = timeMode === 'hour' || isWarMode;
    const isNightTime = isHourMode && (canhHour >= 10 || canhHour <= 2);
    if (isNightTime) return; // Tạm dừng bước chân hành quân khi đêm xuống để hạ trại nghỉ ngơi

    const stepMs = 50; // Tần số 20 FPS cho bước di chuyển mượt mà
    // Nếu ở Chế độ Giờ: 1 giây thực = 1 canh giờ = 1/12 ngày
    // Nếu ở Chế độ Ngày: 1 giây thực = 1 ngày
    const dayFractionPerSec = isHourMode ? (1 / 12) : 1;
    const deltaDays = (stepMs / 1000) * dayFractionPerSec;

    const armyInterval = setInterval(() => {
      stepArmies(deltaDays);
      stepScoutMissions(deltaDays);
    }, stepMs);
    return () => clearInterval(armyInterval);
  }, [isPaused, timeMode, isWarMode, canhHour, stepArmies, stepScoutMissions]);

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
      <RefugeeIntakeModal />
      <EndgameModal />
    </div>
  );
}

export default App;
