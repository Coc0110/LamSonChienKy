import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import districtPolygonsJson from '../data/districtPolygons.json';
import {
  GRID_CELL_H_PCT,
  GRID_CELL_W_PCT,
  GRID_COLS,
  GRID_ROWS,
  coordToCell,
  getGridTerrain,
} from '../data/terrainGrid';
import type { TerrainType } from '../types/terrain';
import { getMeadowBumpTexture } from './region3DModels';

interface DistrictPolyData {
  id: string;
  name: string;
  polygon: [number, number][];
}

const DISTRICTS = (districtPolygonsJson as unknown as { districts: DistrictPolyData[] }).districts;

/** 1 2D terrain cell = 3 x 3 3D units. */
export const CELL_SCALE_3D = 3;

const MIN_PCT_X = 37.5;
const MAX_PCT_X = 71.0;
const MIN_PCT_Y = 42.0;
const MAX_PCT_Y = 56.0;

const TERRAIN_COLORS: Record<TerrainType, [number, number, number]> = {
  plains: [115, 145, 59],
  forest: [94, 126, 48],
  mountain: [104, 132, 54],
  cliff: [96, 120, 56],
  swamp: [78, 108, 62],
  water: [48, 94, 128],
};

const RIVER_BANK_COLOR: [number, number, number] = [106, 122, 68];
const RIVER_DEEP_COLOR: [number, number, number] = [44, 88, 122];

function pointInPolygon(x: number, y: number, poly: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0];
    const yi = poly[i][1];
    const xj = poly[j][0];
    const yj = poly[j][1];
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function isInsideThanhHoa(pctX: number, pctY: number): boolean {
  for (let i = 0; i < DISTRICTS.length; i++) {
    if (pointInPolygon(pctX, pctY, DISTRICTS[i].polygon)) return true;
  }
  return false;
}

function hash2D(c: number, r: number): number {
  const n = Math.sin(c * 127.1 + r * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function baseElevationForTerrain(t: TerrainType, c: number, r: number): number {
  const n = hash2D(c, r);
  switch (t) {
    case 'water':
      return -0.58;
    case 'swamp':
      return -0.14 + (n - 0.5) * 0.06;
    case 'plains':
      return 0.04 + n * 0.1;
    case 'forest':
      return 0.3 + n * 0.28;
    case 'mountain':
      return 2.1 + n * 2.2;
    case 'cliff':
      return 4.6 + n * 1.6;
  }
}

export function getThanhHoaElevationAtWorld(
  wx: number,
  wz: number,
  basePctX: number,
  basePctY: number,
): number {
  if (Math.abs(wx) < 16.2 && Math.abs(wz) < 16.2) return 0;
  const baseCell = coordToCell(basePctX, basePctY);
  const c = Math.max(0, Math.min(GRID_COLS - 1, baseCell.col + Math.round(wx / CELL_SCALE_3D)));
  const r = Math.max(0, Math.min(GRID_ROWS - 1, baseCell.row + Math.round(wz / CELL_SCALE_3D)));
  const pctX = (c + 0.5) * GRID_CELL_W_PCT;
  const pctY = (r + 0.5) * GRID_CELL_H_PCT;
  if (!isInsideThanhHoa(pctX, pctY)) return -1.45;
  return baseElevationForTerrain(getGridTerrain(c, r), c, r);
}

export function isThanhHoaBuildable(
  basePctX: number,
  basePctY: number,
  col: number,
  row: number,
  spanCols: number,
  spanRows: number,
  gridSize = 32,
): boolean {
  const half = gridSize / 2;
  const baseCell = coordToCell(basePctX, basePctY);
  const samplePoints: Array<[number, number]> = [
    [col + 0.5, row + 0.5],
    [col + spanCols - 0.5, row + 0.5],
    [col + 0.5, row + spanRows - 0.5],
    [col + spanCols - 0.5, row + spanRows - 0.5],
    [col + spanCols * 0.5, row + spanRows * 0.5],
  ];

  for (const [gx, gz] of samplePoints) {
    const wx = gx - half;
    const wz = gz - half;
    if (Math.abs(wx) < 16 && Math.abs(wz) < 16) continue;
    const c = Math.max(0, Math.min(GRID_COLS - 1, baseCell.col + Math.round(wx / CELL_SCALE_3D)));
    const r = Math.max(0, Math.min(GRID_ROWS - 1, baseCell.row + Math.round(wz / CELL_SCALE_3D)));
    const pctX = (c + 0.5) * GRID_CELL_W_PCT;
    const pctY = (r + 0.5) * GRID_CELL_H_PCT;
    if (!isInsideThanhHoa(pctX, pctY)) return false;
    if (getGridTerrain(c, r) === 'water') return false;
  }
  return true;
}

function createSmoothTerrainTexture(
  minCol: number,
  minRow: number,
  cols: number,
  rows: number,
  insideMask: Uint8Array,
): THREE.CanvasTexture {
  const pxPerCell = 8;
  const canvas = document.createElement('canvas');
  canvas.width = cols * pxPerCell;
  canvas.height = rows * pxPerCell;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    const fallback = new THREE.CanvasTexture(canvas);
    fallback.colorSpace = THREE.SRGBColorSpace;
    return fallback;
  }

  const rawWaterField = new Float32Array(cols * rows);
  const landR = new Float32Array(cols * rows);
  const landG = new Float32Array(cols * rows);
  const landB = new Float32Array(cols * rows);

  for (let iy = 0; iy < rows; iy++) {
    const r = Math.max(0, Math.min(GRID_ROWS - 1, minRow + iy));
    for (let ix = 0; ix < cols; ix++) {
      const c = Math.max(0, Math.min(GRID_COLS - 1, minCol + ix));
      const idx = iy * cols + ix;
      const inside = insideMask[idx] === 1;
      const t = getGridTerrain(c, r);
      const isWater = !inside || t === 'water';
      rawWaterField[idx] = isWater ? 1 : 0;
      const rgb = isWater ? TERRAIN_COLORS.plains : TERRAIN_COLORS[t];
      const jitter = (hash2D(c, r) - 0.5) * 10;
      landR[idx] = rgb[0] + jitter;
      landG[idx] = rgb[1] + jitter;
      landB[idx] = rgb[2] + jitter;
    }
  }

  // Smooth water field with a 3x3 weighted kernel so river bends curve organically without stair-step edges
  const waterField = new Float32Array(cols * rows);
  for (let iy = 0; iy < rows; iy++) {
    for (let ix = 0; ix < cols; ix++) {
      let acc = 0;
      let wSum = 0;
      for (let dy = -1; dy <= 1; dy++) {
        const ny = iy + dy;
        if (ny < 0 || ny >= rows) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const nx = ix + dx;
          if (nx < 0 || nx >= cols) continue;
          const weight = dx === 0 && dy === 0 ? 4 : dx === 0 || dy === 0 ? 2 : 1;
          acc += rawWaterField[ny * cols + nx] * weight;
          wSum += weight;
        }
      }
      waterField[iy * cols + ix] = acc / wSum;
    }
  }

  const img = ctx.createImageData(canvas.width, canvas.height);
  const data = img.data;
  const w = canvas.width;
  const h = canvas.height;

  for (let py = 0; py < h; py++) {
    const fy = Math.max(0, Math.min(rows - 1.001, py / pxPerCell - 0.5));
    const iy0 = Math.floor(fy);
    const iy1 = Math.min(rows - 1, iy0 + 1);
    const ty = fy - iy0;
    const row0 = iy0 * cols;
    const row1 = iy1 * cols;

    for (let px = 0; px < w; px++) {
      const fx = Math.max(0, Math.min(cols - 1.001, px / pxPerCell - 0.5));
      const ix0 = Math.floor(fx);
      const ix1 = Math.min(cols - 1, ix0 + 1);
      const tx = fx - ix0;

      const i00 = row0 + ix0;
      const i10 = row0 + ix1;
      const i01 = row1 + ix0;
      const i11 = row1 + ix1;

      const w00 = (1 - tx) * (1 - ty);
      const w10 = tx * (1 - ty);
      const w01 = (1 - tx) * ty;
      const w11 = tx * ty;

      // Bilinear land color (no grid lines)
      let rVal = landR[i00] * w00 + landR[i10] * w10 + landR[i01] * w01 + landR[i11] * w11;
      let gVal = landG[i00] * w00 + landG[i10] * w10 + landG[i01] * w01 + landG[i11] * w11;
      let bVal = landB[i00] * w00 + landB[i10] * w10 + landB[i01] * w01 + landB[i11] * w11;

      // Smooth flowing river contour from bilinear water field + subtle organic bank curve
      const wf =
        waterField[i00] * w00 +
        waterField[i10] * w10 +
        waterField[i01] * w01 +
        waterField[i11] * w11 +
        Math.sin(fx * 1.9 + fy * 1.4) * 0.035;

      if (wf > 0.24) {
        const bankMix = smoothstep(0.24, 0.42, wf);
        const waterMix = smoothstep(0.4, 0.56, wf);
        const deepMix = smoothstep(0.56, 0.82, wf);

        rVal = rVal * (1 - bankMix) + RIVER_BANK_COLOR[0] * bankMix;
        gVal = gVal * (1 - bankMix) + RIVER_BANK_COLOR[1] * bankMix;
        bVal = bVal * (1 - bankMix) + RIVER_BANK_COLOR[2] * bankMix;

        const wr = TERRAIN_COLORS.water[0] * (1 - deepMix) + RIVER_DEEP_COLOR[0] * deepMix;
        const wg = TERRAIN_COLORS.water[1] * (1 - deepMix) + RIVER_DEEP_COLOR[1] * deepMix;
        const wb = TERRAIN_COLORS.water[2] * (1 - deepMix) + RIVER_DEEP_COLOR[2] * deepMix;

        rVal = rVal * (1 - waterMix) + wr * waterMix;
        gVal = gVal * (1 - waterMix) + wg * waterMix;
        bVal = bVal * (1 - waterMix) + wb * waterMix;
      }

      const pIdx = (py * w + px) * 4;
      data[pIdx] = Math.max(0, Math.min(255, Math.round(rVal)));
      data[pIdx + 1] = Math.max(0, Math.min(255, Math.round(gVal)));
      data[pIdx + 2] = Math.max(0, Math.min(255, Math.round(bVal)));
      data[pIdx + 3] = 255;
    }
  }

  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.needsUpdate = true;
  return tex;
}

export interface ThanhHoaWorldResult {
  group: THREE.Group;
  dispose: () => void;
}

export function createThanhHoa3DWorld(
  basePctX: number,
  basePctY: number,
): ThanhHoaWorldResult {
  const group = new THREE.Group();
  const disposables: Array<{ dispose: () => void }> = [];

  const minCell = coordToCell(MIN_PCT_X, MIN_PCT_Y);
  const maxCell = coordToCell(MAX_PCT_X, MAX_PCT_Y);
  const baseCell = coordToCell(basePctX, basePctY);

  const minCol = minCell.col;
  const maxCol = maxCell.col;
  const minRow = minCell.row;
  const maxRow = maxCell.row;

  const cols = maxCol - minCol + 1;
  const rows = maxRow - minRow + 1;
  const worldW = cols * CELL_SCALE_3D;
  const worldH = rows * CELL_SCALE_3D;

  const centerX = ((minCol + maxCol) / 2 - baseCell.col) * CELL_SCALE_3D;
  const centerZ = ((minRow + maxRow) / 2 - baseCell.row) * CELL_SCALE_3D;

  const pctToWorld = (pctX: number, pctY: number): [number, number] => [
    (pctX / GRID_CELL_W_PCT - (baseCell.col + 0.5)) * CELL_SCALE_3D,
    (pctY / GRID_CELL_H_PCT - (baseCell.row + 0.5)) * CELL_SCALE_3D,
  ];

  const insideMask = new Uint8Array(cols * rows);
  const rawElevations = new Float32Array(cols * rows);
  const forestCells: Array<{ wx: number; wz: number; elev: number; c: number; r: number }> = [];
  const mountainCells: Array<{ wx: number; wz: number; elev: number; c: number; r: number; isCliff: boolean }> = [];

  for (let iy = 0; iy < rows; iy++) {
    const r = minRow + iy;
    const pctY = (r + 0.5) * GRID_CELL_H_PCT;
    const wz = (r - baseCell.row) * CELL_SCALE_3D;
    for (let ix = 0; ix < cols; ix++) {
      const c = minCol + ix;
      const pctX = (c + 0.5) * GRID_CELL_W_PCT;
      const wx = (c - baseCell.col) * CELL_SCALE_3D;
      const idx = iy * cols + ix;

      const inside = isInsideThanhHoa(pctX, pctY);
      insideMask[idx] = inside ? 1 : 0;

      const t = getGridTerrain(c, r);
      const inBasePlateau = Math.abs(wx) < 16.5 && Math.abs(wz) < 16.5;

      if (!inside) {
        rawElevations[idx] = -1.45;
      } else if (inBasePlateau) {
        rawElevations[idx] = 0;
      } else {
        const elev = baseElevationForTerrain(t, c, r);
        rawElevations[idx] = elev;

        if (t === 'forest') {
          let forestNeighbors = 0;
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              if (dc === 0 && dr === 0) continue;
              if (getGridTerrain(c + dc, r + dr) === 'forest') forestNeighbors++;
            }
          }
          const treeCount =
            forestNeighbors >= 6 ? 3 : forestNeighbors >= 3 ? 2 : hash2D(c + 17, r + 31) > 0.15 ? 1 : 0;
          for (let k = 0; k < treeCount; k++) {
            const ox = (hash2D(c * 7 + k * 13, r * 11 + k * 29) - 0.5) * 2.4;
            const oz = (hash2D(c * 19 + k * 37, r * 5 + k * 41) - 0.5) * 2.4;
            forestCells.push({ wx: wx + ox, wz: wz + oz, elev, c: c * 5 + k, r: r * 5 + k });
          }
        } else if ((t === 'mountain' || t === 'cliff') && hash2D(c + 53, r + 11) > 0.36) {
          mountainCells.push({ wx, wz, elev, c, r, isCliff: t === 'cliff' });
        }
      }
    }
  }

  // Smooth river & bank elevations so rivers flow continuously without sharp steps
  const cellElevations = new Float32Array(cols * rows);
  for (let iy = 0; iy < rows; iy++) {
    for (let ix = 0; ix < cols; ix++) {
      const idx = iy * cols + ix;
      if (rawElevations[idx] > 0.35) {
        cellElevations[idx] = rawElevations[idx];
        continue;
      }
      let sum = 0;
      let count = 0;
      for (let dy = -1; dy <= 1; dy++) {
        const ny = iy + dy;
        if (ny < 0 || ny >= rows) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const nx = ix + dx;
          if (nx < 0 || nx >= cols) continue;
          const v = rawElevations[ny * cols + nx];
          if (v <= 0.6) {
            sum += v;
            count++;
          }
        }
      }
      cellElevations[idx] = count > 0 ? sum / count : rawElevations[idx];
    }
  }

  // 1. Sea plane surrounding Thanh Hóa (kept below deepest riverbeds so it never pokes through rivers)
  const seaGeo = new THREE.PlaneGeometry(1100, 1100);
  seaGeo.rotateX(-Math.PI / 2);
  const seaMat = new THREE.MeshStandardMaterial({
    color: 0x2f5b7e,
    roughness: 0.38,
    metalness: 0.14,
  });
  const seaMesh = new THREE.Mesh(seaGeo, seaMat);
  seaMesh.position.set(centerX, -0.95, centerZ);
  seaMesh.receiveShadow = true;
  group.add(seaMesh);
  disposables.push(seaGeo, seaMat);

  // 2. Single displaced terrain mesh with smooth grass & flowing rivers (no grid lines)
  const terrainTex = createSmoothTerrainTexture(minCol, minRow, cols, rows, insideMask);
  disposables.push(terrainTex);

  const terrainGeo = new THREE.PlaneGeometry(worldW, worldH, cols, rows);
  terrainGeo.rotateX(-Math.PI / 2);
  const posAttr = terrainGeo.attributes.position as THREE.BufferAttribute;

  for (let iy = 0; iy <= rows; iy++) {
    const cIy = Math.min(rows - 1, iy);
    const pIy = Math.max(0, iy - 1);
    for (let ix = 0; ix <= cols; ix++) {
      const cIx = Math.min(cols - 1, ix);
      const pIx = Math.max(0, ix - 1);

      const vIdx = iy * (cols + 1) + ix;
      const vx = posAttr.getX(vIdx) + centerX;
      const vz = posAttr.getZ(vIdx) + centerZ;

      if (Math.abs(vx) < 16.2 && Math.abs(vz) < 16.2) {
        posAttr.setY(vIdx, 0);
        continue;
      }

      const e00 = cellElevations[pIy * cols + pIx];
      const e10 = cellElevations[pIy * cols + cIx];
      const e01 = cellElevations[cIy * cols + pIx];
      const e11 = cellElevations[cIy * cols + cIx];
      posAttr.setY(vIdx, (e00 + e10 + e01 + e11) * 0.25);
    }
  }

  terrainGeo.computeVertexNormals();

  const bumpTex = getMeadowBumpTexture().clone();
  bumpTex.wrapS = THREE.RepeatWrapping;
  bumpTex.wrapT = THREE.RepeatWrapping;
  bumpTex.repeat.set(Math.max(1, cols / 8), Math.max(1, rows / 8));
  bumpTex.needsUpdate = true;
  disposables.push(bumpTex);

  const terrainMat = new THREE.MeshStandardMaterial({
    map: terrainTex,
    normalMap: bumpTex,
    normalScale: new THREE.Vector2(0.45, 0.45),
    roughness: 0.94,
    metalness: 0.03,
  });
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.position.set(centerX, 0, centerZ);
  terrainMesh.receiveShadow = true;
  terrainMesh.castShadow = true;
  group.add(terrainMesh);
  disposables.push(terrainGeo, terrainMat);

  // 3. District borders as a single LineSegments draw call
  const borderVerts: number[] = [];
  for (const d of DISTRICTS) {
    const poly = d.polygon;
    for (let i = 0; i < poly.length; i++) {
      const [x1, y1] = pctToWorld(poly[i][0], poly[i][1]);
      const next = poly[(i + 1) % poly.length];
      const [x2, y2] = pctToWorld(next[0], next[1]);
      borderVerts.push(x1, 0.45, y1, x2, 0.45, y2);
    }
  }
  const borderGeo = new THREE.BufferGeometry();
  borderGeo.setAttribute('position', new THREE.Float32BufferAttribute(borderVerts, 3));
  const borderMat = new THREE.LineBasicMaterial({
    color: 0xd4a95a,
    transparent: true,
    opacity: 0.42,
  });
  const borderLines = new THREE.LineSegments(borderGeo, borderMat);
  group.add(borderLines);
  disposables.push(borderGeo, borderMat);

  // 4. 5 detailed Oak tree variants (buttress roots, multi-branched trunks, layered foliage puffs)
  if (forestCells.length > 0) {
    const makeLimb = (rTop: number, rBot: number, h: number, x: number, y: number, z: number, rx = 0, rz = 0) => {
      const g = new THREE.CylinderGeometry(rTop, rBot, h, 6).toNonIndexed();
      if (rx !== 0) g.rotateX(rx);
      if (rz !== 0) g.rotateZ(rz);
      g.translate(x, y, z);
      return g;
    };
    const makeLobe = (
      radius: number,
      x: number,
      y: number,
      z: number,
      sx = 1,
      sy = 0.82,
      sz = 1,
      ry = 0,
    ) => {
      const g = new THREE.IcosahedronGeometry(radius, 1);
      if (ry !== 0) g.rotateY(ry);
      g.scale(sx, sy, sz);
      g.translate(x, y, z);
      return g;
    };

    const oakVariants = [
      // 0: Sồi cổ thụ tán rộng (Ancient Spreading Oak)
      {
        trunkGeo: mergeGeometries([
          makeLimb(0.15, 0.25, 0.96, 0, 0.48, 0),
          makeLimb(0.06, 0.14, 0.32, -0.16, 0.12, 0.08, 0.3, 0.72),
          makeLimb(0.06, 0.14, 0.32, 0.16, 0.12, -0.08, -0.3, -0.72),
          makeLimb(0.06, 0.13, 0.3, 0.04, 0.11, -0.17, -0.7, 0.15),
          makeLimb(0.08, 0.13, 0.72, -0.26, 1.02, 0.1, 0.22, 0.62),
          makeLimb(0.08, 0.13, 0.7, 0.28, 0.98, -0.09, -0.24, -0.58),
          makeLimb(0.06, 0.1, 0.56, 0.06, 1.06, 0.24, 0.56, -0.18),
          makeLimb(0.05, 0.08, 0.42, -0.44, 1.24, 0.16, 0.2, 0.85),
        ]),
        crownGeo: mergeGeometries([
          makeLobe(0.66, 0, 1.56, 0, 1.18, 0.78, 1.12, 0.2),
          makeLobe(0.54, -0.52, 1.32, 0.2, 1.08, 0.76, 1.04, 0.7),
          makeLobe(0.52, 0.48, 1.34, -0.18, 1.04, 0.78, 1.08, 1.4),
          makeLobe(0.46, 0.12, 1.3, 0.48, 1.04, 0.74, 1.0, 2.1),
          makeLobe(0.45, -0.14, 1.32, -0.46, 1.0, 0.75, 1.04, 2.8),
          makeLobe(0.38, -0.36, 1.66, -0.18, 1.02, 0.8, 0.98, 0.9),
          makeLobe(0.38, 0.34, 1.64, 0.22, 1.0, 0.82, 1.02, 1.9),
          makeLobe(0.4, 0.02, 1.88, -0.04, 1.06, 0.76, 1.0, 0.4),
        ]),
        crownColor: 0x3e6c30,
      },
      // 1: Sồi cao vươn tán (Tall Forest Oak)
      {
        trunkGeo: mergeGeometries([
          makeLimb(0.12, 0.22, 1.34, 0, 0.66, 0),
          makeLimb(0.05, 0.12, 0.28, -0.14, 0.11, -0.05, -0.25, 0.68),
          makeLimb(0.05, 0.12, 0.28, 0.14, 0.11, 0.08, 0.25, -0.68),
          makeLimb(0.07, 0.11, 0.6, 0.22, 1.24, 0.12, 0.28, -0.52),
          makeLimb(0.06, 0.1, 0.56, -0.2, 1.34, -0.1, -0.26, 0.48),
          makeLimb(0.05, 0.08, 0.46, -0.06, 1.48, 0.18, 0.48, 0.12),
        ]),
        crownGeo: mergeGeometries([
          makeLobe(0.56, 0, 1.92, 0, 1.04, 0.9, 1.04, 0.3),
          makeLobe(0.46, 0.36, 1.56, 0.22, 1.06, 0.8, 1.02, 1.1),
          makeLobe(0.45, -0.34, 1.6, -0.2, 1.02, 0.82, 1.06, 2.0),
          makeLobe(0.38, -0.1, 1.72, 0.36, 1.0, 0.8, 0.96, 0.6),
          makeLobe(0.36, 0.14, 1.74, -0.34, 0.98, 0.8, 1.0, 1.6),
          makeLobe(0.42, 0.04, 2.28, -0.04, 0.96, 0.86, 0.96, 2.5),
          makeLobe(0.32, 0.24, 2.04, 0.16, 0.94, 0.82, 0.94, 0.8),
        ]),
        crownColor: 0x497938,
      },
      // 2: Sồi hai chạc (Twin-Bough Oak)
      {
        trunkGeo: mergeGeometries([
          makeLimb(0.15, 0.23, 0.74, 0, 0.36, 0),
          makeLimb(0.06, 0.13, 0.3, 0.15, 0.11, -0.06, -0.2, -0.7),
          makeLimb(0.06, 0.13, 0.3, -0.14, 0.11, 0.1, 0.35, 0.65),
          makeLimb(0.09, 0.14, 0.86, -0.24, 0.92, 0.06, 0.14, 0.48),
          makeLimb(0.08, 0.13, 0.78, 0.26, 0.88, -0.1, -0.2, -0.54),
          makeLimb(0.05, 0.08, 0.44, -0.44, 1.32, 0.18, 0.25, 0.7),
          makeLimb(0.05, 0.08, 0.42, 0.44, 1.24, -0.22, -0.3, -0.68),
        ]),
        crownGeo: mergeGeometries([
          makeLobe(0.54, -0.38, 1.48, 0.1, 1.08, 0.82, 1.05, 0.5),
          makeLobe(0.48, 0.4, 1.36, -0.18, 1.06, 0.8, 1.04, 1.3),
          makeLobe(0.44, 0.02, 1.66, 0.24, 1.02, 0.82, 1.0, 2.2),
          makeLobe(0.36, -0.58, 1.28, 0.24, 0.98, 0.78, 0.98, 0.9),
          makeLobe(0.36, 0.54, 1.22, -0.32, 0.96, 0.78, 0.98, 1.7),
          makeLobe(0.38, -0.16, 1.74, -0.12, 1.0, 0.8, 0.98, 2.9),
          makeLobe(0.34, 0.26, 1.64, 0.04, 0.98, 0.82, 0.96, 0.2),
        ]),
        crownColor: 0x355f2b,
      },
      // 3: Sồi nghiêng gió (Wind-Swept Oak)
      {
        trunkGeo: mergeGeometries([
          makeLimb(0.12, 0.21, 0.86, 0.08, 0.42, 0.04, 0.08, -0.18),
          makeLimb(0.06, 0.12, 0.28, -0.12, 0.1, -0.08, -0.3, 0.65),
          makeLimb(0.07, 0.11, 0.66, 0.3, 0.96, 0.12, 0.18, -0.54),
          makeLimb(0.06, 0.09, 0.54, -0.06, 0.94, -0.16, -0.42, 0.35),
        ]),
        crownGeo: mergeGeometries([
          makeLobe(0.56, 0.3, 1.4, 0.12, 1.12, 0.78, 1.06, 0.4),
          makeLobe(0.46, 0.64, 1.24, 0.24, 1.04, 0.76, 1.0, 1.5),
          makeLobe(0.44, -0.08, 1.28, -0.24, 1.02, 0.8, 1.04, 2.4),
          makeLobe(0.38, 0.22, 1.64, -0.06, 1.0, 0.78, 0.98, 0.8),
          makeLobe(0.34, 0.46, 1.54, -0.18, 0.96, 0.78, 0.98, 1.9),
          makeLobe(0.34, 0.06, 1.38, 0.38, 0.98, 0.76, 0.96, 2.7),
        ]),
        crownColor: 0x457435,
      },
      // 4: Sồi non sum suê (Dense Young Oak)
      {
        trunkGeo: mergeGeometries([
          makeLimb(0.11, 0.19, 0.64, 0, 0.32, 0),
          makeLimb(0.06, 0.09, 0.42, -0.16, 0.64, 0.08, 0.2, 0.5),
          makeLimb(0.06, 0.09, 0.4, 0.16, 0.62, -0.08, -0.2, -0.5),
        ]),
        crownGeo: mergeGeometries([
          makeLobe(0.54, 0, 1.04, 0, 1.12, 0.82, 1.12, 0.2),
          makeLobe(0.42, -0.36, 0.9, -0.22, 1.05, 0.78, 1.0, 1.1),
          makeLobe(0.42, 0.34, 0.92, 0.22, 1.0, 0.78, 1.05, 2.0),
          makeLobe(0.36, 0.18, 0.94, -0.34, 0.98, 0.78, 0.98, 0.7),
          makeLobe(0.36, -0.2, 0.96, 0.34, 0.98, 0.78, 0.98, 1.8),
          makeLobe(0.36, 0.02, 1.3, 0.02, 1.0, 0.8, 1.0, 2.6),
        ]),
        crownColor: 0x52823f,
      },
    ];

    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0x593b22,
      roughness: 0.92,
      flatShading: true,
    });
    disposables.push(trunkMat);

    const bucketed: Array<typeof forestCells> = oakVariants.map(() => []);
    for (const cell of forestCells) {
      const vIdx = Math.floor(hash2D(cell.c + 71, cell.r + 97) * oakVariants.length) % oakVariants.length;
      bucketed[vIdx].push(cell);
    }

    const dummy = new THREE.Object3D();
    oakVariants.forEach((variant, vIdx) => {
      const cells = bucketed[vIdx];
      if (cells.length === 0) {
        variant.trunkGeo.dispose();
        variant.crownGeo.dispose();
        return;
      }

      const crownMat = new THREE.MeshStandardMaterial({
        color: variant.crownColor,
        roughness: 0.86,
        flatShading: true,
      });
      const trunkInst = new THREE.InstancedMesh(variant.trunkGeo, trunkMat, cells.length);
      const crownInst = new THREE.InstancedMesh(variant.crownGeo, crownMat, cells.length);
      trunkInst.castShadow = true;
      crownInst.castShadow = true;
      crownInst.receiveShadow = true;

      cells.forEach((cell, i) => {
        const s = 0.56 + hash2D(cell.c + 41, cell.r + 43) * 0.88;
        const sy = s * (0.88 + hash2D(cell.c + 61, cell.r + 67) * 0.24);

        dummy.position.set(cell.wx, cell.elev - 0.04, cell.wz);
        dummy.scale.set(s, sy, s);
        dummy.rotation.y = hash2D(cell.c, cell.r) * Math.PI * 2;
        dummy.updateMatrix();
        trunkInst.setMatrixAt(i, dummy.matrix);
        crownInst.setMatrixAt(i, dummy.matrix);
      });

      trunkInst.instanceMatrix.needsUpdate = true;
      crownInst.instanceMatrix.needsUpdate = true;
      group.add(trunkInst, crownInst);
      disposables.push(variant.trunkGeo, variant.crownGeo, crownMat);
    });
  }

  // 5. InstancedMesh for mountain & cliff peaks (1 draw call)
  if (mountainCells.length > 0) {
    const peakGeo = new THREE.ConeGeometry(1.75, 3.2, 5);
    const peakMat = new THREE.MeshStandardMaterial({
      color: 0x6b6154,
      roughness: 0.92,
      flatShading: true,
    });
    const peakInst = new THREE.InstancedMesh(peakGeo, peakMat, mountainCells.length);
    peakInst.castShadow = true;
    peakInst.receiveShadow = true;

    const dummy = new THREE.Object3D();
    mountainCells.forEach((cell, i) => {
      const s = (cell.isCliff ? 1.15 : 0.85) + hash2D(cell.c + 5, cell.r + 9) * 0.55;
      const hScale = cell.isCliff ? s * 1.35 : s;
      dummy.position.set(cell.wx, cell.elev * 0.75 + 1.2 * hScale, cell.wz);
      dummy.scale.set(s, hScale, s);
      dummy.rotation.y = hash2D(cell.c + 13, cell.r + 29) * Math.PI;
      dummy.updateMatrix();
      peakInst.setMatrixAt(i, dummy.matrix);
    });

    peakInst.instanceMatrix.needsUpdate = true;
    group.add(peakInst);
    disposables.push(peakGeo, peakMat);
  }

  return {
    group,
    dispose: () => {
      for (const d of disposables) d.dispose();
    },
  };
}
