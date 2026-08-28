/* =====================================================================
 * tileface.js — tile faces drawn as inline SVG.
 * Glyphs use the bundled "MJ Tile" subset (Noto Serif SC 900) so the
 * characters look identical on macOS, Windows and Linux.
 * ===================================================================== */
(function (global) {
  'use strict';
  var T = global.MJ.Tiles;

  var INK = '#1d2733', RED = '#b3251f', BLUE = '#12508c', GREEN = '#12784b', GOLD = '#c9922c';
  var TILEFONT = "'MJ Tile','Noto Serif SC','Songti SC','SimSun','STSong',serif";

  /* ---------------- 筒 (dots) ---------------- */
  var LAYOUT = {
    1: [[30, 42]],
    2: [[30, 25], [30, 59]],
    3: [[17, 22], [30, 42], [43, 62]],
    4: [[20, 26], [40, 26], [20, 58], [40, 58]],
    5: [[19, 23], [41, 23], [30, 42], [19, 61], [41, 61]],
    6: [[20, 21], [40, 21], [20, 42], [40, 42], [20, 63], [40, 63]],
    7: [[16, 19], [30, 19], [44, 19], [20, 45], [40, 45], [20, 64], [40, 64]],
    8: [[20, 17], [40, 17], [20, 34], [40, 34], [20, 51], [40, 51], [20, 68], [40, 68]],
    9: [[16, 21], [30, 21], [44, 21], [16, 42], [30, 42], [44, 42], [16, 63], [30, 63], [44, 63]]
  };
  var DOT_R = { 1: 15, 2: 12.5, 3: 10.5, 4: 9.5, 5: 8.8, 6: 8.6, 7: 7.1, 8: 6.9, 9: 6.9 };
  /* traditional-ish colouring per count */
  var DOT_COLORS = {
    1: [RED],
    2: [GREEN, BLUE],
    3: [GREEN, RED, BLUE],
    4: [BLUE, GREEN, GREEN, BLUE],
    5: [BLUE, GREEN, RED, GREEN, BLUE],
    6: [GREEN, GREEN, GREEN, GREEN, GREEN, GREEN],
    7: [GREEN, GREEN, GREEN, BLUE, BLUE, BLUE, BLUE],
    8: [BLUE, BLUE, BLUE, BLUE, BLUE, BLUE, BLUE, BLUE],
    9: [RED, RED, RED, GREEN, GREEN, GREEN, BLUE, BLUE, BLUE]
  };

  function coin(cx, cy, r, c) {
    return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + c + '"/>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r * 0.63) + '" fill="#fdfaf1"/>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r * 0.33) + '" fill="' + c + '"/>' +
      '<path d="M' + (cx - r * 0.52) + ' ' + (cy - r * 0.42) +
      ' a' + (r * 0.66) + ' ' + (r * 0.66) + ' 0 0 1 ' + (r * 0.72) + ' ' + (-r * 0.2) + '" ' +
      'stroke="#fff" stroke-opacity=".5" stroke-width="' + (r * 0.16) + '" fill="none" stroke-linecap="round"/>';
  }
  function dots(n) {
    var pts = LAYOUT[n], r = DOT_R[n], cols = DOT_COLORS[n], out = '';
    if (n === 1) {
      out += '<circle cx="30" cy="42" r="17" fill="' + BLUE + '"/>';
      out += '<circle cx="30" cy="42" r="13.6" fill="#fdfaf1"/>';
      out += coin(30, 42, 11, RED);
      return out;
    }
    for (var i = 0; i < pts.length; i++) out += coin(pts[i][0], pts[i][1], r, cols[i] || BLUE);
    return out;
  }

  /* ---------------- 条 (bamboo) ---------------- */
  function stick(cx, cy, h, w, c) {
    var x = cx - w / 2, y = cy - h / 2;
    return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + (w * 0.42) + '" fill="' + c + '"/>' +
      '<rect x="' + (x + w * 0.22) + '" y="' + (y + h * 0.12) + '" width="' + (w * 0.24) + '" height="' + (h * 0.76) + '" rx="' + (w * 0.12) + '" fill="#fff" opacity=".38"/>' +
      '<rect x="' + x + '" y="' + (cy - h * 0.19) + '" width="' + w + '" height="' + (h * 0.075) + '" fill="#fdfaf1" opacity=".85"/>' +
      '<rect x="' + x + '" y="' + (cy + h * 0.12) + '" width="' + w + '" height="' + (h * 0.075) + '" fill="#fdfaf1" opacity=".85"/>';
  }
  function bird() {
    return '<g>' +
      '<path d="M30 70 q-13 -8 -12 -24 q1 -14 12 -18 q11 4 12 18 q1 16 -12 24 Z" fill="' + GREEN + '"/>' +
      '<path d="M23 40 q7 -5 14 0 q-2 16 -7 24 q-5 -8 -7 -24 Z" fill="#fff" opacity=".28"/>' +
      '<circle cx="30" cy="21" r="9" fill="' + RED + '"/>' +
      '<circle cx="26.6" cy="19" r="2.1" fill="#fff"/>' +
      '<circle cx="26.6" cy="19" r="1" fill="' + INK + '"/>' +
      '<path d="M39 21 L50 24.5 L39 27.5 Z" fill="' + GOLD + '"/>' +
      '<path d="M30 12 q3 -6 7 -6 q-2 5 -3 7" fill="' + GREEN + '"/>' +
      '<path d="M22 66 q8 7 16 0" stroke="' + GREEN + '" stroke-width="3.6" fill="none" stroke-linecap="round"/>' +
      '<path d="M30 68 l-7 11 M30 68 l0 12 M30 68 l7 11" stroke="' + RED + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
      '</g>';
  }
  /* bamboo uses its own arrangement — longer, thinner sticks */
  var BAM = {
    2: [[30, 25], [30, 59]],
    3: [[30, 21], [20, 58], [40, 58]],
    4: [[20, 25], [40, 25], [20, 59], [40, 59]],
    5: [[19, 22], [41, 22], [30, 42], [19, 62], [41, 62]],
    6: [[18, 23], [30, 23], [42, 23], [18, 61], [30, 61], [42, 61]],
    7: [[30, 15], [18, 43], [30, 43], [42, 43], [18, 68], [30, 68], [42, 68]],
    8: [[15, 25], [25, 25], [35, 25], [45, 25], [15, 59], [25, 59], [35, 59], [45, 59]],
    9: [[18, 19], [30, 19], [42, 19], [18, 42], [30, 42], [42, 42], [18, 65], [30, 65], [42, 65]]
  };
  var BAM_SIZE = {
    2: [30, 9.5], 3: [24, 9], 4: [26, 9], 5: [24, 8.5],
    6: [28, 8], 7: [19, 7.5], 8: [26, 7], 9: [19, 7.5]
  };
  function bamboo(n) {
    if (n === 1) return bird();
    var pts = BAM[n], sz = BAM_SIZE[n], out = '';
    for (var i = 0; i < pts.length; i++) {
      var c = GREEN;
      if (n === 5 && i === 2) c = RED;
      if (n === 7 && i === 0) c = RED;
      if (n === 9 && i < 3) c = RED;
      out += stick(pts[i][0], pts[i][1], sz[0], sz[1], c);
    }
    return out;
  }

  /* ---------------- 万 / 字 ---------------- */
  function glyph(txt, x, y, size, color) {
    /* a light copy offset down-right first → reads as engraved and filled */
    return '<text x="' + (x + 0.9) + '" y="' + (y + 0.9) + '" text-anchor="middle" font-size="' + size +
      '" font-family="' + TILEFONT + '" fill="#ffffff" opacity=".75">' + txt + '</text>' +
      '<text x="' + x + '" y="' + y + '" text-anchor="middle" font-size="' + size +
      '" font-family="' + TILEFONT + '" fill="' + color + '">' + txt + '</text>';
  }
  function chars(n) {
    return glyph(T.CN_NUM[n], 30, 36, 30, BLUE) + glyph('萬', 30, 75, 33, RED);
  }
  function honor(t) {
    var r = T.rankOf(t);
    if (r === 7) {                                   /* 白板 */
      return '<rect x="10" y="12" width="40" height="60" rx="4" fill="none" stroke="' + BLUE + '" stroke-width="2.8"/>' +
        '<rect x="15.5" y="17.5" width="29" height="49" rx="3" fill="none" stroke="' + BLUE + '" stroke-width="1.2" opacity=".45"/>';
    }
    var g = ['東', '南', '西', '北', '中', '發'][r - 1];
    var c = r <= 4 ? INK : (r === 5 ? RED : GREEN);
    return glyph(g, 30, 60, 44, c);
  }
  function flower(t) {
    var i = t - T.FLOWER_BASE;
    return glyph(T.FLOWER_CN[i], 30, 57, 37, i < 4 ? GREEN : RED) +
      '<text x="48" y="77" text-anchor="middle" font-size="12" font-family="' + TILEFONT + '" fill="#9aa5b0">' + (i + 1) + '</text>';
  }

  var cache = {};
  function svg(t) {
    if (cache[t] !== undefined) return cache[t];
    var inner;
    if (T.isFlower(t)) inner = flower(t);
    else {
      var s = T.suitOf(t), r = T.rankOf(t);
      if (s === T.SUIT_M) inner = chars(r);
      else if (s === T.SUIT_P) inner = dots(r);
      else if (s === T.SUIT_S) inner = bamboo(r);
      else inner = honor(t);
    }
    cache[t] = '<svg class="tf" viewBox="0 0 60 84" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' + inner + '</svg>';
    return cache[t];
  }

  function el(t, opts) {
    opts = opts || {};
    var d = document.createElement('div');
    d.className = 'tile' + (opts.cls ? ' ' + opts.cls : '') + (opts.face === false ? ' back' : '');
    d.innerHTML = '<span class="tile-top">' + (opts.face === false ? '' : svg(t)) + '</span>';
    if (opts.face !== false) {
      d.dataset.tile = t;
      d.title = T.tileName(t, global.MJ.I18n ? global.MJ.I18n.getLang() : 'zh');
    }
    return d;
  }

  global.MJ.Face = { svg: svg, el: el };
})(typeof window !== 'undefined' ? window : globalThis);
