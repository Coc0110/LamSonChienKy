import React, { useMemo } from 'react';
import { Swords, Wheat, Navigation, Tent, Shield, Map, X, Menu, Bookmark, History, Smartphone, Users } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { useUIStore } from '../../store/uiStore';

export const LeftPanel: React.FC = () => {
  const selectedCityId = useUIStore(state => state.selectedCityId);
  const selectCity = useUIStore(state => state.selectCity);
  const cities = useGameStore(state => state.cities);

  const selectedCity = useMemo(() => cities.find(c => c.id === selectedCityId), [cities, selectedCityId]);

  return (
    <>
      {/* 1. Thanh Sidebar cực trái (Giống Google Maps) */}
      <nav className="w-16 h-full bg-white border-r border-stone-200 z-50 flex flex-col items-center py-4 shadow-sm relative shrink-0">
        <button className="p-3 hover:bg-stone-100 rounded-full transition mb-6"><Menu size={24} className="text-stone-600" /></button>
        
        <div className="flex flex-col gap-6 w-full items-center">
          <button className="flex flex-col items-center gap-1 text-stone-500 hover:text-blue-600 transition">
            <Bookmark size={22} />
            <span className="text-[10px]">Đã lưu</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-stone-500 hover:text-blue-600 transition">
            <History size={22} />
            <span className="text-[10px]">Gần đây</span>
          </button>
        </div>

        <div className="mt-auto flex flex-col items-center gap-6 pb-4">
          <button className="flex flex-col items-center gap-1 text-stone-500 hover:text-blue-600 transition">
            <Smartphone size={22} />
            <span className="text-[10px]">Cài đặt</span>
          </button>
        </div>
      </nav>

      {/* 2. Khung Thông Tin Cứ Điểm (Google Maps Place Detail Style) */}
      <div className={`absolute top-0 left-16 h-full w-[400px] bg-white z-40 shadow-[4px_0_24px_rgba(0,0,0,0.15)] transform transition-transform duration-300 ease-in-out ${selectedCity ? 'translate-x-0' : '-translate-x-full'}`}>
        {selectedCity && (
          <div className="h-full flex flex-col overflow-y-auto">
            
            {/* Header Image (Giả lập ảnh Google Maps) */}
            <div className="relative h-64 bg-stone-200 shrink-0">
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-transparent z-10" />
              <button onClick={() => selectCity(null)} className="absolute top-4 right-4 z-20 w-8 h-8 bg-white/20 hover:bg-white/40 rounded-full flex items-center justify-center text-white backdrop-blur-sm transition">
                <X size={20} />
              </button>
              <img 
                src={selectedCity.type === 'city' ? 'https://images.unsplash.com/photo-1599839619722-39751411ea63?q=80&w=800&auto=format&fit=crop' : 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop'} 
                className="w-full h-full object-cover"
                alt="City cover"
              />
            </div>

            {/* Nội dung */}
            <div className="p-5 flex-1">
              <h1 className="text-3xl font-bold text-stone-800">{selectedCity.name}</h1>
              <div className="flex items-center gap-2 text-sm mt-2 font-medium">
                <span className={selectedCity.faction === 'lam_son' ? 'text-red-600' : selectedCity.faction === 'ming' ? 'text-blue-600' : 'text-stone-500'}>
                  {selectedCity.faction === 'lam_son' ? 'Khu vực Nghĩa Quân' : selectedCity.faction === 'ming' ? 'Khu vực Quân Minh' : 'Khu vực Trung lập'}
                </span>
                <span className="text-stone-300">•</span>
                <span className="text-stone-500">{selectedCity.type === 'city' ? 'Thành trì' : selectedCity.type === 'chokepoint' ? 'Ải / Hiểm địa' : 'Bản làng'}</span>
              </div>

              {/* Nút hành động ngang (Đường đi, Lưu, Gọi điện...) */}
              <div className="flex justify-around border-b border-stone-200 py-6 mt-2">
                {selectedCity.faction === 'lam_son' ? (
                  <>
                    <button className="flex flex-col items-center gap-2 group">
                      <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center group-hover:bg-blue-700 transition">
                        <Navigation size={20} />
                      </div>
                      <span className="text-[11px] font-bold text-blue-600">XUẤT BINH</span>
                    </button>
                    <button className="flex flex-col items-center gap-2 group">
                      <div className="w-10 h-10 border border-stone-300 text-blue-600 rounded-full flex items-center justify-center group-hover:bg-blue-50 transition">
                        <Users size={20} />
                      </div>
                      <span className="text-[11px] font-bold text-blue-600">CHIÊU QUÂN</span>
                    </button>
                    <button className="flex flex-col items-center gap-2 group">
                      <div className="w-10 h-10 border border-stone-300 text-blue-600 rounded-full flex items-center justify-center group-hover:bg-blue-50 transition">
                        <Wheat size={20} />
                      </div>
                      <span className="text-[11px] font-bold text-blue-600">THU LƯƠNG</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button className="flex flex-col items-center gap-2 group">
                      <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center group-hover:bg-blue-700 transition">
                        <Swords size={20} />
                      </div>
                      <span className="text-[11px] font-bold text-blue-600">TẤN CÔNG</span>
                    </button>
                    <button className="flex flex-col items-center gap-2 group">
                      <div className="w-10 h-10 border border-stone-300 text-blue-600 rounded-full flex items-center justify-center group-hover:bg-blue-50 transition">
                        <Map size={20} />
                      </div>
                      <span className="text-[11px] font-bold text-blue-600">DO THÁM</span>
                    </button>
                  </>
                )}
              </div>

              {/* Thông tin chi tiết */}
              <div className="py-6 space-y-4">
                <h3 className="font-bold text-stone-800 text-lg">Thông tin quân sự</h3>
                <div className="flex items-center gap-4 text-stone-600">
                  <Tent size={24} className="text-stone-400" />
                  <div>
                    <div className="font-medium text-stone-800">Quân đồn trú</div>
                    <div className="text-sm">{selectedCity.troops.toLocaleString()} lính</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-stone-600">
                  <Shield size={24} className="text-stone-400" />
                  <div>
                    <div className="font-medium text-stone-800">Phòng thủ</div>
                    <div className="text-sm">{selectedCity.type === 'city' ? 'Kiên cố (Thành đá)' : 'Lỏng lẻo (Rừng núi)'}</div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </>
  );
};
