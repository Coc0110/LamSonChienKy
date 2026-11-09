import assert from 'node:assert';
import { mapArmiesToBattlefield } from '../battlefieldArmyMapper';
import type { TacticalFormation } from '../../types/armyFormation';
import type { General } from '../../types';

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
};

// Đặt 1 kiếm binh tại (col: 10, row: 15) và 1 cung thủ tại (col: 8, row: 15) xen kẽ
mockFormation.grid[15][10] = {
  id: 'unit_sword_1',
  unitTypeId: 'swordsman',
  soldiersCount: 15,
  col: 10,
  row: 15,
  spanCols: 1,
  spanRows: 1,
  isRoot: true,
  offsetCol: 0,
  offsetRow: 0,
  hp: 150,
  maxHp: 150,
  morale: 100,
  weaponsBreakdown: { swords: 15, bows: 0, spears: 0 },
};

mockFormation.grid[15][8] = {
  id: 'unit_bow_1',
  unitTypeId: 'archer',
  soldiersCount: 12,
  col: 8,
  row: 15,
  spanCols: 1,
  spanRows: 1,
  isRoot: true,
  offsetCol: 0,
  offsetRow: 0,
  hp: 120,
  maxHp: 120,
  morale: 100,
  weaponsBreakdown: { swords: 0, bows: 12, spears: 0 },
};

// Đặt chủ tướng Lê Lợi tại (col: 5, row: 16)
mockFormation.grid[16][5] = {
  id: 'unit_general_1',
  unitTypeId: 'general',
  generalId: 'le_loi',
  soldiersCount: 20,
  col: 5,
  row: 16,
  spanCols: 1,
  spanRows: 1,
  isRoot: true,
  offsetCol: 0,
  offsetRow: 0,
  hp: 300,
  maxHp: 300,
  morale: 100,
};

const mockGenerals: General[] = [
  {
    id: 'le_loi',
    name: 'Lê Lợi',
    title: 'Bình Định Vương',
    unlocked: true,
    locationId: 'lam_son',
    stats: { command: 95, martial: 85, intellect: 92, politics: 90 },
    biography: '',
  },
];

// Chạy hàm ánh xạ
const units = mapArmiesToBattlefield(mockFormation, mockGenerals, 1000, '1x');

// 1. Kiểm tra quân Lam Sơn được bảo toàn 100% tọa độ và quân số
const lsUnits = units.filter(u => u.faction === 'lam_son');
assert.strictEqual(lsUnits.length, 3, 'Phải có đúng 3 đơn vị Lam Sơn');

const swordUnit = lsUnits.find(u => u.unitTypeId === 'swordsman');
assert.ok(swordUnit, 'Phải có đơn vị kiếm');
assert.strictEqual(swordUnit?.col, 10, 'Tọa độ cột kiếm phải giữ nguyên là 10');
assert.strictEqual(swordUnit?.row, 15, 'Tọa độ hàng kiếm phải giữ nguyên là 15');
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

// 3. Kiểm tra cấp độ 10x (Trọng lượng quân cờ)
const units10x = mapArmiesToBattlefield(mockFormation, mockGenerals, 8000, '10x');
const ming10x = units10x.filter(u => u.faction === 'ming');
const avgMingSoldiers = ming10x.reduce((acc, u) => acc + u.soldiersCount, 0) / ming10x.length;
assert.ok(avgMingSoldiers >= 50, `Cấp 10x mỗi quân cờ phải có nhiều lính (TB: ${avgMingSoldiers})`);
console.log('✓ Trọng lượng quân cờ cấp 10x phản ánh chuẩn xác quân số dày đặc');

console.log('>>> Toàn bộ test battlefieldArmyMapper THÀNH CÔNG! <<<');
