import React, { useRef } from 'react';
import { Clock } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';

export const TimePanel: React.FC = () => {
  const { day, month, year, isPaused, gameSpeed, togglePause, setSpeed } = useGameStore();

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Sử dụng e.detail chuẩn của DOM để phân biệt chính xác click đơn và nháy đúp
    if (e.detail === 1) {
      // Click lần 1: chờ 280ms để xác nhận người dùng không nháy đúp
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        togglePause();
      }, 280);
    } else if (e.detail >= 2) {
      // Đã nháy đúp: Lập tức hủy bỏ lệnh click đơn để không bị xung đột nháy rồi tắt
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      // Chuyển đổi trạng thái Hỏa tốc 2x
      if (!isPaused && gameSpeed === 2) {
        setSpeed(1);
      } else {
        setSpeed(2);
      }
    }
  };

  const timeState: 'paused' | 'normal' | 'fast' = isPaused ? 'paused' : gameSpeed === 2 ? 'fast' : 'normal';

  return (
    <div 
      onClick={handleClick}
      className={`time-panel-container relative group shrink-0 pointer-events-auto h-11 flex items-center rotate-[-0.5deg] cursor-pointer transition-transform duration-150 hover:scale-105 active:scale-95 text-left select-none ${timeState}`}
      title="Click 1 lần: Tạm dừng / Tiếp tục | Nháy đúp: Bật/Tắt Hỏa tốc 2x"
    >
      {/* 1. LỚP NỀN GIẤY DÓ GỐC */}
      <div 
        className="paper-background absolute inset-0 rounded-[4px_8px_5px_7px] bg-gradient-to-br from-[#f8efe0] via-[#eedec2] to-[#dfcb9f] border border-[#b3956e]"
        style={{
          filter: 'url(#torn-paper-edge)',
          boxShadow: 'inset 0 0 12px rgba(110, 65, 25, 0.32), 2px 3px 6px rgba(40, 25, 10, 0.4)',
        }}
      />

      {/* 2. HIỆU ỨNG ĐÓNG BĂNG: TEXTURE BĂNG MỚI PHỦ KÍN 100% */}
      <div 
        className={`effect-overlay frost-effect absolute inset-0 rounded-[4px_8px_5px_7px] pointer-events-none overflow-hidden transition-opacity duration-300 ease-in-out ${
          timeState === 'paused' ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: 'url(/new_texture_ice.png)',
            backgroundSize: '100% 100%',
            backgroundRepeat: 'no-repeat',
            filter: 'contrast(1.15) brightness(1.05) drop-shadow(0 0 5px rgba(56, 189, 248, 0.45))',
          }}
        />
      </div>

      {/* 3. HIỆU ỨNG BỐC CHÁY: TEXTURE LỬA MỚI PHỦ KÍN 100% & NHẤP NHÁY NHÈ NHẸ */}
      <div 
        className={`effect-overlay fire-effect absolute inset-0 rounded-[4px_8px_5px_7px] pointer-events-none overflow-hidden transition-opacity duration-300 ease-in-out ${
          timeState === 'fast' ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div 
          className="absolute inset-0 animate-gentle-fire"
          style={{
            backgroundImage: 'url(/new_texture_fire.png)',
            backgroundSize: '100% 100%',
            backgroundRepeat: 'no-repeat',
            filter: 'contrast(1.2) brightness(1.1) drop-shadow(0 0 6px rgba(255, 69, 0, 0.6))',
          }}
        />
      </div>

      {/* 4. NỘI DUNG CHỮ NGÀY THÁNG (Nổi lên trên cùng với z-index 10, chữ rõ nét) */}
      <div className="time-content relative z-10 px-3.5 py-1.5 flex items-center gap-2 font-serif text-[#2a1708] font-black text-sm tracking-wide whitespace-nowrap drop-shadow-[0_1px_2px_rgba(255,255,255,0.7)]">
        <Clock className="text-[#8c2d19] transition-transform duration-300 group-hover:rotate-45" size={16} />
        <span>Ngày {day}/{month}/{year}</span>
      </div>
    </div>
  );
};
