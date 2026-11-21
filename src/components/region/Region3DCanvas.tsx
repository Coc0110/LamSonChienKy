import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { BaseBuilding, RegionCombatUnit, RegionLayout } from '../../types/region';
import {
  DIORAMA_PALETTE,
  createBuildingGroup,
  createDecorProp,
  createDetailedGroundTexture,
  createNaturalBoulder,
  createNpcGroup,
  createUnitGroup,
  createVietnameseTree,
  type VietnameseTreeKind,
} from '../../utils/region3DModels';

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

    const animatedNpcs: Array<{
      mesh: THREE.Group;
      role: 'farmer' | 'smith' | 'guard';
      baseX: number;
      baseZ: number;
      phase: number;
    }> = [];

    const syncBuildings = () => {
      while (buildingsGroup.children.length > 0) {
        buildingsGroup.remove(buildingsGroup.children[0]);
      }
      while (npcsGroup.children.length > 0) {
        npcsGroup.remove(npcsGroup.children[0]);
      }
      animatedNpcs.length = 0;

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
            const guard = createNpcGroup('guard');
            guard.position.set(cx, 0.02, cz + 2.75);
            npcsGroup.add(guard);
            animatedNpcs.push({ mesh: guard, role: 'guard', baseX: cx, baseZ: cz + 2.75, phase: 0 });
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

      if (!selId && !selectedUnitIdRef.current) {
        selectionRing.visible = false;
      }
    };

    const syncUnits = () => {
      while (unitsGroup.children.length > 0) {
        unitsGroup.remove(unitsGroup.children[0]);
      }

      const list = unitsRef.current;
      const selU = selectedUnitIdRef.current;

      for (const u of list) {
        if (u.hp <= 0 || u.soldiers <= 0) continue;
        const wx = u.x - half;
        const wz = u.z - half;
        const unitMesh = createUnitGroup(u.unitType, u.faction);
        unitMesh.position.set(wx, 0, wz);
        unitsGroup.add(unitMesh);

        if (selU && u.id === selU) {
          selectionRing.scale.set(0.85, 0.85, 1);
          selectionRing.position.set(wx, 0.06, wz);
          selectionRing.visible = true;
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
    const animate = (now: number) => {
      rafId = requestAnimationFrame(animate);
      controls.update();

      const t = now * 0.002;
      for (const npc of animatedNpcs) {
        if (npc.role === 'guard') {
          npc.mesh.position.x = npc.baseX + Math.sin(t * 0.7 + npc.phase) * 1.4;
          npc.mesh.rotation.y = Math.cos(t * 0.7 + npc.phase) >= 0 ? Math.PI / 2 : -Math.PI / 2;
        } else if (npc.role === 'smith') {
          npc.mesh.rotation.x = Math.sin(t * 3.5 + npc.phase) * 0.25;
        } else {
          npc.mesh.position.x = npc.baseX + Math.sin(t * 0.4 + npc.phase) * 0.45;
          npc.mesh.rotation.x = Math.abs(Math.sin(t * 1.8 + npc.phase)) * 0.22;
        }
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
