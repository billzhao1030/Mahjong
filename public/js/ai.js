/* =====================================================================
 * ai.js — opponent logic with three difficulty levels
 *
 *   novice  只看向听数，随手打，几乎不看番，鸣牌不check起胡番（常见新手错误）
 *   normal  向听数 + 有效进张 + 粗略番型潜力 + 字牌取舍
 *   expert  再加：番型目标规划（清一色/混一色/碰碰和/断幺/门清）、
 *           现物安全牌防守、听牌威胁评估、落后时弃和打安全牌
 * ===================================================================== */
(function (global) {
  'use strict';
  var T = global.MJ.Tiles, H = global.MJ.Hand;

  var LEVELS = { novice: 0, normal: 1, expert: 2, master: 3 };
  function lv(game) {
    var v = LEVELS[game && game.difficulty];
    return v === undefined ? 1 : v;
  }

  function countIn(arr, t) { var n = 0; for (var i = 0; i < arr.length; i++) if (arr[i] === t) n++; return n; }
  function distinct(arr) {
    var seen = {}, out = [];
    for (var i = 0; i < arr.length; i++) if (!seen[arr[i]]) { seen[arr[i]] = 1; out.push(arr[i]); }
    return out;
  }
  /** every tile of the hand including melds, as a flat list */
  function fullTiles(hand, melds) {
    var all = hand.slice();
    for (var i = 0; i < melds.length; i++) {
      var mt = melds[i].tiles;
      if (melds[i].type === 'chi') all.push(mt[0], mt[1], mt[2]);
      else all.push(mt[0], mt[0], mt[0]);
    }
    return all;
  }

  /* ------------------------------------------------------------------ */
  /* rough fan potential (used by normal + as a floor for expert)        */
  /* ------------------------------------------------------------------ */
  function fanPotential(game, seat, hand, melds) {
    var all = fullTiles(hand, melds), i;
    var suitCount = [0, 0, 0], honors = 0, dragons = {}, winds = {};
    for (i = 0; i < all.length; i++) {
      var t = all[i];
      if (T.isHonor(t)) {
        honors++;
        if (T.isDragon(t)) dragons[t] = (dragons[t] || 0) + 1;
        else winds[t] = (winds[t] || 0) + 1;
      } else suitCount[T.suitOf(t)]++;
    }
    var maxSuit = Math.max(suitCount[0], suitCount[1], suitCount[2]);
    var used = (suitCount[0] > 0 ? 1 : 0) + (suitCount[1] > 0 ? 1 : 0) + (suitCount[2] > 0 ? 1 : 0);
    var est = 0, k;
    if (used <= 1 && honors === 0) est += 24;
    else if (used <= 1) est += 7;
    else if (used <= 2) est += 1;
    if (honors === 0) est += 1;
    for (k in dragons) if (dragons[k] >= 2) est += 2;
    var sw = T.tileId(3, game.seatWind(seat)), rw = T.tileId(3, game.roundWind());
    if ((winds[sw] || 0) >= 2) est += 2;
    if ((winds[rw] || 0) >= 2) est += 2;
    var pungs = 0, d = distinct(all);
    for (i = 0; i < d.length; i++) if (countIn(all, d[i]) >= 3) pungs++;
    if (pungs >= 3) est += 6;
    if (maxSuit >= 11) est += 4;
    return est + 2;
  }

  /* ------------------------------------------------------------------ */
  /* expert: explicit fan goals — value minus how far away we still are  */
  /* ------------------------------------------------------------------ */
  function goalScore(game, seat, hand, melds) {
    var all = fullTiles(hand, melds), i, t;
    var suitCount = [0, 0, 0], honors = 0, termHonor = 0;
    for (i = 0; i < all.length; i++) {
      t = all[i];
      if (T.isHonor(t)) { honors++; termHonor++; }
      else { suitCount[T.suitOf(t)]++; if (T.isTerminal(t)) termHonor++; }
    }
    var bestSuit = 0;
    for (i = 1; i < 3; i++) if (suitCount[i] > suitCount[bestSuit]) bestSuit = i;
    var n = all.length;
    var open = melds.length > 0;

    var goals = [];
    /* 清一色 24 (+无字1) */
    goals.push({ fan: 25, dist: n - suitCount[bestSuit] });
    /* 混一色 6 (+缺一门1) */
    goals.push({ fan: 7, dist: n - suitCount[bestSuit] - honors });
    /* 碰碰和 6 — distance ≈ groups that are not yet pairs/triplets */
    var pairs = 0, trip = 0, dd = distinct(all);
    for (i = 0; i < dd.length; i++) {
      var c = countIn(all, dd[i]);
      if (c >= 3) trip++; else if (c === 2) pairs++;
    }
    for (i = 0; i < melds.length; i++) if (melds[i].type === 'chi') trip -= 9; // chows kill it
    goals.push({ fan: 6, dist: Math.max(0, 4 - trip - pairs) * 2 });
    /* 断幺 2 */
    goals.push({ fan: 2, dist: termHonor });
    /* 全带幺 4 */
    goals.push({ fan: 5, dist: Math.max(0, 10 - termHonor) });
    /* 门清自摸 不求人 4+1 */
    if (!open) goals.push({ fan: 5, dist: 1 });

    /* scoring honours already held */
    var bonus = 0, sw = T.tileId(3, game.seatWind(seat)), rw = T.tileId(3, game.roundWind());
    for (i = 0; i < dd.length; i++) {
      t = dd[i];
      var c2 = countIn(all, t);
      if (T.isDragon(t) && c2 >= 2) bonus += (c2 >= 3 ? 3 : 1.6);
      if (t === sw && c2 >= 2) bonus += (c2 >= 3 ? 3 : 1.6);
      if (t === rw && c2 >= 2) bonus += (c2 >= 3 ? 3 : 1.6);
    }

    var best = 0;
    for (i = 0; i < goals.length; i++) {
      var v = goals[i].fan - 2.2 * goals[i].dist;
      if (v > best) best = v;
    }
    return best + bonus;
  }


  /* ------------------------------------------------------------------ */
  /* master: score a ready hand by what it can actually be declared for  */
  /* ------------------------------------------------------------------ */
  var _wvCache = null, _wvKey = '';
  function waitValue(game, seat, hand, melds) {
    var key = seat + '|' + hand.join(',') + '|' + melds.length + '|' + game.h.discards[0].length;
    if (_wvKey === key) return _wvCache;
    var w = H.waits(hand, melds), total = 0, declarable = 0;
    for (var i = 0; i < w.length; i++) {
      var tl = w[i];
      var live = 4 - game.visibleCount(tl) - countIn(hand, tl);
      if (live <= 0) continue;
      var r = global.MJ.Fan.score({
        concealed: hand.concat([tl]), melds: melds, winTile: tl, selfDrawn: false,
        seatWind: game.seatWind(seat), roundWind: game.roundWind(),
        flowers: game.h.flowers[seat].length,
        lastOfKind: false, lastTileDraw: false, lastTileClaim: false,
        afterKong: false, robbedKong: false
      });
      if (!r || r.baseTotal < game.minFan) continue;      // a hand you cannot declare is worth nothing
      declarable++;
      total += live * Math.min(r.total, 64);
    }
    _wvKey = key;
    _wvCache = { value: total, tiles: declarable, waits: w.length };
    return _wvCache;
  }

  /* ------------------------------------------------------------------ */
  /* expert: threat model and safe-tile estimation                       */
  /* ------------------------------------------------------------------ */
  function threats(game, seat) {
    var h = game.h, out = [], wall = game.wallLeft();
    for (var o = 0; o < 4; o++) {
      if (o === seat) continue;
      var melds = h.melds[o], score = 0, i;
      score += melds.length * 1.1;
      for (i = 0; i < melds.length; i++) {
        var t0 = melds[i].tiles[0];
        if (T.isDragon(t0) || T.rankOf(t0) === game.seatWind(o) && T.isWind(t0)) score += 1.2;
      }
      if (h.discards[o].length >= 8 && wall < 40) score += 0.8;
      if (wall < 20) score += 0.8;
      if (score >= 2.2) out.push({ seat: o, score: score });
    }
    return out;
  }

  /** 0 = certainly safe, higher = more dangerous */
  function tileDanger(game, seat, tile, ths) {
    if (!ths.length) return 0;
    var h = game.h, total = 0;
    for (var i = 0; i < ths.length; i++) {
      var o = ths[i].seat;
      if (h.discards[o].indexOf(tile) >= 0) continue;          // 现物：对该家绝对安全
      var vis = game.visibleCount(tile) + countIn(h.hands[seat], tile);
      var d;
      if (T.isHonor(tile)) d = vis >= 3 ? 0.2 : (vis >= 2 ? 0.6 : 1.4);
      else {
        var r = T.rankOf(tile), su = T.suitOf(tile);
        d = (r === 1 || r === 9) ? 1.4 : ((r === 2 || r === 8) ? 2.0 : 2.6);
        if (vis >= 3) d *= 0.5;
        /* kabe: if every copy of an adjacent rank is already showing, the
           two-sided waits through it cannot exist, so this tile is safer */
        var gone = function (rank) {
          if (rank < 1 || rank > 9) return true;
          var id = T.tileId(su, rank);
          return game.visibleCount(id) + countIn(h.hands[seat], id) >= 4;
        };
        if (gone(r - 1) && gone(r + 1)) d *= 0.35;
        else if (gone(r - 1) || gone(r + 1)) d *= 0.7;
      }
      total += d * Math.min(2, ths[i].score / 2.2);
    }
    return total;
  }

  /* ------------------------------------------------------------------ */
  /* useful (shanten-advancing) tile count, weighted by live copies      */
  /* ------------------------------------------------------------------ */
  function usefulCount(game, seat, hand, melds) {
    var base = H.shanten(hand, melds), n = 0;
    for (var t = 0; t < 34; t++) {
      if (countIn(hand, t) >= 4) continue;
      hand.push(t);
      var s = H.shanten(hand, melds);
      hand.pop();
      if (s < base) {
        var seen = game.visibleCount(t) + countIn(hand, t);
        n += Math.max(0, 4 - seen);
      }
    }
    return n;
  }

  /* ------------------------------------------------------------------ */
  /* discard                                                             */
  /* ------------------------------------------------------------------ */
  function chooseDiscard(game, seat) {
    var h = game.h, hand = h.hands[seat], melds = h.melds[seat], level = lv(game), i;
    var cands = distinct(hand), results = [], minSh = 99;

    for (i = 0; i < cands.length; i++) {
      var rest = hand.slice();
      rest.splice(rest.indexOf(cands[i]), 1);
      var sh = H.shanten(rest, melds);
      if (sh < minSh) minSh = sh;
      results.push({ t: cands[i], sh: sh, rest: rest });
    }

    /* ---------- novice: shanten only, crude tie-break, some noise ---------- */
    if (level === 0) {
      var pool0 = results.filter(function (r) { return r.sh === minSh; });
      if (Math.random() < 0.16 && results.length > 1) {          // occasional blunder
        pool0 = results;
      }
      pool0.sort(function (a, b) {
        var av = (T.isHonor(a.t) ? 0 : (T.isTerminal(a.t) ? 1 : 2));
        var bv = (T.isHonor(b.t) ? 0 : (T.isTerminal(b.t) ? 1 : 2));
        return av - bv;
      });
      var pick = pool0.slice(0, Math.max(1, Math.min(3, pool0.length)));
      return pick[Math.floor(Math.random() * pick.length)].t;
    }

    var pool = results.filter(function (r) { return r.sh === minSh; });
    if (pool.length === 1 && level === 1) return pool[0].t;

    /* expert also considers a one-step-back discard when it is much safer */
    var ths = level >= 2 ? threats(game, seat) : [];
    if (level >= 2 && ths.length && minSh >= 2) {
      var back = results.filter(function (r) { return r.sh === minSh + 1; });
      pool = pool.concat(back);
    }

    var dangerWeight = 0;
    if (level >= 2 && ths.length) {
      dangerWeight = minSh >= 3 ? 3.2 : (minSh === 2 ? 1.7 : 0.7);
      if (level === 3) {
        dangerWeight *= 1.35;                          // master folds a touch earlier
        /* nothing left to play for → drop the hand and defend outright */
        var hopeless = (game.wallLeft() < 34 && minSh >= 2) || (game.wallLeft() < 18 && minSh >= 1);
        if (hopeless) dangerWeight = 14;
      }
    }

    var best = null;
    for (i = 0; i < pool.length; i++) {
      var r = pool[i];
      var uc = usefulCount(game, seat, r.rest, melds);
      var score;
      if (level === 1) {
        var fp = fanPotential(game, seat, r.rest, melds);
        score = uc * 2 + Math.min(fp, 40) * 0.8 + honorAdjust(game, seat, hand, r.t);
      } else {
        var gs = goalScore(game, seat, r.rest, melds);
        var danger = tileDanger(game, seat, r.t, ths);
        var speedW = 2.2, valueW = 1.5;
        if (level === 3) {
          /* early: build value. late: build speed. */
          var left = game.wallLeft();
          speedW = left > 60 ? 1.5 : (left > 30 ? 2.3 : 3.1);
          valueW = left > 60 ? 2.7 : (left > 30 ? 1.7 : 1.0);
        }
        score = uc * speedW + gs * valueW + honorAdjust(game, seat, hand, r.t) - danger * dangerWeight;
        if (level === 3 && r.sh <= 0) {
          /* at tenpai, judge the wait by what it can actually be declared for */
          var wv = waitValue(game, seat, r.rest, melds);
          score += wv.value * 0.7 + wv.tiles * 5;
          if (wv.tiles === 0) score -= 60;                   // ready but undeclarable: worthless
        }
        if (r.sh > minSh) score -= 6;                        // stepping back costs tempo
      }
      if (!best || score > best.score) best = { t: r.t, score: score };
    }
    return best ? best.t : pool[0].t;
  }

  /** positive = this tile is a fine discard, negative = keep it */
  function honorAdjust(game, seat, hand, tile) {
    if (!T.isHonor(tile)) return 0;
    var own = countIn(hand, tile), out = game.visibleCount(tile);
    var scoring = T.isDragon(tile) || T.rankOf(tile) === game.seatWind(seat) || T.rankOf(tile) === game.roundWind();
    if (own === 1 && out >= 2) return 6;      // dead single honour — dump it
    if (own >= 2 && scoring) return -8;       // scoring pair — keep it
    if (own === 1 && !scoring) return 3;
    return 0;
  }

  /* ------------------------------------------------------------------ */
  /* claims and kongs                                                    */
  /* ------------------------------------------------------------------ */
  function wantsWin(game, seat, result) { return !!(result && result.legal); }

  function turnDecision(game, seat) {
    var acts = game.h.turnActions || [], i, level = lv(game);
    for (i = 0; i < acts.length; i++) if (acts[i].kind === 'hu' && wantsWin(game, seat, acts[i].result)) return acts[i];
    for (i = 0; i < acts.length; i++) {
      var a = acts[i];
      if (a.kind !== 'ankan' && a.kind !== 'bukan') continue;
      if (level === 0) return a;                          // novice kongs on sight
      var hand = game.h.hands[seat].slice(), melds = game.h.melds[seat];
      var before = H.shanten(hand, melds);
      if (a.kind === 'ankan') {
        var test = hand.filter(function (x) { return x !== a.tile; });
        var fake = melds.concat([{ type: 'ankan', tiles: [a.tile, a.tile, a.tile, a.tile] }]);
        if (H.shanten(test, fake) <= before) return a;
      } else {
        // 补杠 exposes us to 抢杠和 — expert skips it when the wall is nearly gone
        if (level >= 2 && game.wallLeft() < 8) continue;
        return a;
      }
    }
    return null;
  }

  function claimDecision(game, seat, options) {
    var i, level = lv(game);
    for (i = 0; i < options.length; i++) if (options[i].kind === 'hu' && wantsWin(game, seat, options[i].result)) return options[i];

    var h = game.h, hand = h.hands[seat], melds = h.melds[seat];
    var before = H.shanten(hand, melds);
    var best = null;
    var ths = level === 2 ? threats(game, seat) : [];

    for (i = 0; i < options.length; i++) {
      var o = options[i], newHand, newMelds;
      if (o.kind === 'peng' || o.kind === 'gang') {
        var take = o.kind === 'gang' ? 3 : 2;
        newHand = hand.slice();
        for (var k = 0; k < take; k++) newHand.splice(newHand.indexOf(o.tile), 1);
        newMelds = melds.concat([{ type: o.kind === 'gang' ? 'minkan' : 'peng', tiles: [o.tile, o.tile, o.tile] }]);
      } else {
        newHand = hand.slice();
        newHand.splice(newHand.indexOf(o.with[0]), 1);
        newHand.splice(newHand.indexOf(o.with[1]), 1);
        newMelds = melds.concat([{ type: 'chi', tiles: [o.with[0], o.with[1], o.tile] }]);
      }
      var sh = H.shanten(newHand, newMelds);

      /* ---------- novice ---------- */
      if (level === 0) {
        // grabs pungs happily, never chows, and ignores whether the hand can ever be declared
        if (o.kind === 'chi') continue;
        if (sh <= before) { best = { gain: 1, opt: o }; break; }
        continue;
      }

      if (sh > before) continue;                          // never go backwards
      var fp = fanPotential(game, seat, newHand, newMelds);
      if (fp < game.minFan) continue;                     // would never be able to declare
      if (sh === before && o.kind === 'chi') continue;

      var gain;
      if (level === 1) {
        if (sh > 2 && o.kind === 'chi') continue;
        gain = (before - sh) * 10 + fp * 0.3 + (o.kind === 'peng' ? 2 : 0) + (o.kind === 'gang' ? 3 : 0);
      } else {
        var gs = goalScore(game, seat, newHand, newMelds);
        if (gs < game.minFan * 0.55) continue;            // the shape must still be worth something
        if (sh > 2 && o.kind === 'chi') continue;
        if (sh >= 2 && ths.length >= 2) continue;         // don't open up while under pressure
        gain = (before - sh) * 10 + gs * 1.2
             + (o.kind === 'peng' ? 2 : 0) + (o.kind === 'gang' ? 2 : 0)
             - (o.kind === 'chi' ? 1.5 : 0);
        if (sh === 0) gain += 6;                          // reaching tenpai is worth a lot
        if (level === 3 && sh === 0) {
          var wvc = waitValue(game, seat, newHand, newMelds);
          if (wvc.tiles === 0) continue;                  // never meld into a hand you cannot declare
          gain += wvc.value * 0.4;
        }
      }
      if (!best || gain > best.gain) best = { gain: gain, opt: o };
    }
    return best ? best.opt : null;
  }

  global.MJ.AI = {
    chooseDiscard: chooseDiscard, claimDecision: claimDecision,
    turnDecision: turnDecision, wantsWin: wantsWin,
    fanPotential: fanPotential, goalScore: goalScore, threats: threats, waitValue: waitValue,
    LEVELS: LEVELS
  };
})(typeof window !== 'undefined' ? window : globalThis);
