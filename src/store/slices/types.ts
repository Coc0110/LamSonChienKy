import type {
  Resources,
  CityNode,
  Connection,
  General,
  RecruitmentEventNotice,
  MilitaryNotice,
  StructureType,
  WeaponCraftType,
  PlacedStructure,
  ScoutMission,
  PendingRefugeeWave,
  TimeMode,
} from '../../types';
import type { MarketGoodKey } from '../../utils/marketUtils';
import type { ArmySlice } from './armySlice';
import type { SaveSlice, GameStatus } from './saveSlice';

export interface TimeSlice {
  day: number;
  month: number;
  year: number;
  canhHour: number;
  timeMode: TimeMode;
  previousActiveTimeMode: 'day' | 'hour';
  isAutoPaused: boolean;
  isWarMode: boolean; // Che do Chien Su (dem theo Canh gio)
  isPaused: boolean;
  gameSpeed: number;
  setTimeMode: (mode: TimeMode) => void;
  enterAutoPause: () => void;
  exitAutoPause: () => void;
  togglePause: () => void;
  setSpeed: (speed: number) => void;
  setWarMode: (active: boolean) => void;
  toggleWarMode: () => void;
  tick: () => void;
  tickCanh: () => void;
  setTimeDate: (day: number, month: number, year: number) => void;
}

export interface CitySlice {
  cities: CityNode[];
  connections: Connection[];
  updateCityPosition: (id: string, x: number, y: number) => void;
  resetCityPositions: () => void;
  relocateBase: (baseId: string, newX: number, newY: number, newDistrictId?: string) => { success: boolean; message: string };
  demolishBase: (baseId: string) => { success: boolean; message: string };
}

export interface StructureSlice {
  structures: PlacedStructure[];
  placeStructure: (cityId: string, type: StructureType, x: number, y: number, gridSize?: number, maxWorkers?: number) => { success: boolean; message: string };
  relocateStructure: (structureId: string, newX: number, newY: number) => { success: boolean; message: string };
  demolishStructure: (structureId: string) => { success: boolean; message: string };
  assignFarmWorkers: (structureId: string, delta: number) => { success: boolean; message: string };
  setFarmWorkers: (structureId: string, targetCount: number) => { success: boolean; message: string };
  upgradeFarm: (structureId: string) => { success: boolean; message: string };
  startForgeOrder: (structureId: string, order: { weaponType: WeaponCraftType; quantity: number; smiths: number }) => { success: boolean; message: string };
  cancelForgeOrder: (structureId: string) => void;
  marketUsedToday: Record<string, number>;
  executeMarketTrade: (
    districtId: string,
    goodKey: MarketGoodKey,
    action: 'buy' | 'sell',
    lots: number
  ) => { success: boolean; message: string; suspicionGain: number };
  buildStructure: (cityId: string, type: 'farms' | 'forges') => void;
}

export interface MilitarySlice {
  resources: Resources;
  hasUprising: boolean;
  generals: General[];
  recruitmentNotice: RecruitmentEventNotice | null;
  militaryNotices: MilitaryNotice[];
  suspicion: number;
  bribeCount: number; // Lạm phát số lần đút lót
  assignGeneralToCity: (generalId: string, cityId: string) => void;
  unlockGeneralManual: (generalId: string) => void;
  dismissRecruitmentNotice: () => void;
  addMilitaryNotice: (notice: Omit<MilitaryNotice, 'id' | 'read' | 'timestamp'>) => void;
  markNoticesAsRead: () => void;
  clearMilitaryNotices: () => void;
  startTraining: (
    cityId: string,
    generalId: string,
    traineesCount: number,
    swappedCount: number,
    totalDays: number,
    targetRoster?: Partial<import('../../types/armyFormation').ArmyRosterCounts>
  ) => void;
  cancelTraining: (cityId: string) => void;
  bribeMingOfficials: (cityId?: string) => { success: boolean; message: string; cost: number; reducedSuspicion: number };
  dispatchScout: (cityId: string) => { success: boolean; message: string };
  recallScout: (cityId: string) => { success: boolean; message: string };
  upgradeCamp: (cityId: string) => { success: boolean; message: string };
  triggerUprising: () => { success: boolean; message: string };
  scoutMissions: ScoutMission[];
  dispatchScoutMission: (originCityId: string, targetCityId: string, scoutCount: number) => { success: boolean; message: string };
  stepScoutMissions: (deltaDays: number) => void;
  // Cơ chế tiếp nhận lưu dân
  pendingRefugees: PendingRefugeeWave[];
  activeRefugeeModal: PendingRefugeeWave | null;
  isRefugeeModalOpen: boolean;
  openRefugeeModal: (wave?: PendingRefugeeWave) => void;
  closeRefugeeModal: () => void;
  setActiveRefugeeModal: (wave: PendingRefugeeWave | null) => void;
  acceptRefugeeWave: (waveId: string, policy: 'full' | 'able_bodied_only' | 'relief_only' | 'reject') => { success: boolean; message: string };
  acceptAllRefugees: (policy: 'full' | 'able_bodied_only') => { success: boolean; message: string };
  dispatchRefugeeRecruit: (cityId: string) => { success: boolean; message: string };
}

import type { BattleSlice } from './battleSlice';

export type { ArmySlice, SaveSlice, GameStatus, BattleSlice };
export type GameStore = TimeSlice & CitySlice & StructureSlice & MilitarySlice & ArmySlice & SaveSlice & BattleSlice;
