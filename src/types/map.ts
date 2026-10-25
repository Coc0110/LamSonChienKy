import type { Faction } from './index';

export type ParchmentMode = 'cutout' | 'sheet' | 'off';

export interface DistrictInfo {
  id: string;
  name: string;
  chau: string;
  faction: Faction;
  type: string;
  troops: number;
  center: [number, number];
  polygon: [number, number][];
}
