import React from 'react';
import type { DistrictInfo } from '../../types/map';

interface DistrictEditorBarProps {
  selectedCityId: string | null;
  districtsList: DistrictInfo[];
  onSelectCity: (id: string) => void;
  onToggleEditMode: () => void;
  storageKey: string;
}

export const DistrictEditorBar: React.FC<DistrictEditorBarProps> = ({
  selectedCityId,
  districtsList,
  onSelectCity,
  onToggleEditMode,
  storageKey,
}) => {
  const currentDistrict = districtsList.find(d => d.id === selectedCityId);

  const handleCopy = () => {
    const custom = localStorage.getItem(storageKey);
    if (custom) {
      navigator.clipboard.writeText(custom);
      alert('Đã copy toàn bộ dữ liệu ranh giới huyện thành vào Clipboard!');
    } else {
      alert('Chưa có chỉnh sửa ranh giới mới nào!');
    }
  };

  const handleReset = () => {
    if (confirm('Khôi phục lại toàn bộ ranh giới huyện thành về mặc định ban đầu?')) {
      localStorage.removeItem(storageKey);
      window.location.reload();
    }
  };

  return (
    <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[1000] w-[95vw] max-w-2xl bg-[#221008]/96 text-[#f5ebd7] px-4 py-3 rounded-xl border-2 border-amber-500 shadow-2xl backdrop-blur-md flex flex-col items-center gap-2 pointer-events-auto">
      <div className="flex flex-wrap items-center justify-center gap-2 w-full">
        <span className="font-bold font-sans text-xs md:text-sm tracking-wider text-amber-300 uppercase whitespace-nowrap">
          ✦ Chế độ nắn ranh giới Huyện Thành ✦
        </span>
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
          onClick={handleCopy}
          className="px-2.5 py-1 bg-[#2f4d66] hover:bg-[#3d6385] text-white rounded text-xs font-bold border border-[#5282ad] shadow cursor-pointer transition hover:scale-105 whitespace-nowrap"
        >
          Copy Ranh Giới
        </button>
        <button
          onClick={handleReset}
          className="px-2.5 py-1 bg-[#5c2419] hover:bg-[#783021] text-amber-100 rounded text-xs font-bold border border-[#963e2c] shadow cursor-pointer transition hover:scale-105 whitespace-nowrap"
        >
          Làm Lại Gốc
        </button>
        <button
          onClick={onToggleEditMode}
          className="px-2.5 py-1 bg-[#22543d] hover:bg-[#276749] text-emerald-100 rounded text-xs font-bold border border-[#38a169] shadow cursor-pointer transition hover:scale-105 whitespace-nowrap"
        >
          ✓ Xong Sửa
        </button>
      </div>
      <p className="text-[11px] md:text-xs text-stone-300 text-center">
        {selectedCityId
          ? `Đang nắn: ${currentDistrict?.name || selectedCityId} — Kéo các nút tròn vàng viền đỏ trên đường ranh giới để nắn hình.`
          : 'Click chọn một huyện thành trên bản đồ hoặc chọn từ danh sách ở trên để bắt đầu nắn ranh giới.'}
      </p>
    </div>
  );
};
