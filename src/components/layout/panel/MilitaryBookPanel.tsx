import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useGameStore } from '../../../store/gameStore';
import { useUIStore } from '../../../store/uiStore';
import districtData from '../../../data/districtPolygons.json';
import type { DistrictInfo } from '../../../types/map';

const DEFAULT_DISTRICTS: DistrictInfo[] = (districtData as any).districts || [];

export const MilitaryBookPanel: React.FC = React.memo(() => {
  const cities = useGameStore(state => state.cities);
  const militaryNotices = useGameStore(state => state.militaryNotices);
  const markNoticesAsRead = useGameStore(state => state.markNoticesAsRead);
  const clearMilitaryNotices = useGameStore(state => state.clearMilitaryNotices);

  const selectCity = useUIStore(state => state.selectCity);
  const selectDistrict = useUIStore(state => state.selectDistrict);
  const setIsListOpen = useUIStore(state => state.setMilitaryBookOpen);

  const [listTab, setListTab] = useState<'bases' | 'districts' | 'notices'>('bases');
  const unreadNoticesCount = (militaryNotices || []).filter(n => !n.read).length;

  return (
    <div 
      className="fixed inset-x-3 bottom-3 md:inset-auto md:absolute md:top-20 md:left-5 z-40 md:w-[380px] max-h-[82vh] flex flex-col pointer-events-auto transition-all duration-300 select-none filter drop-shadow-[0_18px_30px_rgba(0,0,0,0.7)] drop-shadow-[0_3px_8px_rgba(0,0,0,0.45)]"
    >
      {/* Nền giấy Dó sứt mẻ tự nhiên */}
      <img
        src="/parchment_torn_panel.png"
        alt="Tờ giấy Quân Thư sứt mẻ"
        className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none z-0"
        draggable={false}
      />

      {/* Header tờ giấy Quân Thư */}
      <div className="relative z-10 px-7 pt-6 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/icons/scroll.png" alt="Quân Thư" className="w-5 h-5 object-contain filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]" />
          <h2 className="font-serif font-bold text-[#261304] text-lg tracking-wide">
            Quân Cơ Bản Đồ
          </h2>
        </div>
        <button 
          onClick={() => setIsListOpen(false)}
          className="p-1 text-[#593922] hover:text-[#8c2d19] transition cursor-pointer"
          title="Đóng Quân Thư"
        >
          <X size={18} />
        </button>
      </div>

      {/* Thanh chuyển Tab thư pháp */}
      <div className="relative z-10 flex border-b border-[#8c6b44]/25 px-7">
        <button
          onClick={() => setListTab('bases')}
          className={`pb-2 text-xs font-serif font-bold transition cursor-pointer mr-4 ${
            listTab === 'bases' 
              ? 'text-[#8c2d19] border-b-2 border-[#8c2d19]' 
              : 'text-[#6b4a2e] hover:text-[#2d1e13]'
          }`}
        >
          Bản Doanh ({cities.length})
        </button>
        <button
          onClick={() => setListTab('districts')}
          className={`pb-2 text-xs font-serif font-bold transition cursor-pointer mr-4 ${
            listTab === 'districts' 
              ? 'text-[#8c2d19] border-b-2 border-[#8c2d19]' 
              : 'text-[#6b4a2e] hover:text-[#2d1e13]'
          }`}
        >
          Địa Hạt ({DEFAULT_DISTRICTS.length})
        </button>
        <button
          onClick={() => {
            setListTab('notices');
            markNoticesAsRead();
          }}
          className={`pb-2 text-xs font-serif font-bold transition cursor-pointer flex items-center gap-1.5 ${
            listTab === 'notices' 
              ? 'text-[#8c2d19] border-b-2 border-[#8c2d19]' 
              : 'text-[#6b4a2e] hover:text-[#2d1e13]'
          }`}
        >
          <span>Tin Báo</span>
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
      </div>

      {/* Danh sách bản doanh / địa hạt / tin báo */}
      <div className="relative z-10 px-7 pt-3 pb-14 overflow-y-auto space-y-1 no-scrollbar flex-1">
        {listTab === 'bases' ? (
          cities
            .sort((a, b) => (b.faction === 'lam_son' ? 1 : 0) - (a.faction === 'lam_son' ? 1 : 0))
            .map(c => {
              const isLamSon = c.faction === 'lam_son';
              const isMing = c.faction === 'ming';

              return (
                <button
                  key={c.id}
                  onClick={() => {
                    selectCity(c.id);
                    setIsListOpen(false);
                  }}
                  className="w-full text-left py-2 px-2.5 rounded transition flex items-center justify-between cursor-pointer hover:bg-black/[0.04] active:bg-black/[0.08]"
                >
                  <div className="flex items-center gap-2.5">
                    <img
                      src={c.type === 'city' ? '/icons/structure_city.png' : '/icons/structure_camp.png'}
                      alt={c.type === 'city' ? 'Thành' : 'Doanh'}
                      className="w-5 h-5 object-contain shrink-0 filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]"
                    />
                    <div>
                      <div className="font-serif font-bold text-[#261304] text-sm leading-tight">
                        {c.name}
                      </div>
                      <div className="text-[11px] font-serif text-[#704d2e]">
                        {isLamSon ? '★ Bản Doanh Lam Sơn' : isMing ? '◆ Đồn Binh Quân Minh' : 'Căn cứ trung lập'}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-serif font-bold text-xs text-[#8c2d19]">
                      {c.troops > 0 ? `${c.troops.toLocaleString()} binh` : 'Trống'}
                    </span>
                  </div>
                </button>
              );
            })
        ) : listTab === 'districts' ? (
          DEFAULT_DISTRICTS.map(d => {
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
          })
        ) : (
          /* TAB 3: TIN BÁO QUÂN SỰ */
          <div className="space-y-2">
            {militaryNotices.length > 0 && (
              <div className="flex items-center justify-between pb-1.5 border-b border-[#8c6b44]/20 text-[11px] font-serif">
                <span className="text-[#704d2e]">Tổng cộng {militaryNotices.length} tin tức quân cơ</span>
                <button
                  onClick={clearMilitaryNotices}
                  className="text-[#8c2d19] hover:underline cursor-pointer font-bold"
                >
                  Dọn sạch tin
                </button>
              </div>
            )}

            {militaryNotices.length === 0 ? (
              <div className="text-center py-10 text-[#785934] font-serif text-sm">
                <p className="italic">Bờ cõi thanh bình, quân tình yên ả.</p>
                <p className="text-xs text-[#a07e5c] mt-1">Chưa có tin tức vụ thu lương thảo hay rèn khí giới mới.</p>
              </div>
            ) : (
              militaryNotices.map((notice) => {
                const cleanTitle = notice.title.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();

                let noticeIconNode = null;
                if (notice.type === 'harvest') {
                  noticeIconNode = (
                    <img 
                      src="/icons/rice_basket.png" 
                      alt="Vại lúa" 
                      className="w-9 h-9 object-contain shrink-0 filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]" 
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
                      src="/icons/scroll.png" 
                      alt="Tướng tụ nghĩa" 
                      className="w-5 h-5 object-contain shrink-0 filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]" 
                    />
                  );
                } else {
                  noticeIconNode = (
                    <img 
                      src="/icons/structure_camp.png" 
                      alt="Công trình" 
                      className="w-5 h-5 object-contain shrink-0 filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]" 
                    />
                  );
                }

                const typeBadgeText = notice.type === 'harvest'
                  ? 'Thu hoạch vụ mùa'
                  : notice.type === 'forge'
                    ? 'Lò rèn hoàn tất'
                    : notice.type === 'general'
                      ? 'Tướng tụ nghĩa'
                      : 'Công trình khai hoang';

                return (
                  <div 
                    key={notice.id}
                    className="p-2.5 rounded bg-black/[0.03] hover:bg-black/[0.06] border border-[#8c6b44]/15 transition flex flex-col gap-1 text-left"
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

                    <p className="font-serif text-xs text-[#4a2e18] leading-relaxed pl-7">
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
        )}
      </div>
    </div>
  );
});

MilitaryBookPanel.displayName = 'MilitaryBookPanel';
