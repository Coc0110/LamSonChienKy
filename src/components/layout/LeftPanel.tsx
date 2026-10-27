import React, { useState, useMemo } from 'react';
import {
  X,
  Scroll,
} from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { useUIStore } from '../../store/uiStore';
import { CityPopulationModal } from './panel/CityPopulationModal';
import { DistrictDetailPanel } from './panel/DistrictDetailPanel';
import { MiniGeneralCard } from '../generals/MiniGeneralCard';
import districtData from '../../data/districtPolygons.json';
import type { DistrictInfo } from '../../types/map';

export const LeftPanel: React.FC = () => {
  const selectedCityId = useUIStore(state => state.selectedCityId);
  const selectionType = useUIStore(state => state.selectionType);
  const selectCity = useUIStore(state => state.selectCity);
  const selectDistrict = useUIStore(state => state.selectDistrict);
  const setBaseRelocateMode = useUIStore(state => state.setBaseRelocateMode);
  const baseRelocateMode = useUIStore(state => state.baseRelocateMode);
  const placementMode = useUIStore(state => state.placementMode);
  const setPlacementMode = useUIStore(state => state.setPlacementMode);
  const setActiveModal = useUIStore(state => state.setActiveModal);

  const cities = useGameStore(state => state.cities);
  const generals = useGameStore(state => state.generals);
  const resources = useGameStore(state => state.resources);

  const startTraining = useGameStore(state => state.startTraining);
  const cancelTraining = useGameStore(state => state.cancelTraining);
  const demolishBase = useGameStore(state => state.demolishBase);

  const isListOpen = useUIStore(state => state.isMilitaryBookOpen);
  const setIsListOpen = useUIStore(state => state.setMilitaryBookOpen);
  const [listTab, setListTab] = useState<'bases' | 'districts'>('bases');
  const isBuildPaperOpen = useUIStore(state => state.isBuildPaperOpen);
  const setIsBuildPaperOpen = useUIStore(state => state.setBuildPaperOpen);





  const [isPopulationModalOpen, setIsPopulationModalOpen] = useState(false);

  const defaultDistricts: DistrictInfo[] = (districtData as any).districts || [];

  const selectedCity = useMemo(() => cities.find(c => c.id === selectedCityId), [cities, selectedCityId]);
  const unlockedGenerals = useMemo(() => generals.filter(g => g.unlocked), [generals]);
  const stationedGenerals = useMemo(
    () => unlockedGenerals.filter(g => g.locationId === selectedCityId),
    [unlockedGenerals, selectedCityId]
  );

  const lamSonBases = useMemo(
    () => cities.filter(c => c.faction === 'lam_son' && (c.hasBase || c.type === 'camp')),
    [cities]
  );
  const lamSonBasesCount = lamSonBases.length;
  const activeLamSonBase = useMemo(
    () => (selectedCity && selectedCity.faction === 'lam_son') ? selectedCity : (lamSonBases[0] || cities.find(c => c.faction === 'lam_son')),
    [selectedCity, lamSonBases, cities]
  );

  return (
    <>
      {/* 2. QUÂN THƯ DANH SÁCH BẢN DOANH & ĐỊA HẠT (DẠNG TỜ GIẤY SỨT MẺ) */}
      {isListOpen && (
        <div 
          className="fixed inset-x-3 bottom-3 md:inset-auto md:absolute md:top-20 md:left-5 z-40 md:w-[380px] max-h-[82vh] flex flex-col pointer-events-auto transition-all duration-300 select-none filter drop-shadow-[0_18px_30px_rgba(0,0,0,0.7)] drop-shadow-[0_3px_8px_rgba(0,0,0,0.45)]"
        >
          {/* Nền giấy Dó sứt mẻ tự nhiên đồng bộ với giấy báo cáo */}
          <img
            src="/parchment_torn_panel.png"
            alt="Tờ giấy Quân Thư sứt mẻ"
            className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none z-0"
            draggable={false}
          />

          {/* Header tờ giấy Quân Thư: Thuần chữ trên giấy, không viền nhân tạo */}
          <div className="relative z-10 px-7 pt-6 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scroll size={18} className="text-[#8c2d19]" />
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

          {/* Thanh chuyển Tab thư pháp: Không hộp chữ nhật, chỉ gạch mực thanh tao */}
          <div className="relative z-10 flex border-b border-[#8c6b44]/25 px-7">
            <button
              onClick={() => setListTab('bases')}
              className={`pb-2 text-xs font-serif font-bold transition cursor-pointer mr-6 ${
                listTab === 'bases' 
                  ? 'text-[#8c2d19] border-b-2 border-[#8c2d19]' 
                  : 'text-[#6b4a2e] hover:text-[#2d1e13]'
              }`}
            >
              Bản Doanh ({cities.length})
            </button>
            <button
              onClick={() => setListTab('districts')}
              className={`pb-2 text-xs font-serif font-bold transition cursor-pointer ${
                listTab === 'districts' 
                  ? 'text-[#8c2d19] border-b-2 border-[#8c2d19]' 
                  : 'text-[#6b4a2e] hover:text-[#2d1e13]'
              }`}
            >
              Địa Hạt ({defaultDistricts.length})
            </button>
          </div>

          {/* Danh sách bản doanh / địa hạt: Loại bỏ hoàn toàn các khung viền chữ nhật, thuần chữ và số trên giấy */}
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
            ) : (
              defaultDistricts.map(d => {
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
            )}
          </div>
        </div>
      )}

      {/* 3. CHIẾN THƯ CHI TIẾT (CHỈ HIỂN THỊ KHI KHÔNG MỞ QUÂN THƯ DANH SÁCH) */}
      {!isListOpen && selectedCityId && (
        <div 
          className="fixed inset-x-3 bottom-3 md:inset-auto md:absolute md:top-24 md:left-6 z-30 md:w-[410px] max-h-[82vh] flex flex-col pointer-events-auto transition-all duration-300 select-none filter drop-shadow-[0_18px_30px_rgba(0,0,0,0.7)] drop-shadow-[0_3px_8px_rgba(0,0,0,0.45)]"
        >
          {/* Nền giấy Dó sứt mẻ tự nhiên theo ảnh xoay dọc */}
          <img
            src="/parchment_torn_panel.png"
            alt="Giấy sứt mẻ tự nhiên"
            className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none z-0"
            draggable={false}
          />

          {/* TRƯỜNG HỢP 1: XEM CHI TIẾT ĐỊA HẠT HUYỆN */}
          {selectionType === 'district' ? (
            <DistrictDetailPanel districtId={selectedCityId} onClose={() => selectCity(null)} />
          ) : selectedCity ? (
            /* TRƯỜNG HỢP 2: XEM CHI TIẾT CĂN CỨ / BẢN DOANH */
            <>
              {/* TIÊU ĐỀ BẢN DOANH & NÚT HÀNH ĐỘNG VẾT MỰC */}
              <div className="relative z-10 px-7 pt-6 pb-1 flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-serif font-bold text-xs uppercase tracking-widest text-[#8c2d19]">
                      {selectedCity.faction === 'lam_son' ? 'Bản Doanh Nghĩa Binh' : 'Quân Đồn Trú'}
                    </span>
                    <span className="text-[11px] font-serif text-[#704d2e]">
                      {selectedCity.faction === 'lam_son' ? 'Đại Bản Doanh' : 'Căn Cứ'}
                    </span>
                  </div>

                  <h3 className="font-serif font-bold text-2xl text-[#261304] tracking-wide mt-0.5 truncate">
                    {selectedCity.name}
                  </h3>

                  {/* NÚT THAO TÁC DẠNG VẾT MỰC: XÂY DỰNG, DI DỜI, PHÁ HỦY */}
                  {selectedCity.faction === 'lam_son' && (
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
                            alert('Nghĩa quân cần ít nhất một căn cứ để duy trì đại nghiệp! Không thể giải thể bản doanh cuối cùng.');
                            return;
                          }
                          if (confirm(`Bạn có chắc chắn muốn giải thể Căn cứ [${selectedCity.name}]?\n\nToàn bộ ${selectedCity.troops} quân binh, tráng phu và danh tướng sẽ tự động rút về tụ hợp tại căn cứ gần nhất.`)) {
                            const res = demolishBase(selectedCity.id);
                            alert(res.message);
                          }
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

              {/* THÂN CHIẾN THƯ: Đã tăng pb-14 để không bao giờ bị tràn vào mép rách */}
              <div className="relative z-10 px-7 pt-2 pb-14 overflow-y-auto space-y-3.5 no-scrollbar flex-1">
                {/* 1. Thông Tin Quân Lực & Phòng Thủ */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Ô QUÂN ĐỒN TRÚ */}
                  <div 
                    onClick={() => {
                      if (selectedCity.faction === 'lam_son') {
                        setIsPopulationModalOpen(true);
                      }
                    }}
                    className={selectedCity.faction === 'lam_son' ? 'cursor-pointer group' : ''}
                    title={selectedCity.faction === 'lam_son' ? "Bấm vào để xem chi tiết Nghĩa binh, Tráng phu và Thao luyện võ nghệ" : undefined}
                  >
                    <div className="text-xs font-serif font-bold text-[#704d2e]">
                      Quân đồn trú
                    </div>
                    <div className="mt-0.5 font-serif text-2xl text-[#2a1708] flex items-baseline gap-1">
                      <span className="font-serif font-bold">{selectedCity.troops.toLocaleString()}</span>
                      <span className="text-xs font-normal text-[#5c3e23]">binh</span>
                    </div>

                    {selectedCity.faction === 'lam_son' && selectedCity.population && (
                      <div className="mt-0.5 text-[11px] text-[#8c4b26] font-serif">
                        <span>Chi tiết nhân lực • </span>
                        <span className="text-[#a82415] underline font-serif font-bold">Thao luyện</span>
                      </div>
                    )}
                  </div>

                  {/* Ô PHÒNG THỦ */}
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

                {/* 2. Danh Sách Tướng Lĩnh Đóng Trú (6 thẻ / hàng) */}
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

                {/* 3. Dân Số & Lòng Dân: Dùng font thường chuẩn font-serif, không bị in đậm hay font Hanzi */}
                {selectedCity.faction === 'lam_son' && selectedCity.population && (
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
          ) : null}
        </div>
      )}

      {/* 4. TỜ GIẤY CÔNG TRÌNH XÂY DỰNG MỞ PHÍA BÊN PHẢI (CHỈ HIỂN THỊ HÌNH VÀ TÊN 3 CÔNG TRÌNH) */}
      {!isListOpen && isBuildPaperOpen && activeLamSonBase && (
        <div 
          className={`fixed inset-x-3 bottom-3 md:inset-auto md:absolute md:top-24 ${selectedCity && selectedCity.faction === 'lam_son' ? 'md:left-[445px]' : 'md:left-6'} z-40 md:w-56 max-h-[78vh] flex flex-col pointer-events-auto transition-all duration-200 select-none filter drop-shadow-[0_18px_30px_rgba(0,0,0,0.7)] drop-shadow-[0_3px_8px_rgba(0,0,0,0.45)]`}
        >
          {/* Nền giấy sứt mẻ đồng bộ */}
          <img
            src="/parchment_torn_panel.png"
            alt="Giấy công trình sứt mẻ"
            className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none z-0"
            draggable={false}
          />

          <div className="relative z-10 px-5 pt-5 pb-12 flex flex-col h-full">
            {/* Header tờ giấy công trình */}
            <div className="flex items-center justify-between pb-1.5 mb-1 border-b border-[#8c6b44]/25">
              <span className="font-serif font-bold text-xs uppercase tracking-wider text-[#8c2d19]">
                Công Trình
              </span>
              <button 
                onClick={() => setIsBuildPaperOpen(false)}
                className="p-1 text-[#593922] hover:text-[#8c2d19] transition cursor-pointer"
                title="Đóng giấy công trình"
              >
                <X size={18} />
              </button>
            </div>

            {/* 3 Công Trình: Chỉ hiển thị hình (icon tạm) và tên công trình */}
            <div className="flex flex-col gap-2 pt-2">
              {/* 1. CĂN CỨ */}
              <button
                type="button"
                onClick={() => {
                  if (baseRelocateMode?.baseId === activeLamSonBase.id) {
                    setBaseRelocateMode(null);
                  } else {
                    setPlacementMode(null);
                    setBaseRelocateMode({ baseId: activeLamSonBase.id });
                  }
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded transition-all cursor-pointer ${
                  baseRelocateMode?.baseId === activeLamSonBase.id
                    ? 'bg-[#8c2d19]/20 ring-1 ring-[#8c2d19]/50'
                    : 'hover:bg-black/[0.05] active:bg-black/[0.1]'
                }`}
                title="Căn Cứ"
              >
                <div className="w-9 h-9 rounded flex items-center justify-center shrink-0 bg-[#3a2010]/10 p-1">
                  <img src="/icons/structure_camp.png" alt="Căn Cứ" className="w-full h-full object-contain filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]" />
                </div>
                <div className="flex items-center justify-between flex-1">
                    <span className="font-serif font-bold text-sm text-[#261304]">Căn Cứ</span>
                    <span className="text-[10px] font-mono text-[#8c2d19] font-bold">Doanh Trại</span>
                  </div>
              </button>

              {/* 2. RUỘNG */}
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => {
                    if (placementMode?.type === 'farm') {
                      setPlacementMode(null);
                    } else {
                      setBaseRelocateMode(null);
                      setPlacementMode({ type: 'farm', cityId: activeLamSonBase.id, gridSize: 5, farmTier: 15 });
                    }
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded transition-all cursor-pointer ${
                    placementMode?.type === 'farm'
                      ? 'bg-[#854d0e]/20 ring-1 ring-[#854d0e]/50'
                      : 'hover:bg-black/[0.05] active:bg-black/[0.1]'
                  }`}
                  title="Ruộng Lúa Nước"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded flex items-center justify-center shrink-0 bg-[#3a2010]/10 p-1">
                      <img src="/icons/structure_farm.png" alt="Ruộng" className="w-full h-full object-contain filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]" />
                    </div>
                    <span className="font-serif font-bold text-sm text-[#261304]">
                      Ruộng Nương
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-[#8c2d19] font-bold">
                    {placementMode?.type === 'farm' ? `${placementMode.gridSize || 5}x${placementMode.gridSize || 5}` : '3 mốc'}
                  </span>
                </button>

                {/* 3 mốc quy mô Ruộng: 5x5, 6x6, 7x7 */}
                {placementMode?.type === 'farm' && (
                  <div className="grid grid-cols-3 gap-1 px-1 pt-0.5">
                    {[
                      { size: 5, workers: 15, label: '5x5 (15 đinh)' },
                      { size: 6, workers: 30, label: '6x6 (30 đinh)' },
                      { size: 7, workers: 50, label: '7x7 (50 đinh)' },
                    ].map(t => {
                      const isSel = (placementMode.gridSize || 5) === t.size;
                      return (
                        <button
                          key={t.size}
                          type="button"
                          onClick={() => setPlacementMode({
                            ...placementMode,
                            gridSize: t.size,
                            farmTier: t.workers as any,
                          })}
                          className={`py-1 text-[10px] font-serif font-bold rounded transition cursor-pointer text-center ${
                            isSel
                              ? 'bg-[#8c2d19] text-[#fcf4e4] shadow-xs'
                              : 'bg-black/[0.06] hover:bg-black/[0.1] text-[#3d2714]'
                          }`}
                        >
                          {t.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 3. LÒ RÈN */}
              <button
                type="button"
                onClick={() => {
                  if (placementMode?.type === 'forge') {
                    setPlacementMode(null);
                  } else {
                    setBaseRelocateMode(null);
                    setPlacementMode({ type: 'forge', cityId: activeLamSonBase.id });
                  }
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded transition-all cursor-pointer ${
                  placementMode?.type === 'forge'
                    ? 'bg-[#3d2714]/20 ring-1 ring-[#3d2714]/50'
                    : 'hover:bg-black/[0.05] active:bg-black/[0.1]'
                }`}
                title="Lò Rèn"
              >
                <div className="w-9 h-9 rounded flex items-center justify-center shrink-0 bg-[#3a2010]/10 p-1">
                  <img src="/icons/structure_forge.png" alt="Lò Rèn" className="w-full h-full object-contain filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]" />
                </div>
                <div className="flex items-center justify-between flex-1">
                    <span className="font-serif font-bold text-sm text-[#261304]">Lò Rèn</span>
                    <span className="text-[10px] font-mono text-[#8c2d19] font-bold">3x3</span>
                  </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP CHI TIẾT DÂN CƯ & THAO LUYỆN NGHĨA BINH */}
      {isPopulationModalOpen && selectedCity && selectedCity.population && (
        <CityPopulationModal
          city={selectedCity}
          generals={stationedGenerals}
          weaponsAvailable={resources.weapons}
          onClose={() => setIsPopulationModalOpen(false)}
          onStartTraining={startTraining}
          onCancelTraining={cancelTraining}
        />
      )}
    </>
  );
};
