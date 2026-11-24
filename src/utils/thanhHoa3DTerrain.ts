import * as THREE from 'three';
import districtData from '../data/districtPolygons.json';
import { MAP_COORD_W, MAP_COORD_H, pointInPolygon } from './mapGeo';
import type { DistrictInfo } from '../types/map';
import { getMeadowBumpTexture } from './region3DModels';

const BOX_X0 = 37.0;
const BOX_X1 = 71.5;
const BOX_Y0 = 41.5;
const BOX_Y1 = 56.5;

const WORLD_W = ((BOX_X1 - BOX_X0) / 100) * MAP_COORD_W; // 176.64
const WORLD_H = ((BOX_Y1 - BOX_Y0) / 100) * MAP_COORD_H; // 153.60

const MOUNTAIN_DISTRICTS = new Set([
  'chi_linh',
  'quan_du',
  'lang_chanh',
  'thuong_xuan',
  'ba_thuoc',
  'muong_lat',
  'cam_thuy',
  'ngoc_lac',
  'nhu_xuan',
]);

const FOREST_DISTRICTS = new Set([
  'lam_son',
  'chi_linh',
  'quan_du',
  'thach_thanh',
  'ngoc_lac',
  'cam_thuy',
  'nhu_xuan',
  'thuong_xuan',
  'lang_chanh',
  'ba_thuoc',
  'nong_cong',
]);

const fbm2D = (x: number, y: number): number => {
  const n1 = Math.sin(x * 0.45 + Math.cos(y * 0.37) * 1.4) * Math.cos(y * 0.42);
  const n2 = Math.sin(x * 1.15 - y * 0.92) * 0.45;
  const n3 = Math.cos(x * 2.3 + y * 2.1) * 0.2;
  return (n1 + n2 + n3) * 0.5 + 0.5;
};

let cachedAlbedoTex: THREE.Texture | null = null;
const getThanhHoaAlbedoTexture = (): THREE.Texture => {
  if (cachedAlbedoTex) return cachedAlbedoTex;
  const loader = new THREE.TextureLoader();
  const tex = loader.load('/thanh_hoa_3d_albedo.jpg');
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  cachedAlbedoTex = tex;
  return tex;
};

export interface ThanhHoaWorldResult {
  group: THREE.Group;
  dispose: () => void;
}

/**
 * Dựng toàn bộ địa hình 3D tỉnh Thanh Hóa quanh căn cứ đang chọn (basePctX, basePctY).
 * Tối ưu hóa tối đa bằng 1 mesh địa hình gộp + InstancedMesh cho cây cối & đỉnh núi (< 6 draw calls).
 */
export function createThanhHoa3DWorld(basePctX: number, basePctY: number): ThanhHoaWorldResult {
  const group = new THREE.Group();
  const districts = ((districtData as unknown as { districts?: DistrictInfo[] }).districts) || [];

  const baseCrsX = (basePctX / 100) * MAP_COORD_W;
  const baseCrsZ = (basePctY / 100) * MAP_COORD_H;

  const boxCenterX = (((BOX_X0 + BOX_X1) * 0.5) / 100) * MAP_COORD_W - baseCrsX;
  const boxCenterZ = (((BOX_Y0 + BOX_Y1) * 0.5) / 100) * MAP_COORD_H - baseCrsZ;

  const pctToWorld = (px: number, py: number): [number, number] => [
    (px / 100) * MAP_COORD_W - baseCrsX,
    (py / 100) * MAP_COORD_H - baseCrsZ,
  ];

  const findDistrictAtPct = (px: number, py: number): DistrictInfo | null => {
    for (const d of districts) {
      if (pointInPolygon(px, py, d.polygon)) return d;
    }
    return null;
  };

  const sampleHeightAtWorld = (wx: number, wz: number): number => {
    const px = ((wx + baseCrsX) / MAP_COORD_W) * 100;
    const py = ((wz + baseCrsZ) / MAP_COORD_H) * 100;

    // Giữ vùng sân căn cứ 32x32 phẳng ở y = -0.04 (dưới plane cỏ y = 0)
    const distFromBase = Math.max(Math.abs(wx), Math.abs(wz));
    if (distFromBase < 16.2) return -0.04;

    const d = findDistrictAtPct(px, py);
    if (!d) {
      return -1.45;
    }

    const noise = fbm2D(wx * 0.14, wz * 0.14);
    let h = 0.12 + noise * 0.35;
    if (MOUNTAIN_DISTRICTS.has(d.id) || px < 48.5) {
      const westFactor = Math.min(1, Math.max(0.25, (50.5 - px) / 9.5));
      h += (1.1 + noise * 4.4) * westFactor;
    }

    // Chuyển tiếp mượt từ rìa sân căn cứ 32x32 ra địa hình xung quanh
    const baseBlend = Math.min(1, Math.max(0, (distFromBase - 16.2) / 6.0));
    return -0.04 * (1 - baseBlend) + h * baseBlend;
  };

  // 1. Mặt biển Đông bao quanh (1 draw call)
  const seaGeo = new THREE.PlaneGeometry(420, 420);
  seaGeo.rotateX(-Math.PI / 2);
  const seaMat = new THREE.MeshStandardMaterial({
    color: 0x5c858f,
    roughness: 0.38,
    metalness: 0.08,
  });
  const seaMesh = new THREE.Mesh(seaGeo, seaMat);
  seaMesh.position.set(boxCenterX, -0.55, boxCenterZ);
  seaMesh.receiveShadow = true;
  group.add(seaMesh);

  // 2. Mesh địa hình toàn tỉnh Thanh Hóa (1 draw call)
  const segX = 128;
  const segZ = 104;
  const terrainGeo = new THREE.PlaneGeometry(WORLD_W, WORLD_H, segX, segZ);
  terrainGeo.rotateX(-Math.PI / 2);
  const posAttr = terrainGeo.attributes.position as THREE.BufferAttribute;

  for (let i = 0; i < posAttr.count; i++) {
    const lx = posAttr.getX(i);
    const lz = posAttr.getZ(i);
    const wx = lx + boxCenterX;
    const wz = lz + boxCenterZ;
    posAttr.setY(i, sampleHeightAtWorld(wx, wz));
  }
  terrainGeo.computeVertexNormals();

  const terrainMat = new THREE.MeshStandardMaterial({
    map: getThanhHoaAlbedoTexture(),
    bumpMap: getMeadowBumpTexture(),
    bumpScale: 0.06,
    roughness: 0.92,
    metalness: 0.02,
  });
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.position.set(boxCenterX, 0, boxCenterZ);
  terrainMesh.receiveShadow = true;
  group.add(terrainMesh);

  // 3. Đường ranh giới 23 huyện trên mặt đất 3D (1 draw call LineSegments)
  const borderPositions: number[] = [];
  for (const d of districts) {
    const poly = d.polygon;
    for (let i = 0; i < poly.length - 1; i++) {
      const [wx1, wz1] = pctToWorld(poly[i][0], poly[i][1]);
      const [wx2, wz2] = pctToWorld(poly[i + 1][0], poly[i + 1][1]);
      const y1 = sampleHeightAtWorld(wx1, wz1) + 0.12;
      const y2 = sampleHeightAtWorld(wx2, wz2) + 0.12;
      borderPositions.push(wx1, y1, wz1, wx2, y2, wz2);
    }
  }
  const borderGeo = new THREE.BufferGeometry();
  borderGeo.setAttribute('position', new THREE.Float32BufferAttribute(borderPositions, 3));
  const borderMat = new THREE.LineBasicMaterial({
    color: 0x5c2d14,
    transparent: true,
    opacity: 0.55,
  });
  const borderLines = new THREE.LineSegments(borderGeo, borderMat);
  group.add(borderLines);

  // 4. InstancedMesh cây rừng & đỉnh núi (chỉ 3 draw calls cho hàng trăm cây & núi!)
  const treeTransforms: Array<{ x: number; y: number; z: number; s: number }> = [];
  const peakTransforms: Array<{ x: number; y: number; z: number; sx: number; sy: number; rot: number }> = [];

  // Deterministic pseudo-random scatter across Thanh Hóa
  let seed = 1337;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  for (let i = 0; i < 1600; i++) {
    const px = BOX_X0 + 1.5 + rand() * (BOX_X1 - BOX_X0 - 3.0);
    const py = BOX_Y0 + 1.2 + rand() * (BOX_Y1 - BOX_Y0 - 2.4);
    const d = findDistrictAtPct(px, py);
    if (!d) continue;
    const [wx, wz] = pctToWorld(px, py);
    if (Math.max(Math.abs(wx), Math.abs(wz)) < 17.5) continue;

    const hy = sampleHeightAtWorld(wx, wz);
    if (hy < 0.05) continue;

    if (MOUNTAIN_DISTRICTS.has(d.id) && hy > 1.8 && peakTransforms.length < 180 && rand() < 0.35) {
      peakTransforms.push({
        x: wx,
        y: hy - 0.35,
        z: wz,
        sx: 1.4 + rand() * 1.9,
        sy: 1.6 + rand() * 2.8,
        rot: rand() * Math.PI * 2,
      });
    } else if ((FOREST_DISTRICTS.has(d.id) || rand() < 0.2) && treeTransforms.length < 480) {
      treeTransforms.push({
        x: wx,
        y: hy,
        z: wz,
        s: 0.75 + rand() * 0.65,
      });
    }
  }

  const dummy = new THREE.Object3D();

  // Trunks + Crowns InstancedMesh
  const trunkGeo = new THREE.CylinderGeometry(0.11, 0.16, 0.65, 6);
  trunkGeo.translate(0, 0.32, 0);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c3d24, roughness: 0.92 });
  const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, Math.max(1, treeTransforms.length));
  trunkInst.count = treeTransforms.length;

  const crownGeo = new THREE.ConeGeometry(0.58, 1.45, 7);
  crownGeo.translate(0, 1.15, 0);
  const crownMat = new THREE.MeshStandardMaterial({ color: 0x486e34, roughness: 0.88 });
  const crownInst = new THREE.InstancedMesh(crownGeo, crownMat, Math.max(1, treeTransforms.length));
  crownInst.count = treeTransforms.length;
  crownInst.castShadow = true;

  treeTransforms.forEach((t, idx) => {
    dummy.position.set(t.x, t.y, t.z);
    dummy.scale.set(t.s, t.s, t.s);
    dummy.rotation.set(0, idx * 0.7, 0);
    dummy.updateMatrix();
    trunkInst.setMatrixAt(idx, dummy.matrix);
    crownInst.setMatrixAt(idx, dummy.matrix);
  });
  trunkInst.instanceMatrix.needsUpdate = true;
  crownInst.instanceMatrix.needsUpdate = true;
  group.add(trunkInst, crownInst);

  // Mountain Peaks InstancedMesh
  const peakGeo = new THREE.ConeGeometry(1.5, 2.4, 5);
  peakGeo.translate(0, 1.1, 0);
  const peakMat = new THREE.MeshStandardMaterial({
    color: 0x7a7060,
    roughness: 0.95,
    flatShading: true,
  });
  const peakInst = new THREE.InstancedMesh(peakGeo, peakMat, Math.max(1, peakTransforms.length));
  peakInst.count = peakTransforms.length;
  peakInst.castShadow = true;
  peakInst.receiveShadow = true;

  peakTransforms.forEach((p, idx) => {
    dummy.position.set(p.x, p.y, p.z);
    dummy.scale.set(p.sx, p.sy, p.sx);
    dummy.rotation.set(0, p.rot, 0);
    dummy.updateMatrix();
    peakInst.setMatrixAt(idx, dummy.matrix);
  });
  peakInst.instanceMatrix.needsUpdate = true;
  group.add(peakInst);

  const dispose = () => {
    seaGeo.dispose();
    seaMat.dispose();
    terrainGeo.dispose();
    terrainMat.dispose();
    borderGeo.dispose();
    borderMat.dispose();
    trunkGeo.dispose();
    trunkMat.dispose();
    crownGeo.dispose();
    crownMat.dispose();
    peakGeo.dispose();
    peakMat.dispose();
  };

  return { group, dispose };
}
