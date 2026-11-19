import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { BaseBuildingType } from '../types/region';

export const DIORAMA_PALETTE = {
  ground: 0x6b8e4e,
  groundAlt: 0x618345,
  cliff: 0x8a7965,
  road: 0xc2b294,
  wood: 0x7c5333,
  woodDark: 0x523620,
  thatch: 0xd1b06b,
  tileRed: 0xa63d2d,
  tileBlue: 0x3b5978,
  stone: 0x8e9299,
  gold: 0xd4af37,
  iron: 0x454b54,
  ember: 0xe66c2c,
  leaf: 0x4e7c44,
  lamSonBanner: 0xc9302c,
  mingBanner: 0x2b4c7e,
};

const cachedBuildingGeos = new Map<string, THREE.BufferGeometry>();

function safeMerge(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const nonIndexed = parts.map((g) => (g.index ? g.toNonIndexed() : g));
  const merged = BufferGeometryUtils.mergeGeometries(nonIndexed, false);
  return merged || nonIndexed[0];
}

export function getBuildingGeometry(type: BaseBuildingType, level: number): THREE.BufferGeometry {
  const tier = Math.min(5, Math.max(1, level));
  const key = `${type}_${tier}`;
  const hit = cachedBuildingGeos.get(key);
  if (hit) return hit;

  let geo: THREE.BufferGeometry;

  switch (type) {
    case 'main_hall': {
      const plinth = new THREE.BoxGeometry(2.6, 0.28, 2.6);
      plinth.translate(0, 0.14, 0);
      const body = new THREE.BoxGeometry(2.0, 0.9 + tier * 0.1, 1.8);
      body.translate(0, 0.28 + (0.9 + tier * 0.1) / 2, 0);
      const roof1 = new THREE.ConeGeometry(1.75, 0.75, 4);
      roof1.rotateY(Math.PI / 4);
      roof1.translate(0, 1.45 + tier * 0.1, 0);
      const roof2 = new THREE.ConeGeometry(1.1, 0.55, 4);
      roof2.rotateY(Math.PI / 4);
      roof2.translate(0, 1.9 + tier * 0.1, 0);
      const spire = new THREE.CylinderGeometry(0.04, 0.04, 0.65, 6);
      spire.translate(0, 2.35 + tier * 0.1, 0);
      geo = safeMerge([plinth, body, roof1, roof2, spire]);
      break;
    }
    case 'farm': {
      const plot = new THREE.BoxGeometry(2.6, 0.1, 2.6);
      plot.translate(0, 0.05, 0);
      const hut = new THREE.BoxGeometry(0.85, 0.5, 0.85);
      hut.translate(-0.7, 0.35, -0.7);
      const roof = new THREE.ConeGeometry(0.75, 0.45, 4);
      roof.rotateY(Math.PI / 4);
      roof.translate(-0.7, 0.82, -0.7);
      const rows: THREE.BufferGeometry[] = [plot, hut, roof];
      for (let i = 0; i < 3; i++) {
        const ridge = new THREE.BoxGeometry(1.4, 0.16 + tier * 0.03, 0.25);
        ridge.translate(0.35, 0.18, -0.6 + i * 0.65);
        rows.push(ridge);
      }
      geo = safeMerge(rows);
      break;
    }
    case 'forge': {
      const base = new THREE.BoxGeometry(1.7, 0.14, 1.7);
      base.translate(0, 0.07, 0);
      const hall = new THREE.BoxGeometry(1.2, 0.7, 1.0);
      hall.translate(-0.15, 0.49, 0);
      const roof = new THREE.ConeGeometry(1.0, 0.5, 4);
      roof.rotateY(Math.PI / 4);
      roof.translate(-0.15, 1.09, 0);
      const chimney = new THREE.CylinderGeometry(0.18, 0.24, 0.9 + tier * 0.12, 8);
      chimney.translate(0.45, 0.6 + tier * 0.06, -0.35);
      const anvil = new THREE.BoxGeometry(0.32, 0.24, 0.22);
      anvil.translate(0.45, 0.26, 0.4);
      geo = safeMerge([base, hall, roof, chimney, anvil]);
      break;
    }
    case 'food_storage': {
      const base = new THREE.BoxGeometry(1.65, 0.14, 1.65);
      base.translate(0, 0.07, 0);
      const body = new THREE.BoxGeometry(1.25, 0.8 + tier * 0.08, 1.25);
      body.translate(0, 0.54 + tier * 0.04, 0);
      const roof = new THREE.ConeGeometry(1.12, 0.55, 4);
      roof.rotateY(Math.PI / 4);
      roof.translate(0, 1.2 + tier * 0.08, 0);
      geo = safeMerge([base, body, roof]);
      break;
    }
    case 'armory': {
      const base = new THREE.BoxGeometry(1.7, 0.18, 1.7);
      base.translate(0, 0.09, 0);
      const keep = new THREE.BoxGeometry(1.3, 0.85 + tier * 0.08, 1.15);
      keep.translate(0, 0.6 + tier * 0.04, 0);
      const battlement = new THREE.BoxGeometry(1.42, 0.18, 1.26);
      battlement.translate(0, 1.1 + tier * 0.08, 0);
      geo = safeMerge([base, keep, battlement]);
      break;
    }
    case 'house': {
      const base = new THREE.BoxGeometry(1.5, 0.1, 1.5);
      base.translate(0, 0.05, 0);
      const body = new THREE.BoxGeometry(1.05, 0.58, 0.95);
      body.translate(0, 0.39, 0);
      const roof = new THREE.ConeGeometry(0.92, 0.5, 4);
      roof.rotateY(Math.PI / 4);
      roof.translate(0, 0.92, 0);
      geo = safeMerge([base, body, roof]);
      break;
    }
    case 'barracks': {
      const yard = new THREE.BoxGeometry(2.6, 0.12, 2.6);
      yard.translate(0, 0.06, 0);
      const hall = new THREE.BoxGeometry(1.8, 0.72, 1.0);
      hall.translate(0, 0.48, -0.55);
      const roof = new THREE.ConeGeometry(1.4, 0.55, 4);
      roof.rotateY(Math.PI / 4);
      roof.translate(0, 1.1, -0.55);
      const post1 = new THREE.CylinderGeometry(0.05, 0.06, 0.7, 6);
      post1.translate(-0.7, 0.47, 0.65);
      const post2 = new THREE.CylinderGeometry(0.05, 0.06, 0.7, 6);
      post2.translate(0.7, 0.47, 0.65);
      geo = safeMerge([yard, hall, roof, post1, post2]);
      break;
    }
    case 'wall': {
      const wallHeight = 0.7 + tier * 0.12;
      const body = new THREE.BoxGeometry(0.92, wallHeight, 0.92);
      body.translate(0, wallHeight / 2, 0);
      const cap = new THREE.BoxGeometry(0.98, 0.12, 0.98);
      cap.translate(0, wallHeight + 0.06, 0);
      geo = safeMerge([body, cap]);
      break;
    }
    case 'gate': {
      const h = 1.05 + tier * 0.1;
      const pillarL = new THREE.BoxGeometry(0.42, h, 0.72);
      pillarL.translate(-0.7, h / 2, 0);
      const pillarR = new THREE.BoxGeometry(0.42, h, 0.72);
      pillarR.translate(0.7, h / 2, 0);
      const lintel = new THREE.BoxGeometry(1.9, 0.28, 0.78);
      lintel.translate(0, h + 0.14, 0);
      const door = new THREE.BoxGeometry(0.96, h * 0.72, 0.22);
      door.translate(0, (h * 0.72) / 2, 0);
      geo = safeMerge([pillarL, pillarR, lintel, door]);
      break;
    }
    case 'watchtower': {
      const base = new THREE.BoxGeometry(1.4, 0.2, 1.4);
      base.translate(0, 0.1, 0);
      const towerH = 1.35 + tier * 0.18;
      const shaft = new THREE.BoxGeometry(0.82, towerH, 0.82);
      shaft.translate(0, 0.2 + towerH / 2, 0);
      const deck = new THREE.BoxGeometry(1.22, 0.22, 1.22);
      deck.translate(0, 0.2 + towerH + 0.11, 0);
      const roof = new THREE.ConeGeometry(0.95, 0.52, 4);
      roof.rotateY(Math.PI / 4);
      roof.translate(0, 0.2 + towerH + 0.48, 0);
      geo = safeMerge([base, shaft, deck, roof]);
      break;
    }
    case 'spike_trap': {
      const pad = new THREE.BoxGeometry(0.85, 0.06, 0.85);
      pad.translate(0, 0.03, 0);
      const spikes: THREE.BufferGeometry[] = [pad];
      const offsets = [
        [-0.24, -0.24],
        [0.24, -0.24],
        [-0.24, 0.24],
        [0.24, 0.24],
        [0, 0],
      ];
      for (const [ox, oz] of offsets) {
        const spike = new THREE.ConeGeometry(0.08, 0.42 + tier * 0.05, 5);
        spike.translate(ox, 0.24, oz);
        spikes.push(spike);
      }
      geo = safeMerge(spikes);
      break;
    }
  }

  cachedBuildingGeos.set(key, geo);
  return geo;
}

export function getBuildingColor(type: BaseBuildingType, isEnemy: boolean): number {
  switch (type) {
    case 'main_hall':
      return isEnemy ? DIORAMA_PALETTE.mingBanner : DIORAMA_PALETTE.lamSonBanner;
    case 'farm':
      return 0x89a84f;
    case 'forge':
      return 0x9c4a2d;
    case 'food_storage':
      return 0xd1a049;
    case 'armory':
      return 0x67727e;
    case 'house':
      return 0xc99c6b;
    case 'barracks':
      return isEnemy ? 0x3b5978 : 0xb34737;
    case 'wall':
      return 0x7c6e5d;
    case 'gate':
      return 0x6b472b;
    case 'watchtower':
      return isEnemy ? 0x455a75 : 0x8f5b34;
    case 'spike_trap':
      return 0x594a3c;
  }
}
