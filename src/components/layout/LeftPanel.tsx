import React, { useState, useMemo } from 'react';
import { Swords, Shield, Users, Wheat, Eye, X, Scroll, Castle, Mountain, Tent, Flag } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { useUIStore } from '../../store/uiStore';

export const LeftPanel: React.FC = () => {
  const selectedCityId = useUIStore(state => state.selectedCityId);
  const selectCity = useUIStore(state => state.selectCity);
  const cities = useGameStore(state => state.cities);
  const [isListOpen, setIsListOpen] = useState(false);

  const selectedCity = useMemo(() => cities.find(c => c.id === selectedCityId), [cities, selectedCityId]);

  return (
    <>
      {/* 1. NÚT MỞ QUÂN THƯ / DANH SÁCH CỨ ĐIỂM (Dạng thẻ bài giấy Dó nổi góc trái) */}
      {!selectedCity && (
        <div className="absolute top-20 left-3 md:left-4 z-30 pointer-events-auto">
          <button
            onClick={() => setIsListOpen(!isListOpen)}
            className="group relative flex items-center gap-2 px-3.5 py-2 rounded-lg transition-transform duration-150 hover:scale-105 active:scale-95 shadow-lg"
            title="Xem Quân Thư & Danh Sách Cứ Điểm"
          >
            {/* Lớp nền giấy Dó */}
            <div 
              className="absolute inset-0 rounded-[4px_7px_5px_6px] bg-gradient-to-br from-[#f8efe0] via-[#eedec2] to-[#dfcb9f] border border-[#b3956e]"
              style={{
                filter: 'url(#torn-paper-edge)',
                boxShadow: 'inset 0 0 10px rgba(110, 65, 25, 0.28), 2px 3px 6px rgba(40, 25, 10, 0.35)',
              }}
            />
            {/* Vân sớ giấy */}
            <div 
              className="absolute inset-0 opacity-20 pointer-events-none rounded-[4px_7px_5px_6px]"
              style={{
                backgroundImage: 'radial-gradient(ellipse at top left, rgba(140,90,40,0.3) 0%, transparent 70%), repeating-linear-gradient(45deg, rgba(80,45,15,0.04) 0px, rgba(80,45,15,0.04) 2px, transparent 2px, transparent 6px)',
              }}
            />
            {/* Nội dung nút */}
            <div className="relative z-10 flex items-center gap-2 font-serif font-black text-[#2d1e13] text-sm">
              <Scroll size={17} className="text-[#8c2d19]" />
              <span>Quân Thư</span>
            </div>
          </button>
        </div>
      )}

      {/* 2. DANH SÁCH CỨ ĐIỂM (QUÂN THƯ CUỘN GIẤY) */}
      {isListOpen && !selectedCity && (
        <div 
          className="fixed inset-x-3 bottom-4 md:inset-auto md:absolute md:top-20 md:left-4 z-40 md:w-84 max-h-[70vh] md:max-h-[75vh] flex flex-col pointer-events-auto rounded-xl overflow-hidden shadow-2xl transition-all"
        >
          {/* Lớp nền giấy Dó */}
          <div 
            className="absolute inset-0 bg-gradient-to-br from-[#fbf4e6] via-[#f3e4c8] to-[#e3cfa9] border-2 border-[#b3956e]"
            style={{
              boxShadow: 'inset 0 0 20px rgba(110,65,25,0.25), 0 10px 30px rgba(0,0,0,0.5)',
            }}
          />

          {/* Header Quân Thư */}
          <div className="relative z-10 px-4 py-3 border-b border-[#c2a67e] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scroll size={20} className="text-[#8c2d19]" />
              <h2 className="font-serif font-black text-[#2a1708] text-base md:text-lg tracking-wide">
                Bản Đồ Quân Thư
              </h2>
            </div>
            <button 
              onClick={() => setIsListOpen(false)}
              className="p-1 rounded hover:bg-[#d8c29d]/50 text-[#593922] transition"
            >
              <X size={18} />
            </button>
          </div>

          {/* Danh sách các Cứ điểm */}
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
                  className={`w-full text-left px-3 py-2 rounded-lg border transition-all flex items-center justify-between ${
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

      {/* 3. CHIẾN THƯ CHI TIẾT CỨ ĐIỂM (KHI NGƯỜI CHƠI NHẤP VÀO CỨ ĐIỂM BẤT KỲ) */}
      {selectedCity && (
        <div 
          className="fixed inset-x-3 bottom-3 md:inset-auto md:absolute md:top-20 md:left-4 z-40 md:w-92 max-h-[75vh] md:max-h-[80vh] flex flex-col pointer-events-auto rounded-xl overflow-hidden shadow-2xl transition-all duration-200"
        >
          {/* Lớp nền giấy Dó thượng hạng */}
          <div 
            className="absolute inset-0 bg-gradient-to-br from-[#fbf4e6] via-[#f3e4c8] to-[#e3cfa9] border-2 border-[#b3956e]"
            style={{
              boxShadow: 'inset 0 0 25px rgba(110,65,25,0.28), 0 12px 35px rgba(0,0,0,0.55)',
            }}
          />

          {/* Vân sớ giấy Dó xơ tự nhiên */}
          <div 
            className="absolute inset-0 opacity-25 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(ellipse at top left, rgba(140,90,40,0.3) 0%, transparent 70%), repeating-linear-gradient(45deg, rgba(80,45,15,0.04) 0px, rgba(80,45,15,0.04) 2px, transparent 2px, transparent 6px)',
            }}
          />

          {/* Thanh cầm kéo trên Mobile */}
          <div className="relative z-10 md:hidden w-full pt-2 flex justify-center">
            <div className="w-12 h-1 bg-[#8c6b44]/40 rounded-full" />
          </div>

          {/* Header Chiến Thư */}
          <div className="relative z-10 px-4 pt-3 pb-2.5 border-b border-[#c2a67e]/80 flex items-start justify-between">
            <div className="flex-1">
              {/* Dấu Triện Cổ (Phe phái) */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded border mb-1.5 select-none shadow-xs font-serif text-[11px] font-black uppercase tracking-wider">
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

              {/* Tên Cứ Điểm Thư Pháp */}
              <h1 className="font-serif font-black text-[#261304] text-2xl md:text-3xl tracking-wide leading-tight drop-shadow-[0_1px_1px_rgba(255,255,255,0.6)]">
                {selectedCity.name}
              </h1>

              {/* Loại hình địa thế */}
              <div className="flex items-center gap-2 text-xs font-serif text-[#66462c] mt-0.5 font-bold">
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

            {/* Nút Đóng Chiến Thư */}
            <button 
              onClick={() => selectCity(null)}
              className="p-1.5 rounded-full hover:bg-[#d8c29d]/60 text-[#593922] transition ml-2 shrink-0"
              title="Đóng Quân Thư"
            >
              <X size={20} />
            </button>
          </div>

          {/* Thân Chiến Thư */}
          <div className="relative z-10 p-4 overflow-y-auto space-y-4 no-scrollbar">
            
            {/* 1. Thông Tin Quân Lực & Phòng Thủ */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-lg bg-[#f9f3e6] border border-[#c9b28f] shadow-xs">
                <div className="flex items-center gap-1.5 text-xs text-[#704d2e] font-bold">
                  <Users size={15} className="text-[#8c2d19]" />
                  <span>Quân đồn trú</span>
                </div>
                <div className="mt-1 font-serif font-black text-xl text-[#2a1708]">
                  {selectedCity.troops.toLocaleString()} <span className="text-xs font-normal text-[#5c3e23]">binh</span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#f9f3e6] border border-[#c9b28f] shadow-xs">
                <div className="flex items-center gap-1.5 text-xs text-[#704d2e] font-bold">
                  <Shield size={15} className="text-[#3b5998]" />
                  <span>Địa thế phòng thủ</span>
                </div>
                <div className="mt-1 font-serif font-bold text-sm text-[#2a1708] leading-tight">
                  {selectedCity.type === 'city' 
                    ? 'Thành cao hào sâu' 
                    : selectedCity.type === 'chokepoint' 
                    ? 'Dốc đứng một người địch muôn người' 
                    : 'Dựa vào rừng núi hiểm trở'}
                </div>
              </div>
            </div>

            {/* 2. Thẻ Lệnh Quân Sự (Command Tablets) */}
            <div className="pt-1">
              <div className="text-xs font-serif font-black text-[#5c3e23] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Flag size={14} className="text-[#8c2d19]" />
                <span>Hạ Lệnh Quân Cơ</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {selectedCity.faction === 'lam_son' ? (
                  <>
                    <button 
                      onClick={() => alert(`Đã phát lệnh Xuất Binh từ ${selectedCity.name}!`)}
                      className="flex flex-col items-center justify-center p-2.5 rounded-lg bg-gradient-to-b from-[#f7ebd7] to-[#ebd2af] border border-[#a88252] hover:from-[#fcf4e8] hover:to-[#f0dbbd] active:scale-95 transition shadow-xs group"
                    >
                      <Swords size={20} className="text-[#8c2d19] group-hover:scale-110 transition-transform mb-1" />
                      <span className="font-serif font-black text-xs text-[#2a1708]">Xuất Binh</span>
                    </button>

                    <button 
                      onClick={() => alert(`Chiêu mộ thêm tráng đinh tại vùng ${selectedCity.name}!`)}
                      className="flex flex-col items-center justify-center p-2.5 rounded-lg bg-gradient-to-b from-[#f7ebd7] to-[#ebd2af] border border-[#a88252] hover:from-[#fcf4e8] hover:to-[#f0dbbd] active:scale-95 transition shadow-xs group"
                    >
                      <Users size={20} className="text-[#2b593f] group-hover:scale-110 transition-transform mb-1" />
                      <span className="font-serif font-black text-xs text-[#2a1708]">Chiêu Quân</span>
                    </button>

                    <button 
                      onClick={() => alert(`Thu gom lương thảo, chuẩn bị quân nhu tại ${selectedCity.name}!`)}
                      className="col-span-2 sm:col-span-1 flex flex-col items-center justify-center p-2.5 rounded-lg bg-gradient-to-b from-[#f7ebd7] to-[#ebd2af] border border-[#a88252] hover:from-[#fcf4e8] hover:to-[#f0dbbd] active:scale-95 transition shadow-xs group"
                    >
                      <Wheat size={20} className="text-[#85531b] group-hover:scale-110 transition-transform mb-1" />
                      <span className="font-serif font-black text-xs text-[#2a1708]">Thu Lương</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      onClick={() => alert(`Khởi binh tiến đánh ${selectedCity.name}!`)}
                      className="flex flex-col items-center justify-center p-2.5 rounded-lg bg-gradient-to-b from-[#eed4cc] to-[#dcaba0] border border-[#a84435] hover:from-[#f5dfd8] hover:to-[#e4b5ab] active:scale-95 transition shadow-xs group"
                    >
                      <Swords size={20} className="text-[#a82415] group-hover:scale-110 transition-transform mb-1" />
                      <span className="font-serif font-black text-xs text-[#52130b]">Công Thành</span>
                    </button>

                    <button 
                      onClick={() => alert(`Cử thám mã thâm nhập do thám binh lực ${selectedCity.name}!`)}
                      className="flex flex-col items-center justify-center p-2.5 rounded-lg bg-gradient-to-b from-[#f7ebd7] to-[#ebd2af] border border-[#a88252] hover:from-[#fcf4e8] hover:to-[#f0dbbd] active:scale-95 transition shadow-xs group"
                    >
                      <Eye size={20} className="text-[#3b5998] group-hover:scale-110 transition-transform mb-1" />
                      <span className="font-serif font-black text-xs text-[#2a1708]">Do Thám</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Lời trích dẫn sử lược */}
            <div className="p-2.5 rounded-lg bg-[#efe3cb]/60 border border-[#cbba9e] text-[#69482b] font-serif italic text-xs leading-relaxed text-center">
              "Đất Lam Sơn hiểm trở, nước sông Chu trong vắt, người xứ Thanh hào kiệt quy tụ một lòng dấy nghĩa..."
            </div>

          </div>
        </div>
      )}
    </>
  );
};
