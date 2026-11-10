function assert(condition: any, message?: string) {
  if (!condition) throw new Error(message || 'Assertion failed');
}
assert.strictEqual = (a: any, b: any, msg?: string) => {
  if (a !== b) throw new Error(`${msg || 'Assertion failed'}: ${a} !== ${b}`);
};
assert.ok = (a: any, msg?: string) => {
  if (!a) throw new Error(msg || 'Assertion failed');
};

import { 
  generateBattlefieldTerrain, 
  determineScaleFromTroops, 
  BATTLEFIELD_COLS, 
  BATTLEFIELD_ROWS 
} from '../battlefieldTerrainGenerator';

console.log('--- Đang kiểm thử battlefieldTerrainGenerator ---');

// 1. Kiểm tra xác định scale theo quân số
assert.strictEqual(determineScaleFromTroops(200, 500), '1x', 'Quân số nhỏ phải là 1x');
assert.strictEqual(determineScaleFromTroops(1000, 8000), '10x', 'Quân số vạn quân phải là 10x');
assert.strictEqual(determineScaleFromTroops(6000, 85000), '100x', 'Quân số đại chiến dịch phải là 100x');
console.log('✓ Xác định cấp độ quy mô scale chính xác');

// 2. Kiểm tra sinh bàn cờ cấp 1x (Nghìn quân)
const bf1x = generateBattlefieldTerrain(400, 500, '1x');
assert.strictEqual(bf1x.cols, BATTLEFIELD_COLS, 'Kích thước cột phải là 96');
assert.strictEqual(bf1x.rows, BATTLEFIELD_ROWS, 'Kích thước hàng phải là 32');
assert.strictEqual(bf1x.tiles.length, BATTLEFIELD_ROWS, 'Mảng hàng phải có 32 hàng');
assert.strictEqual(bf1x.tiles[0].length, BATTLEFIELD_COLS, 'Mỗi hàng phải có 96 cột');
assert.strictEqual(bf1x.sampleWindow.sampleCols, 12, '1x quét 12 cột bản đồ');
assert.strictEqual(bf1x.sampleWindow.sampleRows, 4, '1x quét 4 hàng bản đồ');
console.log('✓ Bàn cờ 1x có kích thước 96x32 và cửa sổ lấy mẫu 12x4');

// 3. Kiểm tra phân khu 3 vùng
assert.strictEqual(bf1x.tiles[0][10].zone, 'lam_son', 'Cột 10 thuộc vùng lam_son');
assert.strictEqual(bf1x.tiles[0][50].zone, 'neutral', 'Cột 50 thuộc vùng neutral');
assert.strictEqual(bf1x.tiles[0][80].zone, 'ming', 'Cột 80 thuộc vùng ming');
console.log('✓ Phân chia 3 phân khu ngang (Lam Sơn, Trung gian, Minh) chính xác');

// 4. Kiểm tra sinh bàn cờ cấp 10x và 100x
const bf10x = generateBattlefieldTerrain(200, 300, '10x');
assert.strictEqual(bf10x.sampleWindow.sampleCols, 24, '10x quét 24 cột bản đồ');
assert.strictEqual(bf10x.sampleWindow.sampleRows, 8, '10x quét 8 hàng bản đồ');

const bf100x = generateBattlefieldTerrain(100, 100, '100x');
assert.strictEqual(bf100x.sampleWindow.sampleCols, 48, '100x quét 48 cột bản đồ');
assert.strictEqual(bf100x.sampleWindow.sampleRows, 16, '100x quét 16 hàng bản đồ');
console.log('✓ Cửa sổ lấy mẫu 10x (24x8) và 100x (48x16) hoạt động hoàn hảo');

console.log('>>> Toàn bộ test battlefieldTerrainGenerator THÀNH CÔNG! <<<');
