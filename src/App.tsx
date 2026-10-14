import { useEffect } from 'react';
import { TopBar } from './components/layout/TopBar';
import { LeftPanel } from './components/layout/LeftPanel';
import { WorldMap } from './components/map/WorldMap';
import { useGameStore } from './store/gameStore';

function App() {
  const { isPaused, gameSpeed, tick } = useGameStore();

  // Vòng lặp thời gian thực
  useEffect(() => {
    if (isPaused) return;
    const tickInterval = gameSpeed === 1 ? 1000 : gameSpeed === 2 ? 500 : 200;
    const intervalId = setInterval(() => { tick(); }, tickInterval);
    return () => clearInterval(intervalId);
  }, [isPaused, gameSpeed, tick]);

  return (
    <div className="w-screen h-screen overflow-hidden relative bg-stone-950 select-none">
      <WorldMap />
      <TopBar />
      <LeftPanel />
    </div>
  );
}

export default App;
