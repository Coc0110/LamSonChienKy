import React from 'react';
import { useGameStore } from '../../../store/gameStore';
import type { PlacedStructure } from '../../../types';
import { getNextHarvestSeason } from '../../../utils/harvestSeasons';
import { checkFarmUpgradeValid } from '../../../data/terrainGrid';

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
  const upgradeFarm = useGameStore(state => state.upgradeFarm);
  const cities = useGameStore(state => state.cities);
  const structures = useGameStore(state => state.structures);
  const gold = useGameStore(state => state.resources.gold);
  const day = useGameStore(state => state.day);
  const month = useGameStore(state => state.month);
  const year = useGameStore(state => state.year);

  const nextHarvest = getNextHarvestSeason(day, month, year);

  const upgradeInfo = React.useMemo(() => {
    return checkFarmUpgradeValid(structure, cities, structures);
  }, [structure, cities, structures]);

  // Hiệu suất theo kích cỡ: 5x5 (0.22), 6x6 (0.24), 7x7 (0.26)
  const currentGridSize = structure.gridSize || (structure.maxWorkers === 50 ? 7 : (structure.maxWorkers === 35 || structure.maxWorkers === 30) ? 6 : 5);
  const efficiency = currentGridSize === 7 ? 0.26 : currentGridSize === 6 ? 0.24 : 0.22;
  const weatherMult = structure.seasonCondition === 'bountiful' ? 1.25 : structure.seasonCondition === 'poor' ? 0.70 : 1.0;
  const workers = structure.assignedWorkers || 0;
  const maxWorkers = structure.maxWorkers || (currentGridSize === 7 ? 50 : currentGridSize === 6 ? 35 : 25);

  const projectedDaysAtHarvest = (structure.cropDays || 0) + nextHarvest.daysRemaining;
  const expectedTotalFood = Math.round(workers * projectedDaysAtHarvest * efficiency * weatherMult);
  const expectedTax = Math.round(expectedTotalFood * (taxRatePercent / 100));
  const expectedNetHarvest = Math.max(0, expectedTotalFood - expectedTax);

  // Thời tiết ngắn gọn
  const weatherLabel = 
    structure.seasonCondition === 'bountiful' 
      ? 'Được mùa' 
      : structure.seasonCondition === 'poor' 
      ? 'Mất mùa' 
      : 'Bình hòa';

  const weatherColor = 
    structure.seasonCondition === 'bountiful' 
      ? 'text-[#15803d]' 
      : structure.seasonCondition === 'poor' 
      ? 'text-[#b45309]' 
      : 'text-[#261304]';

  const tierLabel = currentGridSize === 7 ? 'Đại Điền (7x7)' : currentGridSize === 6 ? 'Trung Điền (6x6)' : 'Tiểu Điền (5x5)';

  return (
    <div className="space-y-2.5 text-xs text-[#2a1708] font-serif">
      {/* Khối Trạng thái & Điều phối nông đinh */}
      <div className="p-2.5 rounded bg-black/[0.04] border border-[#8c6b44]/25 space-y-2">
        <div className="flex justify-between items-center whitespace-nowrap">
          <span className="text-[#5c3e23] font-bold shrink-0">Trạng thái:</span>
          <span className={`font-bold ${structure.status === 'building' ? 'text-[#b45309]' : 'text-[#15803d]'}`}>
            {structure.status === 'building'
              ? (structure.isUpgrading
                  ? `Đang mở rộng (còn ${Math.ceil(structure.buildDaysRemaining)} ngày)`
                  : `Đang thi công (còn ${Math.ceil(structure.buildDaysRemaining)} ngày)`)
              : 'Canh tác bình thường'}
          </span>
        </div>

        {/* Hiển thị nhân lực canh tác tự động theo Ngụ binh ư nông */}
        {structure.status === 'active' && (
          <div className="pt-1.5 border-t border-[#8c6b44]/20 space-y-1">
            <div className="flex justify-between items-center whitespace-nowrap">
              <span className="text-[#5c3e23] font-bold shrink-0">Nông đinh canh tác:</span>
              <span className="font-serif font-black text-sm text-[#8c2d19]">
                {workers}/{maxWorkers} người
              </span>
            </div>
            <p className="text-[10.5px] text-[#704d2e] italic leading-tight">
              Tự động phân bổ theo quốc sách "Ngụ binh ư nông" (chỉ rút khi xuất quân ra trận).
            </p>
          </div>
        )}
      </div>

      {/* Khối Nâng Cấp Mở Rộng Quy Mô Đồn Điền */}
      <div className="p-2.5 rounded bg-black/[0.04] border border-[#8c6b44]/25 space-y-2">
        <div className="flex justify-between items-center whitespace-nowrap">
          <span className="text-[#5c3e23] font-bold shrink-0">Quy mô ruộng:</span>
          <span className="font-serif font-bold text-[#8c2d19]">
            {tierLabel}
          </span>
        </div>

        {structure.status === 'building' ? (
          <div className="text-[11px] text-[#b45309] font-serif">
            Đang thi công mở rộng đắp bờ (còn {Math.ceil(structure.buildDaysRemaining)} ngày)
          </div>
        ) : currentGridSize >= 7 ? (
          <div className="text-[11px] text-[#15803d] font-serif font-bold">
            ✓ Đã đạt quy mô canh tác tối đa
          </div>
        ) : (
          <div className="space-y-1.5 pt-1 border-t border-[#8c6b44]/20">
            <div className="flex justify-between items-center text-[11px] whitespace-nowrap">
              <span className="text-[#5c3e23]">Nâng cấp lên:</span>
              <span className="font-bold text-[#261304]">{upgradeInfo.targetTierName}</span>
            </div>

            <div className="flex justify-between items-center text-[11px] whitespace-nowrap">
              <span className="text-[#5c3e23]">Chi phí & Thợ:</span>
              <span className="font-bold text-[#8c2d19]">
                {upgradeInfo.costGold} Vàng • {upgradeInfo.reqWorkers} Thợ ({upgradeInfo.buildDays} ngày)
              </span>
            </div>

            {!upgradeInfo.canUpgrade && (
              <div className="text-[10.5px] text-[#b91c1c] font-serif italic leading-tight">
                ⚠ {upgradeInfo.reason}
              </div>
            )}

            <button
              disabled={!upgradeInfo.canUpgrade || gold < (upgradeInfo.costGold || 0)}
              onClick={() => {
                upgradeFarm(structure.id);
              }}
              className="w-full relative h-[30px] px-3 flex items-center justify-center transition-transform hover:scale-102 active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer mt-1"
            >
              <img
                src="/ink_stroke_1.png"
                alt="Vết mực"
                className="absolute inset-0 w-full h-full object-fill pointer-events-none drop-shadow-[0_1px_3px_rgba(0,0,0,0.3)]"
              />
              <span className="relative z-10 font-serif font-bold text-xs text-[#fcf4e4] tracking-wider uppercase drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                Mở rộng đồn điền
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Thông tin mùa màng & Sản lượng thu hoạch */}
      {structure.status === 'active' && (
        <div className="p-3 rounded bg-black/[0.04] border border-[#8c6b44]/25 space-y-1.5">
          {/* 1. Mốc vụ mùa kế tiếp */}
          <div className="flex justify-between items-center whitespace-nowrap">
            <span className="text-[#5c3e23] font-bold shrink-0">Vụ mùa tới:</span>
            <span className="font-serif font-bold text-[#8c2d19]">
              {nextHarvest.season.name} ({nextHarvest.targetDay}/{nextHarvest.targetMonth}) - còn {nextHarvest.daysRemaining} ngày
            </span>
          </div>

          {/* 2. Số ngày đã cày cấy */}
          <div className="flex justify-between items-center whitespace-nowrap">
            <span className="text-[#5c3e23] shrink-0">Đã cày cấy vụ này:</span>
            <span className="font-serif font-bold text-[#261304]">
              {structure.cropDays || 0} ngày
            </span>
          </div>

          {/* 3. Tình trạng mùa vụ */}
          <div className="flex justify-between items-center whitespace-nowrap">
            <span className="text-[#5c3e23] shrink-0">Khí hậu mùa:</span>
            <span className={`font-serif font-bold ${weatherColor}`}>
              {weatherLabel}
            </span>
          </div>

          {/* 4. Biến cố ruộng lúa (nếu có) */}
          {structure.recentEvent && (
            <div className="flex justify-between items-center whitespace-nowrap">
              <span className="text-[#5c3e23] shrink-0">Biến cố ruộng:</span>
              <span className="font-serif font-bold text-[#8c2d19] truncate max-w-[170px]" title={structure.recentEvent}>
                {structure.recentEvent}
              </span>
            </div>
          )}

          {/* 5. Sản lượng dự kiến */}
          <div className="flex justify-between items-center whitespace-nowrap pt-1 border-t border-[#8c6b44]/25">
            <span className="text-[#5c3e23] shrink-0">Sản lượng dự kiến:</span>
            <span className="font-serif font-black text-sm text-[#8c2d19]">
              ~{expectedTotalFood.toLocaleString()} thạch
            </span>
          </div>

          {/* 6. Sưu thuế nộp */}
          <div className="flex justify-between items-center whitespace-nowrap">
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[#5c3e23]">Sưu thuế nộp:</span>
              <span className={`font-serif font-bold ${isMingOccupied ? 'text-red-700' : 'text-emerald-700'}`}>
                {taxRatePercent}%
              </span>
            </div>
            <span className="font-serif font-black text-[#8c2d19]">
              -{expectedTax.toLocaleString()} thạch
            </span>
          </div>

          {/* 7. Thực thu dự kiến */}
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
