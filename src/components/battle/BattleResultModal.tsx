import React from 'react';
import type { BattlefieldState } from '../../types/battlefield';

interface BattleResultModalProps {
  battleState: BattlefieldState;
  onClose: () => void;
}

export const BattleResultModal: React.FC<BattleResultModalProps> = ({
  battleState,
  onClose,
}) => {
  const isVictory = battleState.phase === 'victory';
  const isRetreat = battleState.phase === 'retreated';
  const isDefeat = battleState.phase === 'defeat';

  const resultTitle = isVictory 
    ? '🚩 Đại Thắng Toàn Quân' 
    : isRetreat 
    ? '🛡️ Thu Quân Rút Lui Chiến Thuật' 
    : '⚠️ Toàn Quân Tận Diệt - Đại Bại';

  const survivorsLamSon = Math.max(0, battleState.initialLamSonSoldiers - battleState.casualties.lamSonKilled);
  const remainingMing = Math.max(0, battleState.initialMingSoldiers - battleState.casualties.mingKilled);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs select-none">
      <div className="relative w-full max-w-lg min-h-[460px] flex flex-col justify-between p-6 md:p-8 font-serif text-[#261304] select-none filter drop-shadow-[0_18px_30px_rgba(0,0,0,0.7)]">
        <img
          src="/parchment_torn_panel.png"
          alt="Sớ Chiến Báo"
          className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none z-0"
          draggable={false}
        />

        <div className="relative z-10 space-y-4">
          {/* TIÊU ĐỀ SỚ BÁO */}
          <div className="border-b border-[#8c6b44]/40 pb-2 text-center">
            <h2 className="text-base font-black tracking-wider uppercase text-[#8c2d19]">
              Chiến Báo Quân Cơ
            </h2>
            <p className="text-xs text-[#704d2e] pt-0.5">
              Địa bàn: {battleState.locationName} • Trận: {battleState.battleName}
            </p>
          </div>

          {/* KẾT QUẢ GIAO TRANH */}
          <div className="p-3 rounded-lg border border-[#8c6b44]/35 bg-[#8c6b44]/10 text-center space-y-1">
            <h3 className={`text-sm font-black tracking-wide ${isVictory ? 'text-[#15803d]' : 'text-[#8c2d19]'}`}>
              {resultTitle}
            </h3>
            <p className="text-xs text-[#704d2e]">
              Chiến sự khép lại sau {battleState.turn} lượt giao tranh giằng co.
            </p>
          </div>

          {/* CHI TIẾT THƯƠNG VONG HAI BÊN */}
          <div className="space-y-3 text-xs">
            {/* Nghĩa quân Lam Sơn */}
            <div className="p-2.5 rounded border border-[#8c6b44]/25 bg-[#8c6b44]/5 space-y-1">
              <span className="font-bold text-[#15803d]">I. Quân Lực Lam Sơn:</span>
              <ul className="space-y-0.5 pl-3 border-l-2 border-[#15803d]/40">
                <li>Xuất trận: <strong className="font-bold text-[#261304]">{battleState.initialLamSonSoldiers}</strong> nghĩa binh</li>
                <li>Tổn thất: <strong className="font-bold text-[#8c2d19]">{battleState.casualties.lamSonKilled}</strong> người</li>
                <li>Lực lượng bảo toàn: <strong className="font-bold text-[#15803d]">{survivorsLamSon}</strong> người</li>
                {battleState.casualties.weaponsLost > 0 && (
                  <li>Binh khí hư hao: <span className="text-[#8c2d19]">{battleState.casualties.weaponsLost} món</span></li>
                )}
              </ul>
            </div>

            {/* Quân Minh */}
            <div className="p-2.5 rounded border border-[#8c6b44]/25 bg-[#8c6b44]/5 space-y-1">
              <span className="font-bold text-[#8c2d19]">II. Lực Lượng Quân Minh:</span>
              <ul className="space-y-0.5 pl-3 border-l-2 border-[#8c2d19]/40">
                <li>Binh lực ban đầu: <strong className="font-bold text-[#261304]">{battleState.initialMingSoldiers}</strong> quân</li>
                <li>Bị tiêu diệt / Vỡ trận: <strong className="font-bold text-[#8c2d19]">{battleState.casualties.mingKilled}</strong> tên</li>
                <li>Tàn quân tháo chạy: <span className="text-stone-600">{remainingMing} tên</span></li>
              </ul>
            </div>

            {/* Tình hình Chiến Lợi Phẩm / Hậu Quả Chiến Trường */}
            {isVictory ? (
              <div className="p-2.5 rounded border border-[#8c6b44]/25 bg-[#8c6b44]/5 space-y-1">
                <span className="font-bold text-[#b45309]">III. Chiến Lợi Phẩm Tịch Thu:</span>
                <ul className="space-y-0.5 pl-3 border-l-2 border-[#b45309]/40 text-[#261304]">
                  <li>Khí giới đoạt được: <strong className="font-bold text-[#15803d]">{battleState.casualties.weaponsCaptured} món</strong></li>
                  <li>Lương thảo thu gom: <strong className="font-bold text-[#15803d]">{battleState.casualties.foodCaptured} thạch</strong></li>
                  <li>Ngân lượng chiến phí: <strong className="font-bold text-[#15803d]">{battleState.casualties.goldCaptured} quan</strong></li>
                </ul>
              </div>
            ) : isDefeat ? (
              <div className="p-2.5 rounded border border-red-800/30 bg-red-900/10 space-y-1">
                <span className="font-bold text-[#8c2d19]">III. Hậu Quả & Thiệt Hại Chiến Trường:</span>
                <p className="text-[11px] text-stone-700 italic">
                  Nghĩa quân đại bại, chiến trường hoàn toàn rơi vào tay giặc Minh. Binh khí và quân lương xuất trận đều bị tiêu hao tổn thất, không thu được chiến lợi phẩm!
                </p>
                <ul className="space-y-0.5 pl-3 border-l-2 border-[#8c2d19]/40 text-[#261304] pt-1">
                  <li>Binh khí hư hao / rơi vào tay giặc: <strong className="font-bold text-[#8c2d19]">{battleState.casualties.weaponsLost} món</strong></li>
                  <li>Chiến lợi phẩm đoạt được: <strong className="font-bold text-stone-500">0 (Chiến bại)</strong></li>
                </ul>
              </div>
            ) : (
              <div className="p-2.5 rounded border border-amber-800/30 bg-amber-900/10 space-y-1">
                <span className="font-bold text-[#b45309]">III. Kết Quả Thu Quân:</span>
                <p className="text-[11px] text-stone-700 italic">
                  Nghĩa quân chủ động phá vây rút lui để bảo toàn sinh lực. Quân Minh giữ trận địa nên nghĩa quân không thể thu gom chiến lợi phẩm.
                </p>
                <ul className="space-y-0.5 pl-3 border-l-2 border-[#b45309]/40 text-[#261304] pt-1">
                  <li>Binh sĩ bảo toàn: <strong className="font-bold text-[#15803d]">{survivorsLamSon} người</strong></li>
                  <li>Chiến lợi phẩm: <strong className="font-bold text-stone-500">0 (Rút lui chiến thuật)</strong></li>
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* NÚT TIẾP NHẬN BÁO CÁO */}
        <div className="relative z-10 pt-4 border-t border-[#8c6b44]/30 flex justify-end">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-lg bg-[#8c2d19] hover:bg-[#6e1e0d] text-[#fff3db] font-serif font-black text-xs uppercase tracking-wider shadow transition cursor-pointer active:scale-98"
          >
            Tiếp Nhận Sớ Báo & Cập Nhật Quân Cơ
          </button>
        </div>
      </div>
    </div>
  );
};
