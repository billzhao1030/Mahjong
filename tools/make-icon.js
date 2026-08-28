/* Draws the app icon — a jade-and-gold plaque with a fan of mahjong tiles.
   Pure geometry + a hand-built PNG encoder, so it has no dependencies. */
const zlib = require('zlib');
const fs = require('fs');

/* ---------- PNG encoder ---------- */
const CRC = (() => { const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c; }
  return t; })();
function crc32(b){ let c=-1; for(let i=0;i<b.length;i++) c=CRC[(c^b[i])&0xFF]^(c>>>8); return (c^-1)>>>0; }
function chunk(type, data){
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type,'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function writePNG(file, W, H, rgba){
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W,0); ihdr.writeUInt32BE(H,4);
  ihdr[8]=8; ihdr[9]=6;
  const raw = Buffer.alloc((W*4+1)*H);
  for (let y=0;y<H;y++){ raw[y*(W*4+1)]=0; rgba.copy(raw, y*(W*4+1)+1, y*W*4, (y+1)*W*4); }
  fs.writeFileSync(file, Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw,{level:9})), chunk('IEND', Buffer.alloc(0))
  ]));
}

/* ---------- canvas ---------- */
const S = 1024, SS = 3;
const buf = Buffer.alloc(S*S*4);
function blend(i,r,g,b,a){
  const ia = buf[i+3]/255, na = a + ia*(1-a);
  if (na <= 0) return;
  buf[i]   = Math.round((r*a + buf[i]  *ia*(1-a))/na);
  buf[i+1] = Math.round((g*a + buf[i+1]*ia*(1-a))/na);
  buf[i+2] = Math.round((b*a + buf[i+2]*ia*(1-a))/na);
  buf[i+3] = Math.round(na*255);
}
function paint(test, colorAt, alpha){
  for (let py=0; py<S; py++) for (let px=0; px<S; px++){
    let hit = 0;
    for (let sy=0; sy<SS; sy++) for (let sx=0; sx<SS; sx++){
      const x = (px+(sx+0.5)/SS)/S, y = (py+(sy+0.5)/SS)/S;
      if (test(x,y)) hit++;
    }
    if (!hit) continue;
    const c = colorAt((px+0.5)/S, (py+0.5)/S);
    if (!c) continue;
    blend((py*S+px)*4, c[0], c[1], c[2], (hit/(SS*SS)) * (alpha === undefined ? 1 : alpha));
  }
}
const lerp = (a,b,t)=>a+(b-a)*t;
const mix = (A,B,t)=>[Math.round(lerp(A[0],B[0],t)),Math.round(lerp(A[1],B[1],t)),Math.round(lerp(A[2],B[2],t))];

/* squircle-ish rounded square */
function inSquircle(x,y,x0,y0,x1,y1,r){
  if (x<x0||x>x1||y<y0||y>y1) return false;
  const cx = Math.min(Math.max(x,x0+r),x1-r), cy = Math.min(Math.max(y,y0+r),y1-r);
  const dx = Math.abs(x-cx)/r, dy = Math.abs(y-cy)/r;
  if (dx===0||dy===0) return true;
  return Math.pow(dx,2.6)+Math.pow(dy,2.6) <= 1;      // superellipse corners
}
/* rounded rect rotated about its centre */
function inRot(x,y,cx,cy,w,h,r,ang){
  const c = Math.cos(ang), s = Math.sin(ang);
  const lx = (x-cx)*c + (y-cy)*s, ly = -(x-cx)*s + (y-cy)*c;
  if (Math.abs(lx)>w/2 || Math.abs(ly)>h/2) return false;
  const qx = Math.min(Math.max(Math.abs(lx), 0), w/2-r), qy = Math.min(Math.max(Math.abs(ly), 0), h/2-r);
  const ddx = Math.abs(lx)-qx, ddy = Math.abs(ly)-qy;
  return ddx*ddx + ddy*ddy <= r*r;
}
function toLocal(x,y,cx,cy,ang){
  const c = Math.cos(ang), s = Math.sin(ang);
  return [(x-cx)*c + (y-cy)*s, -(x-cx)*s + (y-cy)*c];
}

const JADE_HI = [26,124,84], JADE_LO = [4,36,24];
const GOLD = [227,200,126], GOLD_DIM = [163,132,66];
const FACE_HI = [255,253,246], FACE_LO = [235,225,201];
const EDGE = [150,133,102], RED = [200,50,43];

const B0=0.035, B1=0.965, BR=0.235;
/* 1. plaque */
paint((x,y)=>inSquircle(x,y,B0,B0,B1,B1,BR), (x,y)=>{
  const d = Math.hypot(x-0.30, y-0.24);
  const t = Math.min(1, Math.max(0, (x-B0+y-B0)/(2*(B1-B0))));
  const base = mix(JADE_HI, JADE_LO, Math.pow(t,0.85));
  const glow = Math.max(0, 1-d/0.85);
  return mix(base, [70,190,140], glow*0.30);
});
/* 2. gold rim */
paint((x,y)=>inSquircle(x,y,B0,B0,B1,B1,BR) && !inSquircle(x,y,B0+0.030,B0+0.030,B1-0.030,B1-0.030,BR-0.026),
      (x,y)=>mix(GOLD, GOLD_DIM, Math.min(1,(x+y)/2)));
/* 3. two tiles fanned behind */
function tile(cx,cy,w,h,ang,faceHi,faceLo,depth){
  paint((x,y)=>inRot(x,y-depth,cx,cy,w,h,0.035,ang), ()=>EDGE);
  paint((x,y)=>inRot(x,y,cx,cy,w,h,0.035,ang), (x,y)=>{
    const [lx,ly] = toLocal(x,y,cx,cy,ang);
    return mix(faceHi, faceLo, Math.min(1,Math.max(0,(ly/h)+0.5)));
  });
  paint((x,y)=>inRot(x,y,cx,cy,w,h,0.035,ang) && !inRot(x,y,cx,cy,w-0.045,h-0.045,0.022,ang),
        ()=>[214,199,166], 0.75);
}
tile(0.315, 0.545, 0.30, 0.42, -0.30, [244,240,228], [214,203,178], 0.016);
tile(0.685, 0.545, 0.30, 0.42,  0.30, [244,240,228], [214,203,178], 0.016);
/* 4. front tile */
const FC = 0.5, FY = 0.515, FW = 0.34, FH = 0.475, FA = -0.045;
tile(FC, FY, FW, FH, FA, FACE_HI, FACE_LO, 0.030);
/* 5. 中 on the front tile, in its own rotated frame */
const box = { x0:-0.105, x1:0.105, y0:-0.075, y1:0.075, sw:0.030 };
const bar = { x0:-0.030, x1:0.030, y0:-0.165, y1:0.165 };
paint((x,y)=>{
  const [lx,ly] = toLocal(x,y,FC,FY,FA);
  const inBox = lx>=box.x0 && lx<=box.x1 && ly>=box.y0 && ly<=box.y1;
  const inHole = lx>=box.x0+box.sw && lx<=box.x1-box.sw && ly>=box.y0+box.sw && ly<=box.y1-box.sw;
  const inBar = lx>=bar.x0 && lx<=bar.x1 && ly>=bar.y0 && ly<=bar.y1;
  return (inBox && !inHole) || inBar;
}, ()=>RED);
/* 6. glint across the plaque */
paint((x,y)=>{
  if (!inSquircle(x,y,B0,B0,B1,B1,BR)) return false;
  const d = (x*0.85 + y*0.52);
  return d > 0.30 && d < 0.44;
}, ()=>[255,255,255], 0.07);

writePNG(process.argv[2] || 'icon.png', S, S, buf);
console.log('wrote', process.argv[2] || 'icon.png', S+'x'+S);
