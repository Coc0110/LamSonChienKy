import assert from 'node:assert';
import { resolveBattlefieldTick } from '../battlefieldCombatEngine';
import { generateBattlefieldTerrain } from '../battlefieldTerrainGenerator';
import type { BattlefieldState, BattlefieldUnit } from '../../types/battlefield';

console.log('--- Đang kiểm thử battlefieldCombatEngine ---');

const mockGrid = generateBattlefieldTerrain(400, 500, '1x');

// Mock 1 cung thủ Lam Sơn ở (col: 10, row: 15) và 1 đao binh Minh ở (col: 13, row: 15) - cách nhau 3 ô (trong tầm bắn cung)
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

// Chạy 1 nhịp giao tranh
const nextBattle = resolveBattlefieldTick(initialBattle);

// 1. Kiểm tra lượt tăng lên 1
assert.strictEqual(nextBattle.turn, 1, 'Lượt phải tăng lên 1');

// 2. Kiểm tra cung thủ bắn rỉa làm giảm máu/lính quân Minh từ xa
const updatedMing = nextBattle.units.find(u => u.id === 'ming_sword');
assert.ok(updatedMing, 'Quân Minh phải còn tồn tại');
assert.ok((updatedMing?.hp || 0) < 500, `Quân Minh phải bị trừ máu do trúng tên (HP còn lại: ${updatedMing?.hp})`);
console.log('✓ Cung thủ bắn tỉa chính xác từ khoảng cách 3 ô');

// 3. Kiểm tra nhật ký giao tranh có ghi lại sự kiện
assert.ok(nextBattle.logs.length > 0, 'Phải có ghi nhận nhật ký giao tranh');
console.log('✓ Nhật ký chiến trận ghi nhận đầy đủ sự kiện');

console.log('>>> Toàn bộ test battlefieldCombatEngine THÀNH CÔNG! <<<');
