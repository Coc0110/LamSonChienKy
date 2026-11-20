import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { BaseBuilding, BaseBuildingType, RegionCombatUnit } from '../types/region';

export const DIORAMA_PALETTE = {
  ground: 0x679445,
  groundAlt: 0x578038,
  cliff: 0x7c6548,
  earth: 0x9b7e56,
  earthDark: 0x755c3c,
  wood: 0x875935,
  woodDark: 0x52341d,
  bamboo: 0x859e48,
  bambooDry: 0xb8a363,
  plaster: 0xede0c8,
  thatch: 0xd6b365,
  thatchDark: 0xb89348,
  tileRed: 0xb33b2e,
  tileBlue: 0x35587c,
  stone: 0x8d9198,
  stoneDark: 0x5f636b,
  gold: 0xe6b83a,
  iron: 0x3b4048,
  ember: 0xff5e14,
  charcoal: 0x242426,
  water: 0x4aa3c4,
  riceYoung: 0x7ec845,
  riceLush: 0x5ca832,
  sack: 0xc8ad7f,
  ceramic: 0x78442a,
  leafDeep: 0x3d7335,
  leafMid: 0x569443,
  leafBright: 0x74b352,
  lamSonBanner: 0xcf2925,
  mingBanner: 0x26538d,
};

type MaterialKey =
  | 'stone'
  | 'stoneDark'
  | 'earth'
  | 'earthDark'
  | 'wood'
  | 'woodDark'
  | 'bamboo'
  | 'bambooDry'
  | 'plaster'
  | 'thatch'
  | 'thatchDark'
  | 'roofRed'
  | 'roofBlue'
  | 'gold'
  | 'iron'
  | 'ember'
  | 'charcoal'
  | 'water'
  | 'riceYoung'
  | 'riceLush'
  | 'sack'
  | 'ceramic'
  | 'bannerLS'
  | 'bannerMing'
  | 'targetWhite'
  | 'skin';

const cachedMaterials = new Map<string, THREE.MeshStandardMaterial>();
const cachedPartGeometries = new Map<string, Array<{ matKey: MaterialKey; geo: THREE.BufferGeometry }>>();
const cachedUnitPartGeometries = new Map<
  string,
  Array<{ matKey: 'body' | 'armor' | 'wood' | 'iron' | 'gold' | 'skin'; geo: THREE.BufferGeometry }>
>();

function getSharedMaterial(key: MaterialKey, transparent = false, opacity = 1): THREE.MeshStandardMaterial {
  const cacheKey = `${key}_${transparent ? 't' : 'o'}_${opacity}`;
  const hit = cachedMaterials.get(cacheKey);
  if (hit) return hit;

  let mat: THREE.MeshStandardMaterial;
  switch (key) {
    case 'stone':
      mat = new THREE.MeshStandardMaterial({ color: DIORAMA_PALETTE.stone, roughness: 0.88 });
      break;
    case 'stoneDark':
      mat = new THREE.MeshStandardMaterial({ color: DIORAMA_PALETTE.stoneDark, roughness: 0.92 });
      break;
    case 'earth':
      mat = new THREE.MeshStandardMaterial({ color: DIORAMA_PALETTE.earth, roughness: 0.95 });
      break;
    case 'earthDark':
      mat = new THREE.MeshStandardMaterial({ color: DIORAMA_PALETTE.earthDark, roughness: 0.96 });
      break;
    case 'wood':
      mat = new THREE.MeshStandardMaterial({ color: DIORAMA_PALETTE.wood, roughness: 0.84 });
      break;
    case 'woodDark':
      mat = new THREE.MeshStandardMaterial({ color: DIORAMA_PALETTE.woodDark, roughness: 0.88 });
      break;
    case 'bamboo':
      mat = new THREE.MeshStandardMaterial({ color: DIORAMA_PALETTE.bamboo, roughness: 0.72 });
      break;
    case 'bambooDry':
      mat = new THREE.MeshStandardMaterial({ color: DIORAMA_PALETTE.bambooDry, roughness: 0.85 });
      break;
    case 'plaster':
      mat = new THREE.MeshStandardMaterial({ color: DIORAMA_PALETTE.plaster, roughness: 0.78 });
      break;
    case 'thatch':
      mat = new THREE.MeshStandardMaterial({ color: DIORAMA_PALETTE.thatch, roughness: 0.92 });
      break;
    case 'thatchDark':
      mat = new THREE.MeshStandardMaterial({ color: DIORAMA_PALETTE.thatchDark, roughness: 0.94 });
      break;
    case 'roofRed':
      mat = new THREE.MeshStandardMaterial({ color: DIORAMA_PALETTE.tileRed, roughness: 0.65 });
      break;
    case 'roofBlue':
      mat = new THREE.MeshStandardMaterial({ color: DIORAMA_PALETTE.tileBlue, roughness: 0.65 });
      break;
    case 'gold':
      mat = new THREE.MeshStandardMaterial({ color: DIORAMA_PALETTE.gold, roughness: 0.35, metalness: 0.5 });
      break;
    case 'iron':
      mat = new THREE.MeshStandardMaterial({ color: DIORAMA_PALETTE.iron, roughness: 0.45, metalness: 0.6 });
      break;
    case 'ember':
      mat = new THREE.MeshStandardMaterial({
        color: DIORAMA_PALETTE.ember,
        emissive: 0xff4500,
        emissiveIntensity: 0.95,
        roughness: 0.4,
      });
      break;
    case 'charcoal':
      mat = new THREE.MeshStandardMaterial({ color: DIORAMA_PALETTE.charcoal, roughness: 0.95 });
      break;
    case 'water':
      mat = new THREE.MeshStandardMaterial({ color: DIORAMA_PALETTE.water, roughness: 0.22, metalness: 0.15 });
      break;
    case 'riceYoung':
      mat = new THREE.MeshStandardMaterial({ color: DIORAMA_PALETTE.riceYoung, roughness: 0.86 });
      break;
    case 'riceLush':
      mat = new THREE.MeshStandardMaterial({ color: DIORAMA_PALETTE.riceLush, roughness: 0.88 });
      break;
    case 'sack':
      mat = new THREE.MeshStandardMaterial({ color: DIORAMA_PALETTE.sack, roughness: 0.94 });
      break;
    case 'ceramic':
      mat = new THREE.MeshStandardMaterial({ color: DIORAMA_PALETTE.ceramic, roughness: 0.55 });
      break;
    case 'bannerLS':
      mat = new THREE.MeshStandardMaterial({ color: DIORAMA_PALETTE.lamSonBanner, roughness: 0.68 });
      break;
    case 'bannerMing':
      mat = new THREE.MeshStandardMaterial({ color: DIORAMA_PALETTE.mingBanner, roughness: 0.68 });
      break;
    case 'targetWhite':
      mat = new THREE.MeshStandardMaterial({ color: 0xfafaf9, roughness: 0.75 });
      break;
    case 'skin':
      mat = new THREE.MeshStandardMaterial({ color: 0xe6be9a, roughness: 0.75 });
      break;
  }

  if (transparent) {
    mat = mat.clone();
    mat.transparent = true;
    mat.opacity = opacity;
  }

  cachedMaterials.set(cacheKey, mat);
  return mat;
}

let cachedLeFlagMat: THREE.MeshStandardMaterial | null = null;
let cachedMingFlagMat: THREE.MeshStandardMaterial | null = null;

function getFlagBannerMaterial(isEnemy: boolean): THREE.MeshStandardMaterial {
  if (!isEnemy && cachedLeFlagMat) return cachedLeFlagMat;
  if (isEnemy && cachedMingFlagMat) return cachedMingFlagMat;

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = isEnemy ? '#1e3a8a' : '#b91c1c';
    ctx.fillRect(0, 0, 128, 96);
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 5;
    ctx.strokeRect(4, 4, 120, 88);

    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 46px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(isEnemy ? '明' : 'Lê', 64, 50);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.65,
    side: THREE.DoubleSide,
  });

  if (isEnemy) cachedMingFlagMat = mat;
  else cachedLeFlagMat = mat;
  return mat;
}

/**
 * Tạo texture mặt cỏ chi tiết kiểu làng quê Việt Nam + lối mòn đất nện nối các công trình
 */
export function createDetailedGroundTexture(
  gridSize: number,
  buildings: BaseBuilding[]
): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Nền cỏ xanh mướt
  ctx.fillStyle = '#638f42';
  ctx.fillRect(0, 0, size, size);

  // Các mảng cỏ đậm/nhạt tự nhiên (deterministic pseudo-random)
  for (let i = 0; i < 650; i++) {
    const rx = ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1;
    const ry = ((Math.sin(i * 78.233) * 43758.5453) % 1 + 1) % 1;
    const rad = 12 + (i % 28);
    ctx.fillStyle = i % 3 === 0 ? 'rgba(125, 173, 72, 0.28)' : i % 3 === 1 ? 'rgba(72, 114, 45, 0.25)' : 'rgba(150, 185, 92, 0.18)';
    ctx.beginPath();
    ctx.arc(rx * size, ry * size, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  // Cụm cỏ & hoa dại li ti
  for (let i = 0; i < 900; i++) {
    const rx = ((Math.sin(i * 45.164) * 19283.123) % 1 + 1) % 1;
    const ry = ((Math.sin(i * 91.732) * 19283.123) % 1 + 1) % 1;
    ctx.fillStyle = i % 11 === 0 ? '#facc15' : i % 17 === 0 ? '#fef3c7' : '#4a752c';
    ctx.fillRect(rx * size, ry * size, i % 11 === 0 ? 3 : 2, i % 11 === 0 ? 3 : 4);
  }

  // Vẽ lối mòn đất nện nối Nhà Chính tới các công trình khác & cổng
  const scale = size / gridSize;
  const mainHall = buildings.find((b) => b.type === 'main_hall' && b.status !== 'destroyed');
  if (mainHall) {
    const mx = (mainHall.col + mainHall.spanCols / 2) * scale;
    const mz = (mainHall.row + mainHall.spanRows / 2) * scale;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const b of buildings) {
      if (b.id === mainHall.id || b.type === 'wall' || b.type === 'spike_trap' || b.status === 'destroyed') {
        continue;
      }
      const bx = (b.col + b.spanCols / 2) * scale;
      const bz = (b.row + b.spanRows / 2) * scale;

      // Viền đất tối nhẹ
      ctx.strokeStyle = 'rgba(116, 91, 58, 0.55)';
      ctx.lineWidth = scale * 0.95;
      ctx.beginPath();
      ctx.moveTo(mx, mz);
      ctx.lineTo(bx, mz);
      ctx.lineTo(bx, bz);
      ctx.stroke();

      // Lõi đường đất nện sáng
      ctx.strokeStyle = 'rgba(168, 139, 96, 0.72)';
      ctx.lineWidth = scale * 0.62;
      ctx.beginPath();
      ctx.moveTo(mx, mz);
      ctx.lineTo(bx, mz);
      ctx.lineTo(bx, bz);
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function safeMerge(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const nonIndexed = parts.map((g) => (g.index ? g.toNonIndexed() : g));
  const merged = BufferGeometryUtils.mergeGeometries(nonIndexed, false);
  return merged || nonIndexed[0];
}

function box(w: number, h: number, d: number, x: number, y: number, z: number): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return g;
}

function cyl(
  rt: number,
  rb: number,
  h: number,
  seg: number,
  x: number,
  y: number,
  z: number
): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  g.translate(x, y, z);
  return g;
}

function cone(r: number, h: number, seg: number, x: number, y: number, z: number, rotY = 0): THREE.BufferGeometry {
  const g = new THREE.ConeGeometry(r, h, seg);
  if (rotY !== 0) g.rotateY(rotY);
  g.translate(x, y, z);
  return g;
}

function sphere(r: number, x: number, y: number, z: number): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(r, 8, 6);
  g.translate(x, y, z);
  return g;
}

function getBuildingParts(
  type: BaseBuildingType,
  level: number,
  isEnemy: boolean,
  wallMask = 0
): Array<{ matKey: MaterialKey; geo: THREE.BufferGeometry }> {
  const tier = Math.min(5, Math.max(1, level));
  const key = `${type}_${tier}_${isEnemy ? 'e' : 'p'}_m${wallMask}`;
  const hit = cachedPartGeometries.get(key);
  if (hit) return hit;

  const bannerMat: MaterialKey = isEnemy ? 'bannerMing' : 'bannerLS';
  const buckets = new Map<MaterialKey, THREE.BufferGeometry[]>();
  const push = (m: MaterialKey, g: THREE.BufferGeometry) => {
    const arr = buckets.get(m);
    if (arr) arr.push(g);
    else buckets.set(m, [g]);
  };

  switch (type) {
    case 'main_hall': {
      // 5x5 Nhà sàn gỗ lớn, nền đất nện đắp cao, mái tranh dày, trống cái & giá binh khí trước sân
      push('earthDark', box(4.75, 0.24, 4.75, 0, 0.12, 0));
      push('earth', box(4.35, 0.2, 4.35, 0, 0.34, 0));
      // Sàn gỗ cao & hàng cột nhà sàn
      for (const cx of [-1.45, -0.5, 0.5, 1.45]) {
        for (const cz of [-1.2, 0.1, 0.9]) {
          push('woodDark', cyl(0.09, 0.11, 0.65, 8, cx, 0.72, cz));
        }
      }
      push('wood', box(3.4, 0.16, 2.6, 0, 1.05, -0.15));
      // Cầu thang gỗ lên nhà sàn
      for (let s = 0; s < 4; s++) {
        push('woodDark', box(0.75, 0.08, 0.22, 0, 0.48 + s * 0.15, 1.48 - s * 0.15));
      }
      // Thân nhà gỗ
      push('wood', box(3.0, 0.95, 2.2, 0, 1.6, -0.15));
      push('woodDark', box(0.72, 0.72, 0.08, 0, 1.5, 0.96)); // Cửa gỗ lớn
      // Mái lợp tranh dày đặc trưng Việt Nam cổ (2 lớp mái chóp vát)
      push('thatchDark', box(3.7, 0.18, 2.95, 0, 2.15, -0.15));
      push('thatch', cone(2.55, 1.15, 4, 0, 2.75, -0.15, Math.PI / 4));
      push('thatchDark', box(0.22, 0.16, 2.1, 0, 3.3, -0.15)); // Sống nóc mái
      if (tier >= 3) {
        push('thatch', cone(1.65, 0.75, 4, 0, 3.45, -0.15, Math.PI / 4));
      }
      // Trống cái lớn đặt trên giá gỗ trước sân (bên trái)
      push('woodDark', box(0.75, 0.36, 0.12, -1.25, 0.62, 1.68));
      push('woodDark', box(0.75, 0.36, 0.12, -1.25, 0.62, 1.32));
      const drumBody = cyl(0.32, 0.32, 0.56, 12, 0, 0, 0);
      drumBody.rotateZ(Math.PI / 2);
      drumBody.translate(-1.25, 0.88, 1.5);
      push(bannerMat, drumBody);
      push('gold', box(0.08, 0.68, 0.68, -1.52, 0.88, 1.5));
      // Giá cắm binh khí trước sân (bên phải)
      push('woodDark', box(1.0, 0.08, 0.14, 1.25, 0.92, 1.52));
      push('woodDark', cyl(0.04, 0.05, 0.6, 6, 0.82, 0.7, 1.52));
      push('woodDark', cyl(0.04, 0.05, 0.6, 6, 1.68, 0.7, 1.52));
      for (const wx of [0.95, 1.15, 1.35, 1.55]) {
        push('wood', cyl(0.025, 0.025, 1.05, 6, wx, 0.92, 1.52));
        push('iron', cone(0.045, 0.2, 6, wx, 1.5, 1.52));
      }
      // Cột cờ lệnh cao trước sân (lá cờ có canvas chữ "Lê" gắn riêng trong createBuildingGroup)
      push('woodDark', cyl(0.05, 0.07, 2.75, 8, -1.85, 1.8, 1.75));
      push('gold', sphere(0.09, -1.85, 3.2, 1.75));
      break;
    }

    case 'farm': {
      // 5x5 Ruộng bậc thang / ruộng nước thấp trũng + luống lúa non + chòi canh + lu nước + cuốc cào
      push('earthDark', box(4.8, 0.14, 4.8, 0, 0.07, 0));
      push('water', box(4.45, 0.08, 4.45, 0, 0.13, 0));
      // Bờ ruộng chia ô
      push('earth', box(4.55, 0.14, 0.18, 0, 0.16, -0.1));
      push('earth', box(0.18, 0.14, 4.55, 0.45, 0.16, 0));
      // Luống lúa non xanh tốt
      for (let r = 0; r < 5; r++) {
        const z = -1.65 + r * 0.82;
        if (Math.abs(z + 0.1) < 0.25) continue;
        push('earth', box(2.3, 0.1, 0.36, 1.05, 0.16, z));
        push(r % 2 === 0 ? 'riceYoung' : 'riceLush', box(2.15, 0.16 + tier * 0.02, 0.26, 1.05, 0.26, z));
      }
      for (let r = 0; r < 3; r++) {
        const z = 0.45 + r * 0.72;
        push('earth', box(1.85, 0.1, 0.34, -1.15, 0.16, z));
        push('riceYoung', box(1.72, 0.16, 0.24, -1.15, 0.26, z));
      }
      // Chòi canh điền nhỏ ở góc (-1.45, -1.45)
      for (const [cx, cz] of [[-1.9, -1.9], [-1.0, -1.9], [-1.9, -1.0], [-1.0, -1.0]]) {
        push('bambooDry', cyl(0.05, 0.06, 1.05, 6, cx, 0.65, cz));
      }
      push('bamboo', box(1.05, 0.08, 1.05, -1.45, 0.48, -1.45));
      push('thatch', cone(0.95, 0.62, 4, -1.45, 1.42, -1.45, Math.PI / 4));
      // Lu nước sành & nông cụ (cuốc, cào) dựng bên cạnh chòi
      push('ceramic', cyl(0.18, 0.14, 0.36, 10, -0.68, 0.34, -1.3));
      push('water', cyl(0.15, 0.15, 0.04, 10, -0.68, 0.51, -1.3));
      const hoe = cyl(0.025, 0.025, 0.85, 6, -0.82, 0.56, -1.78);
      hoe.rotateZ(0.2);
      push('wood', hoe);
      push('iron', box(0.22, 0.05, 0.1, -0.9, 0.94, -1.78));
      break;
    }

    case 'forge': {
      // 3x3 Nhà nhỏ mái tranh, vách hở thoát nhiệt, bếp lò đỏ lửa, ống khói đất nện, đe sắt, búa, giá vũ khí, than củi
      push('earthDark', box(2.8, 0.14, 2.8, 0, 0.07, 0));
      // 4 cột gỗ vách hở
      for (const [cx, cz] of [[-1.0, -1.0], [0.55, -1.0], [-1.0, 0.65], [0.55, 0.65]]) {
        push('woodDark', cyl(0.06, 0.07, 1.0, 6, cx, 0.64, cz));
      }
      // Mái tranh thoáng
      push('thatch', cone(1.5, 0.72, 4, -0.22, 1.45, -0.18, Math.PI / 4));
      // Bếp lò đất nện & ống khói + lửa đỏ rực
      push('earth', box(0.75, 0.65, 0.75, -0.5, 0.45, -0.45));
      push('earthDark', cyl(0.2, 0.3, 1.15 + tier * 0.08, 8, -0.5, 1.05, -0.45));
      push('ember', box(0.42, 0.32, 0.22, -0.5, 0.35, -0.05));
      // Đe sắt & búa tạ bên ngoài
      push('wood', cyl(0.16, 0.18, 0.24, 8, 0.35, 0.24, 0.35));
      push('iron', box(0.4, 0.2, 0.22, 0.35, 0.44, 0.35));
      push('wood', cyl(0.025, 0.025, 0.45, 6, 0.55, 0.55, 0.35));
      push('iron', box(0.18, 0.1, 0.1, 0.55, 0.76, 0.35));
      // Đống than củi
      push('charcoal', sphere(0.22, 0.95, 0.22, -0.55));
      push('charcoal', sphere(0.18, 1.12, 0.2, -0.35));
      push('charcoal', sphere(0.16, 0.85, 0.2, -0.32));
      // Giá treo kiếm giáo thô sơ
      push('woodDark', box(0.7, 0.06, 0.08, 0.95, 0.72, 0.75));
      for (const sx of [0.75, 0.95, 1.15]) {
        push('iron', box(0.05, 0.55, 0.04, sx, 0.52, 0.75));
      }
      break;
    }

    case 'food_storage': {
      // 3x3 Kho lương sàn cao chống ẩm, vách gỗ kín mít, mái tranh, thang gỗ nhỏ, bao tải gai xung quanh
      push('earthDark', box(2.75, 0.12, 2.75, 0, 0.06, 0));
      // Cột chống ẩm
      for (const [cx, cz] of [[-0.85, -0.85], [0.85, -0.85], [-0.85, 0.85], [0.85, 0.85]]) {
        push('woodDark', cyl(0.08, 0.09, 0.42, 6, cx, 0.32, cz));
      }
      // Nhà kho vách gỗ kín mít
      push('wood', box(2.05, 0.92 + tier * 0.06, 1.95, 0, 0.98, 0));
      push('woodDark', box(0.55, 0.65, 0.08, 0, 0.86, 0.98)); // Cửa kho kín
      push('thatch', cone(1.72, 0.78, 4, 0, 1.82 + tier * 0.06, 0, Math.PI / 4));
      // Thang gỗ nhỏ dẫn lên cửa kho
      push('woodDark', box(0.06, 0.65, 0.06, -0.22, 0.38, 1.18));
      push('woodDark', box(0.06, 0.65, 0.06, 0.22, 0.38, 1.18));
      for (let r = 0; r < 3; r++) {
        push('wood', box(0.46, 0.05, 0.08, 0, 0.2 + r * 0.18, 1.18));
      }
      // Bao tải gai đựng lương thực xếp xung quanh
      for (const [sx, sy, sz] of [
        [-0.9, 0.22, 1.05],
        [-0.65, 0.22, 1.12],
        [-0.78, 0.38, 1.08],
        [0.88, 0.22, 1.02],
        [1.08, 0.22, 0.72],
      ]) {
        push('sack', box(0.32, 0.2, 0.24, sx, sy, sz));
      }
      break;
    }

    case 'armory': {
      // 3x3 Kho Bạc & Quân Nhu kiên cố nhất: tường đá dày, cửa gỗ lim gia cố sắt, có lính canh ở cửa
      push('stoneDark', box(2.8, 0.2, 2.8, 0, 0.1, 0));
      push('stone', box(2.15, 1.05 + tier * 0.08, 2.05, 0, 0.72 + tier * 0.04, 0));
      push('stoneDark', box(2.28, 0.2, 2.18, 0, 1.32 + tier * 0.08, 0));
      // Cửa gỗ lim gia cố đai sắt
      push('woodDark', box(0.7, 0.76, 0.12, 0, 0.58, 1.04));
      push('iron', box(0.74, 0.09, 0.14, 0, 0.42, 1.05));
      push('iron', box(0.74, 0.09, 0.14, 0, 0.72, 1.05));
      push('gold', box(0.18, 0.18, 0.15, 0, 0.56, 1.06));
      // Lính canh đứng gác ngay cửa (2 bên cửa)
      for (const gx of [-0.62, 0.62]) {
        push(bannerMat, cyl(0.11, 0.13, 0.36, 8, gx, 0.38, 1.24));
        push('skin', sphere(0.08, gx, 0.62, 1.24));
        push('iron', cone(0.12, 0.12, 8, gx, 0.72, 1.24));
        push('wood', cyl(0.02, 0.02, 0.85, 6, gx + (gx > 0 ? 0.14 : -0.14), 0.52, 1.26));
      }
      break;
    }

    case 'house': {
      push('earthDark', box(1.7, 0.1, 1.7, 0, 0.05, 0));
      push('wood', box(1.15, 0.56, 1.05, 0, 0.38, 0));
      push('woodDark', box(0.32, 0.42, 0.08, 0, 0.31, 0.53));
      push('thatch', cone(1.02, 0.55, 4, 0, 0.94, 0, Math.PI / 4));
      push('ceramic', cyl(0.12, 0.1, 0.24, 8, 0.68, 0.22, 0.45)); // Vại nước mưa
      break;
    }

    case 'barracks': {
      push('earthDark', box(2.8, 0.1, 2.8, 0, 0.05, 0));
      push('wood', box(1.9, 0.72, 1.05, 0, 0.46, -0.58));
      push('thatch', cone(1.5, 0.6, 4, 0, 1.12, -0.58, Math.PI / 4));
      // Bia bắn cung & giá vũ khí
      push('woodDark', cyl(0.05, 0.06, 0.7, 6, -0.78, 0.42, 0.72));
      push('targetWhite', cyl(0.26, 0.26, 0.08, 12, -0.78, 0.64, 0.72));
      push(bannerMat, cyl(0.14, 0.14, 0.1, 12, -0.78, 0.64, 0.72));
      push('woodDark', box(0.85, 0.08, 0.12, 0.65, 0.52, 0.72));
      for (const ox of [0.4, 0.65, 0.9]) {
        push('iron', cyl(0.025, 0.025, 0.78, 6, ox, 0.45, 0.72));
      }
      push('woodDark', cyl(0.035, 0.04, 1.2, 6, 1.05, 0.68, -0.95));
      push(bannerMat, box(0.42, 0.26, 0.04, 1.26, 1.12, -0.95));
      break;
    }

    case 'wall': {
      // 1x1 Tường rào gỗ lim / tre già vót nhọn, bện dây mây, tự động kết nối liền mạch (wallMask: N=1, S=2, E=4, W=8)
      const stakeMat: MaterialKey = tier >= 3 ? 'woodDark' : 'bamboo';
      const stakeH = 0.78 + tier * 0.08;
      // Mô đất chân cọc
      push('earthDark', box(0.95, 0.14, 0.95, 0, 0.07, 0));
      // Cụm cọc tre/gỗ vót nhọn ở tâm
      for (const [sx, sz] of [[-0.22, 0], [0, 0], [0.22, 0], [0, -0.22], [0, 0.22]]) {
        push(stakeMat, cyl(0.08, 0.09, stakeH, 6, sx, stakeH / 2 + 0.08, sz));
        push(stakeMat, cone(0.08, 0.2, 6, sx, stakeH + 0.18, sz));
      }
      // Dây mây bện ngang
      push('bambooDry', box(0.65, 0.07, 0.24, 0, stakeH * 0.65, 0));

      // Kết nối sang Bắc (row - 1 => z < 0)
      if (wallMask & 1) {
        push(stakeMat, cyl(0.08, 0.09, stakeH, 6, 0, stakeH / 2 + 0.08, -0.4));
        push(stakeMat, cone(0.08, 0.2, 6, 0, stakeH + 0.18, -0.4));
        push('bambooDry', box(0.22, 0.08, 0.5, 0, stakeH * 0.65, -0.25));
      }
      // Kết nối sang Nam (row + 1 => z > 0)
      if (wallMask & 2) {
        push(stakeMat, cyl(0.08, 0.09, stakeH, 6, 0, stakeH / 2 + 0.08, 0.4));
        push(stakeMat, cone(0.08, 0.2, 6, 0, stakeH + 0.18, 0.4));
        push('bambooDry', box(0.22, 0.08, 0.5, 0, stakeH * 0.65, 0.25));
      }
      // Kết nối sang Đông (col + 1 => x > 0)
      if (wallMask & 4) {
        push(stakeMat, cyl(0.08, 0.09, stakeH, 6, 0.4, stakeH / 2 + 0.08, 0));
        push(stakeMat, cone(0.08, 0.2, 6, 0.4, stakeH + 0.18, 0));
        push('bambooDry', box(0.5, 0.08, 0.22, 0.25, stakeH * 0.65, 0));
      }
      // Kết nối sang Tây (col - 1 => x < 0)
      if (wallMask & 8) {
        push(stakeMat, cyl(0.08, 0.09, stakeH, 6, -0.4, stakeH / 2 + 0.08, 0));
        push(stakeMat, cone(0.08, 0.2, 6, -0.4, stakeH + 0.18, 0));
        push('bambooDry', box(0.5, 0.08, 0.22, -0.25, stakeH * 0.65, 0));
      }
      break;
    }

    case 'gate': {
      // 3x1 Cổng Thành: Vọng lâu gỗ nhỏ có mái che ở trên, cánh cổng gỗ dày có then cài lớn
      push('earthDark', box(2.9, 0.14, 0.95, 0, 0.07, 0));
      // 2 trụ cổng gỗ lim lớn hai bên
      push('woodDark', box(0.55, 1.35, 0.8, -1.15, 0.72, 0));
      push('woodDark', box(0.55, 1.35, 0.8, 1.15, 0.72, 0));
      // Cánh cổng gỗ dày + then cài lớn
      push('wood', box(1.75, 0.92, 0.2, 0, 0.55, 0));
      push('woodDark', box(1.9, 0.14, 0.28, 0, 0.55, 0.04)); // Then cài lớn
      // Vọng lâu nhỏ bên trên cổng có mái che
      push('wood', box(2.6, 0.16, 0.95, 0, 1.42, 0));
      for (const px of [-0.95, 0.95]) {
        for (const pz of [-0.32, 0.32]) {
          push('woodDark', cyl(0.05, 0.05, 0.62, 6, px, 1.78, pz));
        }
      }
      push('thatch', cone(1.65, 0.62, 4, 0, 2.38, 0, Math.PI / 4));
      push(bannerMat, box(0.38, 0.24, 0.04, -1.15, 1.65, 0));
      push(bannerMat, box(0.38, 0.24, 0.04, 1.15, 1.65, 0));
      break;
    }

    case 'watchtower': {
      // 2x2 Tháp gỗ cao 4 cột trụ vững chắc, sàn đứng có mái che, thang tre thả xuống, 2 lính gác trên sàn
      const h = 1.65 + tier * 0.16;
      push('earthDark', box(1.75, 0.14, 1.75, 0, 0.07, 0));
      // 4 cột trụ gỗ vững chắc
      for (const [cx, cz] of [[-0.58, -0.58], [0.58, -0.58], [-0.58, 0.58], [0.58, 0.58]]) {
        push('woodDark', cyl(0.07, 0.09, h, 8, cx, 0.14 + h / 2, cz));
      }
      // Sàn đứng trên cao + lan can
      const deckY = 0.14 + h;
      push('wood', box(1.52, 0.14, 1.52, 0, deckY, 0));
      push('bambooDry', box(1.56, 0.2, 0.08, 0, deckY + 0.16, 0.72));
      push('bambooDry', box(1.56, 0.2, 0.08, 0, deckY + 0.16, -0.72));
      push('bambooDry', box(0.08, 0.2, 1.56, -0.72, deckY + 0.16, 0));
      push('bambooDry', box(0.08, 0.2, 1.56, 0.72, deckY + 0.16, 0));
      // Thang tre thả xuống
      push('bambooDry', cyl(0.03, 0.03, h, 6, -0.2, 0.14 + h / 2, 0.8));
      push('bambooDry', cyl(0.03, 0.03, h, 6, 0.2, 0.14 + h / 2, 0.8));
      for (let s = 0; s < 5; s++) {
        push('bamboo', box(0.42, 0.04, 0.05, 0, 0.35 + s * (h / 5.2), 0.8));
      }
      // 4 cột mái & mái che nhỏ
      for (const [cx, cz] of [[-0.58, -0.58], [0.58, -0.58], [-0.58, 0.58], [0.58, 0.58]]) {
        push('woodDark', cyl(0.045, 0.045, 0.65, 6, cx, deckY + 0.4, cz));
      }
      push('thatch', cone(1.22, 0.55, 4, 0, deckY + 0.96, 0, Math.PI / 4));
      // 2 cung thủ/lính gác đứng trên sàn
      for (const ax of [-0.28, 0.28]) {
        push(bannerMat, cyl(0.09, 0.11, 0.3, 8, ax, deckY + 0.22, 0.1));
        push('skin', sphere(0.07, ax, deckY + 0.42, 0.1));
        push('bambooDry', cone(0.14, 0.1, 8, ax, deckY + 0.5, 0.1)); // Nón lá / mũ
      }
      break;
    }

    case 'spike_trap': {
      push('earthDark', box(0.88, 0.07, 0.88, 0, 0.035, 0));
      for (const [ox, oz] of [[-0.24, -0.24], [0.24, -0.24], [-0.24, 0.24], [0.24, 0.24], [0, 0]]) {
        push('bamboo', cone(0.08, 0.34 + tier * 0.04, 6, ox, 0.22, oz));
        push('iron', cone(0.05, 0.15, 6, ox, 0.42, oz));
      }
      break;
    }
  }

  const result: Array<{ matKey: MaterialKey; geo: THREE.BufferGeometry }> = [];
  for (const [matKey, geos] of buckets.entries()) {
    result.push({ matKey, geo: safeMerge(geos) });
  }
  cachedPartGeometries.set(key, result);
  return result;
}

export function createBuildingGroup(
  type: BaseBuildingType,
  level: number,
  isEnemy: boolean,
  isConstructing = false,
  wallMask = 0
): THREE.Group {
  const parts = getBuildingParts(type, level, isEnemy, wallMask);
  const group = new THREE.Group();
  const opacity = isConstructing ? 0.62 : 1;

  for (const part of parts) {
    const mat = getSharedMaterial(part.matKey, isConstructing, opacity);
    const mesh = new THREE.Mesh(part.geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  // Gắn lá cờ lệnh lớn thêu chữ "Lê" (hoặc "明") trên Nhà Chính
  if (type === 'main_hall') {
    const flagGeo = new THREE.PlaneGeometry(0.95, 0.68);
    const flagMat = getFlagBannerMaterial(isEnemy);
    const flagMesh = new THREE.Mesh(flagGeo, flagMat);
    flagMesh.position.set(-1.38, 2.75, 1.75);
    flagMesh.castShadow = true;
    group.add(flagMesh);
  }

  return group;
}

/**
 * Cây cối bản địa Việt Nam cổ: Bụi tre, Cây chuối, Cây dừa, Cây đa cổ thụ
 */
export type VietnameseTreeKind = 'bamboo' | 'banana' | 'coconut' | 'banyan';

const treeLeafMatDeep = new THREE.MeshStandardMaterial({ color: DIORAMA_PALETTE.leafDeep, roughness: 0.85 });
const treeLeafMatMid = new THREE.MeshStandardMaterial({ color: DIORAMA_PALETTE.leafMid, roughness: 0.84 });
const treeLeafMatBright = new THREE.MeshStandardMaterial({ color: DIORAMA_PALETTE.leafBright, roughness: 0.82 });
const bambooStalkMat = new THREE.MeshStandardMaterial({ color: DIORAMA_PALETTE.bamboo, roughness: 0.72 });
const woodBarkMat = new THREE.MeshStandardMaterial({ color: DIORAMA_PALETTE.woodDark, roughness: 0.92 });

export function createVietnameseTree(kind: VietnameseTreeKind): THREE.Group {
  const group = new THREE.Group();

  if (kind === 'bamboo') {
    // Bụi tre gồm nhiều thân tre cao mảnh & tán lá tre xum xuê
    const offsets = [
      [0, 0, 1.9, 0.08],
      [-0.22, 0.14, 1.65, -0.1],
      [0.24, -0.1, 1.75, 0.12],
      [-0.12, -0.24, 1.5, -0.07],
      [0.14, 0.22, 1.6, 0.09],
    ];
    for (const [ox, oz, h, tilt] of offsets) {
      const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.048, h, 6), bambooStalkMat);
      stalk.position.set(ox, h / 2, oz);
      stalk.rotation.z = tilt;
      stalk.castShadow = true;
      group.add(stalk);

      const crown = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.32, 0),
        tilt > 0 ? treeLeafMatBright : treeLeafMatMid
      );
      crown.scale.set(1.2, 0.65, 1.2);
      crown.position.set(ox - tilt * 0.8, h * 0.95, oz);
      crown.castShadow = true;
      group.add(crown);
    }
  } else if (kind === 'banana') {
    // Cây chuối: thân bẹ xanh + 5 tàu lá chuối bản rộng tỏa ra
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, 0.95, 7), bambooStalkMat);
    stem.position.y = 0.48;
    stem.castShadow = true;
    group.add(stem);

    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.03, 0.82), treeLeafMatBright);
      leaf.position.set(Math.sin(angle) * 0.36, 0.96, Math.cos(angle) * 0.36);
      leaf.rotation.y = angle;
      leaf.rotation.x = 0.38;
      leaf.castShadow = true;
      group.add(leaf);
    }
  } else if (kind === 'coconut') {
    // Cây dừa: thân cao cong nhẹ + chùm tàu lá dừa xòe
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.14, 2.0, 7), woodBarkMat);
    trunk.position.set(0.08, 1.0, 0);
    trunk.rotation.z = -0.1;
    trunk.castShadow = true;
    group.add(trunk);

    for (let i = 0; i < 7; i++) {
      const angle = (i / 7) * Math.PI * 2;
      const frond = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.03, 0.95), treeLeafMatMid);
      frond.position.set(0.18 + Math.sin(angle) * 0.42, 1.98, Math.cos(angle) * 0.42);
      frond.rotation.y = angle;
      frond.rotation.x = 0.42;
      frond.castShadow = true;
      group.add(frond);
    }
  } else {
    // Cây đa / cây gỗ lớn tán rộng
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 1.15, 8), woodBarkMat);
    trunk.position.y = 0.58;
    trunk.castShadow = true;
    group.add(trunk);

    const canopyOffsets: Array<[number, number, number, number]> = [
      [0, 1.45, 0, 0.85],
      [-0.55, 1.25, 0.35, 0.6],
      [0.55, 1.28, -0.3, 0.62],
      [0.15, 1.25, 0.55, 0.58],
    ];
    for (const [cx, cy, cz, r] of canopyOffsets) {
      const dome = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 1), treeLeafMatDeep);
      dome.scale.set(1.25, 0.72, 1.25);
      dome.position.set(cx, cy, cz);
      dome.castShadow = true;
      group.add(dome);
    }
  }

  return group;
}

/**
 * Vật dụng trang trí làng quê / doanh trại cổ: đống củi, giá phơi quân phục, hàng rào tre, vại nước mưa
 */
export function createDecorProp(kind: 'woodpile' | 'drying_rack' | 'bamboo_fence' | 'rain_jar'): THREE.Group {
  const g = new THREE.Group();
  if (kind === 'woodpile') {
    const logMat = getSharedMaterial('woodDark');
    for (const [lx, ly] of [[-0.14, 0.08], [0, 0.08], [0.14, 0.08], [-0.07, 0.2], [0.07, 0.2]]) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.45, 6), logMat);
      log.rotation.x = Math.PI / 2;
      log.position.set(lx, ly, 0);
      log.castShadow = true;
      g.add(log);
    }
  } else if (kind === 'drying_rack') {
    const bm = getSharedMaterial('bambooDry');
    const clothMat = getSharedMaterial('bannerLS');
    const p1 = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.75, 6), bm);
    p1.position.set(-0.35, 0.37, 0);
    const p2 = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.75, 6), bm);
    p2.position.set(0.35, 0.37, 0);
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.8, 6), bm);
    bar.rotation.z = Math.PI / 2;
    bar.position.set(0, 0.68, 0);
    const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.38, 0.06), clothMat);
    shirt.position.set(-0.08, 0.5, 0);
    shirt.castShadow = true;
    g.add(p1, p2, bar, shirt);
  } else if (kind === 'bamboo_fence') {
    const bm = getSharedMaterial('bamboo');
    for (const fx of [-0.3, 0, 0.3]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.48, 6), bm);
      post.position.set(fx, 0.24, 0);
      post.castShadow = true;
      g.add(post);
    }
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 0.05), bm);
    rail.position.set(0, 0.32, 0);
    g.add(rail);
  } else {
    const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.34, 10), getSharedMaterial('ceramic'));
    jar.position.y = 0.17;
    jar.castShadow = true;
    const wat = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.03, 10), getSharedMaterial('water'));
    wat.position.y = 0.33;
    g.add(jar, wat);
  }
  return g;
}

/**
 * Nhân vật NPC mini (Nông dân, Thợ rèn, Lính gác đi tuần)
 */
export function createNpcGroup(role: 'farmer' | 'smith' | 'guard'): THREE.Group {
  const g = new THREE.Group();
  const bodyColor =
    role === 'farmer' ? 'earth' : role === 'smith' ? 'woodDark' : 'bannerLS';
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.36, 8), getSharedMaterial(bodyColor));
  body.position.y = 0.18;
  body.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), getSharedMaterial('skin'));
  head.position.y = 0.42;
  g.add(body, head);

  if (role === 'farmer') {
    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.1, 8), getSharedMaterial('thatch'));
    hat.position.y = 0.5;
    g.add(hat);
  } else if (role === 'smith') {
    const hammer = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.08), getSharedMaterial('iron'));
    hammer.position.set(0.16, 0.3, 0.1);
    g.add(hammer);
  } else {
    const helm = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.12, 8), getSharedMaterial('iron'));
    helm.position.y = 0.5;
    const spear = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.72, 6), getSharedMaterial('wood'));
    spear.position.set(0.14, 0.36, 0.06);
    g.add(helm, spear);
  }
  return g;
}

function getUnitParts(
  unitType: RegionCombatUnit['unitType']
): Array<{ matKey: 'body' | 'armor' | 'wood' | 'iron' | 'gold' | 'skin'; geo: THREE.BufferGeometry }> {
  const hit = cachedUnitPartGeometries.get(unitType);
  if (hit) return hit;

  const buckets = new Map<'body' | 'armor' | 'wood' | 'iron' | 'gold' | 'skin', THREE.BufferGeometry[]>();
  const push = (m: 'body' | 'armor' | 'wood' | 'iron' | 'gold' | 'skin', g: THREE.BufferGeometry) => {
    const arr = buckets.get(m);
    if (arr) arr.push(g);
    else buckets.set(m, [g]);
  };

  if (unitType === 'elephant') {
    push('skin', box(0.65, 0.56, 0.92, 0, 0.52, 0));
    for (const [lx, lz] of [[-0.22, 0.3], [0.22, 0.3], [-0.22, -0.3], [0.22, -0.3]]) {
      push('skin', cyl(0.11, 0.12, 0.38, 8, lx, 0.19, lz));
    }
    push('skin', box(0.42, 0.38, 0.36, 0, 0.68, 0.54));
    push('skin', cyl(0.07, 0.04, 0.42, 6, 0, 0.48, 0.78));
    push('gold', cone(0.045, 0.35, 6, -0.14, 0.55, 0.78));
    push('gold', cone(0.045, 0.35, 6, 0.14, 0.55, 0.78));
    push('body', box(0.5, 0.32, 0.52, 0, 0.94, -0.02));
    push('armor', cone(0.38, 0.25, 4, 0, 1.22, -0.02, Math.PI / 4));
  } else if (unitType === 'cavalry') {
    push('wood', box(0.34, 0.32, 0.76, 0, 0.42, 0));
    for (const [lx, lz] of [[-0.12, 0.26], [0.12, 0.26], [-0.12, -0.26], [0.12, -0.26]]) {
      push('wood', cyl(0.04, 0.045, 0.32, 6, lx, 0.16, lz));
    }
    push('wood', box(0.18, 0.24, 0.26, 0, 0.66, 0.42));
    push('body', cyl(0.12, 0.15, 0.42, 8, 0, 0.74, -0.04));
    push('armor', cone(0.14, 0.2, 8, 0, 1.02, -0.04));
    push('iron', cyl(0.022, 0.022, 1.05, 6, 0.2, 0.85, 0.28));
  } else {
    push('body', cyl(0.14, 0.18, 0.44, 8, 0, 0.28, 0));
    push('skin', cyl(0.09, 0.09, 0.16, 8, 0, 0.56, 0));
    push('armor', cone(0.15, 0.16, 8, 0, 0.68, 0));
    if (unitType === 'swordsman') {
      push('iron', box(0.04, 0.4, 0.07, 0.2, 0.42, 0.14));
      push('wood', box(0.06, 0.32, 0.22, -0.18, 0.36, 0.1));
    } else if (unitType === 'spearman') {
      push('wood', cyl(0.02, 0.02, 0.95, 6, 0.16, 0.55, 0.16));
      push('iron', cone(0.04, 0.16, 6, 0.16, 1.06, 0.16));
    } else if (unitType === 'archer') {
      push('wood', box(0.05, 0.42, 0.08, 0.14, 0.4, 0.22));
    }
  }

  const result: Array<{ matKey: 'body' | 'armor' | 'wood' | 'iron' | 'gold' | 'skin'; geo: THREE.BufferGeometry }> = [];
  for (const [matKey, geos] of buckets.entries()) {
    result.push({ matKey, geo: safeMerge(geos) });
  }
  cachedUnitPartGeometries.set(unitType, result);
  return result;
}

export function createUnitGroup(
  unitType: RegionCombatUnit['unitType'],
  faction: 'lam_son' | 'ming'
): THREE.Group {
  const parts = getUnitParts(unitType);
  const group = new THREE.Group();

  const bodyMat = getSharedMaterial(faction === 'lam_son' ? 'bannerLS' : 'bannerMing');
  const armorMat = getSharedMaterial(faction === 'lam_son' ? 'gold' : 'iron');
  const woodMat = getSharedMaterial('wood');
  const ironMat = getSharedMaterial('iron');
  const goldMat = getSharedMaterial('gold');
  const skinMat = getSharedMaterial(unitType === 'elephant' ? 'stoneDark' : 'plaster');

  for (const p of parts) {
    const mat =
      p.matKey === 'body'
        ? bodyMat
        : p.matKey === 'armor'
        ? armorMat
        : p.matKey === 'wood'
        ? woodMat
        : p.matKey === 'iron'
        ? ironMat
        : p.matKey === 'gold'
        ? goldMat
        : skinMat;
    const mesh = new THREE.Mesh(p.geo, mat);
    mesh.castShadow = true;
    group.add(mesh);
  }

  return group;
}
