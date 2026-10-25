import type { TroopType } from './index';

export type TerrainType = 'plains' | 'forest' | 'mountain' | 'cliff' | 'swamp' | 'water';

export interface TerrainTroopModifier {
  infantry: number; // Hệ số hiệu quả chiến đấu của Bộ binh
  cavalry: number;  // Kỵ binh (sa lầy ở đầm/rừng, mạnh ở đồng bằng)
  archer: number;   // Cung thủ (lợi thế tầm cao ở đồi núi, cản tầm nhìn ở rừng)
  elephant: number; // Tượng binh (vướng víu ở rừng, sa lầy ở đầm)
  navy: number;     // Thủy quân (mạnh trên thủy đạo/đầm lầy)
}

export interface TerrainProperties {
  type: TerrainType;
  name: string;
  nameHanzi: string;
  description: string;
  tacticalTip: string;
  moveSpeedCost: number;     // Hệ số tiêu hao thời gian (1.0 = bình thường, 2.0 = đi chậm gấp đôi)
  defenseBonus: number;      // % Tăng phòng thủ cho quân phòng thủ (+30%...)
  ambushSuccessRate: number; // % Khả năng phục kích thành công
  troopModifier: TerrainTroopModifier;
  color: string;
  fillColor: string;
  badgeBg: string;
}

export interface TerrainZone {
  id: string;
  name: string;
  type: TerrainType;
  polygon: [number, number][]; // Mảng tọa độ phần trăm [x, y] (0..100)
  description: string;
}

export interface MarchSegment {
  fromNode: string;
  toNode: string;
  distanceKm: number;
  dominantTerrain: TerrainType;
  terrainFactor: number;
  tacticalNotes: string;
}

export interface MarchCalculationResult {
  fromCityId: string;
  toCityId: string;
  fromCityName: string;
  toCityName: string;
  totalDistanceKm: number;
  totalDays: number;
  primaryTroop: TroopType;
  terrainBreakdown: Record<TerrainType, number>; // Tỷ lệ % từng loại địa hình trên lộ trình
  segments: MarchSegment[];
  hazards: string[];
  tacticalAdvantage: string;
  pathPoints?: [number, number][]; // Tọa độ chi tiết từng điểm trên đường hành quân ([x, y] %)
}
