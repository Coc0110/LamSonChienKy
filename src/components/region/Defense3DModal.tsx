import React, { useEffect, useState } from 'react';
import { Shield, ShieldAlert, Trophy } from 'lucide-react';
import type { DefenseBattleState, RegionCombatUnit } from '../../types/region';
import { deployDefenseReserve, stepDefenseBattle } from '../../utils/defenseCombatEngine';
import { Region3DCanvas } from './Region3DCanvas';

interface Defense3DModalProps {
  initialState: DefenseBattleState;
  onComplete: (finalState: DefenseBattleState) => void;
}

export const Defense3DModal: React.FC<Defense3DModalProps> = ({ initialState, onComplete }) => {
  const [battle, setBattle] = useState<DefenseBattleState>(initialState);
  const [reserveType, setReserveType] = useState<RegionCombatUnit['unitType']>('swordsman');

  useEffect(() => {
    if (battle.status !== 'fighting') return;
    const id = window.setInterval(() => {
      setBattle((prev) => stepDefenseBattle(prev, 0.15));
    }, 150);
    return () => clearInterval(id);
  }, [battle.status]);

  const handleClickCell = (col: number, row: number) => {
    if (battle.status !== 'fighting') return;
    setBattle((prev) => deployDefenseReserve(prev, reserveType, col, row));
  };

  const isEnded = battle.status !== 'fighting';

  return (
    <div className="fixed inset-0 z-50 bg-[#dbe6d5]">
      <Region3DCanvas
        layout={battle.layout}
        units={battle.units}
        onClickCell={handleClickCell}
      />

      <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-between p-4">
        <div className="pointer-events-auto rounded-xl border border-red-900/40 bg-[#f6ecd9]/95 px-4 py-2.5 shadow-lg text-stone-900">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-red-700" />
            <h2 className="text-base font-bold">Phòng Thủ Căn Cứ: {battle.cityName}</h2>
          </div>
          <p className="mt-0.5 text-xs text-stone-700">
            Quân Minh đang tấn công! Click vào trong căn cứ để tung quân dự bị tiếp ứng.
          </p>
        </div>
      </div>

      {!isEnded ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center">
          <div className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-amber-900/40 bg-[#f6ecd9]/95 p-2 shadow-xl">
            {(['swordsman', 'spearman', 'archer'] as const).map((t) => {
              const count = battle.reservePool[t] || 0;
              return (
                <button
                  key={t}
                  disabled={count <= 0}
                  onClick={() => setReserveType(t)}
                  className={`rounded-xl border px-3.5 py-2 text-xs font-semibold cursor-pointer ${
                    reserveType === t ? 'border-amber-700 bg-amber-100' : 'border-stone-300 bg-white/80'
                  } disabled:opacity-40`}
                >
                  {t === 'swordsman' ? 'Đao Binh' : t === 'spearman' ? 'Thương Binh' : 'Cung Thủ'} ({count})
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-amber-900/50 bg-[#f6ecd9] p-6 text-center shadow-2xl text-stone-900">
            {battle.status === 'victory' ? (
              <Trophy className="mx-auto h-12 w-12 text-emerald-700" />
            ) : (
              <ShieldAlert className="mx-auto h-12 w-12 text-red-700" />
            )}
            <h3 className="mt-3 text-xl font-bold">
              {battle.status === 'victory' ? 'Giữ Vững Căn Cứ!' : 'Đại Bản Doanh Đã Bị Đánh Nát!'}
            </h3>
            <p className="mt-1 text-sm text-stone-700">
              {battle.status === 'victory'
                ? 'Quân Minh đã bị đẩy lùi khỏi vùng đất nghĩa quân.'
                : 'Căn cứ thất thủ! Nghĩa quân buộc phải di dời sang địa bàn mới.'}
            </p>
            <button
              onClick={() => onComplete(battle)}
              className="mt-5 rounded-xl bg-red-800 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-900 cursor-pointer"
            >
              Xác nhận
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
