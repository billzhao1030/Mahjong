/* =====================================================================
 * hand.js — hand decomposition, win detection, waits and shanten
 *
 * Win shapes recognised (MCR):
 *   1. standard      4 melds + 1 pair
 *   2. 七对 / 连七对  seven pairs (four-of-a-kind counts as two pairs)
 *   3. 十三幺         thirteen orphans
 *   4. 全不靠 / 七星不靠  14 unrelated singles on knitted residues
 *   5. 组合龙 hand    knitted straight (9 tiles) + 1 meld + 1 pair
 * ===================================================================== */
(function (global) {
  'use strict';
  var T = global.MJ.Tiles;
  var N = T.PLAY_TILES;

  /* ------------------------------------------------------------------ */
  /* Standard decomposition                                              */
  /* ------------------------------------------------------------------ */

  /** all ways to carve `need` melds out of counts, always consuming the
   *  lowest remaining tile first (which makes results duplicate-free) */
  function carveMelds(counts, need) {
    if (need === 0) return [[]];
    var i = 0;
    while (i < N && counts[i] === 0) i++;
    if (i >= N) return [];
    var res = [], sub, k;
    if (counts[i] >= 3) {
      counts[i] -= 3;
      sub = carveMelds(counts, need - 1);
      counts[i] += 3;
      for (k = 0; k < sub.length; k++) res.push([{ k: 'ke', t: i }].concat(sub[k]));
    }
    if (i < 27 && T.rankOf(i) <= 7 && counts[i + 1] > 0 && counts[i + 2] > 0) {
      counts[i]--; counts[i + 1]--; counts[i + 2]--;
      sub = carveMelds(counts, need - 1);
      counts[i]++; counts[i + 1]++; counts[i + 2]++;
      for (k = 0; k < sub.length; k++) res.push([{ k: 'shun', t: i }].concat(sub[k]));
    }
    return res;
  }

  /** every (melds + pair) split of a 3n+2 concealed hand */
  function standardSplits(counts, needMelds) {
    var out = [], p, ms, k;
    for (p = 0; p < N; p++) {
      if (counts[p] < 2) continue;
      counts[p] -= 2;
      ms = carveMelds(counts, needMelds);
      counts[p] += 2;
      for (k = 0; k < ms.length; k++) out.push({ melds: ms[k], pair: p });
    }
    return out;
  }

  /* ------------------------------------------------------------------ */
  /* Special shapes                                                      */
  /* ------------------------------------------------------------------ */

  function sevenPairsInfo(counts) {
    var pairs = [], t, kinds = 0;
    for (t = 0; t < N; t++) {
      if (counts[t] === 0) continue;
      if (counts[t] % 2 !== 0) return null;
      kinds++;
      for (var i = 0; i < counts[t] / 2; i++) pairs.push(t);
    }
    if (pairs.length !== 7) return null;
    // 连七对: seven consecutive pairs in one suit
    var chain = false;
    if (kinds === 7 && pairs[0] < 27 && T.suitOf(pairs[0]) === T.suitOf(pairs[6])) {
      chain = true;
      for (var j = 1; j < 7; j++) if (pairs[j] !== pairs[0] + j) { chain = false; break; }
    }
    return { pairs: pairs, kinds: kinds, chain: chain };
  }

  var ORPHANS = [0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33];

  function thirteenOrphansInfo(counts) {
    var dup = -1, t;
    for (t = 0; t < N; t++) {
      if (counts[t] === 0) continue;
      if (ORPHANS.indexOf(t) < 0) return null;
      if (counts[t] > 2) return null;
      if (counts[t] === 2) { if (dup >= 0) return null; dup = t; }
    }
    if (dup < 0) return null;
    for (var i = 0; i < 13; i++) if (counts[ORPHANS[i]] === 0) return null;
    return { dup: dup };
  }

  /* knitted residues: suit A takes {1,4,7}, B {2,5,8}, C {3,6,9} */
  var RESIDUE_PERMS = [[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]];

  /** classify a set of distinct suited tiles against a residue assignment */
  function knittedFit(suitedTiles) {
    for (var p = 0; p < RESIDUE_PERMS.length; p++) {
      var perm = RESIDUE_PERMS[p], ok = true;
      for (var i = 0; i < suitedTiles.length; i++) {
        var t = suitedTiles[i];
        var want = perm[T.suitOf(t)];            // 0 -> {1,4,7}, 1 -> {2,5,8}, 2 -> {3,6,9}
        if ((T.rankOf(t) - 1) % 3 !== want) { ok = false; break; }
      }
      if (ok) return perm;
    }
    return null;
  }

  /** 全不靠 / 七星不靠: 14 distinct tiles, suited part knitted, honors distinct */
  function knittedSinglesInfo(counts) {
    var suited = [], honors = [], t;
    for (t = 0; t < N; t++) {
      if (counts[t] === 0) continue;
      if (counts[t] > 1) return null;
      if (t < 27) suited.push(t); else honors.push(t);
    }
    if (suited.length + honors.length !== 14) return null;
    var perm = knittedFit(suited);
    if (!perm) return null;
    // full knitted straight present? (all nine residue tiles)
    var full = suited.length >= 9 && countKnittedComplete(suited, perm);
    return { suited: suited, honors: honors, perm: perm, fullDragon: full, sevenStars: honors.length === 7 };
  }

  function countKnittedComplete(suited, perm) {
    var need = {};
    for (var s = 0; s < 3; s++) {
      var res = perm[s];
      for (var k = 0; k < 3; k++) need[T.tileId(s, res + 1 + k * 3)] = false;
    }
    for (var i = 0; i < suited.length; i++) if (need.hasOwnProperty(suited[i])) need[suited[i]] = true;
    for (var key in need) if (!need[key]) return false;
    return true;
  }

  /** 组合龙 hand: nine knitted tiles + one meld + one pair */
  function knittedDragonSplits(counts, exposedMeldCount) {
    var out = [];
    // try every residue permutation and every suit assignment
    for (var p = 0; p < RESIDUE_PERMS.length; p++) {
      var perm = RESIDUE_PERMS[p];
      var need = [], ok = true, s, k;
      for (s = 0; s < 3; s++) for (k = 0; k < 3; k++) need.push(T.tileId(s, perm[s] + 1 + k * 3));
      for (var i = 0; i < need.length; i++) if (counts[need[i]] < 1) { ok = false; break; }
      if (!ok) continue;
      var rest = counts.slice();
      for (var j = 0; j < need.length; j++) rest[need[j]]--;
      var remain = 0;
      for (var t = 0; t < N; t++) remain += rest[t];
      if (exposedMeldCount === 0) {
        if (remain !== 5) continue;
        var splits = standardSplits(rest, 1);
        for (var a = 0; a < splits.length; a++) {
          out.push({ dragon: need.slice(), melds: splits[a].melds, pair: splits[a].pair, perm: perm });
        }
      } else if (exposedMeldCount === 1) {
        if (remain !== 2) continue;
        var pr = -1;
        for (var t2 = 0; t2 < N; t2++) if (rest[t2] === 2) pr = t2;
        if (pr < 0) continue;
        out.push({ dragon: need.slice(), melds: [], pair: pr, perm: perm });
      }
    }
    return out;
  }

  /* ------------------------------------------------------------------ */
  /* Public: enumerate every legal interpretation of a winning hand      */
  /* ------------------------------------------------------------------ */

  /**
   * @param concealed  array of tile ids held in hand (winning tile included)
   * @param melds      array of declared melds {type:'chi'|'peng'|'minkan'|'ankan'|'bukan', tiles:[], from}
   * @returns array of parse objects, or [] when the hand is not a win
   */
  function parseWin(concealed, melds) {
    melds = melds || [];
    var counts = T.toCounts(concealed);
    var total = concealed.length;
    var expected = 14 - 3 * melds.length;
    var res = [];
    if (total !== expected) return res;

    // 1. standard
    var needMelds = 4 - melds.length;
    if (total === needMelds * 3 + 2) {
      var splits = standardSplits(counts, needMelds);
      for (var i = 0; i < splits.length; i++) {
        res.push({ form: 'standard', melds: splits[i].melds, pair: splits[i].pair });
      }
    }
    // 2/3/4/5 require a fully concealed hand
    if (melds.length === 0) {
      var sp = sevenPairsInfo(counts);
      if (sp) res.push({ form: 'sevenpairs', pairs: sp.pairs, chain: sp.chain, kinds: sp.kinds });
      var th = thirteenOrphansInfo(counts);
      if (th) res.push({ form: 'thirteen', dup: th.dup });
      var kn = knittedSinglesInfo(counts);
      if (kn) res.push({ form: 'knittedsingles', info: kn });
    }
    if (melds.length <= 1) {
      var okMeld = true;
      if (melds.length === 1) {
        // the single declared meld may be any chi/peng/kong
        okMeld = true;
      }
      if (okMeld) {
        var kd = knittedDragonSplits(counts, melds.length);
        for (var d = 0; d < kd.length; d++) {
          res.push({ form: 'knitteddragon', dragon: kd[d].dragon, melds: kd[d].melds, pair: kd[d].pair, perm: kd[d].perm });
        }
      }
    }
    return res;
  }

  function isWin(concealed, melds) { return parseWin(concealed, melds).length > 0; }

  /** tiles that would complete the hand right now */
  function waits(concealed, melds) {
    var out = [];
    for (var t = 0; t < N; t++) {
      concealed.push(t);
      if (isWin(concealed, melds)) out.push(t);
      concealed.pop();
    }
    return out;
  }

  /* ------------------------------------------------------------------ */
  /* Shanten (used by the AI and by the "tiles away" readout)             */
  /* ------------------------------------------------------------------ */

  function standardShanten(counts, fixedMelds) {
    var best = 99;
    var c = counts.slice();

    function evalBlocks(melds, partials, hasPair) {
      var m = melds + fixedMelds;
      var blocks = m + partials;
      if (blocks > 5) partials -= (blocks - 5), blocks = 5;
      var s = 8 - 2 * m - partials;
      if (blocks === 5 && !hasPair) s += 1;
      if (s < best) best = s;
    }

    function dfsPartial(i, melds, partials, hasPair) {
      if (melds + fixedMelds + partials >= 5 || i >= N) { evalBlocks(melds, partials, hasPair); return; }
      var moved = false;
      for (var j = i; j < N; j++) {
        if (c[j] === 0) continue;
        if (c[j] >= 2) {
          c[j] -= 2; dfsPartial(j, melds, partials + 1, true); c[j] += 2; moved = true;
        }
        if (j < 27 && T.rankOf(j) <= 8 && c[j + 1] > 0) {
          c[j]--; c[j + 1]--; dfsPartial(j, melds, partials + 1, hasPair); c[j]++; c[j + 1]++; moved = true;
        }
        if (j < 27 && T.rankOf(j) <= 7 && c[j + 2] > 0) {
          c[j]--; c[j + 2]--; dfsPartial(j, melds, partials + 1, hasPair); c[j]++; c[j + 2]++; moved = true;
        }
        break;
      }
      if (!moved) evalBlocks(melds, partials, hasPair);
      else {
        // also allow skipping the lowest tile entirely
        var j2 = i;
        while (j2 < N && c[j2] === 0) j2++;
        if (j2 < N) { var save = c[j2]; c[j2] = 0; dfsPartial(j2 + 1, melds, partials, hasPair); c[j2] = save; }
      }
    }

    function dfsMeld(i, melds) {
      if (melds + fixedMelds >= 4 || i >= N) { dfsPartial(0, melds, 0, false); return; }
      var j = i;
      while (j < N && c[j] === 0) j++;
      if (j >= N) { dfsPartial(0, melds, 0, false); return; }
      if (c[j] >= 3) { c[j] -= 3; dfsMeld(j, melds + 1); c[j] += 3; }
      if (j < 27 && T.rankOf(j) <= 7 && c[j + 1] > 0 && c[j + 2] > 0) {
        c[j]--; c[j + 1]--; c[j + 2]--; dfsMeld(j, melds + 1); c[j]++; c[j + 1]++; c[j + 2]++;
      }
      // skip tile j for *meld* extraction, but leave it available for partials
      dfsMeld(j + 1, melds);
      dfsPartial(0, melds, 0, false);
    }

    dfsMeld(0, 0);
    return best;
  }

  function sevenPairsShanten(counts) {
    var pairs = 0, kinds = 0;
    for (var t = 0; t < N; t++) {
      if (counts[t] > 0) kinds++;
      pairs += Math.floor(counts[t] / 2);
    }
    if (pairs > 7) pairs = 7;
    var s = 6 - pairs;
    if (kinds < 7) s += (7 - kinds);
    return s;
  }

  function thirteenShanten(counts) {
    var kinds = 0, hasPair = 0;
    for (var i = 0; i < ORPHANS.length; i++) {
      var t = ORPHANS[i];
      if (counts[t] > 0) kinds++;
      if (counts[t] >= 2) hasPair = 1;
    }
    return 13 - kinds - hasPair;
  }

  /** shanten of the whole hand (0 = tenpai, -1 = won) */
  function shanten(concealed, melds) {
    var counts = T.toCounts(concealed);
    var fixed = (melds || []).length;
    var s = standardShanten(counts, fixed);
    if (fixed === 0) {
      s = Math.min(s, sevenPairsShanten(counts), thirteenShanten(counts));
    }
    return s;
  }

  global.MJ.Hand = {
    carveMelds: carveMelds,
    standardSplits: standardSplits,
    parseWin: parseWin,
    isWin: isWin,
    waits: waits,
    shanten: shanten,
    ORPHANS: ORPHANS,
    knittedFit: knittedFit
  };
})(typeof window !== 'undefined' ? window : globalThis);
