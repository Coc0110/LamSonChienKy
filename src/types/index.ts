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

export type GeneralGroup = 'lung_nhai_1416' | 'khoi_nghia_1418' | 'quy_tu_1420_1426';
export type StarTier = 'silver' | 'gold' | 'red';
export type TroopType = 'infantry' | 'cavalry' | 'archer' | 'elephant' | 'navy';

export interface General {
  id: string;
  name: string;
  hanzi: string;          // Chữ Hán khắc dọc trên thẻ đồng (dùng khi chưa có ảnh)
  portraitUrl?: string;   // Đường dẫn ảnh phù điêu khắc đồng ở giữa thẻ
  title: string;          // Chức tước / Biệt danh khắc ngang phía trên
  epithet: string;        // Danh hiệu chiến trường
  group: GeneralGroup;
  stars: number;          // Số sao (1 - 5 sao)
  starTier: StarTier;     // Bậc sao: 'silver' (Bạc) | 'gold' (Vàng) | 'red' (Đỏ)
  joinYear: number;
  joinMonth: number;
  joinDay: number;
  deathYear?: number;
  unlocked: boolean;
  locationId: string;     // ID cứ điểm đang đóng quân
  stats: {
    command: number;      // Thống lĩnh (1-100)
    martial: number;      // Võ nghệ (1-100)
    intellect: number;    // Mưu lược (1-100)
  };
  specialty: string;      // Kỹ năng / Hiệu ứng đặc biệt
  lore: string;           // Điển tích ngắn
  // Cân bằng game & Hiển thị mặt sau thẻ đồng:
  buffName?: string;      // Tên ngắn gọn của Buff / Đặc kỹ (mặt sau thẻ)
  troops?: TroopType[];   // Binh chủng sở trường (icon phát sáng mặt sau thẻ)

  // Thông tin mở rộng cho Cuộn Thư Danh Tướng (Dossier Scroll):
  birthYear?: number;
  hometown?: string;
  buffDescription?: string;
  historicalEvents?: string[];
}

export interface RecruitmentEventNotice {
  id: string;
  title: string;
  dateStr: string;
  description: string;
  generalIds: string[];
}
