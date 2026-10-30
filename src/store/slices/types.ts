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
} from '../../types';

export interface TimeSlice {
  day: number;
  month: number;
  year: number;
  isPaused: boolean;
  gameSpeed: number;
  togglePause: () => void;
  setSpeed: (speed: number) => void;
  tick: () => void;
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
  startForgeOrder: (structureId: string, order: { weaponType: WeaponCraftType; quantity: number; smiths: number }) => { success: boolean; message: string };
  cancelForgeOrder: (structureId: string) => void;
  tradeFoodForGold: (foodAmount: number) => { success: boolean; message: string };
  buildStructure: (cityId: string, type: 'farms' | 'forges') => void;
}

export interface MilitarySlice {
  resources: Resources;
  generals: General[];
  recruitmentNotice: RecruitmentEventNotice | null;
  militaryNotices: MilitaryNotice[];
  suspicion: number;
  assignGeneralToCity: (generalId: string, cityId: string) => void;
  unlockGeneralManual: (generalId: string) => void;
  dismissRecruitmentNotice: () => void;
  addMilitaryNotice: (notice: Omit<MilitaryNotice, 'id' | 'read' | 'timestamp'>) => void;
  markNoticesAsRead: () => void;
  clearMilitaryNotices: () => void;
  startTraining: (cityId: string, generalId: string, traineesCount: number, swappedCount: number, totalDays: number) => void;
  cancelTraining: (cityId: string) => void;
  bribeMingOfficials: () => void;
}

export type GameStore = TimeSlice & CitySlice & StructureSlice & MilitarySlice;
