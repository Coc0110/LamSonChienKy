import { mapArmiesToBattlefield } from '../battlefieldArmyMapper';
import type { TacticalFormation } from '../../types/armyFormation';
import type { General } from '../../types';

function assert(condition: any, message?: string) {
  if (!condition) throw new Error(message || 'Assertion failed');
}
assert.strictEqual = (a: any, b: any, msg?: string) => {
  if (a !== b) throw new Error(`${msg || 'Assertion failed'}: ${a} !== ${b}`);
};
assert.ok = (a: any, msg?: string) => {
  if (!a) throw new Error(msg || 'Assertion failed');
};

console.log('--- Đang kiểm thử battlefieldArmyMapper ---');

// Mock data đạo quân Lam Sơn
const mockFormation: TacticalFormation = {
  id: 'form_1',
  name: 'Tiền Phong Doanh',
  cityId: 'lam_son',
  rows: 32,
  cols: 32,
  grid: Array.from({ length: 32 }, () => Array(32).fill(null)),
  assignedGeneralIds: ['le_loi'],
  commanderGeneralId: 'le_loi',
  status: 'stationed',
  createdAt: Date.now(),
  totalTroops: 47,
  totalWeapons: 27,
  totalHorses: 0,
  totalElephants: 0,
  totalFoodCarried: 100,
};

// Đặt 1 kiếm binh tại (col: 10, row: 15) và 1 cung thủ tại (col: 8, row: 15) xen kẽ
mockFormation.grid[15][10] = {
  id: 'unit_sword_1',
  parentUnitId: 'unit_sword_1',
  type: 'swordsman',
  name: 'Đao Khiên Binh',
  rootRow: 15,
  rootCol: 10,
  col: 10,
  row: 15,
  isRoot: true,
  offsetCol: 0,
  offsetRow: 0,
  multiplier: 15,
  hp: 150,
  maxHp: 150,
  morale: 100,
  weaponsBreakdown: { swords: 15, bows: 0, spears: 0 },
};

mockFormation.grid[15][8] = {
  id: 'unit_bow_1',
  parentUnitId: 'unit_bow_1',
  type: 'archer',
  name: 'Cung Nỏ Binh',
  rootRow: 15,
  rootCol: 8,
  col: 8,
  row: 15,
  isRoot: true,
  offsetCol: 0,
  offsetRow: 0,
  multiplier: 12,
  hp: 120,
  maxHp: 120,
  morale: 100,
  weaponsBreakdown: { swords: 0, bows: 12, spears: 0 },
};

// Đặt chủ tướng Lê Lợi tại (col: 5, row: 16)
mockFormation.grid[16][5] = {
  id: 'unit_general_1',
  parentUnitId: 'unit_general_1',
  type: 'general',
  name: 'Chủ Tướng',
  generalId: 'le_loi',
  rootRow: 16,
  rootCol: 5,
  col: 5,
  row: 16,
  isRoot: true,
  offsetCol: 0,
  offsetRow: 0,
  multiplier: 20,
  hp: 300,
  maxHp: 300,
  morale: 100,
};

const mockGenerals: General[] = [
  {
    id: 'le_loi',
    name: 'Lê Lợi',
    title: 'Bình Định Vương',
    hanzi: '黎利',
    epithet: 'Chủ Tướng',
    group: 'lung_nhai_1416',
    stars: 5,
    starTier: 'red',
    joinYear: 1416,
    joinMonth: 1,
    joinDay: 1,
    unlocked: true,
    locationId: 'lam_son',
    stats: { command: 95, martial: 85, intellect: 92 },
    specialty: 'Khích lệ sĩ khí',
    lore: 'Bình Định Vương khởi nghĩa Lam Sơn',
  },
];

// Chạy hàm ánh xạ
const units = mapArmiesToBattlefield(mockFormation, mockGenerals, 1000, '1x');

// 1. Kiểm tra quân Lam Sơn được bảo toàn 100% tọa độ và quân số
const lsUnits = units.filter(u => u.faction === 'lam_son');
assert.strictEqual(lsUnits.length, 3, 'Phải có đúng 3 đơn vị Lam Sơn');

const swordUnit = lsUnits.find(u => u.unitTypeId === 'swordsman');
assert.ok(swordUnit, 'Phải có đơn vị kiếm');
assert.strictEqual(swordUnit?.col, 16, 'Tọa độ cột kiếm sau khi xoay 90 độ hướng sang phải là 16');
assert.strictEqual(swordUnit?.row, 10, 'Tọa độ hàng kiếm sau khi xoay 90 độ là 10');
assert.strictEqual(swordUnit?.soldiersCount, 15, 'Quân số kiếm phải là 15');

const generalUnit = lsUnits.find(u => u.unitTypeId === 'general');
assert.ok(generalUnit, 'Phải có đơn vị tướng');
assert.strictEqual(generalUnit?.generalName, 'Lê Lợi', 'Tên tướng phải là Lê Lợi');
assert.ok((generalUnit?.commandAuraRadius || 0) > 0, 'Tướng phải có hào quang chỉ huy');
console.log('✓ Quân Lam Sơn được bảo toàn nguyên vẹn 100% tọa độ và chỉ số');

// 2. Kiểm tra quân Minh được sinh ở cánh phải (Cột 64..95)
const mingUnits = units.filter(u => u.faction === 'ming');
assert.ok(mingUnits.length > 0, 'Phải sinh ra quân Minh');
for (const m of mingUnits) {
  assert.ok(m.col >= 64 && m.col <= 95, `Quân Minh phải ở cánh phải (Cột 64..95), hiện tại là ${m.col}`);
  assert.ok(m.row >= 0 && m.row <= 31, `Hàng quân Minh phải trong phạm vi 0..31, hiện tại là ${m.row}`);
}
console.log('✓ Quân Minh được sinh chuẩn xác tại Cột 64–95');

// 3. Kiểm tra cấp độ 1x và 10x (Trọng lượng quân cờ chuẩn 1, 10, 100)
const ming1xAvg = mingUnits.reduce((acc, u) => acc + u.soldiersCount, 0) / mingUnits.length;
assert.strictEqual(ming1xAvg, 1, 'Cấp 1x mỗi quân cờ quân Minh phải đại diện đúng 1 người lính');

const units10x = mapArmiesToBattlefield(mockFormation, mockGenerals, 8000, '10x');
const ming10x = units10x.filter(u => u.faction === 'ming');
const avgMingSoldiers = ming10x.reduce((acc, u) => acc + u.soldiersCount, 0) / ming10x.length;
assert.strictEqual(avgMingSoldiers, 10, `Cấp 10x mỗi quân cờ quân Minh phải đại diện đúng 10 người lính (thực tế: ${avgMingSoldiers})`);
console.log('✓ Trọng lượng quân cờ chuẩn xác tuyệt đối: 1x = 1 người/quân, 10x = 10 người/quân');

console.log('>>> Toàn bộ test battlefieldArmyMapper THÀNH CÔNG! <<<');
