import { useEffect } from 'react';
import { TopBar } from './components/layout/TopBar';
import { LeftPanel } from './components/layout/LeftPanel';
import { WorldMap } from './components/map/WorldMap';
import { GeneralsModal } from './components/generals/GeneralsModal';
import { ParchmentToastContainer } from './components/common/ParchmentToastContainer';
import { ParchmentConfirmModal } from './components/common/ParchmentConfirmModal';
import { useGameStore } from './store/gameStore';

function App() {
  const isPaused = useGameStore(state => state.isPaused);
  const gameSpeed = useGameStore(state => state.gameSpeed);
  const tick = useGameStore(state => state.tick);

  // Vòng lặp thời gian thực chuẩn xác theo gameSpeed (1x: 1000ms, 2x: 500ms, 5x: 200ms, 10x: 100ms, 50x: 20ms)
  useEffect(() => {
    if (isPaused) return;
    const tickInterval = Math.max(16, Math.round(1000 / Math.max(1, gameSpeed)));
    const intervalId = setInterval(() => { tick(); }, tickInterval);
    return () => clearInterval(intervalId);
  }, [isPaused, gameSpeed, tick]);

  return (
    <div className="w-screen h-screen overflow-hidden relative bg-stone-950 select-none">
      <WorldMap />
      <TopBar />
      <LeftPanel />
      <GeneralsModal />
      <ParchmentToastContainer />
      <ParchmentConfirmModal />
    </div>
  );
}

export default App;
