import React from 'react';
import { X, MapPin, Hammer, Swords } from 'lucide-react';
import { useGameStore } from '../../../store/gameStore';
import { useUIStore } from '../../../store/uiStore';

export const ForgesOverviewModal: React.FC = React.memo(() => {
  const activeModal = useUIStore(state => state.activeModal);
  const setActiveModal = useUIStore(state => state.setActiveModal);
  const setFlyToTarget = useUIStore(state => state.setFlyToTarget);
  const toggleBuildPaper = useUIStore(state => state.toggleBuildPaper);
  const setActiveForgeModalStructureId = useUIStore(state => state.setActiveForgeModalStructureId);

  const structures = useGameStore(state => state.structures);

  if (activeModal !== 'forges') return null;

  const forgeStructures = structures.filter(s => s.type === 'forge');
  const activeOrdersCount = forgeStructures.filter(s => s.activeOrder).length;

  return (
    <div 
      className="fixed inset-x-3 bottom-3 md:inset-auto md:absolute md:top-[82px] md:left-[98px] z-40 md:w-[450px] max-h-[82vh] flex flex-col pointer-events-auto transition-all duration-300 select-none filter drop-shadow-[0_18px_30px_rgba(0,0,0,0.7)] drop-shadow-[0_3px_8px_rgba(0,0,0,0.45)]"
    >
      <img
        src="/parchment_torn_panel.png"
        alt="Bảng Tổng Quản Lò Rèn"
        className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none z-0"
        draggable={false}
      />

      <div className="relative z-10 p-5 md:p-6 flex flex-col h-full font-serif text-[#261304] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#8c6b44]/35 pb-2.5 mb-3 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#8c2d19]/15 flex items-center justify-center text-[#8c2d19] border border-[#8c6b44]/40">
                <Hammer size={18} />
              </div>
              <div>
                <h3 className="font-serif font-black text-lg text-[#261304] leading-tight">
                  Tổng Quản Lò Rèn Binh Khí
                </h3>
                <p className="text-[11px] text-[#704d2e] font-sans">
                  Chế tác gươm giáo, cung nỏ và thiết giáp cho nghĩa quân Lam Sơn
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveModal(null)}
              className="text-[#6e4927] hover:text-[#261304] transition p-1 hover:bg-[#8c6b44]/15 rounded cursor-pointer"
              title="Đóng bảng"
            >
              <X size={20} />
            </button>
          </div>

          {/* Banner Thống kê */}
          <div className="flex items-center justify-between mb-3 p-2.5 rounded bg-black/[0.04] border border-[#8c6b44]/25 shrink-0 text-xs">
            <div>
              <span className="text-[#5c3e23]">Quy mô bễ đúc: </span>
              <strong className="text-[#8c2d19] font-bold">{forgeStructures.length} lò rèn</strong>
            </div>
            <div>
              <span className="text-[#5c3e23]">Lò đang đỏ lửa: </span>
              <strong className="text-[#15803d] font-bold">{activeOrdersCount} / {forgeStructures.length}</strong>
            </div>
          </div>

          {/* Danh Sách Các Lò Rèn */}
          <div className="flex-1 overflow-y-auto no-scrollbar space-y-2.5 pr-1">
            {forgeStructures.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#704d2e] italic">
                Chưa có lò rèn nào được dựng. Hãy bấm Dựng Lò Rèn Mới bên dưới để rèn binh khí!
              </div>
            ) : (
              forgeStructures.map(forge => {
                const isBuilding = forge.status === 'building';
                const order = forge.activeOrder;

                return (
                  <div
                    key={forge.id}
                    className="p-3 rounded-lg border border-[#8c6b44]/30 bg-[#8c6b44]/5 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#8c2d19]">{forge.name}</span>
                        {isBuilding ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-800 font-bold">
                            Đang dựng lò (còn {Math.ceil(forge.buildDaysRemaining)} ngày)
                          </span>
                        ) : order ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-600/15 text-red-800 font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                            Đang đúc: {order.name} ({order.quantity} chiếc, còn {order.remainingDays} ngày)
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-stone-500/15 text-stone-700 font-bold">
                            Bễ lò rảnh rỗi
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-[#704d2e]">
                        Địa hình: {forge.terrain === 'mountain' ? 'Hẻm núi hiểm trở (giảm tiếng ồn)' : forge.terrain === 'forest' ? 'Khuất trong rừng sâu' : 'Đồng bằng'}
                        {order && ` • Điều động ${order.assignedSmiths} thợ rèn`}
                        {forge.forgeQueue && forge.forgeQueue.length > 0 && ` • ${forge.forgeQueue.length} mẻ trong hàng chờ`}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {!isBuilding && (
                        <button
                          onClick={() => {
                            setActiveForgeModalStructureId(forge.id);
                            setActiveModal(null);
                          }}
                          className="px-2.5 py-1 rounded bg-[#8c2d19]/15 hover:bg-[#8c2d19]/25 text-[#8c2d19] border border-[#8c6b44]/40 font-bold text-xs transition cursor-pointer flex items-center gap-1"
                        >
                          <Swords size={12} />
                          <span>{order ? 'Xem Lò' : 'Hạ Lệnh Rèn'}</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setFlyToTarget({ x: forge.x, y: forge.y });
                          setActiveModal(null);
                        }}
                        className="p-1.5 rounded hover:bg-[#8c6b44]/20 text-[#5c3e23] hover:text-[#8c2d19] transition cursor-pointer"
                        title="Định vị lò rèn này trên bản đồ"
                      >
                        <MapPin size={16} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-[#8c6b44]/30 mt-2 flex items-center justify-between shrink-0">
            <span className="text-[11px] text-[#704d2e] italic">
              * Rèn đúc phát ra tiếng đe búa thu hút giặc Minh; lò ở núi rừng giúp che giấu tốt hơn.
            </span>
            <button
              onClick={() => {
                setActiveModal(null);
                toggleBuildPaper();
              }}
              className="relative group px-4 py-1.5 flex items-center justify-center cursor-pointer transition-transform hover:scale-105 active:scale-95"
            >
              <img
                src="/ink_stroke_red.png"
                alt="Dựng lò mới"
                className="absolute inset-0 w-full h-full object-fill pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]"
              />
              <span className="relative z-10 text-[#fcf4e4] font-serif font-black text-xs drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                + Dựng Lò Rèn Mới
              </span>
            </button>
          </div>
        </div>
      </div>
  );
});

ForgesOverviewModal.displayName = 'ForgesOverviewModal';
