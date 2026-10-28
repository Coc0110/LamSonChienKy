import React from 'react';
import { X, AlertCircle } from 'lucide-react';
import { useDialogStore } from '../../store/dialogStore';

export const ParchmentConfirmModal: React.FC = () => {
  const confirmDialog = useDialogStore((state) => state.confirmDialog);
  const closeConfirm = useDialogStore((state) => state.closeConfirm);

  if (!confirmDialog) return null;

  const handleConfirm = () => {
    const fn = confirmDialog.onConfirm;
    closeConfirm();
    fn();
  };

  const handleCancel = () => {
    if (confirmDialog.onCancel) {
      confirmDialog.onCancel();
    }
    closeConfirm();
  };

  return (
    <div
      className="fixed inset-0 z-[2500] flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150 select-none"
      onClick={handleCancel}
    >
      <div
        className="relative w-full max-w-md max-h-[85vh] flex flex-col pointer-events-auto filter drop-shadow-[0_20px_40px_rgba(0,0,0,0.9)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Nền giấy Dó sứt mẻ tự nhiên */}
        <img
          src="/parchment_torn_panel.png"
          alt="Khung quân lệnh"
          className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none z-0"
          draggable={false}
        />

        <div className="relative z-10 px-7 pt-6 pb-7 flex flex-col h-full font-serif">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#8c6b44]/30 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#8c2d19]/10 flex items-center justify-center text-[#8c2d19] border border-[#8c6b44]/30">
                <AlertCircle size={18} />
              </div>
              <h3 className="font-serif font-black text-lg text-[#261304] leading-tight">
                {confirmDialog.title || 'Quân Lệnh Chiếu Thư'}
              </h3>
            </div>

            <button
              onClick={handleCancel}
              className="relative group w-6 h-6 flex items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-pointer"
              title="Hủy bỏ"
            >
              <img
                src="/ink_blot_red.png"
                alt="Chấm mực"
                className="absolute inset-0 w-full h-full object-contain pointer-events-none opacity-0 group-hover:opacity-90 transition-opacity"
              />
              <span className="relative z-10 text-[#593922] group-hover:text-[#fcf4e4] transition-colors">
                <X size={16} strokeWidth={2.5} />
              </span>
            </button>
          </div>

          {/* Body */}
          <div className="py-2 text-xs md:text-sm text-[#2a1708] leading-relaxed whitespace-pre-line">
            {confirmDialog.message}
          </div>

          {/* Action buttons dạng vệt mực thư pháp */}
          <div className="pt-4 mt-2 border-t border-[#8c6b44]/30 flex gap-3">
            <button
              type="button"
              onClick={handleCancel}
              className="relative group flex-1 py-2 min-h-[38px] flex items-center justify-center transition-transform hover:scale-105 active:scale-95 cursor-pointer"
            >
              <img
                src="/ink_stroke_1.png"
                alt="Vệt mực hủy"
                className="absolute inset-0 w-full h-full object-fill pointer-events-none drop-shadow-[0_2px_3px_rgba(0,0,0,0.3)] group-hover:brightness-125 transition-all"
              />
              <span className="relative z-10 text-[#fcf4e4] font-serif font-bold text-xs drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                {confirmDialog.cancelText || 'Hủy Bỏ'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              className="relative group flex-1 py-2 min-h-[38px] flex items-center justify-center transition-transform hover:scale-105 active:scale-95 cursor-pointer"
            >
              <img
                src="/ink_stroke_red.png"
                alt="Vệt mực xác nhận"
                className="absolute inset-0 w-full h-full object-fill pointer-events-none drop-shadow-[0_2px_3px_rgba(0,0,0,0.3)] group-hover:brightness-110 transition-all"
              />
              <span className="relative z-10 text-[#fcf4e4] font-serif font-bold text-xs drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                {confirmDialog.confirmText || 'Xác Nhận'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
