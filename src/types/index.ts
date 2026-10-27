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

export interface CityPopulation {
  combatTroops: number;       // Nghĩa Binh (người có khả năng tác chiến)
  idleLaborers: number;       // Tráng Phu rảnh rỗi (thanh kéo: Vùng Xanh Lá)
  farmLaborers: number;       // Tráng Phu đang cày cấy tích lương (thanh kéo: Vùng Cam)
  forgeLaborers: number;      // Tráng Phu đang rèn đúc vũ khí (thanh kéo: Vùng Cam)
  swappedCombatants: number;  // Nghĩa Binh đang thế chỗ cho tráng phu đi thao luyện
  unfitPopulation: number;    // Dân cư phi chiến đấu: phụ nữ, người già, trẻ nhỏ (thanh kéo: Vùng Đen)
}

export interface CityBuildings {
  farms: number;              // Đồn điền / Ruộng cày cấy
  forges: number;             // Lò rèn vũ khí bí mật
}

export type StructureType = 'farm' | 'forge';

export type WeaponCraftType = 'sword' | 'bow' | 'spear' | 'armor' | 'crossbow';

export interface ForgeOrder {
  id: string;
  weaponType: WeaponCraftType;
  name: string;
  quantity: number;
  totalDays: number;
  remainingDays: number;
  assignedSmiths: number;
  goldCost: number;
}

export interface PlacedStructure {
  id: string;
  cityId: string;
  type: StructureType;
  name: string;
  x: number;               // Tọa độ % (0..100) trên bản đồ
  y: number;               // Tọa độ % (0..100) trên bản đồ
  gridSize?: number;       // Kích thước ô lưới (3 cho lò rèn; 5, 6, 7 cho ruộng)
  startCol?: number;       // Cột bắt đầu trên bản đồ ô vuông
  startRow?: number;       // Hàng bắt đầu trên bản đồ ô vuông
  terrain: 'plains' | 'forest' | 'mountain' | 'cliff' | 'swamp' | 'water';
  status: 'building' | 'active';
  
  // Xây dựng thi công
  buildDaysTotal: number;
  buildDaysRemaining: number;
  builderWorkers: number;

  // Ruộng cày cấy
  assignedWorkers: number; // Nông đinh đang canh tác
  maxWorkers: number;      // Tối đa tráng phu / 1 khu ruộng (mặc định 15)
  cropDays: number;        // Số ngày sinh trưởng đã qua trong vụ mùa (0..90)
  cropCycleDays: number;   // Chu kỳ mùa vụ (90 ngày ~ 1 vụ Chiêm / vụ Mùa)

  // Lò rèn đúc
  seasonCondition?: 'bountiful' | 'normal' | 'poor';
  activeOrder?: ForgeOrder | null;
  forgeQueue?: ForgeOrder[];
}

export interface TrainingSession {
  generalId: string;          // Vị tướng phụ trách thao luyện
  traineesCount: number;      // Tổng số tráng phu được đưa vào thao luyện
  swappedCount: number;       // Số nghĩa binh phải điều động thế chỗ làm việc
  totalDays: number;          // Tổng số ngày thao luyện
  remainingDays: number;      // Số ngày còn lại
}

export interface CityNode {
  id: string;
  name: string;
  type: NodeType;
  districtId?: string;
  x: number;
  y: number;
  gridSize?: number;       // Kích thước ô lưới (Doanh trại: 3..6, Thành trì: 4..7)
  startCol?: number;       // Cột bắt đầu
  startRow?: number;       // Hàng bắt đầu
  faction: Faction;
  troops: number;
  hasBase?: boolean;          // Đã xây dựng căn cứ chỉ huy (Lam Sơn có sẵn)
  population?: CityPopulation;
  buildings?: CityBuildings;
  training?: TrainingSession | null;
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
