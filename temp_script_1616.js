const fs = require('fs');
const zlib = require('zlib');

// 1. Decode uploaded 54x58 PNG
const buf = fs.readFileSync('C:/Users/WIN/.gemini/antigravity/brain/9b567884-abee-4c82-ab2f-cc0c301d47c9/.user_uploaded/media_1792857979441_f40f1f05.png');
let pos = 8;
const idatChunks = [];
while (pos < buf.length) {
  const len = buf.readUInt32BE(pos);
  if (buf.toString('ascii', pos + 4, pos + 8) === 'IDAT') idatChunks.push(buf.slice(pos + 8, pos + 8 + len));
  pos += 8 + len + 4;
}
const raw = zlib.inflateSync(Buffer.concat(idatChunks));
const srcW = 54, srcH = 58, stride = 1 + srcW * 4;
const srcImg = Buffer.alloc(srcW * srcH * 4);
for (let y = 0; y < srcH; y++) {
  const filter = raw[y * stride];
  const rowStart = y * stride + 1;
  for (let x = 0; x < srcW; x++) {
    for (let c = 0; c < 4; c++) {
      let val = raw[rowStart + x * 4 + c];
      let a = x > 0 ? srcImg[(y * srcW + x - 1) * 4 + c] : 0;
      let b = y > 0 ? srcImg[((y - 1) * srcW + x) * 4 + c] : 0;
      let cDiag = (x > 0 && y > 0) ? srcImg[((y - 1) * srcW + x - 1) * 4 + c] : 0;
      if (filter === 1) val = (val + a) & 0xff;
      else if (filter === 2) val = (val + b) & 0xff;
      else if (filter === 3) val = (val + Math.floor((a + b) / 2)) & 0xff;
      else if (filter === 4) {
        let p = a + b - cDiag;
        let pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - cDiag);
        let pr = (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : cDiag);
        val = (val + pr) & 0xff;
      }
      srcImg[(y * srcW + x) * 4 + c] = val;
    }
  }
}

// 2. Extract ink density
const density = new Float32Array(srcW * srcH);
for (let y = 0; y < srcH; y++) {
  for (let x = 0; x < srcW; x++) {
    const idx = (y * srcW + x) * 4;
    const lum = (srcImg[idx] + srcImg[idx+1] + srcImg[idx+2]) / 3;
    // Background is ~235, ink is ~20..60
    let d = (220 - lum) / (220 - 50);
    if (d < 0) d = 0;
    if (d > 1) d = 1;
    density[y * srcW + x] = d;
  }
}

// Symmetrize across axis x = 26.5 to make it mathematically perfect
const symDensity = new Float32Array(srcW * srcH);
for (let y = 0; y < srcH; y++) {
  for (let x = 0; x < srcW; x++) {
    const mirrorX = Math.round(53 - x);
    let d1 = density[y * srcW + x];
    let d2 = (mirrorX >= 0 && mirrorX < srcW) ? density[y * srcW + mirrorX] : 0;
    symDensity[y * srcW + x] = Math.max(d1, d2);
  }
}

// Bicubic interpolation function
function sampleBicubic(u, v) {
  if (u < 0 || u >= srcW - 1 || v < 0 || v >= srcH - 1) return 0;
  const x0 = Math.floor(u), y0 = Math.floor(v);
  const fx = u - x0, fy = v - y0;

  function cubic(t, p0, p1, p2, p3) {
    return p1 + 0.5 * t * (p2 - p0 + t * (2.0 * p0 - 5.0 * p1 + 4.0 * p2 - p3 + t * (3.0 * (p1 - p2) + p3 - p0)));
  }

  function get(x, y) {
    x = Math.max(0, Math.min(srcW - 1, x));
    y = Math.max(0, Math.min(srcH - 1, y));
    return symDensity[y * srcW + x];
  }

  const col = new Float32Array(4);
  for (let j = 0; j < 4; j++) {
    const y = y0 - 1 + j;
    col[j] = cubic(fx, get(x0 - 1, y), get(x0, y), get(x0 + 1, y), get(x0 + 2, y));
  }
  let res = cubic(fy, col[0], col[1], col[2], col[3]);
  return res < 0 ? 0 : res > 1 ? 1 : res;
}

// 3. Render 256x256 high-resolution crisp image
const targetW = 256, targetH = 256;
const outRgba = Buffer.alloc(targetW * targetH * 4);

// Center the bounding box (width 38, height 41) into 256x256
// Target sword size: width ~ 200, height ~ 216 (scaled ~5.2x)
const scale = 5.3;
const srcCenterX = 26.5;
const srcCenterY = 34.0;
const dstCenterX = targetW / 2;
const dstCenterY = targetH / 2;

// Supersampling 4x4 per pixel for perfect studio-grade vector smoothness
const sub = 4;
for (let dy = 0; dy < targetH; dy++) {
  for (let dx = 0; dx < targetW; dx++) {
    let alphaSum = 0;
    for (let sy = 0; sy < sub; sy++) {
      for (let sx = 0; sx < sub; sx++) {
        const px = dx + (sx + 0.5) / sub;
        const py = dy + (sy + 0.5) / sub;

        const u = srcCenterX + (px - dstCenterX) / scale;
        const v = srcCenterY + (py - dstCenterY) / scale;

        const d = sampleBicubic(u, v);
        // Sharp step with smooth anti-aliased edge
        const threshold = 0.42;
        const smoothness = 0.08;
        let a = (d - (threshold - smoothness)) / (2 * smoothness);
        if (a < 0) a = 0;
        else if (a > 1) a = 1;
        alphaSum += a;
      }
    }
    const finalAlpha = Math.round((alphaSum / (sub * sub)) * 255);
    const idx = (dy * targetW + dx) * 4;
    if (finalAlpha > 0) {
      outRgba[idx] = 20;     // R: dark ink black
      outRgba[idx + 1] = 10; // G
      outRgba[idx + 2] = 5;  // B
      outRgba[idx + 3] = finalAlpha;
    }
  }
}

// 4. Encode to PNG
function createPng(width, height, rgbaBuffer) {
  const IHDR = Buffer.alloc(13);
  IHDR.writeUInt32BE(width, 0);
  IHDR.writeUInt32BE(height, 4);
  IHDR[8] = 8;
  IHDR[9] = 6;
  IHDR[10] = 0;
  IHDR[11] = 0;
  IHDR[12] = 0;

  const stride = 1 + width * 4;
  const filtered = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    filtered[y * stride] = 0;
    rgbaBuffer.copy(filtered, y * stride + 1, y * width * 4, (y + 1) * width * 4);
  }

  const idatData = zlib.deflateSync(filtered, { level: 9 });

  const crcTable = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1);
    crcTable[i] = c;
  }
  function crc32(b) {
    let c = -1;
    for (let i = 0; i < b.length; i++) c = crcTable[(c ^ b[i]) & 0xff] ^ (c >>> 8);
    return (c ^ -1) | 0;
  }

  function makeChunk(type, data) {
    const len = data.length;
    const chunk = Buffer.alloc(8 + len + 4);
    chunk.writeUInt32BE(len, 0);
    chunk.write(type, 4, 4, 'ascii');
    data.copy(chunk, 8);
    const crc = crc32(chunk.slice(4, 8 + len));
    chunk.writeInt32BE(crc, 8 + len);
    return chunk;
  }

  const pngHeader = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrChunk = makeChunk('IHDR', IHDR);
  const idatChunk = makeChunk('IDAT', idatData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([pngHeader, ihdrChunk, idatChunk, iendChunk]);
}

const pngBuf = createPng(targetW, targetH, outRgba);
fs.writeFileSync('public/troops/infantry.png', pngBuf);
console.log('Saved public/troops/infantry.png (size:', pngBuf.length, 'bytes)');
