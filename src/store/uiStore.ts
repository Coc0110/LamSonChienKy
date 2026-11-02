import { create } from 'zustand';
import type { StructureType } from '../types';
import type { TerrainType } from '../types/terrain';

export type ModalType = 'army' | 'supplies' | 'generals' | null;

export type SelectionType = 'base' | 'district';

export interface PlacementMode {
  type: StructureType;
  cityId: string;
  gridSize?: number;            // 3, 5, 6, 7
  farmTier?: 25 | 35 | 50;      // 15 (5x5), 30 (6x6), 50 (7x7)
  relocateStructureId?: string; // ID của công trình đang di dời nếu có
}

export interface BaseRelocateMode {
  baseId: string;
}

export interface MarchDrawMode {
  formationId: string;
  isDualRoute?: boolean;        // Chế độ vẽ lộ trình kép (Trá bại dụ địch: Tiến đánh -> Rút lui)
  isEmergencyRetreat?: boolean; // Đang giao chiến bấm Trá Bại Rút Lui để vẽ đường tháo chạy ngay
}

interface UIState {
  activeModal: ModalType;
  isEditMode: boolean;
  selectionType: SelectionType;
  selectedCityId: string | null;
  placementMode: PlacementMode | null;
  baseRelocateMode: BaseRelocateMode | null;
  marchDrawMode: MarchDrawMode | null;
  selectedMapFormationId: string | null;
  activeForgeModalStructureId: string | null;
  isMilitaryBookOpen: boolean;
  isBuildPaperOpen: boolean;
  isTimelineWheelOpen: boolean;
  activeDropdown: 'troops' | 'weapons' | null;

  // Trạng thái Tấm Lưới Địa Hình & Sơn Địa Hình
  showGrid: boolean;
  showTerrainOverlay: boolean;
  terrainEditMode: boolean;
  brushTerrain: TerrainType;
  brushSize: 1 | 3 | 5 | 9;
  hoveredCell: { col: number; row: number } | null;

  setActiveModal: (modal: ModalType) => void;
  toggleEditMode: () => void;
  selectCity: (id: string | null) => void;
  selectBase: (baseId: string | null) => void;
  selectDistrict: (districtId: string | null) => void;
  setPlacementMode: (mode: PlacementMode | null) => void;
  setBaseRelocateMode: (mode: BaseRelocateMode | null) => void;
  setMarchDrawMode: (mode: MarchDrawMode | null) => void;
  setSelectedMapFormationId: (id: string | null) => void;
  setActiveForgeModalStructureId: (id: string | null) => void;
  toggleMilitaryBook: () => void;
  setMilitaryBookOpen: (open: boolean) => void;
  toggleTimelineWheel: () => void;
  setTimelineWheelOpen: (open: boolean) => void;
  toggleBuildPaper: () => void;
  setBuildPaperOpen: (open: boolean) => void;
  toggleDropdown: (dropdown: 'troops' | 'weapons') => void;
  setActiveDropdown: (dropdown: 'troops' | 'weapons' | null) => void;

  toggleGrid: () => void;
  toggleTerrainOverlay: () => void;
  setTerrainEditMode: (active: boolean) => void;
  setBrushTerrain: (type: TerrainType) => void;
  setBrushSize: (size: 1 | 3 | 5 | 9) => void;
  setHoveredCell: (cell: { col: number; row: number } | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeModal: null,
  isEditMode: false,
  selectionType: 'base',
  selectedCityId: 'lam_son',
  placementMode: null,
  baseRelocateMode: null,
  marchDrawMode: null,
  selectedMapFormationId: null,
  activeForgeModalStructureId: null,
  isMilitaryBookOpen: false,
  isBuildPaperOpen: false,
  isTimelineWheelOpen: false,
  activeDropdown: null,

  showGrid: false,            // Mặc định ẩn lưới, chỉ hiện khi xây dựng, sửa map hoặc hành quân
  showTerrainOverlay: false,  // Màu địa hình tổng thể tắt ban đầu, có nút bật
  terrainEditMode: false,
  brushTerrain: 'forest',
  brushSize: 1,
  hoveredCell: null,

  setActiveModal: (modal) => set({ activeModal: modal }),
  toggleEditMode: () => set((state) => ({ 
    isEditMode: !state.isEditMode, 
    terrainEditMode: false,
    selectionType: 'district' 
  })),
  selectCity: (id) => set({ selectedCityId: id }),
  selectBase: (baseId) => set({ selectedCityId: baseId, selectionType: 'base' }),
  selectDistrict: (districtId) => set({ selectedCityId: districtId, selectionType: 'district' }),
  setPlacementMode: (mode) => set({ placementMode: mode }),
  setBaseRelocateMode: (mode) => set({ baseRelocateMode: mode }),
  setMarchDrawMode: (mode) => set((state) => ({
    marchDrawMode: mode,
    selectedMapFormationId: mode ? mode.formationId : state.selectedMapFormationId,
    showGrid: mode ? true : false,
    ...(mode ? {
      activeModal: null,
      placementMode: null,
      baseRelocateMode: null,
      isMilitaryBookOpen: false,
      isBuildPaperOpen: false,
    } : {}),
  })),
  setSelectedMapFormationId: (id) => set({ selectedMapFormationId: id }),
  setActiveForgeModalStructureId: (id) => set({ activeForgeModalStructureId: id }),
  toggleMilitaryBook: () => set((state) => ({ isMilitaryBookOpen: !state.isMilitaryBookOpen })),
  setMilitaryBookOpen: (open) => set({ isMilitaryBookOpen: open }),
  toggleTimelineWheel: () => set((state) => ({ isTimelineWheelOpen: !state.isTimelineWheelOpen })),
  setTimelineWheelOpen: (open) => set({ isTimelineWheelOpen: open }),
  toggleBuildPaper: () => set((state) => {
    const nextOpen = !state.isBuildPaperOpen;
    return {
      isBuildPaperOpen: nextOpen,
      showGrid: nextOpen,
      ...(nextOpen ? {} : { placementMode: null, baseRelocateMode: null }),
    };
  }),
  setBuildPaperOpen: (open) => set(() => ({
    isBuildPaperOpen: open,
    showGrid: open,
    ...(open ? {} : { placementMode: null, baseRelocateMode: null }),
  })),
  toggleDropdown: (dropdown) => set((state) => ({
    activeDropdown: state.activeDropdown === dropdown ? null : dropdown
  })),
  setActiveDropdown: (dropdown) => set({ activeDropdown: dropdown }),

  toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),
  toggleTerrainOverlay: () => set((state) => ({ showTerrainOverlay: !state.showTerrainOverlay })),
  setTerrainEditMode: (active) => set({ terrainEditMode: active }),
  setBrushTerrain: (type) => set({ brushTerrain: type }),
  setBrushSize: (size) => set({ brushSize: size }),
  setHoveredCell: (cell) => set((state) => {
    if (!cell && !state.hoveredCell) return state;
    if (cell && state.hoveredCell && cell.col === state.hoveredCell.col && cell.row === state.hoveredCell.row) {
      return state;
    }
    return { hoveredCell: cell };
  }),
}));
