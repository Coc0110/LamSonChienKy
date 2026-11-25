import React, { useState } from 'react';
import {
  ArrowUpCircle,
  CheckCircle2,
  FileText,
  Hammer,
  Lock,
  Move,
  ScrollText,
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
  checkMainHallUpgradeRequirements,
  getBuildableHalfRadius,
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

type BuildTabKey = 'production' | 'facility' | 'road';

const BUILD_TABS: Array<{
  key: BuildTabKey;
  label: string;
  items: BaseBuildingType[];
}> = [
  { key: 'production', label: 'Sản xuất', items: ['farm', 'forge'] },
  { key: 'facility', label: 'Cơ sở', items: ['house', 'barracks', 'watchtower', 'spike_trap'] },
  { key: 'road', label: 'Đường', items: ['road', 'wall', 'gate'] },
];

const BUILDING_ICON: Partial<Record<BaseBuildingType, string>> = {
  farm: '/icons/structure_farm.png',
  forge: '/icons/structure_forge.png',
  barracks: '/icons/flag.png',
  house: '/icons/structure_camp.png',
  watchtower: '/icons/watchtower.png',
  wall: '/icons/palisade.png',
  gate: '/icons/gate.png',
  road: '/icons/road.png',
  spike_trap: '/icons/spike.png',
};

export const RegionBuildHUD: React.FC<RegionBuildHUDProps> = ({
  cityName,
  mode,
  layout,
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
  const [activeTab, setActiveTab] = useState<BuildTabKey>('facility');
  const [mainHallTab, setMainHallTab] = useState<'info' | 'commands'>('info');
  const mainHall = layout.buildings.find((b) => b.type === 'main_hall' && b.status !== 'destroyed');
  const mainLevel = mainHall?.level ?? 1;
  const buildSpan = getBuildableHalfRadius(mainLevel) * 2;
  const currentTabItems = BUILD_TABS.find((t) => t.key === activeTab)?.items ?? [];

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

      {/* Cửa sổ Nhà Chính kiểu Cuộn Thư (2 tab bên phải: Thông tin & Chỉ lệnh) */}
      {selectedBuilding && !isMovingBuilding && selectedBuilding.type === 'main_hall' && (
        <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 font-serif">
          {(() => {
            const spec = BASE_BUILDING_CATALOG.main_hall;
            const lv = selectedBuilding.level;
            const isMax = lv >= spec.maxLevel;
            const isBusy =
              selectedBuilding.status === 'building' || selectedBuilding.status === 'upgrading';
            const upgradeCost = getUpgradeCost('main_hall', lv);
            const reqChecks = !isMax ? checkMainHallUpgradeRequirements(layout.buildings, lv + 1) : [];
            const allReqsMet = reqChecks.every((c) => c.met);
            const nextSpan = !isMax ? getBuildableHalfRadius(lv + 1) * 2 : buildSpan;
            const nextUnlocks = !isMax
              ? Object.values(BASE_BUILDING_CATALOG).filter(
                  (b) => b.requiredMainHallLevel === lv + 1
                )
              : [];

            const commandCards = [
              {
                key: 'dayNight',
                title: 'Ngày Đêm Luân Chuyển',
                minLv: 2,
                icon: <Sun className="h-5 w-5 text-amber-700" />,
                desc: 'Giữ cố định ánh sáng ban ngày hoặc ban đêm trên bản đồ 3D.',
                isOn: baseAutomation.dayNightLock !== 'auto',
                onToggle: () =>
                  onUpdateAutomation({
                    dayNightLock: baseAutomation.dayNightLock === 'auto' ? 'day' : 'auto',
                  }),
                extra:
                  lv >= 2 ? (
                    <div className="mt-2 flex gap-1">
                      {(
                        [
                          ['day', 'Ban Ngày'],
                          ['night', 'Ban Đêm'],
                          ['auto', 'Tự nhiên'],
                        ] as const
                      ).map(([val, label]) => (
                        <button
                          key={val}
                          onClick={() => onUpdateAutomation({ dayNightLock: val })}
                          className={`flex-1 rounded px-1.5 py-1 text-[10px] font-bold border cursor-pointer ${
                            baseAutomation.dayNightLock === val
                              ? 'bg-[#8b4513] text-amber-50 border-[#5c2c0c]'
                              : 'bg-[#fff9eb] text-stone-700 border-amber-900/25 hover:bg-amber-100'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  ) : null,
              },
              {
                key: 'autoClean',
                title: 'Tự Động Dọn Dẹp',
                minLv: 3,
                icon: <Sparkles className="h-5 w-5 text-emerald-700" />,
                desc: 'Khi bụi cây mọc quanh căn cứ, quân dân sẽ tự động phát quang mỗi ngày.',
                isOn: baseAutomation.autoClean,
                onToggle: () => onUpdateAutomation({ autoClean: !baseAutomation.autoClean }),
                extra: null,
              },
              {
                key: 'autoRefugees',
                title: 'Tự Động Thu Nhận Lưu Dân',
                minLv: 4,
                icon: <Users className="h-5 w-5 text-sky-700" />,
                desc: 'Tự động tiếp nhận các đoàn lưu dân tìm đến căn cứ đầu quân.',
                isOn: baseAutomation.autoRefugees,
                onToggle: () => onUpdateAutomation({ autoRefugees: !baseAutomation.autoRefugees }),
                extra: null,
              },
              {
                key: 'autoTrain',
                title: 'Tự Động Luyện Binh',
                minLv: 4,
                icon: <Swords className="h-5 w-5 text-red-700" />,
                desc: 'Mỗi ngày tự động chiêu luyện +5 lính (15V, 10L) nếu có Trại Lính.',
                isOn: baseAutomation.autoTrain,
                onToggle: () => onUpdateAutomation({ autoTrain: !baseAutomation.autoTrain }),
                extra: null,
              },
            ];

            return (
              <div className="relative flex items-stretch max-w-4xl w-full">
                {/* Trục cuộn gỗ bên trái */}
                <div className="w-5 shrink-0 rounded-full bg-gradient-to-r from-[#5a3515] via-[#9e6834] to-[#4a2a0e] border border-[#2a1708] shadow-xl z-20 -my-2" />

                {/* Thân giấy dó của cuộn thư */}
                <div className="relative flex-1 bg-[#f6ecd6] border-y-4 border-[#8b5a2b] px-6 py-5 shadow-2xl text-stone-900 max-h-[82vh] overflow-y-auto">
                  {/* Nút đóng góc trên trái */}
                  <button
                    onClick={onClearSelection}
                    className="absolute left-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#7c4d25] bg-[#e9d5b1] text-[#4b2b10] shadow hover:bg-[#dfb982] cursor-pointer"
                    title="Đóng"
                  >
                    <X className="h-4 w-4" />
                  </button>

                  {/* Tiêu đề cuộn thư */}
                  <div className="flex flex-col items-center pb-3 border-b border-amber-900/20">
                    <div className="rounded-full border border-[#8b5a2b]/50 bg-[#ead6b3] px-6 py-1 shadow-sm">
                      <h3 className="text-base font-black text-[#4a260a] tracking-wide">
                        {spec.name} · Cấp {lv}/{spec.maxLevel} ({cityName})
                      </h3>
                    </div>
                  </div>

                  {/* TAB 1: THÔNG TIN (Yêu cầu nâng cấp & Công trình mở khóa cấp tiếp theo) */}
                  {mainHallTab === 'info' && (
                    <div className="mt-4 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
                        <div className="rounded-lg border border-amber-900/20 bg-[#fbf4e4] p-3">
                          <div className="text-stone-500">Độ bền thành lũy</div>
                          <div className="mt-1 flex items-center gap-1.5 text-sm font-black text-stone-900">
                            <Shield className="h-4 w-4 text-emerald-700" />
                            {selectedBuilding.hp}/{selectedBuilding.maxHp}
                          </div>
                        </div>
                        <div className="rounded-lg border border-amber-900/20 bg-[#fbf4e4] p-3">
                          <div className="text-stone-500">Phạm vi xây dựng hiện tại</div>
                          <div className="mt-1 text-sm font-black text-amber-900">
                            {buildSpan} × {buildSpan} ô
                          </div>
                        </div>
                        <div className="rounded-lg border border-amber-900/20 bg-[#fbf4e4] p-3">
                          <div className="text-stone-500">Hiệu ứng hiện tại</div>
                          <div className="mt-1 text-xs font-bold text-stone-800">
                            {spec.effectLabel(lv)}
                          </div>
                        </div>
                      </div>

                      {!isMax ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {/* Khung Yêu cầu nâng cấp */}
                          <div className="rounded-xl border border-amber-900/30 bg-[#fbf4e4] p-4">
                            <h4 className="text-xs font-black uppercase tracking-wider text-[#6e380e] mb-2.5">
                              Yêu cầu nâng lên Cấp {lv + 1}
                            </h4>
                            <div className="space-y-2">
                              {reqChecks.map(({ req, current, met }) => (
                                <div
                                  key={req.type}
                                  className={`flex items-center justify-between rounded-lg border px-3 py-1.5 text-xs ${
                                    met
                                      ? 'border-emerald-700/30 bg-emerald-50/70 text-emerald-900'
                                      : 'border-red-700/30 bg-red-50/70 text-red-900'
                                  }`}
                                >
                                  <span className="font-bold">
                                    {BASE_BUILDING_CATALOG[req.type].name} (Lv.{req.minLevel}+)
                                  </span>
                                  <span className="flex items-center gap-1 font-black">
                                    {current}/{req.count}
                                    {met && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />}
                                  </span>
                                </div>
                              ))}
                              <div className="flex items-center justify-between rounded-lg border border-amber-900/20 bg-amber-100/50 px-3 py-1.5 text-xs font-bold text-amber-950">
                                <span>Tài nguyên thi công</span>
                                <span>
                                  {upgradeCost.gold} Vàng · {upgradeCost.food} Lương ({upgradeCost.days} ngày)
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Khung Mở khóa ở cấp tiếp theo */}
                          <div className="rounded-xl border border-amber-900/30 bg-[#fbf4e4] p-4">
                            <h4 className="text-xs font-black uppercase tracking-wider text-[#6e380e] mb-2.5">
                              Mở khóa ở Cấp {lv + 1}
                            </h4>
                            <ul className="space-y-2 text-xs text-stone-800">
                              <li className="rounded-lg border border-amber-900/15 bg-white/60 px-3 py-1.5">
                                Mở rộng phạm vi xây dựng:{' '}
                                <strong className="text-amber-900">
                                  {nextSpan} × {nextSpan} ô
                                </strong>
                              </li>
                              {lv + 1 === 2 && (
                                <li className="rounded-lg border border-amber-900/15 bg-white/60 px-3 py-1.5">
                                  Chỉ lệnh mới: <strong>Ngày Đêm Luân Chuyển</strong> (cố định ngày/đêm)
                                </li>
                              )}
                              {lv + 1 === 3 && (
                                <li className="rounded-lg border border-amber-900/15 bg-white/60 px-3 py-1.5">
                                  Chỉ lệnh mới: <strong>Tự Động Dọn Dẹp</strong> bụi cây
                                </li>
                              )}
                              {lv + 1 === 4 && (
                                <>
                                  <li className="rounded-lg border border-amber-900/15 bg-white/60 px-3 py-1.5">
                                    Chỉ lệnh mới: <strong>Tự Động Thu Nhận Lưu Dân</strong>
                                  </li>
                                  <li className="rounded-lg border border-amber-900/15 bg-white/60 px-3 py-1.5">
                                    Chỉ lệnh mới: <strong>Tự Động Luyện Binh</strong>
                                  </li>
                                </>
                              )}
                              {nextUnlocks.map((b) => (
                                <li
                                  key={b.type}
                                  className="rounded-lg border border-amber-900/15 bg-white/60 px-3 py-1.5"
                                >
                                  Công trình mới: <strong>{b.name}</strong> — {b.description}
                                </li>
                              ))}
                              {nextUnlocks.length === 0 && lv + 1 === 5 && (
                                <li className="rounded-lg border border-amber-900/15 bg-white/60 px-3 py-1.5">
                                  Đạt đỉnh cao quy mô Đại Bản Doanh Lam Sơn ({nextSpan}×{nextSpan} ô).
                                </li>
                              )}
                            </ul>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-emerald-700/30 bg-emerald-50/70 p-4 text-center text-xs font-bold text-emerald-900">
                          Nhà Chính đã đạt cấp độ tối đa ({spec.maxLevel})!
                        </div>
                      )}

                      {!isScout && (
                        <div className="flex gap-2.5 pt-2 border-t border-amber-900/20">
                          <button
                            disabled={isMax || isBusy || !allReqsMet}
                            onClick={() => onUpgradeBuilding(selectedBuilding.id)}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-amber-800 px-4 py-2.5 text-xs font-bold text-amber-50 hover:bg-amber-900 disabled:opacity-45 cursor-pointer"
                          >
                            <ArrowUpCircle className="h-4 w-4" />
                            {isMax
                              ? 'Đã đạt cấp tối đa'
                              : isBusy
                              ? `Đang nâng cấp (còn ${selectedBuilding.buildDaysRemaining} ngày)`
                              : !allReqsMet
                              ? 'Chưa đủ điều kiện nâng cấp'
                              : `Nâng cấp lên Cấp ${lv + 1} (${upgradeCost.gold}V / ${upgradeCost.food}L)`}
                          </button>
                          <button
                            onClick={onStartMoveBuilding}
                            className="flex items-center justify-center gap-1 rounded-xl bg-stone-200 px-4 py-2.5 text-xs font-bold text-stone-800 hover:bg-stone-300 cursor-pointer"
                          >
                            <Move className="h-4 w-4" />
                            Di dời
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 2: CHỈ LỆNH (Các thẻ bài giấy dó nằm ngang giống 2 ảnh mẫu) */}
                  {mainHallTab === 'commands' && (
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {commandCards.map((card) => {
                        const unlocked = lv >= card.minLv;
                        return (
                          <div
                            key={card.key}
                            className={`flex flex-col justify-between rounded-xl border-2 p-3 text-center shadow-sm ${
                              unlocked
                                ? 'border-[#d6a96e] bg-[#fbf3df]'
                                : 'border-stone-400/40 bg-stone-200/70 opacity-75'
                            }`}
                          >
                            <div>
                              <div className="rounded-t-lg bg-gradient-to-b from-[#f4cf99] to-[#fae8c8] px-2 py-1.5 border-b border-[#d6a96e]/50">
                                <h5 className="text-xs font-black text-[#4d270a] leading-tight">
                                  {card.title}
                                </h5>
                              </div>
                              <div className="mx-auto my-2.5 flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#c89654] bg-[#fffaf0] shadow-inner">
                                {card.icon}
                              </div>
                              <p className="text-[11px] text-stone-700 leading-snug px-1">
                                {card.desc}
                              </p>
                              {card.extra}
                            </div>

                            <div className="mt-3 pt-2 border-t border-amber-900/15">
                              {unlocked ? (
                                <button
                                  onClick={card.onToggle}
                                  className={`w-full rounded-full py-1.5 text-xs font-black border cursor-pointer transition-colors ${
                                    card.isOn
                                      ? 'bg-[#e58935] text-white border-[#b45309] shadow-sm'
                                      : 'bg-[#d8cbb5] text-stone-700 border-[#a89a84]'
                                  }`}
                                >
                                  {card.isOn ? 'Mở' : 'Đóng'}
                                </button>
                              ) : (
                                <div className="flex items-center justify-center gap-1 rounded-full bg-stone-300 py-1.5 text-[11px] font-bold text-stone-600">
                                  <Lock className="h-3 w-3" /> Mở ở Cấp {card.minLv}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Trục cuộn gỗ bên phải */}
                <div className="w-5 shrink-0 rounded-full bg-gradient-to-r from-[#5a3515] via-[#9e6834] to-[#4a2a0e] border border-[#2a1708] shadow-xl z-20 -my-2" />

                {/* 2 thẻ tab giấy dó bên phải cuộn thư: Thông tin & Chỉ lệnh */}
                <div className="flex flex-col gap-2 pt-8 -ml-1 z-10">
                  <button
                    onClick={() => setMainHallTab('info')}
                    className={`flex flex-col items-center gap-1 rounded-r-xl border-2 border-l-0 px-2.5 py-3 text-[11px] font-black shadow-md cursor-pointer transition-all ${
                      mainHallTab === 'info'
                        ? 'border-[#8b5a2b] bg-[#f6ecd6] text-[#5c2c0c] translate-x-0.5'
                        : 'border-[#a89a84] bg-[#ded2bc] text-stone-600 hover:bg-[#ece1cb]'
                    }`}
                  >
                    <FileText className="h-4 w-4" />
                    <span>Thông tin</span>
                  </button>
                  <button
                    onClick={() => setMainHallTab('commands')}
                    className={`flex flex-col items-center gap-1 rounded-r-xl border-2 border-l-0 px-2.5 py-3 text-[11px] font-black shadow-md cursor-pointer transition-all ${
                      mainHallTab === 'commands'
                        ? 'border-[#8b5a2b] bg-[#f6ecd6] text-[#5c2c0c] translate-x-0.5'
                        : 'border-[#a89a84] bg-[#ded2bc] text-stone-600 hover:bg-[#ece1cb]'
                    }`}
                  >
                    <ScrollText className="h-4 w-4" />
                    <span>Chỉ lệnh</span>
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Cửa sổ chức năng các công trình khác (mở giữa màn hình khi nhấn vào công trình) */}
      {selectedBuilding && !isMovingBuilding && selectedBuilding.type !== 'main_hall' && (
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
                        <button
                          onClick={() => onDemolishBuilding(selectedBuilding.id)}
                          className="flex items-center justify-center rounded-lg bg-red-100 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-200 cursor-pointer"
                          title="Tháo dỡ"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Giao diện Xây dựng kiểu Bách Cảnh Đồ: Cuộn giấy phân loại bên trái + Thẻ bài công trình phía dưới */}
      {!isScout && isBuildPaletteOpen && (
        <div className="pointer-events-none flex items-end justify-between gap-3 w-full">
          {/* Cuộn giấy dọc chọn nhóm: Sản xuất / Cơ sở / Đường */}
          <div className="pointer-events-auto relative flex flex-col items-center w-[124px] shrink-0 font-serif select-none">
            {/* Thanh cuộn gỗ trên */}
            <div className="h-3 w-[134px] rounded-full bg-gradient-to-b from-[#8b5a2b] via-[#5e3a18] to-[#3d240d] border border-[#2a1708] shadow-md z-10" />
            <div className="w-full bg-[#faf1dd] border-x-2 border-[#7c4d25]/60 px-2 py-2.5 flex flex-col gap-1.5 shadow-xl">
              {BUILD_TABS.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`w-full rounded-lg py-2 px-2 text-center text-xs font-black tracking-wide transition-all cursor-pointer border ${
                      isActive
                        ? 'bg-[#f3cfa4] text-[#5c2c0c] border-[#c88a4b] shadow-inner'
                        : 'bg-transparent text-[#4b3523] border-transparent hover:bg-[#efe0c4]'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
              <div className="mt-1 border-t border-[#8b5a2b]/20 pt-1.5 text-center text-[10px] font-bold text-[#7c5228]">
                Phạm vi: {buildSpan}×{buildSpan}
                <div className="text-[9px] font-normal text-[#8d6b47]">Nhà Chính Lv.{mainLevel}</div>
              </div>
            </div>
            {/* Thanh cuộn gỗ dưới */}
            <div className="h-3 w-[134px] rounded-full bg-gradient-to-b from-[#8b5a2b] via-[#5e3a18] to-[#3d240d] border border-[#2a1708] shadow-md z-10" />
          </div>

          {/* Hàng thẻ bài công trình nằm ngang phía dưới */}
          <div className="pointer-events-auto flex-1 flex items-end gap-2.5 overflow-x-auto pb-1 pr-2">
            {currentTabItems.map((type) => {
              const spec = BASE_BUILDING_CATALOG[type];
              const count = layout.buildings.filter(
                (b) => b.type === type && b.status !== 'destroyed'
              ).length;
              const isFull = count >= spec.maxPerBase;
              const isSelected = activeBuildType === type;
              const canAfford = gold >= spec.goldCost && food >= spec.foodCost;
              const lockedByHall = mainLevel < spec.requiredMainHallLevel;
              const disabled = isFull || lockedByHall;
              const iconSrc = BUILDING_ICON[type] || '/icons/structure_camp.png';

              return (
                <div
                  key={type}
                  onClick={() => {
                    if (!disabled) onSelectBuildType(isSelected ? null : type);
                  }}
                  className={`relative flex flex-col items-center justify-between w-[134px] h-[156px] shrink-0 rounded-xl border-2 p-2.5 font-serif transition-all select-none ${
                    disabled
                      ? 'border-[#a89a84] bg-[#e5dccb]/90 opacity-75 cursor-not-allowed'
                      : isSelected
                      ? 'border-[#b91c1c] bg-[#fff7e6] -translate-y-1.5 shadow-[0_10px_24px_rgba(185,28,28,0.35)] cursor-pointer'
                      : 'border-[#c4a77d] bg-[#faf2e1]/95 hover:-translate-y-1 hover:border-[#8b5a2b] shadow-lg cursor-pointer'
                  }`}
                >
                  {/* Góc trên phải: số lượng hiện tại / tối đa */}
                  <span className="self-end rounded bg-[#5c3a18]/10 px-1.5 py-0.5 text-[10px] font-black text-[#4b321a]">
                    {count}/{spec.maxPerBase}
                  </span>

                  {/* Minh họa công trình ở giữa */}
                  <div className="flex items-center justify-center h-14 w-full my-0.5">
                    <img
                      src={iconSrc}
                      alt={spec.name}
                      onError={(e) => {
                        e.currentTarget.src = '/icons/structure_camp.png';
                      }}
                      className="h-12 w-12 object-contain drop-shadow-[0_2px_3px_rgba(0,0,0,0.28)] pointer-events-none"
                    />
                  </div>

                  {/* Nút trạng thái + chi phí */}
                  <div
                    className={`w-full rounded-md py-1 px-1.5 text-center text-[11px] font-black border ${
                      isFull
                        ? 'bg-[#d97736]/85 text-white border-[#b45309]'
                        : lockedByHall
                        ? 'bg-stone-500 text-stone-100 border-stone-600'
                        : isSelected
                        ? 'bg-[#b91c1c] text-amber-50 border-[#7f1d1d]'
                        : canAfford
                        ? 'bg-[#e89d58] text-[#3d1c04] border-[#b46928]'
                        : 'bg-stone-300 text-stone-600 border-stone-400'
                    }`}
                  >
                    {isFull
                      ? 'Đã xây xong'
                      : lockedByHall
                      ? `Mở Lv.${spec.requiredMainHallLevel}`
                      : isSelected
                      ? 'Đang chọn'
                      : `${spec.goldCost}V · ${spec.foodCost}L`}
                  </div>

                  {/* Tên công trình ở chân thẻ */}
                  <span className="mt-1 text-xs font-black text-[#3b2511] text-center leading-tight truncate w-full">
                    {spec.name}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Nút Đóng chế độ xây dựng bên phải */}
          <button
            onClick={() => {
              onSelectBuildType(null);
              onCloseBuildPalette();
            }}
            className="pointer-events-auto self-end flex items-center gap-1.5 rounded-xl border-2 border-[#7c4d25] bg-[#faf1dd] px-3.5 py-2.5 text-xs font-black text-[#4b2b10] shadow-lg hover:bg-[#f3cfa4] cursor-pointer shrink-0 font-serif"
          >
            <X className="h-4 w-4" />
            Đóng
          </button>
        </div>
      )}
    </div>
  );
};
