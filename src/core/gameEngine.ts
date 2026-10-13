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
    
    const tickInterval = gameSpeed === 1 ? 1000 : gameSpeed === 2 ? 500 : 200;
    
    this.timeoutId = window.setTimeout(this.loop, tickInterval);
  }
}

export const gameEngine = new GameEngine();
