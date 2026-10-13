import { create } from 'zustand';
import type { Resources, CityNode, Connection } from '../types';
import { INITIAL_CITIES, INITIAL_CONNECTIONS, START_DAY, START_MONTH, START_YEAR } from '../data/mapData';

interface GameState {
  day: number;
  month: number;
  year: number;
  
  isPaused: boolean;
  gameSpeed: number;
  
  resources: Resources;
  cities: CityNode[];
  connections: Connection[];

  togglePause: () => void;
  setSpeed: (speed: number) => void;
  updateCityPosition: (id: string, x: number, y: number) => void;
  tick: () => void;
}

const getDaysInMonth = (month: number, year: number) => {
  return new Date(year, month, 0).getDate();
};

export const useGameStore = create<GameState>((set) => ({
  day: START_DAY,
  month: START_MONTH,
  year: START_YEAR,
  
  isPaused: false,
  gameSpeed: 1,

  resources: {
    troops: 2000,
    horses: 100,
    elephants: 4,
    food: 5000,
    weapons: 2000,
    clothes: 2000,
    gold: 1000,
    morale: 90
  },

  cities: INITIAL_CITIES,
  connections: INITIAL_CONNECTIONS,

  togglePause: () => set((state) => ({ isPaused: !state.isPaused })),
  
  setSpeed: (speed) => set({ gameSpeed: speed, isPaused: false }),

  updateCityPosition: (id, x, y) => set((state) => ({
    cities: state.cities.map(city => city.id === id ? { ...city, x, y } : city)
  })),

  tick: () => set((state) => {
    if (state.isPaused) return state;

    let newDay = state.day + 1;
    let newMonth = state.month;
    let newYear = state.year;

    if (newDay > getDaysInMonth(newMonth, newYear)) {
      newDay = 1;
      newMonth++;
      if (newMonth > 12) {
        newMonth = 1;
        newYear++;
      }
    }

    const foodConsumption = state.resources.troops * 0.05;
    let newFood = state.resources.food - foodConsumption;
    let newMorale = state.resources.morale;

    if (newFood <= 0) {
      newFood = 0;
      newMorale = Math.max(0, newMorale - 1);
    } else if (newFood > state.resources.troops * 2) {
      newMorale = Math.min(100, newMorale + 0.1);
    }

    return {
      day: newDay,
      month: newMonth,
      year: newYear,
      resources: {
        ...state.resources,
        food: newFood,
        morale: Number(newMorale.toFixed(1))
      }
    };
  })
}));
