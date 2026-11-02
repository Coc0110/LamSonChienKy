import { useEffect, lazy, Suspense } from 'react';
import { TopBar } from './components/layout/TopBar';
import { LeftPanel } from './components/layout/LeftPanel';
import { WorldMap } from './components/map/WorldMap';
import { ParchmentToastContainer } from './components/common/ParchmentToastContainer';
import { ParchmentConfirmModal } from './components/common/ParchmentConfirmModal';
import { EndgameModal } from './components/common/EndgameModal';
import { useGameStore, SAVE_GAME_STORAGE_KEY } from './store/gameStore';

// Code-splitting các modal chiến thuật & danh tướng có kích thước lớn để tăng tốc tải trang
const GeneralsModal = lazy(() => import('./components/generals/GeneralsModal').then(m => ({ default: m.GeneralsModal })));
const TacticalFormationModal = lazy(() => import('./components/army/TacticalFormationModal').then(m => ({ default: m.TacticalFormationModal })));

function App() {
  const isPaused = useGameStore(state => state.isPaused);
  const gameSpeed = useGameStore(state => state.gameSpeed);
  const tick = useGameStore(state => state.tick);
  const stepArmies = useGameStore(state => state.stepArmies);
  const loadGame = useGameStore(state => state.loadGame);

  // Tự động phục hồi bản lưu gần nhất (nếu có) khi mở trang
  useEffect(() => {
    try {
      const hasSave = localStorage.getItem(SAVE_GAME_STORAGE_KEY);
      if (hasSave) {
        loadGame();
      }
    } catch {
      // Ignore
    }
  }, [loadGame]);

  // Vòng lặp thời gian thực chuẩn xác theo gameSpeed (1x: 1000ms, 2x: 500ms, 5x: 200ms, 10x: 100ms, 50x: 20ms)
  useEffect(() => {
    if (isPaused) return;
    const tickInterval = Math.max(16, Math.round(1000 / Math.max(1, gameSpeed)));
    const intervalId = setInterval(() => { 
      tick(); 
    }, tickInterval);
    return () => clearInterval(intervalId);
  }, [isPaused, gameSpeed, tick]);

  // Vòng lặp bước đi mượt mà của đạo quân trên lưới ô vuông (đồng bộ hoàn toàn với isPaused và gameSpeed)
  useEffect(() => {
    if (isPaused) return;
    const stepMs = 100;
    const deltaDays = (stepMs / 1000) * Math.max(1, gameSpeed);
    const armyInterval = setInterval(() => {
      stepArmies(deltaDays);
    }, stepMs);
    return () => clearInterval(armyInterval);
  }, [isPaused, gameSpeed, stepArmies]);

  return (
    <div className="w-screen h-screen overflow-hidden relative bg-stone-950 select-none">
      <WorldMap />
      <TopBar />
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
