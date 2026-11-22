import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { BaseBuilding, RegionCombatUnit, RegionLayout } from '../../types/region';
import {
  DIORAMA_PALETTE,
  animateSoldierWalk,
  createBuildingGroup,
  createDecorProp,
  createDetailedGroundTexture,
  createNaturalBoulder,
  createNpcGroup,
  createUnitGroup,
  createVietnameseTree,
  type VietnameseTreeKind,
} from '../../utils/region3DModels';
import { onSoldierBaseLoaded, preloadSoldierBaseModel } from '../../utils/soldierRigLoader';

interface PlacementPreviewConfig {
  spanCols: number;
  spanRows: number;
  canPlaceAt: (col: number, row: number) => boolean;
}

interface Region3DCanvasProps {
  layout: RegionLayout;
  isEnemy?: boolean;
  units?: RegionCombatUnit[];
  blockedTiles?: Array<{ col: number; row: number; kind: 'forest' | 'cliff' }>;
  exitZone?: { minCol: number; maxCol: number; minRow: number; maxRow: number };
  selectedBuildingId?: string | null;
  selectedUnitId?: string | null;
  placementPreview?: PlacementPreviewConfig | null;
  deployZoneHighlight?: boolean;
  onHoverCell?: (cell: { col: number; row: number } | null) => void;
  onClickCell?: (
    col: number,
    row: number,
    building: BaseBuilding | null,
    unit: RegionCombatUnit | null
  ) => void;
  onZoomOutThreshold?: () => void;
}

export const Region3DCanvas: React.FC<Region3DCanvasProps> = ({
  layout,
  isEnemy = false,
  units = [],
  blockedTiles = [],
  exitZone,
  selectedBuildingId = null,
  selectedUnitId = null,
  placementPreview = null,
  deployZoneHighlight = false,
  onHoverCell,
  onClickCell,
  onZoomOutThreshold,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const layoutRef = useRef(layout);
  layoutRef.current = layout;

  const unitsRef = useRef(units);
  unitsRef.current = units;

  const isEnemyRef = useRef(isEnemy);
  isEnemyRef.current = isEnemy;

  const selectedBuildingIdRef = useRef(selectedBuildingId);
  selectedBuildingIdRef.current = selectedBuildingId;

  const selectedUnitIdRef = useRef(selectedUnitId);
  selectedUnitIdRef.current = selectedUnitId;

  const placementPreviewRef = useRef(placementPreview);
  placementPreviewRef.current = placementPreview;

  const onHoverCellRef = useRef(onHoverCell);
  onHoverCellRef.current = onHoverCell;

  const onClickCellRef = useRef(onClickCell);
  onClickCellRef.current = onClickCell;

  const onZoomOutRef = useRef(onZoomOutThreshold);
  onZoomOutRef.current = onZoomOutThreshold;

  const sceneRefs = useRef<{
    buildingsGroup: THREE.Group;
    unitsGroup: THREE.Group;
    envGroup: THREE.Group;
    previewBox: THREE.Mesh;
    selectionRing: THREE.Mesh;
    syncBuildings: () => void;
    syncUnits: () => void;
  } | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const gridSize = layout.gridSize || 24;
    const half = gridSize / 2;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xdbe6d5);
    scene.fog = new THREE.Fog(0xdbe6d5, 36, 72);

    const camera = new THREE.PerspectiveCamera(
      42,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.1,
      160
    );
    camera.position.set(16, 18, 20);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minPolarAngle = 0.35;
    controls.maxPolarAngle = Math.PI / 2.25;
    controls.minDistance = 11;
    controls.maxDistance = 46;
    controls.target.set(0, 0, 0);

    let zoomOutTriggered = false;

    // Ánh sáng Diorama ấm áp
    const hemi = new THREE.HemisphereLight(0xfff9ec, 0x6c7a5e, 0.85);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfff1d6, 1.35);
    sun.position.set(18, 28, 14);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 1024;
    sun.shadow.mapSize.height = 1024;
    sun.shadow.camera.near = 4;
    sun.shadow.camera.far = 70;
    sun.shadow.camera.left = -16;
    sun.shadow.camera.right = 16;
    sun.shadow.camera.top = 16;
    sun.shadow.camera.bottom = -16;
    scene.add(sun);

    // Đế đảo Diorama 24x24 có viền rừng cây bao quanh kiểu Clash of Clans
    const outerRimGeo = new THREE.BoxGeometry(gridSize + 4.4, 1.5, gridSize + 4.4);
    const islandMat = new THREE.MeshStandardMaterial({ color: DIORAMA_PALETTE.cliff, roughness: 0.92 });
    const island = new THREE.Mesh(outerRimGeo, islandMat);
    island.position.y = -0.82;
    island.receiveShadow = true;
    scene.add(island);

    const outerGrassGeo = new THREE.BoxGeometry(gridSize + 4.2, 0.14, gridSize + 4.2);
    const outerGrassMat = new THREE.MeshStandardMaterial({ color: DIORAMA_PALETTE.groundAlt, roughness: 0.95 });
    const outerGrass = new THREE.Mesh(outerGrassGeo, outerGrassMat);
    outerGrass.position.y = -0.08;
    outerGrass.receiveShadow = true;
    scene.add(outerGrass);

    // Cây cối bản địa Việt Nam trang trí rìa ngoài (bụi tre, cây chuối, cây dừa, cây đa)
    const treeKinds: VietnameseTreeKind[] = ['bamboo', 'banana', 'coconut', 'banyan'];
    let tIdx = 0;
    for (let i = -half - 1.2; i <= half + 1.2; i += 2.7) {
      const positions: Array<[number, number]> = [
        [i, -half - 1.25],
        [i, half + 1.25],
        [-half - 1.25, i],
        [half + 1.25, i],
      ];
      for (const [tx, tz] of positions) {
        const kind = treeKinds[tIdx++ % treeKinds.length];
        const treeGroup = createVietnameseTree(kind);
        const s = 0.85 + Math.abs(Math.sin(tx * 1.7 + tz * 2.3)) * 0.35;
        treeGroup.scale.set(s, s, s);
        treeGroup.rotation.y = (tIdx * 1.1) % (Math.PI * 2);
        treeGroup.position.set(tx, 0, tz);
        scene.add(treeGroup);
      }
    }

    // Mặt cỏ chi tiết kèm lối mòn đất nện (plane raycast duy nhất)
    const groundGeo = new THREE.PlaneGeometry(gridSize, gridSize);
    groundGeo.rotateX(-Math.PI / 2);
    const groundTex = createDetailedGroundTexture(gridSize, layoutRef.current.buildings);
    const groundMat = new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.94 });
    const groundPlane = new THREE.Mesh(groundGeo, groundMat);
    groundPlane.receiveShadow = true;
    scene.add(groundPlane);

    // Lưới kẻ mờ
    const gridHelper = new THREE.GridHelper(gridSize, gridSize, 0x4b6a37, 0x567840);
    gridHelper.position.y = 0.015;
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.28;
    scene.add(gridHelper);

    const envGroup = new THREE.Group();
    scene.add(envGroup);

    // Vùng rìa thả quân (nếu đang công thành)
    if (deployZoneHighlight) {
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xe6a23c,
        transparent: true,
        opacity: 0.25,
        side: THREE.DoubleSide,
      });
      const strips: Array<[number, number, number, number]> = [
        [gridSize, 2, 0, -half + 1],
        [gridSize, 2, 0, half - 1],
        [2, gridSize - 4, -half + 1, 0],
        [2, gridSize - 4, half - 1, 0],
      ];
      for (const [w, d, px, pz] of strips) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), ringMat);
        m.rotation.x = -Math.PI / 2;
        m.position.set(px, 0.025, pz);
        envGroup.add(m);
      }
    }

    // Vùng thoát hiểm (nếu đang phá vây ngoài đồng)
    if (exitZone) {
      const w = exitZone.maxCol - exitZone.minCol + 1;
      const d = exitZone.maxRow - exitZone.minRow + 1;
      const cx = exitZone.minCol + w / 2 - half;
      const cz = exitZone.minRow + d / 2 - half;
      const exitMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(w, d),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
      );
      exitMesh.rotation.x = -Math.PI / 2;
      exitMesh.position.set(cx, 0.03, cz);
      envGroup.add(exitMesh);
    }

    // Địa hình rừng / vách đá (nếu có trong Ambush)
    if (blockedTiles.length > 0) {
      const trunkGeo = new THREE.CylinderGeometry(0.1, 0.14, 0.5, 6);
      const leafGeo = new THREE.ConeGeometry(0.42, 0.9, 6);
      const rockGeo = createNaturalBoulder(0.48, 3.7);
      const trunkMat = new THREE.MeshStandardMaterial({ color: DIORAMA_PALETTE.woodDark, roughness: 0.9 });
      const leafMat = new THREE.MeshStandardMaterial({ color: DIORAMA_PALETTE.leafMid, roughness: 0.85 });
      const rockMat = new THREE.MeshStandardMaterial({ color: DIORAMA_PALETTE.stone, roughness: 0.95 });

      for (const t of blockedTiles) {
        const wx = t.col + 0.5 - half;
        const wz = t.row + 0.5 - half;
        if (t.kind === 'forest') {
          const trunk = new THREE.Mesh(trunkGeo, trunkMat);
          trunk.position.set(wx, 0.25, wz);
          const leaf = new THREE.Mesh(leafGeo, leafMat);
          leaf.position.set(wx, 0.85, wz);
          leaf.castShadow = true;
          envGroup.add(trunk, leaf);
        } else {
          const rock = new THREE.Mesh(rockGeo, rockMat);
          rock.position.set(wx, 0.35, wz);
          rock.scale.set(1, 1.3, 1);
          rock.castShadow = true;
          envGroup.add(rock);
        }
      }
    }

    const buildingsGroup = new THREE.Group();
    scene.add(buildingsGroup);

    const unitsGroup = new THREE.Group();
    scene.add(unitsGroup);

    // 1 Hộp Preview nổi duy nhất (không blur, viền rõ)
    const previewGeo = new THREE.BoxGeometry(1, 0.35, 1);
    const previewMat = new THREE.MeshBasicMaterial({
      color: 0x22c55e,
      transparent: true,
      opacity: 0.45,
      wireframe: false,
    });
    const previewBox = new THREE.Mesh(previewGeo, previewMat);
    previewBox.visible = false;
    scene.add(previewBox);

    // Vòng tròn chọn công trình/quân
    const selectionRing = new THREE.Mesh(
      new THREE.RingGeometry(0.65, 0.85, 24),
      new THREE.MeshBasicMaterial({ color: 0xfacc15, side: THREE.DoubleSide })
    );
    selectionRing.rotation.x = -Math.PI / 2;
    selectionRing.position.y = 0.04;
    selectionRing.visible = false;
    scene.add(selectionRing);

    const npcsGroup = new THREE.Group();
    scene.add(npcsGroup);

    interface PatrolSquadState {
      waypoints: Array<{ x: number; z: number }>;
      segLengths: number[];
      totalLength: number;
      distance: number;
      members: Array<{
        mesh: THREE.Group;
        offsetRight: number;
        offsetBack: number;
        walkPhase: number;
      }>;
    }

    const animatedNpcs: Array<{
      mesh: THREE.Group;
      role: 'farmer' | 'smith' | 'soldier_unarmed';
      baseX: number;
      baseZ: number;
      phase: number;
      targetX?: number;
      targetZ?: number;
      pauseUntil?: number;
      walkPhase?: number;
    }> = [];
    let patrolSquad: PatrolSquadState | null = null;
    const animatedFlags: THREE.Mesh[] = [];

    const syncBuildings = () => {
      while (buildingsGroup.children.length > 0) {
        buildingsGroup.remove(buildingsGroup.children[0]);
      }
      while (npcsGroup.children.length > 0) {
        npcsGroup.remove(npcsGroup.children[0]);
      }
      animatedNpcs.length = 0;
      patrolSquad = null;
      animatedFlags.length = 0;

      const currentLayout = layoutRef.current;
      const enemy = isEnemyRef.current;
      const selId = selectedBuildingIdRef.current;

      // Cập nhật lối mòn đất nện trên texture mặt cỏ
      const nextTex = createDetailedGroundTexture(gridSize, currentLayout.buildings);
      if (groundMat.map && groundMat.map !== nextTex) {
        groundMat.map.dispose();
      }
      groundMat.map = nextTex;
      groundMat.needsUpdate = true;

      // Xây map ô tường/cổng để tự động nối liền tường rào
      const wallOccupied = new Set<string>();
      for (const b of currentLayout.buildings) {
        if (b.status === 'destroyed') continue;
        if (b.type === 'wall' || b.type === 'gate') {
          for (let c = b.col; c < b.col + b.spanCols; c++) {
            for (let r = b.row; r < b.row + b.spanRows; r++) {
              wallOccupied.add(`${c},${r}`);
            }
          }
        }
      }

      for (const b of currentLayout.buildings) {
        if (b.status === 'destroyed') continue;

        let wallMask = 0;
        if (b.type === 'wall') {
          if (wallOccupied.has(`${b.col},${b.row - 1}`)) wallMask |= 1; // Bắc
          if (wallOccupied.has(`${b.col},${b.row + 1}`)) wallMask |= 2; // Nam
          if (wallOccupied.has(`${b.col + 1},${b.row}`)) wallMask |= 4; // Đông
          if (wallOccupied.has(`${b.col - 1},${b.row}`)) wallMask |= 8; // Tây
        }

        const isConstructing = b.status === 'building' || b.status === 'upgrading';
        const group = createBuildingGroup(b.type, b.level, enemy, isConstructing, wallMask);
        const cx = b.col + b.spanCols / 2 - half;
        const cz = b.row + b.spanRows / 2 - half;
        group.position.set(cx, 0, cz);
        group.traverse((obj) => {
          if (obj instanceof THREE.Mesh && obj.name === 'animated_flag') {
            animatedFlags.push(obj);
          }
        });
        buildingsGroup.add(group);

        // Vật dụng trang trí & NPC hoạt động quanh công trình
        if (!isConstructing) {
          if (b.type === 'farm') {
            const farmer = createNpcGroup('farmer');
            farmer.position.set(cx + 0.8, 0.25, cz + 0.5);
            npcsGroup.add(farmer);
            animatedNpcs.push({ mesh: farmer, role: 'farmer', baseX: cx + 0.8, baseZ: cz + 0.5, phase: b.col });
          } else if (b.type === 'forge') {
            const smith = createNpcGroup('smith');
            smith.position.set(cx + 0.25, 0.14, cz + 0.72);
            npcsGroup.add(smith);
            animatedNpcs.push({ mesh: smith, role: 'smith', baseX: cx + 0.25, baseZ: cz + 0.72, phase: b.row });
            const woodpile = createDecorProp('woodpile');
            woodpile.position.set(cx - 1.05, 0.14, cz + 0.9);
            buildingsGroup.add(woodpile);
          } else if (b.type === 'barracks') {
            const rack = createDecorProp('drying_rack');
            rack.position.set(cx - 1.0, 0.1, cz + 0.9);
            buildingsGroup.add(rack);
          } else if (b.type === 'main_hall') {
            const jar = createDecorProp('rain_jar');
            jar.position.set(cx + 2.0, 0.05, cz + 1.8);
            buildingsGroup.add(jar);
          }
        }

        // Thanh máu nếu bị tổn thương
        if (b.hp < b.maxHp) {
          const ratio = Math.max(0.05, b.hp / b.maxHp);
          const barBg = new THREE.Mesh(
            new THREE.PlaneGeometry(b.spanCols * 0.8, 0.14),
            new THREE.MeshBasicMaterial({ color: 0x1f2937, side: THREE.DoubleSide })
          );
          barBg.position.set(cx, 2.4, cz);
          barBg.lookAt(camera.position);
          buildingsGroup.add(barBg);

          const barFill = new THREE.Mesh(
            new THREE.PlaneGeometry(b.spanCols * 0.76 * ratio, 0.1),
            new THREE.MeshBasicMaterial({ color: enemy ? 0xef4444 : 0x22c55e, side: THREE.DoubleSide })
          );
          barFill.position.set(cx, 2.41, cz);
          barFill.lookAt(camera.position);
          buildingsGroup.add(barFill);
        }

        if (selId && b.id === selId) {
          const radius = Math.max(b.spanCols, b.spanRows) * 0.62;
          selectionRing.scale.set(radius, radius, 1);
          selectionRing.position.set(cx, 0.05, cz);
          selectionRing.visible = true;
        }
      }

      // Tạo lộ trình tuần tra trên đường đất quanh làng & đội tuần tra 5 người + lính đi dạo không cầm giáo
      const mainHall = currentLayout.buildings.find((b) => b.type === 'main_hall' && b.status !== 'destroyed');
      if (mainHall) {
        const mx = mainHall.col + mainHall.spanCols / 2 - half;
        const mz = mainHall.row + mainHall.spanRows / 2 - half;
        const frontZ = mz + mainHall.spanRows / 2 + 0.85;
        const rawWaypoints: Array<{ x: number; z: number }> = [{ x: mx, z: frontZ }];

        for (const b of currentLayout.buildings) {
          if (b.id === mainHall.id || b.type === 'wall' || b.type === 'spike_trap' || b.status === 'destroyed') {
            continue;
          }
          const bx = b.col + b.spanCols / 2 - half;
          const bz = b.row + b.spanRows / 2 - half;
          const roadZ = mz + (bz >= mz ? 0.5 : -0.5);
          const stopZ = bz + (bz >= mz ? -b.spanRows / 2 - 0.7 : b.spanRows / 2 + 0.7);
          rawWaypoints.push({ x: bx, z: roadZ }, { x: bx, z: stopZ }, { x: bx, z: roadZ });
        }

        if (rawWaypoints.length < 3) {
          rawWaypoints.push(
            { x: mx + 3.1, z: frontZ },
            { x: mx + 3.1, z: mz - mainHall.spanRows / 2 - 0.9 },
            { x: mx - 3.1, z: mz - mainHall.spanRows / 2 - 0.9 },
            { x: mx - 3.1, z: frontZ }
          );
        }

        const waypoints: Array<{ x: number; z: number }> = [];
        for (const wp of rawWaypoints) {
          const prev = waypoints[waypoints.length - 1];
          if (!prev || Math.hypot(wp.x - prev.x, wp.z - prev.z) > 0.45) {
            waypoints.push(wp);
          }
        }

        if (waypoints.length >= 2) {
          const segLengths: number[] = [];
          let totalLength = 0;
          for (let i = 0; i < waypoints.length; i++) {
            const a = waypoints[i];
            const b = waypoints[(i + 1) % waypoints.length];
            const len = Math.max(0.1, Math.hypot(b.x - a.x, b.z - a.z));
            segLengths.push(len);
            totalLength += len;
          }

          const squadSlots = [
            { r: 0, b: 0 },
            { r: -0.62, b: -0.75 },
            { r: 0.62, b: -0.75 },
            { r: -0.45, b: -1.5 },
            { r: 0.45, b: -1.5 },
          ];
          const members = squadSlots.map((slot, idx) => {
            const m = createNpcGroup('guard');
            m.position.set(waypoints[0].x + slot.r, 0.02, waypoints[0].z + slot.b);
            npcsGroup.add(m);
            return {
              mesh: m,
              offsetRight: slot.r,
              offsetBack: slot.b,
              walkPhase: idx * 0.45,
            };
          });

          patrolSquad = { waypoints, segLengths, totalLength, distance: 0, members };
        }

        // Thêm 3 binh lính đi lang thang quanh làng (không cầm giáo)
        const wanderCount = 3;
        for (let i = 0; i < wanderCount; i++) {
          const startWp = rawWaypoints[(i * 2) % rawWaypoints.length] || { x: mx, z: frontZ };
          const sx = startWp.x + (i - 1) * 0.7;
          const sz = startWp.z + 0.35;
          const stroller = createNpcGroup('soldier_unarmed');
          stroller.position.set(sx, 0.02, sz);
          npcsGroup.add(stroller);
          const nextWp = rawWaypoints[(i * 2 + 1) % rawWaypoints.length] || { x: mx + 1.5, z: frontZ };
          animatedNpcs.push({
            mesh: stroller,
            role: 'soldier_unarmed',
            baseX: sx,
            baseZ: sz,
            phase: i * 1.7,
            targetX: nextWp.x,
            targetZ: nextWp.z,
            pauseUntil: 0,
            walkPhase: i * 0.5,
          });
        }
      }

      if (!selId && !selectedUnitIdRef.current) {
        selectionRing.visible = false;
      }
    };

    const unitVisuals = new Map<
      string,
      { group: THREE.Group; targetX: number; targetZ: number; isMoving: boolean; phase: number }
    >();

    const syncUnits = () => {
      const list = unitsRef.current;
      const selU = selectedUnitIdRef.current;
      const activeIds = new Set<string>();

      for (const u of list) {
        if (u.hp <= 0 || u.soldiers <= 0) continue;
        activeIds.add(u.id);
        const wx = u.x - half;
        const wz = u.z - half;
        const existing = unitVisuals.get(u.id);

        if (existing) {
          const dx = wx - existing.targetX;
          const dz = wz - existing.targetZ;
          const dist = Math.hypot(dx, dz);
          existing.isMoving = dist > 0.002;
          if (existing.isMoving) {
            existing.group.rotation.y = Math.atan2(dx, dz);
          }
          existing.targetX = wx;
          existing.targetZ = wz;
        } else {
          const unitMesh = createUnitGroup(u.unitType, u.faction);
          unitMesh.position.set(wx, 0, wz);
          unitsGroup.add(unitMesh);
          unitVisuals.set(u.id, {
            group: unitMesh,
            targetX: wx,
            targetZ: wz,
            isMoving: false,
            phase: (u.x + u.z) * 1.7,
          });
        }

        if (selU && u.id === selU) {
          selectionRing.scale.set(0.85, 0.85, 1);
          selectionRing.position.set(wx, 0.06, wz);
          selectionRing.visible = true;
        }
      }

      for (const [id, vis] of unitVisuals.entries()) {
        if (!activeIds.has(id)) {
          unitsGroup.remove(vis.group);
          unitVisuals.delete(id);
        }
      }
    };

    sceneRefs.current = {
      buildingsGroup,
      unitsGroup,
      envGroup,
      previewBox,
      selectionRing,
      syncBuildings,
      syncUnits,
    };

    syncBuildings();
    syncUnits();

    void preloadSoldierBaseModel();
    const unsubSoldierBase = onSoldierBaseLoaded(() => {
      syncBuildings();
      for (const [id, vis] of unitVisuals.entries()) {
        unitsGroup.remove(vis.group);
        unitVisuals.delete(id);
      }
      syncUnits();
    });

    // Raycaster trên 1 mặt phẳng duy nhất (O(1) grid lookup)
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let downX = 0;
    let downY = 0;

    const getCellFromPointer = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObject(groundPlane, false);
      if (hits.length === 0) return null;
      const pt = hits[0].point;
      const col = Math.floor(pt.x + half);
      const row = Math.floor(pt.z + half);
      if (col < 0 || row < 0 || col >= gridSize || row >= gridSize) return null;
      return { col, row };
    };

    const handlePointerMove = (e: PointerEvent) => {
      const cell = getCellFromPointer(e.clientX, e.clientY);
      onHoverCellRef.current?.(cell);

      const preview = placementPreviewRef.current;
      if (preview && cell) {
        const valid = preview.canPlaceAt(cell.col, cell.row);
        previewBox.visible = true;
        previewBox.scale.set(preview.spanCols, 1, preview.spanRows);
        previewBox.position.set(
          cell.col + preview.spanCols / 2 - half,
          0.18,
          cell.row + preview.spanRows / 2 - half
        );
        (previewBox.material as THREE.MeshBasicMaterial).color.setHex(valid ? 0x22c55e : 0xef4444);
      } else {
        previewBox.visible = false;
      }
    };

    const handlePointerDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
    };

    const handlePointerUp = (e: PointerEvent) => {
      const dist = Math.hypot(e.clientX - downX, e.clientY - downY);
      if (dist > 6) return; // Đang xoay camera, không tính là click

      const cell = getCellFromPointer(e.clientX, e.clientY);
      if (!cell) return;

      const hitBuilding =
        layoutRef.current.buildings.find(
          (b) =>
            b.status !== 'destroyed' &&
            cell.col >= b.col &&
            cell.col < b.col + b.spanCols &&
            cell.row >= b.row &&
            cell.row < b.row + b.spanRows
        ) || null;

      const hitUnit =
        unitsRef.current.find(
          (u) =>
            u.hp > 0 &&
            u.soldiers > 0 &&
            Math.hypot(u.x - (cell.col + 0.5), u.z - (cell.row + 0.5)) <= 0.9
        ) || null;

      onClickCellRef.current?.(cell.col, cell.row, hitBuilding, hitUnit);
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('pointermove', handlePointerMove);
    domEl.addEventListener('pointerdown', handlePointerDown);
    domEl.addEventListener('pointerup', handlePointerUp);

    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / Math.max(1, container.clientHeight);
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    let rafId = 0;
    let lastTime = performance.now();
    const animate = (now: number) => {
      rafId = requestAnimationFrame(animate);
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;
      controls.update();

      const t = now * 0.002;
      for (const flag of animatedFlags) {
        const pos = flag.geometry.getAttribute('position');
        for (let i = 0; i < pos.count; i++) {
          const fx = pos.getX(i);
          const fy = pos.getY(i);
          const u = (fx + 0.61) / 1.22;
          pos.setZ(i, Math.sin(u * 6.2 - t * 2.4 + fy * 1.6) * 0.085 * u);
        }
        pos.needsUpdate = true;
      }

      // Đội tuần tra 5 binh lính đi theo đội hình trên đường đất quanh làng
      if (patrolSquad && patrolSquad.waypoints.length >= 2) {
        patrolSquad.distance = (patrolSquad.distance + dt * 0.62) % patrolSquad.totalLength;
        let rem = patrolSquad.distance;
        let segIdx = 0;
        while (segIdx < patrolSquad.segLengths.length - 1 && rem > patrolSquad.segLengths[segIdx]) {
          rem -= patrolSquad.segLengths[segIdx];
          segIdx++;
        }
        const a = patrolSquad.waypoints[segIdx];
        const b = patrolSquad.waypoints[(segIdx + 1) % patrolSquad.waypoints.length];
        const segLen = patrolSquad.segLengths[segIdx];
        const frac = rem / segLen;
        const leadX = a.x + (b.x - a.x) * frac;
        const leadZ = a.z + (b.z - a.z) * frac;
        const dirX = (b.x - a.x) / segLen;
        const dirZ = (b.z - a.z) / segLen;
        const rightX = -dirZ;
        const rightZ = dirX;

        for (const member of patrolSquad.members) {
          const slotX = leadX + rightX * member.offsetRight + dirX * member.offsetBack;
          const slotZ = leadZ + rightZ * member.offsetRight + dirZ * member.offsetBack;
          const dx = slotX - member.mesh.position.x;
          const dz = slotZ - member.mesh.position.z;
          const distToSlot = Math.hypot(dx, dz);
          const maxStep = dt * 0.75;
          const step = Math.min(distToSlot, maxStep);
          if (step > 0.0001 && distToSlot > 0.0001) {
            member.mesh.position.x += (dx / distToSlot) * step;
            member.mesh.position.z += (dz / distToSlot) * step;
            member.mesh.rotation.y = Math.atan2(dx, dz);
          }
          const scale = Math.max(0.3, member.mesh.scale.x);
          member.walkPhase += step / (0.68 * scale);
          animateSoldierWalk(member.mesh, member.walkPhase, step > 0.0001);
        }
      }

      for (const npc of animatedNpcs) {
        if (npc.role === 'soldier_unarmed') {
          const tx = npc.targetX ?? npc.baseX;
          const tz = npc.targetZ ?? npc.baseZ;
          const dx = tx - npc.mesh.position.x;
          const dz = tz - npc.mesh.position.z;
          const dist = Math.hypot(dx, dz);
          if (now < (npc.pauseUntil ?? 0)) {
            animateSoldierWalk(npc.mesh, npc.walkPhase ?? 0, false);
          } else if (dist < 0.08) {
            npc.pauseUntil = now + 1800 + ((npc.phase * 700) % 1800);
            const patrolWps = patrolSquad?.waypoints;
            if (patrolWps && patrolWps.length > 0) {
              const pickIdx = Math.floor((now * 0.013 + npc.phase * 3.7) % patrolWps.length);
              const wp = patrolWps[pickIdx];
              npc.targetX = wp.x + Math.sin(now * 0.001 + npc.phase) * 0.75;
              npc.targetZ = wp.z + Math.cos(now * 0.001 + npc.phase) * 0.75;
            }
            animateSoldierWalk(npc.mesh, npc.walkPhase ?? 0, false);
          } else {
            const step = Math.min(dist, dt * 0.52);
            npc.mesh.position.x += (dx / dist) * step;
            npc.mesh.position.z += (dz / dist) * step;
            npc.mesh.rotation.y = Math.atan2(dx, dz);
            const scale = Math.max(0.3, npc.mesh.scale.x);
            npc.walkPhase = (npc.walkPhase ?? 0) + step / (0.68 * scale);
            animateSoldierWalk(npc.mesh, npc.walkPhase, true);
          }
        } else if (npc.role === 'smith') {
          npc.mesh.rotation.x = Math.sin(t * 3.5 + npc.phase) * 0.25;
        } else {
          npc.mesh.position.x = npc.baseX + Math.sin(t * 0.4 + npc.phase) * 0.45;
          npc.mesh.rotation.x = Math.abs(Math.sin(t * 1.8 + npc.phase)) * 0.22;
        }
      }

      for (const vis of unitVisuals.values()) {
        const prevX = vis.group.position.x;
        const prevZ = vis.group.position.z;
        const nextX = prevX + (vis.targetX - prevX) * 0.14;
        const nextZ = prevZ + (vis.targetZ - prevZ) * 0.14;
        vis.group.position.x = nextX;
        vis.group.position.z = nextZ;
        const ds = Math.hypot(nextX - prevX, nextZ - prevZ);
        const moving = vis.isMoving || ds > 0.002;
        if (ds > 0.0001) {
          vis.phase += ds / (0.68 * Math.max(0.3, vis.group.scale.x));
        }
        animateSoldierWalk(vis.group, vis.phase, moving);
      }

      const camDist = camera.position.distanceTo(controls.target);
      if (!zoomOutTriggered && camDist >= controls.maxDistance - 0.35 && onZoomOutRef.current) {
        zoomOutTriggered = true;
        onZoomOutRef.current();
      } else if (camDist < controls.maxDistance - 2) {
        zoomOutTriggered = false;
      }

      renderer.render(scene, camera);
    };
    rafId = requestAnimationFrame(animate);

    return () => {
      unsubSoldierBase();
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
      domEl.removeEventListener('pointermove', handlePointerMove);
      domEl.removeEventListener('pointerdown', handlePointerDown);
      domEl.removeEventListener('pointerup', handlePointerUp);
      controls.dispose();
      renderer.dispose();
      if (domEl.parentNode === container) {
        container.removeChild(domEl);
      }
      sceneRefs.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout.cityId, layout.gridSize, deployZoneHighlight]);

  useEffect(() => {
    sceneRefs.current?.syncBuildings();
  }, [layout, selectedBuildingId, isEnemy]);

  useEffect(() => {
    sceneRefs.current?.syncUnits();
  }, [units, selectedUnitId]);

  useEffect(() => {
    if (!placementPreview && sceneRefs.current) {
      sceneRefs.current.previewBox.visible = false;
    }
  }, [placementPreview]);

  return <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing select-none" />;
};
