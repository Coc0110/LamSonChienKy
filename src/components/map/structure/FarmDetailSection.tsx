import React from 'react';
import { Plus, Minus } from 'lucide-react';
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
  const assignFarmWorkers = useGameStore(state => state.assignFarmWorkers);

  // Tính toán sản lượng ruộng nương
  const efficiency = structure.gridSize === 7 ? 0.26 : structure.gridSize === 6 ? 0.24 : 0.22;
  const weatherMult = structure.seasonCondition === 'bountiful' ? 1.25 : structure.seasonCondition === 'poor' ? 0.70 : 1.0;
  const workers = structure.assignedWorkers || 0;
  const expectedTotalFood = Math.round(workers * 90 * efficiency * weatherMult);
  const expectedTax = Math.round(expectedTotalFood * (taxRatePercent / 100));
  const expectedNetHarvest = Math.max(0, expectedTotalFood - expectedTax);

  return (
    <div className="space-y-3">
      {/* Trạng thái thi công / hoạt động */}
      <div className="p-2.5 rounded bg-black/[0.04] border border-[#8c6b44]/25 space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="text-[#5c3e23] font-bold">Trạng thái:</span>
          <span className={`font-bold ${structure.status === 'building' ? 'text-[#b45309]' : 'text-[#15803d]'}`}>
            {structure.status === 'building'
              ? `🚧 Đang thi công (còn ${structure.buildDaysRemaining} ngày)`
              : '🟢 Canh tác bình thường'}
          </span>
        </div>

        {/* Điều động nông đinh canh tác */}
        {structure.status === 'active' && (
          <div className="flex justify-between items-center pt-1 border-t border-[#8c6b44]/20">
            <span className="text-[#5c3e23] font-bold">Nông đinh canh tác:</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => assignFarmWorkers(structure.id, -1)}
                className="relative group w-7 h-7 flex items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                title="Bớt 1 nông đinh"
              >
                <img
                  src="/ink_blot.png"
                  alt="Chấm mực"
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)] group-hover:brightness-125 transition-all"
                />
                <span className="relative z-10 text-[#fcf4e4] font-bold">
                  <Minus size={13} strokeWidth={2.8} />
                </span>
              </button>
              <span className="font-mono font-bold text-sm min-w-[50px] text-center text-[#8c2d19]">
                {structure.assignedWorkers}/{structure.maxWorkers}
              </span>
              <button
                onClick={() => assignFarmWorkers(structure.id, 1)}
                className="relative group w-7 h-7 flex items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                title="Thêm 1 nông đinh"
              >
                <img
                  src="/ink_blot.png"
                  alt="Chấm mực"
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)] group-hover:brightness-125 transition-all"
                />
                <span className="relative z-10 text-[#fcf4e4] font-bold">
                  <Plus size={13} strokeWidth={2.8} />
                </span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tình trạng mùa màng & Sản lượng dự kiến */}
      {structure.status === 'active' && (
        <div className="p-3 rounded bg-black/[0.04] border border-[#8c6b44]/25 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[#5c3e23] font-bold">Thời tiết vụ mùa:</span>
            <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
              structure.seasonCondition === 'bountiful' 
                ? 'bg-emerald-100 text-emerald-800' 
                : structure.seasonCondition === 'poor'
                ? 'bg-red-100 text-red-800'
                : 'bg-amber-100 text-amber-800'
            }`}>
              {structure.seasonCondition === 'bountiful' 
                ? '🌾 Được mùa bội thu (+25%)' 
                : structure.seasonCondition === 'poor'
                ? '🍂 Mất mùa / Hạn hán (-30%)'
                : '🌧️ Mưa thuận gió hòa (100%)'}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-[#5c3e23]">Tiến độ vụ mùa:</span>
            <span className="font-mono font-bold text-[#261304]">
              Ngày {structure.cropDays}/{structure.cropCycleDays} (~{Math.round((structure.cropDays/structure.cropCycleDays)*100)}%)
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-[#5c3e23]">Tổng sản lượng dự kiến:</span>
            <span className="font-mono font-bold text-[#8c2d19]">
              ~{expectedTotalFood.toLocaleString()} thạch thóc
            </span>
          </div>

          {/* Thuế suất & Ảnh hưởng quân Minh */}
          <div className="pt-1.5 border-t border-[#8c6b44]/25 flex justify-between items-center">
            <div>
              <span className="font-bold text-[#5c3e23]">Sưu thuế nộp: </span>
              <span className={`font-bold ${isMingOccupied ? 'text-red-700' : 'text-emerald-700'}`}>
                {taxRatePercent}% ({isMingOccupied ? 'Giặc Minh chiếm đóng' : 'Nuôi nghĩa quân'})
              </span>
            </div>
            <span className="font-mono font-bold text-red-700">
              -{expectedTax.toLocaleString()} thạch
            </span>
          </div>

          {/* Thực thu nhập kho */}
          <div className="pt-1 border-t border-[#8c6b44]/25 flex justify-between items-center text-sm font-bold">
            <span className="text-[#261304]">Thực thu nhập kho lương:</span>
            <span className="font-mono text-[#15803d]">
              +{expectedNetHarvest.toLocaleString()} thạch
            </span>
          </div>
        </div>
      )}
    </div>
  );
});

FarmDetailSection.displayName = 'FarmDetailSection';
