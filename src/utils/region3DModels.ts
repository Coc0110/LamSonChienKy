import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { BaseBuilding, BaseBuildingType, RegionCombatUnit } from '../types/region';

export const DIORAMA_PALETTE = {
  ground: 0x679445,
  groundAlt: 0x578038,
  cliff: 0x7c6548,
  earth: 0x9b7e56,
  earthDark: 0x755c3c,
  wood: 0x875935,
  woodDark: 0x52341d,
  woodLight: 0xa27147,
  woodWarm: 0x6e4225,
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
  | 'stoneWarm'
  | 'stonePale'
  | 'stoneMoss'
  | 'earth'
  | 'earthDark'
  | 'wood'
  | 'woodDark'
  | 'woodLight'
  | 'woodWarm'
  | 'bamboo'
  | 'bambooDry'
  | 'plaster'
  | 'thatch'
  | 'thatchDark'
  | 'thatchWarm'
  | 'thatchSoft'
  | 'roofRed'
  | 'roofBlue'
  | 'gold'
  | 'iron'
  | 'steel'
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

let woodGrainTexCache: Map<string, THREE.CanvasTexture> | null = null;
function getWoodGrainTexture(baseHex: string, grainHex: string): THREE.CanvasTexture {
  if (!woodGrainTexCache) woodGrainTexCache = new Map();
  const key = `${baseHex}_${grainHex}`;
  const hit = woodGrainTexCache.get(key);
  if (hit) return hit;

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = baseHex;
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = grainHex;
    for (let i = 0; i < 32; i++) {
      const x = (i * 4) + (i % 3);
      ctx.lineWidth = (i % 3 === 0) ? 1.8 : 0.9;
      ctx.globalAlpha = 0.25 + (i % 4) * 0.1;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.bezierCurveTo(x + Math.sin(i) * 4, 42, x - Math.cos(i) * 4, 86, x, 128);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = grainHex;
    ctx.beginPath();
    ctx.ellipse(64, 52, 6, 14, 0.1, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  woodGrainTexCache.set(key, tex);
  return tex;
}

const stoneTexCache = new Map<string, THREE.CanvasTexture>();
function getStoneTexture(baseHex: string, speckHex: string): THREE.CanvasTexture {
  const key = `${baseHex}_${speckHex}`;
  const hit = stoneTexCache.get(key);
  if (hit) return hit;

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = baseHex;
    ctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 220; i++) {
      const rx = ((Math.sin(i * 17.13) * 43758.54) % 1 + 1) % 1;
      const ry = ((Math.sin(i * 63.71) * 43758.54) % 1 + 1) % 1;
      const r = 1.5 + (i % 5);
      ctx.fillStyle = i % 7 === 0 ? 'rgba(92, 114, 62, 0.28)' : speckHex;
      ctx.globalAlpha = 0.22 + (i % 4) * 0.08;
      ctx.beginPath();
      ctx.arc(rx * 128, ry * 128, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  stoneTexCache.set(key, tex);
  return tex;
}

let cachedBambooTex: THREE.CanvasTexture | null = null;
function getBambooCulmTexture(): THREE.CanvasTexture {
  if (cachedBambooTex) return cachedBambooTex;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#73913b';
    ctx.fillRect(0, 0, 128, 256);

    // Thớ tre dọc tự nhiên
    for (let i = 0; i < 40; i++) {
      const x = i * 3.2;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(54, 78, 24, 0.22)' : 'rgba(155, 186, 84, 0.16)';
      ctx.fillRect(x, 0, 1.5, 256);
    }

    // Một vệt mắt tre duy nhất ở biên v = 0 / 1 (khi lặp UV theo số đốt sẽ khớp 100% vị trí gờ nhô)
    ctx.fillStyle = 'rgba(40, 56, 16, 0.58)';
    ctx.fillRect(0, 0, 128, 12);
    ctx.fillRect(0, 244, 128, 12);
    ctx.fillStyle = 'rgba(182, 206, 120, 0.45)';
    ctx.fillRect(0, 12, 128, 4);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  cachedBambooTex = tex;
  return tex;
}

function getSharedMaterial(key: MaterialKey, transparent = false, opacity = 1): THREE.MeshStandardMaterial {
  const cacheKey = `${key}_${transparent ? 't' : 'o'}_${opacity}`;
  const hit = cachedMaterials.get(cacheKey);
  if (hit) return hit;

  let mat: THREE.MeshStandardMaterial;
  switch (key) {
    case 'stone':
      mat = new THREE.MeshStandardMaterial({
        map: getStoneTexture('#8d9198', '#686d75'),
        roughness: 0.9,
      });
      break;
    case 'stoneDark':
      mat = new THREE.MeshStandardMaterial({
        map: getStoneTexture('#646870', '#45484f'),
        roughness: 0.93,
      });
      break;
    case 'stoneWarm':
      mat = new THREE.MeshStandardMaterial({
        map: getStoneTexture('#777c84', '#565a61'),
        roughness: 0.91,
      });
      break;
    case 'stonePale':
      mat = new THREE.MeshStandardMaterial({
        map: getStoneTexture('#a2a6ac', '#7a7f87'),
        roughness: 0.89,
      });
      break;
    case 'stoneMoss':
      mat = new THREE.MeshStandardMaterial({
        map: getStoneTexture('#838890', '#60656d'),
        roughness: 0.9,
      });
      break;
    case 'earth':
      mat = new THREE.MeshStandardMaterial({
        map: getStoneTexture('#9b7e56', '#745937'),
        roughness: 0.95,
      });
      break;
    case 'earthDark':
      mat = new THREE.MeshStandardMaterial({
        map: getStoneTexture('#755c3c', '#523e26'),
        roughness: 0.96,
      });
      break;
    case 'wood':
      mat = new THREE.MeshStandardMaterial({
        map: getWoodGrainTexture('#8c5d38', '#543318'),
        roughness: 0.84,
      });
      break;
    case 'woodDark':
      mat = new THREE.MeshStandardMaterial({
        map: getWoodGrainTexture('#583720', '#2e1a0d'),
        roughness: 0.88,
      });
      break;
    case 'woodLight':
      mat = new THREE.MeshStandardMaterial({
        map: getWoodGrainTexture('#a9784c', '#6e4726'),
        roughness: 0.82,
      });
      break;
    case 'woodWarm':
      mat = new THREE.MeshStandardMaterial({
        map: getWoodGrainTexture('#724426', '#3d210f'),
        roughness: 0.86,
      });
      break;
    case 'bamboo': {
      mat = new THREE.MeshStandardMaterial({ map: getBambooCulmTexture(), roughness: 0.65 });
      break;
    }
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
    case 'thatchWarm':
      mat = new THREE.MeshStandardMaterial({ color: 0xcba85d, roughness: 0.92 });
      break;
    case 'thatchSoft':
      mat = new THREE.MeshStandardMaterial({ color: 0xddbd73, roughness: 0.91 });
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
    case 'steel':
      mat = new THREE.MeshStandardMaterial({ color: 0xcfd6de, roughness: 0.28, metalness: 0.72 });
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
  canvas.width = 256;
  canvas.height = 176;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 256, 176);
    // Quai treo cờ trên thanh ngang
    ctx.fillStyle = '#d97706';
    for (const lx of [28, 72, 116, 160, 204]) {
      ctx.fillRect(lx, 0, 10, 16);
    }

    // Thân cờ đuôi nheo
    ctx.beginPath();
    ctx.moveTo(8, 14);
    ctx.lineTo(246, 14);
    ctx.lineTo(206, 92);
    ctx.lineTo(246, 168);
    ctx.lineTo(8, 168);
    ctx.closePath();
    ctx.fillStyle = isEnemy ? '#1e3a8a' : '#a81c1c';
    ctx.fill();

    ctx.lineWidth = 7;
    ctx.strokeStyle = '#eab308';
    ctx.stroke();

    // Khung chữ nhật vàng bên trong giống ảnh mẫu
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 4;
    ctx.strokeRect(24, 30, 152, 122);

    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 78px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(isEnemy ? '明' : 'Lê', 100, 94);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    alphaTest: 0.2,
    roughness: 0.58,
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
  const nonIndexed = parts.map((g) => {
    const ni = g.index ? g.toNonIndexed() : g;
    if (!ni.getAttribute('normal')) ni.computeVertexNormals();
    if (!ni.getAttribute('uv')) {
      const count = ni.getAttribute('position').count;
      ni.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(count * 2), 2));
    }
    return ni;
  });
  const merged = BufferGeometryUtils.mergeGeometries(nonIndexed, false);
  return merged || nonIndexed[0];
}

function rbox(
  w: number,
  h: number,
  d: number,
  radius: number,
  x: number,
  y: number,
  z: number
): THREE.BufferGeometry {
  const g = new RoundedBoxGeometry(w, h, d, 2, radius);
  g.translate(x, y, z);
  return g;
}

function torus(
  r: number,
  tubeRadius: number,
  radialSeg: number,
  tubularSeg: number
): THREE.BufferGeometry {
  return new THREE.TorusGeometry(r, tubeRadius, radialSeg, tubularSeg);
}

function extrudeGableTriangle(width: number, height: number, depth: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(width / 2, 0);
  shape.lineTo(0, height);
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.025,
    bevelSize: 0.02,
    bevelSegments: 2,
  });
  g.center();
  return g;
}

function extrudeCurvedHorn(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.045, -0.34);
  shape.quadraticCurveTo(-0.08, 0.05, -0.02, 0.42);
  shape.lineTo(0.055, 0.39);
  shape.quadraticCurveTo(0.02, 0.05, 0.045, -0.34);
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: 0.08,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.015,
    bevelSegments: 2,
  });
  g.center();
  return g;
}

function createBraidedRidgeTube(length: number, phaseOffset: number): THREE.BufferGeometry {
  const pts: THREE.Vector3[] = [];
  const steps = 28;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = -length / 2 + t * length;
    const angle = t * Math.PI * 10 + phaseOffset;
    const y = Math.sin(angle) * 0.045;
    const z = Math.cos(angle) * 0.045;
    pts.push(new THREE.Vector3(x, y, z));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  return new THREE.TubeGeometry(curve, 36, 0.075, 7, false);
}

function createDrumBarrelLathe(): THREE.BufferGeometry {
  const pts = [
    new THREE.Vector2(0.0, -0.32),
    new THREE.Vector2(0.27, -0.31),
    new THREE.Vector2(0.35, -0.15),
    new THREE.Vector2(0.38, 0.0),
    new THREE.Vector2(0.35, 0.15),
    new THREE.Vector2(0.27, 0.31),
    new THREE.Vector2(0.0, 0.32),
  ];
  return new THREE.LatheGeometry(pts, 18);
}

function createTorchFlameLathe(): THREE.BufferGeometry {
  const pts = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.075, 0.04),
    new THREE.Vector2(0.085, 0.09),
    new THREE.Vector2(0.04, 0.16),
    new THREE.Vector2(0.0, 0.22),
  ];
  return new THREE.LatheGeometry(pts, 10);
}

function createStonePlinthLathe(): THREE.BufferGeometry {
  const pts = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.2, 0.0),
    new THREE.Vector2(0.18, 0.08),
    new THREE.Vector2(0.13, 0.16),
    new THREE.Vector2(0.0, 0.16),
  ];
  return new THREE.LatheGeometry(pts, 8);
}

/**
 * Tạo gò đất nện tự nhiên (dốc thoải tự nhiên, mép uốn lượn, mặt đất lồi lõm nhẹ như đất đầm thật)
 */
function createOrganicEarthMound(width: number, depth: number, height: number, seed: number): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(width, height, depth, 14, 3, 14);
  const pos = g.getAttribute('position');
  const hw = width / 2;
  const hd = depth / 2;
  const hh = height / 2;

  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);

    const ty = (y + hh) / Math.max(0.001, height); // 0 (đáy) .. 1 (mặt trên)
    const rx = Math.abs(x) / hw;
    const rz = Math.abs(z) / hd;
    const edge = Math.max(rx, rz);

    // Dốc thoải tự nhiên thu hẹp nhẹ về phía mặt trên
    const slopeShrink = 1 - ty * 0.055 * Math.max(0, edge - 0.65) * 2.8;
    const ang = Math.atan2(z, x);
    const rimWave = (Math.sin(ang * 5 + seed) * 0.055 + Math.cos(ang * 9 - seed * 1.4) * 0.03) * edge;

    x = x * slopeShrink + Math.cos(ang) * rimWave;
    z = z * slopeShrink + Math.sin(ang) * rimWave;

    // Mặt trên lồi lõm nhẹ tự nhiên (tránh phẳng lì)
    if (y > hh * 0.45) {
      const undulate =
        Math.sin(x * 2.3 + seed) * Math.cos(z * 2.1 - seed * 0.7) * 0.016 +
        Math.sin((x + z) * 4.5 + seed * 1.3) * 0.007;
      // Bo thoải nhẹ ở sát mép gò đất
      const edgeDrop = edge > 0.86 ? -((edge - 0.86) / 0.14) * height * 0.22 : 0;
      y = hh + undulate + edgeDrop;
    }

    pos.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  g.translate(0, hh, 0);
  return g;
}

/**
 * Tảng đá tự nhiên mài mòn (IcosahedronGeometry bậc 2 + biến dạng nhiễu mượt, không góc cạnh thô)
 */
export function createNaturalBoulder(radius: number, seed: number): THREE.BufferGeometry {
  const g = new THREE.IcosahedronGeometry(radius, 2);
  const pos = g.getAttribute('position');

  // 3 mặt cắt phong hóa bất đối xứng giúp đá có mặt phẳng gãy tự nhiên xen lẫn cạnh tròn
  const planes = [
    new THREE.Vector3(Math.sin(seed * 1.3), 0.7, Math.cos(seed * 1.3)).normalize(),
    new THREE.Vector3(Math.cos(seed * 2.1), -0.35, Math.sin(seed * 2.1)).normalize(),
    new THREE.Vector3(-Math.sin(seed * 3.4), 0.25, Math.cos(seed * 1.9)).normalize(),
  ];

  const sx = 0.85 + Math.abs(Math.sin(seed * 1.7)) * 0.45;
  const sy = 0.58 + Math.abs(Math.cos(seed * 2.3)) * 0.35;
  const sz = 0.85 + Math.abs(Math.sin(seed * 2.9)) * 0.45;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const len = Math.hypot(x, y, z) || 1;
    const nx = x / len;
    const ny = y / len;
    const nz = z / len;

    let disp = 1 + Math.sin(nx * 3.7 + seed) * Math.cos(nz * 3.3 - seed) * 0.14;
    for (let p = 0; p < planes.length; p++) {
      const dot = nx * planes[p].x + ny * planes[p].y + nz * planes[p].z;
      const limit = 0.62 + (p * 0.08);
      if (dot > limit) {
        disp -= (dot - limit) * 0.42;
      }
    }

    let fx = x * disp * sx;
    let fy = y * disp * sy;
    let fz = z * disp * sz;

    if (fy < -radius * 0.24) {
      fy = -radius * 0.24 + (fy + radius * 0.24) * 0.2;
    }

    pos.setXYZ(i, fx, fy, fz);
  }
  g.computeVertexNormals();
  return g;
}

/**
 * Khối đá tự nhiên đa giác méo (crazy-paving) chia sẻ cạnh chung với viên kế bên:
 * - Không vuông vức (góc xiên & cạnh gãy khúc ngẫu nhiên)
 * - Khớp khít 100% không hở lỗ tam giác
 * - Mặt trên có lồi lõm nhẹ tự nhiên
 */
function createCrazyPavingStone(
  cornersXZ: [[number, number], [number, number], [number, number], [number, number]],
  height: number,
  seed: number
): THREE.BufferGeometry {
  const edgeHash = (ax: number, az: number, bx: number, bz: number, salt: number) => {
    // Đảm bảo cạnh (A->B) và (B->A) cho cùng 1 độ lệch tại tâm cạnh
    const k1 = Math.round(ax * 100) * 73856093 + Math.round(az * 100) * 19349663;
    const k2 = Math.round(bx * 100) * 73856093 + Math.round(bz * 100) * 19349663;
    const sym = (k1 + k2) ^ (Math.min(k1, k2) * 31);
    const v = Math.sin(sym * 0.0001 + salt) * 43758.5453;
    return v - Math.floor(v);
  };

  // Xây dựng đa giác 12 đỉnh từ 4 góc + 2 điểm gãy trên mỗi cạnh
  const rawPts: Array<[number, number]> = [];
  for (let i = 0; i < 4; i++) {
    const [ax, az] = cornersXZ[i];
    const [bx, bz] = cornersXZ[(i + 1) % 4];
    rawPts.push([ax, az]);

    const ex = bx - ax;
    const ez = bz - az;
    const len = Math.hypot(ex, ez) || 1;
    const nx = -ez / len;
    const nz = ex / len;
    // Điểm gãy 1/3 và 2/3 cạnh (đối xứng theo hướng cạnh)
    const dirSign = ax < bx || (ax === bx && az < bz) ? 1 : -1;
    const off1 = (edgeHash(ax, az, bx, bz, 1.7) - 0.5) * 0.036 * dirSign;
    const off2 = (edgeHash(ax, az, bx, bz, 5.3) - 0.5) * 0.036 * dirSign;
    const p1t = dirSign > 0 ? 0.34 : 0.66;
    const p2t = dirSign > 0 ? 0.66 : 0.34;
    if (dirSign > 0) {
      rawPts.push([ax + ex * p1t + nx * off1, az + ez * p1t + nz * off1]);
      rawPts.push([ax + ex * p2t + nx * off2, az + ez * p2t + nz * off2]);
    } else {
      rawPts.push([ax + ex * 0.34 + nx * off2, az + ez * 0.34 + nz * off2]);
      rawPts.push([ax + ex * 0.66 + nx * off1, az + ez * 0.66 + nz * off1]);
    }
  }

  // Tính tâm & thu vào 9mm tạo khe hở mảnh tự nhiên
  let cx = 0;
  let cz = 0;
  for (const [px, pz] of rawPts) {
    cx += px;
    cz += pz;
  }
  cx /= rawPts.length;
  cz /= rawPts.length;

  const shape = new THREE.Shape();
  for (let i = 0; i < rawPts.length; i++) {
    const [px, pz] = rawPts[i];
    const dx = px - cx;
    const dz = pz - cz;
    const d = Math.hypot(dx, dz) || 1;
    const inset = Math.max(0.05, d - 0.009) / d;
    // Shape dùng (x, -z) để khi rotateX(-PI/2) khớp đúng (x, +z)
    const sx = cx + dx * inset;
    const sy = -(cz + dz * inset);
    if (i === 0) shape.moveTo(sx, sy);
    else shape.lineTo(sx, sy);
  }
  shape.closePath();

  const g = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    steps: 3,
    bevelEnabled: true,
    bevelThickness: Math.min(0.026, height * 0.3),
    bevelSize: 0.011,
    bevelSegments: 2,
  });
  g.rotateX(-Math.PI / 2);

  // Làm mặt trên và cạnh bên lồi lõm ngẫu nhiên theo từng viên (không dùng sóng sin lặp hoa văn)
  const pos = g.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const y = pos.getY(i);
    const vz = pos.getZ(i);
    if (y > height * 0.72) {
      const n1 = Math.sin((vx - cx) * (8.5 + (seed % 5)) + seed * 1.9);
      const n2 = Math.cos((vz - cz) * (9.2 + (seed % 4)) - seed * 2.3);
      const bump = n1 * n2 * 0.012;
      pos.setY(i, y + bump);
    } else if (y > 0.015) {
      const dx = vx - cx;
      const dz = vz - cz;
      const d = Math.hypot(dx, dz) || 1;
      const ang = Math.atan2(dz, dx);
      const yBand = Math.round(y * 40);
      const hVal = Math.sin(ang * 3.7 + yBand * 17.3 + seed * 5.1) * 43758.5453;
      const rnd = (hVal - Math.floor(hVal)) - 0.5;
      const sideBump = rnd * 0.018;
      pos.setX(i, vx + (dx / d) * sideBump);
      pos.setZ(i, vz + (dz / d) * sideBump);
    }
  }
  g.computeVertexNormals();
  return g;
}

/**
 * Phiến đá tự nhiên (lát sân / bậc tam cấp) với mép lượn hữu cơ thay vì hình chữ nhật
 */
function createNaturalFlagstone(width: number, height: number, depth: number, seed: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const pts = 10;
  const hw = width / 2;
  const hd = depth / 2;
  for (let i = 0; i < pts; i++) {
    const a = (i / pts) * Math.PI * 2;
    const rMod = 0.88 + Math.sin(i * 2.7 + seed) * 0.11 + Math.cos(i * 4.3 + seed) * 0.06;
    const px = Math.cos(a) * hw * rMod;
    const py = Math.sin(a) * hd * rMod;
    if (i === 0) shape.moveTo(px, py);
    else shape.lineTo(px, py);
  }
  shape.closePath();

  const g = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: true,
    bevelThickness: Math.min(0.025, height * 0.3),
    bevelSize: 0.022,
    bevelSegments: 2,
  });
  g.rotateX(-Math.PI / 2);
  return g;
}

/**
 * Thân tre đúc liền khối bằng LatheGeometry (thon dần lên ngọn, mắt tre nổi rõ tự nhiên)
 */
function createBambooCulmLathe(radius: number, height: number, nodes: number): THREE.BufferGeometry {
  const pts: THREE.Vector2[] = [];
  const steps = Math.max(12, (nodes + 1) * 7);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const y = t * height;
    const taper = 1 - t * 0.16;
    let nodeOffset = 0;
    for (let n = 1; n <= nodes; n++) {
      const nt = n / (nodes + 1);
      const d = t - nt;
      if (Math.abs(d) < 0.032) {
        if (d < 0) {
          nodeOffset = -radius * 0.07 * (1 + d / 0.032);
        } else {
          nodeOffset = radius * 0.28 * (1 - d / 0.032);
        }
      }
    }
    pts.push(new THREE.Vector2(Math.max(0.006, radius * taper + nodeOffset), y));
  }
  const geo = new THREE.LatheGeometry(pts, 10);
  // Đồng bộ UV.y theo (nodes + 1) để vệt mắt tre trên texture khớp 100% vào vị trí gờ nhô
  const pos = geo.getAttribute('position');
  const uv = geo.getAttribute('uv');
  for (let i = 0; i < pos.count; i++) {
    const t = Math.min(1, Math.max(0, pos.getY(i) / Math.max(0.001, height)));
    uv.setY(i, t * (nodes + 1));
  }
  uv.needsUpdate = true;
  return geo;
}

/**
 * Đầu cọc tre vạt chéo rỗng ruột (không phải cọc gỗ đặc)
 */
function createSlicedHollowBambooTip(radius: number): {
  outerGreen: THREE.BufferGeometry;
  innerWall: THREE.BufferGeometry;
  hollowCore: THREE.BufferGeometry;
} {
  const outerR = radius * 0.86;
  const innerR = outerR * 0.62;
  const cutH = outerR * 3.2;

  // Vỏ tre ngoài vạt chéo 45 độ
  const outerGreen = new THREE.CylinderGeometry(outerR, outerR, cutH, 10, 1, true);
  const posOut = outerGreen.getAttribute('position');
  for (let i = 0; i < posOut.count; i++) {
    const y = posOut.getY(i);
    if (y > 0) {
      const z = posOut.getZ(i);
      const slice = ((z + outerR) / (2 * outerR)) * cutH * 0.72;
      posOut.setY(i, y - slice);
    }
  }
  outerGreen.computeVertexNormals();
  outerGreen.translate(0, cutH / 2, 0);

  // Vách trong tre màu vàng ngà lộ ra khi vạt chéo
  const innerWall = new THREE.CylinderGeometry(innerR, innerR, cutH * 0.96, 10, 1, true);
  const posIn = innerWall.getAttribute('position');
  for (let i = 0; i < posIn.count; i++) {
    const y = posIn.getY(i);
    if (y > 0) {
      const z = posIn.getZ(i);
      const slice = ((z + innerR) / (2 * innerR)) * cutH * 0.7;
      posIn.setY(i, y - slice);
    }
  }
  innerWall.computeVertexNormals();
  innerWall.translate(0, cutH / 2, 0);

  // Lõi rỗng tối màu bên trong ống tre
  const hollowCore = new THREE.CylinderGeometry(innerR * 0.92, innerR * 0.92, cutH * 0.25, 8);
  hollowCore.translate(0, cutH * 0.14, 0);

  return { outerGreen, innerWall, hollowCore };
}

/**
 * Cụm lá tre gồm nhiều phiến lá thon dài nhọn đầu rủ tự nhiên
 */
function createBambooLeafSprayGeo(): THREE.BufferGeometry {
  const blades: THREE.BufferGeometry[] = [];
  const count = 6;
  for (let i = 0; i < count; i++) {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.quadraticCurveTo(0.035, 0.14, 0.012, 0.34);
    shape.lineTo(0, 0.42);
    shape.lineTo(-0.012, 0.34);
    shape.quadraticCurveTo(-0.035, 0.14, 0, 0);

    const blade = new THREE.ShapeGeometry(shape, 4);
    const angleY = (i / count) * Math.PI * 2 + (i % 2) * 0.25;
    const droop = 0.72 + (i % 3) * 0.16;
    blade.rotateX(droop);
    blade.rotateY(angleY);
    blades.push(blade);
  }
  return safeMerge(blades);
}

function hash01(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Tán tranh chi tiết (bó lá tranh thuôn xòe có nhiều răng sợi tranh mịn)
 */
function createThatchBundle(width: number, length: number, thickness: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const hw = width / 2;
  const hl = length / 2;
  shape.moveTo(-hw * 0.68, hl);
  shape.lineTo(hw * 0.68, hl);
  shape.lineTo(hw, -hl);
  const teeth = 7;
  for (let i = teeth; i >= 0; i--) {
    const x = -hw + (width * i) / teeth;
    const jag = i % 2 === 0 ? -0.065 : 0.028;
    shape.lineTo(x, -hl + jag);
  }
  shape.closePath();

  const g = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.01,
    bevelSegments: 1,
  });
  g.center();
  g.rotateX(-Math.PI / 2);
  return g;
}

/**
 * Mũi giáo lá liễu sắc nhọn (ExtrudeGeometry)
 */
function extrudeSpearHead(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.quadraticCurveTo(0.055, 0.08, 0.025, 0.16);
  shape.lineTo(0, 0.28);
  shape.lineTo(-0.025, 0.16);
  shape.quadraticCurveTo(-0.055, 0.08, 0, 0);
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: 0.016,
    bevelEnabled: true,
    bevelThickness: 0.006,
    bevelSize: 0.005,
    bevelSegments: 1,
  });
  g.center();
  return g;
}

/**
 * Lưỡi đại đao / kích có ngạnh móc phía sau
 */
function extrudeDetailedHalberd(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.02);
  shape.lineTo(0.02, 0.34);
  shape.quadraticCurveTo(0.16, 0.24, 0.13, 0.05);
  shape.quadraticCurveTo(0.06, 0.08, 0.02, 0.02);
  // Ngạnh móc nhỏ phía lưng
  shape.lineTo(-0.06, 0.12);
  shape.lineTo(-0.01, 0.16);
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: 0.018,
    bevelEnabled: true,
    bevelThickness: 0.006,
    bevelSize: 0.005,
    bevelSegments: 1,
  });
  g.center();
  return g;
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
      const addBambooPole = (
        r: number,
        h: number,
        nodes: number,
        bx: number,
        byBase: number,
        bz: number,
        withTip = false
      ) => {
        const culm = createBambooCulmLathe(r, h, nodes);
        culm.translate(bx, byBase, bz);
        push('bamboo', culm);
        if (withTip) {
          const tip = createSlicedHollowBambooTip(r);
          tip.outerGreen.translate(bx, byBase + h, bz);
          tip.innerWall.translate(bx, byBase + h, bz);
          tip.hollowCore.translate(bx, byBase + h, bz);
          push('bamboo', tip.outerGreen);
          push('bambooDry', tip.innerWall);
          push('earthDark', tip.hollowCore);
        }
      };

      // === 1. LỚP MÓNG ĐÁ TỰ NHIÊN (ĐA GIÁC MÉO KHÍT NHAU KIỂU CRAZY-PAVING, KHÔNG VUÔNG VỨC) ===
      const stoneTones: MaterialKey[] = ['stone', 'stoneDark', 'stoneWarm', 'stonePale', 'stoneMoss'];
      const mixHash = (n: number): number => {
        let h = (Math.floor(n * 1000) ^ 0x9e3779b9) >>> 0;
        h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
        h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
        return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
      };
      const pickStone = (seed: number): MaterialKey =>
        stoneTones[Math.floor(mixHash(seed) * stoneTones.length) % stoneTones.length];

      // Lưới đỉnh chia sẻ kích thước không đều (có viên to viên nhỏ, biên độ lệch vừa phải)
      const buildNonUniformAxis = (minVal: number, maxVal: number, seedBase: number) => {
        const coords = [minVal];
        let cur = minVal;
        let k = 0;
        while (cur < maxVal - 0.34) {
          const step = 0.24 + mixHash(seedBase + k * 19.3) * 0.22;
          cur = Math.min(maxVal, cur + step);
          coords.push(cur);
          k++;
        }
        if (coords[coords.length - 1] < maxVal - 0.05) {
          coords[coords.length - 1] = maxVal;
        }
        return coords;
      };

      const xLeft = buildNonUniformAxis(-2.42, -0.54, 31);
      const xRight = buildNonUniformAxis(0.54, 2.42, 61);
      const xAxis = [...xLeft, -0.18, 0.18, ...xRight];
      const zAxis = buildNonUniformAxis(-2.42, 2.42, 97);
      const nx = xAxis.length - 1;
      const nz = zAxis.length - 1;

      const vLattice: Array<Array<[number, number]>> = [];
      for (let rz = 0; rz <= nz; rz++) {
        const rowPts: Array<[number, number]> = [];
        for (let cx = 0; cx <= nx; cx++) {
          const bx = xAxis[cx];
          const bz = zAxis[rz];
          const s = rz * 131 + cx * 37;
          const isStairEdge = rz >= nz - 1 && (Math.abs(bx - -0.54) < 0.01 || Math.abs(bx - 0.54) < 0.01);
          const jx = isStairEdge ? 0 : (mixHash(s + 1.3) - 0.5) * 0.1;
          const jz = (mixHash(s + 4.9) - 0.5) * 0.1;
          rowPts.push([bx + jx, bz + jz]);
        }
        vLattice.push(rowPts);
      }

      const usedCell: boolean[][] = Array.from({ length: nz }, () => Array(nx).fill(false));

      for (let rz = 0; rz < nz; rz++) {
        for (let cx = 0; cx < nx; cx++) {
          if (usedCell[rz][cx]) continue;
          const isRim = rz === 0 || rz === nz - 1 || cx === 0 || cx === nx - 1;
          const isSecondBand = rz === 1 || rz === nz - 2 || cx === 1 || cx === nx - 2;
          if (!isRim && !isSecondBand) continue;

          const cellMidX = (xAxis[cx] + xAxis[cx + 1]) / 2;
          if (rz === nz - 1 && cellMidX > -0.53 && cellMidX < 0.53) {
            usedCell[rz][cx] = true;
            continue;
          }

          const seed = rz * 197 + cx * 43.1;
          let cxEnd = cx + 1;
          let rzEnd = rz + 1;

          // Gộp ngẫu nhiên ~28% ô liền kề cùng vành (không gộp xuyên qua mép cầu thang)
          const mergeRoll = mixHash(seed + 15.1);
          const nextCellMidX = cx + 1 < nx ? (xAxis[cx + 1] + xAxis[cx + 2]) / 2 : 99;
          const crossStairBoundary = rz === nz - 1 && Math.abs(nextCellMidX) < 0.53;
          if (
            !crossStairBoundary &&
            mergeRoll < 0.18 &&
            cx + 1 < nx &&
            !usedCell[rz][cx + 1] &&
            ((rz === 0 || rz === nz - 1) || (cx > 0 && cx + 1 < nx - 1))
          ) {
            cxEnd = cx + 2;
            usedCell[rz][cx + 1] = true;
          } else if (
            mergeRoll >= 0.18 &&
            mergeRoll < 0.3 &&
            rz + 1 < nz &&
            !usedCell[rz + 1][cx] &&
            ((cx === 0 || cx === nx - 1) || (rz > 0 && rz + 1 < nz - 1))
          ) {
            rzEnd = rz + 2;
            usedCell[rz + 1][cx] = true;
          }
          usedCell[rz][cx] = true;

          const pTL = vLattice[rz][cx];
          const pTR = vLattice[rz][cxEnd];
          const pBR = vLattice[rzEnd][cxEnd];
          const pBL = vLattice[rzEnd][cx];

          const h = isRim
            ? 0.14 + mixHash(seed + 2) * 0.045
            : 0.08 + mixHash(seed + 2) * 0.03;
          const baseY = isRim ? 0.04 : 0.12;

          const stoneGeo = createCrazyPavingStone([pTL, pBL, pBR, pTR], h, seed);
          stoneGeo.translate(0, baseY, 0);
          push(pickStone(seed + 8.3), stoneGeo);
        }
      }

      // Nền đất nện tầng 2 ở bên trong
      const moundTop = createOrganicEarthMound(3.75, 3.75, 0.16, 4.7);
      moundTop.translate(0, 0.21, 0);
      push('earth', moundTop);

      // Bậc tam cấp trước ghép từ các phiến đá đa giác méo khít nhau
      for (let st = 0; st < 3; st++) {
        const yStep = 0.06 + st * 0.11;
        const zBack = 2.54 - st * 0.22;
        const zFront = zBack + 0.22;
        const xs = [-0.54, -0.18 + (mixHash(st * 11) - 0.5) * 0.08, 0.18 + (mixHash(st * 23) - 0.5) * 0.08, 0.54];
        for (let subIdx = 0; subIdx < 3; subIdx++) {
          const sSeed = st * 41 + subIdx * 17 + 3;
          const xL = xs[subIdx];
          const xR = xs[subIdx + 1];
          const j1 = (mixHash(sSeed + 1) - 0.5) * 0.05;
          const j2 = (mixHash(sSeed + 2) - 0.5) * 0.05;
          const stepGeo = createCrazyPavingStone(
            [
              [xL, zBack + j1],
              [xL, zFront + j2],
              [xR, zFront - j1],
              [xR, zBack - j2],
            ],
            0.075,
            sSeed
          );
          stepGeo.translate(0, yStep, 0);
          push(pickStone(sSeed + 5.3), stepGeo);
        }
      }
      // Lối lát đá nhỏ dẫn vào chân cầu thang
      for (const [idx, [px, pz, pw, pd, rot]] of ([
        [-0.2, 2.1, 0.34, 0.24, 0.08],
        [0.18, 2.08, 0.32, 0.22, -0.07],
        [-0.02, 1.84, 0.38, 0.22, 0.05],
        [-0.18, 1.6, 0.32, 0.2, -0.09],
        [0.16, 1.58, 0.3, 0.2, 0.08],
        [0.0, 1.38, 0.36, 0.19, -0.04],
      ] as const).entries()) {
        const slab = createNaturalFlagstone(pw, 0.045, pd, idx * 6.3 + 2.1);
        slab.rotateY(rot);
        slab.translate(px, 0.36, pz);
        push(pickStone(idx * 19.7 + 4.2), slab);
      }

      // === 2. HÀNG RÀO TRE CÓ ĐỐT TRE RÕ RỆT + DÂY MÂY + ĐUỐC LỬA ===
      const addBambooRow = (x1: number, z1: number, x2: number, z2: number, count: number) => {
        for (let i = 0; i < count; i++) {
          const t = count === 1 ? 0.5 : i / (count - 1);
          const bx = x1 + (x2 - x1) * t;
          const bz = z1 + (z2 - z1) * t;
          const rnd = hash01(i * 19.7 + x1 * 3.1 + z1 * 5.7);
          const h = 0.66 + (rnd - 0.5) * 0.065; // Cắm sâu từ y = 0.14 xuống nền đá, không bay lơ lửng
          addBambooPole(0.033, h, 3, bx, 0.14, bz, true);
        }
        const len = Math.hypot(x2 - x1, z2 - z1);
        const mx = (x1 + x2) / 2;
        const mz = (z1 + z2) / 2;
        const isHoriz = Math.abs(x2 - x1) >= Math.abs(z2 - z1);
        for (const ry of [0.38, 0.62]) {
          push('bambooDry', cyl(0.024, 0.024, len + 0.06, 6, 0, 0, 0)
            .rotateZ(isHoriz ? Math.PI / 2 : 0)
            .rotateX(isHoriz ? 0 : Math.PI / 2)
            .translate(mx, ry, mz));
        }
      };
      addBambooRow(-2.2, 2.22, -0.58, 2.22, 16);
      addBambooRow(0.58, 2.22, 2.2, 2.22, 16);
      addBambooRow(-2.22, -2.2, -2.22, 2.2, 34);
      addBambooRow(2.22, -2.2, 2.22, 2.2, 34);
      addBambooRow(-2.2, -2.22, 2.2, -2.22, 34);

      for (const tx of [-0.52, 0.52]) {
        push('woodDark', cyl(0.042, 0.052, 0.88, 7, tx, 0.58, 2.24));
        push('iron', torus(0.065, 0.018, 6, 10).rotateX(Math.PI / 2).translate(tx, 1.01, 2.24));
        const flame = createTorchFlameLathe();
        flame.translate(tx, 1.02, 2.24);
        push('ember', flame);
      }

      // === 3. NHÀ SÀN GỖ: TƯỜNG GHÉP TỪ NHIỀU MIẾNG GỖ CÓ VÂN & MÀU SẮC KHÁC NHAU ===
      for (const cx of [-1.52, -0.5, 0.5, 1.52]) {
        for (const cz of [-1.45, -0.35, 0.68]) {
          const plinth = createStonePlinthLathe();
          plinth.translate(cx, 0.38, cz);
          push('stoneDark', plinth);
          push('woodDark', cyl(0.085, 0.095, 0.68, 8, cx, 0.86, cz));
        }
      }
      push('woodDark', rbox(3.52, 0.11, 2.65, 0.025, 0, 1.18, -0.4));
      // Sàn ghép từng thanh ván gỗ dài ngắn & màu sắc ngẫu nhiên
      const woodTones: MaterialKey[] = ['wood', 'woodLight', 'woodWarm', 'woodDark'];
      const pickWood = (seed: number): MaterialKey =>
        woodTones[Math.floor(hash01(seed) * woodTones.length) % woodTones.length];

      for (let p = 0; p < 12; p++) {
        const pz = -1.72 + p * 0.23;
        const split = hash01(p * 7.3 + 1.1) > 0.4;
        if (split) {
          const splitX = -0.7 + hash01(p * 3.9) * 1.4;
          const wL = splitX + 1.81;
          const wR = 1.81 - splitX;
          push(pickWood(p * 11 + 1), rbox(wL - 0.02, 0.075, 0.21, 0.01, -1.81 + wL / 2, 1.26, pz));
          push(pickWood(p * 17 + 3), rbox(wR - 0.02, 0.075, 0.21, 0.01, 1.81 - wR / 2, 1.26, pz));
        } else {
          push(pickWood(p * 13 + 5), rbox(3.62, 0.075, 0.21, 0.01, 0, 1.26, pz));
        }
      }

      push('woodDark', rbox(1.18, 0.06, 0.075, 0.015, -1.18, 1.58, 0.94));
      push('woodDark', rbox(1.18, 0.06, 0.075, 0.015, 1.18, 1.58, 0.94));
      for (const rx of [-1.72, -1.35, -0.98, -0.62, 0.62, 0.98, 1.35, 1.72]) {
        push('woodWarm', cyl(0.03, 0.03, 0.3, 6, rx, 1.44, 0.94));
      }

      for (let s = 0; s < 5; s++) {
        push(woodTones[s % 3], rbox(0.86, 0.07, 0.18, 0.015, 0, 0.46 + s * 0.16, 1.58 - s * 0.14));
      }
      for (const hx of [-0.46, 0.46]) {
        const stringer = rbox(0.07, 0.09, 1.08, 0.015, 0, 0, 0);
        stringer.rotateX(Math.PI / 4);
        stringer.translate(hx, 0.85, 1.28);
        push('woodDark', stringer);

        const handrail = rbox(0.06, 0.06, 1.05, 0.015, 0, 0, 0);
        handrail.rotateX(Math.PI / 4);
        handrail.translate(hx, 1.14, 1.28);
        push('woodWarm', handrail);

        push('woodDark', cyl(0.035, 0.035, 0.34, 6, hx, 0.66, 1.62));
        push('woodDark', cyl(0.035, 0.035, 0.34, 6, hx, 1.44, 0.94));
      }

      // Tường gỗ ghép từng miếng ván dài ngắn khác nhau, màu sắc phân bổ ngẫu nhiên
      const addRandomPlankColumn = (
        px: number,
        pz: number,
        totalH: number,
        baseY: number,
        w: number,
        d: number,
        seed: number
      ) => {
        const r = hash01(seed);
        if (r < 0.35) {
          // 1 thanh dài nguyên tấm
          push(pickWood(seed + 1.7), box(w, totalH, d, px, baseY, pz));
        } else if (r < 0.72) {
          // 2 thanh dài/ngắn ghép nối
          const ratio = 0.35 + hash01(seed + 2.9) * 0.3;
          const h1 = totalH * ratio;
          const h2 = totalH - h1;
          push(pickWood(seed + 3.1), box(w, h1 - 0.012, d, px, baseY - totalH / 2 + h1 / 2, pz));
          push(pickWood(seed + 5.7), box(w, h2 - 0.012, d, px, baseY + totalH / 2 - h2 / 2, pz));
        } else {
          // 3 thanh ngắn ghép xen kẽ
          const h1 = totalH * (0.25 + hash01(seed + 4.1) * 0.15);
          const h2 = totalH * (0.25 + hash01(seed + 6.3) * 0.15);
          const h3 = totalH - h1 - h2;
          const yBot = baseY - totalH / 2;
          push(pickWood(seed + 7.1), box(w, h1 - 0.012, d, px, yBot + h1 / 2, pz));
          push(pickWood(seed + 8.3), box(w, h2 - 0.012, d, px, yBot + h1 + h2 / 2, pz));
          push(pickWood(seed + 9.7), box(w, h3 - 0.012, d, px, yBot + h1 + h2 + h3 / 2, pz));
        }
      };

      const frontPlankCount = 18;
      for (let i = 0; i < frontPlankCount; i++) {
        const px = -1.5 + i * (3.0 / (frontPlankCount - 1));
        const inDoor = Math.abs(px) < 0.36;
        const inWin = Math.abs(Math.abs(px) - 1.02) < 0.24;
        const pzOff = (hash01(i * 4.3) - 0.5) * 0.028;
        const pw = 0.145 + hash01(i * 9.1) * 0.025;
        if (inDoor) {
          addRandomPlankColumn(px, 0.28 + pzOff, 0.22, 2.16, pw, 0.08, i * 11 + 1);
        } else if (inWin) {
          addRandomPlankColumn(px, 0.28 + pzOff, 0.32, 1.46, pw, 0.08, i * 11 + 2);
          addRandomPlankColumn(px, 0.28 + pzOff, 0.22, 2.16, pw, 0.08, i * 11 + 3);
        } else {
          addRandomPlankColumn(px, 0.28 + pzOff, 0.96, 1.78, pw, 0.08, i * 11 + 4);
        }
        // Tường sau
        addRandomPlankColumn(px, -1.44 - pzOff, 0.96, 1.78, pw, 0.08, i * 13 + 9);
      }

      // Tường 2 bên hông ghép miếng gỗ dài ngắn & màu ngẫu nhiên
      const sidePlankCount = 10;
      for (let i = 0; i < sidePlankCount; i++) {
        const pz = -1.36 + i * (1.56 / (sidePlankCount - 1));
        const inSideWin = Math.abs(pz + 0.58) < 0.26;
        const pd = 0.145 + hash01(i * 6.7) * 0.025;
        for (const sx of [-1.56, 1.56]) {
          const pxOff = (hash01(i * 5.1 + sx) - 0.5) * 0.028;
          const seed = i * 19 + (sx > 0 ? 7 : 3);
          if (inSideWin) {
            addRandomPlankColumn(sx + pxOff, pz, 0.32, 1.46, 0.08, pd, seed + 1);
            addRandomPlankColumn(sx + pxOff, pz, 0.22, 2.16, 0.08, pd, seed + 2);
          } else {
            addRandomPlankColumn(sx + pxOff, pz, 0.96, 1.78, 0.08, pd, seed + 3);
          }
        }
      }

      // Cột góc & dầm khung nhà gỗ tối
      for (const px of [-1.54, -0.52, 0.52, 1.54]) {
        push('woodDark', rbox(0.11, 0.98, 0.1, 0.02, px, 1.78, 0.32));
      }
      // Cửa chính 2 cánh gỗ ghép (trái/phải khác vân nhẹ) + vòng đồng Torus
      push('woodWarm', rbox(0.37, 0.78, 0.08, 0.015, -0.2, 1.68, 0.32));
      push('woodDark', rbox(0.37, 0.78, 0.08, 0.015, 0.2, 1.68, 0.32));
      push('gold', torus(0.048, 0.014, 6, 12).translate(-0.1, 1.68, 0.38));
      push('gold', torus(0.048, 0.014, 6, 12).translate(0.1, 1.68, 0.38));

      // Cửa sổ khung tre có đốt tre + cánh liếp chống lên
      for (const wx of [-1.02, 1.02]) {
        push('bamboo', rbox(0.58, 0.46, 0.075, 0.015, wx, 1.82, 0.32));
        push('earthDark', box(0.46, 0.36, 0.08, wx, 1.82, 0.32));
        for (const bx of [-0.15, -0.05, 0.05, 0.15]) {
          addBambooPole(0.016, 0.36, 2, wx + bx, 1.64, 0.355);
        }
        const shutter = rbox(0.52, 0.045, 0.36, 0.01, 0, 0, 0);
        shutter.rotateX(-0.55);
        shutter.translate(wx, 2.02, 0.52);
        push('thatch', shutter);
      }
      for (const sx of [-1.58, 1.58]) {
        push('bamboo', rbox(0.075, 0.44, 0.66, 0.015, sx, 1.82, -0.58));
        push('earthDark', box(0.08, 0.34, 0.54, sx, 1.82, -0.58));
        for (const bz of [-0.18, -0.06, 0.06, 0.18]) {
          addBambooPole(0.016, 0.34, 2, sx + (sx > 0 ? 0.03 : -0.03), 1.65, -0.58 + bz);
        }
      }

      // === 4. MÁI LÁ TRANH LỢP TỪ RẤT NHIỀU TÁN TRANH & SỢI TRANH ===
      for (const gx of [-1.52, 1.52]) {
        const gable = extrudeGableTriangle(1.9, 1.08, 0.08);
        gable.rotateY(Math.PI / 2);
        gable.translate(gx, 2.78, -0.58);
        push('woodWarm', gable);
      }

      const roofSlope = 0.62;
      const thatchTones: MaterialKey[] = ['thatch', 'thatchWarm', 'thatchSoft'];
      const pickThatch = (seed: number): MaterialKey =>
        thatchTones[Math.floor(hash01(seed) * thatchTones.length) % thatchTones.length];

      // Lợp từng tán tranh dày dặn (5 hàng x 15 tán mỗi mặt mái, màu gần giống nhau & phân bổ ngẫu nhiên)
      for (let layer = 0; layer < 5; layer++) {
        const t = layer / 4;
        const yPos = 2.32 + t * 0.92;
        const zOff = 0.98 - t * 0.74;
        const cols = 15;
        const totalW = 3.76 - t * 0.12;
        const bundleW = totalW / cols + 0.04;

        for (let c = 0; c < cols; c++) {
          const seedF = layer * 101 + c * 17.3;
          const seedB = layer * 137 + c * 23.1;
          const bx = -totalW / 2 + (c + 0.5) * (totalW / cols) + (hash01(seedF) - 0.5) * 0.03;
          const staggerY = (hash01(seedF + 1) - 0.5) * 0.025;
          const tiltZ = (hash01(seedF + 2) - 0.5) * 0.07;
          const lenScale = 0.92 + hash01(seedF + 3) * 0.18;

          const bundleF = createThatchBundle(bundleW, 0.48 * lenScale, 0.07);
          bundleF.rotateZ(tiltZ);
          bundleF.rotateX(roofSlope);
          bundleF.translate(bx, yPos + staggerY, -0.58 + zOff);
          push(pickThatch(seedF + 5), bundleF);

          const bundleB = createThatchBundle(bundleW, 0.48 * lenScale, 0.07);
          bundleB.rotateY(Math.PI);
          bundleB.rotateZ(-tiltZ);
          bundleB.rotateX(-roofSlope);
          bundleB.translate(bx, yPos + staggerY, -0.58 - zOff);
          push(pickThatch(seedB + 7), bundleB);

          // Nhiều sợi tranh mảnh nhô ra ở mép mỗi tán tranh
          for (let f = 0; f < 3; f++) {
            const fiberOff = -0.09 + f * 0.09 + (hash01(seedF + f * 9) - 0.5) * 0.03;
            const fLen = 0.18 + hash01(seedF + f * 13) * 0.1;
            const fF = cyl(0.006, 0.012, fLen, 4, 0, 0, 0);
            fF.rotateX(roofSlope + Math.PI / 2 - 0.12);
            fF.rotateZ(fiberOff * 1.6);
            fF.translate(bx + fiberOff, yPos - 0.12, -0.58 + zOff + 0.21);
            push(pickThatch(seedF + f * 3), fF);

            const fB = cyl(0.006, 0.012, fLen, 4, 0, 0, 0);
            fB.rotateX(-roofSlope - Math.PI / 2 + 0.12);
            fB.rotateZ(-fiberOff * 1.6);
            fB.translate(bx + fiberOff, yPos - 0.12, -0.58 - zOff - 0.21);
            push(pickThatch(seedB + f * 3), fB);
          }
        }
      }

      // Sống nóc bện rơm TubeGeometry xoắn kép + Sừng nóc cong
      const braidA = createBraidedRidgeTube(3.3, 0);
      braidA.translate(0, 3.36, -0.58);
      const braidB = createBraidedRidgeTube(3.3, Math.PI);
      braidB.translate(0, 3.36, -0.58);
      push('thatchDark', braidA);
      push('thatch', braidB);

      for (const hx of [-1.62, 1.62]) {
        const h1 = extrudeCurvedHorn();
        h1.rotateY(Math.PI / 2);
        h1.rotateX(0.55);
        h1.translate(hx, 3.56, -0.58);
        const h2 = extrudeCurvedHorn();
        h2.rotateY(-Math.PI / 2);
        h2.rotateX(-0.55);
        h2.translate(hx, 3.56, -0.58);
        push('woodDark', h1);
        push('woodDark', h2);
      }

      // === 5. TRỐNG TRẬN ĐỎ BO CONG (LatheGeometry + Torus đồng vàng) ===
      for (const gz of [1.14, 1.48]) {
        const l1 = rbox(0.07, 0.72, 0.07, 0.015, 0, 0, 0);
        l1.rotateZ(0.55);
        l1.translate(-1.3, 0.64, gz);
        const l2 = rbox(0.07, 0.72, 0.07, 0.015, 0, 0, 0);
        l2.rotateZ(-0.55);
        l2.translate(-1.3, 0.64, gz);
        push('woodDark', l1);
        push('woodDark', l2);
      }
      const barrel = createDrumBarrelLathe();
      barrel.rotateZ(Math.PI / 2);
      barrel.rotateY(-0.35);
      barrel.translate(-1.3, 0.94, 1.31);
      push(bannerMat, barrel);

      const drumSkin = cyl(0.275, 0.275, 0.64, 16, 0, 0, 0);
      drumSkin.rotateZ(Math.PI / 2);
      drumSkin.rotateY(-0.35);
      drumSkin.translate(-1.3, 0.94, 1.31);
      push('plaster', drumSkin);

      for (const rimOff of [-0.26, 0.26]) {
        const ring = torus(0.3, 0.022, 7, 16);
        ring.rotateY(Math.PI / 2 - 0.35);
        ring.translate(-1.3 + Math.cos(-0.35) * rimOff, 0.94, 1.31 - Math.sin(-0.35) * rimOff);
        push('gold', ring);
      }

      for (const dz of [1.66, 1.78]) {
        const stick = cyl(0.018, 0.018, 0.36, 6, 0, 0, 0);
        stick.rotateZ(Math.PI / 2);
        stick.translate(-1.05, 0.4, dz);
        push('wood', stick);
        push(bannerMat, sphere(0.04, -1.24, 0.41, dz));
      }

      // === 6. GIÁ BINH KHÍ CHI TIẾT: GIÁO LÁ LIỄU + ĐẠI ĐAO CÓ NGẠNH + KHÂU ĐỒNG + TUA ĐỎ ===
      push('woodDark', rbox(1.16, 0.06, 0.08, 0.015, 1.28, 0.88, 1.32));
      push('woodDark', rbox(1.16, 0.06, 0.08, 0.015, 1.28, 0.56, 1.32));
      for (const rx of [0.76, 1.8]) {
        const legF = rbox(0.06, 0.66, 0.06, 0.01, 0, 0, 0);
        legF.rotateX(-0.22);
        legF.translate(rx, 0.68, 1.4);
        const legB = rbox(0.06, 0.66, 0.06, 0.01, 0, 0, 0);
        legB.rotateX(0.22);
        legB.translate(rx, 0.68, 1.24);
        push('woodDark', legF);
        push('woodDark', legB);
      }
      for (const [wx, isHalberd] of [[0.9, false], [1.14, true], [1.38, true], [1.62, false]] as const) {
        // Cán gỗ thuôn + đốc kim loại + khâu đồng + tua đỏ + lưỡi thép sáng
        push('woodWarm', cyl(0.018, 0.025, 1.14, 7, wx, 0.94, 1.32));
        push('steel', cone(0.024, 0.08, 6, wx, 0.35, 1.32).rotateX(Math.PI));
        push('gold', cyl(0.028, 0.028, 0.05, 8, wx, 1.5, 1.32));
        push(bannerMat, cone(0.045, 0.14, 7, wx, 1.43, 1.32));
        if (isHalberd) {
          const blade = extrudeDetailedHalberd();
          blade.rotateY(Math.PI / 2);
          blade.translate(wx, 1.66, 1.34);
          push('steel', blade);
        } else {
          const spearHead = extrudeSpearHead();
          spearHead.translate(wx, 1.65, 1.32);
          push('steel', spearHead);
        }
      }
      const rattanShield = cyl(0.26, 0.26, 0.05, 16, 0, 0, 0);
      rattanShield.rotateX(Math.PI / 2 - 0.25);
      rattanShield.translate(1.48, 0.62, 1.52);
      push('bambooDry', rattanShield);
      push('woodDark', sphere(0.055, 1.48, 0.62, 1.55));

      // === 7. CỘT CỜ KHỞI NGHĨA ("LÊ") CÓ ĐỐT TRE RÕ RỆT ===
      push('stoneDark', rbox(0.46, 0.16, 0.46, 0.03, -1.85, 0.46, 1.65));
      push('stone', rbox(0.32, 0.18, 0.32, 0.03, -1.85, 0.62, 1.65));
      addBambooPole(0.062, 2.75, 6, -1.85, 0.68, 1.65);
      push('gold', sphere(0.095, -1.85, 3.46, 1.65));
      const crossbar = cyl(0.028, 0.032, 1.28, 6, 0, 0, 0);
      crossbar.rotateZ(Math.PI / 2);
      crossbar.translate(-1.25, 3.28, 1.65);
      push('bambooDry', crossbar);
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

  // Gắn lá cờ lệnh khởi nghĩa uốn lượn nhẹ trong gió thêu chữ "Lê" (hoặc "明")
  if (type === 'main_hall') {
    const flagGeo = new THREE.PlaneGeometry(1.22, 0.84, 12, 4);
    const pos = flagGeo.getAttribute('position');
    for (let i = 0; i < pos.count; i++) {
      const fx = pos.getX(i);
      const t = (fx + 0.61) / 1.22;
      pos.setZ(i, Math.sin(t * Math.PI * 2.2) * 0.065 * t);
    }
    flagGeo.computeVertexNormals();
    const flagMat = getFlagBannerMaterial(isEnemy);
    const flagMesh = new THREE.Mesh(flagGeo, flagMat);
    flagMesh.position.set(-1.24, 2.86, 1.65);
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

const bambooLeafDoubleMatMid = new THREE.MeshStandardMaterial({
  color: DIORAMA_PALETTE.leafMid,
  roughness: 0.78,
  side: THREE.DoubleSide,
});
const bambooLeafDoubleMatBright = new THREE.MeshStandardMaterial({
  color: DIORAMA_PALETTE.leafBright,
  roughness: 0.76,
  side: THREE.DoubleSide,
});
const bambooCulmTexMat = new THREE.MeshStandardMaterial({
  map: getBambooCulmTexture(),
  roughness: 0.64,
});

let cachedBambooLeafSprayGeo: THREE.BufferGeometry | null = null;

export function createVietnameseTree(kind: VietnameseTreeKind): THREE.Group {
  const group = new THREE.Group();

  if (kind === 'bamboo') {
    // Bụi tre Việt Nam tự nhiên: 9 thân tre cong tỏa ra từ gốc + cành nhánh + tán lá tre thon nhọn
    if (!cachedBambooLeafSprayGeo) {
      cachedBambooLeafSprayGeo = createBambooLeafSprayGeo();
    }
    const culms = [
      [0.0, 0.0, 2.25, 0.04, 0.02],
      [-0.14, 0.1, 2.05, -0.18, 0.12],
      [0.16, -0.08, 2.1, 0.2, -0.14],
      [-0.08, -0.16, 1.85, -0.12, -0.22],
      [0.12, 0.16, 1.92, 0.16, 0.2],
      [-0.22, -0.02, 1.65, -0.28, -0.05],
      [0.22, 0.05, 1.72, 0.26, 0.08],
      [0.02, -0.22, 1.55, 0.04, -0.26],
      [-0.04, 0.22, 1.6, -0.06, 0.26],
    ];

    for (let idx = 0; idx < culms.length; idx++) {
      const [ox, oz, h, bendX, bendZ] = culms[idx];
      const stalkGeo = createBambooCulmLathe(0.038, h, 5);
      // Uốn cong thân tre mượt mà theo chiều cao
      const pos = stalkGeo.getAttribute('position');
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        const t = y / h;
        const curve = t * t;
        pos.setX(i, pos.getX(i) + bendX * curve);
        pos.setZ(i, pos.getZ(i) + bendZ * curve);
      }
      stalkGeo.computeVertexNormals();

      const stalkMesh = new THREE.Mesh(stalkGeo, bambooCulmTexMat);
      stalkMesh.position.set(ox, 0, oz);
      stalkMesh.castShadow = true;
      group.add(stalkMesh);

      // Cành nhánh & chùm lá tre thon nhọn ở nửa trên thân cây
      for (let b = 0; b < 3; b++) {
        const bt = 0.58 + b * 0.19;
        const by = h * bt;
        const bx = ox + bendX * bt * bt;
        const bz = oz + bendZ * bt * bt;
        const bAngle = idx * 1.9 + b * 2.2;
        const dx = Math.cos(bAngle) * 0.24;
        const dz = Math.sin(bAngle) * 0.24;

        const twig = new THREE.Mesh(
          new THREE.CylinderGeometry(0.008, 0.013, 0.3, 5),
          bambooCulmTexMat
        );
        twig.position.set(bx + dx * 0.5, by + 0.08, bz + dz * 0.5);
        twig.rotation.z = -Math.cos(bAngle) * 0.65;
        twig.rotation.x = Math.sin(bAngle) * 0.65;
        group.add(twig);

        const spray = new THREE.Mesh(
          cachedBambooLeafSprayGeo,
          (idx + b) % 2 === 0 ? bambooLeafDoubleMatBright : bambooLeafDoubleMatMid
        );
        spray.position.set(bx + dx, by + 0.16, bz + dz);
        spray.rotation.y = bAngle;
        spray.castShadow = true;
        group.add(spray);
      }
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
