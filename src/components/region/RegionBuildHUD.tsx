import React, { useState } from 'react';
import {
  ArrowUpCircle,
  CheckCircle2,
  Coins,
  Eye,
  FileText,
  Gavel,
  Hammer,
  Lock,
  Move,
  ScrollText,
  Shield,
  Sparkles,
  Store,
  Sun,
  Swords,
  Trash2,
  Trees,
  Users,
  Wheat,
  X,
  ZoomOut,
} from 'lucide-react';
import type { TacticalFormation } from '../../types';
import type { BaseBuilding, BaseBuildingType, RegionLayout } from '../../types/region';
import type {
  BaseAutomationConfig,
  ForagedInventoryItem,
  WatchtowerScoutTask,
} from '../../store/slices/regionSlice';
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
  wood: number;
  food: number;
  regularTroopsCount: number;
  eliteTroopsCount: number;
  generals: Array<{ id: string; name: string; title: string; stats: { intellect: number; command: number; martial: number } }>;
  onAssignSupervisor: (buildingId: string, generalId: string | null) => void;
  onRepairBuilding: (buildingId: string) => void;
  onPromoteElite: (count: number) => void;
  selectedBuilding: BaseBuilding | null;
  activeBuildType: BaseBuildingType | null;
  isBuildPaletteOpen: boolean;
  isMovingBuilding: boolean;
  hoveredCell: { col: number; row: number } | null;
  enemyTroops?: number;
  baseAutomation: BaseAutomationConfig;
  onUpdateAutomation: (patch: Partial<BaseAutomationConfig>) => void;
  scoutableDistricts: Array<{ id: string; name: string; scoutDays: number }>;
  activeWatchtowerScouts: Record<string, WatchtowerScoutTask>;
  onScoutDistrict: (
    watchtowerId: string,
    targetId: string,
    targetName: string,
    scoutDays: number
  ) => void;
  formations: TacticalFormation[];
  defenseFormationIds: string[];
  onToggleDefenseFormation: (formationId: string) => void;
  onDispatchMarch: (formationId: string) => void;
  onOpenArmyModal: () => void;
  foragedInventory: ForagedInventoryItem[];
  resourcesSummary: { food: number; swords: number; spears: number; bows: number };
  canAuctionThisMonth: boolean;
  onForageWatchtower: (
    watchtowerId: string,
    level: number,
    mode: 'gather' | 'hunt' | 'treasure'
  ) => void;
  onSellMarketGoods: (payload: {
    kind: 'item' | 'food' | 'swords' | 'spears' | 'bows';
    itemId?: string;
    amount: number;
    askPrice: number;
  }) => void;
  onRunMarketAuction: (payload: {
    kind: 'item' | 'food' | 'swords' | 'spears' | 'bows';
    uid?: string;
    itemId?: string;
    amount?: number;
    startPrice: number;
    bidStep: number;
    targetPrice: number;
  }) => void;
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
  { key: 'production', label: 'Sản xuất', items: ['farm', 'forge', 'market'] },
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
  wood,
  food,
  regularTroopsCount,
  eliteTroopsCount,
  generals,
  onAssignSupervisor,
  onRepairBuilding,
  onPromoteElite,
  selectedBuilding,
  activeBuildType,
  isBuildPaletteOpen,
  isMovingBuilding,
  baseAutomation,
  onUpdateAutomation,
  scoutableDistricts,
  activeWatchtowerScouts,
  onScoutDistrict,
  formations,
  defenseFormationIds,
  onToggleDefenseFormation,
  onDispatchMarch,
  onOpenArmyModal,
  foragedInventory,
  resourcesSummary,
  canAuctionThisMonth,
  onForageWatchtower,
  onSellMarketGoods,
  onRunMarketAuction,
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
  const [mainHallTab, setMainHallTab] = useState<'info' | 'commands' | 'military'>('info');
  const [watchtowerTab, setWatchtowerTab] = useState<'scout' | 'hunt'>('scout');
  const [forageMode, setForageMode] = useState<'gather' | 'hunt' | 'treasure'>('gather');
  const [marketTab, setMarketTab] = useState<'trade' | 'auction'>('trade');
  const [tradeSelection, setTradeSelection] = useState<string>('food');
  const [tradeAmount, setTradeAmount] = useState<number>(100);
  const [tradePrice, setTradePrice] = useState<number>(20);
  const [auctionSelection, setAuctionSelection] = useState<string>('food');
  const [auctionAmount, setAuctionAmount] = useState<number>(100);
  const [auctionStartPrice, setAuctionStartPrice] = useState<number>(20);
  const [auctionBidStep, setAuctionBidStep] = useState<number>(5);
  const [auctionTargetPrice, setAuctionTargetPrice] = useState<number>(40);
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
              <div className="relative flex items-stretch max-w-4xl w-full filter drop-shadow-[0_18px_30px_rgba(0,0,0,0.7)] drop-shadow-[0_3px_8px_rgba(0,0,0,0.45)]">
                {/* Thân giấy gió của cuộn thư */}
                <div className="relative flex-1 px-8 py-7 text-[#261304] max-h-[82vh] flex flex-col min-h-0">
                  <img
                    src="/parchment_torn_horizontal.png"
                    alt="Giấy gió Nhà Chính"
                    className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none z-0"
                    draggable={false}
                  />

                  {/* Nút đóng góc trên phải */}
                  <button
                    onClick={onClearSelection}
                    className="absolute right-7 top-6 z-20 p-1 rounded text-[#6e4927] hover:text-[#261304] hover:bg-[#8c6b44]/15 transition cursor-pointer"
                    title="Đóng"
                  >
                    <X className="h-5 w-5" />
                  </button>

                  {/* Tiêu đề cuộn thư */}
                  <div className="relative z-10 flex flex-col items-center pb-3 border-b border-[#8c6b44]/35 shrink-0">
                    <h3 className="text-lg font-black text-[#4a260a] tracking-wide">
                      {spec.name} · Cấp {lv}/{spec.maxLevel} ({cityName})
                    </h3>
                  </div>

                  <div className="relative z-10 overflow-y-auto no-scrollbar pr-1">
                    {/* TAB 1: THÔNG TIN (Yêu cầu nâng cấp & Công trình mở khóa cấp tiếp theo) */}
                    {mainHallTab === 'info' && (
                      <div className="mt-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
                          <div className="rounded-lg border border-[#8c6b44]/35 bg-black/[0.04] p-3">
                            <div className="text-[#6b4423]">Độ bền thành lũy</div>
                            <div className="mt-1 flex items-center gap-1.5 text-sm font-black text-[#261304]">
                              <Shield className="h-4 w-4 text-emerald-700" />
                              {selectedBuilding.hp}/{selectedBuilding.maxHp}
                            </div>
                          </div>
                          <div className="rounded-lg border border-[#8c6b44]/35 bg-black/[0.04] p-3">
                            <div className="text-[#6b4423]">Phạm vi xây dựng hiện tại</div>
                            <div className="mt-1 text-sm font-black text-[#8c2d19]">
                              {buildSpan} × {buildSpan} ô
                            </div>
                          </div>
                          <div className="rounded-lg border border-[#8c6b44]/35 bg-black/[0.04] p-3">
                            <div className="text-[#6b4423]">Hiệu ứng hiện tại</div>
                            <div className="mt-1 text-xs font-bold text-[#261304]">
                              {spec.effectLabel(lv)}
                            </div>
                          </div>
                        </div>

                        {!isMax ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* Khung Yêu cầu nâng cấp */}
                            <div className="rounded-xl border border-[#8c6b44]/35 bg-black/[0.04] p-4">
                              <h4 className="text-xs font-black uppercase tracking-wider text-[#6e380e] mb-2.5">
                                Yêu cầu nâng lên Cấp {lv + 1}
                              </h4>
                              <div className="space-y-2">
                                {reqChecks.map(({ req, current, met }) => (
                                  <div
                                    key={req.type}
                                    className={`flex items-center justify-between rounded-lg border px-3 py-1.5 text-xs ${
                                      met
                                        ? 'border-emerald-700/35 bg-emerald-700/10 text-emerald-900'
                                        : 'border-[#8c2d19]/35 bg-[#8c2d19]/10 text-[#8c2d19]'
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
                                <div className="flex items-center justify-between rounded-lg border border-[#8c6b44]/30 bg-[#8c6b44]/10 px-3 py-1.5 text-xs font-bold text-[#4a260a]">
                                  <span>Tài nguyên thi công</span>
                                  <span>
                                    {upgradeCost.gold} Vàng · {upgradeCost.wood} Gỗ ({upgradeCost.days} ngày)
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Khung Mở khóa ở cấp tiếp theo */}
                            <div className="rounded-xl border border-[#8c6b44]/35 bg-black/[0.04] p-4">
                              <h4 className="text-xs font-black uppercase tracking-wider text-[#6e380e] mb-2.5">
                                Mở khóa ở Cấp {lv + 1}
                              </h4>
                              <ul className="space-y-2 text-xs text-[#261304]">
                                <li className="rounded-lg border border-[#8c6b44]/25 bg-[#f7eed8]/60 px-3 py-1.5">
                                  Mở rộng phạm vi xây dựng:{' '}
                                  <strong className="text-[#8c2d19]">
                                    {nextSpan} × {nextSpan} ô
                                  </strong>
                                </li>
                                {lv + 1 === 2 && (
                                  <li className="rounded-lg border border-[#8c6b44]/25 bg-[#f7eed8]/60 px-3 py-1.5">
                                    Chỉ lệnh mới: <strong>Ngày Đêm Luân Chuyển</strong> (cố định ngày/đêm)
                                  </li>
                                )}
                                {lv + 1 === 3 && (
                                  <li className="rounded-lg border border-[#8c6b44]/25 bg-[#f7eed8]/60 px-3 py-1.5">
                                    Chỉ lệnh mới: <strong>Tự Động Dọn Dẹp</strong> bụi cây
                                  </li>
                                )}
                                {lv + 1 === 4 && (
                                  <>
                                    <li className="rounded-lg border border-[#8c6b44]/25 bg-[#f7eed8]/60 px-3 py-1.5">
                                      Chỉ lệnh mới: <strong>Tự Động Thu Nhận Lưu Dân</strong>
                                    </li>
                                    <li className="rounded-lg border border-[#8c6b44]/25 bg-[#f7eed8]/60 px-3 py-1.5">
                                      Chỉ lệnh mới: <strong>Tự Động Luyện Binh</strong>
                                    </li>
                                  </>
                                )}
                                {nextUnlocks.map((b) => (
                                  <li
                                    key={b.type}
                                    className="rounded-lg border border-[#8c6b44]/25 bg-[#f7eed8]/60 px-3 py-1.5"
                                  >
                                    Công trình mới: <strong>{b.name}</strong> — {b.description}
                                  </li>
                                ))}
                                {nextUnlocks.length === 0 && lv + 1 === 5 && (
                                  <li className="rounded-lg border border-[#8c6b44]/25 bg-[#f7eed8]/60 px-3 py-1.5">
                                    Đạt đỉnh cao quy mô Đại Bản Doanh Lam Sơn ({nextSpan}×{nextSpan} ô).
                                  </li>
                                )}
                              </ul>
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-xl border border-emerald-700/35 bg-emerald-700/10 p-4 text-center text-xs font-bold text-emerald-900">
                            Nhà Chính đã đạt cấp độ tối đa ({spec.maxLevel})!
                          </div>
                        )}

                        {!isScout && (
                          <div className="flex gap-2.5 pt-2 border-t border-[#8c6b44]/30">
                            <button
                              disabled={isMax || isBusy || !allReqsMet}
                              onClick={() => onUpgradeBuilding(selectedBuilding.id)}
                              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#8c2d19] px-4 py-2.5 text-xs font-bold text-[#fff3db] hover:bg-[#6e1e0d] disabled:opacity-45 cursor-pointer shadow"
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
                              className="flex items-center justify-center gap-1 rounded-xl border border-[#8c6b44]/50 bg-[#8c6b44]/15 px-4 py-2.5 text-xs font-bold text-[#261304] hover:bg-[#8c6b44]/25 cursor-pointer"
                            >
                              <Move className="h-4 w-4" />
                              Di dời
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* TAB 2: CHỈ LỆNH */}
                    {mainHallTab === 'commands' && (
                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {commandCards.map((card) => {
                          const unlocked = lv >= card.minLv;
                          return (
                            <div
                              key={card.key}
                              className={`flex flex-col justify-between rounded-xl border p-3 text-center shadow-sm ${
                                unlocked
                                  ? 'border-[#8c6b44]/45 bg-black/[0.04]'
                                  : 'border-[#8c6b44]/25 bg-black/[0.06] opacity-70'
                              }`}
                            >
                              <div>
                                <div className="rounded-t-lg bg-[#8c6b44]/15 px-2 py-1.5 border-b border-[#8c6b44]/30">
                                  <h5 className="text-xs font-black text-[#4d270a] leading-tight">
                                    {card.title}
                                  </h5>
                                </div>
                                <div className="mx-auto my-2.5 flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#8c6b44]/60 bg-[#f7eed8]/80 shadow-inner">
                                  {card.icon}
                                </div>
                                <p className="text-[11px] text-[#5c3e23] leading-snug px-1">
                                  {card.desc}
                                </p>
                                {card.extra}
                              </div>

                              <div className="mt-3 pt-2 border-t border-[#8c6b44]/25">
                                {unlocked ? (
                                  <button
                                    onClick={card.onToggle}
                                    className={`w-full rounded-full py-1.5 text-xs font-black border cursor-pointer transition-colors ${
                                      card.isOn
                                        ? 'bg-[#8c2d19] text-[#fff3db] border-[#6e1e0d] shadow-sm'
                                        : 'bg-[#8c6b44]/20 text-[#261304] border-[#8c6b44]/40 hover:bg-[#8c6b44]/30'
                                    }`}
                                  >
                                    {card.isOn ? 'Mở' : 'Đóng'}
                                  </button>
                                ) : (
                                  <div className="flex items-center justify-center gap-1 rounded-full bg-black/10 py-1.5 text-[11px] font-bold text-[#5c3e23]">
                                    <Lock className="h-3 w-3" /> Mở ở Cấp {card.minLv}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* TAB 3: QUÂN SỰ (Xếp đội hình phòng thủ & tiến quân) */}
                    {mainHallTab === 'military' && (
                      <div className="mt-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-black uppercase tracking-wider text-[#8c2d19]">
                            Điều Động & Phòng Thủ Căn Cứ ({defenseFormationIds.length} đội thủ)
                          </h4>
                          <button
                            onClick={onOpenArmyModal}
                            className="flex items-center gap-1.5 rounded-lg bg-[#8c2d19] px-3 py-1.5 text-[11px] font-bold text-[#fff3db] hover:bg-[#6e1e0d] cursor-pointer shadow"
                          >
                            <Swords className="h-3.5 w-3.5" />
                            Mở Bố Trận Sa Bàn
                          </button>
                        </div>

                        {formations.length === 0 ? (
                          <div className="rounded-lg border border-[#8c6b44]/30 bg-white/40 p-4 text-center text-xs text-[#5c3e23]">
                            Chưa có đội hình nào. Hãy mở Bố Trận Sa Bàn để lập đội hình mới!
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[260px] overflow-y-auto pr-1">
                            {formations.map((f) => {
                              const isDefending = defenseFormationIds.includes(f.id);
                              const isMarching = f.status === 'marching' || f.status === 'retreating';
                              return (
                                <div
                                  key={f.id}
                                  className={`rounded-lg border p-3 shadow-sm flex flex-col justify-between ${
                                    isDefending
                                      ? 'border-emerald-700/50 bg-emerald-900/10'
                                      : 'border-[#8c6b44]/35 bg-white/45'
                                  }`}
                                >
                                  <div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-black text-[#261304] truncate">
                                        {f.name}
                                      </span>
                                      <span className="rounded bg-[#8c5828]/15 px-1.5 py-0.5 text-[10px] font-bold text-[#5c3e23]">
                                        {f.totalTroops} quân
                                      </span>
                                    </div>
                                    <div className="mt-1 text-[11px] text-[#5c3e23]">
                                      Trạng thái:{' '}
                                      <strong className={isDefending ? 'text-emerald-800' : ''}>
                                        {isMarching
                                          ? 'Đang hành quân'
                                          : isDefending
                                          ? 'Phòng thủ căn cứ'
                                          : 'Sẵn sàng'}
                                      </strong>
                                    </div>
                                  </div>

                                  <div className="mt-2.5 flex gap-1.5">
                                    <button
                                      disabled={isMarching}
                                      onClick={() => onToggleDefenseFormation(f.id)}
                                      className={`flex-1 flex items-center justify-center gap-1 rounded py-1.5 text-[11px] font-bold border cursor-pointer disabled:opacity-45 ${
                                        isDefending
                                          ? 'bg-emerald-700 text-white border-emerald-800'
                                          : 'bg-white/75 text-[#261304] border-[#8c6b44]/40 hover:bg-amber-100'
                                      }`}
                                    >
                                      <Shield className="h-3 w-3" />
                                      {isDefending ? 'Đang thủ' : 'Phòng thủ'}
                                    </button>
                                    <button
                                      disabled={f.totalTroops <= 0 || isMarching}
                                      onClick={() => onDispatchMarch(f.id)}
                                      className="flex-1 flex items-center justify-center gap-1 rounded bg-[#8c2d19] py-1.5 text-[11px] font-bold text-[#fff3db] hover:bg-[#6e1e0d] disabled:opacity-45 cursor-pointer"
                                    >
                                      <Swords className="h-3 w-3" />
                                      Tiến quân
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* 3 thẻ tab giấy gió bên phải cuộn thư: Thông tin, Chỉ lệnh, Quân sự */}
                <div className="flex flex-col gap-2 pt-10 -ml-2 z-10">
                  <button
                    onClick={() => setMainHallTab('info')}
                    className={`relative flex flex-col items-center gap-1 rounded-r-xl border border-l-0 px-2.5 py-3 text-[11px] font-black shadow-md cursor-pointer transition-all overflow-hidden ${
                      mainHallTab === 'info'
                        ? 'border-[#8c6b44] text-[#8c2d19] translate-x-0.5'
                        : 'border-[#8c6b44]/50 text-[#5c3e23] opacity-80 hover:opacity-100'
                    }`}
                    style={{ backgroundImage: "url('/parchment_clean.png')", backgroundSize: 'cover' }}
                  >
                    <FileText className="h-4 w-4 relative z-10" />
                    <span className="relative z-10">Thông tin</span>
                  </button>
                  <button
                    onClick={() => setMainHallTab('commands')}
                    className={`relative flex flex-col items-center gap-1 rounded-r-xl border border-l-0 px-2.5 py-3 text-[11px] font-black shadow-md cursor-pointer transition-all overflow-hidden ${
                      mainHallTab === 'commands'
                        ? 'border-[#8c6b44] text-[#8c2d19] translate-x-0.5'
                        : 'border-[#8c6b44]/50 text-[#5c3e23] opacity-80 hover:opacity-100'
                    }`}
                    style={{ backgroundImage: "url('/parchment_clean.png')", backgroundSize: 'cover' }}
                  >
                    <ScrollText className="h-4 w-4 relative z-10" />
                    <span className="relative z-10">Chỉ lệnh</span>
                  </button>
                  <button
                    onClick={() => setMainHallTab('military')}
                    className={`relative flex flex-col items-center gap-1 rounded-r-xl border border-l-0 px-2.5 py-3 text-[11px] font-black shadow-md cursor-pointer transition-all overflow-hidden ${
                      mainHallTab === 'military'
                        ? 'border-[#8c6b44] text-[#8c2d19] translate-x-0.5'
                        : 'border-[#8c6b44]/50 text-[#5c3e23] opacity-80 hover:opacity-100'
                    }`}
                    style={{ backgroundImage: "url('/parchment_clean.png')", backgroundSize: 'cover' }}
                  >
                    <Swords className="h-4 w-4 relative z-10" />
                    <span className="relative z-10">Quân sự</span>
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Cửa sổ chức năng các công trình khác (mở giữa màn hình khi nhấn vào công trình) */}
      {selectedBuilding && !isMovingBuilding && selectedBuilding.type !== 'main_hall' && (
        <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-xl text-[#261304] font-serif max-h-[85vh] flex flex-col filter drop-shadow-[0_18px_30px_rgba(0,0,0,0.7)] drop-shadow-[0_3px_8px_rgba(0,0,0,0.45)]">
            <img
              src="/parchment_torn_panel.png"
              alt="Giấy gió công trình"
              className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none z-0"
              draggable={false}
            />
            <div className="relative z-10 p-7 overflow-y-auto no-scrollbar">
            {(() => {
              const spec = BASE_BUILDING_CATALOG[selectedBuilding.type];
              const upgradeCost = getUpgradeCost(selectedBuilding.type, selectedBuilding.level);
              const isMax = selectedBuilding.level >= spec.maxLevel;
              const isBusy =
                selectedBuilding.status === 'building' || selectedBuilding.status === 'upgrading';
              const lv = selectedBuilding.level;

              return (
                <>
                  {/* Header (chỉ giữ tên & cấp độ, bỏ mô tả và độ bền) */}
                  <div className="flex items-center justify-between border-b border-[#8c6b44]/35 pb-2.5">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-black text-[#261304]">{spec.name}</h3>
                      <span className="rounded-full bg-[#8c6b44]/15 border border-[#8c6b44]/30 px-2.5 py-0.5 text-xs font-bold text-[#6e380e]">
                        Cấp {lv}/{spec.maxLevel}
                      </span>
                      {isBusy && (
                        <span className="text-xs font-semibold text-[#8c2d19]">
                          (Còn {selectedBuilding.buildDaysRemaining} ngày)
                        </span>
                      )}
                    </div>
                    <button
                      onClick={onClearSelection}
                      className="rounded-lg p-1 text-[#6e4927] hover:text-[#261304] hover:bg-[#8c6b44]/15 cursor-pointer"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Các chức năng công trình hiển thị trực tiếp bên dưới */}
                  {!isScout && (
                    <div className="mt-3 flex flex-col gap-2.5">
                      {selectedBuilding.type === 'barracks' && (
                        <div className="space-y-2">
                          <button
                            onClick={() => onOpenBuildingAction('training')}
                            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#8c2d19] px-3 py-2 text-xs font-bold text-[#fff3db] hover:bg-[#6e1e0d] cursor-pointer shadow"
                          >
                            <Swords className="h-4 w-4" />
                            Mở Thao Trường Luyện Binh
                          </button>
                          <div className="rounded-lg border border-[#8c6b44]/35 bg-white/50 p-2.5 text-xs">
                            <div className="flex items-center justify-between font-bold text-[#261304]">
                              <span>Quân số: {regularTroopsCount} Binh sĩ · {eliteTroopsCount} Tinh nhuệ</span>
                            </div>
                            {selectedBuilding.level >= 3 ? (
                              <div className="mt-2 flex items-center gap-2">
                                <button
                                  disabled={regularTroopsCount < 5}
                                  onClick={() => onPromoteElite(5)}
                                  className="flex-1 rounded bg-amber-800 px-2.5 py-1.5 text-[11px] font-bold text-amber-50 hover:bg-amber-900 disabled:opacity-40 cursor-pointer"
                                >
                                  Tinh tuyển +5 Tinh Nhuệ (75V · 5 khí giới)
                                </button>
                                <button
                                  disabled={regularTroopsCount < 10}
                                  onClick={() => onPromoteElite(10)}
                                  className="flex-1 rounded bg-[#8c2d19] px-2.5 py-1.5 text-[11px] font-bold text-[#fff3db] hover:bg-[#6e1e0d] disabled:opacity-40 cursor-pointer"
                                >
                                  +10 Tinh Nhuệ (150V · 10 khí giới)
                                </button>
                              </div>
                            ) : (
                              <p className="mt-1 text-[11px] text-[#6e4927]">
                                Nâng Trại Luyện Binh lên Cấp 3 để mở khóa tinh tuyển quân Tinh Nhuệ.
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                      {selectedBuilding.type === 'forge' && (
                        <button
                          onClick={() => onOpenBuildingAction('forges')}
                          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#8c5828] px-3 py-2 text-xs font-bold text-[#fff3db] hover:bg-[#6e421a] cursor-pointer shadow"
                        >
                          <Hammer className="h-4 w-4" />
                          Mở Xưởng Rèn Vũ Khí
                        </button>
                      )}
                      {selectedBuilding.type === 'farm' && (
                        <button
                          onClick={() => onOpenBuildingAction('farms')}
                          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#15803d] px-3 py-2 text-xs font-bold text-[#fff3db] hover:bg-[#166534] cursor-pointer shadow"
                        >
                          <Wheat className="h-4 w-4" />
                          Mở Quản Lý Ruộng Nương
                        </button>
                      )}
                      {selectedBuilding.type === 'watchtower' && (
                        <div className="rounded-lg border border-[#8c6b44]/35 bg-white/45 p-3">
                          <div className="flex gap-1.5 border-b border-[#8c6b44]/25 pb-2 mb-2.5">
                            <button
                              onClick={() => setWatchtowerTab('scout')}
                              className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-black cursor-pointer ${
                                watchtowerTab === 'scout'
                                  ? 'bg-[#8c2d19] text-[#fff3db] shadow'
                                  : 'bg-white/60 text-[#5c3e23] hover:bg-amber-100'
                              }`}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Do Thám
                            </button>
                            <button
                              onClick={() => setWatchtowerTab('hunt')}
                              className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-black cursor-pointer ${
                                watchtowerTab === 'hunt'
                                  ? 'bg-emerald-700 text-white shadow'
                                  : 'bg-white/60 text-[#5c3e23] hover:bg-amber-100'
                              }`}
                            >
                              <Trees className="h-3.5 w-3.5" />
                              Đi Săn & Hái Lượm
                            </button>
                          </div>

                          {watchtowerTab === 'scout' ? (
                            activeWatchtowerScouts[selectedBuilding.id] ? (
                              <div className="rounded-lg border border-amber-700/30 bg-amber-50/80 p-3 text-center">
                                <p className="text-xs font-black text-[#8c2d19]">
                                  Đang do thám {activeWatchtowerScouts[selectedBuilding.id].targetName}
                                </p>
                                <p className="mt-1 text-[11px] font-semibold text-[#5c3e23]">
                                  Còn {activeWatchtowerScouts[selectedBuilding.id].daysRemaining}/
                                  {activeWatchtowerScouts[selectedBuilding.id].totalDays} ngày
                                </p>
                              </div>
                            ) : scoutableDistricts.length === 0 ? (
                              <p className="text-xs text-emerald-800 font-semibold text-center py-2">
                                Không còn khu vực hợp lệ để do thám ở cấp hiện tại.
                              </p>
                            ) : (
                              <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                                {scoutableDistricts.map((d) => (
                                  <div
                                    key={d.id}
                                    className="flex items-center justify-between rounded border border-[#8c6b44]/25 bg-white/65 px-2.5 py-1.5 text-xs"
                                  >
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-bold text-[#261304]">{d.name}</span>
                                      <span className="text-[10px] font-semibold text-[#6e4927]">
                                        ({d.scoutDays} ngày)
                                      </span>
                                    </div>
                                    <button
                                      onClick={() =>
                                        onScoutDistrict(selectedBuilding.id, d.id, d.name, d.scoutDays)
                                      }
                                      className="rounded bg-[#8c2d19] px-2.5 py-1 text-[11px] font-bold text-[#fff3db] hover:bg-[#6e1e0d] cursor-pointer"
                                    >
                                      Do thám
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )
                          ) : (
                            <div className="space-y-2">
                              <div className="grid grid-cols-1 gap-1.5">
                                {(
                                  [
                                    {
                                      key: 'gather',
                                      title: 'Hái Lượm Thảo Dược',
                                      desc: `+${8 + lv * 2} lương · Thảo dược, Mật ong (${Math.min(65, 14 + lv * 10)}% đồ hiếm)`,
                                    },
                                    {
                                      key: 'hunt',
                                      title: 'Săn Bắn Rừng Sâu',
                                      desc: `+${12 + lv * 3} lương · Da thú, Nhung hươu (${Math.min(70, Math.round((14 + lv * 10) * 1.15))}% đồ hiếm)`,
                                    },
                                    {
                                      key: 'treasure',
                                      title: 'Thám Bảo Cổ Tích (-10 lương)',
                                      desc: `Tỉ lệ đồ hiếm cực cao (${Math.min(85, Math.round((14 + lv * 10) * 1.9))}% Ngọc bích, Kỳ nam)`,
                                    },
                                  ] as const
                                ).map((m) => (
                                  <button
                                    key={m.key}
                                    onClick={() => setForageMode(m.key)}
                                    className={`rounded-lg border p-2 text-left cursor-pointer transition-all ${
                                      forageMode === m.key
                                        ? 'border-emerald-700 bg-emerald-50/90 shadow-sm'
                                        : 'border-[#8c6b44]/25 bg-white/60 hover:bg-amber-50'
                                    }`}
                                  >
                                    <div className="text-xs font-black text-[#261304]">{m.title}</div>
                                    <div className="text-[10px] text-[#5c3e23]">{m.desc}</div>
                                  </button>
                                ))}
                              </div>
                              <button
                                onClick={() =>
                                  onForageWatchtower(selectedBuilding.id, selectedBuilding.level, forageMode)
                                }
                                className="w-full rounded-lg bg-emerald-700 py-2 text-xs font-bold text-white hover:bg-emerald-800 cursor-pointer shadow"
                              >
                                Xuất phát đi săn (1 lần/ngày)
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {selectedBuilding.type === 'market' && (() => {
                        const bonus = 1 + (lv - 1) * 0.15;
                        const groupedForaged = new Map<
                          string,
                          { itemId: string; name: string; rare: boolean; basePrice: number; count: number }
                        >();
                        for (const it of foragedInventory) {
                          const existing = groupedForaged.get(it.itemId);
                          if (existing) {
                            existing.count += 1;
                          } else {
                            groupedForaged.set(it.itemId, {
                              itemId: it.itemId,
                              name: it.name,
                              rare: it.rare,
                              basePrice: it.basePrice,
                              count: 1,
                            });
                          }
                        }

                        const marketCards: Array<{
                          id: string;
                          kind: 'item' | 'food' | 'swords' | 'spears' | 'bows';
                          itemId?: string;
                          name: string;
                          avail: number;
                          unitBase: number;
                          step: number;
                          defaultAmt: number;
                          isRare: boolean;
                        }> = [
                          { id: 'food', kind: 'food', name: 'Lương thực', avail: resourcesSummary.food, unitBase: 0.2, step: 10, defaultAmt: Math.min(100, Math.max(10, resourcesSummary.food)), isRare: false },
                          { id: 'swords', kind: 'swords', name: 'Kiếm', avail: resourcesSummary.swords, unitBase: 3, step: 1, defaultAmt: Math.min(10, Math.max(1, resourcesSummary.swords)), isRare: false },
                          { id: 'spears', kind: 'spears', name: 'Giáo', avail: resourcesSummary.spears, unitBase: 3.2, step: 1, defaultAmt: Math.min(10, Math.max(1, resourcesSummary.spears)), isRare: false },
                          { id: 'bows', kind: 'bows', name: 'Cung', avail: resourcesSummary.bows, unitBase: 3.5, step: 1, defaultAmt: Math.min(10, Math.max(1, resourcesSummary.bows)), isRare: false },
                          ...Array.from(groupedForaged.values()).map((g) => ({
                            id: `item_${g.itemId}`,
                            kind: 'item' as const,
                            itemId: g.itemId,
                            name: g.name,
                            avail: g.count,
                            unitBase: g.basePrice,
                            step: 1,
                            defaultAmt: 1,
                            isRare: g.rare,
                          })),
                        ];

                        const isTrade = marketTab === 'trade';
                        const activeId = isTrade ? tradeSelection : auctionSelection;
                        const activeCard = marketCards.find((c) => c.id === activeId) ?? marketCards[0];
                        const maxAmt = Math.max(1, activeCard.avail);
                        const rawAmt = isTrade ? tradeAmount : auctionAmount;
                        const clampedAmt = Math.max(1, Math.min(maxAmt, rawAmt));
                        const fairValue = Math.max(1, Math.round(clampedAmt * activeCard.unitBase * bonus));
                        const tradeMaxAcceptable = Math.max(
                          fairValue + 3,
                          Math.round(fairValue * (activeCard.isRare ? 1.8 : 1.35))
                        );
                        const auctionFilterMax = Math.round(
                          fairValue * (activeCard.isRare ? 2.6 : 1.55)
                        );

                        const handleSelectCard = (card: typeof activeCard) => {
                          const nextAmt = Math.max(1, Math.min(Math.max(1, card.avail), card.defaultAmt));
                          const nextFair = Math.max(1, Math.round(nextAmt * card.unitBase * bonus));
                          if (isTrade) {
                            setTradeSelection(card.id);
                            setTradeAmount(nextAmt);
                            setTradePrice(nextFair);
                          } else {
                            setAuctionSelection(card.id);
                            setAuctionAmount(nextAmt);
                            setAuctionStartPrice(Math.max(5, Math.round(nextFair * 0.9)));
                            setAuctionTargetPrice(Math.round(nextFair * (card.isRare ? 2.4 : 1.5)));
                          }
                        };

                        const handleChangeAmt = (nextRaw: number) => {
                          const nextAmt = Math.max(1, Math.min(maxAmt, Math.round(nextRaw) || 1));
                          const nextFair = Math.max(1, Math.round(nextAmt * activeCard.unitBase * bonus));
                          if (isTrade) {
                            setTradeAmount(nextAmt);
                            setTradePrice(nextFair);
                          } else {
                            setAuctionAmount(nextAmt);
                            setAuctionStartPrice(Math.max(5, Math.round(nextFair * 0.9)));
                            setAuctionTargetPrice(Math.round(nextFair * (activeCard.isRare ? 2.4 : 1.5)));
                          }
                        };

                        return (
                          <div className="rounded-lg border border-[#8c6b44]/35 bg-white/45 p-3">
                            <div className="flex gap-1.5 border-b border-[#8c6b44]/25 pb-2 mb-2.5">
                              <button
                                onClick={() => setMarketTab('trade')}
                                className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-black cursor-pointer ${
                                  isTrade
                                    ? 'bg-[#8c5828] text-[#fff3db] shadow'
                                    : 'bg-white/60 text-[#5c3e23] hover:bg-amber-100'
                                }`}
                              >
                                <Store className="h-3.5 w-3.5" />
                                Buôn Bán
                              </button>
                              <button
                                onClick={() => setMarketTab('auction')}
                                className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-black cursor-pointer ${
                                  !isTrade
                                    ? 'bg-[#8c2d19] text-[#fff3db] shadow'
                                    : 'bg-white/60 text-[#5c3e23] hover:bg-amber-100'
                                }`}
                              >
                                <Gavel className="h-3.5 w-3.5" />
                                Đấu Giá ({canAuctionThisMonth ? '1/1' : '0/1'})
                              </button>
                            </div>

                            {/* Lưới thẻ vật phẩm kiểu shopping */}
                            <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1 mb-2.5">
                              {marketCards.map((card) => {
                                const selected = card.id === activeCard.id;
                                const unitHint =
                                  card.kind === 'food'
                                    ? `${Math.max(1, Math.round(10 * card.unitBase * bonus))}V / 10`
                                    : `${Math.max(1, Math.round(card.unitBase * bonus))}V / cái`;
                                return (
                                  <button
                                    key={card.id}
                                    type="button"
                                    onClick={() => handleSelectCard(card)}
                                    className={`flex flex-col justify-between rounded-lg border p-2 text-left transition cursor-pointer ${
                                      selected
                                        ? 'border-[#8c2d19] bg-amber-50/95 ring-1 ring-[#8c2d19]/40 shadow-sm'
                                        : card.isRare
                                        ? 'border-amber-600/40 bg-amber-50/60 hover:bg-amber-50'
                                        : 'border-[#8c6b44]/25 bg-white/70 hover:bg-white'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-1">
                                      <span className="text-[11px] font-black text-[#261304] truncate">
                                        {card.name}
                                      </span>
                                      {card.isRare && (
                                        <span className="rounded bg-amber-600 px-1 py-0.5 text-[8px] font-black text-white shrink-0">
                                          HIẾM
                                        </span>
                                      )}
                                    </div>
                                    <div className="mt-1 flex items-center justify-between text-[10px] text-[#5c3e23]">
                                      <span className={card.avail === 0 ? 'text-red-700 font-bold' : ''}>
                                        Kho: {card.avail}
                                      </span>
                                      <span className="font-bold text-[#8c5828]">~{unitHint}</span>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>

                            {/* Khu vực chỉnh số lượng & giá */}
                            <div className="space-y-2 rounded-lg border border-[#8c6b44]/25 bg-white/70 p-2.5 text-xs">
                              <div className="flex items-center justify-between">
                                <span className="font-black text-[#261304]">
                                  {activeCard.name}
                                </span>
                                <span className="text-[10px] font-semibold text-[#5c3e23]">
                                  Tối đa: {activeCard.avail}
                                </span>
                              </div>

                              {/* Tăng giảm số lượng */}
                              <div>
                                <label className="block text-[10px] font-bold text-[#5c3e23] mb-0.5">
                                  Số lượng
                                </label>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    disabled={activeCard.avail <= 0}
                                    onClick={() => handleChangeAmt(clampedAmt - activeCard.step)}
                                    className="rounded border border-[#8c6b44]/40 bg-white px-2.5 py-1 text-xs font-black text-[#261304] hover:bg-amber-100 disabled:opacity-40 cursor-pointer"
                                  >
                                    -
                                  </button>
                                  <input
                                    type="number"
                                    min={1}
                                    max={maxAmt}
                                    value={clampedAmt}
                                    onChange={(e) => handleChangeAmt(Number(e.target.value))}
                                    className="w-full rounded border border-[#8c6b44]/40 bg-white px-2 py-1 text-center text-xs font-bold text-[#261304]"
                                  />
                                  <button
                                    type="button"
                                    disabled={activeCard.avail <= 0}
                                    onClick={() => handleChangeAmt(clampedAmt + activeCard.step)}
                                    className="rounded border border-[#8c6b44]/40 bg-white px-2.5 py-1 text-xs font-black text-[#261304] hover:bg-amber-100 disabled:opacity-40 cursor-pointer"
                                  >
                                    +
                                  </button>
                                  <button
                                    type="button"
                                    disabled={activeCard.avail <= 0}
                                    onClick={() => handleChangeAmt(activeCard.avail)}
                                    className="rounded border border-[#8c6b44]/40 bg-amber-50 px-2 py-1 text-[10px] font-bold text-[#6e380e] hover:bg-amber-100 disabled:opacity-40 cursor-pointer shrink-0"
                                  >
                                    Tất cả
                                  </button>
                                </div>
                              </div>

                              {isTrade ? (
                                <>
                                  {/* Tăng giảm / nhập giá bán */}
                                  <div>
                                    <label className="block text-[10px] font-bold text-[#5c3e23] mb-0.5">
                                      Giá bán (Vàng)
                                    </label>
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => setTradePrice(Math.max(1, tradePrice - 5))}
                                        className="rounded border border-[#8c6b44]/40 bg-white px-2.5 py-1 text-xs font-black text-[#261304] hover:bg-amber-100 cursor-pointer"
                                      >
                                        -
                                      </button>
                                      <input
                                        type="number"
                                        min={1}
                                        value={tradePrice}
                                        onChange={(e) => setTradePrice(Math.max(1, Number(e.target.value) || 1))}
                                        className="w-full rounded border border-[#8c6b44]/40 bg-white px-2 py-1 text-center text-xs font-bold text-[#261304]"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => setTradePrice(tradePrice + 5)}
                                        className="rounded border border-[#8c6b44]/40 bg-white px-2.5 py-1 text-xs font-black text-[#261304] hover:bg-amber-100 cursor-pointer"
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>

                                  <div className="rounded border border-amber-700/25 bg-amber-50/75 px-2 py-1 text-[10px] text-[#5c3e23]">
                                    Định giá thị trường: ~<strong>{fairValue}V</strong> · Thương nhân chấp nhận tối đa ~<strong>{tradeMaxAcceptable}V</strong>
                                  </div>

                                  <button
                                    disabled={activeCard.avail < clampedAmt || activeCard.avail <= 0}
                                    onClick={() =>
                                      onSellMarketGoods({
                                        kind: activeCard.kind,
                                        itemId: activeCard.itemId,
                                        amount: clampedAmt,
                                        askPrice: tradePrice,
                                      })
                                    }
                                    className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-[#8c5828] py-2 text-xs font-bold text-[#fff3db] hover:bg-[#6e421a] disabled:opacity-40 cursor-pointer shadow"
                                  >
                                    <Coins className="h-3.5 w-3.5" />
                                    Bán Ngay (+{tradePrice}V)
                                  </button>
                                </>
                              ) : (
                                <>
                                  <div className="grid grid-cols-3 gap-1.5">
                                    <div>
                                      <label className="block text-[10px] font-bold text-[#5c3e23] mb-0.5">
                                        Giá sàn (V)
                                      </label>
                                      <div className="flex items-center gap-0.5">
                                        <button
                                          type="button"
                                          onClick={() => setAuctionStartPrice(Math.max(1, auctionStartPrice - 5))}
                                          className="rounded border border-[#8c6b44]/40 bg-white px-1.5 py-1 text-[11px] font-black hover:bg-amber-100 cursor-pointer"
                                        >
                                          -
                                        </button>
                                        <input
                                          type="number"
                                          min={1}
                                          value={auctionStartPrice}
                                          onChange={(e) => setAuctionStartPrice(Math.max(1, Number(e.target.value) || 1))}
                                          className="w-full min-w-0 rounded border border-[#8c6b44]/40 bg-white px-1 py-1 text-center text-[11px] font-bold"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => setAuctionStartPrice(auctionStartPrice + 5)}
                                          className="rounded border border-[#8c6b44]/40 bg-white px-1.5 py-1 text-[11px] font-black hover:bg-amber-100 cursor-pointer"
                                        >
                                          +
                                        </button>
                                      </div>
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-bold text-[#5c3e23] mb-0.5">
                                        Bước nhảy (V)
                                      </label>
                                      <div className="flex items-center gap-0.5">
                                        <button
                                          type="button"
                                          onClick={() => setAuctionBidStep(Math.max(1, auctionBidStep - 1))}
                                          className="rounded border border-[#8c6b44]/40 bg-white px-1.5 py-1 text-[11px] font-black hover:bg-amber-100 cursor-pointer"
                                        >
                                          -
                                        </button>
                                        <input
                                          type="number"
                                          min={1}
                                          value={auctionBidStep}
                                          onChange={(e) => setAuctionBidStep(Math.max(1, Number(e.target.value) || 1))}
                                          className="w-full min-w-0 rounded border border-[#8c6b44]/40 bg-white px-1 py-1 text-center text-[11px] font-bold"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => setAuctionBidStep(auctionBidStep + 1)}
                                          className="rounded border border-[#8c6b44]/40 bg-white px-1.5 py-1 text-[11px] font-black hover:bg-amber-100 cursor-pointer"
                                        >
                                          +
                                        </button>
                                      </div>
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-bold text-[#5c3e23] mb-0.5">
                                        Giá thắng (V)
                                      </label>
                                      <div className="flex items-center gap-0.5">
                                        <button
                                          type="button"
                                          onClick={() => setAuctionTargetPrice(Math.max(1, auctionTargetPrice - 5))}
                                          className="rounded border border-[#8c6b44]/40 bg-white px-1.5 py-1 text-[11px] font-black hover:bg-amber-100 cursor-pointer"
                                        >
                                          -
                                        </button>
                                        <input
                                          type="number"
                                          min={1}
                                          value={auctionTargetPrice}
                                          onChange={(e) => setAuctionTargetPrice(Math.max(1, Number(e.target.value) || 1))}
                                          className="w-full min-w-0 rounded border border-[#8c6b44]/40 bg-white px-1 py-1 text-center text-[11px] font-bold"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => setAuctionTargetPrice(auctionTargetPrice + 5)}
                                          className="rounded border border-[#8c6b44]/40 bg-white px-1.5 py-1 text-[11px] font-black hover:bg-amber-100 cursor-pointer"
                                        >
                                          +
                                        </button>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="rounded border border-amber-700/25 bg-amber-50/75 px-2 py-1 text-[10px] text-[#5c3e23]">
                                    <strong>Bộ lọc định giá:</strong> Giá trị thực ~{fairValue}V · Trần thương nhân trả tối đa ~<strong>{auctionFilterMax}V</strong>
                                  </div>

                                  <button
                                    disabled={!canAuctionThisMonth || activeCard.avail < clampedAmt || activeCard.avail <= 0}
                                    onClick={() =>
                                      onRunMarketAuction({
                                        kind: activeCard.kind,
                                        itemId: activeCard.itemId,
                                        amount: clampedAmt,
                                        startPrice: auctionStartPrice,
                                        bidStep: auctionBidStep,
                                        targetPrice: auctionTargetPrice,
                                      })
                                    }
                                    className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-[#8c2d19] py-2 text-xs font-bold text-[#fff3db] hover:bg-[#6e1e0d] disabled:opacity-40 cursor-pointer shadow"
                                  >
                                    <Gavel className="h-3.5 w-3.5" />
                                    {canAuctionThisMonth ? 'Mở Phiên Đấu Giá' : 'Tháng này đã đấu giá rồi'}
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Cắt cử Tướng Giám Sát công trình */}
                      {selectedBuilding.type !== 'wall' &&
                        selectedBuilding.type !== 'gate' &&
                        selectedBuilding.type !== 'spike_trap' &&
                        selectedBuilding.type !== 'road' && (
                          <div className="rounded-lg border border-[#8c6b44]/35 bg-white/50 p-2.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-black text-[#5c3e23]">Tướng Giám Sát:</span>
                              <select
                                value={selectedBuilding.supervisorGeneralId || ''}
                                onChange={(e) => onAssignSupervisor(selectedBuilding.id, e.target.value || null)}
                                className="flex-1 rounded border border-[#8c6b44]/40 bg-white px-2 py-1 text-xs font-bold text-[#261304]"
                              >
                                <option value="">-- Chưa cắt cử --</option>
                                {generals.map((g) => (
                                  <option key={g.id} value={g.id}>
                                    {g.name} (TL:{g.stats.command} · VN:{g.stats.martial} · TR:{g.stats.intellect})
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        )}

                      {selectedBuilding.hp < selectedBuilding.maxHp && (
                        <button
                          onClick={() => onRepairBuilding(selectedBuilding.id)}
                          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800 cursor-pointer shadow"
                        >
                          Sửa chữa công trình ({selectedBuilding.hp}/{selectedBuilding.maxHp} HP)
                        </button>
                      )}

                      <div className="flex gap-2">
                        <button
                          disabled={isMax || isBusy}
                          onClick={() => onUpgradeBuilding(selectedBuilding.id)}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#8c5828] px-3 py-2 text-xs font-bold text-[#fff3db] hover:bg-[#6e421a] disabled:opacity-45 cursor-pointer shadow"
                        >
                          <ArrowUpCircle className="h-3.5 w-3.5" />
                          {isMax
                            ? 'Đã đạt cấp tối đa'
                            : `Nâng cấp (${upgradeCost.gold}V / ${upgradeCost.wood}G)`}
                        </button>
                        <button
                          onClick={onStartMoveBuilding}
                          className="flex items-center justify-center gap-1 rounded-lg border border-[#8c6b44]/50 bg-[#8c6b44]/15 px-3 py-2 text-xs font-bold text-[#261304] hover:bg-[#8c6b44]/25 cursor-pointer"
                        >
                          <Move className="h-3.5 w-3.5" />
                          Di dời
                        </button>
                        <button
                          onClick={() => onDemolishBuilding(selectedBuilding.id)}
                          className="flex items-center justify-center rounded-lg border border-[#8c2d19]/40 bg-[#8c2d19]/15 px-3 py-2 text-xs font-bold text-[#8c2d19] hover:bg-[#8c2d19]/25 cursor-pointer"
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
        </div>
      )}

      {/* Giao diện Xây dựng: Thẻ phân loại giấy gió bên trái + Thẻ bài công trình giấy gió phía dưới */}
      {!isScout && isBuildPaletteOpen && (
        <div className="pointer-events-none flex items-end justify-between gap-3 w-full">
          {/* Cuộn giấy gió dọc chọn nhóm: Sản xuất / Cơ sở / Đường */}
          <div className="pointer-events-auto relative flex flex-col items-center w-[136px] shrink-0 font-serif select-none filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.65)]">
            <img
              src="/parchment_torn_panel.png"
              alt="Giấy gió danh mục xây dựng"
              className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none z-0"
              draggable={false}
            />
            <div className="relative z-10 w-full px-3.5 py-4 flex flex-col gap-1.5">
              {BUILD_TABS.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`w-full rounded-lg py-2 px-2 text-center text-xs font-black tracking-wide transition-all cursor-pointer border ${
                      isActive
                        ? 'bg-[#8c2d19]/15 text-[#8c2d19] border-[#8c2d19]/50 shadow-inner'
                        : 'bg-transparent text-[#3a220f] border-transparent hover:bg-[#8c6b44]/15'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
              <div className="mt-1 border-t border-[#8c6b44]/30 pt-1.5 text-center text-[10px] font-bold text-[#5c3e23]">
                Phạm vi: {buildSpan}×{buildSpan}
                <div className="text-[9px] font-normal text-[#704d2e]">Nhà Chính Lv.{mainLevel}</div>
              </div>
            </div>
          </div>

          {/* Hàng thẻ bài công trình giấy gió nằm ngang phía dưới */}
          <div className="pointer-events-auto flex-1 flex items-end gap-2.5 overflow-x-auto pb-1 pr-2">
            {currentTabItems.map((type) => {
              const spec = BASE_BUILDING_CATALOG[type];
              const count = layout.buildings.filter(
                (b) => b.type === type && b.status !== 'destroyed'
              ).length;
              const isFull = count >= spec.maxPerBase;
              const isSelected = activeBuildType === type;
              const canAfford = gold >= spec.goldCost && wood >= spec.woodCost && food >= spec.foodCost;
              const lockedByHall = mainLevel < spec.requiredMainHallLevel;
              const disabled = isFull || lockedByHall;
              const iconSrc = BUILDING_ICON[type] || '/icons/structure_camp.png';

              return (
                <div
                  key={type}
                  onClick={() => {
                    if (!disabled) onSelectBuildType(isSelected ? null : type);
                  }}
                  className={`relative flex flex-col items-center justify-between w-[142px] h-[164px] shrink-0 px-3.5 py-3.5 font-serif transition-all select-none filter ${
                    disabled
                      ? 'opacity-70 grayscale-[0.3] cursor-not-allowed drop-shadow-[0_6px_12px_rgba(0,0,0,0.45)]'
                      : isSelected
                      ? '-translate-y-2 drop-shadow-[0_12px_22px_rgba(140,45,25,0.65)] cursor-pointer'
                      : 'hover:-translate-y-1 drop-shadow-[0_10px_18px_rgba(0,0,0,0.55)] cursor-pointer'
                  }`}
                >
                  <img
                    src="/parchment_torn_panel.png"
                    alt={spec.name}
                    className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none z-0"
                    draggable={false}
                  />

                  {/* Góc trên phải: số lượng hiện tại / tối đa */}
                  <span className="relative z-10 self-end rounded bg-[#5c3a18]/10 px-1.5 py-0.5 text-[10px] font-black text-[#4b321a]">
                    {count}/{spec.maxPerBase}
                  </span>

                  {/* Minh họa công trình ở giữa */}
                  <div className="relative z-10 flex items-center justify-center h-14 w-full my-0.5">
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
                    className={`relative z-10 w-full rounded-md py-1 px-1.5 text-center text-[11px] font-black border ${
                      isFull
                        ? 'bg-[#8c5828]/85 text-[#fff3db] border-[#6e421a]'
                        : lockedByHall
                        ? 'bg-stone-600/85 text-stone-100 border-stone-700'
                        : isSelected
                        ? 'bg-[#8c2d19] text-[#fff3db] border-[#6e1e0d]'
                        : canAfford
                        ? 'bg-[#8c6b44]/20 text-[#261304] border-[#8c6b44]/50'
                        : 'bg-black/10 text-[#6e4927] border-[#8c6b44]/30'
                    }`}
                  >
                    {isFull
                      ? 'Đã xây xong'
                      : lockedByHall
                      ? `Mở Lv.${spec.requiredMainHallLevel}`
                      : isSelected
                      ? 'Đang chọn'
                      : `${spec.goldCost}V · ${spec.woodCost}G`}
                  </div>

                  {/* Tên công trình ở chân thẻ */}
                  <span className="relative z-10 mt-1 text-xs font-black text-[#261304] text-center leading-tight truncate w-full">
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
            className="pointer-events-auto relative self-end flex items-center gap-1.5 px-5 py-3 text-xs font-black text-[#4b2b10] hover:text-[#8c2d19] cursor-pointer shrink-0 font-serif filter drop-shadow-[0_10px_18px_rgba(0,0,0,0.55)] transition-transform hover:scale-105 active:scale-95"
          >
            <img
              src="/parchment_torn_panel.png"
              alt="Đóng"
              className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none z-0"
              draggable={false}
            />
            <X className="h-4 w-4 relative z-10" />
            <span className="relative z-10">Đóng</span>
          </button>
        </div>
      )}
    </div>
  );
};
