import { create } from 'zustand';

interface UIState {
  activeModal: 'army' | 'supplies' | null;
  isEditMode: boolean;
  selectedCityId: string | null;

  setActiveModal: (modal: 'army' | 'supplies' | null) => void;
  toggleEditMode: () => void;
  selectCity: (id: string | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeModal: null,
  isEditMode: false,
  selectedCityId: 'lam_son',

  setActiveModal: (modal) => set({ activeModal: modal }),
  toggleEditMode: () => set((state) => ({ isEditMode: !state.isEditMode })),
  selectCity: (id) => set({ selectedCityId: id }),
}));
