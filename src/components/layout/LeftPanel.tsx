import React, { useState, useMemo } from 'react';
import { 
  Shield, 
  Users, 
  X, 
  Scroll, 
  Castle, 
  Mountain, 
  Tent, 
  Flag, 
  Award, 
  Hammer, 
  ChevronRight,
  MapPin,
  Truck,
  Trash2
} from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { useUIStore } from '../../store/uiStore';
import { CityPopulationModal } from './panel/CityPopulationModal';
import { CityBuildingTab } from './panel/CityBuildingTab';
import { DistrictDetailPanel } from './panel/DistrictDetailPanel';
import districtData from '../../data/districtPolygons.json';
import { findDistrictForCoord } from '../../utils/mapGeo';
import type { DistrictInfo } from '../../types/map';

export const LeftPanel: React.FC = () => {
  const selectedCityId = useUIStore(state => state.selectedCityId);
  const selectionType = useUIStore(state => state.selectionType);
  const selectCity = useUIStore(state => state.selectCity);
  const selectBase = useUIStore(state => state.selectBase);
  const selectDistrict = useUIStore(state => state.selectDistrict);
  const setBaseRelocateMode = useUIStore(state => state.setBaseRelocateMode);
  const setActiveModal = useUIStore(state => state.setActiveModal);

  const cities = useGameStore(state => state.cities);
  const generals = useGameStore(state => state.generals);
  const resources = useGameStore(state => state.resources);
  const suspicion = useGameStore(state => state.suspicion);

  const startTraining = useGameStore(state => state.startTraining);
  const cancelTraining = useGameStore(state => state.cancelTraining);
  const bribeMingOfficials = useGameStore(state => state.bribeMingOfficials);
  const demolishBase = useGameStore(state => state.demolishBase);

  const [isListOpen, setIsListOpen] = useState(false);
  const [listTab, setListTab] = useState<'bases' | 'districts'>('bases');
  const [activeTab, setActiveTab] = useState<'military' | 'construction'>('military');
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

  const matchedDistrict = useMemo(() => {
    if (!selectedCity) return null;
    return (
      defaultDistricts.find(d => d.id === (selectedCity.districtId || selectedCity.id)) ||
      findDistrictForCoord(selectedCity.x, selectedCity.y, defaultDistricts)
    );
  }, [selectedCity, defaultDistricts]);

  // Kiểm tra xem đã qua thời điểm chính thức dựng cờ khởi nghĩa (07/02/1418) chưa
  // const isPostUprising = year > 1418 || (year === 1418 && (month > 2 || (month === 2 && day >= 7)));

  return (
    <>
      {/* 1. CỤM NÚT MỞ QUÂN THƯ & LỆNH BÀI TƯỚNG (Góc trái) */}
      <div className="absolute top-20 left-3 md:left-4 z-30 flex items-center gap-2 pointer-events-auto">
        {!selectedCityId && (
          <button
            onClick={() => setIsListOpen(!isListOpen)}
            className="group relative flex items-center gap-2 px-3.5 py-2 rounded-lg transition-transform duration-150 hover:scale-105 active:scale-95 shadow-lg cursor-pointer"
            title="Xem Quân Thư & Danh Sách Cứ Điểm"
          >
            <div 
              className="absolute inset-0 rounded-[4px_7px_5px_6px] bg-gradient-to-br from-[#f8efe0] via-[#eedec2] to-[#dfcb9f] border border-[#b3956e]"
              style={{
                filter: 'url(#torn-paper-edge)',
                boxShadow: 'inset 0 0 10px rgba(110, 65, 25, 0.28), 2px 3px 6px rgba(40, 25, 10, 0.35)',
              }}
            />
            <div className="relative z-10 flex items-center gap-2 font-serif font-black text-[#2d1e13] text-sm">
              <Scroll size={17} className="text-[#8c2d19]" />
              <span>Quân Thư</span>
            </div>
          </button>
        )}

        {/* Nút Mở Khay Lệnh Bài Danh Tướng */}
        <button
          onClick={() => setActiveModal('generals')}
          className="group relative flex items-center gap-2 px-3.5 py-2 rounded-lg transition-transform duration-150 hover:scale-105 active:scale-95 shadow-lg cursor-pointer"
          title="Xem Thẻ Bài Đồng Danh Tướng Lam Sơn"
        >
          <div 
            className="absolute inset-0 rounded-[4px_7px_5px_6px] bg-gradient-to-br from-[#8c6239] via-[#6e4a28] to-[#4f3319] border border-[#cfa872]"
            style={{
              filter: 'url(#torn-paper-edge)',
              boxShadow: 'inset 0 0 10px rgba(25, 12, 4, 0.55), 2px 3px 6px rgba(0, 0, 0, 0.5)',
            }}
          />
          <div className="relative z-10 flex items-center gap-2 font-serif font-black text-[#f5dec0] text-sm">
            <Award size={17} className="text-[#ffd27d]" />
            <span>Thẻ Tướng ({unlockedGenerals.length}/{generals.length})</span>
          </div>
        </button>
      </div>

      {/* 2. DANH SÁCH CỨ ĐIỂM (QUÂN THƯ CUỘN GIẤY) */}
      {isListOpen && !selectedCityId && (
        <div 
          className="fixed inset-x-3 bottom-4 md:inset-auto md:absolute md:top-32 md:left-4 z-40 md:w-88 max-h-[70vh] md:max-h-[72vh] flex flex-col pointer-events-auto rounded-xl overflow-hidden shadow-2xl transition-all"
        >
          <div 
            className="absolute inset-0 bg-gradient-to-br from-[#fbf4e6] via-[#f3e4c8] to-[#e3cfa9] border-2 border-[#b3956e]"
            style={{
              boxShadow: 'inset 0 0 20px rgba(110,65,25,0.25), 0 10px 30px rgba(0,0,0,0.5)',
            }}
          />

          <div className="relative z-10 px-4 py-3 border-b border-[#c2a67e] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scroll size={20} className="text-[#8c2d19]" />
              <h2 className="font-serif font-black text-[#2a1708] text-base md:text-lg tracking-wide">
                Bản Đồ Quân Thư
              </h2>
            </div>
            <button 
              onClick={() => setIsListOpen(false)}
              className="p-1 rounded hover:bg-[#d8c29d]/50 text-[#593922] transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Tab Căn Cứ & Địa Bàn Huyện */}
          <div className="relative z-10 flex border-b border-[#c2a67e]/70 bg-[#eeddc2]/60">
            <button
              onClick={() => setListTab('bases')}
              className={`flex-1 py-1.5 font-serif font-bold text-xs uppercase tracking-wider transition cursor-pointer ${
                listTab === 'bases'
                  ? 'border-b-2 border-[#8c2d19] text-[#8c2d19] bg-[#faf3e3]'
                  : 'text-[#6b4a2e] hover:text-[#2d1e13]'
              }`}
            >
              Căn Cứ ({cities.filter(c => c.faction === 'lam_son' || c.troops > 0).length})
            </button>
            <button
              onClick={() => setListTab('districts')}
              className={`flex-1 py-1.5 font-serif font-bold text-xs uppercase tracking-wider transition cursor-pointer ${
                listTab === 'districts'
                  ? 'border-b-2 border-[#8c2d19] text-[#8c2d19] bg-[#faf3e3]'
                  : 'text-[#6b4a2e] hover:text-[#2d1e13]'
              }`}
            >
              24 Huyện Xứ Thanh
            </button>
          </div>

          <div className="relative z-10 p-2 overflow-y-auto space-y-1.5 no-scrollbar">
            {listTab === 'bases' ? (
              cities
                .filter(c => c.faction === 'lam_son' || c.troops > 0)
                .map(c => {
                  const isLamSon = c.faction === 'lam_son';
                  const isMing = c.faction === 'ming';

                  return (
                    <button
                      key={c.id}
                      onClick={() => {
                        selectBase(c.id);
                        setIsListOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg border transition-all flex items-center justify-between cursor-pointer ${
                        isLamSon
                          ? 'bg-[#fcf8f0]/90 border-[#c29080] hover:bg-[#faeee5]'
                          : isMing
                          ? 'bg-[#f5f0e8]/90 border-[#94a3b8] hover:bg-[#ede5d8]'
                          : 'bg-[#faf4e8]/70 border-[#d6c4a8] hover:bg-[#f3e9d6]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {c.type === 'city' ? (
                          <Castle size={16} className={isLamSon ? 'text-[#a82415]' : isMing ? 'text-[#1e3a8a]' : 'text-[#785934]'} />
                        ) : c.type === 'chokepoint' ? (
                          <Mountain size={16} className={isLamSon ? 'text-[#a82415]' : isMing ? 'text-[#1e3a8a]' : 'text-[#785934]'} />
                        ) : (
                          <Tent size={16} className={isLamSon ? 'text-[#a82415]' : isMing ? 'text-[#1e3a8a]' : 'text-[#785934]'} />
                        )}
                        <div>
                          <div className="font-serif font-black text-[#2d1e13] text-sm leading-tight">
                            {c.name}
                          </div>
                          <div className="text-[11px] text-[#6b4a2e]">
                            {isLamSon ? '★ Bản Doanh Lam Sơn' : isMing ? '◆ Đồn Binh Quân Minh' : 'Căn cứ trung lập'}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-bold font-mono text-[#8c2d19]">
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
                    className="w-full text-left px-3 py-2 rounded-lg border border-[#cbb18d] bg-[#fbf5ea] hover:bg-[#faedd8] transition flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <div className="font-serif font-bold text-sm text-[#2a1708]">
                        Huyện {d.name}
                      </div>
                      <div className="text-[10px] text-[#704d2e]">
                        {d.chau}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={`text-[11px] font-serif font-bold px-1.5 py-0.5 rounded border ${
                        hasLamSon ? 'text-amber-800 bg-amber-100 border-amber-400' : hasMing ? 'text-blue-800 bg-blue-100 border-blue-400' : 'text-stone-600 bg-stone-100 border-stone-300'
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

      {/* 3. CHIẾN THƯ CHI TIẾT (BẢNG QUÂN CƠ CĂN CỨ HOẶC ĐỊA HẠT HUYỆN) */}
      {selectedCityId && (
        <div 
          className="fixed inset-x-3 bottom-3 md:inset-auto md:absolute md:top-32 md:left-4 z-40 md:w-96 max-h-[76vh] md:max-h-[80vh] flex flex-col pointer-events-auto rounded-xl overflow-hidden shadow-2xl transition-all duration-200"
        >
          {/* Nền giấy Dó */}
          <div 
            className="absolute inset-0 bg-gradient-to-br from-[#fbf4e6] via-[#f3e4c8] to-[#e3cfa9] border-2 border-[#b3956e]"
            style={{
              boxShadow: 'inset 0 0 25px rgba(110,65,25,0.28), 0 12px 35px rgba(0,0,0,0.55)',
            }}
          />

          <div className="relative z-10 md:hidden w-full pt-2 flex justify-center">
            <div className="w-12 h-1 bg-[#8c6b44]/40 rounded-full" />
          </div>

          {/* TRƯỜNG HỢP 1: XEM CHI TIẾT ĐỊA HẠT HUYỆN */}
          {selectionType === 'district' ? (
            <DistrictDetailPanel districtId={selectedCityId} onClose={() => selectCity(null)} />
          ) : selectedCity ? (
            /* TRƯỜNG HỢP 2: XEM CHI TIẾT CĂN CỨ / BẢN DOANH */
            <>
              {/* Header Căn Cứ */}
              <div className="relative z-10 px-4 pt-3 pb-2 border-b border-[#c2a67e]/80 flex items-start justify-between">
                <div className="flex-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded border mb-1 select-none shadow-xs font-serif text-[11px] font-black uppercase tracking-wider">
                    {selectedCity.faction === 'lam_son' ? (
                      <span className="text-[#a82415] bg-[#ebd3cc] border-[#a84435]/60 px-2 py-0.5 rounded">
                        ★ Bản Doanh Lam Sơn
                      </span>
                    ) : selectedCity.faction === 'ming' ? (
                      <span className="text-[#1e3a8a] bg-[#dbeafe] border-[#1e40af]/60 px-2 py-0.5 rounded">
                        ◆ Đồn Trú Quân Minh
                      </span>
                    ) : (
                      <span className="text-[#654321] bg-[#ece2d0] border-[#8c6b44]/60 px-2 py-0.5 rounded">
                        ▲ Căn Cứ Trung Lập
                      </span>
                    )}
                  </div>

                  <h1 className="font-serif font-black text-[#261304] text-2xl md:text-3xl tracking-wide leading-tight">
                    {selectedCity.name}
                  </h1>

                  <div className="flex items-center gap-2 text-xs font-sans text-[#66462c] font-bold">
                    <span>
                      {selectedCity.type === 'city' 
                        ? 'Thành trì kiên cố' 
                        : selectedCity.type === 'chokepoint' 
                        ? 'Ải / Hiểm địa núi non' 
                        : 'Bản doanh / Thung lũng'}
                    </span>
                    <span>•</span>
                    <span>Tọa độ: {selectedCity.x}°, {selectedCity.y}°</span>
                  </div>

                  {/* Địa hạt Huyện trực thuộc */}
                  {matchedDistrict && (
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-[#8c2d19] font-serif font-bold">
                      <MapPin size={13} />
                      <span>Thuộc địa hạt:</span>
                      <button
                        onClick={() => selectDistrict(matchedDistrict.id)}
                        className="underline hover:text-[#b91c1c] cursor-pointer flex items-center gap-0.5"
                        title="Bấm để xem chi tiết Huyện này"
                      >
                        <span>Huyện {matchedDistrict.name}</span>
                        <ChevronRight size={12} />
                      </button>
                    </div>
                  )}

                  {/* Nút Di dời và Phá hủy Căn cứ (Dành cho Phe Lam Sơn) */}
                  {selectedCity.faction === 'lam_son' && (selectedCity.hasBase || selectedCity.type === 'camp') && (
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[#dfceb5]">
                      <button
                        onClick={() => setBaseRelocateMode({ baseId: selectedCity.id })}
                        className="flex-1 py-1.5 px-2.5 rounded bg-[#8c2d19] hover:bg-[#a63721] text-[#fbebd0] text-xs font-serif font-bold flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
                        title="Di dời căn cứ đến vị trí mới trên bản đồ (lưới địa hình)"
                      >
                        <Truck size={13} />
                        <span>Di Dời Căn Cứ</span>
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
                        className={`py-1.5 px-2.5 rounded text-xs font-serif font-bold flex items-center justify-center gap-1 shadow-xs transition ${
                          lamSonBasesCount <= 1
                            ? 'bg-stone-300 text-stone-500 cursor-not-allowed opacity-60'
                            : 'bg-[#451a03] hover:bg-[#5f2405] text-[#fde047] cursor-pointer'
                        }`}
                        title={lamSonBasesCount <= 1 ? "Căn cứ duy nhất của nghĩa quân, không thể giải thể!" : "Giải thể căn cứ và rút quân về căn cứ gần nhất"}
                      >
                        <Trash2 size={13} />
                        <span>Phá Hủy</span>
                      </button>
                    </div>
                  )}
                </div>

                <button 
                  onClick={() => selectCity(null)}
                  className="p-1.5 rounded-full hover:bg-[#d8c29d]/60 text-[#593922] transition ml-2 shrink-0 cursor-pointer"
                  title="Đóng Quân Thư"
                >
                  <X size={20} />
                </button>
              </div>

              {/* THANH TAB CHUYỂN ĐỔI: "QUÂN CƠ" & "XÂY DỰNG" (Dành cho vùng đất Nghĩa quân) */}
              {selectedCity.faction === 'lam_son' && (
                <div className="relative z-10 flex border-b border-[#c2a67e]/70 bg-[#ebdec5]/50">
                  <button
                    onClick={() => setActiveTab('military')}
                    className={`flex-1 py-2 font-serif font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      activeTab === 'military'
                        ? 'border-b-2 border-[#8c2d19] text-[#8c2d19] bg-[#fbf4e6]'
                        : 'text-[#6b4a2e] hover:text-[#2d1e13]'
                    }`}
                  >
                    <Flag size={14} />
                    <span>Quân Cơ & Lãnh Địa</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('construction')}
                    className={`flex-1 py-2 font-serif font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      activeTab === 'construction'
                        ? 'border-b-2 border-[#8c2d19] text-[#8c2d19] bg-[#fbf4e6]'
                        : 'text-[#6b4a2e] hover:text-[#2d1e13]'
                    }`}
                  >
                    <Hammer size={14} />
                    <span>Xây Dựng Bản Doanh</span>
                  </button>
                </div>
              )}

              {/* THÂN CHIẾN THƯ */}
              <div className="relative z-10 p-4 overflow-y-auto space-y-3.5 no-scrollbar">
                
                {activeTab === 'construction' && selectedCity.faction === 'lam_son' ? (
                  /* TAB XÂY DỰNG BẢN DOANH */
                  <CityBuildingTab
                    city={selectedCity}
                    goldAvailable={resources.gold}
                    suspicion={suspicion}
                    onBribe={bribeMingOfficials}
                  />
                ) : (
                  /* TAB QUÂN CƠ & LÃNH ĐỊA */
                  <>
                    {/* 1. Thông Tin Quân Lực & Phòng Thủ */}
                    <div className="grid grid-cols-2 gap-2.5">
                      {/* Ô QUÂN ĐỒN TRÚ */}
                      <div 
                        onClick={() => {
                          if (selectedCity.faction === 'lam_son') {
                            setIsPopulationModalOpen(true);
                          }
                        }}
                        className={`p-3 rounded-lg bg-[#f9f3e6] border shadow-xs transition ${
                          selectedCity.faction === 'lam_son'
                            ? 'border-[#a87c4f] hover:border-[#8c2d19] hover:bg-[#fbf4ea] cursor-pointer group'
                            : 'border-[#c9b28f]'
                        }`}
                        title={selectedCity.faction === 'lam_son' ? "Bấm vào để xem chi tiết Nghĩa binh, Tráng phu và Thao luyện võ nghệ" : undefined}
                      >
                        <div className="flex items-center justify-between text-sm text-[#704d2e] font-bold">
                          <div className="flex items-center gap-1.5">
                            <Users size={15} className="text-[#8c2d19]" />
                            <span>Quân đồn trú</span>
                          </div>
                          {selectedCity.faction === 'lam_son' && (
                            <ChevronRight size={14} className="text-[#8c2d19] group-hover:translate-x-0.5 transition-transform" />
                          )}
                        </div>
                        <div className="mt-1 font-sans font-bold text-2xl text-[#2a1708] flex items-baseline gap-1">
                          <span>{selectedCity.troops.toLocaleString()}</span>
                          <span className="text-xs font-normal text-[#5c3e23]">binh</span>
                        </div>

                        {selectedCity.faction === 'lam_son' && selectedCity.population && (
                          <div className="mt-1 text-[10.5px] text-[#8c4b26] font-sans font-bold border-t border-[#dfceb5] pt-1 leading-tight flex items-center justify-between">
                            <span>Chi tiết nhân lực</span>
                            <span className="text-[#a82415] underline">Thao luyện →</span>
                          </div>
                        )}
                      </div>

                      <div className="p-3 rounded-lg bg-[#f9f3e6] border border-[#c9b28f] shadow-xs">
                        <div className="flex items-center gap-1.5 text-sm text-[#704d2e] font-bold">
                          <Shield size={15} className="text-[#3b5998]" />
                          <span>Địa thế phòng thủ</span>
                        </div>
                        <div className="mt-1 font-serif font-black text-lg text-[#2a1708]">
                          {selectedCity.type === 'city' ? 'Kiên thành' : selectedCity.type === 'chokepoint' ? 'Hiểm trở' : 'Căn cứ dã chiến'}
                        </div>
                        <div className="text-[10px] text-[#704d2e]">Khó công dễ thủ</div>
                      </div>
                    </div>

                    {/* 2. Danh Sách Tướng Lĩnh Đóng Trú */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-serif font-black text-[#5c3e23] uppercase tracking-wider">
                        <div className="flex items-center gap-1.5">
                          <Award size={14} className="text-[#8c2d19]" />
                          <span>Tướng Lĩnh Đóng Trú ({stationedGenerals.length})</span>
                        </div>
                      </div>

                      {stationedGenerals.length === 0 ? (
                        <div className="p-3 rounded-lg bg-[#f5ecda]/60 border border-dashed border-[#c2a67e] text-center text-xs text-[#704d2e]">
                          Chưa có danh tướng nào đóng quân tại đây.
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {stationedGenerals.map(gen => (
                            <div 
                              key={gen.id}
                              className="p-2.5 rounded-lg bg-[#f9f3e6] border border-[#c9b28f] flex items-center justify-between shadow-xs"
                            >
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-[#8c2d19] text-[#f5dec0] flex items-center justify-center font-serif font-bold text-xs">
                                  {gen.name.charAt(0)}
                                </div>
                                <div>
                                  <div className="font-serif font-bold text-xs text-[#2a1708]">{gen.name}</div>
                                  <div className="text-[10px] text-[#704d2e]">{gen.title}</div>
                                </div>
                              </div>
                              <div className="text-right text-[11px] font-mono text-[#8c2d19] font-bold">
                                {gen.stats.command} Thống / {gen.stats.martial} Võ
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </>
          ) : null}
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
