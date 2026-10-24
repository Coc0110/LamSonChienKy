import { create } from 'zustand';

export type ModalType = 'army' | 'supplies' | 'generals' | null;

interface UIState {
  activeModal: ModalType;
  isEditMode: boolean;
  selectedCityId: string | null;

  setActiveModal: (modal: ModalType) => void;
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
