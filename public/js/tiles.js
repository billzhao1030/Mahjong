/* =====================================================================
 * tiles.js — tile encoding, ordering and naming
 *
 * Tile ids (0..33 playable, 34..41 flowers):
 *    0.. 8  万 characters  m1..m9
 *    9..17  筒 dots        p1..p9
 *   18..26  条 bamboo      s1..s9
 *   27..30  东 南 西 北    winds  (rank 1..4)
 *   31..33  中 发 白       dragons(rank 5..7)
 *   34..41  春夏秋冬梅兰竹菊 flowers
 * ===================================================================== */
(function (global) {
  'use strict';

  var SUIT_M = 0, SUIT_P = 1, SUIT_S = 2, SUIT_Z = 3;

  var PLAY_TILES = 34;          // 0..33
  var FLOWER_BASE = 34;
  var FLOWER_COUNT = 8;

  function suitOf(t) {
    if (t < 9) return SUIT_M;
    if (t < 18) return SUIT_P;
    if (t < 27) return SUIT_S;
    return SUIT_Z;
  }
  function rankOf(t) {
    if (t < 9) return t + 1;
    if (t < 18) return t - 8;
    if (t < 27) return t - 17;
    return t - 26;                // winds 1..4, dragons 5..7
  }
  function tileId(suit, rank) {
    if (suit === SUIT_M) return rank - 1;
    if (suit === SUIT_P) return rank + 8;
    if (suit === SUIT_S) return rank + 17;
    return rank + 26;
  }
  function isHonor(t) { return t >= 27 && t < 34; }
  function isWind(t) { return t >= 27 && t <= 30; }
  function isDragon(t) { return t >= 31 && t <= 33; }
  function isSuited(t) { return t >= 0 && t < 27; }
  function isFlower(t) { return t >= FLOWER_BASE && t < FLOWER_BASE + FLOWER_COUNT; }
  /** 幺九 = terminal (1/9) or honor */
  function isTerminalOrHonor(t) { return isHonor(t) || (isSuited(t) && (rankOf(t) === 1 || rankOf(t) === 9)); }
  function isTerminal(t) { return isSuited(t) && (rankOf(t) === 1 || rankOf(t) === 9); }
  function isSimple(t) { return isSuited(t) && rankOf(t) >= 2 && rankOf(t) <= 8; }

  /* ---- display ordering: 条 → 筒 → 万 → 风 → 箭 (player request) ---- */
  var DISPLAY_SUIT_ORDER = [2, 1, 0, 3];   // index by suit -> weight
  function sortKey(t) {
    if (isFlower(t)) return 5000 + t;
    return DISPLAY_SUIT_ORDER[suitOf(t)] * 100 + rankOf(t);
  }
  function sortTiles(arr) { return arr.slice().sort(function (a, b) { return sortKey(a) - sortKey(b); }); }

  /* ---- names ---- */
  var CN_NUM = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  var HONOR_CN = ['东', '南', '西', '北', '中', '发', '白'];
  var HONOR_EN = ['East', 'South', 'West', 'North', 'Red', 'Green', 'White'];
  var SUIT_CN = ['万', '筒', '条'];
  var SUIT_EN = ['Char', 'Dot', 'Bam'];
  var FLOWER_CN = ['春', '夏', '秋', '冬', '梅', '兰', '竹', '菊'];
  var FLOWER_EN = ['Spring', 'Summer', 'Autumn', 'Winter', 'Plum', 'Orchid', 'Bamboo', 'Chrys.'];

  function tileName(t, lang) {
    var en = lang === 'en';
    if (isFlower(t)) return en ? FLOWER_EN[t - FLOWER_BASE] : FLOWER_CN[t - FLOWER_BASE];
    var s = suitOf(t), r = rankOf(t);
    if (s === SUIT_Z) return en ? HONOR_EN[r - 1] : HONOR_CN[r - 1];
    return en ? (r + ' ' + SUIT_EN[s]) : (CN_NUM[r] + SUIT_CN[s]);
  }
  /** compact form used in logs, e.g. "3s", "E" */
  function tileCode(t) {
    if (isFlower(t)) return 'f' + (t - FLOWER_BASE + 1);
    var s = suitOf(t), r = rankOf(t);
    if (s === SUIT_Z) return ['E', 'S', 'W', 'N', 'C', 'F', 'B'][r - 1];
    return r + ['m', 'p', 's'][s];
  }
  function tilesName(arr, lang) {
    return arr.map(function (t) { return tileName(t, lang); }).join(' ');
  }

  /** build the 144-tile wall (136 playable ×4 + 8 flowers ×1) */
  function buildWall() {
    var w = [], t, i;
    for (t = 0; t < PLAY_TILES; t++) for (i = 0; i < 4; i++) w.push(t);
    for (i = 0; i < FLOWER_COUNT; i++) w.push(FLOWER_BASE + i);
    return w;
  }

  /** Mulberry32 — deterministic PRNG so a saved game can be reproduced */
  function makeRng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shuffle(arr, rng) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }

  /** counts[34] helper */
  function toCounts(tiles) {
    var c = new Array(PLAY_TILES).fill(0);
    for (var i = 0; i < tiles.length; i++) if (tiles[i] < PLAY_TILES) c[tiles[i]]++;
    return c;
  }
  function fromCounts(c) {
    var out = [];
    for (var t = 0; t < PLAY_TILES; t++) for (var i = 0; i < c[t]; i++) out.push(t);
    return out;
  }

  global.MJ = global.MJ || {};
  global.MJ.Tiles = {
    SUIT_M: SUIT_M, SUIT_P: SUIT_P, SUIT_S: SUIT_S, SUIT_Z: SUIT_Z,
    PLAY_TILES: PLAY_TILES, FLOWER_BASE: FLOWER_BASE, FLOWER_COUNT: FLOWER_COUNT,
    suitOf: suitOf, rankOf: rankOf, tileId: tileId,
    isHonor: isHonor, isWind: isWind, isDragon: isDragon, isSuited: isSuited,
    isFlower: isFlower, isTerminalOrHonor: isTerminalOrHonor, isTerminal: isTerminal, isSimple: isSimple,
    sortKey: sortKey, sortTiles: sortTiles,
    tileName: tileName, tileCode: tileCode, tilesName: tilesName,
    CN_NUM: CN_NUM, HONOR_CN: HONOR_CN, HONOR_EN: HONOR_EN,
    SUIT_CN: SUIT_CN, SUIT_EN: SUIT_EN, FLOWER_CN: FLOWER_CN, FLOWER_EN: FLOWER_EN,
    buildWall: buildWall, makeRng: makeRng, shuffle: shuffle,
    toCounts: toCounts, fromCounts: fromCounts
  };
})(typeof window !== 'undefined' ? window : globalThis);
