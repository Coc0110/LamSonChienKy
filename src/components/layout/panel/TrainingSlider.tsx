import React, { useState } from 'react';
import { X } from 'lucide-react';
import { notify } from '../../../store/dialogStore';
import { calculateTrainingDays, calculateTrainingWearCount } from '../../../store/slices/militarySlice';
import type { CityPopulation, General } from '../../../types';

interface TrainingSliderProps {
  population: CityPopulation;
  generals: General[];
  onConfirm: (generalId: string, count: number, swappedCount: number, days: number) => void;
  onCancel: () => void;
  weaponsAvailable: number;
}

export const TrainingSlider: React.FC<TrainingSliderProps> = ({
  population,
  generals,
  onConfirm,
  onCancel,
  weaponsAvailable,
}) => {
  const { idleLaborers, farmLaborers, forgeLaborers, unfitPopulation, combatTroops } = population;
  const workingLaborers = farmLaborers + forgeLaborers;
  const totalTrainable = idleLaborers + workingLaborers;
  const totalSliderMax = idleLaborers + workingLaborers + unfitPopulation;

  // Giới hạn số người có thể lấy: không vượt quá số tráng phu nhàn rỗi + số nghĩa binh có thể thế chỗ
  const maxAllowed = idleLaborers + Math.min(workingLaborers, combatTroops);

  // Mặc định chọn kéo hết số tráng phu rảnh rỗi (hoặc 10 nếu có)
  const initialCount = Math.min(Math.max(1, idleLaborers), weaponsAvailable > 0 ? weaponsAvailable : 1);
  const [trainCount, setTrainCount] = useState<number>(initialCount);

  // Chọn tướng phụ trách (chỉ các tướng rảnh rỗi tại căn cứ)
  const [selectedGeneralId, setSelectedGeneralId] = useState<string>(
    generals[0]?.id || ''
  );

  const effectiveGeneralId = generals.some(g => g.id === selectedGeneralId)
    ? selectedGeneralId
    : (generals[0]?.id || '');

  const selectedCoach = generals.find(g => g.id === effectiveGeneralId) || generals[0];

  // Tính số lượng rơi vào từng vùng màu
  const idleUsed = Math.min(trainCount, idleLaborers);
  const workingUsed = Math.max(0, trainCount - idleLaborers);
  const swappedCombatantsNeeded = workingUsed;

  // Tính thời gian thao luyện đồng bộ qua helper chuẩn
  const trainingDays = calculateTrainingDays(selectedCoach);

  // Tính phần trăm các vùng trên thanh trượt
  const idlePercent = totalSliderMax > 0 ? (idleLaborers / totalSliderMax) * 100 : 0;
  const workingPercent = totalSliderMax > 0 ? (workingLaborers / totalSliderMax) * 100 : 0;
  const unfitPercent = totalSliderMax > 0 ? (unfitPopulation / totalSliderMax) * 100 : 0;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = Number(e.target.value);
    // Tuyệt đối không cho kéo vào vùng màu đen (người già, phụ nữ, trẻ nhỏ)
    if (val > totalTrainable) val = totalTrainable;
    // Không thể rút tráng phu đang làm việc nếu không đủ nghĩa binh thế chỗ
    if (val > maxAllowed) val = maxAllowed;
    // Không thể kéo vượt quá số khí giới sẵn có
    if (weaponsAvailable > 0 && val > weaponsAvailable) val = weaponsAvailable;
    setTrainCount(val);
  };

  const isWeaponShortage = trainCount > weaponsAvailable;

  return (
    <div className="p-3.5 rounded-lg bg-[#8c6b44]/10 border border-[#8c6b44]/40 text-[#261304] space-y-3 font-serif">
      {/* Tiêu đề mục */}
      <div className="flex items-center justify-between border-b border-[#8c6b44]/30 pb-2">
        <span className="font-serif font-black text-sm tracking-wide text-[#8c2d19]">
          Hạ Lệnh Thao Luyện Nghĩa Binh
        </span>
        <button
          onClick={onCancel}
          className="text-[#6e4927] hover:text-[#261304] transition p-1 hover:bg-[#8c6b44]/15 rounded cursor-pointer"
          title="Hủy bỏ"
        >
          <X size={16} />
        </button>
      </div>

      {/* 1. Chọn Tướng Phụ Trách */}
      <div className="space-y-1">
        <label className="text-xs font-bold text-[#6b4423]">
          Vị Tướng Phụ Trách Huấn Luyện:
        </label>
        {generals.length === 0 ? (
          <div className="p-2 rounded bg-[#8c2d19]/10 border border-[#8c2d19]/30 text-xs text-[#8c2d19]">
            Không có tướng lĩnh rảnh rỗi tại căn cứ (toàn bộ tướng đều đang chỉ huy đạo quân).
          </div>
        ) : (
          <select
            value={effectiveGeneralId}
            onChange={(e) => setSelectedGeneralId(e.target.value)}
            className="w-full bg-[#fdf8f0] border border-[#8c6b44]/40 text-[#261304] rounded px-2.5 py-1.5 text-xs font-serif font-bold focus:outline-none focus:ring-1 focus:ring-[#8c2d19]"
          >
            {generals.map(g => (
              <option key={g.id} value={g.id}>
                {g.name} ({g.title}) — Thống {g.stats.command} / Võ {g.stats.martial}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* 2. Thanh trượt 3 màu trực quan */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#261304]">
            Số tráng đinh thao luyện: <strong className="text-[#8c2d19] text-sm">{trainCount}</strong> người
          </span>
          <span className="text-[11px] text-[#6b4423]">
            Thời gian: <strong className="text-[#15803d]">{trainingDays} ngày</strong>
          </span>
        </div>

        {/* Thanh màu nền đa phân đoạn (Multi-color bar) */}
        <div className="relative w-full h-3 rounded-full overflow-hidden flex border border-[#8c6b44]/40 bg-[#dfceb7] shadow-inner">
          {/* Vùng Xanh Lá: Tráng phu rảnh rỗi */}
          <div
            style={{ width: `${idlePercent}%` }}
            className="h-full bg-[#15803d] transition-all"
            title={`Tráng phu rảnh rỗi: ${idleLaborers} người`}
          />
          {/* Vùng Cam: Tráng phu đang có việc (cày ruộng, rèn đúc) */}
          <div
            style={{ width: `${workingPercent}%` }}
            className="h-full bg-[#b45309] transition-all"
            title={`Tráng phu đang làm việc: ${workingLaborers} người (Nghĩa binh sẽ thế chỗ)`}
          />
          {/* Vùng Xám: Không thể huấn luyện (người già, phụ nữ, trẻ nhỏ) */}
          <div
            style={{ width: `${unfitPercent}%` }}
            className="h-full bg-[#78716c] border-l border-[#57534e]/40"
            title={`Dân cư phi chiến đấu: ${unfitPopulation} người (Không thể thao luyện)`}
          />
        </div>

        {/* Chú giải 3 màu - không dùng icon */}
        <div className="flex items-center justify-between text-[11px] text-[#261304] pt-0.5">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#15803d] inline-block" />
            <span>Rảnh rỗi: {idleLaborers}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#b45309] inline-block" />
            <span>Đang làm: {workingLaborers}</span>
          </span>
          <span className="flex items-center gap-1.5 text-[#704d2e]">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#78716c] inline-block" />
            <span>Không luyện: {unfitPopulation}</span>
          </span>
        </div>

        {/* Input Range kéo */}
        <input
          type="range"
          min="1"
          max={totalTrainable > 0 ? totalTrainable : 1}
          value={trainCount}
          onChange={handleSliderChange}
          className="w-full accent-[#8c2d19] cursor-pointer h-2 bg-[#d7c4ab] rounded-lg"
        />
      </div>

      {/* 3. Diễn giải tác động chiến lược - phong cách công văn, không icon */}
      <div className="text-xs leading-relaxed p-2.5 rounded-lg bg-[#8c6b44]/5 border border-[#8c6b44]/25 space-y-1.5 text-[#261304]">
        {workingUsed > 0 ? (
          <div className="text-[#b45309]">
            * Cảnh báo sản xuất: Điều động <strong>{idleUsed}</strong> tráng phu nhàn rỗi và rút <strong>{workingUsed}</strong> tráng phu đang làm việc → Cắt cử <strong>{swappedCombatantsNeeded} Nghĩa Binh</strong> dày dạn thế chỗ cày cấy / rèn đúc để duy trì sản lượng!
          </div>
        ) : (
          <div className="text-[#15803d]">
            * Điều động an toàn: Huấn luyện <strong>{idleUsed}</strong> tráng phu nhàn rỗi, không làm gián đoạn sản xuất nông vụ và lò rèn.
          </div>
        )}

        <div className="text-xs text-[#6b4423] pt-1 border-t border-[#8c6b44]/20 flex justify-between">
          <span>Binh khí cần cấp (tạm xuất): <strong className={isWeaponShortage ? 'text-[#8c2d19]' : 'text-[#261304]'}>{trainCount} món</strong> (Kho hiện có: {weaponsAvailable}) — Hoàn trả khi luyện xong (chỉ hao mòn tối đa ~{calculateTrainingWearCount(trainCount)} món)</span>
        </div>
      </div>

      {/* 4. Nút bấm thao tác - thuần chữ */}
      <div className="flex items-center gap-2 pt-1 font-serif">
        <button
          onClick={onCancel}
          className="flex-1 py-2 rounded-lg bg-[#8c6b44]/15 hover:bg-[#8c6b44]/25 text-[#6e4927] font-serif font-bold text-xs border border-[#8c6b44]/35 transition cursor-pointer"
        >
          Hủy Bỏ
        </button>
        <button
          onClick={() => {
            if (generals.length === 0 || !effectiveGeneralId) {
              notify.error('Cần có một vị tướng rảnh rỗi tại căn cứ để chủ trì thao luyện!');
              return;
            }
            if (isWeaponShortage) {
              notify.error('Khí giới trong kho không đủ để trang bị cho đợt thao luyện này!');
              return;
            }
            onConfirm(effectiveGeneralId, trainCount, swappedCombatantsNeeded, trainingDays);
          }}
          disabled={isWeaponShortage || generals.length === 0}
          className={`flex-1 py-2 rounded-lg flex items-center justify-center font-serif font-black text-xs uppercase tracking-wider shadow transition cursor-pointer ${
            isWeaponShortage || generals.length === 0
              ? 'bg-[#78716c]/40 text-[#57534e] border border-[#78716c]/40 cursor-not-allowed'
              : 'bg-[#8c2d19] hover:bg-[#6e1e0d] text-[#fff3db] active:scale-95'
          }`}
        >
          <span>Hạ Lệnh Thao Luyện</span>
        </button>
      </div>
    </div>
  );
};
