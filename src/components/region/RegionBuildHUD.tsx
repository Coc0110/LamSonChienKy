import React from 'react';
import {
  ArrowUpCircle,
  Eye,
  Hammer,
  MapPin,
  Move,
  Shield,
  Swords,
  Trash2,
  X,
  ZoomOut,
} from 'lucide-react';
import type { BaseBuilding, BaseBuildingType, RegionLayout } from '../../types/region';
import {
  BASE_BUILDING_CATALOG,
  BUILDING_BUILD_ORDER,
  getUpgradeCost,
} from '../../data/regionBuildings';

interface RegionBuildHUDProps {
  cityName: string;
  mode: 'base_build' | 'scout_view';
  layout: RegionLayout;
  gold: number;
  food: number;
  selectedBuilding: BaseBuilding | null;
  activeBuildType: BaseBuildingType | null;
  isMovingBuilding: boolean;
  hoveredCell: { col: number; row: number } | null;
  enemyTroops?: number;
  onSelectBuildType: (type: BaseBuildingType | null) => void;
  onUpgradeBuilding: (buildingId: string) => void;
  onStartMoveBuilding: () => void;
  onDemolishBuilding: (buildingId: string) => void;
  onOpenBarracks: () => void;
  onClearSelection: () => void;
  onZoomOut: () => void;
}

export const RegionBuildHUD: React.FC<RegionBuildHUDProps> = ({
  cityName,
  mode,
  layout,
  gold,
  food,
  selectedBuilding,
  activeBuildType,
  isMovingBuilding,
  hoveredCell,
  enemyTroops = 0,
  onSelectBuildType,
  onUpgradeBuilding,
  onStartMoveBuilding,
  onDemolishBuilding,
  onOpenBarracks,
  onClearSelection,
  onZoomOut,
}) => {
  const isScout = mode === 'scout_view';
  const mainHall = layout.buildings.find((b) => b.type === 'main_hall' && b.status !== 'destroyed');
  const watchtowerCount = layout.buildings.filter((b) => b.type === 'watchtower' && b.status !== 'destroyed').length;
  const wallCount = layout.buildings.filter((b) => b.type === 'wall' && b.status !== 'destroyed').length;

  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex flex-col justify-between p-4">
      {/* Top Bar */}
      <div className="flex items-start justify-between gap-4">
        <div className="pointer-events-auto flex items-center gap-3 rounded-xl border border-amber-900/40 bg-[#f6ecd9]/95 px-4 py-2.5 shadow-md text-stone-900">
          {isScout ? (
            <Eye className="h-5 w-5 text-sky-700" />
          ) : (
            <Hammer className="h-5 w-5 text-amber-800" />
          )}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold tracking-tight">{cityName}</h2>
              <span
                className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
                  isScout ? 'bg-sky-100 text-sky-800' : 'bg-amber-200/80 text-amber-900'
                }`}
              >
                {isScout ? 'Do thám 3D (Chỉ xem)' : `Căn cứ 3D · Bản Doanh Cấp ${mainHall?.level ?? 1}`}
              </span>
            </div>
            <div className="mt-0.5 flex items-center gap-3 text-xs text-stone-600">
              {!isScout ? (
                <>
                  <span>Vàng: <strong className="text-amber-800">{Math.floor(gold)}</strong></span>
                  <span>Lương: <strong className="text-emerald-800">{Math.floor(food)}</strong></span>
                </>
              ) : (
                <>
                  <span>Đồn trú: <strong className="text-red-700">{enemyTroops} quân</strong></span>
                  <span>Chòi canh: <strong>{watchtowerCount}</strong></span>
                  <span>Tường thành: <strong>{wallCount}</strong></span>
                </>
              )}
              {hoveredCell && (
                <span className="inline-flex items-center gap-1 text-stone-500">
                  <MapPin className="h-3 w-3" /> ({hoveredCell.col}, {hoveredCell.row})
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={onZoomOut}
          className="pointer-events-auto flex items-center gap-2 rounded-xl border border-stone-800/30 bg-stone-900 px-4 py-2.5 text-sm font-semibold text-amber-100 shadow-md hover:bg-stone-800 cursor-pointer"
        >
          <ZoomOut className="h-4 w-4" />
          Thu nhỏ ra bản đồ
        </button>
      </div>

      {/* Middle-Right Selected Building Inspector */}
      {selectedBuilding && (
        <div className="pointer-events-auto self-end w-80 rounded-xl border border-amber-900/40 bg-[#f6ecd9]/95 p-4 shadow-lg text-stone-900">
          {(() => {
            const spec = BASE_BUILDING_CATALOG[selectedBuilding.type];
            const upgradeCost = getUpgradeCost(selectedBuilding.type, selectedBuilding.level);
            const isMax = selectedBuilding.level >= spec.maxLevel;
            const isBusy = selectedBuilding.status === 'building' || selectedBuilding.status === 'upgrading';
            return (
              <>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-stone-900">
                      {spec.name} <span className="text-amber-800">Lv.{selectedBuilding.level}</span>
                    </h3>
                    <p className="text-xs text-stone-600 mt-0.5">{spec.effectLabel(selectedBuilding.level)}</p>
                  </div>
                  <button
                    onClick={onClearSelection}
                    className="rounded p-1 text-stone-500 hover:bg-stone-200 cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <p className="mt-2 text-xs text-stone-700 leading-relaxed">{spec.description}</p>

                <div className="mt-2.5 flex items-center justify-between rounded-lg bg-stone-900/5 px-2.5 py-1.5 text-xs">
                  <span className="flex items-center gap-1 text-stone-700">
                    <Shield className="h-3.5 w-3.5 text-emerald-700" />
                    Độ bền: <strong>{selectedBuilding.hp}/{selectedBuilding.maxHp}</strong>
                  </span>
                  {isBusy && (
                    <span className="font-semibold text-amber-700">
                      Còn {selectedBuilding.buildDaysRemaining} ngày
                    </span>
                  )}
                </div>

                {!isScout && (
                  <div className="mt-3 flex flex-col gap-2">
                    {selectedBuilding.type === 'barracks' && (
                      <button
                        onClick={onOpenBarracks}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-700 px-3 py-2 text-xs font-semibold text-white hover:bg-red-800 cursor-pointer"
                      >
                        <Swords className="h-4 w-4" />
                        Luyện Binh & Đội Hình (Cấp Lính)
                      </button>
                    )}

                    <div className="flex gap-2">
                      <button
                        disabled={isMax || isBusy}
                        onClick={() => onUpgradeBuilding(selectedBuilding.id)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-amber-700 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-800 disabled:opacity-45 cursor-pointer"
                      >
                        <ArrowUpCircle className="h-3.5 w-3.5" />
                        {isMax
                          ? 'Tối đa'
                          : `Nâng (${upgradeCost.gold}V / ${upgradeCost.food}L)`}
                      </button>
                      <button
                        onClick={onStartMoveBuilding}
                        className={`flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold cursor-pointer ${
                          isMovingBuilding
                            ? 'bg-sky-700 text-white'
                            : 'bg-stone-200 text-stone-800 hover:bg-stone-300'
                        }`}
                      >
                        <Move className="h-3.5 w-3.5" />
                        Dời
                      </button>
                      {selectedBuilding.type !== 'main_hall' && (
                        <button
                          onClick={() => onDemolishBuilding(selectedBuilding.id)}
                          className="flex items-center justify-center rounded-lg bg-red-100 px-2.5 py-2 text-xs font-semibold text-red-700 hover:bg-red-200 cursor-pointer"
                          title="Tháo dỡ"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* Bottom Build Palette (chỉ hiện ở base_build) */}
      {!isScout && (
        <div className="pointer-events-auto mx-auto flex max-w-5xl flex-col items-center gap-2">
          {(activeBuildType || isMovingBuilding) && (
            <div className="flex items-center gap-3 rounded-full bg-stone-900/90 px-4 py-1.5 text-xs font-medium text-amber-100 shadow">
              <span>
                {isMovingBuilding
                  ? 'Click lên lưới 3D để đặt công trình sang vị trí mới'
                  : `Đang chọn xây: ${BASE_BUILDING_CATALOG[activeBuildType!].name} — Click lên ô xanh để đặt`}
              </span>
              <button
                onClick={() => onSelectBuildType(null)}
                className="rounded-full bg-white/15 px-2 py-0.5 hover:bg-white/25 cursor-pointer"
              >
                Hủy
              </button>
            </div>
          )}

          <div className="flex w-full items-center gap-2 overflow-x-auto rounded-2xl border border-amber-900/40 bg-[#f6ecd9]/95 p-2 shadow-lg">
            {BUILDING_BUILD_ORDER.map((type) => {
              const spec = BASE_BUILDING_CATALOG[type];
              const isSelected = activeBuildType === type;
              const canAfford = gold >= spec.goldCost && food >= spec.foodCost;
              return (
                <button
                  key={type}
                  onClick={() => onSelectBuildType(isSelected ? null : type)}
                  className={`flex shrink-0 flex-col items-start rounded-xl border px-3 py-2 text-left transition-colors cursor-pointer ${
                    isSelected
                      ? 'border-amber-700 bg-amber-200/80 text-stone-900'
                      : 'border-stone-300/80 bg-white/75 text-stone-800 hover:bg-amber-50'
                  } ${!canAfford ? 'opacity-60' : ''}`}
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className="text-xs font-bold">{spec.shortName}</span>
                    <span className="text-[10px] text-stone-500">
                      {spec.spanCols}×{spec.spanRows}
                    </span>
                  </div>
                  <div className="mt-1 text-[10px] font-medium text-stone-600">
                    {spec.goldCost}V · {spec.foodCost}L
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
