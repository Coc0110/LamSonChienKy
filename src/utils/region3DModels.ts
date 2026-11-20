import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { BaseBuildingType, RegionCombatUnit } from '../types/region';

export const DIORAMA_PALETTE = {
  ground: 0x6f994a,
  groundAlt: 0x638a40,
  cliff: 0x8b7355,
  cliffDark: 0x6e5a42,
  road: 0xc9b896,
  wood: 0x855836,
  woodDark: 0x563822,
  plaster: 0xf0e4ce,
  thatch: 0xd9b86c,
  tileRed: 0xb33b2e,
  tileBlue: 0x35587c,
  stone: 0x92969c,
  stoneDark: 0x6c7078,
  gold: 0xe6b83a,
  iron: 0x3f454e,
  ember: 0xff6a1a,
  water: 0x4ca6c8,
  crop: 0x9bc44b,
  leaf: 0x4e8243,
  leafLight: 0x689f54,
  lamSonBanner: 0xd12e2a,
  mingBanner: 0x26538d,
};

type MaterialKey =
  | 'stone'
  | 'stoneDark'
  | 'wood'
  | 'woodDark'
  | 'plaster'
  | 'thatch'
  | 'roofRed'
  | 'roofBlue'
  | 'gold'
  | 'iron'
  | 'ember'
  | 'water'
  | 'crop'
  | 'bannerLS'
  | 'bannerMing'
  | 'targetWhite';

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
    case 'wood':
      mat = new THREE.MeshStandardMaterial({ color: DIORAMA_PALETTE.wood, roughness: 0.82 });
      break;
    case 'woodDark':
      mat = new THREE.MeshStandardMaterial({ color: DIORAMA_PALETTE.woodDark, roughness: 0.86 });
      break;
    case 'plaster':
      mat = new THREE.MeshStandardMaterial({ color: DIORAMA_PALETTE.plaster, roughness: 0.78 });
      break;
    case 'thatch':
      mat = new THREE.MeshStandardMaterial({ color: DIORAMA_PALETTE.thatch, roughness: 0.9 });
      break;
    case 'roofRed':
      mat = new THREE.MeshStandardMaterial({ color: DIORAMA_PALETTE.tileRed, roughness: 0.65 });
      break;
    case 'roofBlue':
      mat = new THREE.MeshStandardMaterial({ color: DIORAMA_PALETTE.tileBlue, roughness: 0.65 });
      break;
    case 'gold':
      mat = new THREE.MeshStandardMaterial({ color: DIORAMA_PALETTE.gold, roughness: 0.35, metalness: 0.55 });
      break;
    case 'iron':
      mat = new THREE.MeshStandardMaterial({ color: DIORAMA_PALETTE.iron, roughness: 0.45, metalness: 0.6 });
      break;
    case 'ember':
      mat = new THREE.MeshStandardMaterial({
        color: DIORAMA_PALETTE.ember,
        emissive: 0xff4500,
        emissiveIntensity: 0.85,
        roughness: 0.4,
      });
      break;
    case 'water':
      mat = new THREE.MeshStandardMaterial({ color: DIORAMA_PALETTE.water, roughness: 0.25, metalness: 0.15 });
      break;
    case 'crop':
      mat = new THREE.MeshStandardMaterial({ color: DIORAMA_PALETTE.crop, roughness: 0.88 });
      break;
    case 'bannerLS':
      mat = new THREE.MeshStandardMaterial({ color: DIORAMA_PALETTE.lamSonBanner, roughness: 0.7 });
      break;
    case 'bannerMing':
      mat = new THREE.MeshStandardMaterial({ color: DIORAMA_PALETTE.mingBanner, roughness: 0.7 });
      break;
    case 'targetWhite':
      mat = new THREE.MeshStandardMaterial({ color: 0xfafaf9, roughness: 0.75 });
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

function getBuildingParts(
  type: BaseBuildingType,
  level: number,
  isEnemy: boolean
): Array<{ matKey: MaterialKey; geo: THREE.BufferGeometry }> {
  const tier = Math.min(5, Math.max(1, level));
  const key = `${type}_${tier}_${isEnemy ? 'e' : 'p'}`;
  const hit = cachedPartGeometries.get(key);
  if (hit) return hit;

  const roofMat: MaterialKey = isEnemy ? 'roofBlue' : 'roofRed';
  const bannerMat: MaterialKey = isEnemy ? 'bannerMing' : 'bannerLS';

  const buckets = new Map<MaterialKey, THREE.BufferGeometry[]>();
  const push = (m: MaterialKey, g: THREE.BufferGeometry) => {
    const arr = buckets.get(m);
    if (arr) arr.push(g);
    else buckets.set(m, [g]);
  };

  switch (type) {
    case 'main_hall': {
      // Bậc đá 2 tầng + cột trụ + tường sáng + mái ngói 2-3 tầng + chóp vàng + cờ
      push('stone', box(2.8, 0.22, 2.8, 0, 0.11, 0));
      push('stoneDark', box(2.45, 0.16, 2.45, 0, 0.3, 0));
      push('plaster', box(1.9, 0.85, 1.75, 0, 0.8, 0));
      // 4 cột gỗ góc
      for (const sx of [-0.95, 0.95]) {
        for (const sz of [-0.88, 0.88]) {
          push('woodDark', cyl(0.08, 0.09, 0.9, 8, sx, 0.82, sz));
        }
      }
      // Cửa chính nẹp đồng
      push('wood', box(0.55, 0.62, 0.1, 0, 0.68, 0.88));
      push('gold', box(0.62, 0.08, 0.14, 0, 1.0, 0.88));
      // Mái tầng 1
      push(roofMat, cone(1.85, 0.68, 4, 0, 1.54, 0, Math.PI / 4));
      push('gold', box(2.2, 0.07, 2.2, 0, 1.22, 0));
      // Tầng 2
      push('plaster', box(1.25, 0.45, 1.15, 0, 1.85, 0));
      push(roofMat, cone(1.3, 0.58, 4, 0, 2.34, 0, Math.PI / 4));
      if (tier >= 3) {
        push(roofMat, cone(0.85, 0.44, 4, 0, 2.75, 0, Math.PI / 4));
      }
      // Đỉnh chóp vàng + cột cờ
      const topY = tier >= 3 ? 3.05 : 2.68;
      push('gold', cyl(0.06, 0.12, 0.22, 8, 0, topY, 0));
      push('woodDark', cyl(0.035, 0.04, 0.85, 6, 1.12, 1.1, 1.12));
      push(bannerMat, box(0.45, 0.28, 0.04, 1.35, 1.38, 1.12));
      break;
    }

    case 'farm': {
      // Nền đất + rãnh nước xanh + 3 luống lúa vàng/xanh + chòi rơm
      push('woodDark', box(2.8, 0.1, 2.8, 0, 0.05, 0));
      push('water', box(2.55, 0.08, 2.55, 0, 0.08, 0));
      for (let i = 0; i < 3; i++) {
        const z = -0.65 + i * 0.65;
        push('wood', box(1.5, 0.14, 0.42, 0.4, 0.14, z));
        push('crop', box(1.38, 0.14 + tier * 0.03, 0.32, 0.4, 0.24 + tier * 0.015, z));
      }
      // Chòi rơm góc
      push('wood', box(0.82, 0.52, 0.82, -0.78, 0.36, -0.78));
      push('thatch', cone(0.76, 0.5, 4, -0.78, 0.85, -0.78, Math.PI / 4));
      push('gold', cyl(0.18, 0.2, 0.24, 8, -0.78, 0.22, 0.35)); // Đống thóc
      break;
    }

    case 'forge': {
      // Nền đá + nhà xưởng + mái ngói tối + ống khói + miệng lò phát sáng + đe sắt
      push('stoneDark', box(1.82, 0.16, 1.82, 0, 0.08, 0));
      push('plaster', box(1.12, 0.64, 1.05, -0.22, 0.48, -0.1));
      push('woodDark', box(1.18, 0.12, 1.12, -0.22, 0.82, -0.1));
      push(roofMat, cone(0.98, 0.52, 4, -0.22, 1.1, -0.1, Math.PI / 4));
      // Lò nung & ống khói đá
      push('stone', cyl(0.22, 0.3, 0.95 + tier * 0.1, 8, 0.48, 0.58 + tier * 0.05, -0.4));
      push('ember', box(0.32, 0.26, 0.18, 0.48, 0.32, -0.18));
      // Đe sắt & giá rèn
      push('iron', box(0.34, 0.22, 0.2, 0.45, 0.27, 0.42));
      push('wood', cyl(0.12, 0.12, 0.16, 8, 0.45, 0.18, 0.42));
      break;
    }

    case 'food_storage': {
      // Kho lương sàn cao + cột gỗ + thân kho tròn/vuông + mái ngói/rơm + bao thóc
      push('stone', box(1.75, 0.14, 1.75, 0, 0.07, 0));
      for (const sx of [-0.55, 0.55]) {
        for (const sz of [-0.55, 0.55]) {
          push('woodDark', cyl(0.08, 0.09, 0.28, 6, sx, 0.26, sz));
        }
      }
      push('wood', box(1.32, 0.68 + tier * 0.06, 1.32, 0, 0.72 + tier * 0.03, 0));
      push('thatch', cone(1.18, 0.56, 4, 0, 1.32 + tier * 0.06, 0, Math.PI / 4));
      push('gold', box(0.45, 0.24, 0.32, 0, 0.26, 0.72));
      break;
    }

    case 'armory': {
      // Kho vũ khí đá kiên cố + lỗ châu mai + cửa sắt + giá khiên
      push('stoneDark', box(1.8, 0.18, 1.8, 0, 0.09, 0));
      push('stone', box(1.38, 0.78 + tier * 0.08, 1.24, 0, 0.57 + tier * 0.04, 0));
      push('iron', box(0.5, 0.56, 0.08, 0, 0.46, 0.64));
      push('stoneDark', box(1.48, 0.18, 1.34, 0, 1.04 + tier * 0.08, 0));
      push('gold', cyl(0.2, 0.2, 0.08, 10, -0.45, 0.42, 0.68));
      break;
    }

    case 'house': {
      // Nhà dân ấm cúng: nền đá, tường sáng, cửa gỗ, mái tranh/ngói
      push('stone', box(1.65, 0.1, 1.65, 0, 0.05, 0));
      push('plaster', box(1.12, 0.56, 1.0, 0, 0.38, 0));
      push('wood', box(0.32, 0.42, 0.08, 0, 0.31, 0.51));
      push('thatch', cone(0.95, 0.52, 4, 0, 0.91, 0, Math.PI / 4));
      push('stoneDark', box(0.2, 0.4, 0.2, 0.35, 0.95, -0.25));
      break;
    }

    case 'barracks': {
      // Sân tập đất nện + nhà chỉ huy + bia bắn cung + giá giáo + cờ
      push('wood', box(2.8, 0.1, 2.8, 0, 0.05, 0));
      push('plaster', box(1.85, 0.68, 1.02, 0, 0.44, -0.58));
      push(roofMat, cone(1.45, 0.56, 4, 0, 1.06, -0.58, Math.PI / 4));
      // Bia bắn cung
      push('woodDark', cyl(0.05, 0.06, 0.7, 6, -0.75, 0.42, 0.68));
      push('targetWhite', cyl(0.26, 0.26, 0.08, 12, -0.75, 0.62, 0.68));
      push(bannerMat, cyl(0.14, 0.14, 0.1, 12, -0.75, 0.62, 0.68));
      // Giá binh khí
      push('woodDark', box(0.8, 0.08, 0.12, 0.65, 0.52, 0.65));
      for (const ox of [0.4, 0.65, 0.9]) {
        push('iron', cyl(0.025, 0.025, 0.75, 6, ox, 0.45, 0.65));
      }
      // Cờ doanh trại
      push('woodDark', cyl(0.035, 0.04, 1.15, 6, 1.05, 0.65, -0.95));
      push(bannerMat, box(0.42, 0.26, 0.04, 1.26, 1.06, -0.95));
      break;
    }

    case 'wall': {
      // Tường đá có răng cưa châu mai (lên cấp đổi màu đá/nẹp vàng)
      const h = 0.68 + tier * 0.1;
      push(tier >= 3 ? 'stoneDark' : 'stone', box(0.94, h, 0.94, 0, h / 2, 0));
      push('stoneDark', box(0.98, 0.12, 0.98, 0, h + 0.06, 0));
      for (const cx of [-0.3, 0.3]) {
        for (const cz of [-0.3, 0.3]) {
          push(tier >= 4 ? 'gold' : 'stone', box(0.24, 0.18, 0.24, cx, h + 0.2, cz));
        }
      }
      break;
    }

    case 'gate': {
      const h = 1.08 + tier * 0.1;
      push('stone', box(0.46, h, 0.82, -0.72, h / 2, 0));
      push('stone', box(0.46, h, 0.82, 0.72, h / 2, 0));
      push('stoneDark', box(1.94, 0.28, 0.86, 0, h + 0.14, 0));
      push('woodDark', box(0.96, h * 0.72, 0.2, 0, (h * 0.72) / 2, 0));
      push('gold', box(0.98, 0.08, 0.24, 0, h * 0.42, 0));
      push(bannerMat, box(0.32, 0.2, 0.04, -0.72, h + 0.48, 0));
      push(bannerMat, box(0.32, 0.2, 0.04, 0.72, h + 0.48, 0));
      break;
    }

    case 'watchtower': {
      const towerH = 1.3 + tier * 0.16;
      push('stone', box(1.5, 0.22, 1.5, 0, 0.11, 0));
      push('woodDark', box(0.84, towerH, 0.84, 0, 0.22 + towerH / 2, 0));
      // Sàn gác + lan can
      const deckY = 0.22 + towerH + 0.1;
      push('wood', box(1.36, 0.18, 1.36, 0, deckY, 0));
      push('woodDark', box(1.4, 0.22, 0.1, 0, deckY + 0.18, 0.65));
      push('woodDark', box(1.4, 0.22, 0.1, 0, deckY + 0.18, -0.65));
      // 4 cột mái + chóp
      for (const sx of [-0.55, 0.55]) {
        for (const sz of [-0.55, 0.55]) {
          push('woodDark', cyl(0.05, 0.05, 0.58, 6, sx, deckY + 0.36, sz));
        }
      }
      push(roofMat, cone(1.08, 0.54, 4, 0, deckY + 0.86, 0, Math.PI / 4));
      push(bannerMat, box(0.35, 0.22, 0.04, 0.18, deckY + 1.24, 0));
      break;
    }

    case 'spike_trap': {
      push('woodDark', box(0.88, 0.07, 0.88, 0, 0.035, 0));
      const offsets = [
        [-0.25, -0.25],
        [0.25, -0.25],
        [-0.25, 0.25],
        [0.25, 0.25],
        [0, 0],
      ];
      for (const [ox, oz] of offsets) {
        push('wood', cone(0.08, 0.34 + tier * 0.04, 6, ox, 0.22, oz));
        push('iron', cone(0.05, 0.16, 6, ox, 0.42 + tier * 0.02, oz));
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
  isConstructing = false
): THREE.Group {
  const parts = getBuildingParts(type, level, isEnemy);
  const group = new THREE.Group();
  const opacity = isConstructing ? 0.62 : 1;

  for (const part of parts) {
    const mat = getSharedMaterial(part.matKey, isConstructing, opacity);
    const mesh = new THREE.Mesh(part.geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  return group;
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
    push('skin', box(0.42, 0.38, 0.36, 0, 0.68, 0.54)); // Đầu voi
    push('skin', cyl(0.07, 0.04, 0.42, 6, 0, 0.48, 0.78)); // Vòi
    push('gold', cone(0.045, 0.35, 6, -0.14, 0.55, 0.78)); // Ngà trái
    push('gold', cone(0.045, 0.35, 6, 0.14, 0.55, 0.78));  // Ngà phải
    push('body', box(0.5, 0.32, 0.52, 0, 0.94, -0.02));    // Bành voi
    push('armor', cone(0.38, 0.25, 4, 0, 1.22, -0.02, Math.PI / 4));
  } else if (unitType === 'cavalry') {
    push('wood', box(0.34, 0.32, 0.76, 0, 0.42, 0)); // Thân ngựa
    for (const [lx, lz] of [[-0.12, 0.26], [0.12, 0.26], [-0.12, -0.26], [0.12, -0.26]]) {
      push('wood', cyl(0.04, 0.045, 0.32, 6, lx, 0.16, lz));
    }
    push('wood', box(0.18, 0.24, 0.26, 0, 0.66, 0.42)); // Đầu ngựa
    push('body', cyl(0.12, 0.15, 0.42, 8, 0, 0.74, -0.04)); // Kỵ sĩ
    push('armor', cone(0.14, 0.2, 8, 0, 1.02, -0.04));
    push('iron', cyl(0.022, 0.022, 1.05, 6, 0.2, 0.85, 0.28)); // Thương dài
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
