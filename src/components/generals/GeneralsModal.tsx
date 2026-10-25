import React, { useState, useMemo } from 'react';
import { X, Sparkles, Award, RotateCw } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { useUIStore } from '../../store/uiStore';
import { BronzePlaqueCard } from './BronzePlaqueCard';
import type { GeneralGroup } from '../../types';

export const GeneralsModal: React.FC = () => {
  const activeModal = useUIStore(state => state.activeModal);
  const setActiveModal = useUIStore(state => state.setActiveModal);

  const generals = useGameStore(state => state.generals);
  const cities = useGameStore(state => state.cities);
  const assignGeneralToCity = useGameStore(state => state.assignGeneralToCity);
  const recruitmentNotice = useGameStore(state => state.recruitmentNotice);
  const dismissRecruitmentNotice = useGameStore(state => state.dismissRecruitmentNotice);

  const [selectedFilter, setSelectedFilter] = useState<'all' | GeneralGroup>('all');
  const [selectedGeneralId, setSelectedGeneralId] = useState<string>('le_loi');
  const [flippedGeneralId, setFlippedGeneralId] = useState<string | null>(null);
  const [popupFlippedIds, setPopupFlippedIds] = useState<Record<string, boolean>>({});

  // Chỉ hiển thị các vị tướng đã đầu quân (tạm ẩn các tướng chưa đầu quân theo yêu cầu)
  const unlockedGenerals = useMemo(() => generals.filter(g => g.unlocked), [generals]);

  const filteredGenerals = useMemo(() => {
    if (selectedFilter === 'all') return unlockedGenerals;
    return unlockedGenerals.filter(g => g.group === selectedFilter);
  }, [unlockedGenerals, selectedFilter]);

  const groupCounts = useMemo(
    () => ({
      lung_nhai_1416: unlockedGenerals.filter(g => g.group === 'lung_nhai_1416').length,
      khoi_nghia_1418: unlockedGenerals.filter(g => g.group === 'khoi_nghia_1418').length,
      quy_tu_1420_1426: unlockedGenerals.filter(g => g.group === 'quy_tu_1420_1426').length,
    }),
    [unlockedGenerals]
  );

  const lamSonCities = useMemo(() => cities.filter(c => c.faction === 'lam_son'), [cities]);

  const handleCardClick = (genId: string) => {
    if (selectedGeneralId === genId) {
      // Đang chọn thẻ bài này mà bấm thêm 1 lần nữa -> Lật thẻ ra mặt sau (hoặc lật lại mặt trước)
      setFlippedGeneralId(prev => (prev === genId ? null : genId));
    } else {
      // Bấm lần đầu vào thẻ bài khác -> Chọn thẻ bài đó và đặt về mặt trước
      setSelectedGeneralId(genId);
      setFlippedGeneralId(null);
    }
  };

  // 1. POPUP SỰ KIỆN LỊCH SỬ: DANH TƯỚNG ĐẦU QUÂN TỤ NGHĨA
  if (recruitmentNotice) {
    const joinedGenerals = generals.filter(g => recruitmentNotice.generalIds.includes(g.id));

    return (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 pointer-events-auto">
        <div className="relative w-full max-w-4xl rounded-2xl overflow-hidden border-2 border-[#b89158] shadow-[0_20px_60px_rgba(0,0,0,0.85)] bg-gradient-to-br from-[#302014] via-[#22160c] to-[#170e07] text-[#f5e6cc]">
          {/* Viền hoa văn đồng cổ trên đầu */}
          <div className="px-6 py-4 bg-gradient-to-r from-[#4a2e16] via-[#6b4422] to-[#4a2e16] border-b border-[#b89158]/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="text-amber-400 animate-pulse" size={24} />
              <div>
                <div className="text-xs uppercase tracking-widest text-amber-300/90 font-bold">
                  Sự Kiện Lịch Sử • {recruitmentNotice.dateStr}
                </div>
                <h2 className="text-xl md:text-2xl font-serif font-black text-[#fff3db] tracking-wide">
                  {recruitmentNotice.title}
                </h2>
              </div>
            </div>
            <button
              onClick={dismissRecruitmentNotice}
              className="p-1.5 rounded-lg hover:bg-white/10 text-[#e6cca0] transition cursor-pointer"
            >
              <X size={22} />
            </button>
          </div>

          {/* Nội dung Chiếu thư & Trưng bày Thẻ Bài Đồng mới nhận */}
          <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto no-scrollbar">
            <p className="text-center font-sans text-base md:text-lg text-[#edd8b4] max-w-2xl mx-auto leading-relaxed">
              {recruitmentNotice.description}
            </p>

            {/* Hàng thẻ bài đồng của các tướng mới gia nhập */}
            <div className="flex flex-wrap items-center justify-center gap-6 py-4 px-3 bg-black/35 rounded-xl border border-[#6e4e2e]/50">
              {joinedGenerals.map(gen => (
                <div key={gen.id} className="flex flex-col items-center">
                  <BronzePlaqueCard
                    general={gen}
                    size="md"
                    selected={true}
                    flipped={!!popupFlippedIds[gen.id]}
                    cities={lamSonCities}
                    onAssignCity={cityId => assignGeneralToCity(gen.id, cityId)}
                    onClick={() =>
                      setPopupFlippedIds(prev => ({ ...prev, [gen.id]: !prev[gen.id] }))
                    }
                  />
                  <span className="mt-3 text-xs text-amber-300/90 font-sans italic max-w-44 text-center">
                    {gen.epithet}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-center pt-2">
              <button
                onClick={dismissRecruitmentNotice}
                className="px-8 py-3 rounded-lg bg-gradient-to-b from-[#b33622] to-[#7d1e0e] border border-[#e07058] text-[#fff5e4] font-sans font-bold text-base tracking-wider uppercase shadow-lg hover:brightness-110 active:scale-95 transition cursor-pointer"
              >
                Ban Lệnh Bài — Thu Nhận Vào Đại Quân
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. KHAY TỔNG QUẢN THẺ BÀI DANH TƯỚNG LAM SƠN
  if (activeModal !== 'generals') return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 pointer-events-auto">
      <div className="relative w-full max-w-6xl h-[88vh] rounded-2xl overflow-hidden border-2 border-[#a88252] shadow-[0_25px_70px_rgba(0,0,0,0.9)] flex flex-col bg-gradient-to-br from-[#281b10] via-[#1e140b] to-[#140d07]">
        
        {/* Header Khay Lệnh Bài */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-[#3d2714] via-[#57381d] to-[#3d2714] border-b border-[#9c7648] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <Award className="text-[#f0c475]" size={26} />
            <div>
              <h2 className="font-serif font-black text-xl md:text-2xl text-[#f7e7c8] tracking-wide">
                Lệnh Bài Danh Tướng Lam Sơn
              </h2>
              <p className="text-xs text-[#d4b687] flex items-center gap-2">
                <span>
                  Hiện diện dưới trướng: <strong className="text-amber-300">{unlockedGenerals.length}</strong> vị tướng
                </span>
                <span className="text-[#9c7648]">•</span>
                <span className="inline-flex items-center gap-1 text-amber-200/90 italic">
                  <RotateCw size={11} /> Nhấp chọn thẻ, nhấp thêm lần nữa để lật xem chi tiết mặt sau
                </span>
              </p>
            </div>
          </div>

          {/* Các nút lọc theo Nhóm Lịch Sử (chỉ hiện nhóm đã có tướng đầu quân) */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setSelectedFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-sans font-bold transition cursor-pointer border ${
                selectedFilter === 'all'
                  ? 'bg-[#b38248] text-[#1c1006] border-[#f2d09b]'
                  : 'bg-[#2a1b0e] text-[#d6ba8f] border-[#634629] hover:bg-[#3b2715]'
              }`}
            >
              Tất Cả ({unlockedGenerals.length})
            </button>
            <button
              onClick={() => setSelectedFilter('lung_nhai_1416')}
              className={`px-3 py-1.5 rounded-lg text-xs font-sans font-bold transition cursor-pointer border ${
                selectedFilter === 'lung_nhai_1416'
                  ? 'bg-[#b38248] text-[#1c1006] border-[#f2d09b]'
                  : 'bg-[#2a1b0e] text-[#d6ba8f] border-[#634629] hover:bg-[#3b2715]'
              }`}
            >
              Hội Thề Lũng Nhai 1416 ({groupCounts.lung_nhai_1416})
            </button>
            {groupCounts.khoi_nghia_1418 > 0 && (
              <button
                onClick={() => setSelectedFilter('khoi_nghia_1418')}
                className={`px-3 py-1.5 rounded-lg text-xs font-sans font-bold transition cursor-pointer border ${
                  selectedFilter === 'khoi_nghia_1418'
                    ? 'bg-[#b38248] text-[#1c1006] border-[#f2d09b]'
                    : 'bg-[#2a1b0e] text-[#d6ba8f] border-[#634629] hover:bg-[#3b2715]'
                }`}
              >
                Dũng Tướng Buổi Đầu 1418 ({groupCounts.khoi_nghia_1418})
              </button>
            )}
            {groupCounts.quy_tu_1420_1426 > 0 && (
              <button
                onClick={() => setSelectedFilter('quy_tu_1420_1426')}
                className={`px-3 py-1.5 rounded-lg text-xs font-sans font-bold transition cursor-pointer border ${
                  selectedFilter === 'quy_tu_1420_1426'
                    ? 'bg-[#b38248] text-[#1c1006] border-[#f2d09b]'
                    : 'bg-[#2a1b0e] text-[#d6ba8f] border-[#634629] hover:bg-[#3b2715]'
                }`}
              >
                Đại Tài Lượt Sau 1420–1426 ({groupCounts.quy_tu_1420_1426})
              </button>
            )}
          </div>

          <button
            onClick={() => setActiveModal(null)}
            className="p-1.5 rounded-lg bg-black/30 hover:bg-black/60 text-[#ebd2ab] border border-[#785735] transition cursor-pointer"
            title="Đóng khay lệnh bài"
          >
            <X size={20} />
          </button>
        </div>

        {/* Khay trưng bày các Thẻ Bài Đồng Cổ (Click lần 1 để chọn, Click lần 2 để lật mặt sau) */}
        <div className="flex-1 p-6 overflow-y-auto no-scrollbar bg-[radial-gradient(ellipse_at_top,rgba(90,58,28,0.28),transparent_75%)]">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-y-8 gap-x-5 justify-items-center pb-6">
            {filteredGenerals.map(gen => (
              <BronzePlaqueCard
                key={gen.id}
                general={gen}
                size="md"
                selected={selectedGeneralId === gen.id}
                flipped={flippedGeneralId === gen.id}
                cities={lamSonCities}
                onAssignCity={cityId => assignGeneralToCity(gen.id, cityId)}
                onClick={() => handleCardClick(gen.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
