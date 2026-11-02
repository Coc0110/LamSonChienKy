import React from 'react';
import { Trophy, Skull, RotateCcw, Play, Save } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';

export const EndgameModal: React.FC = () => {
  const gameStatus = useGameStore(state => state.gameStatus);
  const setGameStatus = useGameStore(state => state.setGameStatus);
  const resetGame = useGameStore(state => state.resetGame);
  const loadGame = useGameStore(state => state.loadGame);

  if (gameStatus === 'playing') return null;

  const isVictory = gameStatus === 'victory';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in select-none">
      <div className="relative w-full max-w-xl bg-[#f4ecd8] border-4 border-[#8c2d19] rounded-lg shadow-2xl overflow-hidden text-[#2a1708]">
        {/* Nền giấy cổ phong */}
        <img
          src="/parchment_torn_panel.png"
          alt="Parchment Background"
          className="absolute inset-0 w-full h-full object-fill pointer-events-none opacity-40 mix-blend-multiply"
        />

        <div className="relative z-10 p-6 md:p-8 flex flex-col items-center text-center">
          {/* Huy hiệu biểu tượng */}
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 border-2 shadow-lg ${
            isVictory 
              ? 'bg-amber-100/90 border-amber-600 text-amber-700 animate-bounce' 
              : 'bg-stone-800/90 border-red-800 text-red-500'
          }`}>
            {isVictory ? <Trophy className="w-10 h-10" /> : <Skull className="w-10 h-10" />}
          </div>

          {/* Tiêu đề */}
          <h2 className="text-2xl md:text-3xl font-serif font-black tracking-wide text-[#701a14] mb-2 drop-shadow-sm">
            {isVictory ? 'ĐẠI THẮNG TÂY ĐÔ - PHỦ THANH HÓA GIẢI PHÓNG' : 'CHÍ LỚN LAM SƠN DỞ DANG'}
          </h2>

          <p className="text-sm md:text-base font-serif italic text-stone-700 mb-6 max-w-md leading-relaxed">
            {isVictory ? (
              <>
                &ldquo;Đem đại nghĩa để thắng hung tàn,<br />
                Lấy chí nhân để thay cường bạo.<br />
                Gươm mài đá đá núi cũng mòn,<br />
                Voi uống nước nước sông phải cạn!&rdquo;
              </>
            ) : (
              <>
                Toàn bộ căn cứ địa nghĩa quân đã thất thủ, sĩ khí tiêu tan. Cuộc khởi nghĩa tạm gác lại đợi ngày hào kiệt muôn phương tái khởi...
              </>
            )}
          </p>

          {/* Các nút hành động */}
          <div className="flex flex-wrap items-center justify-center gap-3 w-full max-w-sm mt-2">
            {isVictory && (
              <button
                onClick={() => setGameStatus('playing')}
                className="w-full sm:w-auto px-5 py-2.5 rounded bg-amber-700 hover:bg-amber-800 active:scale-95 text-amber-100 font-serif font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4" />
                Tiếp tục thống lĩnh
              </button>
            )}

            {!isVictory && (
              <button
                onClick={() => loadGame()}
                className="w-full sm:w-auto px-5 py-2.5 rounded bg-amber-800 hover:bg-amber-900 active:scale-95 text-amber-100 font-serif font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                Tải lại quân cơ đã lưu
              </button>
            )}

            <button
              onClick={() => resetGame()}
              className="w-full sm:w-auto px-5 py-2.5 rounded bg-stone-700 hover:bg-stone-800 active:scale-95 text-stone-200 font-serif font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Khởi nghĩa lại từ đầu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
