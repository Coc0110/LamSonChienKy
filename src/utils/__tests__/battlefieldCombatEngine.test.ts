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

// 4. Kiểm tra Nghĩa quân Lam Sơn chiến đấu đến cùng, không bao giờ vỡ trận tháo lui hay tự nhận thua khi còn quân
const lowMoraleLS: BattlefieldUnit = {
  id: 'ls_last_stand',
  formationId: 'f1',
  faction: 'lam_son',
  unitTypeId: 'swordsman',
  col: 10,
  row: 10,
  spanCols: 1,
  spanRows: 1,
  soldiersCount: 1,
  maxSoldiersCount: 100,
  hp: 5,
  maxHp: 1000,
  morale: 5,
  status: 'holding',
};

const farAwayMing: BattlefieldUnit = {
  id: 'ming_distant_2',
  formationId: 'f_ming',
  faction: 'ming',
  unitTypeId: 'swordsman',
  col: 30,
  row: 10,
  spanCols: 1,
  spanRows: 1,
  soldiersCount: 1000,
  maxSoldiersCount: 1000,
  hp: 10000,
  maxHp: 10000,
  morale: 100,
  status: 'advancing',
};

const desperateBattle: BattlefieldState = {
  ...initialBattle,
  id: 'battle_last_stand',
  turn: 35,
  maxTurns: 999,
  initialLamSonSoldiers: 1000,
  initialMingSoldiers: 1000,
  lamSonMorale: 5,
  units: [lowMoraleLS, farAwayMing],
};

const desperateStep = resolveBattlefieldTick(desperateBattle);
const standingLS = desperateStep.units.find(u => u.id === 'ls_last_stand')!;
assert.ok(standingLS.status !== 'routing', 'Nghĩa quân Lam Sơn không bao giờ bị trạng thái routing tháo chạy');
assert.strictEqual(desperateStep.phase, 'in_progress', 'Khi chưa toàn quân tận diệt, trận chiến vẫn tiếp diễn');
console.log('✓ Nghĩa quân Lam Sơn kiên cường chiến đấu, không routing và chỉ dừng khi toàn quân tận diệt');

// 5. Kiểm tra Khi Nghĩa Quân Đại Bại: Chiến lợi phẩm tịch thu (vũ khí, lương thảo, ngân lượng) phải bằng 0 tuyệt đối!
const dyingLS: BattlefieldUnit = {
  id: 'ls_doomed',
  formationId: 'f1',
  faction: 'lam_son',
  unitTypeId: 'swordsman',
  col: 15,
  row: 10,
  spanCols: 1,
  spanRows: 1,
  soldiersCount: 1,
  maxSoldiersCount: 10,
  hp: 1,
  maxHp: 100,
  morale: 10,
  status: 'fighting',
};

const lethalMing: BattlefieldUnit = {
  id: 'ming_killer',
  formationId: 'f_ming',
  faction: 'ming',
  unitTypeId: 'swordsman',
  col: 16,
  row: 10,
  spanCols: 1,
  spanRows: 1,
  soldiersCount: 50,
  maxSoldiersCount: 50,
  hp: 500,
  maxHp: 500,
  morale: 100,
  status: 'fighting',
};

const fatalBattle: BattlefieldState = {
  ...initialBattle,
  id: 'battle_fatal',
  units: [dyingLS, lethalMing],
  initialLamSonSoldiers: 1,
  initialMingSoldiers: 50,
  casualties: {
    lamSonKilled: 0,
    mingKilled: 20, // Trước đó đã giết 20 quân Minh
    weaponsLost: 0,
    weaponsCaptured: 50,
    foodCaptured: 100,
    goldCaptured: 50,
  },
};

const fatalResult = resolveBattlefieldTick(fatalBattle);
assert.strictEqual(fatalResult.phase, 'defeat', 'Toán quân Lam Sơn cuối cùng chết thì kết quả phải là thất bại (defeat)');
assert.strictEqual(fatalResult.casualties.weaponsCaptured, 0, 'Khi đại bại, vũ khí tịch thu phải về 0');
assert.strictEqual(fatalResult.casualties.foodCaptured, 0, 'Khi đại bại, lương thảo tịch thu phải về 0');
assert.strictEqual(fatalResult.casualties.goldCaptured, 0, 'Khi đại bại, ngân lượng tịch thu phải về 0');
assert.ok(fatalResult.casualties.weaponsLost > 0, 'Khi đại bại, nghĩa quân phải chịu tổn thất binh khí rơi vào tay giặc');
console.log('✓ Khi đại bại, chiến trường rơi vào tay giặc Minh: chiến lợi phẩm = 0 và ghi nhận tổn thất khí giới');

// Test 6: Điều hướng Flow Field & Local A* vòng qua vách núi rộng không bị kẹt cứng
const walledTiles = Array.from({ length: 32 }, (_, r) =>
  Array.from({ length: 96 }, (_, c) => {
    const isWall = c === 20 && r >= 6 && r <= 14;
    return {
      col: c,
      row: r,
      terrain: isWall ? ('mountain' as const) : ('plains' as const),
      elevation: isWall ? 2 : 0,
      isPassable: !isWall,
      speedCost: isWall ? 99 : 1,
      defenseBonus: 0,
      coverType: 'none' as const,
      zone: c < 32 ? ('lam_son' as const) : c < 64 ? ('neutral' as const) : ('ming' as const),
    };
  })
);

const blockedSwordsman: BattlefieldUnit = {
  id: 'ls_wall_walker',
  formationId: 'f_ls',
  faction: 'lam_son',
  unitTypeId: 'swordsman',
  col: 18,
  row: 10,
  spanCols: 1,
  spanRows: 1,
  soldiersCount: 10,
  maxSoldiersCount: 10,
  hp: 100,
  maxHp: 100,
  morale: 100,
  status: 'advancing',
};

const wallEnemy: BattlefieldUnit = {
  id: 'ming_behind_wall',
  formationId: 'f_ming',
  faction: 'ming',
  unitTypeId: 'swordsman',
  col: 28,
  row: 10,
  spanCols: 1,
  spanRows: 1,
  soldiersCount: 10,
  maxSoldiersCount: 10,
  hp: 100,
  maxHp: 100,
  morale: 100,
  status: 'holding',
};

let wallBattle: BattlefieldState = {
  ...initialBattle,
  id: 'battle_wall',
  grid: { ...initialBattle.grid, tiles: walledTiles },
  units: [blockedSwordsman, wallEnemy],
  initialLamSonSoldiers: 10,
  initialMingSoldiers: 10,
};

for (let i = 0; i < 14; i++) {
  wallBattle = resolveBattlefieldTick(wallBattle);
}
const walkerAfter = wallBattle.units.find(u => u.id === 'ls_wall_walker')!;
assert.ok(walkerAfter.col > 20, `Quân lính phải tự uốn lượn vòng qua vách núi (col hiện tại=${walkerAfter.col}, row=${walkerAfter.row})`);
console.log('✓ Flow Field & Local A* giúp quân lính tự vòng qua vách núi rộng thay vì đứng kẹt');

// Test 7: Kỵ binh (2x1) đứng sau đồng đội cầm cự (holding) -> Nhường đường hợp tác hoặc tạt cánh vượt lên
const frontHolder: BattlefieldUnit = {
  id: 'ls_holder',
  formationId: 'f_ls',
  faction: 'lam_son',
  unitTypeId: 'archer',
  col: 16,
  row: 10,
  spanCols: 1,
  spanRows: 1,
  soldiersCount: 10,
  maxSoldiersCount: 10,
  hp: 100,
  maxHp: 100,
  morale: 100,
  status: 'holding',
};

const rearCav: BattlefieldUnit = {
  id: 'ls_cav_2x1',
  formationId: 'f_ls',
  faction: 'lam_son',
  unitTypeId: 'cavalry',
  col: 14,
  row: 10,
  spanCols: 2,
  spanRows: 1,
  soldiersCount: 10,
  maxSoldiersCount: 10,
  hp: 150,
  maxHp: 150,
  morale: 100,
  status: 'advancing',
};

const farMingArcher: BattlefieldUnit = {
  id: 'ming_rear_archer',
  formationId: 'f_ming',
  faction: 'ming',
  unitTypeId: 'archer',
  col: 35,
  row: 10,
  spanCols: 1,
  spanRows: 1,
  soldiersCount: 10,
  maxSoldiersCount: 10,
  hp: 100,
  maxHp: 100,
  morale: 100,
  status: 'holding',
};

let cavBattle: BattlefieldState = {
  ...initialBattle,
  id: 'battle_cav_yield',
  units: [frontHolder, rearCav, farMingArcher],
  initialLamSonSoldiers: 20,
  initialMingSoldiers: 10,
};

for (let i = 0; i < 4; i++) {
  cavBattle = resolveBattlefieldTick(cavBattle);
}
const cavAfter = cavBattle.units.find(u => u.id === 'ls_cav_2x1')!;
assert.ok(cavAfter.col > 16 || Math.abs(cavAfter.row - 10) > 0, `Kỵ binh 2x1 phải vượt lên hoặc tạt sườn qua đồng đội holding (pos=${cavAfter.col},${cavAfter.row})`);
console.log('✓ Kỵ binh 2x1 xử lý nhường đường hợp tác và tạt cánh mượt mà khi bị đồng đội chắn trước');

// Test 8: Giáo binh bị cung thủ bắn tỉa từ cự ly 8 ô hoặc vừa đánh xong (status='fighting') KHÔNG bị đứng im bất động
const harassedSpearman: BattlefieldUnit = {
  id: 'ls_spear_harassed',
  formationId: 'f_ls',
  faction: 'lam_son',
  unitTypeId: 'spearman',
  col: 15,
  row: 12,
  spanCols: 1,
  spanRows: 1,
  soldiersCount: 30,
  maxSoldiersCount: 30,
  hp: 300,
  maxHp: 300,
  morale: 100,
  status: 'advancing',
};

const postMeleeSpearman: BattlefieldUnit = {
  id: 'ls_spear_post_fight',
  formationId: 'f_ls',
  faction: 'lam_son',
  unitTypeId: 'spearman',
  col: 15,
  row: 14,
  spanCols: 1,
  spanRows: 1,
  soldiersCount: 30,
  maxSoldiersCount: 30,
  hp: 300,
  maxHp: 300,
  morale: 100,
  status: 'fighting',
};

const sniperArcher: BattlefieldUnit = {
  id: 'ming_sniper_archer',
  formationId: 'f_ming',
  faction: 'ming',
  unitTypeId: 'archer',
  col: 23,
  row: 12,
  spanCols: 1,
  spanRows: 1,
  soldiersCount: 10,
  maxSoldiersCount: 10,
  hp: 100,
  maxHp: 100,
  morale: 100,
  status: 'holding',
};

let spearBattle: BattlefieldState = {
  ...initialBattle,
  id: 'battle_spear_advance',
  units: [harassedSpearman, postMeleeSpearman, sniperArcher],
  initialLamSonSoldiers: 60,
  initialMingSoldiers: 10,
};

for (let i = 0; i < 6; i++) {
  spearBattle = resolveBattlefieldTick(spearBattle);
}
const s1After = spearBattle.units.find(u => u.id === 'ls_spear_harassed')!;
const s2After = spearBattle.units.find(u => u.id === 'ls_spear_post_fight')!;
assert.ok(s1After.col >= 21, `Giáo binh bị cung thủ bắn tỉa từ xa phải tiếp tục xông lên áp sát (col=${s1After.col})`);
assert.ok(s2After.col >= 20, `Giáo binh đang ở trạng thái fighting khi mục tiêu trước mặt biến mất phải tiến lên tiếp (col=${s2After.col})`);
console.log('✓ Giáo binh không bị đóng băng trạng thái fighting khi bị cung thủ bắn tỉa từ xa');

console.log('>>> Toàn bộ test battlefieldCombatEngine THÀNH CÔNG! <<<');
