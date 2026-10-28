import React from 'react';
import { X, AlertTriangle, CheckCircle, Info, Flame } from 'lucide-react';
import { useDialogStore } from '../../store/dialogStore';
import type { ToastType } from '../../store/dialogStore';

const ICONS: Record<ToastType, React.ReactNode> = {
  info: <Info size={16} className="text-[#3b82f6] shrink-0" />,
  success: <CheckCircle size={16} className="text-[#15803d] shrink-0" />,
  warning: <AlertTriangle size={16} className="text-[#b45309] shrink-0" />,
  error: <Flame size={16} className="text-[#b91c1c] shrink-0" />,
};

const BORDER_COLORS: Record<ToastType, string> = {
  info: 'border-[#3b82f6]/40',
  success: 'border-[#15803d]/40',
  warning: 'border-[#b45309]/50',
  error: 'border-[#b91c1c]/60',
};

export const ParchmentToastContainer: React.FC = () => {
  const toasts = useDialogStore((state) => state.toasts);
  const removeToast = useDialogStore((state) => state.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-24 right-5 z-[2000] flex flex-col gap-2 pointer-events-none max-w-sm w-full select-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto relative px-3.5 py-2.5 rounded-lg border shadow-[0_8px_25px_rgba(0,0,0,0.6)] backdrop-blur-sm bg-[#fbf5e8] text-[#261304] transition-all duration-200 animate-in fade-in slide-in-from-top-3 flex items-start gap-2.5 ${BORDER_COLORS[toast.type]}`}
        >
          {/* Vết mực trang trí nền nhẹ */}
          <div className="mt-0.5">
            {ICONS[toast.type]}
          </div>

          <div className="flex-1 text-xs font-serif leading-relaxed pr-2 whitespace-pre-line font-medium text-[#2a1708]">
            {toast.message}
          </div>

          <button
            onClick={() => removeToast(toast.id)}
            className="text-[#8c6b44] hover:text-[#8c2d19] transition-colors p-0.5 -mr-1 -mt-1 cursor-pointer shrink-0"
            title="Đóng"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};
