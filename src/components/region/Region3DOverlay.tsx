import React, { useMemo, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useUIStore } from '../../store/uiStore';
import { notify } from '../../store/dialogStore';
import { BASE_BUILDING_CATALOG } from '../../data/regionBuildings';
import type { BaseBuilding, BaseBuildingType } from '../../types/region';
import { canPlaceOnRegionGrid } from '../../utils/regionLayoutGenerator';
import { Region3DCanvas } from './Region3DCanvas';
import { RegionBuildHUD } from './RegionBuildHUD';

export const Region3DOverlay: React.FC = () => {
  const activeRegion3D = useUIStore((s) => s.activeRegion3D);
  const setActiveRegion3D = useUIStore((s) => s.setActiveRegion3D);
  const setActiveModal = useUIStore((s) => s.setActiveModal);
  const is3DBuildPaletteOpen = useUIStore((s) => s.is3DBuildPaletteOpen);
  const set3DBuildPaletteOpen = useUIStore((s) => s.set3DBuildPaletteOpen);

  const cities = useGameStore((s) => s.cities);
  const resources = useGameStore((s) => s.resources);
  const regionLayouts = useGameStore((s) => s.regionLayouts);
  const baseAutomationMap = useGameStore((s) => s.baseAutomation);
  const setBaseAutomation = useGameStore((s) => s.setBaseAutomation);
  const getOrCreateRegionLayout = useGameStore((s) => s.getOrCreateRegionLayout);
  const placeBaseBuilding = useGameStore((s) => s.placeBaseBuilding);
  const upgradeBaseBuilding = useGameStore((s) => s.upgradeBaseBuilding);
  const moveBaseBuilding = useGameStore((s) => s.moveBaseBuilding);
  const demolishBaseBuilding = useGameStore((s) => s.demolishBaseBuilding);

  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [activeBuildType, setActiveBuildType] = useState<BaseBuildingType | null>(null);
  const [isMovingBuilding, setIsMovingBuilding] = useState(false);
  const [hoveredCell, setHoveredCell] = useState<{ col: number; row: number } | null>(null);

  const city = useMemo(
    () => (activeRegion3D ? cities.find((c) => c.id === activeRegion3D.cityId) : undefined),
    [cities, activeRegion3D]
  );

  const layout = useMemo(() => {
    if (!activeRegion3D) return null;
    return regionLayouts[activeRegion3D.cityId] || getOrCreateRegionLayout(activeRegion3D.cityId);
  }, [activeRegion3D, regionLayouts, getOrCreateRegionLayout]);

  const selectedBuilding = useMemo(
    () => layout?.buildings.find((b) => b.id === selectedBuildingId && b.status !== 'destroyed') || null,
    [layout, selectedBuildingId]
  );

  const placementPreview = useMemo(() => {
    if (!activeRegion3D || activeRegion3D.mode !== 'base_build' || !layout) return null;
    const placeOpts = {
      allowOutside: true,
      basePctX: city?.x ?? 50.8,
      basePctY: city?.y ?? 47.6,
    };
    if (isMovingBuilding && selectedBuilding) {
      return {
        spanCols: selectedBuilding.spanCols,
        spanRows: selectedBuilding.spanRows,
        canPlaceAt: (col: number, row: number) =>
          canPlaceOnRegionGrid(
            layout.buildings,
            col,
            row,
            selectedBuilding.spanCols,
            selectedBuilding.spanRows,
            selectedBuilding.id,
            placeOpts
          ),
      };
    }
    if (activeBuildType) {
      const spec = BASE_BUILDING_CATALOG[activeBuildType];
      return {
        spanCols: spec.spanCols,
        spanRows: spec.spanRows,
        canPlaceAt: (col: number, row: number) =>
          canPlaceOnRegionGrid(layout.buildings, col, row, spec.spanCols, spec.spanRows, undefined, placeOpts),
      };
    }
    return null;
  }, [activeRegion3D, layout, isMovingBuilding, selectedBuilding, activeBuildType, city]);

  if (!activeRegion3D || !layout) return null;

  const handleClickCell = (col: number, row: number, building: BaseBuilding | null) => {
    if (activeRegion3D.mode === 'base_build') {
      if (isMovingBuilding && selectedBuilding) {
        const res = moveBaseBuilding(activeRegion3D.cityId, selectedBuilding.id, col, row);
        if (res.success) {
          notify.success(res.message);
          setIsMovingBuilding(false);
        } else {
          notify.warning(res.message);
        }
        return;
      }

      if (activeBuildType) {
        const res = placeBaseBuilding(activeRegion3D.cityId, activeBuildType, col, row);
        if (res.success) {
          notify.success(res.message);
          if (activeBuildType !== 'wall') {
            setActiveBuildType(null);
          }
        } else {
          notify.warning(res.message);
        }
        return;
      }
    }

    setSelectedBuildingId(building ? building.id : null);
    setIsMovingBuilding(false);
  };

  const handleUpgrade = (buildingId: string) => {
    const res = upgradeBaseBuilding(activeRegion3D.cityId, buildingId);
    if (res.success) notify.success(res.message);
    else notify.warning(res.message);
  };

  const handleDemolish = (buildingId: string) => {
    const res = demolishBaseBuilding(activeRegion3D.cityId, buildingId);
    if (res.success) {
      notify.info(res.message);
      setSelectedBuildingId(null);
    } else {
      notify.warning(res.message);
    }
  };

  const handleZoomOut = () => {
    setSelectedBuildingId(null);
    setActiveBuildType(null);
    setIsMovingBuilding(false);
    setActiveRegion3D(null);
  };

  return (
    <div className="fixed inset-0 z-40 bg-[#dbe6d5]">
      <Region3DCanvas
        layout={layout}
        cityCoord={city ? { x: city.x, y: city.y } : undefined}
        isEnemy={activeRegion3D.mode === 'scout_view'}
        selectedBuildingId={selectedBuildingId}
        placementPreview={placementPreview}
        onHoverCell={setHoveredCell}
        onClickCell={handleClickCell}
        onZoomOutThreshold={handleZoomOut}
      />
      <RegionBuildHUD
        cityName={city?.name || activeRegion3D.cityId}
        mode={activeRegion3D.mode}
        layout={layout}
        gold={resources.gold}
        food={resources.food}
        selectedBuilding={selectedBuilding}
        activeBuildType={activeBuildType}
        isBuildPaletteOpen={is3DBuildPaletteOpen}
        isMovingBuilding={isMovingBuilding}
        hoveredCell={hoveredCell}
        enemyTroops={city?.troops}
        baseAutomation={
          baseAutomationMap?.[activeRegion3D.cityId] ?? {
            dayNightLock: 'auto',
            autoClean: false,
            autoRefugees: false,
            autoTrain: false,
          }
        }
        onUpdateAutomation={(patch) => setBaseAutomation(activeRegion3D.cityId, patch)}
        onSelectBuildType={(type) => {
          setIsMovingBuilding(false);
          setActiveBuildType(type);
          if (type) setSelectedBuildingId(null);
        }}
        onCloseBuildPalette={() => set3DBuildPaletteOpen(false)}
        onUpgradeBuilding={handleUpgrade}
        onStartMoveBuilding={() => {
          setActiveBuildType(null);
          setIsMovingBuilding((v) => !v);
        }}
        onDemolishBuilding={handleDemolish}
        onOpenBuildingAction={(modal) => {
          setActiveModal(modal);
        }}
        onClearSelection={() => {
          setSelectedBuildingId(null);
          setIsMovingBuilding(false);
        }}
        onZoomOut={handleZoomOut}
      />
    </div>
  );
};
