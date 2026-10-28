import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { X, Sparkles } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { useUIStore } from '../../store/uiStore';
import { BronzePlaqueCard } from './BronzePlaqueCard';

export const GeneralsModal: React.FC = React.memo(() => {
  const activeModal = useUIStore(state => state.activeModal);
  const setActiveModal = useUIStore(state => state.setActiveModal);

  const generals = useGameStore(state => state.generals);
  const cities = useGameStore(state => state.cities);
  const assignGeneralToCity = useGameStore(state => state.assignGeneralToCity);
  const recruitmentNotice = useGameStore(state => state.recruitmentNotice);
  const dismissRecruitmentNotice = useGameStore(state => state.dismissRecruitmentNotice);

  const [selectedGeneralId, setSelectedGeneralId] = useState<string>('le_loi');
  const [flippedGeneralId, setFlippedGeneralId] = useState<string | null>(null);
  const [popupFlippedIds, setPopupFlippedIds] = useState<Record<string, boolean>>({});
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [displayedPage, setDisplayedPage] = useState<number>(0);
  const [isFlipping, setIsFlipping] = useState<boolean>(false);
  const [flipDirection, setFlipDirection] = useState<'forward' | 'backward'>('forward');

  // Chỉ hiển thị các vị tướng đã đầu quân
  const unlockedGenerals = useMemo(() => generals.filter(g => g.unlocked), [generals]);
  const lamSonCities = useMemo(() => cities.filter(c => c.faction === 'lam_son'), [cities]);

  // Mỗi mặt bảng hiển thị đúng 10 lệnh bài (2 hàng × 5 thẻ)
  const CARDS_PER_PAGE = 10;
  const totalPages = Math.max(1, Math.ceil(unlockedGenerals.length / CARDS_PER_PAGE));

  // Lật bảng đúng 1 lần (180 độ) theo trục ngang khi đổi mặt bảng (Nhanh, mượt 60fps)
  const handleSelectBoard = useCallback((newIndex: number) => {
    if (newIndex === currentPage || isFlipping) return;
    setIsFlipping(true);
    setFlipDirection(newIndex > currentPage ? 'forward' : 'backward');

    // Đúng điểm xoay 90 độ mỏng nhất (190ms): đổi trang thẻ bài mới trong chớp mắt
    setTimeout(() => {
      setDisplayedPage(newIndex);
      setCurrentPage(newIndex);
    }, 190);

    // Hoàn tất 1 lần lật duy nhất (sau 380ms)
    setTimeout(() => {
      setIsFlipping(false);
    }, 380);
  }, [currentPage, isFlipping]);

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

  // Bắt phím điều hướng (← / → để chuyển mặt bảng, Esc để đóng)
  useEffect(() => {
    if (activeModal !== 'generals') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        if (currentPage > 0 && !isFlipping) handleSelectBoard(currentPage - 1);
      } else if (e.key === 'ArrowRight') {
        if (currentPage < totalPages - 1 && !isFlipping) handleSelectBoard(currentPage + 1);
      } else if (e.key === 'Escape') {
        setActiveModal(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeModal, currentPage, totalPages, isFlipping, setActiveModal, handleSelectBoard]);

  // 1. POPUP SỰ KIỆN LỊCH SỬ / MÙA VỤ THU HOẠCH / HOÀN TẤT CÔNG TRÌNH
  if (recruitmentNotice) {
    const joinedGenerals = generals.filter(g => recruitmentNotice.generalIds.includes(g.id));
    const isGeneralRecruit = joinedGenerals.length > 0;

    return (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 pointer-events-auto">
        <div className="relative w-full max-w-4xl rounded-2xl overflow-hidden border-2 border-[#b89158] shadow-[0_20px_60px_rgba(0,0,0,0.85)] bg-gradient-to-br from-[#302014] via-[#22160c] to-[#170e07] text-[#f5e6cc]">
          <div className="px-6 py-4 bg-gradient-to-r from-[#4a2e16] via-[#6b4422] to-[#4a2e16] border-b border-[#b89158]/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="text-amber-400 animate-pulse" size={24} />
              <div>
                <div className="text-xs uppercase tracking-widest text-amber-300/90 font-bold">
                  {isGeneralRecruit ? 'Sự Kiện Lịch Sử' : 'Tin Mừng Quân Cơ'} • {recruitmentNotice.dateStr}
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

          <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto no-scrollbar">
            <p className="text-center font-sans text-base md:text-lg text-[#edd8b4] max-w-2xl mx-auto leading-relaxed">
              {recruitmentNotice.description}
            </p>

            {isGeneralRecruit && (
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
            )}

            <div className="flex justify-center pt-2">
              <button
                onClick={dismissRecruitmentNotice}
                className="px-8 py-3 rounded-lg bg-gradient-to-b from-[#b33622] to-[#7d1e0e] border border-[#e07058] text-[#fff5e4] font-sans font-bold text-base tracking-wider uppercase shadow-lg hover:brightness-110 active:scale-95 transition cursor-pointer"
              >
                {isGeneralRecruit ? 'Ban Lệnh Bài — Thu Nhận Vào Đại Quân' : 'Tiếp Tục Đại Nghiệp'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. TẤM BẢNG ĐỒNG NGUYÊN BẢN (CHỮ DỌC BÊN TRÁI, 10 THẺ/MẶT BẢNG, LẬT 1 VÒNG THEO TRỤC NGANG KHI ĐỔI MẶT)
  if (activeModal !== 'generals') return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex flex-col items-center justify-center p-2 sm:p-4 md:p-6 pointer-events-auto animate-in fade-in duration-200"
      onClick={() => setActiveModal(null)}
      style={{ perspective: '1600px' }}
    >
      {/* Tấm bảng đồng thô mộc không viền từ asset người chơi */}
      <div
        className={`relative w-full max-w-[1240px] aspect-[916/509] max-h-[92vh] min-h-[460px] md:min-h-0 flex flex-col select-none pointer-events-auto filter drop-shadow-[0_25px_50px_rgba(0,0,0,0.95)] ${
          isFlipping
            ? flipDirection === 'forward'
              ? 'animate-board-flip-forward'
              : 'animate-board-flip-backward'
            : ''
        }`}
        style={{ transformStyle: 'preserve-3d' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Nền ảnh bảng đồng nguyên bản không viền */}
        <img
          src="/raw_bronze_slab.png"
          alt="Bảng đồng lệnh bài danh tướng"
          className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none z-0"
          draggable={false}
        />

        {/* Nút đóng "✕" dạng nét dao đục KHẮC CHÌM vào góc trên bên phải mặt đồng */}
        <button
          onClick={() => setActiveModal(null)}
          className="absolute right-[2%] sm:right-[2.5%] top-[2%] sm:top-[2.5%] p-2 rounded transition cursor-pointer group z-30"
          title="Đóng bảng lệnh bài (Esc)"
        >
          <span
            className="font-serif font-black text-2xl sm:text-3xl block transition transform group-hover:scale-125 group-hover:text-[#ffca85] select-none"
            style={{
              color: '#2a150a',
              textShadow:
                '0 1px 1px rgba(240, 180, 130, 0.45), 0 -1px 2px rgba(0, 0, 0, 0.95)',
            }}
          >
            ✕
          </span>
        </button>

        {/* Tiêu đề "LỆNH BÀI DANH TƯỚNG" XẾP HÀNG DỌC DÁT VÀNG KHẮC CHÌM & PHÁT SÁNG SANG PHÍA BÊN TRÁI */}
        <div className="absolute left-[2%] sm:left-[2.8%] top-[4%] bottom-[4%] w-8 sm:w-10 flex flex-col items-center justify-between pointer-events-none select-none z-20">
          <span
            className="text-[#ffd058] text-sm sm:text-base font-serif"
            style={{ filter: 'drop-shadow(0 0 6px rgba(245, 158, 11, 0.8))' }}
          >
            ❖
          </span>
          <div
            className="flex flex-col items-center justify-center font-['HanZiVH',serif] font-black text-sm sm:text-base md:text-lg tracking-wider"
            style={{
              color: '#ffd058',
              textShadow: `
                0 -1px 2px rgba(0, 0, 0, 0.95),
                0 1px 1px rgba(255, 215, 130, 0.5),
                0 0 10px rgba(245, 158, 11, 0.65),
                0 0 20px rgba(217, 119, 6, 0.35)
              `,
              filter: 'drop-shadow(0 0 4px rgba(245, 158, 11, 0.45))',
            }}
          >
            <span>L</span>
            <span>Ệ</span>
            <span>N</span>
            <span>H</span>
            <span className="h-1.5 sm:h-2.5"></span>
            <span>B</span>
            <span>À</span>
            <span>I</span>
            <span className="h-1.5 sm:h-2.5"></span>
            <span>D</span>
            <span>A</span>
            <span>N</span>
            <span>H</span>
            <span className="h-1.5 sm:h-2.5"></span>
            <span>T</span>
            <span>Ư</span>
            <span>Ớ</span>
            <span>N</span>
            <span>G</span>
          </div>
          <span
            className="text-[#ffd058] text-sm sm:text-base font-serif"
            style={{ filter: 'drop-shadow(0 0 6px rgba(245, 158, 11, 0.8))' }}
          >
            ❖
          </span>
        </div>

        {/* Cột các nút bấm đúc đồng chọn Bảng "1", "2" nằm trong rãnh khoét chìm phía bên phải tấm bảng */}
        {totalPages > 1 && (
          <div
            className="absolute right-[1.6%] sm:right-[2.2%] top-[15%] bottom-[8%] w-10 sm:w-12 flex flex-col items-center justify-center gap-3.5 z-30 select-none"
            onClick={e => e.stopPropagation()}
          >
            {Array.from({ length: totalPages }).map((_, idx) => {
              const isSelected = idx === currentPage;
              return (
                <div
                  key={idx}
                  className={`p-[2.5px] sm:p-[3px] rounded-md transition-all duration-200 ${
                    isSelected
                      ? 'bg-[#120803] border border-[#0d0502] shadow-[inset_0_3px_6px_rgba(0,0,0,0.95),inset_0_-1px_1px_rgba(255,180,120,0.2),0_1px_1px_rgba(255,200,150,0.25)]'
                      : 'bg-[#180b05] border border-[#1a0c06] shadow-[inset_0_2px_5px_rgba(0,0,0,0.9),inset_0_-1px_1px_rgba(255,180,120,0.15),0_1px_1px_rgba(255,200,150,0.2)]'
                  }`}
                  title={`Lật sang Mặt Bảng ${idx + 1}`}
                >
                  {/* Phím bấm đồng lọt trong lòng rãnh khoét: Khi chọn sẽ thụt sâu xuống */}
                  <button
                    onClick={() => handleSelectBoard(idx)}
                    disabled={isFlipping}
                    className={`w-8 sm:w-9 md:w-10 h-5 sm:h-6 md:h-6.5 rounded-[4px] flex items-center justify-center font-['HanZiVH',serif] font-black text-xs sm:text-sm cursor-pointer transition-all duration-150 ${
                      isSelected
                        ? 'translate-y-[2px] scale-[0.93]'
                        : 'hover:-translate-y-[0.5px] active:translate-y-[1.5px]'
                    }`}
                    style={
                      isSelected
                        ? {
                            background:
                              'linear-gradient(180deg, #180c05 0%, #241107 45%, #33170a 100%)',
                            border: '1px solid #3d1c0b',
                            boxShadow:
                              'inset 0 3px 6px rgba(0, 0, 0, 0.95), inset 0 0 6px rgba(0, 0, 0, 0.9), 0 1px 1px rgba(255, 180, 120, 0.15)',
                            color: '#ffd058',
                            textShadow:
                              '0 0 8px rgba(245, 158, 11, 0.85), 0 1px 1px rgba(0, 0, 0, 0.95)',
                          }
                        : {
                            background:
                              'linear-gradient(180deg, #582f19 0%, #3d2010 55%, #291409 100%)',
                            border: '1px solid #734022',
                            borderTop: '1px solid #9e5b32',
                            boxShadow:
                              '0 2px 4px rgba(0, 0, 0, 0.85), inset 0 1px 1px rgba(255, 210, 150, 0.45), inset 0 -1px 2px rgba(0, 0, 0, 0.7)',
                            color: '#cfa075',
                            textShadow: '0 -1px 1px rgba(0, 0, 0, 0.9)',
                          }
                    }
                  >
                    {idx + 1}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Không gian trưng bày 10 lệnh bài: KÍCH THƯỚC NGUYÊN GỐC CHUẨN BAN ĐẦU (size="md") */}
        <div className="relative z-10 flex-1 ml-[5.5%] sm:ml-[6.5%] mr-[5.5%] sm:mr-[6.5%] my-[0.5%] sm:my-[1%] px-1 sm:px-2 flex items-center justify-center">
          {Array.from({ length: totalPages }).map((_, pIdx) => {
            const isThisPage = pIdx === displayedPage;
            const pageGenerals = unlockedGenerals.slice(pIdx * CARDS_PER_PAGE, (pIdx + 1) * CARDS_PER_PAGE);

            return (
              <div
                key={pIdx}
                className={`w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-y-1 sm:gap-y-1.5 md:gap-y-2 gap-x-2 sm:gap-x-3 md:gap-x-5 justify-items-center items-center ${
                  isThisPage ? 'relative' : 'hidden'
                }`}
              >
                {pageGenerals.map(gen => (
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
            );
          })}
        </div>
      </div>
    </div>
  );
});

GeneralsModal.displayName = 'GeneralsModal';
