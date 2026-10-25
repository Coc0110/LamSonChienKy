import React, { useState, useMemo } from 'react';
import { 
  Swords, 
  Shield, 
  Users, 
  Wheat, 
  Eye, 
  X, 
  Scroll, 
  Castle, 
  Mountain, 
  Tent, 
  Flag, 
  Award, 
  Hammer, 
  ChevronRight 
} from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { useUIStore } from '../../store/uiStore';
import { CityPopulationModal } from './panel/CityPopulationModal';
import { CityBuildingTab } from './panel/CityBuildingTab';

export const LeftPanel: React.FC = () => {
  const selectedCityId = useUIStore(state => state.selectedCityId);
  const selectCity = useUIStore(state => state.selectCity);
  const setActiveModal = useUIStore(state => state.setActiveModal);

  const cities = useGameStore(state => state.cities);
  const generals = useGameStore(state => state.generals);
  const resources = useGameStore(state => state.resources);
  const suspicion = useGameStore(state => state.suspicion);
  const year = useGameStore(state => state.year);
  const month = useGameStore(state => state.month);
  const day = useGameStore(state => state.day);

  const startTraining = useGameStore(state => state.startTraining);
  const cancelTraining = useGameStore(state => state.cancelTraining);
  const bribeMingOfficials = useGameStore(state => state.bribeMingOfficials);

  const [isListOpen, setIsListOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'military' | 'construction'>('military');
  const [isPopulationModalOpen, setIsPopulationModalOpen] = useState(false);

  const selectedCity = useMemo(() => cities.find(c => c.id === selectedCityId), [cities, selectedCityId]);
  const unlockedGenerals = useMemo(() => generals.filter(g => g.unlocked), [generals]);
  const stationedGenerals = useMemo(
    () => unlockedGenerals.filter(g => g.locationId === selectedCityId),
    [unlockedGenerals, selectedCityId]
  );

  // Kiểm tra xem đã qua thời điểm chính thức dựng cờ khởi nghĩa (07/02/1418) chưa
  const isPostUprising = year > 1418 || (year === 1418 && (month > 2 || (month === 2 && day >= 7)));

  return (
    <>
      {/* 1. CỤM NÚT MỞ QUÂN THƯ & LỆNH BÀI TƯỚNG (Góc trái) */}
      <div className="absolute top-20 left-3 md:left-4 z-30 flex items-center gap-2 pointer-events-auto">
        {!selectedCity && (
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
      {isListOpen && !selectedCity && (
        <div 
          className="fixed inset-x-3 bottom-4 md:inset-auto md:absolute md:top-32 md:left-4 z-40 md:w-84 max-h-[70vh] md:max-h-[72vh] flex flex-col pointer-events-auto rounded-xl overflow-hidden shadow-2xl transition-all"
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

          <div className="relative z-10 p-2 overflow-y-auto space-y-1.5 no-scrollbar">
            {cities.map(c => {
              const isLamSon = c.faction === 'lam_son';
              const isMing = c.faction === 'ming';

              return (
                <button
                  key={c.id}
                  onClick={() => {
                    selectCity(c.id);
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
                        {isLamSon ? 'Nghĩa Quân' : isMing ? 'Quân Minh' : 'Trung Lập'}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold text-[#3b2d1f]">
                      {c.troops > 0 ? `${c.troops.toLocaleString()} quân` : 'Trống'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. CHIẾN THƯ CHI TIẾT CỨ ĐIỂM (BẢNG QUÂN CƠ & XÂY DỰNG) */}
      {selectedCity && (
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

          {/* Header Chiến Thư */}
          <div className="relative z-10 px-4 pt-3 pb-2 border-b border-[#c2a67e]/80 flex items-start justify-between">
            <div className="flex-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded border mb-1 select-none shadow-xs font-serif text-[11px] font-black uppercase tracking-wider">
                {selectedCity.faction === 'lam_son' ? (
                  <span className="text-[#a82415] bg-[#ebd3cc] border-[#a84435]/60 px-2 py-0.5 rounded">
                    ★ Khởi Nghĩa Lam Sơn
                  </span>
                ) : selectedCity.faction === 'ming' ? (
                  <span className="text-[#1e3a8a] bg-[#dbeafe] border-[#1e40af]/60 px-2 py-0.5 rounded">
                    ◆ Đồn Trú Quân Minh
                  </span>
                ) : (
                  <span className="text-[#654321] bg-[#ece2d0] border-[#8c6b44]/60 px-2 py-0.5 rounded">
                    ▲ Bản Làng Trung Lập
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
                    : 'Bản doanh / Thung lũng ven sông'}
                </span>
                <span>•</span>
                <span>Tọa độ: {selectedCity.x}°, {selectedCity.y}°</span>
              </div>
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
                  {/* Ô QUÂN ĐỒN TRÚ (Nhấp vào để mở Bảng Chi Tiết Quân Số & Thao Luyện) */}
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
                    <div className="mt-1 font-sans text-xs text-[#2a1708] leading-tight font-bold">
                      {selectedCity.type === 'city' 
                        ? 'Thành cao hào sâu kiên cố' 
                        : selectedCity.type === 'chokepoint' 
                        ? 'Dốc đứng một người địch muôn người' 
                        : 'Dựa vào rừng núi hiểm trở giấu quân'}
                    </div>
                  </div>
                </div>

                {/* 1.5. Tướng Lĩnh Trấn Thủ */}
                {selectedCity.faction === 'lam_son' && (
                  <div className="p-3 rounded-lg bg-[#f4e8d1] border border-[#c4a87e] space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#5c3e23]">
                        <Award size={14} className="text-[#8c2d19]" />
                        <span>Tướng Trấn Thủ ({stationedGenerals.length})</span>
                      </div>
                      <button
                        onClick={() => setActiveModal('generals')}
                        className="text-[11px] font-bold text-[#8c2d19] hover:underline cursor-pointer"
                      >
                        Xem Lệnh Bài →
                      </button>
                    </div>

                    {stationedGenerals.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto no-scrollbar">
                        {stationedGenerals.map(gen => (
                          <button
                            key={gen.id}
                            onClick={() => setActiveModal('generals')}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-gradient-to-b from-[#8c6239] to-[#5e3e1f] border border-[#cfa872] text-[#f7e7c8] text-xs font-serif font-bold shadow-xs hover:brightness-110 transition cursor-pointer"
                            title={`${gen.title} • ${gen.epithet}`}
                          >
                            <span className="text-[#ffd27d]">{gen.hanzi}</span>
                            <span>{gen.name}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs italic text-[#785838]">
                        Chưa có tướng trấn thủ tại đây.
                      </div>
                    )}
                  </div>
                )}

                {/* 2. Thẻ Lệnh Quân Sự */}
                <div className="pt-1">
                  <div className="text-sm font-sans font-bold text-[#5c3e23] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Flag size={15} className="text-[#8c2d19]" />
                    <span>Hạ Lệnh Quân Cơ</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {selectedCity.faction === 'lam_son' ? (
                      <>
                        <button 
                          onClick={() => alert(`Đã phát lệnh Xuất Binh từ ${selectedCity.name}!`)}
                          className="flex flex-col items-center justify-center p-2.5 rounded-lg bg-gradient-to-b from-[#f7ebd7] to-[#ebd2af] border border-[#a88252] hover:from-[#fcf4e8] hover:to-[#f0dbbd] active:scale-95 transition shadow-xs group cursor-pointer"
                        >
                          <Swords size={20} className="text-[#8c2d19] group-hover:scale-110 transition-transform mb-1" />
                          <span className="font-sans font-bold text-xs text-[#2a1708]">Xuất Binh</span>
                        </button>

                        <button 
                          onClick={() => {
                            if (!isPostUprising) {
                              alert(`Thời điểm trước ngày 07/02/1418: Căn cứ Lam Sơn đang bí mật cưu mang lưu dân tị nạn, chưa thể công khai chiêu binh để tránh giặc Minh đàn áp!`);
                            } else {
                              alert(`Chiêu mộ thêm tráng đinh vào hàng ngũ Nghĩa quân tại ${selectedCity.name}!`);
                            }
                          }}
                          className="flex flex-col items-center justify-center p-2.5 rounded-lg bg-gradient-to-b from-[#f7ebd7] to-[#ebd2af] border border-[#a88252] hover:from-[#fcf4e8] hover:to-[#f0dbbd] active:scale-95 transition shadow-xs group cursor-pointer"
                        >
                          <Users size={20} className="text-[#2b593f] group-hover:scale-110 transition-transform mb-1" />
                          <span className="font-sans font-bold text-xs text-[#2a1708]">
                            {isPostUprising ? 'Chiêu Quân' : 'Cưu Mang Dân'}
                          </span>
                        </button>

                        <button 
                          onClick={() => alert(`Thu gom lương thảo, chuẩn bị quân nhu tại ${selectedCity.name}!`)}
                          className="col-span-2 sm:col-span-1 flex flex-col items-center justify-center p-2.5 rounded-lg bg-gradient-to-b from-[#f7ebd7] to-[#ebd2af] border border-[#a88252] hover:from-[#fcf4e8] hover:to-[#f0dbbd] active:scale-95 transition shadow-xs group cursor-pointer"
                        >
                          <Wheat size={20} className="text-[#85531b] group-hover:scale-110 transition-transform mb-1" />
                          <span className="font-sans font-bold text-xs text-[#2a1708]">Thu Lương</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button 
                          onClick={() => alert(`Khởi binh tiến đánh ${selectedCity.name}!`)}
                          className="flex flex-col items-center justify-center p-2.5 rounded-lg bg-gradient-to-b from-[#eed4cc] to-[#dcaba0] border border-[#a84435] hover:from-[#f5dfd8] hover:to-[#e4b5ab] active:scale-95 transition shadow-xs group cursor-pointer"
                        >
                          <Swords size={20} className="text-[#a82415] group-hover:scale-110 transition-transform mb-1" />
                          <span className="font-sans font-bold text-xs text-[#52130b]">Công Thành</span>
                        </button>

                        <button 
                          onClick={() => alert(`Cử thám mã thâm nhập do thám binh lực ${selectedCity.name}!`)}
                          className="flex flex-col items-center justify-center p-2.5 rounded-lg bg-gradient-to-b from-[#f7ebd7] to-[#ebd2af] border border-[#a88252] hover:from-[#fcf4e8] hover:to-[#f0dbbd] active:scale-95 transition shadow-xs group cursor-pointer"
                        >
                          <Eye size={20} className="text-[#3b5998] group-hover:scale-110 transition-transform mb-1" />
                          <span className="font-sans font-bold text-xs text-[#2a1708]">Do Thám</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Lời trích dẫn sử lược */}
                <div className="p-3 rounded-lg bg-[#efe3cb]/70 border border-[#cbba9e] text-[#54341c] font-sans text-xs leading-relaxed text-center font-bold">
                  "Đất Lam Sơn hiểm trở, nước sông Chu trong vắt, người xứ Thanh hào kiệt quy tụ một lòng dấy nghĩa..."
                </div>
              </>
            )}

          </div>
        </div>
      )}

      {/* 4. MODAL CHI TIẾT QUÂN SỐ & THANH KÉO 3 MÀU THAO LUYỆN */}
      {isPopulationModalOpen && selectedCity && (
        <CityPopulationModal
          city={selectedCity}
          generals={stationedGenerals.length > 0 ? stationedGenerals : unlockedGenerals}
          weaponsAvailable={resources.weapons}
          onStartTraining={startTraining}
          onCancelTraining={cancelTraining}
          onClose={() => setIsPopulationModalOpen(false)}
        />
      )}
    </>
  );
};
