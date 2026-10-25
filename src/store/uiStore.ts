import { create } from 'zustand';
import type { StructureType } from '../types';

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

  setActiveModal: (modal: ModalType) => void;
  toggleEditMode: () => void;
  selectCity: (id: string | null) => void;
  setPlacementMode: (mode: PlacementMode | null) => void;
  setActiveForgeModalStructureId: (id: string | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeModal: null,
  isEditMode: false,
  selectedCityId: 'lam_son',
  placementMode: null,
  activeForgeModalStructureId: null,

  setActiveModal: (modal) => set({ activeModal: modal }),
  toggleEditMode: () => set((state) => ({ isEditMode: !state.isEditMode })),
  selectCity: (id) => set({ selectedCityId: id }),
  setPlacementMode: (mode) => set({ placementMode: mode }),
  setActiveForgeModalStructureId: (id) => set({ activeForgeModalStructureId: id }),
}));
