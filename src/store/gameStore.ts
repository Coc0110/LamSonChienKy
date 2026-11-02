import { create } from 'zustand';
import type { GameStore } from './slices/types';
import { createTimeSlice } from './slices/timeSlice';
import { createCitySlice } from './slices/citySlice';
import { createStructureSlice } from './slices/structureSlice';
import { createMilitarySlice } from './slices/militarySlice';
import { createArmySlice } from './slices/armySlice';
import { createSaveSlice } from './slices/saveSlice';

export type GameState = GameStore;

export const useGameStore = create<GameStore>()((...a) => ({
  ...createTimeSlice(...a),
  ...createCitySlice(...a),
  ...createStructureSlice(...a),
  ...createMilitarySlice(...a),
  ...createArmySlice(...a),
  ...createSaveSlice(...a),
}));

export * from './slices/types';
export { loadSavedCities, saveCitiesCoords, COORDS_STORAGE_KEY } from './slices/citySlice';
export { SAVE_GAME_STORAGE_KEY } from './slices/saveSlice';
export { getDaysInMonth } from './slices/timeSlice';
