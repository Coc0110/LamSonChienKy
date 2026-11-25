import React from 'react';
import {
  ArrowUpCircle,
  Hammer,
  Lock,
  Move,
  Shield,
  Sparkles,
  Sun,
  Swords,
  Trash2,
  Users,
  Wheat,
  X,
  ZoomOut,
} from 'lucide-react';
import type { BaseBuilding, BaseBuildingType, RegionLayout } from '../../types/region';
import type { BaseAutomationConfig } from '../../store/slices/regionSlice';
import {
  BASE_BUILDING_CATALOG,
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
  isBuildPaletteOpen: boolean;
  isMovingBuilding: boolean;
  hoveredCell: { col: number; row: number } | null;
  enemyTroops?: number;
  baseAutomation: BaseAutomationConfig;
  onUpdateAutomation: (patch: Partial<BaseAutomationConfig>) => void;
  onSelectBuildType: (type: BaseBuildingType | null) => void;
  onCloseBuildPalette: () => void;
  onUpgradeBuilding: (buildingId: string) => void;
  onStartMoveBuilding: () => void;
  onDemolishBuilding: (buildingId: string) => void;
  onOpenBuildingAction: (modal: 'training' | 'forges' | 'farms') => void;
  onClearSelection: () => void;
  onZoomOut: () => void;
}

const BUILD_ORDER: BaseBuildingType[] = [
  'house',
  'farm',
  'forge',
  'barracks',
  'wall',
  'gate',
  'watchtower',
  'spike_trap',
];

export const RegionBuildHUD: React.FC<RegionBuildHUDProps> = ({
  cityName,
  mode,
  gold,
  food,
  selectedBuilding,
  activeBuildType,
  isBuildPaletteOpen,
  isMovingBuilding,
  baseAutomation,
  onUpdateAutomation,
  onSelectBuildType,
  onCloseBuildPalette,
  onUpgradeBuilding,
  onStartMoveBuilding,
  onDemolishBuilding,
  onOpenBuildingAction,
  onClearSelection,
  onZoomOut,
}) => {
  const isScout = mode === 'scout_view';

  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex flex-col justify-between pt-[76px] pb-4 pl-[104px] pr-4">
      {/* Top Bar */}
      <div className="flex items-start justify-end gap-3">
        {isMovingBuilding && selectedBuilding && (
          <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-sky-700/50 bg-sky-950/90 px-4 py-2 text-xs font-semibold text-sky-100 shadow-md">
            <Move className="h-4 w-4 text-sky-300" />
            Nhấn vào vị trí mới trên bản đồ để dời {BASE_BUILDING_CATALOG[selectedBuilding.type].name}
            <button
              onClick={onStartMoveBuilding}
              className="ml-2 rounded bg-sky-800 px-2 py-0.5 text-[11px] hover:bg-sky-700 cursor-pointer"
            >
              Hủy
            </button>
          </div>
        )}
        <button
          onClick={onZoomOut}
          className="pointer-events-auto flex items-center gap-2 rounded-xl border border-stone-800/30 bg-stone-900 px-4 py-2.5 text-sm font-semibold text-amber-100 shadow-md hover:bg-stone-800 cursor-pointer"
        >
          <ZoomOut className="h-4 w-4" />
          Thu nhỏ ra bản đồ
        </button>
      </div>

      {/* Cửa sổ chức năng công trình (mở giữa màn hình khi nhấn vào công trình) */}
      {selectedBuilding && !isMovingBuilding && (
        <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-xl rounded-2xl border-2 border-amber-900/50 bg-[#f6ecd9] p-5 shadow-2xl text-stone-900 font-serif max-h-[85vh] overflow-y-auto">
            {(() => {
              const spec = BASE_BUILDING_CATALOG[selectedBuilding.type];
              const upgradeCost = getUpgradeCost(selectedBuilding.type, selectedBuilding.level);
              const isMax = selectedBuilding.level >= spec.maxLevel;
              const isBusy =
                selectedBuilding.status === 'building' || selectedBuilding.status === 'upgrading';
              const lv = selectedBuilding.level;

              return (
                <>
                  {/* Header */}
                  <div className="flex items-start justify-between border-b border-amber-900/20 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-black text-stone-900">{spec.name}</h3>
                        <span className="rounded-full bg-amber-800/15 px-2.5 py-0.5 text-xs font-bold text-amber-900">
                          Cấp {lv}/{spec.maxLevel}
                        </span>
                        <span className="text-xs text-stone-500">({cityName})</span>
                      </div>
                      <p className="text-xs font-semibold text-amber-800 mt-1">
                        {spec.effectLabel(lv)}
                      </p>
                    </div>
                    <button
                      onClick={onClearSelection}
                      className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-900/10 cursor-pointer"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <p className="mt-3 text-sm text-stone-700 leading-relaxed">{spec.description}</p>

                  <div className="mt-3 flex items-center justify-between rounded-lg border border-amber-900/15 bg-amber-950/5 px-3 py-2 text-xs">
                    <span className="flex items-center gap-1.5 text-stone-700">
                      <Shield className="h-4 w-4 text-emerald-700" />
                      Độ bền:{' '}
                      <strong>
                        {selectedBuilding.hp}/{selectedBuilding.maxHp}
                      </strong>
                    </span>
                    {isBusy && (
                      <span className="font-semibold text-amber-700">
                        Đang thi công: còn {selectedBuilding.buildDaysRemaining} ngày
                      </span>
                    )}
                  </div>

                  {/* Chức năng chuyên biệt của Nhà Chính (4 thẻ bài dạng tờ giấy đơn giản) */}
                  {!isScout && selectedBuilding.type === 'main_hall' && (
                    <div className="mt-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900/80 mb-2">
                        Chiếu chỉ & Tự động hóa (Thẻ bài điều hành)
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {/* Thẻ 1: Cố định ngày đêm (Lv.2) */}
                        <div
                          className={`rounded-lg border p-3 shadow-sm ${
                            lv >= 2
                              ? 'border-amber-900/30 bg-[#fbf5e8]'
                              : 'border-stone-400/40 bg-stone-200/60 opacity-75'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-xs font-bold text-stone-900">
                              <Sun className="h-3.5 w-3.5 text-amber-700" />
                              Cố định Ngày / Đêm
                            </span>
                            <span className="rounded bg-amber-900/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-900">
                              {lv >= 2 ? 'Đã mở' : 'Mở cấp 2'}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] text-stone-600 leading-snug">
                            Giữ cố định ánh sáng ban ngày hoặc ban đêm trên bản đồ 3D.
                          </p>
                          {lv >= 2 ? (
                            <div className="mt-2 flex gap-1">
                              {(
                                [
                                  ['auto', 'Tự nhiên'],
                                  ['day', 'Ngày'],
                                  ['night', 'Đêm'],
                                ] as const
                              ).map(([val, label]) => (
                                <button
                                  key={val}
                                  onClick={() => onUpdateAutomation({ dayNightLock: val })}
                                  className={`flex-1 rounded px-2 py-1 text-[11px] font-bold border cursor-pointer transition-colors ${
                                    baseAutomation.dayNightLock === val
                                      ? 'bg-amber-800 text-amber-50 border-amber-900'
                                      : 'bg-white/70 text-stone-700 border-amber-900/20 hover:bg-amber-100'
                                  }`}
                                >
                                  {label}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <div className="mt-2 flex items-center gap-1 text-[11px] text-stone-500">
                              <Lock className="h-3 w-3" /> Cần nâng Nhà Chính lên cấp 2
                            </div>
                          )}
                        </div>

                        {/* Thẻ 2: Tự động dọn dẹp bụi cây (Lv.3) */}
                        <div
                          className={`rounded-lg border p-3 shadow-sm ${
                            lv >= 3
                              ? 'border-amber-900/30 bg-[#fbf5e8]'
                              : 'border-stone-400/40 bg-stone-200/60 opacity-75'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-xs font-bold text-stone-900">
                              <Sparkles className="h-3.5 w-3.5 text-emerald-700" />
                              Tự động Dọn Dẹp
                            </span>
                            <span className="rounded bg-amber-900/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-900">
                              {lv >= 3 ? 'Đã mở' : 'Mở cấp 3'}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] text-stone-600 leading-snug">
                            Tự động phát quang bụi cây mọc quanh căn cứ mỗi ngày.
                          </p>
                          {lv >= 3 ? (
                            <button
                              onClick={() =>
                                onUpdateAutomation({ autoClean: !baseAutomation.autoClean })
                              }
                              className={`mt-2 w-full rounded px-2.5 py-1 text-[11px] font-bold border cursor-pointer transition-colors ${
                                baseAutomation.autoClean
                                  ? 'bg-emerald-700 text-white border-emerald-800'
                                  : 'bg-white/70 text-stone-700 border-amber-900/20 hover:bg-amber-100'
                              }`}
                            >
                              {baseAutomation.autoClean ? 'Đang bật' : 'Đang tắt'}
                            </button>
                          ) : (
                            <div className="mt-2 flex items-center gap-1 text-[11px] text-stone-500">
                              <Lock className="h-3 w-3" /> Cần nâng Nhà Chính lên cấp 3
                            </div>
                          )}
                        </div>

                        {/* Thẻ 3: Tự động thu nhận lưu dân (Lv.4) */}
                        <div
                          className={`rounded-lg border p-3 shadow-sm ${
                            lv >= 4
                              ? 'border-amber-900/30 bg-[#fbf5e8]'
                              : 'border-stone-400/40 bg-stone-200/60 opacity-75'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-xs font-bold text-stone-900">
                              <Users className="h-3.5 w-3.5 text-sky-700" />
                              Tự động Thu Nhận Lưu Dân
                            </span>
                            <span className="rounded bg-amber-900/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-900">
                              {lv >= 4 ? 'Đã mở' : 'Mở cấp 4'}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] text-stone-600 leading-snug">
                            Tự động tiếp nhận các đoàn lưu dân tìm đến đầu quân.
                          </p>
                          {lv >= 4 ? (
                            <button
                              onClick={() =>
                                onUpdateAutomation({ autoRefugees: !baseAutomation.autoRefugees })
                              }
                              className={`mt-2 w-full rounded px-2.5 py-1 text-[11px] font-bold border cursor-pointer transition-colors ${
                                baseAutomation.autoRefugees
                                  ? 'bg-emerald-700 text-white border-emerald-800'
                                  : 'bg-white/70 text-stone-700 border-amber-900/20 hover:bg-amber-100'
                              }`}
                            >
                              {baseAutomation.autoRefugees ? 'Đang bật' : 'Đang tắt'}
                            </button>
                          ) : (
                            <div className="mt-2 flex items-center gap-1 text-[11px] text-stone-500">
                              <Lock className="h-3 w-3" /> Cần nâng Nhà Chính lên cấp 4
                            </div>
                          )}
                        </div>

                        {/* Thẻ 4: Tự động luyện binh (Lv.4) */}
                        <div
                          className={`rounded-lg border p-3 shadow-sm ${
                            lv >= 4
                              ? 'border-amber-900/30 bg-[#fbf5e8]'
                              : 'border-stone-400/40 bg-stone-200/60 opacity-75'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-xs font-bold text-stone-900">
                              <Swords className="h-3.5 w-3.5 text-red-700" />
                              Tự động Luyện Binh
                            </span>
                            <span className="rounded bg-amber-900/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-900">
                              {lv >= 4 ? 'Đã mở' : 'Mở cấp 4'}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] text-stone-600 leading-snug">
                            Mỗi ngày tự động chiêu luyện +5 lính (15V, 10L) nếu có trại lính.
                          </p>
                          {lv >= 4 ? (
                            <button
                              onClick={() =>
                                onUpdateAutomation({ autoTrain: !baseAutomation.autoTrain })
                              }
                              className={`mt-2 w-full rounded px-2.5 py-1 text-[11px] font-bold border cursor-pointer transition-colors ${
                                baseAutomation.autoTrain
                                  ? 'bg-emerald-700 text-white border-emerald-800'
                                  : 'bg-white/70 text-stone-700 border-amber-900/20 hover:bg-amber-100'
                              }`}
                            >
                              {baseAutomation.autoTrain ? 'Đang bật' : 'Đang tắt'}
                            </button>
                          ) : (
                            <div className="mt-2 flex items-center gap-1 text-[11px] text-stone-500">
                              <Lock className="h-3 w-3" /> Cần nâng Nhà Chính lên cấp 4
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Các nút thao tác công trình */}
                  {!isScout && (
                    <div className="mt-4 flex flex-col gap-2 border-t border-amber-900/20 pt-3">
                      {selectedBuilding.type === 'barracks' && (
                        <button
                          onClick={() => onOpenBuildingAction('training')}
                          className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-700 px-3 py-2 text-xs font-bold text-white hover:bg-red-800 cursor-pointer"
                        >
                          <Swords className="h-4 w-4" />
                          Mở Thao Trường Luyện Binh
                        </button>
                      )}
                      {selectedBuilding.type === 'forge' && (
                        <button
                          onClick={() => onOpenBuildingAction('forges')}
                          className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-800 px-3 py-2 text-xs font-bold text-white hover:bg-amber-900 cursor-pointer"
                        >
                          <Hammer className="h-4 w-4" />
                          Mở Xưởng Rèn Vũ Khí
                        </button>
                      )}
                      {selectedBuilding.type === 'farm' && (
                        <button
                          onClick={() => onOpenBuildingAction('farms')}
                          className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800 cursor-pointer"
                        >
                          <Wheat className="h-4 w-4" />
                          Mở Quản Lý Ruộng Nương
                        </button>
                      )}

                      <div className="flex gap-2">
                        <button
                          disabled={isMax || isBusy}
                          onClick={() => onUpgradeBuilding(selectedBuilding.id)}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-amber-700 px-3 py-2 text-xs font-bold text-white hover:bg-amber-800 disabled:opacity-45 cursor-pointer"
                        >
                          <ArrowUpCircle className="h-3.5 w-3.5" />
                          {isMax
                            ? 'Đã đạt cấp tối đa'
                            : `Nâng cấp (${upgradeCost.gold}V / ${upgradeCost.food}L)`}
                        </button>
                        <button
                          onClick={onStartMoveBuilding}
                          className="flex items-center justify-center gap-1 rounded-lg bg-stone-200 px-3 py-2 text-xs font-bold text-stone-800 hover:bg-stone-300 cursor-pointer"
                        >
                          <Move className="h-3.5 w-3.5" />
                          Di dời
                        </button>
                        {selectedBuilding.type !== 'main_hall' && (
                          <button
                            onClick={() => onDemolishBuilding(selectedBuilding.id)}
                            className="flex items-center justify-center rounded-lg bg-red-100 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-200 cursor-pointer"
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
        </div>
      )}

      {/* Thanh chọn công trình xây dựng trên bản đồ 3D (khi bấm nút Xây Dựng trên Leftbar) */}
      {!isScout && isBuildPaletteOpen && (
        <div className="pointer-events-auto self-center rounded-2xl border-2 border-amber-900/45 bg-[#f6ecd9]/95 px-3 py-2.5 shadow-xl font-serif max-w-[92vw] overflow-x-auto">
          <div className="flex items-center justify-between mb-1.5 px-1">
            <span className="text-xs font-black text-amber-950">
              Chọn công trình để đặt trực tiếp trên bản đồ 3D
            </span>
            <button
              onClick={() => {
                onSelectBuildType(null);
                onCloseBuildPalette();
              }}
              className="rounded p-0.5 text-stone-600 hover:bg-stone-900/10 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            {BUILD_ORDER.map((type) => {
              const spec = BASE_BUILDING_CATALOG[type];
              const isSelected = activeBuildType === type;
              const canAfford = gold >= spec.goldCost && food >= spec.foodCost;
              return (
                <button
                  key={type}
                  onClick={() => onSelectBuildType(isSelected ? null : type)}
                  className={`flex flex-col items-center rounded-xl border px-2.5 py-1.5 text-center transition-all cursor-pointer min-w-[78px] ${
                    isSelected
                      ? 'border-red-700 bg-red-800 text-amber-50 shadow'
                      : canAfford
                      ? 'border-amber-900/25 bg-[#fbf5e8] text-stone-900 hover:bg-amber-100'
                      : 'border-stone-400/30 bg-stone-200/70 text-stone-500'
                  }`}
                >
                  <span className="text-[11px] font-bold leading-tight">{spec.name}</span>
                  <span className={`text-[10px] mt-0.5 ${isSelected ? 'text-amber-200' : 'text-amber-800'}`}>
                    {spec.goldCost}V · {spec.foodCost}L
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
