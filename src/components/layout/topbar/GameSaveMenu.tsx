import React, { useState, useRef, useEffect } from 'react';
import { Save, FolderDown, RotateCcw, ChevronDown, Archive } from 'lucide-react';
import { useGameStore } from '../../../store/gameStore';
import { notify } from '../../../store/dialogStore';

export const GameSaveMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const saveGame = useGameStore(state => state.saveGame);
  const loadGame = useGameStore(state => state.loadGame);
  const resetGame = useGameStore(state => state.resetGame);
  const lastSavedAt = useGameStore(state => state.lastSavedAt);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      window.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleResetWithConfirm = () => {
    setIsOpen(false);
    notify.confirm({
      title: 'Khởi Đại Nghiệp Lại Từ Đầu?',
      message: 'Mọi tiến trình, công trình xây dựng, khí giới và quân lực sẽ quay về ngày đầu khởi nghĩa năm 1418. Ngài có chắc chắn muốn bắt đầu lại?',
      confirmText: 'Khởi Lại Từ Đầu',
      cancelText: 'Hủy Bỏ',
      isDestructive: true,
      onConfirm: () => resetGame(),
    });
  };

  return (
    <div className="relative shrink-0" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative px-2 py-1 rounded transition-all flex items-center gap-1 text-xs font-serif font-black uppercase tracking-wider cursor-pointer ${
          isOpen ? 'bg-[#8c2d19] text-[#fceddc] shadow-sm' : 'hover:bg-black/[0.06] text-[#6b2512]'
        }`}
        title="Quân cơ lưu bút: Lưu hoặc Tải lại tiến trình game"
      >
        <Archive size={13} />
        <span>LƯU TRỮ</span>
        <ChevronDown size={11} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-60 bg-[#fbf6ea] border-2 border-[#8c2d19] rounded shadow-2xl z-50 p-2.5 flex flex-col gap-2 font-serif text-[#2a1708] animate-fade-in text-xs">
          <div className="border-b border-[#8c6b44]/30 pb-1.5">
            <div className="font-bold text-sm text-[#701a14] flex items-center gap-1.5">
              <Archive size={14} />
              <span>Quân Cơ Lưu Bút</span>
            </div>
            <div className="text-[10px] text-stone-600 mt-0.5">
              {lastSavedAt ? `Lưu gần nhất: ${lastSavedAt}` : 'Tự động lưu vào đầu mỗi tháng'}
            </div>
          </div>

          <div className="flex flex-col gap-1.5 pt-0.5">
            <button
              onClick={() => {
                saveGame();
                setIsOpen(false);
              }}
              className="w-full px-2.5 py-1.5 bg-[#ecd5b3] hover:bg-[#dfc49c] active:scale-95 text-[#4a1b0b] font-bold rounded flex items-center gap-2 transition-all text-left"
            >
              <Save size={13} className="text-[#8c2d19]" />
              <span>Lưu Quân Cơ (Save Game)</span>
            </button>

            <button
              onClick={() => {
                loadGame();
                setIsOpen(false);
              }}
              className="w-full px-2.5 py-1.5 bg-[#ecd5b3] hover:bg-[#dfc49c] active:scale-95 text-[#4a1b0b] font-bold rounded flex items-center gap-2 transition-all text-left"
            >
              <FolderDown size={13} className="text-[#8c2d19]" />
              <span>Đọc Bản Lưu (Load Game)</span>
            </button>

            <button
              onClick={handleResetWithConfirm}
              className="w-full px-2.5 py-1.5 hover:bg-red-100 active:scale-95 text-red-800 font-bold rounded flex items-center gap-2 transition-all text-left border border-red-200"
            >
              <RotateCcw size={13} />
              <span>Khởi nghiệp lại từ đầu</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
