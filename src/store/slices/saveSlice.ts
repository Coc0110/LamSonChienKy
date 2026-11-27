import type { StateCreator } from 'zustand';
import type { GameStore } from './types';
import type { General, TacticalFormation } from '../../types';
import { ensureFormationRosterAndLayers } from '../../utils/armyCompositionUtils';
import { notify } from '../dialogStore';
import { START_DAY, START_MONTH, START_YEAR, INITIAL_CITIES, INITIAL_CONNECTIONS, INITIAL_STRUCTURES } from '../../data/mapData';
import { INITIAL_GENERALS } from '../../data/generalsData';
import { FORMATION_ROWS, FORMATION_COLS } from './armySlice';

export const SAVE_GAME_STORAGE_KEY = 'lam_son_save_game_state_v1';
export const CHECKPOINTS_STORAGE_KEY = 'lam_son_checkpoints_v1';
const MAX_CHECKPOINTS = 3;

export type GameStatus = 'playing' | 'victory' | 'defeat';

export interface CheckpointMeta {
  id: string;
  label: string;
  day: number;
  month: number;
  year: number;
  savedAt: string;
}

interface StoredCheckpoint extends CheckpointMeta {
  payload: Record<string, unknown>;
}

const loadStoredCheckpoints = (): StoredCheckpoint[] => {
  try {
    const raw = localStorage.getItem(CHECKPOINTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const buildSavePayload = (state: GameStore) => ({
  version: 2,
  savedAt: new Date().toLocaleString('vi-VN'),
  day: state.day,
  month: state.month,
  year: state.year,
  canhHour: state.canhHour,
  isPaused: state.isPaused,
  timeMode: state.timeMode,
  previousActiveTimeMode: state.previousActiveTimeMode,
  isWarMode: state.isWarMode,
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
  marketUsedThisMonth: state.marketUsedThisMonth || {},
  pendingMarketOrders: state.pendingMarketOrders || [],
  regionLayouts: state.regionLayouts || {},
  clearedTerrainKeys: state.clearedTerrainKeys || {},
  baseAutomation: state.baseAutomation || {},
  bushes: state.bushes || {},
  bushNextSpawnDay: state.bushNextSpawnDay || {},
  scoutedRegionIds: state.scoutedRegionIds || {},
  activeWatchtowerScouts: state.activeWatchtowerScouts || {},
  activeNormalHunt: state.activeNormalHunt || {},
  activeRareHunt: state.activeRareHunt || {},
  watchtowerLastRareHuntDay: state.watchtowerLastRareHuntDay || {},
  defenseFormationIds: state.defenseFormationIds || {},
  foragedInventory: state.foragedInventory || [],
  watchtowerLastForageDay: state.watchtowerLastForageDay || {},
  lastAuctionMonthKey: state.lastAuctionMonthKey ?? null,
  militaryNotices: state.militaryNotices,
  pendingRefugees: state.pendingRefugees || [],
  gameStatus: state.gameStatus,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const buildRestoredState = (saveData: any, currentState: GameStore): Partial<GameStore> => ({
  day: saveData.day ?? START_DAY,
  month: saveData.month ?? START_MONTH,
  year: saveData.year ?? START_YEAR,
  canhHour: saveData.canhHour ?? 4,
  isPaused: true,
  timeMode: saveData.timeMode ?? 'hour',
  previousActiveTimeMode: saveData.previousActiveTimeMode ?? 'hour',
  isWarMode: saveData.isWarMode ?? false,
  hasUprising: saveData.hasUprising ?? false,
  gameSpeed: saveData.gameSpeed ?? 1,
  resources: saveData.resources,
  cities: saveData.cities || INITIAL_CITIES,
  structures: saveData.structures || INITIAL_STRUCTURES,
  generals:
    saveData.generals && saveData.generals.length > 0
      ? INITIAL_GENERALS.map((initG) => {
          const savedG = saveData.generals.find((sg: General) => sg.id === initG.id);
          return savedG ? { ...initG, ...savedG } : initG;
        })
      : INITIAL_GENERALS,
  formations: ((saveData.formations || []) as TacticalFormation[]).map(ensureFormationRosterAndLayers),
  suspicion: saveData.suspicion ?? 15,
  bribeCount: saveData.bribeCount ?? 0,
  scoutMissions: saveData.scoutMissions || [],
  marketUsedThisMonth: saveData.marketUsedThisMonth || {},
  pendingMarketOrders: saveData.pendingMarketOrders || [],
  regionLayouts: saveData.regionLayouts || currentState.regionLayouts,
  clearedTerrainKeys: saveData.clearedTerrainKeys || {},
  baseAutomation: saveData.baseAutomation || {},
  bushes: saveData.bushes || {},
  bushNextSpawnDay: saveData.bushNextSpawnDay || {},
  scoutedRegionIds: saveData.scoutedRegionIds || {},
  activeWatchtowerScouts: saveData.activeWatchtowerScouts || {},
  activeNormalHunt: saveData.activeNormalHunt || {},
  activeRareHunt: saveData.activeRareHunt || {},
  watchtowerLastRareHuntDay: saveData.watchtowerLastRareHuntDay || {},
  defenseFormationIds: saveData.defenseFormationIds || {},
  foragedInventory: saveData.foragedInventory || [],
  watchtowerLastForageDay: saveData.watchtowerLastForageDay || {},
  lastAuctionMonthKey: saveData.lastAuctionMonthKey ?? null,
  militaryNotices: saveData.militaryNotices || [],
  pendingRefugees: saveData.pendingRefugees || [],
  activeRefugeeModal: null,
  gameStatus: 'playing',
  lastSavedAt: saveData.savedAt || null,
});

export interface SaveSlice {
  gameStatus: GameStatus;
  lastSavedAt: string | null;
  checkpoints: CheckpointMeta[];
  saveGame: () => { success: boolean; message: string };
  loadGame: () => { success: boolean; message: string };
  createAutoCheckpoint: (label?: string) => void;
  loadCheckpoint: (checkpointId?: string) => { success: boolean; message: string };
  resetGame: () => void;
  setGameStatus: (status: GameStatus) => void;
}

export const createSaveSlice: StateCreator<GameStore, [], [], SaveSlice> = (set, get) => ({
  gameStatus: 'playing',
  lastSavedAt: null,
  checkpoints: loadStoredCheckpoints().map(({ id, label, day, month, year, savedAt }) => ({
    id,
    label,
    day,
    month,
    year,
    savedAt,
  })),

  setGameStatus: (status: GameStatus) => set({ gameStatus: status }),

  saveGame: () => {
    try {
      const saveData = buildSavePayload(get());
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
        ...buildRestoredState(saveData, get()),
        gameStatus: saveData.gameStatus || 'playing',
      });

      notify.success(`Đã phục hồi quân cơ ngày ${saveData.day}/${saveData.month}/${saveData.year}!`);
      return { success: true, message: 'Phục hồi quân cơ thành công' };
    } catch {
      notify.error('Tệp quân cơ đã lưu bị hỏng hoặc không tương thích!');
      return { success: false, message: 'Tệp quân cơ bị hỏng' };
    }
  },

  createAutoCheckpoint: (label?: string) => {
    try {
      const state = get();
      const payload = buildSavePayload(state);
      const entry: StoredCheckpoint = {
        id: `cp_${state.year}_${state.month}_${state.day}_${Date.now()}`,
        label: label || `Đầu Quý (${state.day}/${state.month}/${state.year})`,
        day: state.day,
        month: state.month,
        year: state.year,
        savedAt: payload.savedAt,
        payload,
      };
      const existing = loadStoredCheckpoints();
      const updated = [entry, ...existing].slice(0, MAX_CHECKPOINTS);
      localStorage.setItem(CHECKPOINTS_STORAGE_KEY, JSON.stringify(updated));
      set({
        checkpoints: updated.map(({ id, label: cpLabel, day, month, year, savedAt }) => ({
          id,
          label: cpLabel,
          day,
          month,
          year,
          savedAt,
        })),
      });
    } catch {
      // Ignore storage quota errors for background checkpoints
    }
  },

  loadCheckpoint: (checkpointId?: string) => {
    try {
      const stored = loadStoredCheckpoints();
      const target = checkpointId ? stored.find((cp) => cp.id === checkpointId) : stored[0];
      if (!target) {
        notify.warning('Chưa có Mốc Tự Động (Checkpoint) nào được lưu!');
        return { success: false, message: 'Không tìm thấy checkpoint' };
      }
      set(buildRestoredState(target.payload, get()));
      notify.success(`Đã quay lại mốc ${target.label}!`);
      return { success: true, message: `Quay lại mốc ${target.label}` };
    } catch {
      notify.error('Không thể khôi phục dữ liệu Checkpoint!');
      return { success: false, message: 'Lỗi khôi phục checkpoint' };
    }
  },

  resetGame: () => {
    try {
      localStorage.removeItem(SAVE_GAME_STORAGE_KEY);
      localStorage.removeItem(CHECKPOINTS_STORAGE_KEY);
    } catch {
      // Ignore
    }

    set({
      day: START_DAY,
      month: START_MONTH,
      year: START_YEAR,
      canhHour: 4,
      timeMode: 'hour',
      previousActiveTimeMode: 'hour',
      isWarMode: false,
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
      marketUsedThisMonth: {},
      pendingMarketOrders: [],
      clearedTerrainKeys: {},
      baseAutomation: {},
      bushes: {},
      bushNextSpawnDay: {},
      scoutedRegionIds: {},
      activeWatchtowerScouts: {},
      defenseFormationIds: {},
      foragedInventory: [],
      watchtowerLastForageDay: {},
      lastAuctionMonthKey: null,
      checkpoints: [],
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

    notify.info('Đã khởi tạo lại đại nghiệp Lam Sơn (1416–1418)!');
  },
});
