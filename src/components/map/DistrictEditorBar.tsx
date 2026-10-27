import React, { useState, useEffect } from 'react';
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
  onImportDistricts?: (data: DistrictInfo[]) => void;
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
  onImportDistricts,
}) => {
  const [tab, setTab] = useState<'polygon' | 'terrain'>('terrain');
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [importText, setImportText] = useState<string>('');
  const [isSavingOfficial, setIsSavingOfficial] = useState<boolean>(false);

  const setTerrainEditMode = useUIStore(state => state.setTerrainEditMode);
  const brushTerrain = useUIStore(state => state.brushTerrain);
  const setBrushTerrain = useUIStore(state => state.setBrushTerrain);
  const brushSize = useUIStore(state => state.brushSize);
  const setBrushSize = useUIStore(state => state.setBrushSize);

  const currentDistrict = districtsList.find(d => d.id === selectedCityId);

  // Đảm bảo khi đóng thanh công cụ (thoát chế độ sửa) thì tắt hẳn chế độ sơn vẽ địa hình
  useEffect(() => {
    return () => {
      setTerrainEditMode(false);
    };
  }, [setTerrainEditMode]);

  // Lưu ranh giới trực tiếp vào file src/data/districtPolygons.json trên đĩa qua API
  const handleSaveAsOfficial = async () => {
    try {
      setIsSavingOfficial(true);
      const payload = { districts: districtsList };
      const res = await fetch('/api/save-districts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Mã lỗi HTTP: ${res.status}`);
      }

      const result = await res.json();
      if (result.success) {
        alert(`🎉 ĐÃ LƯU BẢN CHÍNH THỨC THÀNH CÔNG!\n\nToàn bộ ranh giới mới của ${districtsList.length} huyện thành đã được ghi đè trực tiếp vào file "src/data/districtPolygons.json".\n\nTừ bây giờ, dữ liệu này sẽ là bản mặc định chính thức cho dự án trên mọi máy tính!`);
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      alert(`Chưa lưu được tự động qua server: ${err?.message}\nBạn có thể bấm nút "📋 Copy Ranh Giới" và gửi nội dung vào khung chat để AI lưu giúp.`);
    } finally {
      setIsSavingOfficial(false);
    }
  };

  const handleCopyPolygon = () => {
    const custom = localStorage.getItem(storageKey);
    const textToCopy = custom || JSON.stringify(districtsList, null, 2);
    navigator.clipboard.writeText(textToCopy);
    alert('Đã copy toàn bộ dữ liệu ranh giới huyện thành vào Clipboard!\nBạn có thể mang sang máy khác dán vào ô "Nhập JSON".');
  };

  const handleDownloadPolygonFile = () => {
    const payload = JSON.stringify({ districts: districtsList }, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'districtPolygons.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleApplyImport = () => {
    if (!importText.trim()) {
      alert('Vui lòng dán nội dung JSON hoặc chọn file .json!');
      return;
    }
    try {
      const parsed = JSON.parse(importText.trim());
      const data: DistrictInfo[] = Array.isArray(parsed) ? parsed : parsed.districts;

      if (!Array.isArray(data) || data.length === 0) {
        alert('Cấu trúc JSON không hợp lệ! Cần danh sách các huyện chứa polygon.');
        return;
      }

      const isValid = data.every(d => d.id && Array.isArray(d.polygon) && d.polygon.length >= 3);
      if (!isValid) {
        alert('Dữ liệu chứa huyện có cấu trúc polygon không hợp lệ!');
        return;
      }

      localStorage.setItem(storageKey, JSON.stringify(data));
      if (onImportDistricts) {
        onImportDistricts(data);
      }
      setShowImportModal(false);
      setImportText('');
      alert(`Đã nhập thành công ${data.length} huyện thành vào bản đồ!`);
    } catch (err: any) {
      alert(`Lỗi cú pháp JSON: ${err?.message || 'Không thể đọc dữ liệu'}`);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setImportText(content);
      }
    };
    reader.readAsText(file);
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
    <>
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
                title="Khôi phục ranh giới riêng của huyện đang chọn về mặc định ban đầu"
              >
                ↺ Khôi Phục Huyện Này
              </button>
              <button
                onClick={handleCopyPolygon}
                className="px-2.5 py-1 bg-[#2f4d66] hover:bg-[#3d6385] text-white rounded text-xs font-bold border border-[#5282ad] shadow cursor-pointer transition hover:scale-105 whitespace-nowrap"
                title="Copy dữ liệu JSON vào Clipboard để mang sang máy khác"
              >
                📋 Copy Ranh Giới
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                className="px-2.5 py-1 bg-[#1e3a5f] hover:bg-[#2b4c7e] text-sky-100 rounded text-xs font-bold border border-[#3b82f6] shadow cursor-pointer transition hover:scale-105 whitespace-nowrap"
                title="Dán dữ liệu JSON từ máy khác hoặc mở file .json để cập nhật ranh giới"
              >
                📥 Nhập JSON
              </button>
              <button
                onClick={handleSaveAsOfficial}
                disabled={isSavingOfficial}
                className="px-2.5 py-1 bg-[#065f46] hover:bg-[#047857] text-emerald-100 rounded text-xs font-bold border border-[#10b981] shadow-lg cursor-pointer transition hover:scale-105 whitespace-nowrap flex items-center gap-1"
                title="Ghi đè trực tiếp ranh giới hiện tại vào file src/data/districtPolygons.json làm bản chính thức cho dự án"
              >
                {isSavingOfficial ? '⏳ Đang lưu...' : '💾 Lưu Bản Chính Thức'}
              </button>
              <button
                onClick={handleDownloadPolygonFile}
                className="px-2.5 py-1 bg-[#1b4332] hover:bg-[#2d6a4f] text-emerald-100 rounded text-xs font-bold border border-[#40916c] shadow cursor-pointer transition hover:scale-105 whitespace-nowrap"
                title="Tải file districtPolygons.json về máy để cập nhật cố định vào mã nguồn dự án"
              >
                📥 Xuất File
              </button>
              <button
                onClick={handleResetPolygon}
                className="px-2.5 py-1 bg-[#5c2419] hover:bg-[#783021] text-amber-100 rounded text-xs font-bold border border-[#963e2c] shadow cursor-pointer transition hover:scale-105 whitespace-nowrap"
              >
                Làm Lại Toàn Bộ
              </button>
            </div>
            <p className="text-[11px] text-amber-200/90 text-center leading-relaxed">
              {selectedCityId ? (
                <>
                  <span className="font-bold text-amber-300">Đang nắn: {currentDistrict?.name || selectedCityId}</span> —{' '}
                  <span className="text-emerald-300 font-semibold">Nhấp vào đường kẻ</span> để thêm đỉnh mới (bẻ gãy đường).{' '}
                  <span className="text-amber-300 font-semibold">Kéo 2 nút chập lên nhau</span> để gộp &amp; xóa nút.{' '}
                  <span className="text-stone-300">Giữ chuột phải để kéo di chuyển bản đồ.</span>
                </>
              ) : (
                'Click chọn một huyện thành trên bản đồ hoặc chọn từ danh sách ở trên để bắt đầu nắn ranh giới.'
              )}
            </p>
          </div>
        )}
      </div>

      {/* MODAL NHẬP JSON DỮ LIỆU RANH GIỚI */}
      {showImportModal && (
        <div className="fixed inset-0 z-[2000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1c110a] border-2 border-amber-600 rounded-2xl w-full max-w-lg p-5 shadow-2xl flex flex-col gap-3 text-amber-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-amber-900/60 pb-2">
              <h3 className="font-serif font-bold text-amber-300 text-sm flex items-center gap-2">
                <span>📥</span> Nhập Dữ Liệu Ranh Giới Huyện Thành
              </h3>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-stone-400 hover:text-white text-base font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-stone-300 leading-relaxed">
              Dán nội dung JSON đã copy từ máy khác vào ô bên dưới, hoặc chọn file <code className="text-amber-400 font-mono bg-stone-900 px-1 py-0.5 rounded">districtPolygons.json</code> từ máy tính của bạn:
            </p>

            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder='Dán nội dung JSON vào đây... (Ví dụ: [{"id":"thong_ninh",...}] hoặc {"districts":[...]})'
              className="w-full h-44 bg-[#120a06] border border-amber-800/80 rounded-lg p-2.5 text-xs font-mono text-amber-200 placeholder-stone-600 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />

            <div className="flex items-center justify-between pt-1">
              <label className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded text-xs font-bold border border-stone-600 cursor-pointer transition">
                📁 Chọn file .json
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </label>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowImportModal(false)}
                  className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded text-xs font-bold transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  onClick={handleApplyImport}
                  className="px-4 py-1.5 bg-[#22543d] hover:bg-[#276749] text-emerald-100 rounded text-xs font-bold border border-[#38a169] shadow transition cursor-pointer"
                >
                  ✓ Áp Dụng Ngay
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
