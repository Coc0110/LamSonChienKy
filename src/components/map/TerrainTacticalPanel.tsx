import React, { useState } from 'react';
import type { CityNode, TroopType } from '../../types';
import { calculateMarchRoute, getTerrainAt } from '../../data/terrainData';
import { useGameStore } from '../../store/gameStore';
import type { MarchCalculationResult, TerrainType } from '../../types/terrain';
import { Compass, Shield, Trees, Mountain, Skull, Droplets, MapPin, Play, X, Eye, EyeOff } from 'lucide-react';

interface TerrainTacticalPanelProps {
  selectedCity: CityNode | null;
  allCities: CityNode[];
  onSelectCity?: (cityId: string) => void;
  showTerrainZones: boolean;
  onToggleTerrainZones: () => void;
  activeMarchRoute: MarchCalculationResult | null;
  onSetMarchRoute: (route: MarchCalculationResult | null) => void;
  onClose?: () => void;
}

const TROOP_LABELS: Record<TroopType, { name: string; icon: string }> = {
  infantry: { name: 'Bộ Binh', icon: '🗡️' },
  cavalry: { name: 'Kỵ Binh', icon: '🐎' },
  archer: { name: 'Cung Nỏ', icon: '🏹' },
  elephant: { name: 'Tượng Binh', icon: '🐘' },
  navy: { name: 'Thủy Quân', icon: '⛵' }
};

export const TerrainTacticalPanel: React.FC<TerrainTacticalPanelProps> = React.memo(({
  selectedCity,
  allCities,
  showTerrainZones,
  onToggleTerrainZones,
  activeMarchRoute,
  onSetMarchRoute,
  onClose
}) => {
  const connections = useGameStore(state => state.connections);
  const [targetCityId, setTargetCityId] = useState<string>('tay_do');
  const [selectedTroop, setSelectedTroop] = useState<TroopType>('infantry');
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  const activeCity = selectedCity || allCities.find(c => c.id === 'lam_son') || allCities[0];
  if (!activeCity) return null;

  const currentTerrain = getTerrainAt(activeCity.x, activeCity.y);
  const targetCity = allCities.find(c => c.id === targetCityId) || allCities.find(c => c.id !== activeCity.id) || allCities[0];

  const handleSimulateMarch = () => {
    if (!targetCity || targetCity.id === activeCity.id) return;
    const result = calculateMarchRoute(activeCity, targetCity, selectedTroop, allCities, connections);
    onSetMarchRoute(result);
  };

  const getTerrainIcon = (type: TerrainType) => {
    switch (type) {
      case 'forest': return <Trees size={16} className="text-emerald-400" />;
      case 'mountain': return <Mountain size={16} className="text-orange-400" />;
      case 'cliff': return <Skull size={16} className="text-red-400" />;
      case 'swamp': return <Droplets size={16} className="text-cyan-400" />;
      case 'water': return <Droplets size={16} className="text-blue-400" />;
      default: return <Shield size={16} className="text-amber-400" />;
    }
  };

  return (
    <div className="absolute top-20 right-5 z-[800] w-88 max-w-[calc(100vw-2.5rem)] bg-[#1a1007]/95 border-2 border-[#a87c4f] rounded-xl shadow-2xl backdrop-blur-md text-[#ebd0a7] font-sans overflow-hidden transition-all duration-300">
      {/* Header Panel */}
      <div className="px-4 py-3 bg-[#2b1809] border-b border-[#a87c4f]/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Compass size={18} className="text-[#f59e0b]" />
          <h3 className="font-bold text-sm tracking-wider uppercase text-[#fef3c7]">
            Chiến Báo Địa Hình & Hành Quân
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleTerrainZones}
            title={showTerrainZones ? 'Ẩn lớp phân vùng địa hình' : 'Hiện lớp phân vùng địa hình'}
            className={`p-1.5 rounded transition-colors cursor-pointer ${
              showTerrainZones ? 'bg-[#f59e0b] text-black font-bold' : 'text-[#c9a679] hover:bg-[#3d230d]'
            }`}
          >
            {showTerrainZones ? <Eye size={15} /> : <EyeOff size={15} />}
          </button>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 text-[#c9a679] hover:bg-[#3d230d] rounded transition-colors cursor-pointer text-xs font-bold"
          >
            {isCollapsed ? 'Mở' : 'Thu'}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              title="Đóng bảng chiến báo"
              className="p-1.5 text-[#c9a679] hover:text-white hover:bg-red-950/80 rounded transition-colors cursor-pointer"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {!isCollapsed && (
        <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto text-xs leading-relaxed">
          {/* 1. Thông tin Cứ điểm & Địa hình hiện tại */}
          <div className="bg-[#241407] border border-[#78512b] rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-sans uppercase tracking-wider text-stone-400">
                Cứ điểm đang chọn:
              </span>
              <span className="font-serif font-bold text-sm text-[#fde68a] flex items-center gap-1">
                <MapPin size={14} className="text-[#f59e0b]" />
                {activeCity.name}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-[#4a2e16]">
              <span className="flex items-center gap-1.5 font-bold text-[#fef3c7]">
                {getTerrainIcon(currentTerrain.type)}
                {currentTerrain.name}
              </span>
              <span className="font-serif text-base font-bold text-[#deb887]">
                {currentTerrain.nameHanzi}
              </span>
            </div>

            <p className="text-[#d6c2a1] text-[11.5px] italic">
              {currentTerrain.description}
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1 font-sans text-[11px]">
              <div className="bg-[#190c03] px-2 py-1 rounded border border-[#523317]">
                <span className="text-stone-400">Tiêu hao tốc độ:</span>{' '}
                <strong className="text-[#fde68a]">{currentTerrain.moveSpeedCost}x</strong>
              </div>
              <div className="bg-[#190c03] px-2 py-1 rounded border border-[#523317]">
                <span className="text-stone-400">Phục kích thành công:</span>{' '}
                <strong className="text-emerald-400">{currentTerrain.ambushSuccessRate}%</strong>
              </div>
            </div>

            {/* Hiệu quả binh chủng tại địa hình này */}
            <div className="pt-1">
              <span className="text-[10.5px] text-stone-400 font-sans block mb-1">
                Hiệu quả tác chiến theo binh chủng:
              </span>
              <div className="grid grid-cols-5 gap-1 text-center font-sans text-[10px]">
                <div className="bg-[#190c03] p-1 rounded border border-[#3d230d]">
                  <div>🗡️ Bộ</div>
                  <strong className={currentTerrain.troopModifier.infantry >= 1 ? 'text-emerald-400' : 'text-red-400'}>
                    {Math.round(currentTerrain.troopModifier.infantry * 100)}%
                  </strong>
                </div>
                <div className="bg-[#190c03] p-1 rounded border border-[#3d230d]">
                  <div>🐎 Kỵ</div>
                  <strong className={currentTerrain.troopModifier.cavalry >= 1 ? 'text-emerald-400' : 'text-red-400'}>
                    {Math.round(currentTerrain.troopModifier.cavalry * 100)}%
                  </strong>
                </div>
                <div className="bg-[#190c03] p-1 rounded border border-[#3d230d]">
                  <div>🏹 Cung</div>
                  <strong className={currentTerrain.troopModifier.archer >= 1 ? 'text-emerald-400' : 'text-red-400'}>
                    {Math.round(currentTerrain.troopModifier.archer * 100)}%
                  </strong>
                </div>
                <div className="bg-[#190c03] p-1 rounded border border-[#3d230d]">
                  <div>🐘 Tượng</div>
                  <strong className={currentTerrain.troopModifier.elephant >= 1 ? 'text-emerald-400' : 'text-red-400'}>
                    {Math.round(currentTerrain.troopModifier.elephant * 100)}%
                  </strong>
                </div>
                <div className="bg-[#190c03] p-1 rounded border border-[#3d230d]">
                  <div>⛵ Thủy</div>
                  <strong className={currentTerrain.troopModifier.navy >= 1 ? 'text-emerald-400' : 'text-red-400'}>
                    {Math.round(currentTerrain.troopModifier.navy * 100)}%
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Tính toán & Mô phỏng Tuyến đường Hành quân */}
          <div className="bg-[#241407] border border-[#78512b] rounded-lg p-3 space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-[#fde68a] flex items-center gap-1.5">
              <Compass size={14} className="text-[#f59e0b]" />
              Kế Sách Hành Quân Tác Chiến
            </h4>

            {/* Chọn Cứ điểm Đích */}
            <div className="space-y-1">
              <label className="text-[11px] text-stone-400 block font-sans">
                Hành quân đến mục tiêu:
              </label>
              <select
                value={targetCityId}
                onChange={(e) => setTargetCityId(e.target.value)}
                className="w-full bg-[#170b03] border border-[#a87c4f]/80 rounded px-2.5 py-1.5 text-xs text-[#fef3c7] font-sans cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#f59e0b]"
              >
                {allCities
                  .filter(c => c.id !== activeCity.id)
                  .map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.type === 'city' ? 'Thành Trì' : c.type === 'chokepoint' ? 'Hiểm Ải' : 'Căn Cứ'})
                    </option>
                  ))}
              </select>
            </div>

            {/* Chọn Binh chủng Tiền phong */}
            <div className="space-y-1">
              <label className="text-[11px] text-stone-400 block font-sans">
                Binh chủng chủ lực / Tiền phong:
              </label>
              <div className="grid grid-cols-3 gap-1 font-sans text-[11px]">
                {(['infantry', 'cavalry', 'archer'] as TroopType[]).map(t => (
                  <button
                    key={t}
                    onClick={() => setSelectedTroop(t)}
                    className={`py-1 px-1.5 rounded border transition-colors cursor-pointer text-center ${
                      selectedTroop === t
                        ? 'bg-[#8c5828] text-white border-[#deb887] font-bold shadow'
                        : 'bg-[#170b03] text-stone-300 border-[#4a2e16] hover:bg-[#332010]'
                    }`}
                  >
                    {TROOP_LABELS[t].icon} {TROOP_LABELS[t].name}
                  </button>
                ))}
              </div>
            </div>

            {/* Nút Tính Toán */}
            <button
              onClick={handleSimulateMarch}
              className="w-full py-2 bg-gradient-to-r from-[#b45309] to-[#d97706] hover:from-[#d97706] hover:to-[#f59e0b] text-white font-bold rounded-lg shadow-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer text-xs"
            >
              <Play size={14} className="fill-current" />
              Khảo Sát & Tính Toán Quân Lộ
            </button>

            {/* Kết Quả Hành Quân Nếu Có */}
            {activeMarchRoute && (
              <div className="pt-2 border-t border-[#543317] space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-stone-300">
                    {activeMarchRoute.fromCityName} ➔ {activeMarchRoute.toCityName}:
                  </span>
                  <button
                    onClick={() => onSetMarchRoute(null)}
                    title="Xóa tuyến đường khảo sát"
                    className="text-stone-400 hover:text-white"
                  >
                    <X size={13} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 font-sans text-[11.5px]">
                  <div className="bg-[#170b03] p-1.5 rounded border border-[#523317]">
                    <div className="text-stone-400 text-[10px]">Cự ly đường bộ:</div>
                    <strong className="text-[#fde68a] text-sm">
                      {activeMarchRoute.totalDistanceKm} km
                    </strong>
                  </div>
                  <div className="bg-[#170b03] p-1.5 rounded border border-[#523317]">
                    <div className="text-stone-400 text-[10px]">Thời gian dự kiến:</div>
                    <strong className="text-amber-300 text-sm">
                      {activeMarchRoute.totalDays} ngày
                    </strong>
                  </div>
                </div>

                {/* Cơ cấu địa hình */}
                <div>
                  <span className="text-[10px] text-stone-400 font-sans block mb-1">
                    Cơ cấu địa hình dọc tuyến quân lộ:
                  </span>
                  <div className="flex items-center h-2.5 rounded-full overflow-hidden bg-[#170b03] border border-[#523317]">
                    {activeMarchRoute.terrainBreakdown.forest > 0 && (
                      <div
                        style={{ width: `${activeMarchRoute.terrainBreakdown.forest}%` }}
                        className="bg-emerald-600 h-full"
                        title={`Rừng già: ${activeMarchRoute.terrainBreakdown.forest}%`}
                      />
                    )}
                    {activeMarchRoute.terrainBreakdown.mountain > 0 && (
                      <div
                        style={{ width: `${activeMarchRoute.terrainBreakdown.mountain}%` }}
                        className="bg-orange-600 h-full"
                        title={`Núi cao: ${activeMarchRoute.terrainBreakdown.mountain}%`}
                      />
                    )}
                    {activeMarchRoute.terrainBreakdown.cliff > 0 && (
                      <div
                        style={{ width: `${activeMarchRoute.terrainBreakdown.cliff}%` }}
                        className="bg-red-600 h-full"
                        title={`Vách đá hiểm: ${activeMarchRoute.terrainBreakdown.cliff}%`}
                      />
                    )}
                    {activeMarchRoute.terrainBreakdown.plains > 0 && (
                      <div
                        style={{ width: `${activeMarchRoute.terrainBreakdown.plains}%` }}
                        className="bg-amber-400 h-full"
                        title={`Đồng bằng: ${activeMarchRoute.terrainBreakdown.plains}%`}
                      />
                    )}
                    {activeMarchRoute.terrainBreakdown.swamp > 0 && (
                      <div
                        style={{ width: `${activeMarchRoute.terrainBreakdown.swamp}%` }}
                        className="bg-sky-500 h-full"
                        title={`Đầm lầy: ${activeMarchRoute.terrainBreakdown.swamp}%`}
                      />
                    )}
                  </div>
                  <div className="flex justify-between text-[9px] text-stone-400 font-sans mt-0.5">
                    <span>Rừng: {activeMarchRoute.terrainBreakdown.forest}%</span>
                    <span>Núi: {activeMarchRoute.terrainBreakdown.mountain + activeMarchRoute.terrainBreakdown.cliff}%</span>
                    <span>Đồng bằng: {activeMarchRoute.terrainBreakdown.plains}%</span>
                  </div>
                </div>

                {/* Đánh giá chiến thuật */}
                <p className="text-emerald-300 text-[11px] bg-[#0c2415]/70 p-2 rounded border border-emerald-800/80">
                  ⚡ {activeMarchRoute.tacticalAdvantage}
                </p>

                {/* Cảnh báo hiểm họa */}
                {activeMarchRoute.hazards.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[10px] text-red-400 font-sans block">
                      ⚠️ Hiểm nguy địa hình:
                    </span>
                    {activeMarchRoute.hazards.map((h, idx) => (
                      <div key={idx} className="text-[10.5px] text-orange-200 bg-red-950/40 px-2 py-1 rounded border border-red-900/60">
                        • {h}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

TerrainTacticalPanel.displayName = 'TerrainTacticalPanel';
