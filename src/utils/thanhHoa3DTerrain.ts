import * as THREE from 'three';
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

  const waterField = new Float32Array(cols * rows);
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
      waterField[idx] = isWater ? 1 : 0;
      const rgb = isWater ? TERRAIN_COLORS.plains : TERRAIN_COLORS[t];
      const jitter = (hash2D(c, r) - 0.5) * 10;
      landR[idx] = rgb[0] + jitter;
      landG[idx] = rgb[1] + jitter;
      landB[idx] = rgb[2] + jitter;
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

        if (t === 'forest' && hash2D(c + 17, r + 31) > 0.28) {
          forestCells.push({ wx, wz, elev, c, r });
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

  // 1. Sea plane surrounding Thanh Hóa
  const seaGeo = new THREE.PlaneGeometry(1100, 1100);
  seaGeo.rotateX(-Math.PI / 2);
  const seaMat = new THREE.MeshStandardMaterial({
    color: 0x2f5b7e,
    roughness: 0.38,
    metalness: 0.14,
  });
  const seaMesh = new THREE.Mesh(seaGeo, seaMat);
  seaMesh.position.set(centerX, -0.35, centerZ);
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

  // 4. InstancedMesh for forest trees (1 draw call for trunks + 1 for crowns)
  if (forestCells.length > 0) {
    const trunkGeo = new THREE.CylinderGeometry(0.11, 0.16, 0.72, 5);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c3c22, roughness: 0.9 });
    const crownGeo = new THREE.ConeGeometry(0.62, 1.45, 6);
    const crownMat = new THREE.MeshStandardMaterial({ color: 0x3b6334, roughness: 0.85 });

    const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, forestCells.length);
    const crownInst = new THREE.InstancedMesh(crownGeo, crownMat, forestCells.length);
    trunkInst.castShadow = true;
    crownInst.castShadow = true;

    const dummy = new THREE.Object3D();
    forestCells.forEach((cell, i) => {
      const ox = (hash2D(cell.c + 3, cell.r + 7) - 0.5) * 1.8;
      const oz = (hash2D(cell.c + 19, cell.r + 23) - 0.5) * 1.8;
      const s = 0.75 + hash2D(cell.c + 41, cell.r + 43) * 0.55;

      dummy.position.set(cell.wx + ox, cell.elev + 0.36 * s, cell.wz + oz);
      dummy.scale.set(s, s, s);
      dummy.rotation.y = hash2D(cell.c, cell.r) * Math.PI * 2;
      dummy.updateMatrix();
      trunkInst.setMatrixAt(i, dummy.matrix);

      dummy.position.set(cell.wx + ox, cell.elev + 1.15 * s, cell.wz + oz);
      dummy.updateMatrix();
      crownInst.setMatrixAt(i, dummy.matrix);
    });

    trunkInst.instanceMatrix.needsUpdate = true;
    crownInst.instanceMatrix.needsUpdate = true;
    group.add(trunkInst, crownInst);
    disposables.push(trunkGeo, trunkMat, crownGeo, crownMat);
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
