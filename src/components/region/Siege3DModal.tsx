import React, { useEffect, useState } from 'react';
import { Flame, ShieldAlert, Swords, Trophy, X } from 'lucide-react';
import type { RegionCombatUnit, SiegeBattleState } from '../../types/region';
import { deploySiegeUnit, isValidSiegeDeployCell, stepSiegeBattle } from '../../utils/siegeCombatEngine';
import { Region3DCanvas } from './Region3DCanvas';

interface Siege3DModalProps {
  initialState: SiegeBattleState;
  onComplete: (finalState: SiegeBattleState) => void;
  onClose: () => void;
}

const UNIT_LABELS: Array<{ key: RegionCombatUnit['unitType']; label: string }> = [
  { key: 'swordsman', label: 'Đao Binh' },
  { key: 'spearman', label: 'Thương Binh' },
  { key: 'archer', label: 'Cung Thủ' },
  { key: 'cavalry', label: 'Kỵ Binh' },
  { key: 'elephant', label: 'Tượng Binh' },
];

export const Siege3DModal: React.FC<Siege3DModalProps> = ({
  initialState,
  onComplete,
  onClose,
}) => {
  const [battle, setBattle] = useState<SiegeBattleState>(initialState);
  const [selectedDeployType, setSelectedDeployType] = useState<RegionCombatUnit['unitType']>('swordsman');

  useEffect(() => {
    if (battle.status !== 'fighting') return;
    const id = window.setInterval(() => {
      setBattle((prev) => stepSiegeBattle(prev, 0.15));
    }, 150);
    return () => clearInterval(id);
  }, [battle.status]);

  const handleClickCell = (col: number, row: number) => {
    if (battle.status === 'victory' || battle.status === 'defeat') return;
    if (!isValidSiegeDeployCell(col, row, battle.layout.gridSize)) return;
    setBattle((prev) => deploySiegeUnit(prev, selectedDeployType, col, row));
  };

  const isEnded = battle.status === 'victory' || battle.status === 'defeat';

  return (
    <div className="fixed inset-0 z-50 bg-[#dbe6d5]">
      <Region3DCanvas
        layout={battle.layout}
        isEnemy
        units={battle.units}
        deployZoneHighlight={!isEnded}
        onClickCell={handleClickCell}
      />

      {/* Top HUD */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex items-start justify-between p-4">
        <div className="pointer-events-auto rounded-xl border border-red-900/40 bg-[#f6ecd9]/95 px-4 py-2.5 shadow-lg text-stone-900">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-red-700" />
            <h2 className="text-base font-bold">Công Thành 3D: {battle.targetCityName}</h2>
          </div>
          <div className="mt-1 flex items-center gap-4 text-xs">
            <span>Phá hủy: <strong className="text-red-700">{battle.destructionPercent}%</strong></span>
            <span>Chiến lợi phẩm: <strong>{battle.lootFood}L · {battle.lootWeapons}K · {battle.lootGold}V</strong></span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="pointer-events-auto rounded-xl bg-stone-900/90 px-3 py-2 text-xs font-semibold text-amber-100 hover:bg-stone-800 cursor-pointer flex items-center gap-1"
        >
          <X className="h-4 w-4" /> Rút quân
        </button>
      </div>

      {/* Bottom Deploy Bar */}
      {!isEnded ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2">
          <div className="rounded-full bg-stone-900/85 px-4 py-1 text-xs text-amber-100">
            Chọn binh chủng rồi click vào vùng viền cam ngoài thành để thả quân công phá
          </div>
          <div className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-amber-900/40 bg-[#f6ecd9]/95 p-2 shadow-xl">
            {UNIT_LABELS.map((u) => {
              const count = battle.deployPool[u.key] || 0;
              const active = selectedDeployType === u.key;
              return (
                <button
                  key={u.key}
                  disabled={count <= 0}
                  onClick={() => setSelectedDeployType(u.key)}
                  className={`flex flex-col items-center rounded-xl border px-3.5 py-2 text-xs font-semibold cursor-pointer transition ${
                    active
                      ? 'border-red-700 bg-red-100 text-red-900'
                      : 'border-stone-300 bg-white/80 text-stone-800 hover:bg-amber-50'
                  } disabled:opacity-40`}
                >
                  <span>{u.label}</span>
                  <span className="text-[11px] text-stone-600">Còn {count}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-amber-900/50 bg-[#f6ecd9] p-6 text-center shadow-2xl text-stone-900">
            {battle.status === 'victory' ? (
              <Trophy className="mx-auto h-12 w-12 text-amber-600" />
            ) : (
              <ShieldAlert className="mx-auto h-12 w-12 text-red-700" />
            )}
            <h3 className="mt-3 text-xl font-bold">
              {battle.status === 'victory' ? 'Hạ Thành Thắng Lợi!' : 'Công Thành Thất Bại'}
            </h3>
            <p className="mt-1 text-sm text-stone-700">
              Mức phá hủy: <strong>{battle.destructionPercent}%</strong> · Thu được{' '}
              <strong>{battle.lootFood}</strong> lương, <strong>{battle.lootWeapons}</strong> binh khí,{' '}
              <strong>{battle.lootGold}</strong> vàng.
            </p>
            <button
              onClick={() => onComplete(battle)}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-amber-800 px-5 py-2.5 text-sm font-bold text-white hover:bg-amber-900 cursor-pointer"
            >
              <Swords className="h-4 w-4" /> Xác nhận & Quay lại bản đồ
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
