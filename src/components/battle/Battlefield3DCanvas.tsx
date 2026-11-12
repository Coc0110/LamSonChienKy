import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { 
  BattlefieldGrid, 
  BattlefieldUnit, 
  BattlefieldTile 
} from '../../types/battlefield';
import { Camera, Crosshair, Eye, RotateCcw, HelpCircle } from 'lucide-react';

interface Battlefield3DCanvasProps {
  grid: BattlefieldGrid;
  units: BattlefieldUnit[];
  onHover: (info: { col: number; row: number; unit: BattlefieldUnit | null; tile: BattlefieldTile | null } | null) => void;
  onSelectUnit?: (unit: BattlefieldUnit | null) => void;
}

// Màu sắc sa bàn địa hình
const TERRAIN_COLORS: Record<string, number> = {
  plains: 0x4a7c38,
  forest: 0x2d5a27,
  mountain: 0x6e685f,
  cliff: 0x4a443e,
  swamp: 0x3d4b2e,
  water: 0x1f5d8e,
};

// ============================================================================
// HỆ THỐNG CACHE GEOMETRY MERGE (Tạo duy nhất 1 lần, không cấp phát lại)
// ============================================================================
function createSwordsmanGeometry(): THREE.BufferGeometry {
  const base = new THREE.CylinderGeometry(0.38, 0.42, 0.1, 12);
  const body = new THREE.CylinderGeometry(0.14, 0.18, 0.5, 8); body.translate(0, 0.34, 0);
  const helm = new THREE.SphereGeometry(0.11, 8, 8); helm.translate(0, 0.66, 0);
  const sword = new THREE.BoxGeometry(0.03, 0.45, 0.07); sword.rotateX(Math.PI / 4); sword.translate(0.22, 0.45, 0.15);
  const shield = new THREE.BoxGeometry(0.05, 0.35, 0.24); shield.translate(-0.2, 0.4, 0.12);
  return BufferGeometryUtils.mergeGeometries([base, body, helm, sword, shield], true) || base;
}

function createSpearmanGeometry(): THREE.BufferGeometry {
  const base = new THREE.CylinderGeometry(0.38, 0.42, 0.1, 12);
  const body = new THREE.CylinderGeometry(0.14, 0.17, 0.5, 8); body.translate(0, 0.34, 0);
  const helm = new THREE.SphereGeometry(0.11, 8, 8); helm.translate(0, 0.66, 0);
  const shaft = new THREE.CylinderGeometry(0.02, 0.02, 1.25, 6); shaft.rotateX(Math.PI / 5); shaft.translate(0.15, 0.65, 0.25);
  const tip = new THREE.ConeGeometry(0.045, 0.2, 6); tip.rotateX(Math.PI / 5); tip.translate(0.15, 1.15, 0.62);
  return BufferGeometryUtils.mergeGeometries([base, body, helm, shaft, tip], true) || base;
}

function createArcherGeometry(): THREE.BufferGeometry {
  const base = new THREE.CylinderGeometry(0.38, 0.42, 0.1, 12);
  const body = new THREE.CylinderGeometry(0.13, 0.16, 0.48, 8); body.translate(0, 0.32, 0);
  const hat = new THREE.ConeGeometry(0.16, 0.14, 8); hat.translate(0, 0.62, 0);
  const bow = new THREE.TorusGeometry(0.24, 0.02, 6, 10, Math.PI); bow.rotateY(Math.PI / 2); bow.translate(0.12, 0.42, 0.22);
  return BufferGeometryUtils.mergeGeometries([base, body, hat, bow], true) || base;
}

function createCavalryGeometry(): THREE.BufferGeometry {
  const base = new THREE.CylinderGeometry(0.42, 0.46, 0.12, 14); base.scale(0.95, 1, 2.05);
  const horseBody = new THREE.CylinderGeometry(0.2, 0.24, 1.15, 8); horseBody.rotateX(Math.PI / 2); horseBody.translate(0, 0.5, 0);
  const legFL = new THREE.CylinderGeometry(0.045, 0.055, 0.45, 6); legFL.translate(-0.12, 0.22, 0.42);
  const legFR = new THREE.CylinderGeometry(0.045, 0.055, 0.45, 6); legFR.translate(0.12, 0.22, 0.42);
  const legBL = new THREE.CylinderGeometry(0.045, 0.055, 0.45, 6); legBL.translate(-0.12, 0.22, -0.42);
  const legBR = new THREE.CylinderGeometry(0.045, 0.055, 0.45, 6); legBR.translate(0.12, 0.22, -0.42);
  const neck = new THREE.CylinderGeometry(0.11, 0.16, 0.48, 6); neck.rotateX(-Math.PI / 4); neck.translate(0, 0.72, 0.52);
  const head = new THREE.BoxGeometry(0.14, 0.18, 0.32); head.translate(0, 0.9, 0.72);
  const rider = new THREE.CylinderGeometry(0.13, 0.15, 0.45, 8); rider.translate(0, 0.82, -0.05);
  const helm = new THREE.SphereGeometry(0.11, 8, 8); helm.translate(0, 1.1, -0.05);
  const lance = new THREE.CylinderGeometry(0.025, 0.025, 1.5, 6); lance.rotateX(Math.PI / 2.6); lance.translate(0.24, 0.92, 0.55);
  return BufferGeometryUtils.mergeGeometries([base, horseBody, legFL, legFR, legBL, legBR, neck, head, rider, helm, lance], true) || base;
}

function createElephantGeometry(): THREE.BufferGeometry {
  const base = new THREE.CylinderGeometry(0.95, 1.02, 0.16, 18); base.scale(0.95, 1, 1.3);
  const body = new THREE.SphereGeometry(0.68, 12, 10); body.scale(1.1, 0.95, 1.55); body.translate(0, 0.82, 0);
  const legFL = new THREE.CylinderGeometry(0.14, 0.16, 0.62, 8); legFL.translate(-0.36, 0.31, 0.52);
  const legFR = new THREE.CylinderGeometry(0.14, 0.16, 0.62, 8); legFR.translate(0.36, 0.31, 0.52);
  const legBL = new THREE.CylinderGeometry(0.14, 0.16, 0.62, 8); legBL.translate(-0.36, 0.31, -0.52);
  const legBR = new THREE.CylinderGeometry(0.14, 0.16, 0.62, 8); legBR.translate(0.36, 0.31, -0.52);
  const head = new THREE.SphereGeometry(0.38, 10, 8); head.translate(0, 1.05, 0.85);
  const trunk = new THREE.CylinderGeometry(0.09, 0.055, 0.65, 6); trunk.rotateX(-Math.PI / 3); trunk.translate(0, 0.72, 1.18);
  const leftTusk = new THREE.ConeGeometry(0.055, 0.6, 6); leftTusk.rotateX(Math.PI / 3); leftTusk.translate(-0.2, 0.82, 1.2);
  const rightTusk = new THREE.ConeGeometry(0.055, 0.6, 6); rightTusk.rotateX(Math.PI / 3); rightTusk.translate(0.2, 0.82, 1.2);
  const howdah = new THREE.BoxGeometry(0.82, 0.5, 0.98); howdah.translate(0, 1.58, -0.05);
  const canopy = new THREE.ConeGeometry(0.58, 0.35, 4); canopy.rotateY(Math.PI / 4); canopy.translate(0, 2.0, -0.05);
  return BufferGeometryUtils.mergeGeometries([base, body, legFL, legFR, legBL, legBR, head, trunk, leftTusk, rightTusk, howdah, canopy], true) || base;
}

function createSupplyCartGeometry(): THREE.BufferGeometry {
  const base = new THREE.BoxGeometry(1.6, 0.12, 1.6);
  const box = new THREE.BoxGeometry(0.95, 0.45, 1.2); box.translate(0, 0.42, 0);
  const canvas = new THREE.CylinderGeometry(0.48, 0.48, 1.15, 8, 1, false, 0, Math.PI); canvas.rotateZ(Math.PI / 2); canvas.rotateY(Math.PI / 2); canvas.translate(0, 0.65, 0);
  return BufferGeometryUtils.mergeGeometries([base, box, canvas], true) || base;
}

function createGeneralGeometry(): THREE.BufferGeometry {
  const base = new THREE.CylinderGeometry(0.48, 0.52, 0.12, 16);
  const armor = new THREE.CylinderGeometry(0.16, 0.2, 0.55, 8); armor.translate(0, 0.38, 0);
  const helm = new THREE.ConeGeometry(0.16, 0.28, 8); helm.translate(0, 0.76, 0);
  const sword = new THREE.BoxGeometry(0.04, 0.55, 0.08); sword.rotateX(Math.PI / 4); sword.translate(0.24, 0.48, 0.2);
  const pole = new THREE.CylinderGeometry(0.02, 0.02, 1.4, 6); pole.translate(-0.25, 0.7, -0.15);
  const banner = new THREE.BoxGeometry(0.02, 0.5, 0.35); banner.translate(-0.25, 1.15, 0.05);
  return BufferGeometryUtils.mergeGeometries([base, armor, helm, sword, pole, banner], true) || base;
}

export const Battlefield3DCanvas: React.FC<Battlefield3DCanvasProps> = ({
  grid,
  units,
  onHover,
  onSelectUnit,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const highlightMeshRef = useRef<THREE.Mesh | null>(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mousePosRef = useRef(new THREE.Vector2(-999, -999));
  const groundPlaneRef = useRef<THREE.Mesh | null>(null);

  // Tham chiếu giữ các InstancedMesh của từng loại quân cờ
  const instancedMeshesRef = useRef<Record<string, THREE.InstancedMesh>>({});
  const hpBgMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const hpFillLamSonMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const hpFillMingMeshRef = useRef<THREE.InstancedMesh | null>(null);

  const [showHelp, setShowHelp] = useState(false);

  // 1. KHỞI TẠO THREE.JS SCENE, CAMERA, CONTROLS & INSTANCED MESHES (Chạy duy nhất 1 lần)
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 1000;
    const height = container.clientHeight || 560;

    // SCENE
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x231710); // Màu gỗ mun sa bàn

    // CAMERA
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.5, 400);
    camera.position.set(48, 38, 52);
    cameraRef.current = camera;

    // RENDERER: Tối ưu hoá phần cứng - pixelRatio tối đa 1.5 để 60-144 FPS trên mọi màn hình
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: false, 
      powerPreference: 'high-performance' 
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    rendererRef.current = renderer;

    container.appendChild(renderer.domElement);

    // ORBIT CONTROLS
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI / 2 - 0.08;
    controls.minDistance = 6;
    controls.maxDistance = 160;
    controls.target.set(48, 0, 16);
    controls.update();
    controlsRef.current = controls;

    // HỆ THỐNG ÁNH SÁNG HIỆU NĂNG CAO (Không dùng Dynamic Shadows tốn kém, dùng 3 nguồn sáng phong cách sa bàn)
    const ambientLight = new THREE.AmbientLight(0xfff8ee, 0.85);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffeedd, 1.3);
    sunLight.position.set(30, 50, 45);
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0x7da4d4, 0.4);
    rimLight.position.set(-25, 30, -30);
    scene.add(rimLight);

    // KHUNG BÀN GỖ MUN & ĐẾ SA BÀN (Lacquered Frame)
    const frameGeo = new THREE.BoxGeometry(98.4, 2.5, 34.4);
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x3d2314,
      roughness: 0.65,
      metalness: 0.15,
    });
    const frameMesh = new THREE.Mesh(frameGeo, frameMat);
    frameMesh.position.set(48, -1.25, 16);
    scene.add(frameMesh);

    // MẶT PHẲNG ẨN ĐỂ RAYCAST BẮT TỌA ĐỘ CHUỘT O(1)
    const groundGeo = new THREE.PlaneGeometry(96, 32);
    const groundMat = new THREE.MeshBasicMaterial({ visible: false });
    const groundPlane = new THREE.Mesh(groundGeo, groundMat);
    groundPlane.rotation.x = -Math.PI / 2;
    groundPlane.position.set(48, 0, 16);
    scene.add(groundPlane);
    groundPlaneRef.current = groundPlane;

    // VÒNG CHỈ THỊ HOVER Ô SA BÀN (Highlight Ring)
    const hlGeo = new THREE.RingGeometry(0.38, 0.48, 24);
    const hlMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    const hlMesh = new THREE.Mesh(hlGeo, hlMat);
    hlMesh.rotation.x = -Math.PI / 2;
    hlMesh.position.set(-100, 0.15, -100);
    scene.add(hlMesh);
    highlightMeshRef.current = hlMesh;

    // TẠO LƯỚI ĐỊA HÌNH 96x32 BẰNG INSTANCED MESH
    const terrainGroup = new THREE.Group();
    scene.add(terrainGroup);

    const tileGeo = new THREE.BoxGeometry(0.96, 0.3, 0.96);
    const tilesByType: Record<string, { x: number; y: number; z: number }[]> = {
      plains: [],
      forest: [],
      mountain: [],
      cliff: [],
      swamp: [],
      water: [],
    };
    const treePositions: { x: number; z: number }[] = [];

    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        const tile = grid.tiles[r]?.[c];
        if (!tile) continue;
        const x = c + 0.5;
        const z = r + 0.5;
        const tType = tile.terrain;
        
        let y = 0.1;
        if (tType === 'mountain' || tType === 'cliff') {
          y = 0.6 + (tile.elevation > 0 ? 0.6 : 0);
        } else if (tType === 'water') {
          y = -0.1;
        } else if (tType === 'swamp') {
          y = 0.05;
        }

        if (tilesByType[tType]) {
          tilesByType[tType].push({ x, y, z });
        } else {
          tilesByType.plains.push({ x, y, z });
        }

        if (tType === 'forest' && (c + r) % 2 === 0) {
          treePositions.push({ x, z });
        }
      }
    }

    const dummy = new THREE.Object3D();
    Object.entries(tilesByType).forEach(([tType, list]) => {
      if (list.length === 0) return;
      const col = TERRAIN_COLORS[tType] || TERRAIN_COLORS.plains;
      const mat = new THREE.MeshStandardMaterial({
        color: col,
        roughness: tType === 'water' ? 0.2 : 0.8,
        metalness: tType === 'water' ? 0.2 : 0.05,
      });

      const iMesh = new THREE.InstancedMesh(tileGeo, mat, list.length);
      list.forEach((pos, idx) => {
        dummy.position.set(pos.x, pos.y, pos.z);
        const scaleY = (tType === 'mountain' || tType === 'cliff') ? 3.0 : 1.0;
        dummy.scale.set(1, scaleY, 1);
        dummy.updateMatrix();
        iMesh.setMatrixAt(idx, dummy.matrix);
      });
      iMesh.instanceMatrix.needsUpdate = true;
      terrainGroup.add(iMesh);
    });

    // CÂY THÔNG 3D LOW-POLY TRONG RỪNG
    if (treePositions.length > 0) {
      const trunkGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.45, 5);
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x422a1d, roughness: 0.9 });
      const trunkMesh = new THREE.InstancedMesh(trunkGeo, trunkMat, treePositions.length);

      const foliageGeo = new THREE.ConeGeometry(0.32, 0.75, 5);
      const foliageMat = new THREE.MeshStandardMaterial({ color: 0x1e4620, roughness: 0.85 });
      const foliageMesh = new THREE.InstancedMesh(foliageGeo, foliageMat, treePositions.length);

      treePositions.forEach((pos, idx) => {
        dummy.scale.set(1, 1, 1);
        dummy.position.set(pos.x, 0.35, pos.z);
        dummy.updateMatrix();
        trunkMesh.setMatrixAt(idx, dummy.matrix);

        dummy.position.set(pos.x, 0.8, pos.z);
        dummy.updateMatrix();
        foliageMesh.setMatrixAt(idx, dummy.matrix);
      });

      trunkMesh.instanceMatrix.needsUpdate = true;
      foliageMesh.instanceMatrix.needsUpdate = true;
      terrainGroup.add(trunkMesh);
      terrainGroup.add(foliageMesh);
    }

    // ========================================================================
    // TẠO 14 INSTANCED MESH CHO 14 ARCHETYPES (Lam Sơn + Minh x 7 binh chủng)
    // ========================================================================
    const archetypes = [
      { id: 'swordsman', geo: createSwordsmanGeometry(), maxCount: 200 },
      { id: 'spearman', geo: createSpearmanGeometry(), maxCount: 200 },
      { id: 'archer', geo: createArcherGeometry(), maxCount: 200 },
      { id: 'cavalry', geo: createCavalryGeometry(), maxCount: 100 },
      { id: 'elephant', geo: createElephantGeometry(), maxCount: 50 },
      { id: 'supply_cart', geo: createSupplyCartGeometry(), maxCount: 50 },
      { id: 'general', geo: createGeneralGeometry(), maxCount: 20 },
    ];

    const materials = {
      lam_son: [
        new THREE.MeshStandardMaterial({ color: 0x0f3e24, roughness: 0.5, metalness: 0.2 }), // 0: base
        new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.55 }),                // 1: armor
        new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.3, metalness: 0.8 }),  // 2: gold/helm
        new THREE.MeshStandardMaterial({ color: 0x5c3417, roughness: 0.8 }),                 // 3: wood/shaft
        new THREE.MeshStandardMaterial({ color: 0x5a5856, roughness: 0.9 }),                 // 4: elephant skin
        new THREE.MeshStandardMaterial({ color: 0xfffaea, roughness: 0.3 }),                 // 5: tusk/canvas
        new THREE.MeshStandardMaterial({ color: 0x8a3818, roughness: 0.7 }),                 // 6: howdah
      ],
      ming: [
        new THREE.MeshStandardMaterial({ color: 0x450a0a, roughness: 0.5, metalness: 0.2 }), // 0: base
        new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.55 }),                // 1: armor
        new THREE.MeshStandardMaterial({ color: 0xc2410c, roughness: 0.3, metalness: 0.7 }),  // 2: helm/bronze
        new THREE.MeshStandardMaterial({ color: 0x4a2810, roughness: 0.8 }),                 // 3: wood/shaft
        new THREE.MeshStandardMaterial({ color: 0x5a5856, roughness: 0.9 }),                 // 4: elephant skin
        new THREE.MeshStandardMaterial({ color: 0xfffaea, roughness: 0.3 }),                 // 5: tusk/canvas
        new THREE.MeshStandardMaterial({ color: 0x6e2418, roughness: 0.7 }),                 // 6: howdah
      ],
    };

    const instancedMeshes: Record<string, THREE.InstancedMesh> = {};

    ['lam_son', 'ming'].forEach(faction => {
      const fMat = materials[faction as 'lam_son' | 'ming'];
      archetypes.forEach(arch => {
        const key = `${faction}_${arch.id}`;
        const iMesh = new THREE.InstancedMesh(arch.geo, fMat, arch.maxCount);
        iMesh.count = 0; // Ban đầu ẩn hết
        scene.add(iMesh);
        instancedMeshes[key] = iMesh;
      });
    });

    instancedMeshesRef.current = instancedMeshes;

    // THANH MÁU NỔI DẠNG INSTANCED MESH (Chỉ tốn 3 draw calls cho toàn bộ quân đội!)
    const hpBgGeo = new THREE.PlaneGeometry(0.5, 0.08);
    const hpBgMat = new THREE.MeshBasicMaterial({ color: 0x1c1917, side: THREE.DoubleSide });
    const hpBgMesh = new THREE.InstancedMesh(hpBgGeo, hpBgMat, 600);
    hpBgMesh.count = 0;
    scene.add(hpBgMesh);
    hpBgMeshRef.current = hpBgMesh;

    const hpFillGeo = new THREE.PlaneGeometry(0.48, 0.06);
    const hpFillLamSonMat = new THREE.MeshBasicMaterial({ color: 0x22c55e, side: THREE.DoubleSide });
    const hpFillMingMat = new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide });

    const hpFillLamSonMesh = new THREE.InstancedMesh(hpFillGeo, hpFillLamSonMat, 400);
    hpFillLamSonMesh.count = 0;
    scene.add(hpFillLamSonMesh);
    hpFillLamSonMeshRef.current = hpFillLamSonMesh;

    const hpFillMingMesh = new THREE.InstancedMesh(hpFillGeo, hpFillMingMat, 400);
    hpFillMingMesh.count = 0;
    scene.add(hpFillMingMesh);
    hpFillMingMeshRef.current = hpFillMingMesh;

    // RESIZE OBSERVER
    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      cameraRef.current.aspect = newW / newH;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(newW, newH);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // ANIMATION LOOP (Chỉ render camera và highlight ring, 0 computation overhead)
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      controls.update();

      if (highlightMeshRef.current) {
        highlightMeshRef.current.rotation.z = elapsed * 1.5;
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [grid]);

  // 2. CẬP NHẬT MA TRẬN TỌA ĐỘ INSTANCED MESH KHI UNITS THAY ĐỔI (0ms Garbage Collection!)
  useEffect(() => {
    const instancedMeshes = instancedMeshesRef.current;
    const hpBgMesh = hpBgMeshRef.current;
    const hpFillLS = hpFillLamSonMeshRef.current;
    const hpFillMing = hpFillMingMeshRef.current;
    if (!instancedMeshes || !hpBgMesh || !hpFillLS || !hpFillMing) return;

    // Reset bộ đếm của từng loại quân
    const counts: Record<string, number> = {};
    Object.keys(instancedMeshes).forEach(k => { counts[k] = 0; });

    let hpCount = 0;
    let hpLSCount = 0;
    let hpMingCount = 0;

    const dummy = new THREE.Object3D();
    const hpDummy = new THREE.Object3D();

    const livingUnits = units.filter(u => u.status !== 'eliminated');

    livingUnits.forEach(unit => {
      const key = `${unit.faction}_${unit.unitTypeId}`;
      const iMesh = instancedMeshes[key];
      if (!iMesh) return;

      const idx = counts[key] || 0;
      counts[key] = idx + 1;

      const spanC = unit.spanCols || 1;
      const spanR = unit.spanRows || 1;
      let centerX = unit.col + spanC / 2;
      const centerZ = unit.row + spanR / 2;
      const tile = grid.tiles[unit.row]?.[unit.col];
      const baseY = tile?.elevation ? 0.6 : 0.25;

      // XÓA BỎ KHOẢNG CÁCH GIAO TRANH: Khi đánh giáp lá cà, lunge vượt biên ô đan kiếm vào nhau
      if (unit.status === 'fighting') {
        const lungeOffset = unit.faction === 'lam_son' ? 0.35 : -0.35;
        centerX += lungeOffset;
      }

      // Hướng mặt: Lam Sơn sang Đông (+X), Minh sang Tây (-X)
      const facingAngle = unit.faction === 'lam_son' ? Math.PI / 2 : -Math.PI / 2;

      dummy.position.set(centerX, baseY, centerZ);
      dummy.rotation.set(0, facingAngle, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();

      iMesh.setMatrixAt(idx, dummy.matrix);

      // Cập nhật Thanh máu nổi
      const hpPct = Math.max(0, Math.min(1, unit.hp / unit.maxHp));
      const barY = unit.unitTypeId === 'elephant' ? 2.1 : unit.unitTypeId === 'general' ? 1.7 : 1.15;

      hpDummy.position.set(centerX, baseY + barY, centerZ);
      hpDummy.rotation.set(-Math.PI / 4, 0, 0);
      hpDummy.scale.set(1, 1, 1);
      hpDummy.updateMatrix();

      hpBgMesh.setMatrixAt(hpCount, hpDummy.matrix);
      hpCount++;

      // Thanh fill tỷ lệ máu
      hpDummy.scale.set(hpPct, 1, 1);
      hpDummy.position.set(centerX - 0.24 * (1 - hpPct), baseY + barY, centerZ + 0.01);
      hpDummy.updateMatrix();

      if (unit.faction === 'lam_son') {
        hpFillLS.setMatrixAt(hpLSCount, hpDummy.matrix);
        hpLSCount++;
      } else {
        hpFillMing.setMatrixAt(hpMingCount, hpDummy.matrix);
        hpMingCount++;
      }
    });

    // Cập nhật count và thông báo GPU
    Object.keys(instancedMeshes).forEach(k => {
      const mesh = instancedMeshes[k];
      mesh.count = counts[k] || 0;
      mesh.instanceMatrix.needsUpdate = true;
    });

    hpBgMesh.count = hpCount;
    hpBgMesh.instanceMatrix.needsUpdate = true;

    hpFillLS.count = hpLSCount;
    hpFillLS.instanceMatrix.needsUpdate = true;

    hpFillMing.count = hpMingCount;
    hpFillMing.instanceMatrix.needsUpdate = true;
  }, [units, grid]);

  // 3. CONTAINER POINTER EVENT DELEGATION O(1) CHO HOVER & SELECTION
  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const container = mountRef.current;
    if (!container || !cameraRef.current || !groundPlaneRef.current) return;

    const rect = container.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    mousePosRef.current.set(mouseX, mouseY);

    raycasterRef.current.setFromCamera(mousePosRef.current, cameraRef.current);
    const intersects = raycasterRef.current.intersectObject(groundPlaneRef.current);

    if (intersects.length > 0) {
      const hit = intersects[0];
      const col = Math.floor(hit.point.x);
      const row = Math.floor(hit.point.z);

      if (col >= 0 && col < 96 && row >= 0 && row < 32) {
        const hitUnit = units.find(u => {
          if (u.status === 'eliminated') return false;
          const sC = u.spanCols || 1;
          const sR = u.spanRows || 1;
          return col >= u.col && col < u.col + sC && row >= u.row && row < u.row + sR;
        }) || null;

        if (highlightMeshRef.current) {
          if (hitUnit) {
            const sC = hitUnit.spanCols || 1;
            const sR = hitUnit.spanRows || 1;
            highlightMeshRef.current.position.set(hitUnit.col + sC / 2, 0.16, hitUnit.row + sR / 2);
            highlightMeshRef.current.scale.set(sC, sR, 1);
          } else {
            highlightMeshRef.current.position.set(col + 0.5, 0.16, row + 0.5);
            highlightMeshRef.current.scale.set(1, 1, 1);
          }
        }

        const hitTile = grid.tiles[row]?.[col] || null;
        onHover({ col, row, unit: hitUnit, tile: hitTile });
      } else {
        onHover(null);
      }
    } else {
      onHover(null);
    }
  }, [grid, units, onHover]);

  const handlePointerLeave = useCallback(() => {
    if (highlightMeshRef.current) {
      highlightMeshRef.current.position.set(-100, 0, -100);
    }
    onHover(null);
  }, [onHover]);

  const handleClick = useCallback(() => {
    const container = mountRef.current;
    if (!container || !cameraRef.current || !groundPlaneRef.current) return;

    raycasterRef.current.setFromCamera(mousePosRef.current, cameraRef.current);
    const intersects = raycasterRef.current.intersectObject(groundPlaneRef.current);

    if (intersects.length > 0) {
      const hit = intersects[0];
      const col = Math.floor(hit.point.x);
      const row = Math.floor(hit.point.z);

      const hitUnit = units.find(u => {
        if (u.status === 'eliminated') return false;
        const sC = u.spanCols || 1;
        const sR = u.spanRows || 1;
        return col >= u.col && col < u.col + sC && row >= u.row && row < u.row + sR;
      }) || null;

      if (onSelectUnit) {
        onSelectUnit(hitUnit);
      }
    }
  }, [units, onSelectUnit]);

  // CÁC GÓC CAMERA ĐẶT SẴN
  const setCameraPreset = (mode: 'strategic' | 'clash' | 'topdown') => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    if (mode === 'strategic') {
      camera.position.set(48, 36, 50);
      controls.target.set(48, 0, 16);
    } else if (mode === 'clash') {
      camera.position.set(48, 14, 28);
      controls.target.set(48, 0, 16);
    } else if (mode === 'topdown') {
      camera.position.set(48, 62, 17);
      controls.target.set(48, 0, 16);
    }
    controls.update();
  };

  return (
    <div className="relative w-full h-[540px] md:h-[620px] bg-[#1a110b] overflow-hidden select-none">
      {/* 3D CANVAS VIEWPORT */}
      <div
        ref={mountRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onClick={handleClick}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* THANH ĐIỀU KHIỂN GÓC NHÌN CAMERA 3D (Top Toolbar) */}
      <div className="absolute top-3 left-4 flex items-center gap-2 z-20">
        <span className="px-2.5 py-1 rounded bg-[#2a170c]/90 border border-[#8c6b44]/60 text-amber-200 text-xs font-black shadow flex items-center gap-1.5 backdrop-blur-xs">
          <Eye size={13} className="text-amber-400" />
          Sa Bàn 3D Toàn Cảnh
        </span>

        <button
          onClick={() => setCameraPreset('strategic')}
          className="px-2.5 py-1 rounded bg-[#3d2314]/85 hover:bg-[#5c3417] text-[#f5ecda] text-xs font-bold border border-[#8c6b44]/50 shadow transition flex items-center gap-1 cursor-pointer active:scale-95"
          title="Góc nhìn chiến lược nghiêng 45°"
        >
          <Camera size={12} />
          Chiến Lược
        </button>

        <button
          onClick={() => setCameraPreset('clash')}
          className="px-2.5 py-1 rounded bg-[#8c2d19]/85 hover:bg-[#a8321d] text-amber-100 text-xs font-bold border border-amber-500/50 shadow transition flex items-center gap-1 cursor-pointer active:scale-95"
          title="Tiền tuyến giáp chiến cự ly gần"
        >
          <Crosshair size={12} />
          Tiền Tuyến
        </button>

        <button
          onClick={() => setCameraPreset('topdown')}
          className="px-2.5 py-1 rounded bg-[#3d2314]/85 hover:bg-[#5c3417] text-[#f5ecda] text-xs font-bold border border-[#8c6b44]/50 shadow transition flex items-center gap-1 cursor-pointer active:scale-95"
          title="Nhìn thẳng từ trên cao xuống"
        >
          Toàn Cảnh
        </button>

        <button
          onClick={() => setCameraPreset('strategic')}
          className="p-1 rounded bg-[#3d2314]/85 hover:bg-[#5c3417] text-amber-200 border border-[#8c6b44]/50 shadow transition cursor-pointer"
          title="Đặt lại camera về vị trí mặc định"
        >
          <RotateCcw size={13} />
        </button>

        <button
          onClick={() => setShowHelp(!showHelp)}
          className="p-1 rounded bg-[#3d2314]/85 hover:bg-[#5c3417] text-amber-200 border border-[#8c6b44]/50 shadow transition cursor-pointer"
          title="Hướng dẫn thao tác chuột 3D"
        >
          <HelpCircle size={13} />
        </button>
      </div>

      {/* POPUP HƯỚNG DẪN ĐIỀU KHIỂN CHUỘT 3D */}
      {showHelp && (
        <div className="absolute top-12 left-4 z-30 p-3 rounded-lg bg-[#2a170c]/95 border border-[#8c6b44] text-xs text-[#eedec2] font-serif shadow-2xl max-w-xs space-y-1.5 backdrop-blur-sm">
          <p className="font-bold text-amber-300 border-b border-[#8c6b44]/50 pb-1">
            🎮 Hướng Dẫn Thao Tác Sa Bàn 3D:
          </p>
          <ul className="space-y-1 list-disc pl-4 text-[11px] text-[#decab0]">
            <li><b>Chuột trái:</b> Giữ và kéo để xoay góc nhìn 3D 360 độ tự do.</li>
            <li><b>Chuột phải / Chuột giữa:</b> Giữ và kéo để di chuyển (Pan) dọc sa bàn 96 cột.</li>
            <li><b>Con lăn chuột:</b> Cuộn để phóng to cận cảnh hoặc thu nhỏ toàn cục.</li>
            <li><b>Rê chuột:</b> Soi thông tin chi tiết từng toán quân trên Inspector Bar.</li>
          </ul>
        </div>
      )}

      {/* CHỈ BÁO PHÂN KHU ĐÔNG - TÂY */}
      <div className="absolute bottom-2 left-4 text-[10px] font-bold text-emerald-400/80 pointer-events-none uppercase tracking-wider bg-black/40 px-2 py-0.5 rounded border border-emerald-500/30">
        🛡️ Bố Phòng Lam Sơn (Tây)
      </div>
      <div className="absolute bottom-2 right-4 text-[10px] font-bold text-red-400/80 pointer-events-none uppercase tracking-wider bg-black/40 px-2 py-0.5 rounded border border-red-500/30">
        ⚔️ Chiến Tuyến Quân Minh (Đông)
      </div>
    </div>
  );
};
