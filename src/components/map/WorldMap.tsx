import React, { useMemo } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useUIStore } from '../../store/uiStore';
import { MapNode } from '../MapNode';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

export const WorldMap: React.FC = () => {
  const cities = useGameStore(state => state.cities);
  const connections = useGameStore(state => state.connections);
  const isEditMode = useUIStore(state => state.isEditMode);
  const selectedCityId = useUIStore(state => state.selectedCityId);

  // Tạo đường SVG từ connections, hỗ trợ mảng waypoints
  const lines = useMemo(() => {
    return connections.map((conn) => {
      const c1 = cities.find(c => c.id === conn.from);
      const c2 = cities.find(c => c.id === conn.to);
      if (!c1 || !c2) return null;
      
      let d = `M ${c1.x} ${c1.y}`;
      if (conn.waypoints && conn.waypoints.length > 0) {
        conn.waypoints.forEach(wp => {
          d += ` L ${wp[0]} ${wp[1]}`;
        });
      }
      d += ` L ${c2.x} ${c2.y}`;

      return (
        <path 
          key={`${conn.from}-${conn.to}`}
          d={d}
          stroke="#f59e0b" 
          strokeWidth="0.3" 
          strokeDasharray="0.8 0.8"
          fill="none"
          className="opacity-60"
        />
      );
    }).filter(Boolean);
  }, [cities, connections]);

  return (
    <div className="absolute inset-0 z-0 bg-[#e5e3df] overflow-hidden">
      {isEditMode && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[1000] bg-red-900/90 text-white px-6 py-2 rounded-b-xl border-x-2 border-b-2 border-red-500 shadow-xl text-center pointer-events-none">
          <h3 className="font-bold">CHẾ ĐỘ TÙY CHỈNH BẢN ĐỒ (EDIT MODE) ĐANG BẬT</h3>
          <p className="text-sm">Kéo thả các Cứ điểm trên ảnh nền.</p>
        </div>
      )}

      <TransformWrapper
        initialScale={0.55}
        initialPositionX={0}
        initialPositionY={0}
        minScale={0.6} // Khóa Zoom Out để ảnh luôn lấp đầy màn hình, không bị viền xám
        maxScale={10}    // Không cho zoom in quá mức để tránh lộ nhà cửa hiện đại
        wheel={{ step: 0.005 }} // Tốc độ cuộn chuột (0.05 = cuộn mượt và từ từ)
        pinch={{ step: 1 }}
        disabled={isEditMode}
        centerZoomedOut={true}
      >
        <TransformComponent wrapperClass="w-full h-full" wrapperStyle={{ width: '100%', height: '100%' }} contentStyle={{ width: '3000px', height: '3942px' }} contentClass="relative">
          
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: 'url(/vietnam_full_map_reference.jpg)' }} 
          />
          
          {/* Lưới giả lập cho giống bản đồ */}
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ 
            backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(0,0,0,0.5) 1px, transparent 0)',
            backgroundSize: '32px 32px'
          }}/>

          {/* Lớp phủ vector ranh giới & sông ngòi: Tạm thời tắt để loại bỏ lag 100% trong khi chuẩn hóa file từ Figma */}
          {/* Sẽ bật lại bằng Canvas hoặc Texture PNG nhẹ khi có file chuẩn */}

          {/* SVG chứa đường nối. Đặt viewBox=0 0 100 100 để tọa độ path khớp % của x, y */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
            {lines}
          </svg>

          {cities.map(city => (
            <MapNode
              key={city.id}
              id={city.id}
              name={city.name}
              type={city.type}
              x={city.x}
              y={city.y}
              faction={city.faction}
              troops={city.troops}
              selected={selectedCityId === city.id}
            />
          ))}
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
};
