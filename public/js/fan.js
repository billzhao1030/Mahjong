/* =====================================================================
 * fan.js — MCR (国标) scoring engine
 *
 * score(ctx) evaluates every legal interpretation of a winning hand and
 * returns the highest-scoring one (就高不就低).
 *
 * Interpretation notes (documented in the in-game rules page):
 *  - 不拆移原则 is implemented for the "meld combination" family
 *    (一般高/喜相逢/连六/老少副/双同刻 and their 3- and 4-meld relatives):
 *    a meld may take part in at most one such fan, and the engine picks the
 *    highest-scoring vertex-disjoint selection.
 *  - Concealment fans (暗刻/暗杠) and whole-hand fans (清一色/碰碰和/…) are
 *    scored on a separate axis, so 四暗刻 + 一色四节高 both count.
 *  - 边张/坎张/单钓将 are only awarded on a genuine single wait.
 *  - 幺九刻 stacks with 箭刻/圈风刻/门风刻 (东圈东家的东刻 = 5 番).
 * ===================================================================== */
(function (global) {
  'use strict';
  var T = global.MJ.Tiles, H = global.MJ.Hand, D = global.MJ.FanDefs;

  /* fan A cancels fans B… (不重复 / 不计) */
  var EXCLUDE = {
    BIG_FOUR_WINDS: ['PREVALENT_WIND', 'SEAT_WIND', 'BIG_THREE_WINDS', 'ALL_PUNGS'],
    LITTLE_FOUR_WINDS: ['BIG_THREE_WINDS'],
    BIG_THREE_DRAGONS: ['DRAGON_PUNG', 'TWO_DRAGON_PUNGS'],
    LITTLE_THREE_DRAGONS: ['DRAGON_PUNG', 'TWO_DRAGON_PUNGS'],
    ALL_GREEN: ['HALF_FLUSH'],
    NINE_GATES: ['FULL_FLUSH', 'NO_HONORS', 'ONE_VOIDED_SUIT'],
    FOUR_KONGS: ['ALL_PUNGS', 'SINGLE_WAIT', 'THREE_KONGS', 'TWO_MELDED_KONGS',
                 'TWO_CONCEALED_KONGS', 'MELDED_KONG', 'CONCEALED_KONG'],
    SEVEN_SHIFTED_PAIRS: ['SEVEN_PAIRS', 'FULL_FLUSH', 'NO_HONORS', 'SINGLE_WAIT', 'ONE_VOIDED_SUIT'],
    THIRTEEN_ORPHANS: ['ALL_TERMINALS_AND_HONORS', 'ALL_TYPES', 'SINGLE_WAIT'],
    ALL_TERMINALS: ['ALL_TERMINALS_AND_HONORS', 'ALL_PUNGS', 'OUTSIDE_HAND', 'NO_HONORS',
                    'PUNG_OF_TERMINALS_OR_HONORS'],
    ALL_HONORS: ['ALL_PUNGS', 'ALL_TERMINALS_AND_HONORS', 'OUTSIDE_HAND', 'ONE_VOIDED_SUIT',
                 'HALF_FLUSH'],
    FOUR_CONCEALED_PUNGS: ['ALL_PUNGS', 'THREE_CONCEALED_PUNGS', 'TWO_CONCEALED_PUNGS'],
    PURE_TERMINAL_CHOWS: ['PURE_DOUBLE_CHOW', 'TWO_TERMINAL_CHOWS', 'OUTSIDE_HAND'],
    QUADRUPLE_CHOW: ['PURE_TRIPLE_CHOW', 'PURE_DOUBLE_CHOW', 'TILE_HOG'],
    FOUR_PURE_SHIFTED_PUNGS: ['PURE_SHIFTED_PUNGS'],
    FOUR_PURE_SHIFTED_CHOWS: ['PURE_SHIFTED_CHOWS'],
    THREE_KONGS: ['TWO_MELDED_KONGS', 'TWO_CONCEALED_KONGS', 'MELDED_KONG', 'CONCEALED_KONG'],
    ALL_TERMINALS_AND_HONORS: ['ALL_PUNGS', 'OUTSIDE_HAND'],
    SEVEN_PAIRS: ['SINGLE_WAIT'],
    GREATER_HONORS_AND_KNITTED: ['LESSER_HONORS_AND_KNITTED', 'ALL_TYPES'],
    ALL_EVEN_PUNGS: ['ALL_PUNGS', 'ALL_SIMPLES'],
    FULL_FLUSH: ['NO_HONORS', 'ONE_VOIDED_SUIT'],
    PURE_TRIPLE_CHOW: ['PURE_DOUBLE_CHOW'],
    UPPER_TILES: ['UPPER_FOUR', 'NO_HONORS'],
    MIDDLE_TILES: ['ALL_SIMPLES', 'NO_HONORS'],
    LOWER_TILES: ['LOWER_FOUR', 'NO_HONORS'],
    PURE_STRAIGHT: ['SHORT_STRAIGHT', 'TWO_TERMINAL_CHOWS'],
    THREE_SUITED_TERMINAL_CHOWS: ['MIXED_DOUBLE_CHOW', 'TWO_TERMINAL_CHOWS', 'ALL_TYPES'],
    ALL_FIVE: ['ALL_SIMPLES', 'NO_HONORS'],
    TRIPLE_PUNG: ['DOUBLE_PUNG'],
    THREE_CONCEALED_PUNGS: ['TWO_CONCEALED_PUNGS'],
    UPPER_FOUR: ['NO_HONORS'],
    LOWER_FOUR: ['NO_HONORS'],
    REVERSIBLE_TILES: ['ONE_VOIDED_SUIT'],
    MIXED_TRIPLE_CHOW: ['MIXED_DOUBLE_CHOW'],
    OUT_WITH_REPLACEMENT: ['SELF_DRAWN'],
    LAST_TILE_DRAW: ['SELF_DRAWN'],
    ROBBING_THE_KONG: ['LAST_TILE'],
    HALF_FLUSH: ['ONE_VOIDED_SUIT'],
    MELDED_HAND: ['SINGLE_WAIT'],
    FULLY_CONCEALED_HAND: ['SELF_DRAWN'],
    TWO_CONCEALED_KONGS: ['CONCEALED_KONG'],
    TWO_MELDED_KONGS: ['MELDED_KONG'],
    TWO_DRAGON_PUNGS: ['DRAGON_PUNG']
  };

  var GREEN = { 19: 1, 20: 1, 21: 1, 23: 1, 25: 1, 32: 1 };            // 234 68条 + 发
  var REVERSIBLE = { 9: 1, 10: 1, 11: 1, 12: 1, 13: 1, 16: 1, 17: 1,   // 12345 89筒
                     19: 1, 21: 1, 22: 1, 23: 1, 25: 1, 26: 1, 33: 1 };// 2456 89条 + 白

  /* ---------------- accumulator ---------------- */
  function Acc() { this.map = Object.create(null); this.order = []; }
  Acc.prototype.add = function (id, n) {
    n = n === undefined ? 1 : n;
    if (n <= 0) return;
    if (!this.map[id]) { this.map[id] = 0; this.order.push(id); }
    this.map[id] += n;
  };
  Acc.prototype.has = function (id) { return !!this.map[id]; };

  /* ---------------- meld normalisation ---------------- */
  function normaliseMelds(parse, ctx) {
    var out = [], i, m;
    var exposed = ctx.melds || [];
    for (i = 0; i < exposed.length; i++) {
      m = exposed[i];
      if (m.type === 'chi') out.push({ k: 'shun', t: Math.min.apply(null, m.tiles), concealed: false, kong: false, declared: true });
      else if (m.type === 'peng') out.push({ k: 'ke', t: m.tiles[0], concealed: false, kong: false, declared: true });
      else if (m.type === 'ankan') out.push({ k: 'ke', t: m.tiles[0], concealed: true, kong: true, declared: true });
      else out.push({ k: 'ke', t: m.tiles[0], concealed: false, kong: true, declared: true }); // minkan / bukan
    }
    var fromHand = parse.melds || [];
    for (i = 0; i < fromHand.length; i++) {
      out.push({ k: fromHand[i].k, t: fromHand[i].t, concealed: true, kong: false, declared: false });
    }
    // a pung completed by someone else's discard is an open pung
    if (!ctx.selfDrawn) {
      var inShun = false;
      for (i = 0; i < out.length; i++) {
        if (out[i].declared) continue;
        if (out[i].k === 'shun' && ctx.winTile >= out[i].t && ctx.winTile <= out[i].t + 2) { inShun = true; break; }
      }
      if (!inShun) {
        for (i = 0; i < out.length; i++) {
          if (!out[i].declared && out[i].k === 'ke' && out[i].t === ctx.winTile) { out[i].concealed = false; break; }
        }
      }
    }
    return out;
  }

  /* ---------------- combination fans (不拆移) ---------------- */
  function combinationFans(melds, pairTile) {
    if (melds.length !== 4) return { v: 0, list: [] };
    var s = [], k = [], i, j, a, b, c;
    for (i = 0; i < 4; i++) {
      var suit = T.suitOf(melds[i].t), rank = T.rankOf(melds[i].t);
      var info = { i: i, s: suit, r: rank, m: 1 << i };
      if (melds[i].k === 'shun') s.push(info); else k.push(info);
    }
    var cands = [];
    var push = function (id, mask) { cands.push({ id: id, v: D.byId[id].v, mask: mask }); };
    var ALL = 15;

    /* --- four-meld --- */
    if (s.length === 4) {
      var same = s[0].s === s[1].s && s[1].s === s[2].s && s[2].s === s[3].s;
      var rs = s.map(function (x) { return x.r; }).sort(function (p, q) { return p - q; });
      if (same) {
        if (rs[0] === rs[3]) push('QUADRUPLE_CHOW', ALL);
        var d1 = rs[1] - rs[0], ok1 = (d1 === 1 || d1 === 2) && rs[2] - rs[1] === d1 && rs[3] - rs[2] === d1;
        if (ok1) push('FOUR_PURE_SHIFTED_CHOWS', ALL);
        if (rs[0] === 1 && rs[1] === 1 && rs[2] === 7 && rs[3] === 7 &&
            pairTile != null && T.suitOf(pairTile) === s[0].s && T.rankOf(pairTile) === 5) {
          push('PURE_TERMINAL_CHOWS', ALL);
        }
      } else if (pairTile != null && T.suitOf(pairTile) < 3 && T.rankOf(pairTile) === 5) {
        // 三色双龙会: 123+789 in two suits, pair of 5 in the third
        var bySuit = {};
        for (i = 0; i < 4; i++) { (bySuit[s[i].s] = bySuit[s[i].s] || []).push(s[i].r); }
        var keys = Object.keys(bySuit), pv = T.suitOf(pairTile), good = keys.length === 2 && keys.indexOf(String(pv)) < 0;
        if (good) {
          for (j = 0; j < keys.length; j++) {
            var arr = bySuit[keys[j]].sort(function (p, q) { return p - q; });
            if (arr.length !== 2 || arr[0] !== 1 || arr[1] !== 7) { good = false; break; }
          }
          if (good) push('THREE_SUITED_TERMINAL_CHOWS', ALL);
        }
      }
    }
    if (k.length === 4) {
      var same2 = k[0].s === k[1].s && k[1].s === k[2].s && k[2].s === k[3].s;
      var rk = k.map(function (x) { return x.r; }).sort(function (p, q) { return p - q; });
      if (same2 && k[0].s < 3 && rk[1] - rk[0] === 1 && rk[2] - rk[1] === 1 && rk[3] - rk[2] === 1) {
        push('FOUR_PURE_SHIFTED_PUNGS', ALL);
      }
    }

    /* --- three-meld --- */
    function triples(arr, fn) {
      for (var x = 0; x < arr.length; x++) for (var y = x + 1; y < arr.length; y++) for (var z = y + 1; z < arr.length; z++) fn(arr[x], arr[y], arr[z]);
    }
    triples(s, function (a, b, c) {
      var mask = a.m | b.m | c.m;
      var rr = [a.r, b.r, c.r].sort(function (p, q) { return p - q; });
      var sameSuit = a.s === b.s && b.s === c.s;
      var threeSuits = a.s !== b.s && b.s !== c.s && a.s !== c.s;
      if (sameSuit) {
        if (rr[0] === rr[2]) push('PURE_TRIPLE_CHOW', mask);
        if (rr[0] === 1 && rr[1] === 4 && rr[2] === 7) push('PURE_STRAIGHT', mask);
        var d = rr[1] - rr[0];
        if ((d === 1 || d === 2) && rr[2] - rr[1] === d) push('PURE_SHIFTED_CHOWS', mask);
      } else if (threeSuits) {
        if (rr[0] === rr[2]) push('MIXED_TRIPLE_CHOW', mask);
        if (rr[0] === 1 && rr[1] === 4 && rr[2] === 7) push('MIXED_STRAIGHT', mask);
        if (rr[1] - rr[0] === 1 && rr[2] - rr[1] === 1) push('MIXED_SHIFTED_CHOWS', mask);
      }
    });
    triples(k, function (a, b, c) {
      if (a.s === 3 || b.s === 3 || c.s === 3) return;  // honours never form these
      var mask = a.m | b.m | c.m;
      var rr = [a.r, b.r, c.r].sort(function (p, q) { return p - q; });
      var sameSuit = a.s === b.s && b.s === c.s;
      var threeSuits = a.s !== b.s && b.s !== c.s && a.s !== c.s;
      if (sameSuit && rr[1] - rr[0] === 1 && rr[2] - rr[1] === 1) push('PURE_SHIFTED_PUNGS', mask);
      if (threeSuits && rr[0] === rr[2]) push('TRIPLE_PUNG', mask);
      if (threeSuits && rr[1] - rr[0] === 1 && rr[2] - rr[1] === 1) push('MIXED_SHIFTED_PUNGS', mask);
    });

    /* --- two-meld --- */
    for (i = 0; i < s.length; i++) for (j = i + 1; j < s.length; j++) {
      a = s[i]; b = s[j];
      var mask2 = a.m | b.m;
      if (a.s === b.s) {
        if (a.r === b.r) push('PURE_DOUBLE_CHOW', mask2);
        if (Math.abs(a.r - b.r) === 3) push('SHORT_STRAIGHT', mask2);
        if ((a.r === 1 && b.r === 7) || (a.r === 7 && b.r === 1)) push('TWO_TERMINAL_CHOWS', mask2);
      } else if (a.r === b.r) push('MIXED_DOUBLE_CHOW', mask2);
    }
    for (i = 0; i < k.length; i++) for (j = i + 1; j < k.length; j++) {
      a = k[i]; b = k[j];
      if (a.s === 3 || b.s === 3) continue;
      if (a.s !== b.s && a.r === b.r) push('DOUBLE_PUNG', a.m | b.m);
    }

    /* --- max-value vertex-disjoint selection --- */
    cands.sort(function (p, q) { return q.v - p.v; });
    var memo = Object.create(null);
    function go(idx, used) {
      if (idx >= cands.length) return { v: 0, list: [] };
      var key = idx * 16 + used;
      if (memo[key]) return memo[key];
      var best = go(idx + 1, used);
      var cd = cands[idx];
      if ((cd.mask & used) === 0) {
        var take = go(idx + 1, used | cd.mask);
        if (take.v + cd.v > best.v) best = { v: take.v + cd.v, list: [cd].concat(take.list) };
      }
      memo[key] = best;
      return best;
    }
    return go(0, 0);
  }

  /* ---------------- per-parse evaluation ---------------- */
  function evalParse(parse, ctx, singleWait) {
    var acc = new Acc();
    var i, t;
    var exposedCount = 0, hasChiPengKan = false;
    for (i = 0; i < (ctx.melds || []).length; i++) {
      if (ctx.melds[i].type !== 'ankan') { exposedCount++; hasChiPengKan = true; }
    }

    /* ---- collect the 14 logical tiles + full counts (kongs = 4) ---- */
    var tiles14 = [], fullCounts = new Array(34).fill(0);
    var melds = null, pairTile = null;

    if (parse.form === 'standard' || parse.form === 'knitteddragon') {
      melds = normaliseMelds(parse, ctx);
      pairTile = parse.pair;
      for (i = 0; i < melds.length; i++) {
        var m = melds[i];
        if (m.k === 'ke') {
          tiles14.push(m.t, m.t, m.t);
          fullCounts[m.t] += m.kong ? 4 : 3;
        } else {
          tiles14.push(m.t, m.t + 1, m.t + 2);
          fullCounts[m.t]++; fullCounts[m.t + 1]++; fullCounts[m.t + 2]++;
        }
      }
      if (parse.form === 'knitteddragon') {
        for (i = 0; i < parse.dragon.length; i++) { tiles14.push(parse.dragon[i]); fullCounts[parse.dragon[i]]++; }
      }
      tiles14.push(pairTile, pairTile); fullCounts[pairTile] += 2;
    } else if (parse.form === 'sevenpairs') {
      for (i = 0; i < parse.pairs.length; i++) { tiles14.push(parse.pairs[i], parse.pairs[i]); fullCounts[parse.pairs[i]] += 2; }
    } else {
      for (i = 0; i < ctx.concealed.length; i++) { tiles14.push(ctx.concealed[i]); fullCounts[ctx.concealed[i]]++; }
    }

    /* ---- whole-hand predicates ---- */
    var suitSeen = [false, false, false], hasWind = false, hasDragon = false, hasHonor = false;
    var allSimple = true, allTermHonor = true, allTerminal = true, allGreen = true, allRev = true;
    var minRank = 9, maxRank = 1, allSuited = true;
    for (i = 0; i < tiles14.length; i++) {
      t = tiles14[i];
      if (T.isHonor(t)) {
        hasHonor = true; allSuited = false;
        if (T.isWind(t)) hasWind = true; else hasDragon = true;
        allSimple = false; allTerminal = false;
      } else {
        suitSeen[T.suitOf(t)] = true;
        var r = T.rankOf(t);
        if (r < minRank) minRank = r;
        if (r > maxRank) maxRank = r;
        if (r === 1 || r === 9) allSimple = false; else allTermHonor = false;
        if (r !== 1 && r !== 9) allTerminal = false;
      }
      if (!GREEN[t]) allGreen = false;
      if (!REVERSIBLE[t]) allRev = false;
    }
    var suitCount = (suitSeen[0] ? 1 : 0) + (suitSeen[1] ? 1 : 0) + (suitSeen[2] ? 1 : 0);

    if (allGreen) acc.add('ALL_GREEN');
    if (allRev) acc.add('REVERSIBLE_TILES');
    if (!hasHonor && suitCount === 1) acc.add('FULL_FLUSH');
    else if (hasHonor && suitCount === 1) acc.add('HALF_FLUSH');
    if (!hasHonor && suitCount === 0) { /* impossible */ }
    if (suitCount === 0 && hasHonor) acc.add('ALL_HONORS');
    if (suitCount < 3) acc.add('ONE_VOIDED_SUIT');
    if (!hasHonor) acc.add('NO_HONORS');
    if (allSimple) acc.add('ALL_SIMPLES');
    if (suitCount === 3 && hasWind && hasDragon) acc.add('ALL_TYPES');
    if (allSuited) {
      if (minRank >= 7) acc.add('UPPER_TILES');
      else if (minRank >= 4 && maxRank <= 6) acc.add('MIDDLE_TILES');
      else if (maxRank <= 3) acc.add('LOWER_TILES');
      if (minRank >= 6) acc.add('UPPER_FOUR');
      if (maxRank <= 4) acc.add('LOWER_FOUR');
    }
    /* 四归一 */
    for (t = 0; t < 34; t++) {
      if (fullCounts[t] === 4) {
        var isKong = false;
        if (melds) for (i = 0; i < melds.length; i++) if (melds[i].kong && melds[i].t === t) isKong = true;
        if (!isKong) acc.add('TILE_HOG');
      }
    }

    /* ---- structural fans ---- */
    if (parse.form === 'standard' || parse.form === 'knitteddragon') {
      var kes = melds.filter(function (x) { return x.k === 'ke'; });
      var shuns = melds.filter(function (x) { return x.k === 'shun'; });

      if (parse.form === 'standard') {
        var combo = combinationFans(melds, pairTile);
        for (i = 0; i < combo.list.length; i++) acc.add(combo.list[i].id);
      } else {
        acc.add('KNITTED_STRAIGHT');
      }

      if (kes.length === 4 && parse.form === 'standard') acc.add('ALL_PUNGS');

      /* 全带幺 / 全带五 */
      var outside = true, allFive = true;
      var groups = melds.map(function (x) { return x; });
      for (i = 0; i < groups.length; i++) {
        var g = groups[i];
        if (g.k === 'ke') {
          if (!T.isTerminalOrHonor(g.t)) outside = false;
          if (T.isHonor(g.t) || T.rankOf(g.t) !== 5) allFive = false;
        } else {
          var r0 = T.rankOf(g.t);
          if (r0 !== 1 && r0 !== 7) outside = false;
          if (r0 < 3 || r0 > 5) allFive = false;
        }
      }
      if (!T.isTerminalOrHonor(pairTile)) outside = false;
      if (T.isHonor(pairTile) || T.rankOf(pairTile) !== 5) allFive = false;
      if (parse.form === 'knitteddragon') { outside = false; allFive = false; }
      if (outside) acc.add('OUTSIDE_HAND');
      if (allFive) acc.add('ALL_FIVE');

      /* 混幺九 / 清幺九 / 全双刻 */
      if (kes.length === 4 && parse.form === 'standard') {
        if (allTermHonor && hasHonor) acc.add('ALL_TERMINALS_AND_HONORS');
        if (allTerminal) acc.add('ALL_TERMINALS');
        var allEven = true;
        for (i = 0; i < tiles14.length; i++) {
          if (T.isHonor(tiles14[i]) || T.rankOf(tiles14[i]) % 2 !== 0) { allEven = false; break; }
        }
        if (allEven) acc.add('ALL_EVEN_PUNGS');
      }

      /* concealed pungs (暗杠 counts as an 暗刻) */
      var conc = 0;
      for (i = 0; i < kes.length; i++) if (kes[i].concealed) conc++;
      if (conc >= 4) acc.add('FOUR_CONCEALED_PUNGS');
      else if (conc === 3) acc.add('THREE_CONCEALED_PUNGS');
      else if (conc === 2) acc.add('TWO_CONCEALED_PUNGS');

      /* kongs */
      var kongM = 0, kongC = 0;
      for (i = 0; i < melds.length; i++) if (melds[i].kong) { if (melds[i].concealed) kongC++; else kongM++; }
      var kongs = kongM + kongC;
      if (kongs === 4) acc.add('FOUR_KONGS');
      else if (kongs === 3) acc.add('THREE_KONGS');
      else if (kongs === 2) {
        if (kongC === 2) acc.add('TWO_CONCEALED_KONGS');
        else if (kongM === 2) acc.add('TWO_MELDED_KONGS');
        else { acc.add('CONCEALED_KONG'); acc.add('MELDED_KONG'); }
      } else if (kongs === 1) {
        if (kongC === 1) acc.add('CONCEALED_KONG'); else acc.add('MELDED_KONG');
      }

      /* honour pungs */
      var winds = [], dragons = [];
      for (i = 0; i < kes.length; i++) {
        if (T.isWind(kes[i].t)) winds.push(T.rankOf(kes[i].t));
        else if (T.isDragon(kes[i].t)) dragons.push(T.rankOf(kes[i].t));
        if (T.isTerminalOrHonor(kes[i].t)) acc.add('PUNG_OF_TERMINALS_OR_HONORS');
      }
      if (dragons.length === 3) acc.add('BIG_THREE_DRAGONS');
      else if (dragons.length === 2 && T.isDragon(pairTile)) acc.add('LITTLE_THREE_DRAGONS');
      else if (dragons.length === 2) acc.add('TWO_DRAGON_PUNGS');
      else if (dragons.length === 1) acc.add('DRAGON_PUNG');

      if (winds.length === 4) acc.add('BIG_FOUR_WINDS');
      else if (winds.length === 3 && T.isWind(pairTile)) acc.add('LITTLE_FOUR_WINDS');
      else if (winds.length === 3) acc.add('BIG_THREE_WINDS');
      for (i = 0; i < winds.length; i++) {
        if (winds[i] === ctx.roundWind) acc.add('PREVALENT_WIND');
        if (winds[i] === ctx.seatWind) acc.add('SEAT_WIND');
      }

      /* 九莲宝灯 */
      if (!hasChiPengKan && (ctx.melds || []).length === 0 && suitCount === 1 && !hasHonor) {
        var base = suitSeen[0] ? 0 : (suitSeen[1] ? 9 : 18);
        var need = [3, 1, 1, 1, 1, 1, 1, 1, 3], extra = 0, ok = true;
        for (i = 0; i < 9; i++) {
          var diff = fullCounts[base + i] - need[i];
          if (diff < 0) { ok = false; break; }
          extra += diff;
        }
        if (ok && extra === 1) acc.add('NINE_GATES');
      }

      /* wait shape */
      if (singleWait) {
        if (pairTile === ctx.winTile && !isPairFromMeld(parse, ctx)) acc.add('SINGLE_WAIT');
        else {
          for (i = 0; i < melds.length; i++) {
            var g2 = melds[i];
            if (g2.declared || g2.k !== 'shun') continue;
            var rr = T.rankOf(g2.t), wr = T.rankOf(ctx.winTile);
            if (T.suitOf(g2.t) !== T.suitOf(ctx.winTile)) continue;
            if (wr === rr + 1) { acc.add('CLOSED_WAIT'); break; }
            if ((rr === 1 && wr === 3) || (rr === 7 && wr === 7)) { acc.add('EDGE_WAIT'); break; }
          }
        }
      }
    } else if (parse.form === 'sevenpairs') {
      acc.add(parse.chain ? 'SEVEN_SHIFTED_PAIRS' : 'SEVEN_PAIRS');
      if (singleWait) acc.add('SINGLE_WAIT');
    } else if (parse.form === 'thirteen') {
      acc.add('THIRTEEN_ORPHANS');
      if (singleWait) acc.add('SINGLE_WAIT');
    } else if (parse.form === 'knittedsingles') {
      if (parse.info.sevenStars) acc.add('GREATER_HONORS_AND_KNITTED');
      else acc.add('LESSER_HONORS_AND_KNITTED');
      if (parse.info.fullDragon) acc.add('KNITTED_STRAIGHT');
    }

    /* ---- situational ---- */
    if (ctx.selfDrawn) acc.add('SELF_DRAWN');
    if (ctx.selfDrawn && !hasChiPengKan) acc.add('FULLY_CONCEALED_HAND');
    if (!ctx.selfDrawn && exposedCount === 4 && (ctx.melds || []).length === 4 &&
        parse.form === 'standard' && pairTile === ctx.winTile) acc.add('MELDED_HAND');
    if (ctx.lastOfKind) acc.add('LAST_TILE');
    if (ctx.lastTileDraw) acc.add('LAST_TILE_DRAW');
    if (ctx.lastTileClaim) acc.add('LAST_TILE_CLAIM');
    if (ctx.afterKong) acc.add('OUT_WITH_REPLACEMENT');
    if (ctx.robbedKong) acc.add('ROBBING_THE_KONG');

    /* ---- apply the exclusion table to a fixed point ---- */
    var present = acc.order.slice();
    for (var pass = 0; pass < 6; pass++) {
      var killed = Object.create(null), changed = false;
      for (i = 0; i < present.length; i++) {
        var ex = EXCLUDE[present[i]];
        if (ex) for (var e = 0; e < ex.length; e++) killed[ex[e]] = true;
      }
      var next = present.filter(function (id) { return !killed[id]; });
      if (next.length !== present.length) changed = true;
      present = next;
      if (!changed) break;
    }

    /* ---- total ---- */
    var fans = [], total = 0;
    for (i = 0; i < present.length; i++) {
      var def = D.byId[present[i]];
      var n = acc.map[present[i]];
      fans.push({ id: def.id, zh: def.zh, en: def.en, v: def.v, n: n, sub: def.v * n });
      total += def.v * n;
    }
    if (total === 0) {
      var ch = D.byId.CHICKEN_HAND;
      fans.push({ id: ch.id, zh: ch.zh, en: ch.en, v: ch.v, n: 1, sub: ch.v });
      total = ch.v;
    }
    /* flowers score but never count toward the minimum */
    var flowerFan = 0;
    if (ctx.flowers > 0) {
      var fl = D.byId.FLOWER_TILES;
      fans.push({ id: fl.id, zh: fl.zh, en: fl.en, v: fl.v, n: ctx.flowers, sub: ctx.flowers });
      flowerFan = ctx.flowers;
    }
    fans.sort(function (a, b) { return b.v - a.v || b.sub - a.sub; });
    return { total: total + flowerFan, baseTotal: total, flowerFan: flowerFan, fans: fans, parse: parse, melds: melds, pair: pairTile, form: parse.form };
  }

  function isPairFromMeld() { return false; }

  /* ---------------- entry point ---------------- */
  function score(ctx) {
    var parses = H.parseWin(ctx.concealed, ctx.melds || []);
    if (!parses.length) return null;
    var pre = ctx.concealed.slice();
    var idx = pre.indexOf(ctx.winTile);
    if (idx >= 0) pre.splice(idx, 1);
    var singleWait = H.waits(pre, ctx.melds || []).length === 1;
    var best = null;
    for (var i = 0; i < parses.length; i++) {
      var r = evalParse(parses[i], ctx, singleWait);
      if (!best || r.total > best.total || (r.total === best.total && r.baseTotal > best.baseTotal)) best = r;
    }
    return best;
  }

  global.MJ.Fan = { score: score, EXCLUDE: EXCLUDE, combinationFans: combinationFans };
})(typeof window !== 'undefined' ? window : globalThis);
