export interface Resources {
  troops: number;
  horses: number;
  elephants: number;
  food: number;
  weapons: number;
  clothes: number;
  gold: number;
  morale: number;
}

export type Faction = 'lam_son' | 'ming' | 'neutral';
export type NodeType = 'city' | 'camp' | 'chokepoint';

export interface CityNode {
  id: string;
  name: string;
  type: NodeType;
  x: number;
  y: number;
  faction: Faction;
  troops: number;
}

export interface Connection {
  from: string;
  to: string;
  waypoints?: [number, number][]; // Mảng các tọa độ [x, y] để vẽ đường cong
}
