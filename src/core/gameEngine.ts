import { useGameStore } from '../store/gameStore';

class GameEngine {
  private timeoutId: number | null = null;
  private isRunning: boolean = false;
  
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.loop();
  }
  
  stop() {
    this.isRunning = false;
    if (this.timeoutId) {
      window.clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  private loop = () => {
    if (!this.isRunning) return;
    
    const { isPaused, gameSpeed, tick } = useGameStore.getState();
    
    if (!isPaused) {
      tick();
    }
    
    // Tính toán tốc độ tick linh hoạt theo gameSpeed (1x: 2000ms, 2x: 1000ms, 5x: 400ms, 10x: 200ms, 50x: 40ms)
    const tickInterval = Math.max(16, Math.round(2000 / Math.max(1, gameSpeed)));
    
    this.timeoutId = window.setTimeout(this.loop, tickInterval);
  }
}

export const gameEngine = new GameEngine();
