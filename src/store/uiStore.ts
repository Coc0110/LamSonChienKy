import { create } from 'zustand';
import type { StructureType } from '../types';
import type { TerrainType } from '../types/terrain';

export type ModalType = 'army' | 'supplies' | 'generals' | null;

export interface PlacementMode {
  type: StructureType;
  cityId: string;
}

interface UIState {
  activeModal: ModalType;
  isEditMode: boolean;
  selectedCityId: string | null;
  placementMode: PlacementMode | null;
  activeForgeModalStructureId: string | null;

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
  setPlacementMode: (mode: PlacementMode | null) => void;
  setActiveForgeModalStructureId: (id: string | null) => void;

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
  selectedCityId: 'lam_son',
  placementMode: null,
  activeForgeModalStructureId: null,

  showGrid: false,            // Mặc định ẩn lưới, chỉ hiện khi xây dựng, sửa map hoặc hành quân
  showTerrainOverlay: false,  // Màu địa hình tổng thể tắt ban đầu, có nút bật
  terrainEditMode: false,
  brushTerrain: 'forest',
  brushSize: 1,
  hoveredCell: null,

  setActiveModal: (modal) => set({ activeModal: modal }),
  toggleEditMode: () => set((state) => ({ isEditMode: !state.isEditMode, terrainEditMode: false })),
  selectCity: (id) => set({ selectedCityId: id }),
  setPlacementMode: (mode) => set({ placementMode: mode }),
  setActiveForgeModalStructureId: (id) => set({ activeForgeModalStructureId: id }),

  toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),
  toggleTerrainOverlay: () => set((state) => ({ showTerrainOverlay: !state.showTerrainOverlay })),
  setTerrainEditMode: (active) => set({ terrainEditMode: active }),
  setBrushTerrain: (type) => set({ brushTerrain: type }),
  setBrushSize: (size) => set({ brushSize: size }),
  setHoveredCell: (cell) => set({ hoveredCell: cell }),
}));
