import type { StateCreator } from 'zustand';
import type { GameStore } from './types';
import type { General, TacticalFormation } from '../../types';
import { ensureFormationRosterAndLayers } from '../../utils/armyCompositionUtils';
import { notify } from '../dialogStore';
import { START_DAY, START_MONTH, START_YEAR, INITIAL_CITIES, INITIAL_CONNECTIONS, INITIAL_STRUCTURES } from '../../data/mapData';
import { INITIAL_GENERALS } from '../../data/generalsData';
import { FORMATION_ROWS, FORMATION_COLS } from './armySlice';

export const SAVE_GAME_STORAGE_KEY = 'lam_son_save_game_state_v1';

export type GameStatus = 'playing' | 'victory' | 'defeat';

export interface SaveSlice {
  gameStatus: GameStatus;
  lastSavedAt: string | null;
  saveGame: () => { success: boolean; message: string };
  loadGame: () => { success: boolean; message: string };
  resetGame: () => void;
  setGameStatus: (status: GameStatus) => void;
}

export const createSaveSlice: StateCreator<GameStore, [], [], SaveSlice> = (set, get) => ({
  gameStatus: 'playing',
  lastSavedAt: null,

  setGameStatus: (status: GameStatus) => set({ gameStatus: status }),

  saveGame: () => {
    try {
      const state = get();
      const saveData = {
        version: 1,
        savedAt: new Date().toLocaleString('vi-VN'),
        day: state.day,
        month: state.month,
        year: state.year,
        isPaused: state.isPaused,
        timeMode: state.timeMode,
        hasUprising: state.hasUprising || false,
        gameSpeed: state.gameSpeed,
        resources: state.resources,
        cities: state.cities,
        structures: state.structures,
        generals: state.generals,
        formations: state.formations,
        suspicion: state.suspicion,
        bribeCount: state.bribeCount || 0,
        scoutMissions: state.scoutMissions || [],
        militaryNotices: state.militaryNotices,
        pendingRefugees: state.pendingRefugees || [],
        gameStatus: state.gameStatus,
      };

      localStorage.setItem(SAVE_GAME_STORAGE_KEY, JSON.stringify(saveData));
      set({ lastSavedAt: saveData.savedAt });
      notify.success(`Đã lưu quân cơ thành công! (${saveData.savedAt})`);
      return { success: true, message: `Lưu quân cơ thành công (${saveData.savedAt})` };
    } catch {
      notify.error('Lỗi khi ghi nhớ quân cơ vào bộ nhớ trình duyệt!');
      return { success: false, message: 'Lỗi ghi nhớ quân cơ' };
    }
  },

  loadGame: () => {
    try {
      const raw = localStorage.getItem(SAVE_GAME_STORAGE_KEY);
      if (!raw) {
        notify.warning('Chưa có bản ghi quân cơ nào được lưu trước đó!');
        return { success: false, message: 'Chưa có bản ghi quân cơ' };
      }

      const saveData = JSON.parse(raw);
      set({
        day: saveData.day ?? START_DAY,
        month: saveData.month ?? START_MONTH,
        year: saveData.year ?? START_YEAR,
        isPaused: true, // Khi tải lại, tạm dừng để người chơi định thần quan sát
        gameSpeed: saveData.gameSpeed ?? 1,
        resources: saveData.resources,
        cities: saveData.cities || INITIAL_CITIES,
        structures: saveData.structures || INITIAL_STRUCTURES,
        generals: (saveData.generals && saveData.generals.length > 0)
          ? INITIAL_GENERALS.map(initG => {
              const savedG = saveData.generals.find((sg: General) => sg.id === initG.id);
              return savedG ? { ...initG, ...savedG } : initG;
            })
          : INITIAL_GENERALS,
        formations: ((saveData.formations || []) as TacticalFormation[]).map(ensureFormationRosterAndLayers),
        suspicion: saveData.suspicion ?? 15,
        bribeCount: saveData.bribeCount ?? 0,
        scoutMissions: saveData.scoutMissions || [],
        militaryNotices: saveData.militaryNotices || [],
        pendingRefugees: saveData.pendingRefugees || [],
        activeRefugeeModal: null,
        gameStatus: saveData.gameStatus || 'playing',
        lastSavedAt: saveData.savedAt || null,
      });

      notify.success(`Đã phục hồi quân cơ ngày ${saveData.day}/${saveData.month}/${saveData.year}!`);
      return { success: true, message: 'Phục hồi quân cơ thành công' };
    } catch {
      notify.error('Tệp quân cơ đã lưu bị hỏng hoặc không tương thích!');
      return { success: false, message: 'Tệp quân cơ bị hỏng' };
    }
  },

  resetGame: () => {
    try {
      localStorage.removeItem(SAVE_GAME_STORAGE_KEY);
    } catch {
      // Ignore
    }

    set({
      day: START_DAY,
      month: START_MONTH,
      year: START_YEAR,
      isPaused: true,
      gameSpeed: 1,
      resources: {
        troops: 70,
        horses: 0,
        elephants: 0,
        food: 3500,
        weapons: 150,
        swords: 52,
        bows: 38,
        spears: 60,
        clothes: 400,
        gold: 600,
        morale: 95,
      },
      cities: INITIAL_CITIES,
      connections: INITIAL_CONNECTIONS,
      structures: INITIAL_STRUCTURES,
      generals: INITIAL_GENERALS,
      recruitmentNotice: null,
      militaryNotices: [],
      pendingRefugees: [],
      activeRefugeeModal: null,
      suspicion: 15,
      bribeCount: 0,
      scoutMissions: [],
      formations: [
        {
          id: 'formation_tien_phong_1',
          name: 'Tiên Phong Doanh Lam Sơn',
          cityId: 'lam_son',
          rows: FORMATION_ROWS,
          cols: FORMATION_COLS,
          grid: Array.from({ length: FORMATION_ROWS }, () => Array.from({ length: FORMATION_COLS }, () => null)),
          commanderGeneralId: null,
          status: 'idle',
          createdAt: Date.now(),
          totalTroops: 0,
          totalWeapons: 0,
          totalHorses: 0,
          totalElephants: 0,
          totalFoodCarried: 0,
          assignedGeneralIds: [],
          marchOrder: null,
        },
      ],
      activeFormationId: null,
      gameStatus: 'playing',
      lastSavedAt: null,
    });

    notify.info('Đã khởi tạo lại đại nghiệp Lam Sơn từ năm Mậu Tuất (1418)!');
  },
});
