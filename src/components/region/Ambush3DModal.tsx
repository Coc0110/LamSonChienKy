import React, { useEffect, useMemo, useState } from 'react';
import { Compass, ShieldAlert, Trophy } from 'lucide-react';
import type { AmbushBattleState, BaseBuilding, RegionCombatUnit, RegionLayout } from '../../types/region';
import { stepAmbushBattle } from '../../utils/ambushCombatEngine';
import { Region3DCanvas } from './Region3DCanvas';

interface Ambush3DModalProps {
  initialState: AmbushBattleState;
  onComplete: (finalState: AmbushBattleState) => void;
}

export const Ambush3DModal: React.FC<Ambush3DModalProps> = ({ initialState, onComplete }) => {
  const [battle, setBattle] = useState<AmbushBattleState>(initialState);

  const emptyLayout: RegionLayout = useMemo(
    () => ({
      cityId: battle.id,
      gridSize: battle.gridSize,
      terrainSeed: 1,
      buildings: [],
    }),
    [battle.id, battle.gridSize]
  );

  useEffect(() => {
    if (battle.status !== 'fighting') return;
    const id = window.setInterval(() => {
      setBattle((prev) => stepAmbushBattle(prev, 0.15));
    }, 150);
    return () => clearInterval(id);
  }, [battle.status]);

  const handleClickCell = (
    col: number,
    row: number,
    _b: BaseBuilding | null,
    unit: RegionCombatUnit | null
  ) => {
    if (battle.status !== 'fighting') return;
    if (unit && unit.faction === 'lam_son') {
      setBattle((prev) => ({ ...prev, selectedUnitId: unit.id }));
      return;
    }
    if (battle.selectedUnitId) {
      setBattle((prev) => ({
        ...prev,
        moveTargets: {
          ...prev.moveTargets,
          [prev.selectedUnitId!]: { x: col + 0.5, z: row + 0.5 },
        },
      }));
    }
  };

  const isEnded = battle.status !== 'fighting';

  return (
    <div className="fixed inset-0 z-50 bg-[#dbe6d5]">
      <Region3DCanvas
        layout={emptyLayout}
        units={battle.units}
        blockedTiles={battle.blockedTiles}
        exitZone={battle.exitZone}
        selectedUnitId={battle.selectedUnitId}
        onClickCell={handleClickCell}
      />

      <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-between p-4">
        <div className="pointer-events-auto rounded-xl border border-amber-900/40 bg-[#f6ecd9]/95 px-4 py-2.5 shadow-lg text-stone-900">
          <div className="flex items-center gap-2">
            <Compass className="h-5 w-5 text-amber-800" />
            <h2 className="text-base font-bold">Phục Kích Ngoài Đồng — {battle.districtName}</h2>
          </div>
          <p className="mt-0.5 text-xs text-stone-700">
            Click chọn cánh quân Lam Sơn rồi click lên đường mòn để điều quân phá vây tới vùng xanh phía Bắc hoặc tiêu diệt hết quân Minh.
          </p>
        </div>
      </div>

      {isEnded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-amber-900/50 bg-[#f6ecd9] p-6 text-center shadow-2xl text-stone-900">
            {battle.status === 'defeat' ? (
              <ShieldAlert className="mx-auto h-12 w-12 text-red-700" />
            ) : (
              <Trophy className="mx-auto h-12 w-12 text-emerald-700" />
            )}
            <h3 className="mt-3 text-xl font-bold">
              {battle.status === 'victory'
                ? 'Đại Phá Ổ Phục Kích!'
                : battle.status === 'escaped'
                ? 'Phá Vây Thành Công!'
                : 'Toàn Quân Bị Đánh Tan'}
            </h3>
            <p className="mt-1 text-sm text-stone-700">
              {battle.status === 'defeat'
                ? 'Đạo quân không thể vượt qua vòng vây quân Minh.'
                : 'Nghĩa quân tiếp tục tiến bước về mục tiêu.'}
            </p>
            <button
              onClick={() => onComplete(battle)}
              className="mt-5 rounded-xl bg-amber-800 px-5 py-2.5 text-sm font-bold text-white hover:bg-amber-900 cursor-pointer"
            >
              Tiếp tục chiến dịch
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
