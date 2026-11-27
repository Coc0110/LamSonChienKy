import React, { useMemo, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useUIStore } from '../../store/uiStore';
import { notify } from '../../store/dialogStore';
import { BASE_BUILDING_CATALOG } from '../../data/regionBuildings';
import districtPolygonsJson from '../../data/districtPolygons.json';
import type { BaseBuilding, BaseBuildingType } from '../../types/region';
import { canPlaceOnRegionGrid } from '../../utils/regionLayoutGenerator';
import { getEligibleScoutDistricts, type DistrictPolygonEntry } from '../../utils/districtScoutUtils';
import { Region3DCanvas } from './Region3DCanvas';
import { RegionBuildHUD } from './RegionBuildHUD';

export const Region3DOverlay: React.FC = () => {
  const activeRegion3D = useUIStore((s) => s.activeRegion3D);
  const setActiveRegion3D = useUIStore((s) => s.setActiveRegion3D);
  const setActiveModal = useUIStore((s) => s.setActiveModal);
  const is3DBuildPaletteOpen = useUIStore((s) => s.is3DBuildPaletteOpen);
  const set3DBuildPaletteOpen = useUIStore((s) => s.set3DBuildPaletteOpen);
  const setMarchDrawMode = useUIStore((s) => s.setMarchDrawMode);

  const cities = useGameStore((s) => s.cities);
  const resources = useGameStore((s) => s.resources);
  const generals = useGameStore((s) => s.generals);
  const regionLayouts = useGameStore((s) => s.regionLayouts);
  const baseAutomationMap = useGameStore((s) => s.baseAutomation);
  const setBaseAutomation = useGameStore((s) => s.setBaseAutomation);
  const scoutedRegionIds = useGameStore((s) => s.scoutedRegionIds);
  const activeWatchtowerScouts = useGameStore((s) => s.activeWatchtowerScouts);
  const startWatchtowerScout = useGameStore((s) => s.startWatchtowerScout);
  const activeNormalHunt = useGameStore((s) => s.activeNormalHunt);
  const activeRareHunt = useGameStore((s) => s.activeRareHunt);
  const watchtowerLastRareHuntDay = useGameStore((s) => s.watchtowerLastRareHuntDay);
  const startWatchtowerNormalHunt = useGameStore((s) => s.startWatchtowerNormalHunt);
  const startWatchtowerRareHunt = useGameStore((s) => s.startWatchtowerRareHunt);
  const buyFromDistrictMarket = useGameStore((s) => s.buyFromDistrictMarket);
  const day = useGameStore((s) => s.day);
  const formations = useGameStore((s) => s.formations);
  const defenseFormationIdsMap = useGameStore((s) => s.defenseFormationIds);
  const toggleDefenseFormation = useGameStore((s) => s.toggleDefenseFormation);
  const setActiveFormationId = useGameStore((s) => s.setActiveFormationId);
  const foragedInventory = useGameStore((s) => s.foragedInventory);
  const lastAuctionMonthKey = useGameStore((s) => s.lastAuctionMonthKey);
  const year = useGameStore((s) => s.year);
  const month = useGameStore((s) => s.month);
  const forageFromWatchtower = useGameStore((s) => s.forageFromWatchtower);
  const sellMarketGoods = useGameStore((s) => s.sellMarketGoods);
  const runMarketAuction = useGameStore((s) => s.runMarketAuction);
  const getOrCreateRegionLayout = useGameStore((s) => s.getOrCreateRegionLayout);
  const placeBaseBuilding = useGameStore((s) => s.placeBaseBuilding);
  const upgradeBaseBuilding = useGameStore((s) => s.upgradeBaseBuilding);
  const moveBaseBuilding = useGameStore((s) => s.moveBaseBuilding);
  const demolishBaseBuilding = useGameStore((s) => s.demolishBaseBuilding);
  const assignBuildingSupervisor = useGameStore((s) => s.assignBuildingSupervisor);
  const repairBaseBuilding = useGameStore((s) => s.repairBaseBuilding);
  const promoteToEliteTroops = useGameStore((s) => s.promoteToEliteTroops);

  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [activeBuildType, setActiveBuildType] = useState<BaseBuildingType | null>(null);
  const [isMovingBuilding, setIsMovingBuilding] = useState(false);
  const [buildRotation, setBuildRotation] = useState<0 | 1 | 2 | 3>(0);
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
    const onRotate = (dir: 1 | -1) =>
      setBuildRotation((r) => ((((r + dir) % 4) + 4) % 4) as 0 | 1 | 2 | 3);

    if (isMovingBuilding && selectedBuilding) {
      const baseSpec = BASE_BUILDING_CATALOG[selectedBuilding.type];
      const effCols = buildRotation % 2 === 1 ? baseSpec.spanRows : baseSpec.spanCols;
      const effRows = buildRotation % 2 === 1 ? baseSpec.spanCols : baseSpec.spanRows;
      return {
        buildingType: selectedBuilding.type,
        level: selectedBuilding.level,
        rotation: buildRotation,
        spanCols: effCols,
        spanRows: effRows,
        onRotate,
        canPlaceAt: (col: number, row: number) =>
          canPlaceOnRegionGrid(
            layout.buildings,
            col,
            row,
            effCols,
            effRows,
            selectedBuilding.id,
            placeOpts
          ),
      };
    }
    if (activeBuildType) {
      const spec = BASE_BUILDING_CATALOG[activeBuildType];
      const effCols = buildRotation % 2 === 1 ? spec.spanRows : spec.spanCols;
      const effRows = buildRotation % 2 === 1 ? spec.spanCols : spec.spanRows;
      return {
        buildingType: activeBuildType,
        level: 1,
        rotation: buildRotation,
        spanCols: effCols,
        spanRows: effRows,
        onRotate,
        canPlaceAt: (col: number, row: number) =>
          canPlaceOnRegionGrid(layout.buildings, col, row, effCols, effRows, undefined, placeOpts),
      };
    }
    return null;
  }, [activeRegion3D, layout, isMovingBuilding, selectedBuilding, activeBuildType, buildRotation, city]);

  if (!activeRegion3D || !layout) return null;

  const handleClickCell = (col: number, row: number, building: BaseBuilding | null) => {
    if (activeRegion3D.mode === 'base_build') {
      if (isMovingBuilding && selectedBuilding) {
        const res = moveBaseBuilding(activeRegion3D.cityId, selectedBuilding.id, col, row, buildRotation);
        if (res.success) {
          notify.success(res.message);
          setIsMovingBuilding(false);
          if (is3DBuildPaletteOpen) setSelectedBuildingId(null);
        } else {
          notify.warning(res.message);
        }
        return;
      }

      if (activeBuildType) {
        const res = placeBaseBuilding(activeRegion3D.cityId, activeBuildType, col, row, buildRotation);
        if (res.success) {
          notify.success(res.message);
          if (activeBuildType !== 'wall' && activeBuildType !== 'road') {
            setActiveBuildType(null);
          }
        } else {
          notify.warning(res.message);
        }
        return;
      }

      // Trong chế độ xây dựng: nhấn vào công trình sẽ vào thẳng chế độ di dời, không mở thông tin chi tiết
      if (is3DBuildPaletteOpen && building) {
        setSelectedBuildingId(building.id);
        setIsMovingBuilding(true);
        setBuildRotation(building.rotation ?? 0);
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
        movingBuildingId={isMovingBuilding ? selectedBuilding?.id ?? null : null}
        placementPreview={placementPreview}
        showBuildGrid={is3DBuildPaletteOpen || Boolean(placementPreview)}
        onHoverCell={setHoveredCell}
        onClickCell={handleClickCell}
        onZoomOutThreshold={handleZoomOut}
      />
      <RegionBuildHUD
        cityName={city?.name || activeRegion3D.cityId}
        mode={activeRegion3D.mode}
        layout={layout}
        gold={resources.gold}
        wood={resources.wood ?? 0}
        food={resources.food}
        regularTroopsCount={Math.max(0, Math.floor(resources.troops - (resources.eliteTroops ?? 0)))}
        eliteTroopsCount={Math.floor(resources.eliteTroops ?? 0)}
        generals={generals.filter((g) => g.unlocked)}
        onAssignSupervisor={(buildingId, generalId) => {
          const res = assignBuildingSupervisor(activeRegion3D.cityId, buildingId, generalId);
          if (res.success) notify.success(res.message);
          else notify.warning(res.message);
        }}
        onRepairBuilding={(buildingId) => {
          const res = repairBaseBuilding(activeRegion3D.cityId, buildingId);
          if (res.success) notify.success(res.message);
          else notify.warning(res.message);
        }}
        onPromoteElite={(count) => {
          const res = promoteToEliteTroops(activeRegion3D.cityId, count);
          if (res.success) notify.success(res.message);
          else notify.warning(res.message);
        }}
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
        scoutableDistricts={(() => {
          const allDistricts = (
            districtPolygonsJson as unknown as {
              districts: Array<DistrictPolygonEntry & { faction: string; center: [number, number] }>;
            }
          ).districts;
          const wtLevel =
            selectedBuilding?.type === 'watchtower' ? selectedBuilding.level : 1;
          const scoutedIds = Object.keys(scoutedRegionIds ?? {});
          const activeTargetIds = new Set(
            Object.values(activeWatchtowerScouts ?? {}).map((t) => t.targetId)
          );
          const eligible = getEligibleScoutDistricts(allDistricts, scoutedIds, wtLevel).filter(
            (d) =>
              !activeTargetIds.has(d.id) &&
              !cities.some((c) => c.id === d.id && (c.faction === 'lam_son' || c.hasBase))
          );
          const centerById = new Map(allDistricts.map((d) => [d.id, d.center]));
          const bx = city?.x ?? 50.8;
          const by = city?.y ?? 47.6;
          return eligible.sort((a, b) => {
            const ca = centerById.get(a.id) ?? [bx, by];
            const cb = centerById.get(b.id) ?? [bx, by];
            return Math.hypot(ca[0] - bx, ca[1] - by) - Math.hypot(cb[0] - bx, cb[1] - by);
          });
        })()}
        activeWatchtowerScouts={activeWatchtowerScouts ?? {}}
        onScoutDistrict={(watchtowerId, targetId, targetName, scoutDays) => {
          const res = startWatchtowerScout(watchtowerId, targetId, targetName, scoutDays);
          if (res.success) notify.success(res.message);
          else notify.warning(res.message);
        }}
        formations={formations.filter((f) => f.faction === 'lam_son')}
        defenseFormationIds={defenseFormationIdsMap?.[activeRegion3D.cityId] ?? []}
        onToggleDefenseFormation={(formationId) => {
          toggleDefenseFormation(activeRegion3D.cityId, formationId);
        }}
        onDispatchMarch={(formationId) => {
          setActiveFormationId(formationId);
          setMarchDrawMode({ formationId });
          handleZoomOut();
        }}
        onOpenArmyModal={() => {
          setActiveModal('army');
        }}
        foragedInventory={foragedInventory ?? []}
        resourcesSummary={{
          food: resources.food,
          wood: resources.wood ?? 0,
          ironOre: resources.ironOre ?? 0,
          swords: resources.swords,
          spears: resources.spears,
          bows: resources.bows,
        }}
        isDistrictScouted={Boolean(scoutedRegionIds?.[activeRegion3D.cityId])}
        activeNormalHunt={activeNormalHunt ?? {}}
        activeRareHunt={activeRareHunt ?? {}}
        watchtowerLastRareHuntDay={watchtowerLastRareHuntDay ?? {}}
        currentAbsDay={(year - 1416) * 365 + (month - 1) * 30 + day}
        onStartNormalHunt={(watchtowerId, tier) => {
          const res = startWatchtowerNormalHunt(activeRegion3D.cityId, watchtowerId, tier);
          if (res.success) notify.success(res.message);
          else notify.warning(res.message);
        }}
        onStartRareHunt={(watchtowerId, leaderGeneralId) => {
          const res = startWatchtowerRareHunt(activeRegion3D.cityId, watchtowerId, leaderGeneralId);
          if (res.success) notify.success(res.message);
          else notify.warning(res.message);
        }}
        onBuyDistrictGood={(good, amount) => {
          const res = buyFromDistrictMarket(activeRegion3D.cityId, good, amount);
          if (res.success) notify.success(res.message);
          else notify.warning(res.message);
        }}
        canAuctionThisMonth={lastAuctionMonthKey !== `${year}-${month}`}
        onForageWatchtower={(watchtowerId, level, forageMode) => {
          const res = forageFromWatchtower(watchtowerId, level, forageMode);
          if (res.success) notify.success(res.message);
          else notify.warning(res.message);
        }}
        onSellMarketGoods={(payload) => {
          const res = sellMarketGoods(activeRegion3D.cityId, payload);
          if (res.success) notify.success(res.message);
          else notify.warning(res.message);
        }}
        onRunMarketAuction={(payload) => {
          const res = runMarketAuction(activeRegion3D.cityId, payload);
          if (res.success) notify.success(res.message);
          else notify.warning(res.message);
        }}
        onSelectBuildType={(type) => {
          setIsMovingBuilding(false);
          setActiveBuildType(type);
          setBuildRotation(0);
          if (type) setSelectedBuildingId(null);
        }}
        onCloseBuildPalette={() => {
          set3DBuildPaletteOpen(false);
          setIsMovingBuilding(false);
          setSelectedBuildingId(null);
        }}
        onUpgradeBuilding={handleUpgrade}
        onStartMoveBuilding={() => {
          setActiveBuildType(null);
          setBuildRotation(selectedBuilding?.rotation ?? 0);
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
