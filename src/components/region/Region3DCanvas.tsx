import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useGameStore } from '../../store/gameStore';
import type { BaseBuilding, RegionCombatUnit, RegionLayout } from '../../types/region';
import { createThanhHoa3DWorld, getThanhHoaElevationAtWorld } from '../../utils/thanhHoa3DTerrain';
import {
  DIORAMA_PALETTE,
  animateSoldierWalk,
  createBuildingGroup,
  createDecorProp,
  createNaturalBoulder,
  createNpcGroup,
  createUnitGroup,
} from '../../utils/region3DModels';
import { isSoldierBaseReady, onSoldierBaseLoaded, preloadSoldierBaseModel } from '../../utils/soldierRigLoader';

if (typeof window !== 'undefined') {
  void preloadSoldierBaseModel();
}

interface PlacementPreviewConfig {
  spanCols: number;
  spanRows: number;
  canPlaceAt: (col: number, row: number) => boolean;
}

interface Region3DCanvasProps {
  layout: RegionLayout;
  cityCoord?: { x: number; y: number };
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
  cityCoord,
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
    scene.fog = new THREE.Fog(0xdbe6d5, 130, 420);

    const camera = new THREE.PerspectiveCamera(
      42,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.1,
      950
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
    controls.maxDistance = 240;
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

    // Mặt trời & Mặt trăng trên bầu trời 3D theo 12 Canh Giờ (quỹ đạo xa ngoài rìa bản đồ)
    const sunOrbGroup = new THREE.Group();
    const sunCore = new THREE.Mesh(
      new THREE.SphereGeometry(13, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0xfff3a8, fog: false })
    );
    const sunHalo = new THREE.Mesh(
      new THREE.SphereGeometry(23, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0xffb74d, transparent: true, opacity: 0.3, fog: false, depthWrite: false })
    );
    sunOrbGroup.add(sunCore, sunHalo);
    scene.add(sunOrbGroup);

    const moonOrbGroup = new THREE.Group();
    const moonCore = new THREE.Mesh(
      new THREE.SphereGeometry(10, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0xeef4ff, fog: false })
    );
    const moonHalo = new THREE.Mesh(
      new THREE.SphereGeometry(18, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0x9cb8ff, transparent: true, opacity: 0.24, fog: false, depthWrite: false })
    );
    moonOrbGroup.add(moonCore, moonHalo);
    scene.add(moonOrbGroup);

    const initStore = useGameStore.getState();
    let lastCanhHour = initStore.canhHour;
    let elapsedInCanhMs = 0;
    let smoothCanhHour = initStore.timeMode === 'day' ? 6 : initStore.canhHour;
    const skyColorNight = new THREE.Color(0x131c33);
    const skyColorDawn = new THREE.Color(0xe8a87c);
    const skyColorDay = new THREE.Color(0xdbe6d5);
    const skyColorDusk = new THREE.Color(0xd47459);
    const lightColorDay = new THREE.Color(0xfff1d6);
    const lightColorWarm = new THREE.Color(0xff9e5e);
    const lightColorNight = new THREE.Color(0x8fb0e8);
    const hemiSkyDay = new THREE.Color(0xfff9ec);
    const hemiSkyWarm = new THREE.Color(0xffd4b8);
    const hemiSkyNight = new THREE.Color(0x5a73a8);
    const hemiGroundDay = new THREE.Color(0x6c7a5e);
    const hemiGroundNight = new THREE.Color(0x1f293d);
    const tmpSkyColor = new THREE.Color();
    const tmpLightColor = new THREE.Color();
    const tmpHemiSky = new THREE.Color();
    const tmpHemiGround = new THREE.Color();

    // Toàn bộ địa hình 3D tỉnh Thanh Hóa bao quanh căn cứ (tối ưu bằng 1 mesh + InstancedMesh)
    const basePctX = cityCoord?.x ?? 50.8;
    const basePctY = cityCoord?.y ?? 47.6;
    const thanhHoaWorld = createThanhHoa3DWorld(basePctX, basePctY);
    scene.add(thanhHoaWorld.group);

    // Mặt phẳng vô hình phủ toàn Thanh Hóa dùng cho raycast đặt/chọn công trình trên địa hình 3D mới
    const groundGeo = new THREE.PlaneGeometry(1100, 1100);
    groundGeo.rotateX(-Math.PI / 2);
    const groundPlane = new THREE.Mesh(groundGeo, new THREE.MeshBasicMaterial({ visible: false }));
    scene.add(groundPlane);

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

    interface BuildingAABB {
      minX: number;
      maxX: number;
      minZ: number;
      maxZ: number;
    }

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
      path?: Array<{ x: number; z: number }>;
      pathIdx?: number;
      pauseUntil?: number;
      walkPhase?: number;
      stuckTime?: number;
    }> = [];
    let patrolSquad: PatrolSquadState | null = null;
    let buildingAABBs: BuildingAABB[] = [];
    let walkableSpots: Array<{ x: number; z: number }> = [];
    let findWorldPath: (sx: number, sz: number, gx: number, gz: number) => Array<{ x: number; z: number }> = () => [];
    const animatedFlags: THREE.Mesh[] = [];
    const animatedWaters: THREE.Mesh[] = [];

    const syncBuildings = () => {
      while (buildingsGroup.children.length > 0) {
        buildingsGroup.remove(buildingsGroup.children[0]);
      }
      while (npcsGroup.children.length > 0) {
        npcsGroup.remove(npcsGroup.children[0]);
      }
      animatedNpcs.length = 0;
      patrolSquad = null;
      buildingAABBs = [];
      walkableSpots = [];
      animatedFlags.length = 0;
      animatedWaters.length = 0;

      const currentLayout = layoutRef.current;
      const enemy = isEnemyRef.current;
      const selId = selectedBuildingIdRef.current;

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
        const variant = b.type === 'wall' ? (b.col * 73 + b.row * 139) % 6 : 0;
        const group = createBuildingGroup(b.type, b.level, enemy, isConstructing, wallMask, variant);
        const cx = b.col + b.spanCols / 2 - half;
        const cz = b.row + b.spanRows / 2 - half;
        const elevY = getThanhHoaElevationAtWorld(cx, cz, basePctX, basePctY);
        group.position.set(cx, elevY, cz);
        group.traverse((obj) => {
          if (obj instanceof THREE.Mesh && obj.name === 'animated_flag') {
            animatedFlags.push(obj);
          } else if (obj instanceof THREE.Mesh && obj.name === 'animated_water') {
            animatedWaters.push(obj);
          }
        });
        buildingsGroup.add(group);

        // Vật dụng trang trí & NPC hoạt động quanh công trình (chỉ sinh khi model người .glb đã sẵn sàng để tránh hiện dáng cũ)
        if (!isConstructing && isSoldierBaseReady()) {
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
            // Đạo cụ luyện binh đã được dựng chi tiết trực tiếp trong model 5x5 của trại
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

      // Xây lưới ô vật cản & AABB công trình để binh lính đi vòng tránh công trình
      const solidGrid: boolean[][] = Array.from({ length: gridSize }, () => Array(gridSize).fill(false));
      for (const t of blockedTiles) {
        if (t.col >= 0 && t.col < gridSize && t.row >= 0 && t.row < gridSize) {
          solidGrid[t.row][t.col] = true;
        }
      }
      for (const b of currentLayout.buildings) {
        if (b.status === 'destroyed' || b.type === 'spike_trap') continue;
        buildingAABBs.push({
          minX: b.col - half,
          maxX: b.col + b.spanCols - half,
          minZ: b.row - half,
          maxZ: b.row + b.spanRows - half,
        });
        for (let r = b.row; r < b.row + b.spanRows; r++) {
          for (let c = b.col; c < b.col + b.spanCols; c++) {
            if (r >= 0 && r < gridSize && c >= 0 && c < gridSize) {
              solidGrid[r][c] = true;
            }
          }
        }
      }

      const isCellFree = (c: number, r: number) =>
        c >= 1 && c < gridSize - 1 && r >= 1 && r < gridSize - 1 && !solidGrid[r][c];

      const nearestFreeCell = (col: number, row: number): { c: number; r: number } | null => {
        const sc = Math.max(1, Math.min(gridSize - 2, Math.round(col)));
        const sr = Math.max(1, Math.min(gridSize - 2, Math.round(row)));
        if (isCellFree(sc, sr)) return { c: sc, r: sr };
        for (let rad = 1; rad <= 6; rad++) {
          for (let dr = -rad; dr <= rad; dr++) {
            for (let dc = -rad; dc <= rad; dc++) {
              if (Math.abs(dr) !== rad && Math.abs(dc) !== rad) continue;
              if (isCellFree(sc + dc, sr + dr)) return { c: sc + dc, r: sr + dr };
            }
          }
        }
        return null;
      };

      findWorldPath = (sx: number, sz: number, gx: number, gz: number) => {
        const start = nearestFreeCell(sx + half - 0.5, sz + half - 0.5);
        const goal = nearestFreeCell(gx + half - 0.5, gz + half - 0.5);
        if (!start || !goal) return [];
        if (start.c === goal.c && start.r === goal.r) {
          return [{ x: goal.c + 0.5 - half, z: goal.r + 0.5 - half }];
        }

        const total = gridSize * gridSize;
        const parent = new Int32Array(total).fill(-1);
        const visited = new Uint8Array(total);
        const queue: number[] = [];
        const startIdx = start.r * gridSize + start.c;
        const goalIdx = goal.r * gridSize + goal.c;
        visited[startIdx] = 1;
        queue.push(startIdx);

        const dirs = [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
          [1, 1],
          [1, -1],
          [-1, 1],
          [-1, -1],
        ];
        let head = 0;
        let found = false;
        while (head < queue.length) {
          const cur = queue[head++];
          if (cur === goalIdx) {
            found = true;
            break;
          }
          const cr = Math.floor(cur / gridSize);
          const cc = cur % gridSize;
          for (const [dc, dr] of dirs) {
            const nc = cc + dc;
            const nr = cr + dr;
            if (!isCellFree(nc, nr)) continue;
            if (dc !== 0 && dr !== 0 && (!isCellFree(cc + dc, cr) || !isCellFree(cc, cr + dr))) continue;
            const nIdx = nr * gridSize + nc;
            if (visited[nIdx]) continue;
            visited[nIdx] = 1;
            parent[nIdx] = cur;
            queue.push(nIdx);
          }
        }
        if (!found) return [];

        const pts: Array<{ x: number; z: number }> = [];
        let cur = goalIdx;
        while (cur !== -1 && cur !== startIdx) {
          const cr = Math.floor(cur / gridSize);
          const cc = cur % gridSize;
          pts.push({ x: cc + 0.5 - half, z: cr + 0.5 - half });
          cur = parent[cur];
        }
        pts.reverse();
        return pts;
      };

      // Tạo lộ trình tuần tra trên đường đất quanh làng (tránh hoàn toàn công trình)
      const mainHall = currentLayout.buildings.find((b) => b.type === 'main_hall' && b.status !== 'destroyed');
      if (mainHall) {
        const anchors: Array<{ x: number; z: number }> = [];
        const mhFront = nearestFreeCell(mainHall.col + mainHall.spanCols / 2, mainHall.row + mainHall.spanRows + 0.5);
        if (mhFront) anchors.push({ x: mhFront.c + 0.5 - half, z: mhFront.r + 0.5 - half });

        for (const b of currentLayout.buildings) {
          if (b.id === mainHall.id || b.type === 'wall' || b.type === 'spike_trap' || b.status === 'destroyed') {
            continue;
          }
          const near = nearestFreeCell(b.col + b.spanCols / 2, b.row + b.spanRows + 0.5);
          if (near) anchors.push({ x: near.c + 0.5 - half, z: near.r + 0.5 - half });
        }

        if (anchors.length < 2) {
          const corners = [
            [mainHall.col + mainHall.spanCols + 1, mainHall.row + mainHall.spanRows + 1],
            [mainHall.col + mainHall.spanCols + 1, mainHall.row - 2],
            [mainHall.col - 2, mainHall.row - 2],
            [mainHall.col - 2, mainHall.row + mainHall.spanRows + 1],
          ];
          for (const [cc, rr] of corners) {
            const p = nearestFreeCell(cc, rr);
            if (p) anchors.push({ x: p.c + 0.5 - half, z: p.r + 0.5 - half });
          }
        }

        const waypoints: Array<{ x: number; z: number }> = [];
        for (let i = 0; i < anchors.length; i++) {
          const from = anchors[i];
          const to = anchors[(i + 1) % anchors.length];
          const seg = findWorldPath(from.x, from.z, to.x, to.z);
          for (const pt of seg) {
            const prev = waypoints[waypoints.length - 1];
            if (!prev || Math.hypot(pt.x - prev.x, pt.z - prev.z) > 0.2) {
              waypoints.push(pt);
            }
          }
        }
        walkableSpots = waypoints.length > 0 ? waypoints : anchors;

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
            { r: -0.28, b: 0.85 },
            { r: 0.28, b: 0.85 },
            { r: -0.28, b: 1.7 },
            { r: 0.28, b: 1.7 },
          ];
          const samplePath = (distAlong: number) => {
            const dWrapped = ((distAlong % totalLength) + totalLength) % totalLength;
            let rem = dWrapped;
            let idx = 0;
            while (idx < segLengths.length - 1 && rem > segLengths[idx]) {
              rem -= segLengths[idx];
              idx++;
            }
            const a = waypoints[idx];
            const b = waypoints[(idx + 1) % waypoints.length];
            const segLen = segLengths[idx];
            const frac = rem / segLen;
            const dirX = (b.x - a.x) / segLen;
            const dirZ = (b.z - a.z) / segLen;
            return {
              x: a.x + (b.x - a.x) * frac,
              z: a.z + (b.z - a.z) * frac,
              dirX,
              dirZ,
            };
          };
          const members = isSoldierBaseReady()
            ? squadSlots.map((slot, idx) => {
                const m = createNpcGroup('guard');
                const p0 = samplePath(totalLength - slot.b);
                const rightX = -p0.dirZ;
                const rightZ = p0.dirX;
                m.position.set(p0.x + rightX * slot.r, 0.02, p0.z + rightZ * slot.r);
                m.rotation.y = Math.atan2(p0.dirX, p0.dirZ);
                npcsGroup.add(m);
                return {
                  mesh: m,
                  offsetRight: slot.r,
                  offsetBack: slot.b,
                  walkPhase: idx * 0.35,
                };
              })
            : [];

          patrolSquad = { waypoints, segLengths, totalLength, distance: 0, members };
        }

        // Thêm 3 binh lính đi lang thang quanh làng (không cầm giáo, tìm đường tránh công trình)
        if (isSoldierBaseReady()) {
          const wanderCount = 3;
          for (let i = 0; i < wanderCount; i++) {
            const startWp = walkableSpots[(i * 3) % walkableSpots.length] || { x: 0, z: 0 };
            const goalWp = walkableSpots[(i * 3 + 5) % walkableSpots.length] || startWp;
            const stroller = createNpcGroup('soldier_unarmed');
            stroller.position.set(startWp.x, 0.02, startWp.z);
            npcsGroup.add(stroller);
            animatedNpcs.push({
              mesh: stroller,
              role: 'soldier_unarmed',
              baseX: startWp.x,
              baseZ: startWp.z,
              phase: i * 1.7,
              path: findWorldPath(startWp.x, startWp.z, goalWp.x, goalWp.z),
              pathIdx: 0,
              pauseUntil: 0,
              walkPhase: i * 0.5,
            });
          }
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
      if (!isSoldierBaseReady()) return;
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
      return { col, row };
    };

    const handlePointerMove = (e: PointerEvent) => {
      const cell = getCellFromPointer(e.clientX, e.clientY);
      onHoverCellRef.current?.(cell);

      const preview = placementPreviewRef.current;
      if (preview && cell) {
        const valid = preview.canPlaceAt(cell.col, cell.row);
        const px = cell.col + preview.spanCols / 2 - half;
        const pz = cell.row + preview.spanRows / 2 - half;
        const py = getThanhHoaElevationAtWorld(px, pz, basePctX, basePctY) + 0.18;
        previewBox.visible = true;
        previewBox.scale.set(preview.spanCols, 1, preview.spanRows);
        previewBox.position.set(px, py, pz);
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
        const fw = (flag.geometry.userData.flagWidth as number | undefined) ?? 1.22;
        const halfFw = fw / 2;
        for (let i = 0; i < pos.count; i++) {
          const fx = pos.getX(i);
          const fy = pos.getY(i);
          const u = (fx + halfFw) / fw;
          pos.setZ(i, Math.sin(u * 6.2 - t * 2.4 + fy * 1.6) * 0.085 * u);
        }
        pos.needsUpdate = true;
      }
      for (const water of animatedWaters) {
        const pos = water.geometry.getAttribute('position');
        for (let i = 0; i < pos.count; i++) {
          const wx = pos.getX(i);
          const wy = pos.getY(i);
          const r = Math.hypot(wx, wy);
          pos.setZ(i, Math.sin(r * 28 - t * 3.2) * 0.009);
        }
        pos.needsUpdate = true;
      }

      const pushOutOfBuildings = (pos: THREE.Vector3, radius: number) => {
        for (const box of buildingAABBs) {
          const nearX = Math.max(box.minX, Math.min(box.maxX, pos.x));
          const nearZ = Math.max(box.minZ, Math.min(box.maxZ, pos.z));
          const dx = pos.x - nearX;
          const dz = pos.z - nearZ;
          const dSq = dx * dx + dz * dz;
          if (dSq < radius * radius) {
            if (dSq > 1e-6) {
              const d = Math.sqrt(dSq);
              pos.x = nearX + (dx / d) * radius;
              pos.z = nearZ + (dz / d) * radius;
            } else {
              // Bên trong AABB: đẩy ra cạnh gần nhất
              const dL = Math.abs(pos.x - box.minX);
              const dR = Math.abs(box.maxX - pos.x);
              const dT = Math.abs(pos.z - box.minZ);
              const dB = Math.abs(box.maxZ - pos.z);
              const m = Math.min(dL, dR, dT, dB);
              if (m === dL) pos.x = box.minX - radius;
              else if (m === dR) pos.x = box.maxX + radius;
              else if (m === dT) pos.z = box.minZ - radius;
              else pos.z = box.maxZ + radius;
            }
          }
        }
      };

      const squadSoldiers: THREE.Group[] = [];

      // Đội tuần tra 5 binh lính bám sát đường đi BFS theo hàng đôi gọn gàng (không vỡ đội hình, không đâm tường)
      if (patrolSquad && patrolSquad.waypoints.length >= 2) {
        patrolSquad.distance = (patrolSquad.distance + dt * 0.62) % patrolSquad.totalLength;
        for (const member of patrolSquad.members) {
          const prevX = member.mesh.position.x;
          const prevZ = member.mesh.position.z;
          const dMember =
            (((patrolSquad.distance - member.offsetBack) % patrolSquad.totalLength) + patrolSquad.totalLength) %
            patrolSquad.totalLength;
          let rem = dMember;
          let segIdx = 0;
          while (segIdx < patrolSquad.segLengths.length - 1 && rem > patrolSquad.segLengths[segIdx]) {
            rem -= patrolSquad.segLengths[segIdx];
            segIdx++;
          }
          const a = patrolSquad.waypoints[segIdx];
          const b = patrolSquad.waypoints[(segIdx + 1) % patrolSquad.waypoints.length];
          const segLen = patrolSquad.segLengths[segIdx];
          const frac = rem / segLen;
          const dirX = (b.x - a.x) / segLen;
          const dirZ = (b.z - a.z) / segLen;
          const rightX = -dirZ;
          const rightZ = dirX;
          const targetX = a.x + (b.x - a.x) * frac + rightX * member.offsetRight;
          const targetZ = a.z + (b.z - a.z) * frac + rightZ * member.offsetRight;

          // Làm mượt chuyển hướng ở góc cua để chân vẫn bước tự nhiên
          const dx = targetX - prevX;
          const dz = targetZ - prevZ;
          const dist = Math.hypot(dx, dz);
          const step = Math.min(dist, dt * 0.78);
          if (step > 0.0001 && dist > 0.0001) {
            member.mesh.position.x = prevX + (dx / dist) * step;
            member.mesh.position.z = prevZ + (dz / dist) * step;
            member.mesh.rotation.y = Math.atan2(dirX, dirZ);
          }
          pushOutOfBuildings(member.mesh.position, 0.28);
          const actualDs = Math.hypot(member.mesh.position.x - prevX, member.mesh.position.z - prevZ);
          const scale = Math.max(0.3, member.mesh.scale.x);
          member.walkPhase += actualDs / (0.68 * scale);
          animateSoldierWalk(member.mesh, member.walkPhase, actualDs > 0.0003);
          squadSoldiers.push(member.mesh);
        }
      }

      const wanderers: Array<{ npc: (typeof animatedNpcs)[number]; prevX: number; prevZ: number }> = [];
      for (const npc of animatedNpcs) {
        if (npc.role === 'soldier_unarmed') {
          const prevX = npc.mesh.position.x;
          const prevZ = npc.mesh.position.z;
          if (now < (npc.pauseUntil ?? 0)) {
            animateSoldierWalk(npc.mesh, npc.walkPhase ?? 0, false);
            wanderers.push({ npc, prevX, prevZ });
            continue;
          }
          const path = npc.path ?? [];
          const idx = npc.pathIdx ?? 0;
          if (idx >= path.length) {
            npc.pauseUntil = now + 1800 + ((npc.phase * 700) % 1800);
            if (walkableSpots.length > 0) {
              const pickIdx = Math.floor((now * 0.017 + npc.phase * 5.3) % walkableSpots.length);
              const goal = walkableSpots[pickIdx];
              npc.path = findWorldPath(prevX, prevZ, goal.x, goal.z);
              npc.pathIdx = 0;
              npc.stuckTime = 0;
            }
            animateSoldierWalk(npc.mesh, npc.walkPhase ?? 0, false);
            wanderers.push({ npc, prevX, prevZ });
            continue;
          }
          const wp = path[idx];
          let dx = wp.x - prevX;
          let dz = wp.z - prevZ;
          const dist = Math.hypot(dx, dz);
          if (dist < 0.16) {
            npc.pathIdx = idx + 1;
          } else {
            // Lái né sang ngang nếu phía trước có binh lính khác để không đâm đầu dậm chân tại chỗ
            let steerX = dx / dist;
            let steerZ = dz / dist;
            const others = [...squadSoldiers, ...wanderers.map((w) => w.npc.mesh)];
            for (const other of others) {
              if (other === npc.mesh) continue;
              const ox = other.position.x - prevX;
              const oz = other.position.z - prevZ;
              const od = Math.hypot(ox, oz);
              if (od > 0.01 && od < 0.9) {
                const dot = (ox / od) * steerX + (oz / od) * steerZ;
                if (dot > 0.1) {
                  // Né vuông góc về phía trống
                  const cross = steerX * oz - steerZ * ox;
                  const side = cross >= 0 ? -1 : 1;
                  const avoid = ((0.9 - od) / 0.9) * 1.1;
                  steerX += -steerZ * side * avoid;
                  steerZ += steerX * side * avoid;
                }
              }
            }
            const sLen = Math.max(0.001, Math.hypot(steerX, steerZ));
            steerX /= sLen;
            steerZ /= sLen;
            const step = Math.min(dist, dt * 0.54);
            npc.mesh.position.x = prevX + steerX * step;
            npc.mesh.position.z = prevZ + steerZ * step;
            npc.mesh.rotation.y = Math.atan2(steerX, steerZ);
            pushOutOfBuildings(npc.mesh.position, 0.32);
          }
          wanderers.push({ npc, prevX, prevZ });
        } else if (npc.role === 'smith') {
          npc.mesh.rotation.x = Math.sin(t * 3.5 + npc.phase) * 0.25;
        } else {
          npc.mesh.position.x = npc.baseX + Math.sin(t * 0.4 + npc.phase) * 0.45;
          npc.mesh.rotation.x = Math.abs(Math.sin(t * 1.8 + npc.phase)) * 0.22;
        }
      }

      // Đẩy tách lính đi dạo khỏi nhau & khỏi đội tuần tra (đội tuần tra giữ nguyên đội hình)
      const minSep = 0.56;
      for (let i = 0; i < wanderers.length; i++) {
        const w = wanderers[i];
        const a = w.npc.mesh.position;
        for (const sMesh of squadSoldiers) {
          const b = sMesh.position;
          const dx = a.x - b.x;
          const dz = a.z - b.z;
          const dSq = dx * dx + dz * dz;
          if (dSq < minSep * minSep) {
            const d = Math.max(0.001, Math.sqrt(dSq));
            a.x += (dx / d) * (minSep - d);
            a.z += (dz / d) * (minSep - d);
            pushOutOfBuildings(a, 0.32);
          }
        }
        for (let j = i + 1; j < wanderers.length; j++) {
          const b = wanderers[j].npc.mesh.position;
          const dx = b.x - a.x;
          const dz = b.z - a.z;
          const dSq = dx * dx + dz * dz;
          if (dSq < minSep * minSep) {
            const d = Math.max(0.001, Math.sqrt(dSq));
            const push = (minSep - d) * 0.5;
            a.x -= (dx / d) * push;
            a.z -= (dz / d) * push;
            b.x += (dx / d) * push;
            b.z += (dz / d) * push;
            pushOutOfBuildings(a, 0.32);
            pushOutOfBuildings(b, 0.32);
          }
        }
      }

      // Chỉ tiến pha bước chân theo quãng đường thực tế di chuyển (không bao giờ dậm chân tại chỗ)
      for (const w of wanderers) {
        const { npc, prevX, prevZ } = w;
        if (now < (npc.pauseUntil ?? 0)) continue;
        const actualDs = Math.hypot(npc.mesh.position.x - prevX, npc.mesh.position.z - prevZ);
        const scale = Math.max(0.3, npc.mesh.scale.x);
        if (actualDs > 0.0005) {
          npc.walkPhase = (npc.walkPhase ?? 0) + actualDs / (0.68 * scale);
          npc.stuckTime = 0;
          animateSoldierWalk(npc.mesh, npc.walkPhase, true);
        } else {
          npc.stuckTime = (npc.stuckTime ?? 0) + dt;
          animateSoldierWalk(npc.mesh, npc.walkPhase ?? 0, false);
          if (npc.stuckTime > 0.7 && walkableSpots.length > 0) {
            const pickIdx = Math.floor((now * 0.023 + npc.phase * 7.1) % walkableSpots.length);
            const goal = walkableSpots[pickIdx];
            npc.path = findWorldPath(npc.mesh.position.x, npc.mesh.position.z, goal.x, goal.z);
            npc.pathIdx = 0;
            npc.stuckTime = 0;
          }
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

      // Cập nhật Mặt trời, Mặt trăng & màu sắc bầu trời/ánh sáng mượt mà liên tục theo thời gian đang chạy
      const { canhHour, timeMode, isPaused, isWarMode } = useGameStore.getState();
      const isHourRunning = (timeMode === 'hour' || isWarMode) && !isPaused;
      if (canhHour !== lastCanhHour) {
        lastCanhHour = canhHour;
        elapsedInCanhMs = 0;
      } else if (isHourRunning) {
        elapsedInCanhMs = Math.min(4995, elapsedInCanhMs + dt * 1000);
      }
      const targetHour =
        timeMode === 'day' && !isWarMode ? 6 : (canhHour + elapsedInCanhMs / 5000) % 12;
      let hourDiff = targetHour - smoothCanhHour;
      if (hourDiff > 6) hourDiff -= 12;
      if (hourDiff < -6) hourDiff += 12;
      smoothCanhHour = ((smoothCanhHour + hourDiff * Math.min(1, dt * 6)) % 12 + 12) % 12;

      const sunAngle = ((smoothCanhHour - 3) / 6) * Math.PI;
      const sunX = Math.cos(sunAngle) * 460;
      const sunY = Math.sin(sunAngle) * 320;
      sunOrbGroup.position.set(sunX, sunY, -190);
      sunOrbGroup.visible = sunY > 6;

      const moonAngle = sunAngle - Math.PI;
      const moonX = Math.cos(moonAngle) * 460;
      const moonY = Math.sin(moonAngle) * 320;
      moonOrbGroup.position.set(moonX, moonY, -190);
      moonOrbGroup.visible = moonY > 6;

      const sunHeight = Math.sin(sunAngle); // +1 Ngọ (trưa), 0 Mão/Dậu (bình minh/hoàng hôn), -1 Tý (nửa đêm)
      const isMorningSide = Math.cos(sunAngle) >= 0;

      if (sunHeight >= 0.35) {
        // Ban ngày
        tmpSkyColor.copy(skyColorDay);
        tmpLightColor.copy(lightColorDay);
        tmpHemiSky.copy(hemiSkyDay);
        tmpHemiGround.copy(hemiGroundDay);
        sun.intensity = 1.35;
        hemi.intensity = 0.85;
      } else if (sunHeight >= -0.2) {
        // Chuyển tiếp Bình minh / Hoàng hôn
        const t = (sunHeight + 0.2) / 0.55; // 0 (tối) -> 1 (sáng)
        const tw = Math.sin(t * Math.PI); // đỉnh ấm lúc sunHeight ~ 0.075
        const horizonColor = isMorningSide ? skyColorDawn : skyColorDusk;
        tmpSkyColor.copy(skyColorNight).lerp(skyColorDay, t).lerp(horizonColor, tw * 0.72);
        tmpLightColor.copy(lightColorNight).lerp(lightColorDay, t).lerp(lightColorWarm, tw * 0.8);
        tmpHemiSky.copy(hemiSkyNight).lerp(hemiSkyDay, t).lerp(hemiSkyWarm, tw * 0.65);
        tmpHemiGround.copy(hemiGroundNight).lerp(hemiGroundDay, t);
        sun.intensity = 0.55 + t * 0.8;
        hemi.intensity = 0.42 + t * 0.43;
      } else {
        // Ban đêm
        tmpSkyColor.copy(skyColorNight);
        tmpLightColor.copy(lightColorNight);
        tmpHemiSky.copy(hemiSkyNight);
        tmpHemiGround.copy(hemiGroundNight);
        sun.intensity = 0.55;
        hemi.intensity = 0.42;
      }

      if (scene.background instanceof THREE.Color) {
        scene.background.copy(tmpSkyColor);
      }
      if (scene.fog instanceof THREE.Fog) {
        scene.fog.color.copy(tmpSkyColor);
      }
      sun.color.copy(tmpLightColor);
      hemi.color.copy(tmpHemiSky);
      hemi.groundColor.copy(tmpHemiGround);

      if (sunHeight >= -0.05) {
        sun.position.set(Math.cos(sunAngle) * 20, Math.max(10, Math.sin(sunAngle) * 28), 14);
      } else {
        sun.position.set(Math.cos(moonAngle) * 20, Math.max(10, Math.sin(moonAngle) * 28), 14);
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
      thanhHoaWorld.dispose();
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
