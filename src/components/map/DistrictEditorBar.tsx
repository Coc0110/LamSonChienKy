import React, { useState, useEffect } from 'react';
import type { DistrictInfo } from '../../types/map';
import type { TerrainType } from '../../types/terrain';
import type { ProvinceRegion } from '../../data/provinceRegions';
import { useUIStore } from '../../store/uiStore';
import { notify } from '../../store/dialogStore';
import { exportTerrainGridJSON, resetCustomTerrainGrid } from '../../data/terrainGrid';

interface DistrictEditorBarProps {
  selectedCityId: string | null;
  districtsList: DistrictInfo[];
  onSelectCity: (id: string) => void;
  onToggleEditMode: () => void;
  storageKey: string;
  onResetCurrentDistrict?: (districtId: string) => void;
  onImportDistricts?: (data: DistrictInfo[]) => void;
  onChangeTransformAllMode?: (active: boolean) => void;
  transformState?: { offsetX: number; offsetY: number; scale: number };
  onUpdateTransformState?: React.Dispatch<React.SetStateAction<{ offsetX: number; offsetY: number; scale: number }>>;
  onResetTransform?: () => void;
  showCountryBorders?: boolean;
  onToggleCountryBorders?: () => void;
  bordersBounds?: { xMin: number; yMin: number; xMax: number; yMax: number };
  transformTarget?: 'all' | 'districts' | 'borders' | 'satellite';
  onChangeTransformTarget?: (target: 'all' | 'districts' | 'borders' | 'satellite') => void;
  showSatelliteRef?: boolean;
  onToggleSatelliteRef?: () => void;
  satelliteOpacity?: number;
  onChangeSatelliteOpacity?: (opacity: number) => void;
  onChangeProvinceEditMode?: (active: boolean) => void;
  provinceList?: ProvinceRegion[];
  selectedProvinceId?: string | null;
  onSelectProvince?: (id: string) => void;
  onResetCurrentProvince?: (id: string) => void;
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
  onChangeTransformAllMode,
  transformState,
  onUpdateTransformState,
  onResetTransform,
  showCountryBorders = true,
  onToggleCountryBorders,
  bordersBounds,
  transformTarget = 'all',
  onChangeTransformTarget,
  showSatelliteRef = false,
  onToggleSatelliteRef,
  satelliteOpacity = 0.55,
  onChangeSatelliteOpacity,
  onChangeProvinceEditMode,
  provinceList = [],
  selectedProvinceId,
  onSelectProvince,
  onResetCurrentProvince,
}) => {
  const [tab, setTab] = useState<'polygon' | 'terrain' | 'transform' | 'province'>('terrain');
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [importText, setImportText] = useState<string>('');
  const [isSavingOfficial, setIsSavingOfficial] = useState<boolean>(false);
  const [isSavingTerrainOfficial, setIsSavingTerrainOfficial] = useState<boolean>(false);
  const [isSavingProvinceOfficial, setIsSavingProvinceOfficial] = useState<boolean>(false);

  const setTerrainEditMode = useUIStore(state => state.setTerrainEditMode);
  const brushTerrain = useUIStore(state => state.brushTerrain);
  const setBrushTerrain = useUIStore(state => state.setBrushTerrain);
  const brushSize = useUIStore(state => state.brushSize);
  const setBrushSize = useUIStore(state => state.setBrushSize);

  const currentDistrict = districtsList.find(d => d.id === selectedCityId);

  // Đảm bảo khi đóng thanh công cụ (thoát chế độ sửa) thì tắt hẳn chế độ sơn vẽ địa hình & dịch chuyển toàn bộ
  useEffect(() => {
    onChangeTransformAllMode?.(tab === 'transform');
    onChangeProvinceEditMode?.(tab === 'province');
    return () => {
      setTerrainEditMode(false);
      onChangeTransformAllMode?.(false);
      onChangeProvinceEditMode?.(false);
    };
  }, [setTerrainEditMode, onChangeTransformAllMode, onChangeProvinceEditMode, tab]);

  const handleSaveProvinceOfficial = async () => {
    try {
      setIsSavingProvinceOfficial(true);
      const res = await fetch('/api/save-provinces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provinces: provinceList }),
      });
      if (!res.ok) {
        if (res.status === 405 || res.status === 404) {
          const blob = new Blob([JSON.stringify(provinceList, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'provinceRegions.json';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          notify.warning('Đang chạy trên web tĩnh (Vercel), đã tự động tải file "provinceRegions.json".');
          return;
        }
        throw new Error(`Mã lỗi HTTP: ${res.status}`);
      }
      const result = await res.json();
      if (result.success) {
        notify.success(`🎉 Đã lưu ranh giới ${provinceList.length} tỉnh thành vào src/data/provinceRegions.ts!`);
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      notify.error(`Chưa lưu được qua server: ${err?.message}`);
    } finally {
      setIsSavingProvinceOfficial(false);
    }
  };

  // Lưu ranh giới trực tiếp vào file src/data/districtPolygons.json trên đĩa qua API
  const handleSaveAsOfficial = async () => {
    try {
      setIsSavingOfficial(true);
      const payload = bordersBounds ? { districts: districtsList, bordersBounds } : { districts: districtsList };
      const res = await fetch('/api/save-districts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        if (res.status === 405 || res.status === 404) {
          handleDownloadPolygonFile();
          notify.warning(
            `Đang chạy trên bản web tĩnh (Vercel) nên không thể ghi thẳng vào file mã nguồn (HTTP ${res.status}).\n` +
            `✅ Đã tự động tải xuống file "districtPolygons.json" (và dữ liệu vẫn được giữ trong trình duyệt).\n` +
            `👉 Gửi file vừa tải lên khung chat để cập nhật vào dự án, hoặc chạy "npm run dev" ở máy để lưu trực tiếp.`
          );
          return;
        }
        throw new Error(`Mã lỗi HTTP: ${res.status}`);
      }

      const result = await res.json();
      if (result.success) {
        notify.success(`🎉 Đã lưu bản chính thức thành công! Toàn bộ ranh giới mới của ${districtsList.length} huyện thành đã được cập nhật.`);
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      notify.error(`Chưa lưu được tự động qua server: ${err?.message}\nBạn có thể bấm nút "📋 Copy Ranh Giới" và gửi nội dung vào khung chat.`);
    } finally {
      setIsSavingOfficial(false);
    }
  };

  const handleCopyPolygon = () => {
    const payload = bordersBounds ? { districts: districtsList, bordersBounds } : { districts: districtsList };
    const textToCopy = JSON.stringify(payload, null, 2);
    navigator.clipboard.writeText(textToCopy);
    notify.info('Đã copy toàn bộ dữ liệu ranh giới (huyện + QG/tỉnh) vào Clipboard!');
  };

  const handleDownloadPolygonFile = () => {
    const payloadObj = bordersBounds ? { districts: districtsList, bordersBounds } : { districts: districtsList };
    const payload = JSON.stringify(payloadObj, null, 2);
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
      notify.warning('Vui lòng dán nội dung JSON hoặc chọn file .json!');
      return;
    }
    try {
      const parsed = JSON.parse(importText.trim());
      const data: DistrictInfo[] = Array.isArray(parsed) ? parsed : parsed.districts;

      if (!Array.isArray(data) || data.length === 0) {
        notify.error('Cấu trúc JSON không hợp lệ! Cần danh sách các huyện chứa polygon.');
        return;
      }

      const isValid = data.every(d => d.id && Array.isArray(d.polygon) && d.polygon.length >= 3);
      if (!isValid) {
        notify.error('Dữ liệu chứa huyện có cấu trúc polygon không hợp lệ!');
        return;
      }

      localStorage.setItem(storageKey, JSON.stringify(data));
      if (onImportDistricts) {
        onImportDistricts(data);
      }
      setShowImportModal(false);
      setImportText('');
      notify.success(`Đã nhập thành công ${data.length} huyện thành vào bản đồ!`);
    } catch (err: any) {
      notify.error(`Lỗi cú pháp JSON: ${err?.message || 'Không thể đọc dữ liệu'}`);
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
    notify.confirm({
      title: 'Khôi Phục Huyện',
      message: `Khôi phục ranh giới của riêng huyện "${currentDistrict.name}" về mặc định ban đầu?`,
      confirmText: 'Khôi Phục',
      cancelText: 'Hủy',
      onConfirm: () => {
        if (onResetCurrentDistrict) {
          onResetCurrentDistrict(selectedCityId);
        }
        notify.info(`Đã khôi phục ranh giới huyện "${currentDistrict.name}".`);
      },
    });
  };

  const handleResetPolygon = () => {
    notify.confirm({
      title: 'Khôi Phục Toàn Bộ Ranh Giới',
      message: 'Khôi phục lại toàn bộ ranh giới huyện thành về mặc định ban đầu?',
      confirmText: 'Khôi Phục Tất Cả',
      cancelText: 'Hủy',
      onConfirm: () => {
        localStorage.removeItem(storageKey);
        window.location.reload();
      },
    });
  };

  const handleSaveTerrainAsOfficial = async () => {
    try {
      setIsSavingTerrainOfficial(true);
      const jsonStr = exportTerrainGridJSON();
      const payload = JSON.parse(jsonStr);
      const res = await fetch('/api/save-terrain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        if (res.status === 405 || res.status === 404) {
          handleDownloadPolygonFile();
          notify.warning(
            `Đang chạy trên bản web tĩnh (Vercel) nên không thể ghi thẳng vào file mã nguồn (HTTP ${res.status}).\n` +
            `✅ Đã tự động tải xuống file "districtPolygons.json" (và dữ liệu vẫn được giữ trong trình duyệt).\n` +
            `👉 Gửi file vừa tải lên khung chat để cập nhật vào dự án, hoặc chạy "npm run dev" ở máy để lưu trực tiếp.`
          );
          return;
        }
        throw new Error(`Mã lỗi HTTP: ${res.status}`);
      }

      const result = await res.json();
      if (result.success) {
        notify.success(`🎉 Đã lưu bản đồ địa hình chính thức thành công (${Object.keys(payload).length} ô)!`);
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      notify.error(`Chưa lưu được tự động qua server: ${err?.message}`);
    } finally {
      setIsSavingTerrainOfficial(false);
    }
  };

  const handleCopyTerrain = () => {
    const json = exportTerrainGridJSON();
    navigator.clipboard.writeText(json);
    notify.info('Đã copy toàn bộ dữ liệu sơn địa hình lưới vào Clipboard!');
  };

  const handleResetTerrain = () => {
    notify.confirm({
      title: 'Khôi Phục Lưới Địa Hình',
      message: 'Khôi phục lại toàn bộ lưới địa hình về cấu hình mặc định ban đầu?',
      confirmText: 'Khôi Phục Lưới',
      cancelText: 'Hủy',
      onConfirm: () => {
        resetCustomTerrainGrid();
        window.location.reload();
      },
    });
  };

  return (
    <>
      <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[1000] w-[95vw] max-w-3xl bg-[#221008]/96 text-[#f5ebd7] px-4 py-3 rounded-xl border-2 border-amber-500 shadow-2xl backdrop-blur-md flex flex-col items-center gap-2 pointer-events-auto">
        {/* Switch Tab: Nắn Ranh Giới / Dịch & Thu Phóng Toàn Bộ / Sơn Địa Hình */}
        <div className="flex items-center gap-2 pb-1 border-b border-amber-900/60 w-full justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                setTab('terrain');
                setTerrainEditMode(true);
                onChangeTransformAllMode?.(false);
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
                onChangeTransformAllMode?.(false);
              }}
              className={`px-3 py-1 rounded text-xs font-bold transition cursor-pointer ${
                tab === 'polygon'
                  ? 'bg-amber-600 text-white shadow'
                  : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
              }`}
            >
              ✦ Nắn Ranh Giới Huyện
            </button>
            <button
              onClick={() => {
                setTab('province');
                setTerrainEditMode(false);
                onChangeTransformAllMode?.(false);
              }}
              className={`px-3 py-1 rounded text-xs font-bold transition cursor-pointer ${
                tab === 'province'
                  ? 'bg-amber-600 text-white shadow'
                  : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
              }`}
            >
              ✦ Nắn Ranh Giới Tỉnh
            </button>
            <button
              onClick={() => {
                setTab('transform');
                setTerrainEditMode(false);
                onChangeTransformAllMode?.(true);
              }}
              className={`px-3 py-1 rounded text-xs font-bold transition cursor-pointer ${
                tab === 'transform'
                  ? 'bg-amber-600 text-white shadow'
                  : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
              }`}
            >
              ✥ Dịch & Thu Phóng Toàn Bộ
            </button>
          </div>
          <div className="flex items-center gap-2">
            {onToggleSatelliteRef && (
              <button
                onClick={onToggleSatelliteRef}
                className={`px-2.5 py-1 rounded text-xs font-bold border shadow cursor-pointer transition whitespace-nowrap ${
                  showSatelliteRef
                    ? 'bg-sky-900/80 text-sky-200 border-sky-500'
                    : 'bg-stone-800 text-stone-400 border-stone-600'
                }`}
                title="Bật/tắt tấm bản đồ vệ tinh mẫu để đối chiếu căn chỉnh"
              >
                {showSatelliteRef ? '🛰️ Vệ Tinh Mẫu: Bật' : '🛰️ Vệ Tinh Mẫu: Tắt'}
              </button>
            )}
            {onToggleCountryBorders && (
              <button
                onClick={onToggleCountryBorders}
                className={`px-2.5 py-1 rounded text-xs font-bold border shadow cursor-pointer transition whitespace-nowrap ${
                  showCountryBorders
                    ? 'bg-amber-900/80 text-amber-200 border-amber-500'
                    : 'bg-stone-800 text-stone-400 border-stone-600'
                }`}
                title="Bật/tắt lớp ranh giới Quốc gia & Tỉnh thành (/map_borders.svg)"
              >
                {showCountryBorders ? '🗺️ QG & Tỉnh: Bật' : '🗺️ QG & Tỉnh: Tắt'}
              </button>
            )}
            <button
              onClick={() => {
                setTerrainEditMode(false);
                onChangeTransformAllMode?.(false);
                onToggleEditMode();
              }}
            className="px-3 py-1 bg-[#22543d] hover:bg-[#276749] text-emerald-100 rounded text-xs font-bold border border-[#38a169] shadow cursor-pointer transition hover:scale-105 whitespace-nowrap"
          >
            ✓ Xong Sửa
          </button>
          </div>
        </div>

        {/* NỘI DUNG TAB 4: NẮN RANH GIỚI TỈNH THÀNH */}
        {tab === 'province' && (
          <div className="flex flex-col items-center gap-2 w-full animate-in fade-in duration-150">
            <div className="flex flex-wrap items-center justify-center gap-2 w-full">
              <span className="text-[11px] font-bold text-stone-400">Chọn Tỉnh/Phủ:</span>
              <select
                value={selectedProvinceId || ''}
                onChange={(e) => onSelectProvince?.(e.target.value)}
                className="bg-[#382013] text-amber-200 border border-amber-600/80 rounded px-2.5 py-1 text-xs font-sans font-bold cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-400"
              >
                {provinceList.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <button
                onClick={() => selectedProvinceId && onResetCurrentProvince?.(selectedProvinceId)}
                disabled={!selectedProvinceId}
                className="px-2.5 py-1 bg-[#854d0e] hover:bg-[#a16207] disabled:opacity-50 text-amber-100 rounded text-xs font-bold border border-[#ca8a04] shadow cursor-pointer transition whitespace-nowrap"
              >
                ↺ Khôi Phục Tỉnh Này
              </button>
              <button
                onClick={handleSaveProvinceOfficial}
                disabled={isSavingProvinceOfficial}
                className="px-2.5 py-1 bg-[#15803d] hover:bg-[#16a34a] text-white rounded text-xs font-bold border border-[#22c55e] shadow cursor-pointer transition whitespace-nowrap flex items-center gap-1"
              >
                <span>💾</span>
                <span>{isSavingProvinceOfficial ? 'Đang lưu...' : 'Lưu Ranh Giới Tỉnh'}</span>
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(provinceList, null, 2));
                  notify.info('Đã copy JSON ranh giới các tỉnh vào Clipboard!');
                }}
                className="px-2 py-1 bg-[#2f4d66] hover:bg-[#3d6385] text-white rounded text-xs font-bold border border-[#5282ad] shadow cursor-pointer transition whitespace-nowrap"
              >
                📋 Copy JSON
              </button>
            </div>
            <p className="text-[11px] text-amber-200/90 text-center">
              ✦ Nhấp chọn tỉnh trên bản đồ • Kéo nút vàng để nắn biên giới (các tỉnh giáp ranh tự dính đỉnh chung) • Nhấp lên cạnh nét đứt để thêm đỉnh • Kéo chồng 2 nút để gộp.
            </p>
          </div>
        )}

        {/* NỘI DUNG TAB 3: DỊCH CHUYỂN & THU PHÓNG TỪNG LỚP ĐỘC LẬP */}
        {tab === 'transform' && transformState && onUpdateTransformState && (
          <div className="flex flex-col items-center gap-2 w-full animate-in fade-in duration-150">
            {onChangeTransformTarget && (
              <div className="flex flex-wrap items-center justify-center gap-1.5 w-full pb-1 border-b border-amber-900/40">
                <span className="text-[11px] font-bold text-stone-300 mr-1">Đang chỉnh:</span>
                {([
                  { id: 'all', label: '🌐 Cả Huyện + QG & Tỉnh' },
                  { id: 'districts', label: '📍 Ranh Giới 24 Huyện' },
                  { id: 'borders', label: '🗺️ Ranh Giới QG & Tỉnh' },
                  { id: 'satellite', label: '🛰️ Bản Đồ Vệ Tinh Mẫu' },
                ] as const).map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => onChangeTransformTarget(opt.id)}
                    className={`px-2.5 py-1 rounded text-xs font-bold border transition cursor-pointer ${
                      transformTarget === opt.id
                        ? 'bg-amber-600 text-white border-amber-400 shadow'
                        : 'bg-stone-800/90 text-stone-300 border-stone-700 hover:bg-stone-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
                {showSatelliteRef && onChangeSatelliteOpacity && (
                  <div className="flex items-center gap-1.5 bg-stone-900/70 px-2 py-0.5 rounded border border-sky-800/60 ml-1">
                    <span className="text-[11px] text-sky-300 font-bold">Mờ Vệ Tinh:</span>
                    <input
                      type="range"
                      min={0.1}
                      max={1.0}
                      step={0.05}
                      value={satelliteOpacity}
                      onChange={(e) => onChangeSatelliteOpacity(parseFloat(e.target.value))}
                      className="w-16 accent-sky-400 cursor-pointer"
                    />
                    <span className="text-[11px] font-mono text-sky-200 w-8 text-right">
                      {Math.round(satelliteOpacity * 100)}%
                    </span>
                  </div>
                )}
              </div>
            )}
            <div className="flex flex-wrap items-center justify-center gap-2 w-full">
              <div className="flex items-center gap-1.5 bg-stone-900/70 px-2.5 py-1 rounded border border-amber-800/50">
                <span className="text-[11px] font-bold text-amber-300">Thu Phóng:</span>
                <button
                  onClick={() =>
                    onUpdateTransformState(prev => ({
                      ...prev,
                      scale: Math.max(0.2, Math.round((prev.scale - 0.02) * 1000) / 1000),
                    }))
                  }
                  className="px-1.5 py-0.5 bg-stone-800 hover:bg-stone-700 rounded text-xs font-bold cursor-pointer"
                >
                  -
                </button>
                <input
                  type="range"
                  min={0.2}
                  max={5.0}
                  step={0.01}
                  value={transformState.scale}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    onUpdateTransformState(prev => ({ ...prev, scale: val }));
                  }}
                  className="w-28 accent-amber-500 cursor-pointer"
                />
                <button
                  onClick={() =>
                    onUpdateTransformState(prev => ({
                      ...prev,
                      scale: Math.min(5.0, Math.round((prev.scale + 0.02) * 1000) / 1000),
                    }))
                  }
                  className="px-1.5 py-0.5 bg-stone-800 hover:bg-stone-700 rounded text-xs font-bold cursor-pointer"
                >
                  +
                </button>
                <span className="text-xs font-mono text-amber-200 w-12 text-right">
                  {transformState.scale.toFixed(2)}x
                </span>
              </div>

              <div className="flex items-center gap-1 bg-stone-900/70 px-2 py-1 rounded border border-amber-800/50">
                <span className="text-[11px] font-bold text-stone-300 mr-1">Nhích:</span>
                <button
                  onClick={() => onUpdateTransformState(prev => ({ ...prev, offsetX: Math.round((prev.offsetX - 0.2) * 1000) / 1000 }))}
                  className="px-1.5 py-0.5 bg-stone-800 hover:bg-stone-700 rounded text-xs font-bold cursor-pointer"
                  title="Dịch trái 0.2%"
                >
                  ←
                </button>
                <button
                  onClick={() => onUpdateTransformState(prev => ({ ...prev, offsetY: Math.round((prev.offsetY - 0.2) * 1000) / 1000 }))}
                  className="px-1.5 py-0.5 bg-stone-800 hover:bg-stone-700 rounded text-xs font-bold cursor-pointer"
                  title="Dịch lên 0.2%"
                >
                  ↑
                </button>
                <button
                  onClick={() => onUpdateTransformState(prev => ({ ...prev, offsetY: Math.round((prev.offsetY + 0.2) * 1000) / 1000 }))}
                  className="px-1.5 py-0.5 bg-stone-800 hover:bg-stone-700 rounded text-xs font-bold cursor-pointer"
                  title="Dịch xuống 0.2%"
                >
                  ↓
                </button>
                <button
                  onClick={() => onUpdateTransformState(prev => ({ ...prev, offsetX: Math.round((prev.offsetX + 0.2) * 1000) / 1000 }))}
                  className="px-1.5 py-0.5 bg-stone-800 hover:bg-stone-700 rounded text-xs font-bold cursor-pointer"
                  title="Dịch phải 0.2%"
                >
                  →
                </button>
              </div>

              <span className="text-[11px] font-mono text-stone-400">
                dX: {transformState.offsetX >= 0 ? '+' : ''}{transformState.offsetX.toFixed(2)}% | dY: {transformState.offsetY >= 0 ? '+' : ''}{transformState.offsetY.toFixed(2)}%
              </span>

              <button
                onClick={handleSaveAsOfficial}
                disabled={isSavingOfficial}
                className="px-2.5 py-1 bg-[#15803d] hover:bg-[#16a34a] text-white rounded text-xs font-bold border border-[#22c55e] shadow cursor-pointer transition whitespace-nowrap flex items-center gap-1"
                title="Lưu toàn bộ tọa độ ranh giới mới vào src/data/districtPolygons.json (local dev) hoặc tải file .json (Vercel)"
              >
                <span>💾</span>
                <span>{isSavingOfficial ? 'Đang lưu...' : 'Lưu Bản Chính Thức'}</span>
              </button>

              <button
                onClick={handleCopyPolygon}
                className="px-2 py-1 bg-[#2f4d66] hover:bg-[#3d6385] text-white rounded text-xs font-bold border border-[#5282ad] shadow cursor-pointer transition whitespace-nowrap"
                title="Copy toàn bộ JSON ranh giới vào Clipboard"
              >
                📋 Copy JSON
              </button>

              <button
                onClick={handleDownloadPolygonFile}
                className="px-2 py-1 bg-[#1e3a5f] hover:bg-[#2b4c7e] text-sky-100 rounded text-xs font-bold border border-[#3b82f6] shadow cursor-pointer transition whitespace-nowrap"
                title="Tải xuống file districtPolygons.json"
              >
                ⬇ Tải .json
              </button>

              <button
                onClick={() => {
                  onResetTransform?.();
                  notify.info('Đã đưa toàn bộ ranh giới về lại mốc trước khi dịch/thu phóng!');
                }}
                className="px-2 py-1 bg-[#5c2419] hover:bg-[#783021] text-amber-100 rounded text-xs font-bold border border-[#963e2c] shadow cursor-pointer transition whitespace-nowrap"
              >
                ↺ Đặt Lại Mốc
              </button>
            </div>
            <p className="text-[11px] text-amber-200/90 text-center">
              ✦ Kéo <b>chuột trái</b> để dịch chuyển lớp đang chọn • Giữ <b>chuột phải</b> để kéo di chuyển toàn bộ bản đồ • Giữ <b>Shift + Cuộn chuột</b> để thu phóng • Bấm <b>Lưu Bản Chính Thức</b> khi khớp.
            </p>
          </div>
        )}

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
                onClick={handleSaveTerrainAsOfficial}
                disabled={isSavingTerrainOfficial}
                className="px-2.5 py-1 bg-[#15803d] hover:bg-[#16a34a] text-white rounded text-xs font-bold border border-[#22c55e] shadow cursor-pointer transition whitespace-nowrap flex items-center gap-1"
                title="Lưu trực tiếp vào file src/data/terrainGridData.json của dự án"
              >
                <span>💾</span>
                <span>{isSavingTerrainOfficial ? 'Đang lưu...' : 'Lưu Vào Dự Án'}</span>
              </button>
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
