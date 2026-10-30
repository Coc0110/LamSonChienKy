import React from 'react';
import { useGameStore } from '../../../store/gameStore';
import type { PlacedStructure } from '../../../types';

interface FarmDetailSectionProps {
  structure: PlacedStructure;
  isMingOccupied: boolean;
  taxRatePercent: number;
}

export const FarmDetailSection: React.FC<FarmDetailSectionProps> = React.memo(({
  structure,
  isMingOccupied,
  taxRatePercent,
}) => {
  const setFarmWorkers = useGameStore(state => state.setFarmWorkers);

  // Tính toán sản lượng ruộng nương theo quy mô: 5x5 (25 đinh), 6x6 (35 đinh), 7x7 (50 đinh)
  const efficiency = structure.gridSize === 7 ? 0.26 : structure.gridSize === 6 ? 0.24 : 0.22;
  const weatherMult = structure.seasonCondition === 'bountiful' ? 1.25 : structure.seasonCondition === 'poor' ? 0.70 : 1.0;
  const workers = structure.assignedWorkers || 0;
  const maxWorkers = structure.maxWorkers || (structure.gridSize === 7 ? 50 : structure.gridSize === 6 ? 35 : 25);
  const expectedTotalFood = Math.round(workers * 90 * efficiency * weatherMult);
  const expectedTax = Math.round(expectedTotalFood * (taxRatePercent / 100));
  const expectedNetHarvest = Math.max(0, expectedTotalFood - expectedTax);

  // Thời tiết ngắn gọn, không icon, không nền
  const weatherLabel = 
    structure.seasonCondition === 'bountiful' 
      ? 'Được mùa' 
      : structure.seasonCondition === 'poor' 
      ? 'Mất mùa' 
      : 'Mưa thuận gió hòa';

  const weatherColor = 
    structure.seasonCondition === 'bountiful' 
      ? 'text-[#15803d]' 
      : structure.seasonCondition === 'poor' 
      ? 'text-[#b45309]' 
      : 'text-[#261304]';

  return (
    <div className="space-y-2.5 text-xs text-[#2a1708] font-serif">
      {/* Khối Trạng thái & Điều phối nông đinh */}
      <div className="p-2.5 rounded bg-black/[0.04] border border-[#8c6b44]/25 space-y-2">
        <div className="flex justify-between items-center whitespace-nowrap">
          <span className="text-[#5c3e23] font-bold shrink-0">Trạng thái:</span>
          <span className={`font-bold ${structure.status === 'building' ? 'text-[#b45309]' : 'text-[#15803d]'}`}>
            {structure.status === 'building'
              ? `Đang thi công (còn ${structure.buildDaysRemaining} ngày)`
              : 'Canh tác bình thường'}
          </span>
        </div>

        {/* Thanh kéo thả điều động nông đinh */}
        {structure.status === 'active' && (
          <div className="pt-1.5 border-t border-[#8c6b44]/20 space-y-1">
            <div className="flex justify-between items-center whitespace-nowrap">
              <span className="text-[#5c3e23] font-bold shrink-0">Nông đinh:</span>
              <span className="font-serif font-black text-sm text-[#8c2d19]">
                {workers}/{maxWorkers}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={maxWorkers}
              value={workers}
              onChange={(e) => {
                setFarmWorkers(structure.id, parseInt(e.target.value) || 0);
              }}
              className="w-full accent-[#8c2d19] cursor-pointer"
            />
          </div>
        )}
      </div>

      {/* Thông tin mùa màng & Sản lượng thu hoạch */}
      {structure.status === 'active' && (
        <div className="p-3 rounded bg-black/[0.04] border border-[#8c6b44]/25 space-y-1.5">
          {/* 1. Thời tiết vụ mùa (không icon, không nền, không % trong ngoặc) */}
          <div className="flex justify-between items-center whitespace-nowrap">
            <span className="text-[#5c3e23] font-bold shrink-0">Thời tiết vụ mùa:</span>
            <span className={`font-serif font-bold ${weatherColor}`}>
              {weatherLabel}
            </span>
          </div>

          {/* 2. Tiến độ vụ mùa (không % trong ngoặc) */}
          <div className="flex justify-between items-center whitespace-nowrap">
            <span className="text-[#5c3e23] shrink-0">Tiến độ vụ mùa:</span>
            <span className="font-serif font-bold text-[#261304]">
              Ngày {structure.cropDays}/{structure.cropCycleDays}
            </span>
          </div>

          {/* 3. Sản lượng dự kiến (bỏ 'Tổng', bỏ 'thóc', hiển thị trên 1 dòng) */}
          <div className="flex justify-between items-center whitespace-nowrap">
            <span className="text-[#5c3e23] shrink-0">Sản lượng dự kiến:</span>
            <span className="font-serif font-black text-sm text-[#8c2d19]">
              ~{expectedTotalFood.toLocaleString()} thạch
            </span>
          </div>

          {/* 4. Sưu thuế nộp (không giải thích trong ngoặc) */}
          <div className="pt-1.5 border-t border-[#8c6b44]/25 flex justify-between items-center whitespace-nowrap">
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="font-bold text-[#5c3e23]">Sưu thuế nộp:</span>
              <span className={`font-serif font-bold ${isMingOccupied ? 'text-red-700' : 'text-emerald-700'}`}>
                {taxRatePercent}%
              </span>
            </div>
            <span className="font-serif font-black text-[#8c2d19]">
              -{expectedTax.toLocaleString()} thạch
            </span>
          </div>

          {/* 5. Thực thu nhập kho */}
          <div className="pt-1 border-t border-[#8c6b44]/25 flex justify-between items-center whitespace-nowrap font-bold">
            <span className="text-[#261304] shrink-0">Thực thu nhập kho:</span>
            <span className="font-serif font-black text-sm text-[#15803d]">
              +{expectedNetHarvest.toLocaleString()} thạch
            </span>
          </div>
        </div>
      )}
    </div>
  );
});

FarmDetailSection.displayName = 'FarmDetailSection';
