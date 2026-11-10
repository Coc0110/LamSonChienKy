import { resolveBattlefieldTick } from '../battlefieldCombatEngine';
import { generateBattlefieldTerrain } from '../battlefieldTerrainGenerator';
import type { BattlefieldState, BattlefieldUnit } from '../../types/battlefield';

function assert(condition: any, message?: string) {
  if (!condition) throw new Error(message || 'Assertion failed');
}
assert.strictEqual = (a: any, b: any, msg?: string) => {
  if (a !== b) throw new Error(`${msg || 'Assertion failed'}: ${a} !== ${b}`);
};
assert.ok = (a: any, msg?: string) => {
  if (!a) throw new Error(msg || 'Assertion failed');
};

console.log('--- Đang kiểm thử battlefieldCombatEngine ---');

const mockGrid = generateBattlefieldTerrain(400, 500, '1x');

const lsArcher: BattlefieldUnit = {
  id: 'ls_archer',
  formationId: 'f1',
  faction: 'lam_son',
  unitTypeId: 'archer',
  col: 10,
  row: 15,
  spanCols: 1,
  spanRows: 1,
  soldiersCount: 20,
  maxSoldiersCount: 20,
  hp: 200,
  maxHp: 200,
  morale: 100,
  weaponsBreakdown: { swords: 0, bows: 20, spears: 0 },
  status: 'holding',
};

const mingSwordsman: BattlefieldUnit = {
  id: 'ming_sword',
  formationId: 'f_ming',
  faction: 'ming',
  unitTypeId: 'swordsman',
  col: 13,
  row: 15,
  spanCols: 1,
  spanRows: 1,
  soldiersCount: 50,
  maxSoldiersCount: 50,
  hp: 500,
  maxHp: 500,
  morale: 100,
  weaponsBreakdown: { swords: 50, bows: 0, spears: 0 },
  status: 'advancing',
};

const initialBattle: BattlefieldState = {
  id: 'battle_1',
  battleName: 'Tập Kích Cửa Ải',
  locationName: 'Ải Chi Lăng',
  scale: '1x',
  grid: mockGrid,
  units: [lsArcher, mingSwordsman],
  turn: 0,
  maxTurns: 30,
  phase: 'in_progress',
  lamSonMorale: 100,
  mingMorale: 100,
  initialLamSonSoldiers: 20,
  initialMingSoldiers: 50,
  casualties: {
    lamSonKilled: 0,
    mingKilled: 0,
    weaponsLost: 0,
    weaponsCaptured: 0,
    foodCaptured: 0,
    goldCaptured: 0,
  },
  logs: [],
};

const nextBattle = resolveBattlefieldTick(initialBattle);

assert.strictEqual(nextBattle.turn, 1, 'Lượt phải tăng lên 1');

const updatedMing = nextBattle.units.find(u => u.id === 'ming_sword');
assert.ok(updatedMing, 'Quân Minh phải còn tồn tại');
assert.ok((updatedMing?.hp || 0) < 500, `Quân Minh phải bị trừ máu do trúng tên (HP còn lại: ${updatedMing?.hp})`);
console.log('✓ Cung thủ bắn tỉa chính xác từ khoảng cách 3 ô');

assert.ok(nextBattle.logs.length > 0, 'Phải có ghi nhận nhật ký giao tranh');
console.log('✓ Nhật ký chiến trận ghi nhận đầy đủ sự kiện');


// 2. Kiểm tra Cung thủ và Tướng tự động hành quân tiến về cự ly lý tưởng khi ở xa
const farArcher: BattlefieldUnit = {
  id: 'ls_far_archer',
  formationId: 'f1',
  faction: 'lam_son',
  unitTypeId: 'archer',
  col: 10,
  row: 10,
  spanCols: 1,
  spanRows: 1,
  soldiersCount: 20,
  maxSoldiersCount: 20,
  hp: 200,
  maxHp: 200,
  morale: 100,
  status: 'advancing',
};

const farGeneral: BattlefieldUnit = {
  id: 'ls_far_general',
  formationId: 'f1',
  faction: 'lam_son',
  unitTypeId: 'general',
  col: 8,
  row: 10,
  spanCols: 1,
  spanRows: 1,
  soldiersCount: 1,
  maxSoldiersCount: 1,
  hp: 100,
  maxHp: 100,
  morale: 100,
  status: 'advancing',
};

const distantMing: BattlefieldUnit = {
  id: 'ming_distant',
  formationId: 'f_ming',
  faction: 'ming',
  unitTypeId: 'swordsman',
  col: 30,
  row: 10,
  spanCols: 1,
  spanRows: 1,
  soldiersCount: 50,
  maxSoldiersCount: 50,
  hp: 500,
  maxHp: 500,
  morale: 100,
  status: 'advancing',
};

const farBattle: BattlefieldState = {
  ...initialBattle,
  id: 'battle_far',
  units: [farArcher, farGeneral, distantMing],
};

const farStep1 = resolveBattlefieldTick(farBattle);
const steppedArcher = farStep1.units.find(u => u.id === 'ls_far_archer')!;
const steppedGeneral = farStep1.units.find(u => u.id === 'ls_far_general')!;

assert.ok(steppedArcher.col > 10, `Cung thủ phải tiến về phía trước (Cột hiện tại: ${steppedArcher.col})`);
assert.ok(steppedGeneral.col > 8, `Tướng chỉ huy phải tiến theo đạo quân (Cột hiện tại: ${steppedGeneral.col})`);
console.log('✓ Cung thủ và Tướng tự động hành quân tiến về phía mặt trận');


// 3. Kiểm tra Xe Lương hành quân thẳng hàng cùng đội hình, không làm rối hoặc lệch hàng ngũ
const frontSword: BattlefieldUnit = {
  id: 'ls_front_sword',
  formationId: 'f1',
  faction: 'lam_son',
  unitTypeId: 'swordsman',
  col: 15,
  row: 10,
  spanCols: 1,
  spanRows: 1,
  soldiersCount: 1,
  maxSoldiersCount: 1,
  hp: 10,
  maxHp: 10,
  morale: 100,
  status: 'advancing',
};

const midCart: BattlefieldUnit = {
  id: 'ls_mid_cart',
  formationId: 'f1',
  faction: 'lam_son',
  unitTypeId: 'supply_cart',
  col: 14,
  row: 10,
  spanCols: 1,
  spanRows: 1,
  soldiersCount: 1,
  maxSoldiersCount: 1,
  hp: 20,
  maxHp: 20,
  morale: 100,
  status: 'advancing',
};

const rearSword: BattlefieldUnit = {
  id: 'ls_rear_sword',
  formationId: 'f1',
  faction: 'lam_son',
  unitTypeId: 'swordsman',
  col: 13,
  row: 10,
  spanCols: 1,
  spanRows: 1,
  soldiersCount: 1,
  maxSoldiersCount: 1,
  hp: 10,
  maxHp: 10,
  morale: 100,
  status: 'advancing',
};

const lineEnemy: BattlefieldUnit = {
  id: 'ming_target',
  formationId: 'f_ming',
  faction: 'ming',
  unitTypeId: 'swordsman',
  col: 28,
  row: 10,
  spanCols: 1,
  spanRows: 1,
  soldiersCount: 1,
  maxSoldiersCount: 1,
  hp: 10,
  maxHp: 10,
  morale: 100,
  status: 'advancing',
};

const columnBattle: BattlefieldState = {
  ...initialBattle,
  id: 'battle_column_march',
  units: [frontSword, midCart, rearSword, lineEnemy],
};

const marchStep1 = resolveBattlefieldTick(columnBattle);
const steppedFront = marchStep1.units.find(u => u.id === 'ls_front_sword')!;
const steppedCart = marchStep1.units.find(u => u.id === 'ls_mid_cart')!;
const steppedRear = marchStep1.units.find(u => u.id === 'ls_rear_sword')!;

assert.strictEqual(steppedFront.col, 16, 'Tiền phong phải tiến lên cột 16');
assert.strictEqual(steppedFront.row, 10, 'Tiền phong phải giữ nguyên hàng 10');

assert.strictEqual(steppedCart.col, 15, 'Xe lương phải tiến vào ô cột 15 vừa nhường');
assert.strictEqual(steppedCart.row, 10, 'Xe lương phải giữ nguyên hàng 10, không bị lệch');

assert.strictEqual(steppedRear.col, 14, 'Hậu quân phải tiến vào ô cột 14 vừa nhường');
assert.strictEqual(steppedRear.row, 10, 'Hậu quân phải giữ nguyên hàng 10, không phải lách tránh xe lương');
console.log('✓ Xe lương và quân đội hành quân tuần tự thẳng hàng, bảo toàn 100% cự ly đội hình');

console.log('>>> Toàn bộ test battlefieldCombatEngine THÀNH CÔNG! <<<');
