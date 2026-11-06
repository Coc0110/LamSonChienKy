export interface Resources {
  troops: number;
  horses: number;
  elephants: number;
  food: number;
  weapons: number;
  swords: number;
  bows: number;
  spears: number;
  clothes: number;
  gold: number;
  morale: number;
}

export type TimeMode = 'pause' | 'day' | 'hour';
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
  isUpgrading?: boolean;

  // Ruộng cày cấy
  assignedWorkers: number; // Nông đinh đang canh tác
  maxWorkers: number;      // Tối đa tráng phu / 1 khu ruộng (mặc định 15)
  cropDays: number;        // Số ngày thực tế đã canh tác từ khi ruộng đi vào hoạt động đến ngày vụ mùa
  cropCycleDays: number;   // Chu kỳ mùa vụ
  lastHarvestYield?: number; // Sản lượng thu hoạch vụ gần nhất
  recentEvent?: string;     // Biến cố thửa ruộng (phù sa, sâu bọ, v.v.)

  // Lò rèn đúc
  seasonCondition?: 'bountiful' | 'normal' | 'poor';
  activeOrder?: ForgeOrder | null;
  forgeQueue?: ForgeOrder[];
}

export interface TrainingSession {
  generalId: string;          // Vị tướng phụ trách thao luyện
  traineesCount: number;      // Tổng số tráng phu được đưa vào thao luyện
  swappedCount: number;       // Số nghĩa binh phải điều động thế chỗ làm việc
  takenFromFarm?: number;     // Số nông đinh rút từ ruộng đi thao luyện
  takenFromForge?: number;    // Số thợ rèn rút từ lò đi thao luyện
  weaponsUsed?: {             // Số lượng từng loại vũ khí đã xuất kho cho đợt thao luyện
    swords: number;
    bows: number;
    spears: number;
  };
  totalDays: number;          // Tổng số ngày thao luyện
  remainingDays: number;      // Số ngày còn lại
}

export interface CampUpgradeSession {
  targetLevel: number;
  remainingDays: number;
  totalDays: number;
  builders: number;
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
  level?: number;             // Cấp bậc căn cứ doanh trại (Cấp 1: 500, Cấp 2: 1000, Cấp 3: 2000, Cấp 4: 5000)
  assignedScouts?: number;    // Số quân do thám đang cắm chốt tại thành trì này
  upgrading?: CampUpgradeSession | null; // Tiến trình nâng cấp căn cứ
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
  starTier: StarTier;     // Bậc sao: 'silver' (Bạc) | 'gold' | 'red' (Đỏ)
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

export type NoticeType = 'harvest' | 'forge' | 'build' | 'general' | 'combat';

export interface MilitaryNotice {
  id: string;
  type: NoticeType;
  weaponType?: WeaponCraftType;
  title: string;
  dateStr: string;
  description: string;
  read: boolean;
  timestamp: number;
}

export * from './armyFormation';

// ============================================================================
// HỆ THỐNG SỨC CHỨA CĂN CỨ & TÌNH BÁO THÁM MÃ (PRE-UPRISING MECHANICS)
// ============================================================================

export const CAMP_CAPACITY_BY_LEVEL: Record<number, number> = {
  1: 500,
  2: 1000,
  3: 2000,
  4: 5000,
};

export const CAMP_UPGRADE_COSTS: Record<number, { gold: number; food: number; workers: number; days: number }> = {
  2: { gold: 120, food: 300, workers: 25, days: 25 },
  3: { gold: 250, food: 600, workers: 40, days: 40 },
  4: { gold: 500, food: 1200, workers: 60, days: 60 },
};

export const getMaxScoutsNeeded = (troops: number): number => {
  if (troops >= 8000) return 4;
  if (troops >= 2000) return 3;
  return 2;
};

export interface CityIntelReport {
  level: 0 | 1 | 2 | 3 | 4;
  scouts: number;
  maxScouts: number;
  displayedTroops: string;
  displayedSuspicion: string;
  canBribe: boolean;
}

export const getCityIntelReport = (cityTroops: number, scouts: number, actualSuspicion: number): CityIntelReport => {
  if (cityTroops <= 0) {
    return {
      level: 4,
      scouts,
      maxScouts: 1,
      displayedTroops: '0 quân',
      displayedSuspicion: '0%',
      canBribe: false,
    };
  }

  const maxScouts = getMaxScoutsNeeded(cityTroops);
  const effectiveScouts = Math.min(scouts, maxScouts);
  const ratio = maxScouts > 0 ? effectiveScouts / maxScouts : 1;

  if (effectiveScouts === 0) {
    return {
      level: 0,
      scouts: 0,
      maxScouts,
      displayedTroops: 'Chưa rõ lực lượng',
      displayedSuspicion: 'Tuyệt mật (Chưa rõ)',
      canBribe: false,
    };
  }

  if (ratio < 0.35) {
    // 1 / 4 hoặc 1 / 3
    const tier1Troops = Math.min(cityTroops, Math.max(200, Math.floor(cityTroops * 0.25 / 100) * 100));
    const suspFloor = Math.floor(actualSuspicion / 10) * 10;
    return {
      level: 1,
      scouts: effectiveScouts,
      maxScouts,
      displayedTroops: `> ${tier1Troops.toLocaleString()} quân`,
      displayedSuspicion: actualSuspicion < 15 ? '< 15%' : `> ${suspFloor}%`,
      canBribe: true,
    };
  }

  if (ratio < 0.68) {
    // 2 / 4 hoặc 2 / 3
    const tier2Troops = Math.min(cityTroops, Math.max(400, Math.floor(cityTroops * 0.5 / 100) * 100));
    const suspFloor = Math.floor(actualSuspicion / 5) * 5;
    return {
      level: 2,
      scouts: effectiveScouts,
      maxScouts,
      displayedTroops: `> ${tier2Troops.toLocaleString()} quân`,
      displayedSuspicion: `> ${suspFloor}%`,
      canBribe: true,
    };
  }

  if (ratio < 1.0) {
    // 3 / 4
    const tier3Troops = Math.min(cityTroops, Math.max(800, Math.floor(cityTroops * 0.75 / 100) * 100));
    return {
      level: 3,
      scouts: effectiveScouts,
      maxScouts,
      displayedTroops: `> ${tier3Troops.toLocaleString()} quân`,
      displayedSuspicion: `~${Math.round(actualSuspicion)}%`,
      canBribe: true,
    };
  }

  // Đủ thám mã tối đa
  return {
    level: 4,
    scouts: effectiveScouts,
    maxScouts,
    displayedTroops: `~${cityTroops.toLocaleString()} quân`,
    displayedSuspicion: `${Math.round(actualSuspicion)}%`,
    canBribe: true,
  };
};

export const getBriberyCostAndEffect = (bribeCount: number) => {
  const cost = 100 + bribeCount * 60;
  const reduction = Math.max(8, 22 - bribeCount * 3);
  return { cost, reduction };
};

// Nhiệm vụ thám mã đang di chuyển trên bản đồ đến mục tiêu
export interface ScoutMission {
  id: string;
  originCityId: string;
  originCityName: string;
  targetCityId: string;
  targetCityName: string;
  scoutCount: number;
  foodCost: number;
  path: import('./armyFormation').MarchPathCell[];
  currentCellIndex: number;
  cellProgress: number; // 0..1 trong ô hiện tại
  currentPos: { x: number; y: number; col: number; row: number };
  totalDays: number;
  daysRemaining: number;
  status: 'traveling' | 'arrived';
}

// Đoàn lưu dân đang chờ ngoài cổng căn cứ xin quy phụ
export interface PendingRefugeeWave {
  id: string;
  cityId: string;           // Căn cứ nơi lưu dân tìm đến (mặc định 'lam_son')
  cityName: string;
  dateStr: string;
  totalCount: number;       // Tổng số người (ví dụ: 18)
  idleCount: number;        // Số tráng đinh (ví dụ: 15)
  unfitCount: number;       // Số người già, phụ nữ, trẻ nhỏ (ví dụ: 3)
  foodCost: number;         // Lượng lương thực cần xuất kho cứu tế (1 thạch/người)
  goldContribution?: number;// Lượng bạc vàng lưu dân mang theo ủng hộ nghĩa quân (ví dụ: 5 - 15 Vàng)
  originName: string;       // Địa phương trốn chạy: "Triệu Hóa", "Quảng Hóa", "Nông Cống", v.v.
  story: string;            // Lý do quy phụ
  timestamp: number;
  daysRemaining: number;    // Thời gian lưu lại ngoài cổng (mặc định 30 ngày / ~1 tháng, sau đó tự rời đi)
  departed?: boolean;       // Đã hết thời hạn chờ ngoài cổng, rời đi
}
