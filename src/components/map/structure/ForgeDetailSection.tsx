import React, { useState } from 'react';
import { useGameStore } from '../../../store/gameStore';
import { notify } from '../../../store/dialogStore';
import type { PlacedStructure, WeaponCraftType } from '../../../types';

const WEAPONS_CATALOG: {
  type: WeaponCraftType;
  name: string;
  cost: number;
  workDaysPerUnit: number;
}[] = [
  { type: 'sword', name: 'Kiếm', cost: 2.0, workDaysPerUnit: 1.8 },
  { type: 'bow', name: 'Cung', cost: 1.5, workDaysPerUnit: 1.4 },
  { type: 'spear', name: 'Giáo', cost: 1.0, workDaysPerUnit: 1.0 },
  { type: 'armor', name: 'Giáp', cost: 3.0, workDaysPerUnit: 2.2 },
];

interface ForgeDetailSectionProps {
  structure: PlacedStructure;
  liveStructure: PlacedStructure;
  maxAvailableSmiths: number;
}

export const ForgeDetailSection: React.FC<ForgeDetailSectionProps> = React.memo(({
  structure,
  liveStructure,
  maxAvailableSmiths,
}) => {
  const resources = useGameStore(state => state.resources);
  const startForgeOrder = useGameStore(state => state.startForgeOrder);
  const cancelForgeOrder = useGameStore(state => state.cancelForgeOrder);

  const [forgeTab, setForgeTab] = useState<'progress' | 'craft'>(
    liveStructure.activeOrder ? 'progress' : 'craft'
  );
  const [selectedWeaponType, setSelectedWeaponType] = useState<WeaponCraftType>('sword');
  const [craftQuantity, setCraftQuantity] = useState<number>(25);
  const [craftSmiths, setCraftSmiths] = useState<number>(5);

  const curWeapon = WEAPONS_CATALOG.find(w => w.type === selectedWeaponType) || WEAPONS_CATALOG[0];
  const totalGoldCost = Math.ceil(craftQuantity * curWeapon.cost);
  const estimatedDays = Math.max(4, Math.ceil((craftQuantity * curWeapon.workDaysPerUnit * 1.5) / Math.max(1, craftSmiths)));

  const handleStartForge = () => {
    const res = startForgeOrder(structure.id, {
      weaponType: selectedWeaponType,
      quantity: craftQuantity,
      smiths: craftSmiths,
    });
    if (res.success) {
      notify.success(res.message);
      setForgeTab('progress');
    } else {
      notify.error(res.message);
    }
  };

  return (
    <div className="space-y-3">
      {/* Thanh chuyển 2 Tab: Đang Rèn vs Đặt Rèn */}
      <div className="flex border-b border-[#8c6b44]/30 pb-1.5 gap-2">
        <button
          type="button"
          onClick={() => setForgeTab('progress')}
          className="relative group flex-1 py-1.5 min-h-[34px] flex items-center justify-center transition-transform hover:scale-[1.02] active:scale-98 cursor-pointer"
        >
          {forgeTab === 'progress' ? (
            <>
              <img
                src="/ink_stroke_red.png"
                alt="Vệt mực đỏ"
                className="absolute inset-0 w-full h-full object-fill pointer-events-none drop-shadow-[0_2px_3px_rgba(0,0,0,0.25)]"
              />
              <span className="relative z-10 text-xs font-serif font-black text-[#fcf4e4] tracking-wide flex items-center gap-1.5 drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]">
                Đang Rèn & Hàng Chờ
              </span>
            </>
          ) : (
            <span className="relative z-10 text-xs font-serif font-bold text-[#6b4a2e] hover:text-[#261304] transition-colors flex items-center gap-1.5">
              Đang Rèn & Hàng Chờ
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setForgeTab('craft')}
          className="relative group flex-1 py-1.5 min-h-[34px] flex items-center justify-center transition-transform hover:scale-[1.02] active:scale-98 cursor-pointer"
        >
          {forgeTab === 'craft' ? (
            <>
              <img
                src="/ink_stroke_red.png"
                alt="Vệt mực đỏ"
                className="absolute inset-0 w-full h-full object-fill pointer-events-none drop-shadow-[0_2px_3px_rgba(0,0,0,0.25)]"
              />
              <span className="relative z-10 text-xs font-serif font-black text-[#fcf4e4] tracking-wide flex items-center gap-1.5 drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]">
                Đặt Rèn
              </span>
            </>
          ) : (
            <span className="relative z-10 text-xs font-serif font-bold text-[#6b4a2e] hover:text-[#261304] transition-colors flex items-center gap-1.5">
              Đặt Rèn
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: ĐANG RÈN & HÀNG CHỜ */}
      {forgeTab === 'progress' && (
        <div className="space-y-2 text-xs text-[#2a1708]">
          {liveStructure.activeOrder ? (
            <div className="p-3 rounded bg-black/[0.04] border border-[#8c6b44]/25 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#8c2d19] text-sm">
                  Đang đúc: {liveStructure.activeOrder.name}
                </span>
                <span className="font-mono font-bold text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">
                  {liveStructure.activeOrder.quantity} món
                </span>
              </div>

              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-[11px] text-[#5c3e23]">
                  <span>Tiến độ đúc:</span>
                  <span className="font-mono font-bold">
                    Còn {liveStructure.activeOrder.remainingDays}/{liveStructure.activeOrder.totalDays} ngày
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-black/10 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-600 to-red-600 transition-all duration-300"
                    style={{
                      width: `${Math.round(((liveStructure.activeOrder.totalDays - liveStructure.activeOrder.remainingDays) / liveStructure.activeOrder.totalDays) * 100)}%`
                    }}
                  />
                </div>
              </div>

              <div className="flex justify-between items-center text-[11px] text-[#5c3e23] pt-1">
                <span>Thợ rèn tham gia:</span>
                <span className="font-bold text-[#261304]">
                  {liveStructure.activeOrder.assignedSmiths} thợ rèn
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  notify.confirm({
                    title: 'Hủy Mẻ Rèn Khí Giới',
                    message: 'Bạn có chắc chắn muốn hủy đơn đúc này? Bạn sẽ chỉ thu hồi 50% vàng chi phí.',
                    confirmText: 'Hủy Mẻ Rèn',
                    cancelText: 'Tiếp Tục Rèn',
                    onConfirm: () => {
                      cancelForgeOrder(structure.id);
                      notify.info('Đã hủy mẻ rèn và hoàn trả 50% vàng.');
                    },
                  });
                }}
                className="relative group w-full py-1.5 min-h-[30px] flex items-center justify-center transition-transform hover:scale-[1.02] active:scale-95 cursor-pointer mt-2"
              >
                <img
                  src="/ink_stroke_red.png"
                  alt="Vệt mực đỏ"
                  className="absolute inset-0 w-full h-full object-fill pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)] opacity-90 group-hover:opacity-100 transition-opacity"
                />
                <span className="relative z-10 text-[#fcf4e4] font-serif font-bold text-xs tracking-wide">
                  Hủy Mẻ Rèn (Hoàn 50% Vàng)
                </span>
              </button>
            </div>
          ) : (
            <div className="p-4 rounded bg-black/[0.04] border border-[#8c6b44]/25 text-center text-[#704d2e] italic">
              Lò rèn hiện đang tắt lửa. Hãy chuyển sang tab "Đặt Rèn" bên cạnh để bắt đầu đúc binh khí!
            </div>
          )}

          {/* Hàng chờ các mẻ rèn tiếp theo */}
          <div className="space-y-1.5 pt-1">
            <span className="font-bold text-xs text-[#5c3e23] uppercase tracking-wider">
              Hàng Chờ Đúc ({liveStructure.forgeQueue?.length || 0})
            </span>

            {liveStructure.forgeQueue && liveStructure.forgeQueue.length > 0 ? (
              <div className="space-y-1">
                {liveStructure.forgeQueue.map((item, idx) => (
                  <div key={item.id} className="p-2 rounded bg-black/[0.03] border border-[#8c6b44]/20 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-[#261304]">
                        #{idx + 1}. {item.name}
                      </span>
                      <div className="text-[10px] text-[#704d2e]">
                        {item.quantity} món • Cần {item.totalDays} ngày
                      </div>
                    </div>
                    <div className="flex items-center gap-1 font-mono text-xs font-bold text-[#8c2d19]">
                      <img src="/icons/gold.png" alt="Vàng" className="w-7 h-7 object-contain inline-block filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]" />
                      <span>{item.goldCost}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-[#704d2e] italic">
                Chưa có mẻ rèn nào trong hàng chờ.
              </p>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ĐẶT RÈN */}
      {forgeTab === 'craft' && (
        <div className="space-y-2.5 text-xs text-[#2a1708]">
          <div className="grid grid-cols-2 gap-2">
            {WEAPONS_CATALOG.map(w => {
              const isSel = selectedWeaponType === w.type;
              return (
                <button
                  key={w.type}
                  type="button"
                  onClick={() => setSelectedWeaponType(w.type)}
                  className={`relative group px-4 py-2 min-h-[44px] flex items-center justify-between transition-transform hover:scale-[1.02] active:scale-98 cursor-pointer rounded ${
                    isSel ? '' : 'border border-[#8c6b44]/20 hover:border-[#8c6b44]/40 hover:bg-black/[0.03]'
                  }`}
                >
                  {isSel && (
                    <img
                      src="/ink_stroke_1.png"
                      alt="Vệt mực chọn"
                      className="absolute inset-0 w-full h-full object-fill pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]"
                    />
                  )}
                  <span className={`font-serif font-black text-sm relative z-10 tracking-wide transition-colors ${
                    isSel ? 'text-[#fff5ea] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]' : 'text-[#261304]'
                  }`}>
                    {w.name}
                  </span>

                  <div className={`flex items-center gap-1.5 relative z-10 font-mono font-bold text-sm transition-colors ${
                    isSel ? 'text-[#ffea9f]' : 'text-[#8c2d19]'
                  }`}>
                    <img 
                      src={isSel ? "/icons/gold_light.png" : "/icons/gold.png"} 
                      alt="Vàng" 
                      className={`w-7 h-7 object-contain inline-block translate-y-[2.5px] ${
                        isSel 
                          ? 'filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]' 
                          : 'filter drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)]'
                      }`}
                    />
                    <span className={`leading-none ${isSel ? 'drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]' : ''}`}>
                      {w.cost}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Tùy chỉnh Số Lượng */}
          <div className="p-2.5 rounded bg-black/[0.04] border border-[#8c6b44]/25 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-[#5c3e23] font-bold">Số lượng đặt rèn:</span>
              <span className="font-mono font-bold text-sm text-[#8c2d19]">
                {craftQuantity} món
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {[10, 25, 50, 100].map(q => {
                const isChosen = craftQuantity === q;
                return (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setCraftQuantity(q)}
                    className="relative group flex-1 py-1 min-h-[28px] flex items-center justify-center transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                  >
                    {isChosen ? (
                      <>
                        <img
                          src="/ink_stroke_red.png"
                          alt="Vệt mực đỏ"
                          className="absolute inset-0 w-full h-full object-fill pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]"
                        />
                        <span className="relative z-10 text-xs font-serif font-black text-[#fcf4e4] drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
                          {q}
                        </span>
                      </>
                    ) : (
                      <span className="relative z-10 text-xs font-serif font-bold text-[#3d2714] hover:text-[#8c2d19] transition-colors">
                        {q}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tùy chỉnh Thợ Rèn Điều Động */}
          <div className="p-2.5 rounded bg-black/[0.04] border border-[#8c6b44]/25 space-y-1.5">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-[#5c3e23] font-bold">Thợ rèn điều động: </span>
                <span className="text-[10px] text-[#704d2e]">(Rảnh rỗi: {maxAvailableSmiths})</span>
              </div>
              <span className="font-mono font-bold text-sm text-[#261304]">
                {craftSmiths} thợ
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={15}
              value={craftSmiths}
              onChange={(e) => setCraftSmiths(parseInt(e.target.value) || 1)}
              className="w-full accent-[#8c2d19] cursor-pointer"
            />
          </div>

          {/* Tóm tắt chi phí & thời gian */}
          <div className="flex justify-between items-center px-1 text-xs">
            <div>
              <span className="text-[#5c3e23]">Cần: </span>
              <img src="/icons/gold.png" alt="Vàng" className="w-7 h-7 object-contain inline-block mx-0.5 filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]" />
              <span className="font-mono font-bold text-[#8c2d19]">{totalGoldCost}</span>
              <span className="text-[#704d2e] text-[10px]"> (Có {Math.floor(resources.gold)})</span>
            </div>
            <div>
              <span className="text-[#5c3e23]">Thời gian: </span>
              <span className="font-mono font-bold text-[#261304]">{estimatedDays} ngày</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleStartForge}
            disabled={resources.gold < totalGoldCost}
            className="relative group w-full py-2 min-h-[42px] flex items-center justify-center transition-transform hover:scale-[1.02] active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            <img
              src="/ink_stroke_red.png"
              alt="Vệt mực đỏ"
              className="absolute inset-0 w-full h-full object-fill pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)] group-hover:brightness-110 transition-all"
            />
            <span className="relative z-10 font-serif font-bold text-sm text-[#fcf4e4] flex items-center justify-center gap-2 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              <span>
                {liveStructure.activeOrder ? 'Xếp Thêm Vào Hàng Chờ' : 'Bắt Đầu Nổi Lửa Rèn'}
              </span>
            </span>
          </button>
        </div>
      )}
    </div>
  );
});

ForgeDetailSection.displayName = 'ForgeDetailSection';
