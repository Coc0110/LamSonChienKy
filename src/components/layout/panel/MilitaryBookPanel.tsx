import React, { useState, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import { useGameStore } from '../../../store/gameStore';
import { useUIStore } from '../../../store/uiStore';
import districtData from '../../../data/districtPolygons.json';
import type { DistrictInfo } from '../../../types/map';
import { UI_TEXT } from '../../../data/uiText';

const DEFAULT_DISTRICTS: DistrictInfo[] = (districtData as any).districts || [];

type NoticeCategory = 'all' | 'harvest' | 'forge' | 'battle' | 'other';

export const MilitaryBookPanel: React.FC = React.memo(() => {
  const cities = useGameStore(state => state.cities);
  const militaryNotices = useGameStore(state => state.militaryNotices || []);
  const markNoticesAsRead = useGameStore(state => state.markNoticesAsRead);
  const clearMilitaryNotices = useGameStore(state => state.clearMilitaryNotices);

  const selectDistrict = useUIStore(state => state.selectDistrict);
  const setIsListOpen = useUIStore(state => state.setMilitaryBookOpen);

  // Tab ưu tiên số 1: Tin Báo Quân Cơ (notices)
  const [listTab, setListTab] = useState<'notices' | 'districts'>('notices');
  const [noticeFilter, setNoticeFilter] = useState<NoticeCategory>('all');

  // Đánh dấu đã đọc ngay khi mở Quân Thư
  useEffect(() => {
    markNoticesAsRead();
  }, [markNoticesAsRead]);

  // Phím Escape đóng nhanh Quân Thư
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsListOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setIsListOpen]);

  const unreadNoticesCount = militaryNotices.filter(n => !n.read).length;

  const filteredNotices = useMemo(() => {
    if (noticeFilter === 'all') return militaryNotices;
    if (noticeFilter === 'harvest') return militaryNotices.filter(n => n.type === 'harvest');
    if (noticeFilter === 'forge') return militaryNotices.filter(n => n.type === 'forge');
    if (noticeFilter === 'battle') {
      return militaryNotices.filter(n => 
        (n as any).type === 'battle' || 
        (n as any).type === 'combat' || 
        n.title.toLowerCase().includes('chiến') || 
        n.title.toLowerCase().includes('tập kích') ||
        n.title.toLowerCase().includes('phục kích') ||
        n.title.toLowerCase().includes('xuất chinh')
      );
    }
    return militaryNotices.filter(n => n.type !== 'harvest' && n.type !== 'forge');
  }, [militaryNotices, noticeFilter]);

  return (
    <aside
      aria-label="Bảng Quân Thư & Tin Báo Quân Cơ"
      className="fixed top-[74px] md:top-[80px] right-2 md:right-4 z-[2650] w-[95vw] sm:w-[420px] md:w-[460px] max-h-[84vh] flex flex-col pointer-events-auto transition-all duration-300 select-none filter drop-shadow-[0_18px_30px_rgba(0,0,0,0.7)] drop-shadow-[0_3px_8px_rgba(0,0,0,0.45)]"
    >
      {/* Nền giấy Dó sứt mẻ tự nhiên */}
      <img
        src="/parchment_torn_panel.png"
        alt="Tờ giấy Quân Thư sứt mẻ"
        className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none z-0"
        draggable={false}
      />

      {/* Header tờ giấy Quân Thư */}
      <div className="relative z-10 px-6 pt-5 pb-2 flex items-center justify-between border-b border-[#8c6b44]/25">
        <div className="flex items-center gap-2">
          <img
            src="/icons/scroll.png"
            alt="Quân Thư"
            className="w-5 h-5 object-contain filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]"
          />
          <div>
            <h2 className="font-serif font-black text-[#261304] text-base md:text-lg tracking-wide leading-tight">
              {UI_TEXT.militaryBook.title}
            </h2>
            <p className="text-[10.5px] text-[#704d2e] font-serif">
              Quân thư tín sứ & tin báo sự vụ cõi Lam Sơn
            </p>
          </div>
        </div>
        <button 
          onClick={() => setIsListOpen(false)}
          className="p-1.5 text-[#593922] hover:text-[#8c2d19] hover:bg-[#8c6b44]/15 rounded transition cursor-pointer"
          title="Đóng Quân Thư"
        >
          <X size={18} />
        </button>
      </div>

      {/* Thanh chuyển Tab thư pháp: ƯU TIÊN TIN BÁO LÊN TRƯỚC */}
      <div className="relative z-10 flex items-center justify-between border-b border-[#8c6b44]/25 px-6 pt-2 pb-1.5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setListTab('notices');
              markNoticesAsRead();
            }}
            className={`pb-1 text-xs font-serif font-bold transition cursor-pointer flex items-center gap-1.5 ${
              listTab === 'notices' 
                ? 'text-[#8c2d19] border-b-2 border-[#8c2d19]' 
                : 'text-[#6b4a2e] hover:text-[#2d1e13]'
            }`}
          >
            <span>Tin Báo Quân Cơ</span>
            {unreadNoticesCount > 0 ? (
              <span className="px-1.5 py-0.2 rounded-full bg-[#8c1d18] text-[#fff5ea] text-[10px] font-mono font-black animate-pulse">
                {unreadNoticesCount}
              </span>
            ) : (
              <span className="text-[10px] font-mono text-[#8c6b44]">
                ({militaryNotices.length})
              </span>
            )}
          </button>

          <button
            onClick={() => setListTab('districts')}
            className={`pb-1 text-xs font-serif font-bold transition cursor-pointer ${
              listTab === 'districts' 
                ? 'text-[#8c2d19] border-b-2 border-[#8c2d19]' 
                : 'text-[#6b4a2e] hover:text-[#2d1e13]'
            }`}
          >
            Địa Hạt ({DEFAULT_DISTRICTS.length})
          </button>
        </div>

        {listTab === 'notices' && militaryNotices.length > 0 && (
          <button
            onClick={clearMilitaryNotices}
            className="text-[11px] text-[#8c2d19] hover:underline cursor-pointer font-serif font-bold"
            title="Xóa toàn bộ tin báo đã lưu"
          >
            Dọn sạch
          </button>
        )}
      </div>

      {/* Nội dung danh mục */}
      <div className="relative z-10 px-6 pt-2.5 pb-8 overflow-y-auto space-y-2 no-scrollbar flex-1">
        {listTab === 'notices' ? (
          <div className="space-y-2 font-serif">
            {/* Bộ lọc loại tin báo */}
            {militaryNotices.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-[11px]">
                <button
                  onClick={() => setNoticeFilter('all')}
                  className={`px-2 py-0.5 rounded text-[10.5px] font-bold transition cursor-pointer ${
                    noticeFilter === 'all'
                      ? 'bg-[#8c2d19] text-[#fff3db]'
                      : 'bg-black/[0.05] text-[#5c3e23] hover:bg-black/[0.1]'
                  }`}
                >
                  Tất cả ({militaryNotices.length})
                </button>
                <button
                  onClick={() => setNoticeFilter('harvest')}
                  className={`px-2 py-0.5 rounded text-[10.5px] font-bold transition cursor-pointer ${
                    noticeFilter === 'harvest'
                      ? 'bg-[#8c2d19] text-[#fff3db]'
                      : 'bg-black/[0.05] text-[#5c3e23] hover:bg-black/[0.1]'
                  }`}
                >
                  Mùa vụ
                </button>
                <button
                  onClick={() => setNoticeFilter('forge')}
                  className={`px-2 py-0.5 rounded text-[10.5px] font-bold transition cursor-pointer ${
                    noticeFilter === 'forge'
                      ? 'bg-[#8c2d19] text-[#fff3db]'
                      : 'bg-black/[0.05] text-[#5c3e23] hover:bg-black/[0.1]'
                  }`}
                >
                  Khí giới
                </button>
                <button
                  onClick={() => setNoticeFilter('battle')}
                  className={`px-2 py-0.5 rounded text-[10.5px] font-bold transition cursor-pointer ${
                    noticeFilter === 'battle'
                      ? 'bg-[#8c2d19] text-[#fff3db]'
                      : 'bg-black/[0.05] text-[#5c3e23] hover:bg-black/[0.1]'
                  }`}
                >
                  Chiến sự
                </button>
                <button
                  onClick={() => setNoticeFilter('other')}
                  className={`px-2 py-0.5 rounded text-[10.5px] font-bold transition cursor-pointer ${
                    noticeFilter === 'other'
                      ? 'bg-[#8c2d19] text-[#fff3db]'
                      : 'bg-black/[0.05] text-[#5c3e23] hover:bg-black/[0.1]'
                  }`}
                >
                  Khác
                </button>
              </div>
            )}

            {filteredNotices.length === 0 ? (
              <div className="text-center py-12 text-[#785934] font-serif text-sm">
                <p className="italic font-bold">Bờ cõi thanh bình, quân tình yên ả.</p>
                <p className="text-xs text-[#a07e5c] mt-1">Chưa có tin tức chiến sự, thu lương thảo hay rèn đúc mới.</p>
              </div>
            ) : (
              filteredNotices.map((notice) => {
                const cleanTitle = notice.title.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();

                let noticeIconNode = null;
                if (notice.type === 'harvest') {
                  noticeIconNode = (
                    <img 
                      src="/icons/rice_basket.png" 
                      alt="Vại lúa" 
                      className="w-8 h-8 object-contain shrink-0 filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]" 
                    />
                  );
                } else if (notice.type === 'forge') {
                  let weaponIcon = '/icons/weapon_sword.png';
                  if (notice.weaponType === 'bow' || notice.weaponType === 'crossbow' || notice.description.includes('Cung') || notice.description.includes('Nỏ')) {
                    weaponIcon = '/icons/weapon_bow.png';
                  } else if (notice.weaponType === 'spear' || notice.description.includes('Giáo')) {
                    weaponIcon = '/icons/weapon_spear.png';
                  } else if (notice.weaponType === 'armor' || notice.description.includes('Giáp')) {
                    weaponIcon = '/icons/weapon_armor.png';
                  }
                  noticeIconNode = (
                    <img 
                      src={weaponIcon} 
                      alt="Vũ khí rèn" 
                      className="w-5 h-5 object-contain shrink-0 filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]" 
                    />
                  );
                } else if (notice.type === 'general') {
                  noticeIconNode = (
                    <img 
                      src="/icons/general_token.png" 
                      alt="Tướng tụ nghĩa" 
                      className="w-5 h-5 object-contain shrink-0 filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]" 
                    />
                  );
                } else {
                  noticeIconNode = (
                    <img 
                      src="/icons/scroll.png" 
                      alt="Quân thư" 
                      className="w-5 h-5 object-contain shrink-0 filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]" 
                    />
                  );
                }

                const typeBadgeText = notice.type === 'harvest'
                  ? 'Thu hoạch mùa vụ'
                  : notice.type === 'forge'
                    ? 'Lò rèn hoàn tất'
                    : notice.type === 'general'
                      ? 'Tướng tụ nghĩa'
                      : 'Công trình khai hoang';

                return (
                  <div 
                    key={notice.id}
                    className="p-2.5 rounded bg-black/[0.03] hover:bg-black/[0.06] border border-[#8c6b44]/20 transition flex flex-col gap-1 text-left"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {noticeIconNode}
                        <span className="font-serif font-bold text-sm text-[#261304] leading-tight">
                          {cleanTitle}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-[#8c6b44] shrink-0 font-bold">
                        {notice.dateStr}
                      </span>
                    </div>

                    <p className="font-serif text-xs text-[#4a2e18] leading-relaxed pl-7 whitespace-pre-line">
                      {notice.description}
                    </p>

                    <div className="pl-7 pt-0.5 flex items-center justify-between text-[10px] font-serif text-[#8c6b44]">
                      <span className="italic">{typeBadgeText}</span>
                      {!notice.read && (
                        <span className="text-[#8c2d19] font-bold">Mới</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* TAB 2: ĐỊA HẠT THANH HÓA */
          <div className="space-y-1 font-serif">
            {DEFAULT_DISTRICTS.map(d => {
              const hasLamSon = cities.some(c => (c.districtId === d.id || c.id === d.id) && c.faction === 'lam_son' && c.troops > 0);
              const hasMing = cities.some(c => (c.districtId === d.id || c.id === d.id) && c.faction === 'ming' && c.troops > 0);

              return (
                <button
                  key={d.id}
                  onClick={() => {
                    selectDistrict(d.id);
                    setIsListOpen(false);
                  }}
                  className="w-full text-left py-2 px-2.5 rounded transition flex items-center justify-between cursor-pointer hover:bg-black/[0.04] active:bg-black/[0.08]"
                >
                  <div>
                    <div className="font-serif font-bold text-sm text-[#261304]">
                      Huyện {d.name}
                    </div>
                    <div className="text-[11px] font-serif text-[#704d2e]">
                      {d.chau}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className={`text-[11px] font-serif font-bold ${
                      hasLamSon ? 'text-[#8c2d19]' : hasMing ? 'text-[#1e3a8a]' : 'text-[#785934]'
                    }`}>
                      {hasLamSon ? '★ Lam Sơn' : hasMing ? '◆ Giặc Minh' : 'Trung lập'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
});

MilitaryBookPanel.displayName = 'MilitaryBookPanel';
