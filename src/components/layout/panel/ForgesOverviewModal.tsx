import React from 'react';
import { X } from 'lucide-react';
import { useGameStore } from '../../../store/gameStore';
import { useUIStore } from '../../../store/uiStore';
import { UI_TEXT } from '../../../data/uiText';
import { formatRemainingDays } from '../../../utils/formatters';

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
            <h3 className="font-serif font-black text-lg text-[#261304] leading-tight tracking-wide">
              {UI_TEXT.forgesPanel.title}
            </h3>

            <button
              onClick={() => setActiveModal(null)}
              className="text-[#6e4927] hover:text-[#261304] transition p-1 hover:bg-[#8c6b44]/15 rounded cursor-pointer"
              title="Đóng bảng"
            >
              <X size={20} />
            </button>
          </div>

          {/* Banner Thống kê (Xếp hàng tuần tự theo dòng dọc, không chia cột) */}
          <div className="flex flex-col gap-1.5 mb-3 p-2.5 rounded bg-black/[0.04] border border-[#8c6b44]/25 shrink-0 text-xs font-serif">
            <div className="flex items-center justify-between">
              <span className="text-[#5c3e23]">{UI_TEXT.forgesPanel.stats.totalForges}</span>
              <strong className="text-[#8c2d19] font-bold">{forgeStructures.length} lò rèn</strong>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-[#8c6b44]/15">
              <span className="text-[#5c3e23]">{UI_TEXT.forgesPanel.stats.activeForging}</span>
              <strong className="text-[#15803d] font-bold">{activeOrdersCount} / {forgeStructures.length}</strong>
            </div>
          </div>

          {/* Danh Sách Các Lò Rèn */}
          <div className="flex-1 overflow-y-auto no-scrollbar space-y-2.5 pr-1">
            {forgeStructures.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#704d2e] italic">
                {UI_TEXT.forgesPanel.emptyText}
              </div>
            ) : (
              forgeStructures.map(forge => {
                const isBuilding = forge.status === 'building';
                const order = forge.activeOrder;

                return (
                  <div
                    key={forge.id}
                    className="p-3 rounded-lg border border-[#8c6b44]/30 bg-[#8c6b44]/5 flex flex-col gap-2 font-serif text-xs"
                  >
                    {/* Đầu mục: Tên lò rèn */}
                    <div className="flex items-center justify-between border-b border-[#8c6b44]/20 pb-1.5">
                      <h4 className="font-serif font-black text-sm text-[#8c2d19] tracking-wide">
                        {forge.name}
                      </h4>
                    </div>

                    {/* Danh sách thông tin báo cáo: mỗi thông tin một dòng, không có icon */}
                    <ul className="space-y-1.5 text-xs text-[#261304] border-l-2 border-[#8c2d19]/40 pl-3 py-0.5">
                      <li>
                        <span className="text-[#6b4423]">Tình trạng: </span>
                        {isBuilding ? (
                          <strong className="text-amber-800 font-bold">
                            Đang dựng lò (còn {Math.ceil(forge.buildDaysRemaining)} ngày)
                          </strong>
                        ) : order ? (
                          <strong className="text-[#8c2d19] font-bold">
                            Đang đúc {order.name} ({order.quantity} chiếc, còn {formatRemainingDays(order.remainingDays)} ngày)
                          </strong>
                        ) : (
                          <span className="text-[#704d2e] italic">
                            Bễ lò rảnh rỗi
                          </span>
                        )}
                      </li>
                      <li>
                        <span className="text-[#6b4423]">Địa hình: </span>
                        <span className="text-[#261304]">
                          {forge.terrain === 'mountain' ? 'Hẻm núi hiểm trở (giảm tiếng ồn)' : forge.terrain === 'forest' ? 'Khuất trong rừng sâu' : 'Đồng bằng'}
                        </span>
                      </li>
                      {order && (
                        <li>
                          <span className="text-[#6b4423]">Thợ rèn: </span>
                          <strong className="text-[#15803d] font-bold">
                            {order.assignedSmiths} thợ rèn
                          </strong>
                          {forge.forgeQueue && forge.forgeQueue.length > 0 && (
                            <span className="text-[#704d2e] ml-1.5">
                              ({forge.forgeQueue.length} mẻ trong hàng chờ)
                            </span>
                          )}
                        </li>
                      )}
                    </ul>

                    {/* Dòng thao tác: Định vị, Hạ lệnh rèn/Xem lò */}
                    <div className="flex items-center justify-end gap-2 pt-1.5 border-t border-[#8c6b44]/20">
                      <button
                        onClick={() => {
                          setFlyToTarget({ x: forge.x, y: forge.y });
                          setActiveModal(null);
                        }}
                        className="px-2.5 py-1 rounded border border-[#8c6b44]/40 bg-[#8c6b44]/10 hover:bg-[#8c6b44]/25 text-[#5c3e23] hover:text-[#8c2d19] text-xs font-bold transition cursor-pointer active:scale-95"
                        title={UI_TEXT.forgesPanel.actions.locate}
                      >
                        Định vị
                      </button>

                      {!isBuilding && (
                        <button
                          onClick={() => {
                            setActiveForgeModalStructureId(forge.id);
                            setActiveModal(null);
                          }}
                          className="px-3 py-1 rounded bg-[#8c2d19] hover:bg-[#6e1e0d] text-[#fff3db] text-xs font-bold transition cursor-pointer active:scale-95 shadow"
                        >
                          {order ? 'Xem Lò' : UI_TEXT.forgesPanel.actions.orderForge}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-[#8c6b44]/30 mt-2 flex justify-end shrink-0">
            <button
              onClick={() => {
                setActiveModal(null);
                toggleBuildPaper();
              }}
              className="px-4 py-1.5 rounded bg-[#8c2d19] hover:bg-[#6e1e0d] text-[#fff3db] font-serif font-black text-xs shadow transition cursor-pointer active:scale-95"
            >
              <span>{UI_TEXT.forgesPanel.actions.buildNew}</span>
            </button>
          </div>
        </div>
      </div>
  );
});

ForgesOverviewModal.displayName = 'ForgesOverviewModal';
