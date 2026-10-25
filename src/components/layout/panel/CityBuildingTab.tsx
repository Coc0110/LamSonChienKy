import React, { useState } from 'react';
import {
  Wheat,
  Hammer,
  Eye,
  Coins,
  ShieldCheck,
  AlertTriangle,
  Move,
  Flame,
  Clock,
  Plus,
  Minus,
  Sparkles,
  ArrowRightLeft,
} from 'lucide-react';
import type { CityNode, PlacedStructure } from '../../../types';
import { useGameStore } from '../../../store/gameStore';
import { useUIStore } from '../../../store/uiStore';
import { ForgeOrderModal } from './ForgeOrderModal';

interface CityBuildingTabProps {
  city: CityNode;
  goldAvailable: number;
  suspicion: number;
  onBribe: () => void;
}

export const CityBuildingTab: React.FC<CityBuildingTabProps> = ({
  city,
  goldAvailable,
  suspicion,
  onBribe,
}) => {
  const structures = useGameStore(state => state.structures);
  const foodAvailable = useGameStore(state => state.resources.food);
  const assignFarmWorkers = useGameStore(state => state.assignFarmWorkers);
  const cancelForgeOrder = useGameStore(state => state.cancelForgeOrder);
  const tradeFoodForGold = useGameStore(state => state.tradeFoodForGold);

  const placementMode = useUIStore(state => state.placementMode);
  const setPlacementMode = useUIStore(state => state.setPlacementMode);

  const [activeForgeForOrder, setActiveForgeForOrder] = useState<PlacedStructure | null>(null);
  const [tradeMessage, setTradeMessage] = useState<string | null>(null);

  const pop = city.population || {
    combatTroops: city.troops,
    idleLaborers: 0,
    farmLaborers: 0,
    forgeLaborers: 0,
    swappedCombatants: 0,
    unfitPopulation: 0,
  };

  const cityStructures = structures.filter(s => s.cityId === city.id);
  const farms = cityStructures.filter(s => s.type === 'farm');
  const forges = cityStructures.filter(s => s.type === 'forge');

  const isSuspicionHigh = suspicion >= 75;

  const handleStartPlacement = (type: 'farm' | 'forge') => {
    if (placementMode && placementMode.type === type) {
      setPlacementMode(null);
    } else {
      setPlacementMode({ type, cityId: city.id });
    }
  };

  const handleDragStart = (e: React.DragEvent, type: 'farm' | 'forge') => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ type, cityId: city.id }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleTrade = (amount: number) => {
    const res = tradeFoodForGold(amount);
    setTradeMessage(res.message);
    setTimeout(() => setTradeMessage(null), 4000);
  };

  return (
    <div className="space-y-3 font-sans pb-4">
      
      {/* 1. MỨC ĐỘ CẢNH GIÁC CỦA GIẶC MINH & ĐÚT LÓT */}
      <div className={`p-3 rounded-xl border shadow-md space-y-2 transition-colors ${
        isSuspicionHigh 
          ? 'bg-red-950/70 border-red-500/80' 
          : 'bg-[#29170b] border-[#8a5d35]'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold">
            <Eye size={15} className={isSuspicionHigh ? 'text-red-400 animate-pulse' : 'text-amber-400'} />
            <span className={isSuspicionHigh ? 'text-red-300' : 'text-amber-200'}>
              Cảnh Giác Giặc Minh: <strong className="text-sm font-black">{suspicion.toFixed(0)}%</strong>
            </span>
          </div>

          <button
            onClick={onBribe}
            disabled={goldAvailable < 100}
            className={`px-2.5 py-1 rounded font-bold text-[11px] flex items-center gap-1 shadow transition cursor-pointer ${
              goldAvailable < 100
                ? 'bg-stone-700 text-stone-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-900'
            }`}
            title="Dùng 100 Vàng cống nạp quan tướng giặc Minh để hạ 25% nghi ngờ"
          >
            <Coins size={13} />
            <span>Đút Lót (100 V)</span>
          </button>
        </div>

        {/* Thanh gauge tiến độ nghi ngờ */}
        <div className="w-full h-2 rounded-full bg-stone-900 overflow-hidden border border-stone-700">
          <div
            className={`h-full transition-all duration-300 ${
              suspicion > 75 
                ? 'bg-red-600 animate-pulse' 
                : suspicion > 50 
                ? 'bg-amber-500' 
                : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.min(100, suspicion)}%` }}
          />
        </div>

        <p className="text-[11px] text-stone-300 leading-tight">
          {city.type === 'camp' || city.type === 'chokepoint' ? (
            <span className="text-emerald-400 flex items-center gap-1">
              <ShieldCheck size={12} /> Căn cứ rừng núi giúp tiêu âm, giảm nghi ngờ khi rèn đúc và thao luyện.
            </span>
          ) : (
            <span className="text-amber-400/90 flex items-center gap-1">
              <AlertTriangle size={12} /> Đồng bằng quang đãng: cày ruộng an toàn, nhưng rèn đúc sẽ gây chú ý mạnh!
            </span>
          )}
        </p>
      </div>

      {/* 2. GIAO THƯƠNG QUÂN LƯƠNG ĐỔI NGÂN KHỐ (VÀNG) */}
      <div className="p-3 rounded-xl bg-[#24150a] border border-[#6d421e] shadow-xs space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-200">
            <ArrowRightLeft size={14} className="text-amber-400" />
            <span>Giao Thương Xuất Bán Thóc Lúa (100 L = 15 V)</span>
          </div>
          <span className="text-[11px] font-mono text-emerald-400 font-bold">
            Kho Lương: {foodAvailable.toLocaleString()}
          </span>
        </div>

        <div className="flex items-center gap-1.5 pt-0.5">
          <button
            onClick={() => handleTrade(100)}
            disabled={foodAvailable < 100}
            className="flex-1 py-1 rounded bg-[#3d2311] hover:bg-[#523018] disabled:bg-stone-800 disabled:text-stone-500 text-[11px] font-bold text-amber-300 border border-[#8a5d35]/60 transition cursor-pointer"
          >
            Đổi 100 L → 15 V
          </button>
          <button
            onClick={() => handleTrade(300)}
            disabled={foodAvailable < 300}
            className="flex-1 py-1 rounded bg-[#3d2311] hover:bg-[#523018] disabled:bg-stone-800 disabled:text-stone-500 text-[11px] font-bold text-amber-300 border border-[#8a5d35]/60 transition cursor-pointer"
          >
            Đổi 300 L → 45 V
          </button>
          <button
            onClick={() => handleTrade(500)}
            disabled={foodAvailable < 500}
            className="flex-1 py-1 rounded bg-[#3d2311] hover:bg-[#523018] disabled:bg-stone-800 disabled:text-stone-500 text-[11px] font-bold text-amber-300 border border-[#8a5d35]/60 transition cursor-pointer"
          >
            Đổi 500 L → 75 V
          </button>
        </div>

        {tradeMessage && (
          <div className="text-[11px] text-amber-300 bg-amber-950/60 border border-amber-600/50 rounded p-1.5 text-center animate-in fade-in">
            {tradeMessage}
          </div>
        )}
      </div>

      {/* 3. BẢNG CÔNG CỤ KÉO THẢ XÂY DỰNG LÊN BẢN ĐỒ */}
      <div className="p-3 rounded-xl bg-[#2e1c0f] border border-[#7a4c25] shadow-xs space-y-2.5">
        <div className="flex items-center justify-between text-xs font-bold text-[#f5ebd7]">
          <span className="flex items-center gap-1.5">
            <Move size={14} className="text-amber-400" />
            <span>Kéo Thả Công Trình Đặt Lên Bản Đồ</span>
          </span>
          <span className="text-[10px] text-stone-400 font-normal">
            Tráng phu rảnh: <strong className="text-sky-300">{pop.idleLaborers}</strong>
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          
          {/* Card Ruộng */}
          <div
            draggable
            onDragStart={(e) => handleDragStart(e, 'farm')}
            className={`p-2.5 rounded-xl border transition cursor-grab active:cursor-grabbing select-none flex flex-col justify-between ${
              placementMode?.type === 'farm'
                ? 'bg-amber-950/90 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                : 'bg-[#3b2313] border-[#8a5d35] hover:border-amber-500'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="w-7 h-7 rounded-lg bg-amber-900/60 border border-amber-600 flex items-center justify-center text-amber-300 text-sm">
                  🌾
                </span>
                <span className="text-[10px] font-mono text-amber-300 font-bold">80 Vàng</span>
              </div>
              <div className="font-serif font-black text-xs text-[#f5ebd7] mt-1.5">Ruộng Lúa Nước</div>
              <div className="text-[10px] text-stone-300 leading-tight mt-0.5">
                Chỉ đặt ở <strong>Đồng Bằng</strong>. 10 thợ xây trong 12 ngày.
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleStartPlacement('farm')}
              className={`mt-2 py-1 px-2 rounded text-[10px] font-bold text-center transition cursor-pointer ${
                placementMode?.type === 'farm'
                  ? 'bg-amber-500 text-stone-950'
                  : 'bg-[#29170b] hover:bg-[#4a2b16] text-amber-300 border border-[#8a5d35]'
              }`}
            >
              {placementMode?.type === 'farm' ? 'Đang chọn vị trí...' : 'Kéo hoặc Bấm đặt'}
            </button>
          </div>

          {/* Card Lò Rèn */}
          <div
            draggable
            onDragStart={(e) => handleDragStart(e, 'forge')}
            className={`p-2.5 rounded-xl border transition cursor-grab active:cursor-grabbing select-none flex flex-col justify-between ${
              placementMode?.type === 'forge'
                ? 'bg-sky-950/90 border-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.5)]'
                : 'bg-[#3b2313] border-[#8a5d35] hover:border-sky-500'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="w-7 h-7 rounded-lg bg-sky-950 border border-sky-600 flex items-center justify-center text-sky-300 text-sm">
                  ⚒️
                </span>
                <span className="text-[10px] font-mono text-sky-300 font-bold">120 Vàng</span>
              </div>
              <div className="font-serif font-black text-xs text-[#f5ebd7] mt-1.5">Lò Rèn Bí Mật</div>
              <div className="text-[10px] text-stone-300 leading-tight mt-0.5">
                Nên đặt ở <strong>Rừng / Núi</strong>. 15 thợ xây trong 18 ngày.
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleStartPlacement('forge')}
              className={`mt-2 py-1 px-2 rounded text-[10px] font-bold text-center transition cursor-pointer ${
                placementMode?.type === 'forge'
                  ? 'bg-sky-500 text-stone-950'
                  : 'bg-[#29170b] hover:bg-[#4a2b16] text-sky-300 border border-[#8a5d35]'
              }`}
            >
              {placementMode?.type === 'forge' ? 'Đang chọn vị trí...' : 'Kéo hoặc Bấm đặt'}
            </button>
          </div>
        </div>

        {placementMode && (
          <div className="p-2 rounded bg-amber-950/80 border border-amber-500 text-[11px] text-amber-200 flex items-center justify-between animate-pulse">
            <span>👉 Hãy nhấp chuột hoặc kéo thả lên vị trí mong muốn trên bản đồ!</span>
            <button
              onClick={() => setPlacementMode(null)}
              className="text-[10px] px-1.5 py-0.5 rounded bg-stone-800 text-stone-300 hover:text-white cursor-pointer"
            >
              Hủy
            </button>
          </div>
        )}
      </div>

      {/* 4. DANH SÁCH ĐỒN ĐIỀN RUỘNG LÚA CỦA CỨ ĐIỂM */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-amber-300">
          <span className="flex items-center gap-1.5">
            <Wheat size={14} />
            <span>Đồn Điền Ruộng Lúa ({farms.length} khu)</span>
          </span>
          <span className="text-[10px] text-stone-400">Thu hoạch theo vụ (90 ngày)</span>
        </div>

        {farms.length === 0 ? (
          <div className="p-3 rounded-xl bg-[#24150a] border border-dashed border-[#6d421e] text-center text-xs text-stone-400">
            Chưa có đồn điền nào. Hãy kéo icon Ruộng lúa ở trên thả vào vùng đồng bằng!
          </div>
        ) : (
          farms.map((farm) => {
            const isBuilding = farm.status === 'building';
            const cropPercent = Math.min(100, Math.round((farm.cropDays / farm.cropCycleDays) * 100));
            const estimatedYield = Math.round(farm.assignedWorkers * 90 * 0.22);

            return (
              <div
                key={farm.id}
                className="p-3 rounded-xl bg-[#29170b] border border-[#7a4c25] shadow-xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{isBuilding ? '🚧' : '🌾'}</span>
                    <div>
                      <div className="font-serif font-black text-xs text-[#f5ebd7] flex items-center gap-1.5">
                        <span>{farm.name}</span>
                        <span className="text-[9px] px-1 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800">
                          {farm.terrain}
                        </span>
                      </div>
                      <div className="text-[10px] text-stone-400">
                        {isBuilding ? (
                          <span className="text-amber-400">Đang khai hoang: còn {farm.buildDaysRemaining} ngày</span>
                        ) : (
                          <span>Vụ lúa: {farm.cropDays}/{farm.cropCycleDays} ngày ({cropPercent}%)</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Nút tăng/giảm nông đinh */}
                  {!isBuilding && (
                    <div className="flex items-center gap-1 bg-[#1c0f07] px-2 py-1 rounded-lg border border-[#7a4c25]">
                      <button
                        onClick={() => assignFarmWorkers(farm.id, -1)}
                        disabled={farm.assignedWorkers <= 0}
                        className="w-5 h-5 rounded bg-[#3d2311] hover:bg-[#523018] disabled:opacity-30 text-amber-300 flex items-center justify-center cursor-pointer"
                        title="Bớt 1 nông đinh"
                      >
                        <Minus size={10} />
                      </button>
                      <span className="font-mono text-xs font-bold text-amber-300 px-1">
                        {farm.assignedWorkers}/{farm.maxWorkers}
                      </span>
                      <button
                        onClick={() => assignFarmWorkers(farm.id, 1)}
                        disabled={farm.assignedWorkers >= farm.maxWorkers || pop.idleLaborers <= 0}
                        className="w-5 h-5 rounded bg-[#3d2311] hover:bg-[#523018] disabled:opacity-30 text-amber-300 flex items-center justify-center cursor-pointer"
                        title="Cử thêm 1 nông đinh từ tráng phu rảnh rỗi"
                      >
                        <Plus size={10} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Thanh tiến độ mùa vụ hoặc xây dựng */}
                <div className="w-full h-1.5 rounded-full bg-stone-900 overflow-hidden border border-stone-800">
                  <div
                    className={`h-full transition-all duration-300 ${
                      isBuilding ? 'bg-amber-600' : 'bg-emerald-500'
                    }`}
                    style={{
                      width: isBuilding
                        ? `${Math.round(((farm.buildDaysTotal - farm.buildDaysRemaining) / farm.buildDaysTotal) * 100)}%`
                        : `${cropPercent}%`,
                    }}
                  />
                </div>

                {!isBuilding && (
                  <div className="flex items-center justify-between text-[10px] text-stone-400">
                    <span>{farm.assignedWorkers > 0 ? 'Đang chăm sóc lúa nước' : 'Đang bỏ hoang, cần cử người cày'}</span>
                    <span className="text-emerald-400 font-bold">
                      Dự kiến gặt: +{estimatedYield} lương
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 5. DANH SÁCH LÒ RÈN VŨ KHÍ CỦA CỨ ĐIỂM */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-sky-300">
          <span className="flex items-center gap-1.5">
            <Hammer size={14} />
            <span>Lò Rèn Binh Khí ({forges.length} lò)</span>
          </span>
          <span className="text-[10px] text-stone-400">Chỉ rèn theo lệnh mẻ</span>
        </div>

        {forges.length === 0 ? (
          <div className="p-3 rounded-xl bg-[#24150a] border border-dashed border-[#6d421e] text-center text-xs text-stone-400">
            Chưa có lò rèn nào. Hãy kéo icon Lò rèn ở trên thả vào vùng rừng núi!
          </div>
        ) : (
          forges.map((forge) => {
            const isBuilding = forge.status === 'building';
            const order = forge.activeOrder;

            return (
              <div
                key={forge.id}
                className="p-3 rounded-xl bg-[#29170b] border border-[#7a4c25] shadow-xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{isBuilding ? '🚧' : order ? '🔥' : '⚒️'}</span>
                    <div>
                      <div className="font-serif font-black text-xs text-[#f5ebd7] flex items-center gap-1.5">
                        <span>{forge.name}</span>
                        <span className="text-[9px] px-1 py-0.2 rounded bg-sky-950 text-sky-300 border border-sky-800">
                          {forge.terrain}
                        </span>
                      </div>
                      <div className="text-[10px] text-stone-400">
                        {isBuilding ? (
                          <span className="text-amber-400">Đang dựng lò: còn {forge.buildDaysRemaining} ngày</span>
                        ) : order ? (
                          <span className="text-orange-400 font-bold flex items-center gap-1">
                            <Flame size={11} /> Đang đúc {order.quantity} {order.name} ({order.remainingDays}/{order.totalDays} ngày)
                          </span>
                        ) : (
                          <span className="text-stone-400">Lò rảnh rỗi - Sẵn sàng đúc</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {!isBuilding && !order && (
                    <button
                      onClick={() => setActiveForgeForOrder(forge)}
                      className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-sky-700 to-sky-600 hover:from-sky-600 hover:to-sky-500 text-stone-900 font-bold text-[11px] shadow transition cursor-pointer flex items-center gap-1"
                    >
                      <Sparkles size={12} />
                      <span>Đặt Mẻ Rèn</span>
                    </button>
                  )}

                  {!isBuilding && order && (
                    <button
                      onClick={() => cancelForgeOrder(forge.id)}
                      className="px-2 py-0.5 rounded bg-stone-800 hover:bg-red-950 text-stone-400 hover:text-red-300 text-[10px] border border-stone-700 transition cursor-pointer"
                    >
                      Hủy mẻ
                    </button>
                  )}
                </div>

                {/* Thanh tiến độ */}
                {isBuilding && (
                  <div className="w-full h-1.5 rounded-full bg-stone-900 overflow-hidden border border-stone-800">
                    <div
                      className="h-full bg-amber-600 transition-all duration-300"
                      style={{
                        width: `${Math.round(((forge.buildDaysTotal - forge.buildDaysRemaining) / forge.buildDaysTotal) * 100)}%`,
                      }}
                    />
                  </div>
                )}

                {order && (
                  <div className="space-y-1">
                    <div className="w-full h-1.5 rounded-full bg-stone-900 overflow-hidden border border-stone-800">
                      <div
                        className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-300"
                        style={{
                          width: `${Math.round(((order.totalDays - order.remainingDays) / order.totalDays) * 100)}%`,
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-stone-400">
                      <span className="flex items-center gap-1">
                        <Clock size={11} className="text-amber-400" />
                        Còn {order.remainingDays} ngày nữa bàn giao
                      </span>
                      <span className="text-sky-300 font-bold">
                        {order.assignedSmiths} thợ rèn đang làm
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal đặt mẻ rèn */}
      {activeForgeForOrder && (
        <ForgeOrderModal
          structure={activeForgeForOrder}
          idleLaborers={pop.idleLaborers}
          goldAvailable={goldAvailable}
          onClose={() => setActiveForgeForOrder(null)}
        />
      )}
    </div>
  );
};
