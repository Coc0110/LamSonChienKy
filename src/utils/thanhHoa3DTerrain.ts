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

const MIN_PCT_X = 34.0;
const MAX_PCT_X = 74.5;
const MIN_PCT_Y = 39.0;
const MAX_PCT_Y = 59.5;

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

function getDistrictIdAt(pctX: number, pctY: number): string | null {
  for (let i = 0; i < DISTRICTS.length; i++) {
    if (pointInPolygon(pctX, pctY, DISTRICTS[i].polygon)) return DISTRICTS[i].id;
  }
  return null;
}

function isInsideThanhHoa(pctX: number, pctY: number): boolean {
  return getDistrictIdAt(pctX, pctY) !== null;
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
      const t = getGridTerrain(c, r);
      const isWater = t === 'water';
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

export interface PlainsTreeHit {
  key: string;
  wx: number;
  wz: number;
  elev: number;
}

export interface ForestCellHit {
  key: string;
  wx: number;
  wz: number;
  elev: number;
}

export interface ThanhHoaWorldResult {
  group: THREE.Group;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  findPlainsTreeAt: (wx: number, wz: number, maxDist?: number) => PlainsTreeHit | null;
  getForestCellAt: (wx: number, wz: number) => ForestCellHit | null;
  hideTreesByKey: (key: string) => void;
  setFogTint: (color: THREE.Color) => void;
  refreshFog: (nextExplored: Set<string>) => void;
  dispose: () => void;
}

export function createThanhHoa3DWorld(
  basePctX: number,
  basePctY: number,
  initialHiddenKeys?: Set<string>,
  exploredIds?: Set<string>,
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

  const waterMask = new Uint8Array(cols * rows);
  const districtIds: Array<string | null> = new Array(cols * rows).fill(null);
  const rawElevations = new Float32Array(cols * rows);
  let minBoundX = Infinity;
  let maxBoundX = -Infinity;
  let minBoundZ = Infinity;
  let maxBoundZ = -Infinity;

  interface TreeSpawn {
    key: string;
    wx: number;
    wz: number;
    elev: number;
    c: number;
    r: number;
    isPlains: boolean;
  }

  const treeSpawns: TreeSpawn[] = [];
  const plainsTreeMap = new Map<string, PlainsTreeHit>();
  const forestCellMap = new Map<string, ForestCellHit>();
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

      const districtId = getDistrictIdAt(pctX, pctY);
      const inside = districtId !== null;
      districtIds[idx] = districtId;
      if (inside) {
        if (wx < minBoundX) minBoundX = wx;
        if (wx > maxBoundX) maxBoundX = wx;
        if (wz < minBoundZ) minBoundZ = wz;
        if (wz > maxBoundZ) maxBoundZ = wz;
      }

      const t = getGridTerrain(c, r);
      waterMask[idx] = t === 'water' ? 1 : 0;
      const inBasePlateau = Math.abs(wx) < 16.5 && Math.abs(wz) < 16.5;

      if (inBasePlateau) {
        rawElevations[idx] = 0;
      } else {
        const elev = baseElevationForTerrain(t, c, r);
        rawElevations[idx] = elev;
        const cellKey = `${c},${r}`;

        if (t === 'forest') {
          if (!initialHiddenKeys?.has(cellKey)) {
            forestCellMap.set(cellKey, { key: cellKey, wx, wz, elev });
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
              treeSpawns.push({
                key: cellKey,
                wx: wx + ox,
                wz: wz + oz,
                elev,
                c: c * 5 + k,
                r: r * 5 + k,
                isPlains: false,
              });
            }
          }
        } else if (t === 'plains' && hash2D(c * 13 + 7, r * 17 + 23) > 0.88) {
          if (!initialHiddenKeys?.has(cellKey)) {
            const ox = (hash2D(c * 3 + 5, r * 7 + 11) - 0.5) * 1.8;
            const oz = (hash2D(c * 11 + 17, r * 13 + 19) - 0.5) * 1.8;
            const twx = wx + ox;
            const twz = wz + oz;
            plainsTreeMap.set(cellKey, { key: cellKey, wx: twx, wz: twz, elev });
            treeSpawns.push({
              key: cellKey,
              wx: twx,
              wz: twz,
              elev,
              c: c * 5,
              r: r * 5,
              isPlains: true,
            });
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
  const terrainTex = createSmoothTerrainTexture(minCol, minRow, cols, rows);
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
  terrainMesh.castShadow = false;
  group.add(terrainMesh);
  disposables.push(terrainGeo, terrainMat);

  // 3. Lớp mây sương 3D che phủ các huyện thành chưa do thám (có thể refresh ngay khi vừa do thám xong)
  const fogGroup = new THREE.Group();
  group.add(fogGroup);
  const fogTintMaterials: THREE.MeshBasicMaterial[] = [];
  const fogDisposables: Array<{ dispose: () => void }> = [];
  const lastFogTint = new THREE.Color(0xffffff);

  const rebuildFog = (nextExplored?: Set<string>) => {
    while (fogGroup.children.length > 0) {
      fogGroup.remove(fogGroup.children[0]);
    }
    for (const d of fogDisposables) d.dispose();
    fogDisposables.length = 0;
    fogTintMaterials.length = 0;

    if (!nextExplored) return;

    const rawFogField = new Float32Array(cols * rows);
    for (let i = 0; i < districtIds.length; i++) {
      const dId = districtIds[i];
      if ((dId && !nextExplored.has(dId)) || (!dId && waterMask[i] === 0)) {
        rawFogField[i] = 1;
      }
    }

    const fogField = new Float32Array(cols * rows);
    const fogPuffs: Array<{ wx: number; wz: number; c: number; r: number }> = [];
    for (let iy = 0; iy < rows; iy++) {
      const r = minRow + iy;
      const wz = (r - baseCell.row) * CELL_SCALE_3D;
      for (let ix = 0; ix < cols; ix++) {
        const c = minCol + ix;
        const wx = (c - baseCell.col) * CELL_SCALE_3D;
        let acc = 0;
        let wSum = 0;
        for (let dy = -2; dy <= 2; dy++) {
          const ny = iy + dy;
          if (ny < 0 || ny >= rows) continue;
          for (let dx = -2; dx <= 2; dx++) {
            const nx = ix + dx;
            if (nx < 0 || nx >= cols) continue;
            const weight = 5 - Math.abs(dx) - Math.abs(dy);
            acc += rawFogField[ny * cols + nx] * weight;
            wSum += weight;
          }
        }
        const val = acc / wSum;
        fogField[iy * cols + ix] = val;
        if (val > 0.65 && (ix + iy) % 2 === 0 && hash2D(c + 91, r + 47) > 0.42) {
          fogPuffs.push({ wx, wz, c, r });
        }
      }
    }

    const fogCanvas = document.createElement('canvas');
    const fScale = 2;
    fogCanvas.width = cols * fScale;
    fogCanvas.height = rows * fScale;
    const fCtx = fogCanvas.getContext('2d');
    if (fCtx) {
      const fImg = fCtx.createImageData(fogCanvas.width, fogCanvas.height);
      const fData = fImg.data;
      const fw = fogCanvas.width;
      const fh = fogCanvas.height;
      for (let py = 0; py < fh; py++) {
        const fy = Math.max(0, Math.min(rows - 1.001, py / fScale - 0.5));
        const iy0 = Math.floor(fy);
        const iy1 = Math.min(rows - 1, iy0 + 1);
        const ty = fy - iy0;
        for (let px = 0; px < fw; px++) {
          const fx = Math.max(0, Math.min(cols - 1.001, px / fScale - 0.5));
          const ix0 = Math.floor(fx);
          const ix1 = Math.min(cols - 1, ix0 + 1);
          const tx = fx - ix0;

          const v =
            fogField[iy0 * cols + ix0] * (1 - tx) * (1 - ty) +
            fogField[iy0 * cols + ix1] * tx * (1 - ty) +
            fogField[iy1 * cols + ix0] * (1 - tx) * ty +
            fogField[iy1 * cols + ix1] * tx * ty;

          const wisp = 0.08 * Math.sin(fx * 0.65 + fy * 0.45) * Math.cos(fx * 0.3 - fy * 0.7);
          const alpha = smoothstep(0.08, 0.72, v + wisp) * 238;
          const pIdx = (py * fw + px) * 4;
          fData[pIdx] = 232;
          fData[pIdx + 1] = 238;
          fData[pIdx + 2] = 234;
          fData[pIdx + 3] = Math.max(0, Math.min(255, Math.round(alpha)));
        }
      }
      fCtx.putImageData(fImg, 0, 0);
    }

    const fogTex = new THREE.CanvasTexture(fogCanvas);
    fogTex.colorSpace = THREE.SRGBColorSpace;
    fogTex.magFilter = THREE.LinearFilter;
    fogTex.minFilter = THREE.LinearMipmapLinearFilter;
    const fogGeo = new THREE.PlaneGeometry(worldW, worldH);
    fogGeo.rotateX(-Math.PI / 2);
    const fogMat = new THREE.MeshBasicMaterial({
      map: fogTex,
      color: lastFogTint,
      transparent: true,
      opacity: 0.84,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    fogTintMaterials.push(fogMat);
    for (const fy of [1.4, 4.0, 7.0, 10.2]) {
      const fogMesh = new THREE.Mesh(fogGeo, fogMat);
      fogMesh.position.set(centerX, fy, centerZ);
      fogGroup.add(fogMesh);
    }
    fogDisposables.push(fogTex, fogGeo, fogMat);

    if (fogPuffs.length > 0) {
      const puffCanvas = document.createElement('canvas');
      puffCanvas.width = 128;
      puffCanvas.height = 128;
      const pCtx = puffCanvas.getContext('2d');
      if (pCtx) {
        pCtx.clearRect(0, 0, 128, 128);
        const blobs: Array<[number, number, number, number]> = [
          [64, 72, 48, 0.52],
          [42, 76, 36, 0.44],
          [86, 76, 36, 0.44],
          [52, 54, 34, 0.46],
          [76, 56, 32, 0.42],
          [64, 46, 28, 0.36],
        ];
        for (const [bx, by, br, ba] of blobs) {
          const grad = pCtx.createRadialGradient(bx, by, br * 0.12, bx, by, br);
          grad.addColorStop(0, `rgba(242, 246, 243, ${ba})`);
          grad.addColorStop(0.55, `rgba(232, 238, 234, ${ba * 0.55})`);
          grad.addColorStop(1, 'rgba(232, 238, 234, 0)');
          pCtx.fillStyle = grad;
          pCtx.beginPath();
          pCtx.arc(bx, by, br, 0, Math.PI * 2);
          pCtx.fill();
        }
      }
      const puffTex = new THREE.CanvasTexture(puffCanvas);
      puffTex.colorSpace = THREE.SRGBColorSpace;
      const puffGeo = new THREE.PlaneGeometry(13.5, 10.5);
      const puffMat = new THREE.MeshBasicMaterial({
        map: puffTex,
        color: lastFogTint,
        transparent: true,
        opacity: 0.72,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      fogTintMaterials.push(puffMat);
      const puffInst = new THREE.InstancedMesh(puffGeo, puffMat, fogPuffs.length);
      const dummy = new THREE.Object3D();
      fogPuffs.forEach((p, i) => {
        const s = 0.9 + hash2D(p.c + 3, p.r + 17) * 0.7;
        dummy.position.set(
          p.wx + (hash2D(p.c, p.r) - 0.5) * 2.4,
          3.6 + hash2D(p.c + 9, p.r + 21) * 2.4,
          p.wz + (hash2D(p.r, p.c) - 0.5) * 2.4
        );
        dummy.scale.set(s, s * 0.95, s);
        dummy.rotation.set(-0.42, (hash2D(p.c + 5, p.r + 11) - 0.5) * 0.9, 0);
        dummy.updateMatrix();
        puffInst.setMatrixAt(i, dummy.matrix);
      });
      puffInst.instanceMatrix.needsUpdate = true;
      fogGroup.add(puffInst);
      fogDisposables.push(puffTex, puffGeo, puffMat);
    }
  };

  rebuildFog(exploredIds);

  // Map from cellKey ("c,r") -> list of InstancedMesh instances to hide in O(1) when chopped/cleared
  const keyToInstances = new Map<
    string,
    Array<{ trunkInst: THREE.InstancedMesh; crownInst: THREE.InstancedMesh; idx: number }>
  >();

  // 4. 5 high-detail Oak tree variants (buttress roots, multi-branched trunks, vertex-shaded layered foliage)
  if (treeSpawns.length > 0) {
    const makeLimb = (rTop: number, rBot: number, h: number, x: number, y: number, z: number, rx = 0, rz = 0) => {
      const g = new THREE.CylinderGeometry(rTop, rBot, h, 5).toNonIndexed();
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
      baseHex = 0x3e6c30,
      crownCenterY = 1.4,
    ) => {
      const g = new THREE.IcosahedronGeometry(radius, 1);
      if (ry !== 0) g.rotateY(ry);
      g.scale(sx, sy, sz);

      // Organic leafy tuft displacement on every vertex for crisp foliage detail
      const pos = g.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        const lx = pos.getX(i);
        const ly = pos.getY(i);
        const lz = pos.getZ(i);
        const bump =
          1 +
          0.15 * Math.sin(lx * 11.5 + ly * 9.3) * Math.cos(lz * 12.7) +
          0.09 * Math.cos(lx * 21.1 - lz * 18.4 + ly * 15.2);
        pos.setXYZ(i, lx * bump, ly * bump, lz * bump);
      }

      g.translate(x, y, z);
      g.computeVertexNormals();

      // Sunlit leaf tips vs deep shaded interior vertex coloring (0 extra draw calls)
      const colors = new Float32Array(pos.count * 3);
      const baseColor = new THREE.Color(baseHex);
      for (let i = 0; i < pos.count; i++) {
        const vy = pos.getY(i);
        const vx = pos.getX(i);
        const vz = pos.getZ(i);
        const radial = Math.hypot(vx, vz);
        const leafVar = Math.sin(vx * 16 + vy * 14 + vz * 18) * 0.08;
        const shade = Math.max(
          0.56,
          Math.min(1.26, 0.82 + (vy - crownCenterY) * 0.28 + radial * 0.16 + leafVar),
        );
        colors[i * 3] = Math.min(1, baseColor.r * shade);
        colors[i * 3 + 1] = Math.min(1, baseColor.g * shade);
        colors[i * 3 + 2] = Math.min(1, baseColor.b * shade);
      }
      g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      return g;
    };

    const oakVariants = [
      // 0: Sồi cổ thụ tán rộng (Ancient Spreading Oak)
      {
        trunkGeo: mergeGeometries([
          makeLimb(0.15, 0.27, 0.98, 0, 0.48, 0),
          makeLimb(0.06, 0.15, 0.34, -0.17, 0.13, 0.08, 0.28, 0.72),
          makeLimb(0.06, 0.15, 0.34, 0.17, 0.13, -0.08, -0.28, -0.72),
          makeLimb(0.06, 0.14, 0.32, 0.04, 0.12, -0.18, -0.7, 0.15),
          makeLimb(0.05, 0.13, 0.3, -0.05, 0.12, 0.18, 0.7, -0.15),
          makeLimb(0.08, 0.14, 0.74, -0.27, 1.04, 0.1, 0.22, 0.62),
          makeLimb(0.08, 0.14, 0.72, 0.29, 1.0, -0.09, -0.24, -0.58),
          makeLimb(0.06, 0.11, 0.58, 0.06, 1.08, 0.25, 0.56, -0.18),
          makeLimb(0.05, 0.09, 0.54, -0.06, 1.06, -0.24, -0.54, 0.2),
          makeLimb(0.04, 0.08, 0.44, -0.46, 1.26, 0.16, 0.2, 0.85),
          makeLimb(0.04, 0.08, 0.42, 0.46, 1.22, -0.15, -0.2, -0.82),
        ]),
        crownGeo: mergeGeometries([
          makeLobe(0.64, 0, 1.58, 0, 1.18, 0.78, 1.12, 0.2, 0x3d6b2f, 1.48),
          makeLobe(0.52, -0.54, 1.34, 0.2, 1.08, 0.76, 1.04, 0.7, 0x3d6b2f, 1.48),
          makeLobe(0.5, 0.5, 1.36, -0.18, 1.04, 0.78, 1.08, 1.4, 0x3d6b2f, 1.48),
          makeLobe(0.46, 0.12, 1.32, 0.5, 1.04, 0.74, 1.0, 2.1, 0x3d6b2f, 1.48),
          makeLobe(0.45, -0.14, 1.34, -0.48, 1.0, 0.75, 1.04, 2.8, 0x3d6b2f, 1.48),
          makeLobe(0.38, -0.36, 1.68, -0.18, 1.02, 0.8, 0.98, 0.9, 0x457636, 1.48),
          makeLobe(0.38, 0.34, 1.66, 0.22, 1.0, 0.82, 1.02, 1.9, 0x457636, 1.48),
          makeLobe(0.34, -0.66, 1.42, -0.12, 0.96, 0.74, 0.94, 0.5, 0x457636, 1.48),
          makeLobe(0.34, 0.62, 1.4, 0.16, 0.96, 0.74, 0.94, 1.2, 0x457636, 1.48),
          makeLobe(0.4, 0.02, 1.9, -0.04, 1.06, 0.76, 1.0, 0.4, 0x4c7e3b, 1.48),
        ]),
      },
      // 1: Sồi cao vươn tán (Tall Forest Oak)
      {
        trunkGeo: mergeGeometries([
          makeLimb(0.12, 0.23, 1.36, 0, 0.68, 0),
          makeLimb(0.05, 0.13, 0.3, -0.14, 0.11, -0.05, -0.25, 0.68),
          makeLimb(0.05, 0.13, 0.3, 0.14, 0.11, 0.08, 0.25, -0.68),
          makeLimb(0.05, 0.12, 0.28, 0.02, 0.11, 0.15, 0.66, 0.1),
          makeLimb(0.07, 0.11, 0.62, 0.23, 1.26, 0.12, 0.28, -0.52),
          makeLimb(0.06, 0.11, 0.58, -0.21, 1.36, -0.1, -0.26, 0.48),
          makeLimb(0.05, 0.09, 0.48, -0.06, 1.5, 0.18, 0.48, 0.12),
          makeLimb(0.04, 0.07, 0.38, 0.38, 1.48, 0.2, 0.3, -0.78),
        ]),
        crownGeo: mergeGeometries([
          makeLobe(0.56, 0, 1.94, 0, 1.04, 0.9, 1.04, 0.3, 0x467635, 1.85),
          makeLobe(0.46, 0.38, 1.58, 0.22, 1.06, 0.8, 1.02, 1.1, 0x467635, 1.85),
          makeLobe(0.45, -0.36, 1.62, -0.2, 1.02, 0.82, 1.06, 2.0, 0x467635, 1.85),
          makeLobe(0.38, -0.1, 1.74, 0.38, 1.0, 0.8, 0.96, 0.6, 0x4e803b, 1.85),
          makeLobe(0.36, 0.14, 1.76, -0.36, 0.98, 0.8, 1.0, 1.6, 0x4e803b, 1.85),
          makeLobe(0.42, 0.04, 2.3, -0.04, 0.96, 0.86, 0.96, 2.5, 0x548840, 1.85),
          makeLobe(0.32, 0.26, 2.06, 0.16, 0.94, 0.82, 0.94, 0.8, 0x548840, 1.85),
          makeLobe(0.32, -0.26, 2.04, -0.14, 0.94, 0.82, 0.94, 1.8, 0x548840, 1.85),
        ]),
      },
      // 2: Sồi hai chạc (Twin-Bough Oak)
      {
        trunkGeo: mergeGeometries([
          makeLimb(0.15, 0.24, 0.76, 0, 0.38, 0),
          makeLimb(0.06, 0.14, 0.32, 0.15, 0.12, -0.06, -0.2, -0.7),
          makeLimb(0.06, 0.14, 0.32, -0.14, 0.12, 0.1, 0.35, 0.65),
          makeLimb(0.09, 0.14, 0.88, -0.25, 0.94, 0.06, 0.14, 0.48),
          makeLimb(0.08, 0.13, 0.8, 0.27, 0.9, -0.1, -0.2, -0.54),
          makeLimb(0.05, 0.08, 0.46, -0.45, 1.34, 0.18, 0.25, 0.7),
          makeLimb(0.05, 0.08, 0.44, 0.45, 1.26, -0.22, -0.3, -0.68),
        ]),
        crownGeo: mergeGeometries([
          makeLobe(0.54, -0.38, 1.5, 0.1, 1.08, 0.82, 1.05, 0.5, 0x355f2b, 1.45),
          makeLobe(0.48, 0.42, 1.38, -0.18, 1.06, 0.8, 1.04, 1.3, 0x355f2b, 1.45),
          makeLobe(0.44, 0.02, 1.68, 0.24, 1.02, 0.82, 1.0, 2.2, 0x3d6b31, 1.45),
          makeLobe(0.36, -0.6, 1.3, 0.24, 0.98, 0.78, 0.98, 0.9, 0x3d6b31, 1.45),
          makeLobe(0.36, 0.56, 1.24, -0.32, 0.96, 0.78, 0.98, 1.7, 0x3d6b31, 1.45),
          makeLobe(0.38, -0.16, 1.76, -0.12, 1.0, 0.8, 0.98, 2.9, 0x457538, 1.45),
          makeLobe(0.34, 0.26, 1.66, 0.04, 0.98, 0.82, 0.96, 0.2, 0x457538, 1.45),
          makeLobe(0.32, -0.4, 1.82, 0.06, 0.94, 0.78, 0.94, 1.1, 0x457538, 1.45),
        ]),
      },
      // 3: Sồi nghiêng gió (Wind-Swept Oak)
      {
        trunkGeo: mergeGeometries([
          makeLimb(0.12, 0.22, 0.88, 0.08, 0.44, 0.04, 0.08, -0.18),
          makeLimb(0.06, 0.13, 0.3, -0.12, 0.11, -0.08, -0.3, 0.65),
          makeLimb(0.05, 0.12, 0.28, 0.16, 0.11, 0.1, 0.32, -0.62),
          makeLimb(0.07, 0.11, 0.68, 0.31, 0.98, 0.12, 0.18, -0.54),
          makeLimb(0.06, 0.09, 0.56, -0.06, 0.96, -0.16, -0.42, 0.35),
          makeLimb(0.04, 0.07, 0.4, 0.5, 1.2, 0.2, 0.2, -0.74),
        ]),
        crownGeo: mergeGeometries([
          makeLobe(0.56, 0.32, 1.42, 0.12, 1.12, 0.78, 1.06, 0.4, 0x447334, 1.38),
          makeLobe(0.46, 0.66, 1.26, 0.24, 1.04, 0.76, 1.0, 1.5, 0x447334, 1.38),
          makeLobe(0.44, -0.08, 1.3, -0.24, 1.02, 0.8, 1.04, 2.4, 0x447334, 1.38),
          makeLobe(0.38, 0.22, 1.66, -0.06, 1.0, 0.78, 0.98, 0.8, 0x4d7e3c, 1.38),
          makeLobe(0.34, 0.48, 1.56, -0.18, 0.96, 0.78, 0.98, 1.9, 0x4d7e3c, 1.38),
          makeLobe(0.34, 0.06, 1.4, 0.4, 0.98, 0.76, 0.96, 2.7, 0x4d7e3c, 1.38),
          makeLobe(0.32, 0.44, 1.72, 0.18, 0.92, 0.76, 0.92, 0.9, 0x558842, 1.38),
        ]),
      },
      // 4: Sồi non sum suê (Dense Young Oak)
      {
        trunkGeo: mergeGeometries([
          makeLimb(0.11, 0.2, 0.66, 0, 0.33, 0),
          makeLimb(0.05, 0.11, 0.24, -0.11, 0.1, 0.06, 0.25, 0.6),
          makeLimb(0.05, 0.11, 0.24, 0.11, 0.1, -0.06, -0.25, -0.6),
          makeLimb(0.06, 0.09, 0.44, -0.16, 0.66, 0.08, 0.2, 0.5),
          makeLimb(0.06, 0.09, 0.42, 0.16, 0.64, -0.08, -0.2, -0.5),
        ]),
        crownGeo: mergeGeometries([
          makeLobe(0.54, 0, 1.06, 0, 1.12, 0.82, 1.12, 0.2, 0x50803d, 1.04),
          makeLobe(0.42, -0.36, 0.92, -0.22, 1.05, 0.78, 1.0, 1.1, 0x50803d, 1.04),
          makeLobe(0.42, 0.34, 0.94, 0.22, 1.0, 0.78, 1.05, 2.0, 0x50803d, 1.04),
          makeLobe(0.36, 0.18, 0.96, -0.34, 0.98, 0.78, 0.98, 0.7, 0x588a43, 1.04),
          makeLobe(0.36, -0.2, 0.98, 0.34, 0.98, 0.78, 0.98, 1.8, 0x588a43, 1.04),
          makeLobe(0.38, 0.02, 1.32, 0.02, 1.0, 0.8, 1.0, 2.6, 0x5e9148, 1.04),
        ]),
      },
    ];

    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0x583a22,
      roughness: 0.92,
      flatShading: true,
    });
    const crownMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.84,
      flatShading: true,
    });
    disposables.push(trunkMat, crownMat);

    const bucketed: Array<TreeSpawn[]> = oakVariants.map(() => []);
    for (const cell of treeSpawns) {
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

      const trunkInst = new THREE.InstancedMesh(variant.trunkGeo, trunkMat, cells.length);
      const crownInst = new THREE.InstancedMesh(variant.crownGeo, crownMat, cells.length);
      trunkInst.castShadow = false;
      crownInst.castShadow = false;
      crownInst.receiveShadow = true;

      cells.forEach((cell, i) => {
        const s = cell.isPlains
          ? 0.72 + hash2D(cell.c + 41, cell.r + 43) * 0.56
          : 0.56 + hash2D(cell.c + 41, cell.r + 43) * 0.88;
        const sy = s * (0.88 + hash2D(cell.c + 61, cell.r + 67) * 0.24);

        dummy.position.set(cell.wx, cell.elev - 0.04, cell.wz);
        dummy.scale.set(s, sy, s);
        dummy.rotation.y = hash2D(cell.c, cell.r) * Math.PI * 2;
        dummy.updateMatrix();
        trunkInst.setMatrixAt(i, dummy.matrix);
        crownInst.setMatrixAt(i, dummy.matrix);

        const list = keyToInstances.get(cell.key);
        if (list) list.push({ trunkInst, crownInst, idx: i });
        else keyToInstances.set(cell.key, [{ trunkInst, crownInst, idx: i }]);
      });

      trunkInst.instanceMatrix.needsUpdate = true;
      crownInst.instanceMatrix.needsUpdate = true;
      group.add(trunkInst, crownInst);
      disposables.push(variant.trunkGeo, variant.crownGeo);
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
    peakInst.castShadow = false;
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

  const zeroMat = new THREE.Matrix4().makeScale(0, 0, 0);

  return {
    group,
    bounds: {
      minX: Number.isFinite(minBoundX) ? minBoundX : -220,
      maxX: Number.isFinite(maxBoundX) ? maxBoundX : 220,
      minZ: Number.isFinite(minBoundZ) ? minBoundZ : -140,
      maxZ: Number.isFinite(maxBoundZ) ? maxBoundZ : 140,
    },
    findPlainsTreeAt: (wx: number, wz: number, maxDist = 1.65) => {
      let best: PlainsTreeHit | null = null;
      let bestDist = maxDist;
      const cc = baseCell.col + Math.round(wx / CELL_SCALE_3D);
      const rr = baseCell.row + Math.round(wz / CELL_SCALE_3D);
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const hit = plainsTreeMap.get(`${cc + dc},${rr + dr}`);
          if (!hit) continue;
          const d = Math.hypot(hit.wx - wx, hit.wz - wz);
          if (d < bestDist) {
            bestDist = d;
            best = hit;
          }
        }
      }
      return best;
    },
    getForestCellAt: (wx: number, wz: number) => {
      const cc = baseCell.col + Math.round(wx / CELL_SCALE_3D);
      const rr = baseCell.row + Math.round(wz / CELL_SCALE_3D);
      return forestCellMap.get(`${cc},${rr}`) ?? null;
    },
    hideTreesByKey: (key: string) => {
      plainsTreeMap.delete(key);
      forestCellMap.delete(key);
      const list = keyToInstances.get(key);
      if (!list) return;
      for (const item of list) {
        item.trunkInst.setMatrixAt(item.idx, zeroMat);
        item.crownInst.setMatrixAt(item.idx, zeroMat);
        item.trunkInst.instanceMatrix.needsUpdate = true;
        item.crownInst.instanceMatrix.needsUpdate = true;
      }
      keyToInstances.delete(key);
    },
    setFogTint: (color: THREE.Color) => {
      lastFogTint.copy(color);
      for (const m of fogTintMaterials) {
        m.color.copy(color);
      }
    },
    refreshFog: (nextExplored: Set<string>) => {
      rebuildFog(nextExplored);
    },
    dispose: () => {
      for (const d of fogDisposables) d.dispose();
      for (const d of disposables) d.dispose();
    },
  };
}
