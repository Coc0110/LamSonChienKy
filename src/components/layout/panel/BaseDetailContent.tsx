import React from 'react';
import { X } from 'lucide-react';
import { useGameStore } from '../../../store/gameStore';
import { useUIStore } from '../../../store/uiStore';
import { notify } from '../../../store/dialogStore';
import { MiniGeneralCard } from '../../generals/MiniGeneralCard';
import type { CityNode, General } from '../../../types';

interface BaseDetailContentProps {
  selectedCity: CityNode;
  stationedGenerals: General[];
  lamSonBasesCount: number;
  onOpenPopulationModal: () => void;
}

export const BaseDetailContent: React.FC<BaseDetailContentProps> = React.memo(({
  selectedCity,
  stationedGenerals,
  lamSonBasesCount,
  onOpenPopulationModal,
}) => {
  const resources = useGameStore(state => state.resources);
  const demolishBase = useGameStore(state => state.demolishBase);

  const selectCity = useUIStore(state => state.selectCity);
  const setBaseRelocateMode = useUIStore(state => state.setBaseRelocateMode);
  const isBuildPaperOpen = useUIStore(state => state.isBuildPaperOpen);
  const setIsBuildPaperOpen = useUIStore(state => state.setBuildPaperOpen);
  const setActiveModal = useUIStore(state => state.setActiveModal);

  const isLamSon = selectedCity.faction === 'lam_son';

  return (
    <>
      {/* TIÊU ĐỀ BẢN DOANH & NÚT HÀNH ĐỘNG VẾT MỰC */}
      <div className="relative z-10 px-7 pt-6 pb-1 flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-xs uppercase tracking-widest text-[#8c2d19]">
              {isLamSon ? 'Bản Doanh Nghĩa Binh' : 'Quân Đồn Trú'}
            </span>
            <span className="text-[11px] font-serif text-[#704d2e]">
              {isLamSon ? 'Đại Bản Doanh' : 'Căn Cứ'}
            </span>
          </div>

          <h3 className="font-serif font-bold text-2xl text-[#261304] tracking-wide mt-0.5 truncate">
            {selectedCity.name}
          </h3>

          {/* NÚT THAO TÁC: XÂY DỰNG, DI DỜI, PHÁ HỦY */}
          {isLamSon && (
            <div className="flex items-center gap-2 mt-2 pt-1">
              <button
                onClick={() => setIsBuildPaperOpen(!isBuildPaperOpen)}
                className={`relative group flex-1 h-[32px] px-3 flex items-center justify-center transition-transform hover:scale-105 active:scale-95 cursor-pointer ${
                  isBuildPaperOpen ? 'brightness-125' : ''
                }`}
                title={isBuildPaperOpen ? "Đóng danh sách công trình" : "Mở danh sách công trình xây dựng bên phải"}
              >
                <img
                  src="/ink_stroke_1.png"
                  alt="Vết mực"
                  className="absolute inset-0 w-full h-full object-fill pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)] group-hover:brightness-125 transition-all"
                />
                <span className="relative z-10 font-serif font-bold text-xs text-[#fcf4e4] tracking-wider uppercase drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                  Xây Dựng
                </span>
              </button>

              <button
                onClick={() => setBaseRelocateMode({ baseId: selectedCity.id })}
                className="relative group flex-1 h-[32px] px-3 flex items-center justify-center transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                title="Di dời căn cứ đến vị trí mới trên bản đồ (lưới địa hình)"
              >
                <img
                  src="/ink_stroke_1.png"
                  alt="Vết mực"
                  className="absolute inset-0 w-full h-full object-fill pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)] group-hover:brightness-125 transition-all"
                />
                <span className="relative z-10 font-serif font-bold text-xs text-[#fcf4e4] tracking-wider uppercase drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                  Di Dời
                </span>
              </button>

              <button
                disabled={lamSonBasesCount <= 1}
                onClick={() => {
                  if (lamSonBasesCount <= 1) {
                    notify.warning('Nghĩa quân cần ít nhất một căn cứ để duy trì đại nghiệp! Không thể giải thể bản doanh cuối cùng.');
                    return;
                  }
                  notify.confirm({
                    title: 'Giải Thể Căn Cứ',
                    message: `Bạn có chắc chắn muốn giải thể Căn cứ [${selectedCity.name}]?\n\nToàn bộ ${selectedCity.troops} quân binh, tráng phu và danh tướng sẽ tự động rút về tụ hợp tại căn cứ gần nhất.`,
                    confirmText: 'Phá Hủy',
                    cancelText: 'Giữ Lại',
                    onConfirm: () => {
                      const res = demolishBase(selectedCity.id);
                      if (res.success) {
                        notify.success(res.message);
                      } else {
                        notify.error(res.message);
                      }
                    },
                  });
                }}
                className={`relative group h-[32px] px-3.5 flex items-center justify-center transition-transform ${
                  lamSonBasesCount <= 1
                    ? 'opacity-40 cursor-not-allowed'
                    : 'hover:scale-105 active:scale-95 cursor-pointer'
                }`}
                title={lamSonBasesCount <= 1 ? "Căn cứ duy nhất của nghĩa quân, không thể giải thể!" : "Giải thể căn cứ và rút quân về căn cứ gần nhất"}
              >
                <img
                  src="/ink_stroke_red.png"
                  alt="Vết mực son"
                  className="absolute inset-0 w-full h-full object-fill pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)] group-hover:brightness-125 transition-all"
                />
                <span className="relative z-10 font-serif font-bold text-xs text-[#fee2e2] tracking-wider uppercase drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                  Phá Hủy
                </span>
              </button>
            </div>
          )}
        </div>

        <button 
          onClick={() => selectCity(null)}
          className="p-1 text-[#593922] hover:text-[#8c2d19] transition ml-2 shrink-0 cursor-pointer"
          title="Đóng Quân Thư"
        >
          <X size={20} />
        </button>
      </div>

      {/* THÂN CHIẾN THƯ */}
      <div className="relative z-10 px-7 pt-2 pb-14 overflow-y-auto space-y-3.5 no-scrollbar flex-1">
        {/* 1. Thông Tin Quân Lực & Phòng Thủ */}
        <div className="grid grid-cols-2 gap-4">
          <div 
            onClick={() => {
              if (isLamSon) {
                onOpenPopulationModal();
              }
            }}
            className={isLamSon ? 'cursor-pointer group' : ''}
            title={isLamSon ? "Bấm vào để xem chi tiết Nghĩa binh, Tráng phu và Thao luyện võ nghệ" : undefined}
          >
            <div className="text-xs font-serif font-bold text-[#704d2e]">
              Quân đồn trú
            </div>
            <div className="mt-0.5 font-serif text-2xl text-[#2a1708] flex items-baseline gap-1">
              <span className="font-serif font-bold">{selectedCity.troops.toLocaleString()}</span>
              <span className="text-xs font-normal text-[#5c3e23]">binh</span>
            </div>

            {isLamSon && selectedCity.population && (
              <div className="mt-0.5 text-[11px] text-[#8c4b26] font-serif">
                <span>Chi tiết nhân lực • </span>
                <span className="text-[#a82415] underline font-serif font-bold">Thao luyện</span>
              </div>
            )}
          </div>

          <div>
            <div className="text-xs font-serif font-bold text-[#704d2e]">
              Địa thế phòng thủ
            </div>
            <div className="mt-0.5 font-serif text-base text-[#2a1708]">
              {selectedCity.type === 'city' ? 'Kiên thành' : selectedCity.type === 'chokepoint' ? 'Hiểm trở' : 'Căn cứ dã chiến'}
            </div>
            <div className="text-[11px] text-[#704d2e] font-serif">
              Khó công dễ thủ
            </div>
          </div>
        </div>

        {/* 2. Danh Sách Tướng Lĩnh Đóng Trú */}
        <div className="space-y-1.5 pt-0.5">
          <div className="text-xs font-serif font-bold text-[#5c3e23] uppercase tracking-wider">
            Tướng Lĩnh Đóng Trú ({stationedGenerals.length})
          </div>

          {stationedGenerals.length === 0 ? (
            <p className="py-1 text-xs text-[#704d2e] font-serif italic">
              Chưa có danh tướng nào đóng quân tại đây.
            </p>
          ) : (
            <div className="grid grid-cols-6 gap-1.5 pt-0.5">
              {stationedGenerals.map(gen => (
                <MiniGeneralCard
                  key={gen.id}
                  general={gen}
                  onClick={() => {
                    setActiveModal('generals');
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* 3. Dân Số & Lòng Dân */}
        {isLamSon && selectedCity.population && (
          <div className="space-y-1 pt-1 font-serif">
            <div className="text-xs text-[#2a1708]">
              <span className="font-serif font-bold text-[#5c3e23]">Dân chúng: </span>
              <span className="font-serif">{(
                selectedCity.population.combatTroops + 
                selectedCity.population.idleLaborers + 
                selectedCity.population.farmLaborers + 
                selectedCity.population.forgeLaborers + 
                selectedCity.population.unfitPopulation
              ).toLocaleString()} nhân khẩu</span>
            </div>

            <div className="text-xs text-[#2a1708]">
              <span className="font-serif font-bold text-[#5c3e23]">Lòng dân: </span>
              <span className="font-serif font-bold text-[#8c2d19]">{resources.morale ?? 80}%</span>
            </div>

            <div className="text-xs text-[#4a321d] leading-relaxed pt-0.5">
              <span className="font-serif font-bold text-[#5c3e23]">Địa thế: </span>
              <span className="font-serif">Rừng núi Lam Sơn hiểm trở, dễ ẩn náu, là căn cứ lý tưởng để khởi nghĩa và tập hợp nghĩa quân.</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
});

BaseDetailContent.displayName = 'BaseDetailContent';
