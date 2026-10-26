import React, { useState } from 'react';
import type { DistrictInfo } from '../../types/map';
import type { TerrainType } from '../../types/terrain';
import { useUIStore } from '../../store/uiStore';
import { exportTerrainGridJSON, resetCustomTerrainGrid } from '../../data/terrainGrid';

interface DistrictEditorBarProps {
  selectedCityId: string | null;
  districtsList: DistrictInfo[];
  onSelectCity: (id: string) => void;
  onToggleEditMode: () => void;
  storageKey: string;
  onResetCurrentDistrict?: (districtId: string) => void;
}

const TERRAIN_PALETTE: { type: TerrainType; label: string; icon: string; color: string }[] = [
  { type: 'plains', label: 'Đồng Bằng', icon: '🌾', color: '#eab308' },
  { type: 'forest', label: 'Rừng Già', icon: '🌲', color: '#22c55e' },
  { type: 'mountain', label: 'Núi Cao', icon: '⛰️', color: '#f97316' },
  { type: 'cliff', label: 'Vách Đá', icon: '🧗', color: '#ef4444' },
  { type: 'swamp', label: 'Đầm Lầy', icon: '💧', color: '#06b6d4' },
  { type: 'water', label: 'Sông Ngòi', icon: '🌊', color: '#3b82f6' },
];

export const DistrictEditorBar: React.FC<DistrictEditorBarProps> = ({
  selectedCityId,
  districtsList,
  onSelectCity,
  onToggleEditMode,
  storageKey,
  onResetCurrentDistrict,
}) => {
  const [tab, setTab] = useState<'polygon' | 'terrain'>('terrain');

  const setTerrainEditMode = useUIStore(state => state.setTerrainEditMode);
  const brushTerrain = useUIStore(state => state.brushTerrain);
  const setBrushTerrain = useUIStore(state => state.setBrushTerrain);
  const brushSize = useUIStore(state => state.brushSize);
  const setBrushSize = useUIStore(state => state.setBrushSize);

  const currentDistrict = districtsList.find(d => d.id === selectedCityId);

  const handleCopyPolygon = () => {
    const custom = localStorage.getItem(storageKey);
    if (custom) {
      navigator.clipboard.writeText(custom);
      alert('Đã copy toàn bộ dữ liệu ranh giới huyện thành vào Clipboard!');
    } else {
      alert('Chưa có chỉnh sửa ranh giới mới nào!');
    }
  };

  const handleResetCurrentDistrict = () => {
    if (!selectedCityId || !currentDistrict) return;
    if (confirm(`Khôi phục ranh giới của riêng huyện "${currentDistrict.name}" về mặc định ban đầu?`)) {
      if (onResetCurrentDistrict) {
        onResetCurrentDistrict(selectedCityId);
      }
    }
  };

  const handleResetPolygon = () => {
    if (confirm('Khôi phục lại toàn bộ ranh giới huyện thành về mặc định ban đầu?')) {
      localStorage.removeItem(storageKey);
      window.location.reload();
    }
  };

  const handleCopyTerrain = () => {
    const json = exportTerrainGridJSON();
    navigator.clipboard.writeText(json);
    alert('Đã copy toàn bộ dữ liệu sơn địa hình lưới vào Clipboard!');
  };

  const handleResetTerrain = () => {
    if (confirm('Khôi phục lại toàn bộ lưới địa hình về cấu hình mặc định ban đầu?')) {
      resetCustomTerrainGrid();
      window.location.reload();
    }
  };

  return (
    <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[1000] w-[95vw] max-w-3xl bg-[#221008]/96 text-[#f5ebd7] px-4 py-3 rounded-xl border-2 border-amber-500 shadow-2xl backdrop-blur-md flex flex-col items-center gap-2 pointer-events-auto">
      {/* Switch Tab: Nắn Ranh Giới / Sơn Địa Hình */}
      <div className="flex items-center gap-2 pb-1 border-b border-amber-900/60 w-full justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setTab('terrain');
              setTerrainEditMode(true);
            }}
            className={`px-3 py-1 rounded text-xs font-bold transition cursor-pointer ${
              tab === 'terrain'
                ? 'bg-amber-600 text-white shadow'
                : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
            }`}
          >
            ✦ Sơn Vẽ Lưới Địa Hình
          </button>
          <button
            onClick={() => {
              setTab('polygon');
              setTerrainEditMode(false);
            }}
            className={`px-3 py-1 rounded text-xs font-bold transition cursor-pointer ${
              tab === 'polygon'
                ? 'bg-amber-600 text-white shadow'
                : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
            }`}
          >
            ✦ Nắn Ranh Giới Huyện
          </button>
        </div>
        <button
          onClick={() => {
            setTerrainEditMode(false);
            onToggleEditMode();
          }}
          className="px-3 py-1 bg-[#22543d] hover:bg-[#276749] text-emerald-100 rounded text-xs font-bold border border-[#38a169] shadow cursor-pointer transition hover:scale-105 whitespace-nowrap"
        >
          ✓ Xong Sửa
        </button>
      </div>

      {/* NỘI DUNG TAB 1: SƠN VẼ ĐỊA HÌNH LƯỚI */}
      {tab === 'terrain' && (
        <div className="flex flex-col items-center gap-2 w-full animate-in fade-in duration-150">
          <div className="flex flex-wrap items-center justify-center gap-1.5 w-full">
            <span className="text-[11px] font-bold text-amber-300 uppercase mr-1">
              Bút Sơn:
            </span>
            {TERRAIN_PALETTE.map(item => (
              <button
                key={item.type}
                onClick={() => {
                  setBrushTerrain(item.type);
                  setTerrainEditMode(true);
                }}
                className={`px-2 py-1 rounded text-xs font-bold border flex items-center gap-1 transition cursor-pointer ${
                  brushTerrain === item.type
                    ? 'ring-2 ring-white scale-105 shadow-lg'
                    : 'opacity-85 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: `${item.color}25`,
                  borderColor: item.color,
                  color: item.color,
                }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}

            <div className="h-4 w-[1px] bg-stone-700 mx-1" />

            <span className="text-[11px] font-bold text-stone-400 mr-1">Cỡ cọ:</span>
            {([1, 3, 5, 9] as const).map(sz => (
              <button
                key={sz}
                onClick={() => setBrushSize(sz)}
                className={`px-2 py-0.5 rounded text-xs font-mono font-bold transition cursor-pointer ${
                  brushSize === sz
                    ? 'bg-amber-500 text-black'
                    : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                }`}
              >
                {sz}x{sz} {sz === 1 ? '(250m)' : sz === 3 ? '(750m)' : sz === 5 ? '(1.25km)' : '(2.25km)'}
              </button>
            ))}

            <div className="h-4 w-[1px] bg-stone-700 mx-1" />

            <button
              onClick={handleCopyTerrain}
              className="px-2 py-1 bg-[#2f4d66] hover:bg-[#3d6385] text-white rounded text-xs font-bold border border-[#5282ad] shadow cursor-pointer transition whitespace-nowrap"
            >
              Copy JSON
            </button>
            <button
              onClick={handleResetTerrain}
              className="px-2 py-1 bg-[#5c2419] hover:bg-[#783021] text-amber-100 rounded text-xs font-bold border border-[#963e2c] shadow cursor-pointer transition whitespace-nowrap"
            >
              Làm Lại Gốc
            </button>
          </div>
          <p className="text-[11px] text-stone-300 text-center">
            ✦ Giữ chuột trái và kéo rê trên bản đồ để sơn địa hình cho từng ô vuông lưới (ô vuông 250m). Giữ chuột phải để kéo di chuyển bản đồ.
          </p>
        </div>
      )}

      {/* NỘI DUNG TAB 2: NẮN RANH GIỚI HUYỆN */}
      {tab === 'polygon' && (
        <div className="flex flex-col items-center gap-2 w-full animate-in fade-in duration-150">
          <div className="flex flex-wrap items-center justify-center gap-2 w-full">
            <span className="text-[11px] font-bold text-stone-400">Chọn Huyện:</span>
            <select
              value={selectedCityId || ''}
              onChange={(e) => onSelectCity(e.target.value)}
              className="bg-[#382013] text-amber-200 border border-amber-600/80 rounded px-2.5 py-1 text-xs font-sans font-bold cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-400"
            >
              {districtsList.map(d => (
                <option key={d.id} value={d.id}>{d.name} ({d.chau})</option>
              ))}
            </select>
            <button
              onClick={handleResetCurrentDistrict}
              disabled={!selectedCityId}
              className="px-2.5 py-1 bg-[#854d0e] hover:bg-[#a16207] disabled:opacity-50 text-amber-100 rounded text-xs font-bold border border-[#ca8a04] shadow cursor-pointer transition hover:scale-105 whitespace-nowrap"
              title="Chỉ khôi phục lại huyện đang chọn về hình dạng mặc định ban đầu"
            >
              ↺ Khôi Phục Huyện Này
            </button>
            <button
              onClick={handleCopyPolygon}
              className="px-2.5 py-1 bg-[#2f4d66] hover:bg-[#3d6385] text-white rounded text-xs font-bold border border-[#5282ad] shadow cursor-pointer transition hover:scale-105 whitespace-nowrap"
            >
              Copy Ranh Giới
            </button>
            <button
              onClick={handleResetPolygon}
              className="px-2.5 py-1 bg-[#5c2419] hover:bg-[#783021] text-amber-100 rounded text-xs font-bold border border-[#963e2c] shadow cursor-pointer transition hover:scale-105 whitespace-nowrap"
            >
              Làm Lại Toàn Bộ
            </button>
          </div>
          <p className="text-[11px] text-stone-300 text-center">
            {selectedCityId
              ? `Đang nắn: ${currentDistrict?.name || selectedCityId} — Kéo các nút tròn vàng viền đỏ trên đường ranh giới để nắn hình. Giữ chuột phải để kéo di chuyển bản đồ.`
              : 'Click chọn một huyện thành trên bản đồ hoặc chọn từ danh sách ở trên để bắt đầu nắn ranh giới.'}
          </p>
        </div>
      )}
    </div>
  );
};
