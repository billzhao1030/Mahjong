/* Draws the app icon (a 紅中 mahjong tile) and writes a PNG — no dependencies. */
const zlib = require('zlib');
const fs = require('fs');

/* ---------- PNG encoder ---------- */
const CRC = (() => { const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c; }
  return t; })();
function crc32(buf) { let c = -1; for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xFF] ^ (c >>> 8); return (c ^ -1) >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function writePNG(file, W, H, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.alloc((W * 4 + 1) * H);
  for (let y = 0; y < H; y++) { raw[y * (W * 4 + 1)] = 0; rgba.copy(raw, y * (W * 4 + 1) + 1, y * W * 4, (y + 1) * W * 4); }
  fs.writeFileSync(file, Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))
  ]));
}

/* ---------- geometry ---------- */
function inRoundRect(x, y, x0, y0, x1, y1, r) {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const cx = Math.min(Math.max(x, x0 + r), x1 - r);
  const cy = Math.min(Math.max(y, y0 + r), y1 - r);
  const dx = x - cx, dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}
function inRect(x, y, x0, y0, x1, y1) { return x >= x0 && x <= x1 && y >= y0 && y <= y1; }

const S = 1024, SS = 3;                       // 3x3 subpixel sampling
const buf = Buffer.alloc(S * S * 4);

function blend(i, r, g, b, a) {
  const ia = buf[i + 3] / 255, na = a + ia * (1 - a);
  if (na <= 0) return;
  buf[i]     = Math.round((r * a + buf[i]     * ia * (1 - a)) / na);
  buf[i + 1] = Math.round((g * a + buf[i + 1] * ia * (1 - a)) / na);
  buf[i + 2] = Math.round((b * a + buf[i + 2] * ia * (1 - a)) / na);
  buf[i + 3] = Math.round(na * 255);
}

/* layer = fn(x,y) -> [r,g,b] or null */
function paint(test, colorAt) {
  for (let py = 0; py < S; py++) {
    for (let px = 0; px < S; px++) {
      let hit = 0;
      for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
        const x = (px + (sx + 0.5) / SS) / S, y = (py + (sy + 0.5) / SS) / S;
        if (test(x, y)) hit++;
      }
      if (!hit) continue;
      const c = colorAt((px + 0.5) / S, (py + 0.5) / S);
      blend((py * S + px) * 4, c[0], c[1], c[2], hit / (SS * SS));
    }
  }
}
const lerp = (a, b, t) => a + (b - a) * t;

const X0 = 0.150, X1 = 0.850, Y0 = 0.055, Y1 = 0.930, R = 0.085;
const EDGE = 0.048;                            // tile thickness shown below the face

/* 1. tile thickness (darker slab behind, shifted down) */
paint((x, y) => inRoundRect(x, y - EDGE, X0, Y0, X1, Y1, R), () => [150, 132, 100]);
/* 2. tile face with a soft vertical gradient */
paint((x, y) => inRoundRect(x, y, X0, Y0, X1, Y1, R), (x, y) => {
  const t = (y - Y0) / (Y1 - Y0);
  return [Math.round(lerp(255, 233, t)), Math.round(lerp(253, 223, t)), Math.round(lerp(245, 199, t))];
});
/* 3. inner hairline border */
paint((x, y) => inRoundRect(x, y, X0, Y0, X1, Y1, R) && !inRoundRect(x, y, X0 + 0.012, Y0 + 0.012, X1 - 0.012, Y1 - 0.012, R - 0.010),
      () => [201, 185, 147]);
/* 4. 中 glyph */
const RED = [193, 39, 45];
const bx0 = 0.300, bx1 = 0.700, by0 = 0.330, by1 = 0.640, sw = 0.072;   // 口
const vx0 = 0.462, vx1 = 0.538, vy0 = 0.185, vy1 = 0.800;               // vertical stroke
paint((x, y) =>
  (inRect(x, y, bx0, by0, bx1, by1) && !inRect(x, y, bx0 + sw, by0 + sw, bx1 - sw, by1 - sw)) ||
  inRect(x, y, vx0, vy0, vx1, vy1), () => RED);

writePNG(process.argv[2] || 'icon.png', S, S, buf);
console.log('wrote', process.argv[2], S + 'x' + S);
