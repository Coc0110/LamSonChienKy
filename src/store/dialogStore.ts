import { create } from 'zustand';

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  timestamp: number;
}

export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
}

interface DialogState {
  toasts: ToastItem[];
  confirmDialog: ConfirmDialogOptions | null;

  showToast: (message: string, type?: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
  showConfirm: (options: ConfirmDialogOptions) => void;
  closeConfirm: () => void;
}

export const useDialogStore = create<DialogState>((set) => ({
  toasts: [],
  confirmDialog: null,

  showToast: (message: string, type: ToastType = 'info', duration: number = 3500) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newToast: ToastItem = {
      id,
      message,
      type,
      timestamp: Date.now(),
    };

    set((state) => ({
      toasts: [...state.toasts.slice(-4), newToast], // Giữ tối đa 5 thông báo nổi cùng lúc
    }));

    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, duration);
    }
  },

  removeToast: (id: string) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  showConfirm: (options: ConfirmDialogOptions) => {
    set({ confirmDialog: options });
  },

  closeConfirm: () => {
    set({ confirmDialog: null });
  },
}));

// Helper tiện ích gọi ở bất kỳ đâu trong dự án (cả trong component lẫn trong store)
export const notify = {
  info: (message: string, duration?: number) => useDialogStore.getState().showToast(message, 'info', duration),
  success: (message: string, duration?: number) => useDialogStore.getState().showToast(message, 'success', duration),
  warning: (message: string, duration?: number) => useDialogStore.getState().showToast(message, 'warning', duration),
  error: (message: string, duration?: number) => useDialogStore.getState().showToast(message, 'error', duration),
  confirm: (options: ConfirmDialogOptions) => useDialogStore.getState().showConfirm(options),
};
