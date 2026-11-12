import React, { useMemo, useState } from 'react';
import { Store, X, AlertTriangle, ShieldCheck, Minus, Plus, Truck } from 'lucide-react';
import { useGameStore } from '../../../store/gameStore';
import { useUIStore } from '../../../store/uiStore';
import { notify } from '../../../store/dialogStore';
import {
  calculateMarketTradeSuspicion,
  getMarketDistrictsList,
  getDistrictMarketListings,
  getDistrictMarketMeta,
  getResourceAmountForGood,
  type MarketGoodKey,
} from '../../../utils/marketUtils';

export const MarketModal: React.FC = React.memo(() => {
  const activeModal = useUIStore(state => state.activeModal);
  const setActiveModal = useUIStore(state => state.setActiveModal);
  const marketDistrictId = useUIStore(state => state.marketDistrictId);
  const openDistrictMarket = useUIStore(state => state.openDistrictMarket);
  const selectedCityId = useUIStore(state => state.selectedCityId);

  const cities = useGameStore(state => state.cities);
  const formations = useGameStore(state => state.formations);
  const resources = useGameStore(state => state.resources);
  const suspicion = useGameStore(state => state.suspicion);
  const month = useGameStore(state => state.month);
  const year = useGameStore(state => state.year);
  const marketUsedThisMonth = useGameStore(state => state.marketUsedThisMonth);
  const pendingMarketOrders = useGameStore(state => state.pendingMarketOrders);
  const executeMarketTrade = useGameStore(state => state.executeMarketTrade);
  const dispatchArmyForMarketPickup = useGameStore(state => state.dispatchArmyForMarketPickup);

  const [tradeMode, setTradeMode] = useState<'buy' | 'sell'>('buy');
  const [selectedFormationId, setSelectedFormationId] = useState<string>('');

  const districts = useMemo(() => getMarketDistrictsList(), []);
  const defaultDistrictId = useMemo(() => {
    if (marketDistrictId && districts.some(d => d.id === marketDistrictId)) return marketDistrictId;
    if (selectedCityId) {
      const city = cities.find(c => c.id === selectedCityId);
      const dId = city?.districtId ?? city?.id;
      if (dId && districts.some(d => d.id === dId)) return dId;
    }
    return districts.find(d => d.id === 'lam_son')?.id ?? districts[0]?.id ?? 'lam_son';
  }, [marketDistrictId, districts, selectedCityId, cities]);

  const [quantities, setQuantities] = useState<Record<MarketGoodKey, number>>({
    food: 1,
    swords: 1,
    spears: 1,
    bows: 1,
    clothes: 1,
    horses: 1,
  });

  const meta = useMemo(
    () => getDistrictMarketMeta(defaultDistrictId, cities),
    [defaultDistrictId, cities]
  );

  const listings = useMemo(
    () => getDistrictMarketListings(defaultDistrictId, cities, { month, year }, marketUsedThisMonth),
    [defaultDistrictId, cities, month, year, marketUsedThisMonth]
  );

  const visibleListings = useMemo(
    () => (tradeMode === 'buy' ? listings.filter(l => l.monthlyStock > 0) : listings),
    [tradeMode, listings]
  );

  const availableFormations = useMemo(
    () =>
      formations.filter(
        f => (f.faction ?? 'lam_son') === 'lam_son' && (f.status === 'idle' || f.status === 'stationed') && f.totalTroops > 0
      ),
    [formations]
  );

  const effectiveFormationId = availableFormations.some(f => f.id === selectedFormationId)
    ? selectedFormationId
    : (availableFormations[0]?.id ?? '');

  if (activeModal !== 'market') return null;

  const setQty = (key: MarketGoodKey, value: number) => {
    setQuantities(prev => ({ ...prev, [key]: Math.max(1, Math.min(999, Math.floor(value) || 1)) }));
  };

  const handleTrade = (goodKey: MarketGoodKey) => {
    const lots = quantities[goodKey] ?? 1;
    const res = executeMarketTrade(defaultDistrictId, goodKey, tradeMode, lots);
    if (res.success) {
      if (res.suspicionGain > 0) notify.warning(res.message);
      else notify.success(res.message);
    } else {
      notify.error(res.message);
    }
  };

  const handleDispatchPickup = (districtId: string) => {
    if (!effectiveFormationId) {
      notify.error('Không có đạo quân rảnh rỗi tại bản doanh để cử đi lấy hàng!');
      return;
    }
    const res = dispatchArmyForMarketPickup(effectiveFormationId, districtId);
    if (res.success) notify.success(res.message);
    else notify.error(res.message);
  };

  const awaitingDistrictIds = Array.from(
    new Set(pendingMarketOrders.filter(o => o.status === 'awaiting_pickup').map(o => o.districtId))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 pt-20 bg-black/60 select-none">
      <div className="relative w-full max-w-5xl max-h-full flex flex-col">
        <img
          src="/parchment_torn_horizontal.png"
          alt="Chợ Huyện"
          className="absolute inset-0 w-full h-full object-fill pointer-events-none z-0"
          draggable={false}
        />

        <div className="relative z-10 p-5 md:p-8 flex flex-col min-h-0 font-serif text-[#261304]">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#8c6b44]/40 pb-2.5 mb-3 shrink-0">
            <div className="flex items-center gap-2.5">
              <Store size={22} className="text-[#8c2d19]" />
              <div>
                <h2 className="font-black text-xl tracking-wide leading-tight">
                  {meta.marketName}
                </h2>
                <div className="text-xs text-[#6b4423] flex flex-wrap items-center gap-2">
                  <span>{meta.chau}</span>
                  <span>•</span>
                  <span>{meta.tagLabel}</span>
                  <span>•</span>
                  <span className={meta.hasMingGarrison ? 'text-[#8c2d19] font-bold' : meta.hasLamSonBase ? 'text-[#15803d] font-bold' : ''}>
                    {meta.hasMingGarrison
                      ? '⚠ Có đồn binh Minh (nghi ngờ ×1.65)'
                      : meta.hasLamSonBase
                        ? '★ Vùng kiểm soát Lam Sơn (nghi ngờ ×0.65)'
                        : 'Tuần tra Minh trung bình (×1.0)'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className={`px-2.5 py-1 rounded border text-xs font-bold ${
                suspicion >= 75
                  ? 'bg-[#8c2d19]/15 border-[#8c2d19] text-[#8c2d19]'
                  : 'bg-[#8c6b44]/10 border-[#8c6b44]/40 text-[#5c3e23]'
              }`}>
                Độ nghi ngờ quân Minh: <span className="font-mono">{Math.round(suspicion)}%</span>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 rounded hover:bg-[#8c6b44]/15 cursor-pointer"
                title="Đóng"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Chọn chợ huyện + Tab Mua/Bán + Tồn kho */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 mb-3 shrink-0">
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-xs font-bold text-[#5c3e23] shrink-0">Chợ Huyện:</label>
              <select
                value={defaultDistrictId}
                onChange={e => openDistrictMarket(e.target.value)}
                className="p-1.5 rounded border border-[#8c6b44]/50 bg-[#f4e4bc] text-xs font-bold min-w-[220px]"
              >
                {districts.map(d => {
                  const dMeta = getDistrictMarketMeta(d.id, cities);
                  return (
                    <option key={d.id} value={d.id}>
                      {d.name} ({dMeta.tagLabel}){dMeta.hasMingGarrison ? ' [⚠ Đồn Minh]' : ''}
                    </option>
                  );
                })}
              </select>

              {/* Tách riêng chế độ Mua và Bán */}
              <div className="inline-flex rounded border border-[#8c6b44]/50 overflow-hidden text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setTradeMode('buy')}
                  className={`px-3 py-1.5 cursor-pointer transition ${
                    tradeMode === 'buy'
                      ? 'bg-[#8c2d19] text-[#fff3db]'
                      : 'bg-[#f4e4bc] text-[#5c3e23] hover:bg-[#e7d09c]'
                  }`}
                >
                  Mua Hàng
                </button>
                <button
                  type="button"
                  onClick={() => setTradeMode('sell')}
                  className={`px-3 py-1.5 cursor-pointer transition ${
                    tradeMode === 'sell'
                      ? 'bg-[#15803d] text-[#fff3db]'
                      : 'bg-[#f4e4bc] text-[#5c3e23] hover:bg-[#e7d09c]'
                  }`}
                >
                  Bán Hàng
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs bg-black/[0.04] px-3 py-1.5 rounded border border-[#8c6b44]/30">
              <span>Vàng: <strong className="text-[#b45309] font-mono">{Math.floor(resources.gold).toLocaleString()}</strong></span>
              <span>Lương: <strong className="font-mono">{Math.floor(resources.food).toLocaleString()}</strong></span>
              <span>Kiếm: <strong className="font-mono">{Math.floor(resources.swords)}</strong></span>
              <span>Giáo: <strong className="font-mono">{Math.floor(resources.spears)}</strong></span>
              <span>Cung: <strong className="font-mono">{Math.floor(resources.bows)}</strong></span>
              <span>Quân trang: <strong className="font-mono">{Math.floor(resources.clothes)}</strong></span>
              <span>Ngựa: <strong className="font-mono">{Math.floor(resources.horses)}</strong></span>
            </div>
          </div>

          {/* Danh sách hàng hóa */}
          <div className="overflow-y-auto no-scrollbar space-y-2 min-h-0 pr-1">
            {visibleListings.map(({ config, buyPrice, sellPrice, monthlyStock, remainingStock }) => {
              const lots = quantities[config.key] ?? 1;
              const qty = lots * config.lotSize;
              const owned = getResourceAmountForGood(resources, config.key);
              const totalBuyCost = lots * buyPrice;
              const totalSellGold = lots * sellPrice;
              const suspicionGain = calculateMarketTradeSuspicion(
                defaultDistrictId,
                config.key,
                tradeMode,
                lots,
                cities
              );
              const canBuy = remainingStock >= lots && resources.gold >= totalBuyCost;
              const canSell = owned >= qty;

              return (
                <div
                  key={config.key}
                  className="p-2.5 rounded border border-[#8c6b44]/35 bg-black/[0.04] flex flex-wrap md:flex-nowrap items-center justify-between gap-3 text-xs"
                >
                  {/* Tên hàng + tồn */}
                  <div className="flex items-center gap-2.5 min-w-[200px]">
                    <img
                      src={config.icon}
                      alt={config.label}
                      className="w-8 h-8 object-contain shrink-0 pointer-events-none"
                      draggable={false}
                    />
                    <div>
                      <div className="font-black text-sm leading-tight">
                        {config.label}{' '}
                        <span className="text-[10px] font-normal text-[#6b4423]">({config.unitLabel}/lô)</span>
                      </div>
                      <div className="text-[11px] text-[#6b4423]">
                        {tradeMode === 'buy' ? (
                          <>
                            Chợ tháng này:{' '}
                            <strong className={remainingStock === 0 ? 'text-[#8c2d19]' : ''}>{remainingStock}</strong>
                            /{monthlyStock} lô
                          </>
                        ) : (
                          <>
                            Trong kho ta: <strong>{owned.toLocaleString()}</strong>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Giá */}
                  <div className="text-[11px] shrink-0 w-24">
                    {tradeMode === 'buy' ? (
                      <>
                        <span className="text-[#6b4423]">Giá mua: </span>
                        <strong className="text-[#8c2d19] font-mono">{buyPrice} 🪙</strong>
                      </>
                    ) : (
                      <>
                        <span className="text-[#6b4423]">Giá bán: </span>
                        <strong className="text-[#15803d] font-mono">{sellPrice} 🪙</strong>
                      </>
                    )}
                  </div>

                  {/* Chọn số lô */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setQty(config.key, lots - 1)}
                      disabled={lots <= 1}
                      className="p-1 rounded border border-[#8c6b44]/40 bg-[#8c6b44]/15 cursor-pointer disabled:opacity-40"
                    >
                      <Minus size={12} />
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={999}
                      value={lots}
                      onChange={e => setQty(config.key, Number(e.target.value))}
                      className="w-12 text-center p-1 rounded border border-[#8c6b44]/40 bg-[#f4e4bc] font-mono font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => setQty(config.key, lots + 1)}
                      className="p-1 rounded border border-[#8c6b44]/40 bg-[#8c6b44]/15 cursor-pointer"
                    >
                      <Plus size={12} />
                    </button>
                    {[5, 10].map(preset => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setQty(config.key, preset)}
                        className="px-1.5 py-1 rounded border border-[#8c6b44]/30 bg-[#8c6b44]/10 hover:bg-[#8c6b44]/20 text-[10px] font-bold cursor-pointer"
                      >
                        ×{preset}
                      </button>
                    ))}
                  </div>

                  {/* Cảnh báo nghi ngờ */}
                  <div className="w-[125px] shrink-0 flex items-center gap-1 text-[11px]">
                    {suspicionGain > 0 ? (
                      <span className="text-[#8c2d19] font-bold flex items-center gap-1">
                        <AlertTriangle size={13} />
                        +{suspicionGain}% nghi ngờ
                      </span>
                    ) : (
                      <span className="text-[#15803d] flex items-center gap-1">
                        <ShieldCheck size={13} />
                        An toàn (0%)
                      </span>
                    )}
                  </div>

                  {/* Nút hành động */}
                  <div className="shrink-0">
                    {tradeMode === 'buy' ? (
                      <button
                        type="button"
                        disabled={!canBuy}
                        onClick={() => handleTrade(config.key)}
                        className="px-3.5 py-1.5 rounded bg-[#8c2d19] hover:bg-[#6e1e0d] text-[#fff3db] font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition"
                        title={`Đặt mua ${qty.toLocaleString()} ${config.label}`}
                      >
                        Đặt Mua (-{totalBuyCost}🪙)
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={!canSell}
                        onClick={() => handleTrade(config.key)}
                        className="px-3.5 py-1.5 rounded bg-[#15803d] hover:bg-[#166534] text-[#fff3db] font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition"
                        title={`Bán ${qty.toLocaleString()} ${config.label}`}
                      >
                        Bán (+{totalSellGold}🪙)
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Hàng đã mua đang chờ cử quân đi lấy hoặc đang trên đường chở về */}
            {pendingMarketOrders.length > 0 && (
              <div className="mt-3 p-3 rounded border border-[#8c6b44]/45 bg-[#f4e4bc]/75 space-y-2 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-black text-[#8c2d19] flex items-center gap-1.5">
                    <Truck size={15} />
                    Hàng Đã Mua Tại Chợ ({pendingMarketOrders.length} kiện)
                  </div>
                  {awaitingDistrictIds.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-[#5c3e23]">Đạo quân đi lấy:</span>
                      <select
                        value={effectiveFormationId}
                        onChange={e => setSelectedFormationId(e.target.value)}
                        className="p-1 rounded border border-[#8c6b44]/50 bg-[#fdf8f0] text-xs font-bold"
                      >
                        {availableFormations.length === 0 ? (
                          <option value="">Không có đạo quân rảnh</option>
                        ) : (
                          availableFormations.map(f => (
                            <option key={f.id} value={f.id}>
                              {f.name} ({f.totalTroops} binh)
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  {pendingMarketOrders.map(order => (
                    <div
                      key={order.id}
                      className="flex flex-wrap items-center justify-between gap-2 px-2.5 py-1.5 rounded bg-black/[0.04] border border-[#8c6b44]/25"
                    >
                      <div>
                        <strong>{order.quantity.toLocaleString()} {order.goodLabel}</strong>
                        <span className="text-[#6b4423]"> — tại {order.marketName}</span>
                      </div>
                      {order.status === 'awaiting_pickup' ? (
                        <button
                          type="button"
                          disabled={!effectiveFormationId}
                          onClick={() => handleDispatchPickup(order.districtId)}
                          className="px-2.5 py-1 rounded bg-[#b45309] hover:bg-[#92400e] text-[#fff3db] text-[11px] font-bold cursor-pointer disabled:opacity-40"
                        >
                          Cử Quân Đến Chợ Lấy Về
                        </button>
                      ) : (
                        <span className="text-[11px] font-bold text-[#15803d]">
                          Đang áp tải về bản doanh...
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-3 pt-2 border-t border-[#8c6b44]/30 text-[11px] text-[#6b4423] flex flex-wrap justify-between gap-2 shrink-0">
            <span>• Hàng chợ làm mới vào đầu mỗi tháng; chợ vùng Thanh Hóa không bán voi chiến.</span>
            <span>• Sau khi đặt mua, cần cử đạo quân tới chợ huyện để áp tải hàng về bản doanh; mua ngựa hoặc giao dịch lớn sẽ làm tăng độ nghi ngờ.</span>
          </div>
        </div>
      </div>
    </div>
  );
});

MarketModal.displayName = 'MarketModal';
