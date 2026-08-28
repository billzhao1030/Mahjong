/* =====================================================================
 * game.js — MCR match state machine
 *   一场 = 4 圈 × 4 局 = 16 局，不连庄。
 *   Seat 0 is the human player. Seats are counter-clockwise: 0=下 1=右 2=对 3=左
 * ===================================================================== */
(function (global) {
  'use strict';
  var T = global.MJ.Tiles, H = global.MJ.Hand, Fan = global.MJ.Fan;

  var PHASE = { DEAL: 'deal', DRAW: 'draw', DISCARD: 'discard', CLAIM: 'claim', OVER: 'over' };

  function Game(opts) {
    opts = opts || {};
    this.matchId = opts.matchId || ('m' + Date.now().toString(36));
    this.minFan = opts.minFan === undefined ? 8 : opts.minFan;
    this.difficulty = opts.difficulty || 'normal';   // novice | normal | expert | master
    this.luck = opts.luck === undefined ? 50 : opts.luck;  // 0-100, 50 = fair
    this.seed = opts.seed || (Math.random() * 0x7fffffff) | 0;
    this.handNo = opts.handNo || 0;                 // 0..15
    this.scores = opts.scores || [0, 0, 0, 0];
    this.history = opts.history || [];              // per-hand results
    this.listeners = [];
    this.finished = false;
    this.h = null;                                  // current hand
  }

  Game.prototype.on = function (fn) { this.listeners.push(fn); };
  Game.prototype.emit = function (type, data) {
    var ev = { type: type, data: data || {} };
    for (var i = 0; i < this.listeners.length; i++) this.listeners[i](ev);
  };

  Game.prototype.roundWind = function () { return Math.floor(this.handNo / 4) + 1; };
  Game.prototype.dealer = function () { return this.handNo % 4; };
  /** seat wind of a seat: dealer is 东(1), then counter-clockwise */
  Game.prototype.seatWind = function (seat) { return ((seat - this.dealer() + 4) % 4) + 1; };

  /* ------------------------------------------------------------------ */
  /* dealing                                                             */
  /* ------------------------------------------------------------------ */
  Game.prototype.startHand = function () {
    var rng = T.makeRng((this.seed + this.handNo * 7919) >>> 0);
    var wall = T.shuffle(T.buildWall(), rng);
    var h = this.h = {
      wall: wall, front: 0, back: wall.length - 1,
      hands: [[], [], [], []], melds: [[], [], [], []],
      discards: [[], [], [], []], flowers: [[], [], [], []],
      turn: this.dealer(), phase: PHASE.DEAL,
      lastDiscard: null, drawn: null, afterKong: false, kongCount: 0,
      pending: null, claim: null, log: [], winner: null, result: null,
      robbing: null
    };
    var i, s;
    for (i = 0; i < 13; i++) for (s = 0; s < 4; s++) h.hands[s].push(wall[h.front++]);
    for (s = 0; s < 4; s++) this._replaceFlowers(s);
    this.emit('deal', { dealer: this.dealer(), handNo: this.handNo });
    h.phase = PHASE.DRAW;
    return h;
  };

  Game.prototype._replaceFlowers = function (seat) {
    var h = this.h, changed = true;
    while (changed) {
      changed = false;
      for (var i = 0; i < h.hands[seat].length; i++) {
        if (T.isFlower(h.hands[seat][i])) {
          var f = h.hands[seat].splice(i, 1)[0];
          h.flowers[seat].push(f);
          this.emit('flower', { seat: seat, tile: f });
          if (h.front <= h.back) h.hands[seat].push(h.wall[h.back--]);
          changed = true;
          break;
        }
      }
    }
    h.hands[seat] = T.sortTiles(h.hands[seat]);
  };

  Game.prototype.wallLeft = function () {
    var h = this.h;
    return h ? Math.max(0, h.back - h.front + 1) : 0;
  };

  /* ------------------------------------------------------------------ */
  /* helpers                                                             */
  /* ------------------------------------------------------------------ */
  function removeTile(arr, t) {
    var i = arr.indexOf(t);
    if (i >= 0) arr.splice(i, 1);
    return i >= 0;
  }
  function countIn(arr, t) { var n = 0; for (var i = 0; i < arr.length; i++) if (arr[i] === t) n++; return n; }

  /** how many copies of `t` are face-up on the table (discards + melds) */
  Game.prototype.visibleCount = function (t, exceptDiscard) {
    var h = this.h, n = 0, s, i, j;
    for (s = 0; s < 4; s++) {
      for (i = 0; i < h.discards[s].length; i++) if (h.discards[s][i] === t) n++;
      for (i = 0; i < h.melds[s].length; i++) {
        var m = h.melds[s][i];
        if (m.type === 'ankan') continue;
        for (j = 0; j < m.tiles.length; j++) if (m.tiles[j] === t) n++;
      }
    }
    if (exceptDiscard) n--;
    return n;
  };

  Game.prototype.chiOptions = function (seat, tile) {
    if (tile >= 27) return [];
    var hand = this.h.hands[seat], r = T.rankOf(tile), s = T.suitOf(tile), out = [];
    function has(rank) { return rank >= 1 && rank <= 9 && countIn(hand, T.tileId(s, rank)) > 0; }
    if (has(r - 2) && has(r - 1)) out.push([T.tileId(s, r - 2), T.tileId(s, r - 1)]);
    if (has(r - 1) && has(r + 1)) out.push([T.tileId(s, r - 1), T.tileId(s, r + 1)]);
    if (has(r + 1) && has(r + 2)) out.push([T.tileId(s, r + 1), T.tileId(s, r + 2)]);
    return out;
  };

  /** concealed kongs / added kongs available to the player on their turn */
  Game.prototype.kongOptions = function (seat) {
    var h = this.h, hand = h.hands[seat], out = [], t, i;
    var seen = {};
    for (i = 0; i < hand.length; i++) {
      t = hand[i];
      if (seen[t]) continue;
      seen[t] = 1;
      if (countIn(hand, t) === 4) out.push({ kind: 'ankan', tile: t });
    }
    for (i = 0; i < h.melds[seat].length; i++) {
      var m = h.melds[seat][i];
      if (m.type === 'peng' && countIn(hand, m.tiles[0]) > 0) out.push({ kind: 'bukan', tile: m.tiles[0], meldIndex: i });
    }
    return out;
  };

  /** evaluate a win for `seat`; returns the fan result or null */
  Game.prototype.evaluateWin = function (seat, winTile, opts) {
    opts = opts || {};
    var h = this.h;
    var concealed = h.hands[seat].slice();
    if (opts.fromHand) { /* winTile already in hand (self draw) */ }
    else concealed.push(winTile);
    var ctx = {
      concealed: concealed,
      melds: h.melds[seat],
      winTile: winTile,
      selfDrawn: !!opts.selfDrawn,
      seatWind: this.seatWind(seat),
      roundWind: this.roundWind(),
      flowers: h.flowers[seat].length,
      lastOfKind: opts.selfDrawn ? false : this.visibleCount(winTile, true) === 3,
      lastTileDraw: !!opts.lastTileDraw,
      lastTileClaim: !!opts.lastTileClaim,
      afterKong: !!opts.afterKong,
      robbedKong: !!opts.robbedKong
    };
    var r = Fan.score(ctx);
    if (!r) return null;
    r.legal = r.baseTotal >= this.minFan;
    r.ctx = ctx;
    return r;
  };

  function withoutOne(arr, t) {
    var out = arr.slice(), i = out.indexOf(t);
    if (i >= 0) out.splice(i, 1);
    return out;
  }

  /* ------------------------------------------------------------------ */
  /* luck                                                                */
  /*   50 = untouched. Above 50 the upcoming wall is nudged so the human */
  /*   draws what they need, and bots lean towards discarding tiles the  */
  /*   human can claim. Below 50 both effects are inverted. Tile counts  */
  /*   are never altered — only the order of tiles still to be drawn.    */
  /* ------------------------------------------------------------------ */
  Game.prototype.luckBias = function () { return (this.luck - 50) / 50; };

  /** how much seat 0 would like `tile` to be discarded by `fromSeat` */
  Game.prototype._humanClaimValue = function (fromSeat, tile) {
    if (fromSeat === 0) return 0;
    var h = this.h, hand = h.hands[0];
    var test = hand.slice();
    test.push(tile);
    if (H.isWin(test, h.melds[0])) {
      var r = this.evaluateWin(0, tile, {});
      if (r && r.legal) return 6;
    }
    var n = countIn(hand, tile);
    if (n >= 3) return 4;                                     // 杠
    if (n >= 2) return 3;                                     // 碰
    if ((fromSeat + 1) % 4 === 0 && this.chiOptions(0, tile).length) return 2;   // 吃
    return 0;
  };

  /** reorder the next few wall tiles in the human's favour (or against) */
  Game.prototype._luckyPick = function (seat) {
    var b = this.luckBias();
    if (!b || seat !== 0) return;
    if (Math.random() > Math.abs(b) * 0.8) return;
    var h = this.h;
    var span = Math.min(7, h.back - h.front + 1);
    if (span < 2) return;
    var bestI = 0, bestS = null;
    for (var i = 0; i < span; i++) {
      var tl = h.wall[h.front + i];
      if (T.isFlower(tl)) continue;
      var hand = h.hands[seat].slice();
      hand.push(tl);
      var sc = -H.shanten(hand, h.melds[seat]);
      if (bestS === null || (b > 0 ? sc > bestS : sc < bestS)) { bestS = sc; bestI = i; }
    }
    if (bestI > 0) {
      var tmp = h.wall[h.front];
      h.wall[h.front] = h.wall[h.front + bestI];
      h.wall[h.front + bestI] = tmp;
    }
  };

  /** nudge a bot's discard towards (or away from) something seat 0 can use */
  Game.prototype._luckyDiscard = function (seat, tile) {
    var b = this.luckBias();
    if (!b || seat === 0) return tile;
    if (Math.random() > Math.abs(b) * 0.5) return tile;
    var h = this.h, hand = h.hands[seat], melds = h.melds[seat];
    var base = H.shanten(withoutOne(hand, tile), melds);
    var cur = this._humanClaimValue(seat, tile);
    var seen = {}, best = null;
    for (var i = 0; i < hand.length; i++) {
      var c = hand[i];
      if (seen[c]) continue;
      seen[c] = 1;
      if (c === tile) continue;
      if (H.shanten(withoutOne(hand, c), melds) > base) continue;   // never wreck the bot's own hand
      var v = this._humanClaimValue(seat, c);
      if (b > 0 ? v <= cur : v >= cur) continue;
      if (!best || (b > 0 ? v > best.v : v < best.v)) best = { t: c, v: v };
    }
    return best ? best.t : tile;
  };

  /* ------------------------------------------------------------------ */
  /* main step machine                                                   */
  /* ------------------------------------------------------------------ */

  /** Perform one atomic step. Returns true if the game still needs ticking. */
  Game.prototype.tick = function () {
    var h = this.h;
    if (!h || h.phase === PHASE.OVER) return false;
    if (h.pending) return false;                    // waiting for human input

    if (h.phase === PHASE.DRAW) { this._doDraw(); return true; }
    if (h.phase === PHASE.DISCARD) { this._doDiscardTurn(); return true; }
    if (h.phase === PHASE.CLAIM) { this._resolveClaims(); return true; }
    return false;
  };

  Game.prototype._doDraw = function () {
    var h = this.h, seat = h.turn;
    if (h.front > h.back) { this._exhaustiveDraw(); return; }
    this._luckyPick(seat);
    var tile = h.wall[h.front++];
    var isLast = h.front > h.back;
    while (T.isFlower(tile)) {
      h.flowers[seat].push(tile);
      this.emit('flower', { seat: seat, tile: tile });
      if (h.front > h.back) { this._exhaustiveDraw(); return; }
      tile = h.wall[h.back--];
      isLast = h.front > h.back;
    }
    h.drawn = tile;
    h.hands[seat].push(tile);
    h.lastDrawWasLast = isLast;
    this.emit('draw', { seat: seat, tile: tile, wall: this.wallLeft() });
    this._offerTurnActions(seat, tile, false);
  };

  /** after drawing (or a kong replacement) offer 自摸 / 杠 to the player */
  Game.prototype._offerTurnActions = function (seat, tile, afterKong) {
    var h = this.h;
    var actions = [];
    var win = this.evaluateWin(seat, tile, {
      selfDrawn: true, fromHand: true,
      lastTileDraw: h.lastDrawWasLast, afterKong: afterKong
    });
    if (win && win.legal) actions.push({ kind: 'hu', result: win });
    var kongs = this.kongOptions(seat);
    for (var i = 0; i < kongs.length; i++) {
      if (this.wallLeft() > 0) actions.push({ kind: kongs[i].kind, tile: kongs[i].tile, meldIndex: kongs[i].meldIndex });
    }
    h.turnActions = actions;
    h.phase = PHASE.DISCARD;
    if (seat === 0 && actions.length) {
      h.pending = { type: 'turn', seat: 0, actions: actions };
      this.emit('prompt', h.pending);
    }
  };

  Game.prototype._doDiscardTurn = function () {
    var h = this.h, seat = h.turn;
    if (seat === 0) {
      if (!h.pending) { h.pending = { type: 'discard', seat: 0, actions: h.turnActions || [] }; this.emit('prompt', h.pending); }
      return;
    }
    var ai = global.MJ.AI;
    var act = ai.turnDecision(this, seat);
    if (act && act.kind === 'hu') { this._declareWin(seat, act.result, null); return; }
    if (act && (act.kind === 'ankan' || act.kind === 'bukan')) { this.doKongFromHand(seat, act); return; }
    var tile = this._luckyDiscard(seat, ai.chooseDiscard(this, seat));
    this.doDiscard(seat, tile);
  };

  /* ---- public actions ---- */

  Game.prototype.doDiscard = function (seat, tile) {
    var h = this.h;
    if (!removeTile(h.hands[seat], tile)) return false;
    h.hands[seat] = T.sortTiles(h.hands[seat]);
    h.discards[seat].push(tile);
    h.lastDiscard = { seat: seat, tile: tile };
    h.drawn = null;
    h.pending = null;
    h.turnActions = null;
    this.emit('discard', { seat: seat, tile: tile });
    h.phase = PHASE.CLAIM;
    h.claim = null;
    return true;
  };

  Game.prototype.doKongFromHand = function (seat, act) {
    var h = this.h;
    if (act.kind === 'ankan') {
      for (var i = 0; i < 4; i++) removeTile(h.hands[seat], act.tile);
      h.melds[seat].push({ type: 'ankan', tiles: [act.tile, act.tile, act.tile, act.tile], from: seat });
      this.emit('meld', { seat: seat, type: 'ankan', tile: act.tile });
      this._kongDraw(seat);
    } else {
      // 补杠 — other players may rob the kong
      var robber = this._checkRobKong(seat, act.tile);
      if (robber !== null) return;                 // handled inside
      removeTile(h.hands[seat], act.tile);
      var m = h.melds[seat][act.meldIndex];
      m.type = 'bukan'; m.tiles = [act.tile, act.tile, act.tile, act.tile];
      this.emit('meld', { seat: seat, type: 'bukan', tile: act.tile });
      this._kongDraw(seat);
    }
    return true;
  };

  Game.prototype._checkRobKong = function (seat, tile) {
    var h = this.h;
    for (var off = 1; off < 4; off++) {
      var s = (seat + off) % 4;
      var r = this.evaluateWin(s, tile, { robbedKong: true });
      if (r && r.legal) {
        if (s === 0) {
          h.pending = { type: 'rob', seat: 0, tile: tile, from: seat, result: r, meldSeat: seat };
          h.robbing = { seat: seat, tile: tile };
          this.emit('prompt', h.pending);
          return 0;
        }
        if (global.MJ.AI.wantsWin(this, s, r)) { this._declareWin(s, r, seat); return s; }
      }
    }
    return null;
  };

  Game.prototype._kongDraw = function (seat) {
    var h = this.h;
    h.kongCount++;
    if (h.front > h.back) { this._exhaustiveDraw(); return; }
    var tile = h.wall[h.back--];
    while (T.isFlower(tile)) {
      h.flowers[seat].push(tile);
      this.emit('flower', { seat: seat, tile: tile });
      if (h.front > h.back) { this._exhaustiveDraw(); return; }
      tile = h.wall[h.back--];
    }
    h.hands[seat].push(tile);
    h.drawn = tile;
    h.lastDrawWasLast = h.front > h.back;
    this.emit('draw', { seat: seat, tile: tile, wall: this.wallLeft(), afterKong: true });
    h.pending = null;
    this._offerTurnActions(seat, tile, true);
  };

  /* ---- claim resolution after a discard ---- */

  Game.prototype.claimOptions = function (seat) {
    var h = this.h;
    if (!h.lastDiscard || h.lastDiscard.seat === seat) return [];
    var tile = h.lastDiscard.tile, from = h.lastDiscard.seat, out = [];
    var isLastDiscard = this.wallLeft() === 0;
    var win = this.evaluateWin(seat, tile, { lastTileClaim: isLastDiscard });
    if (win && win.legal) out.push({ kind: 'hu', tile: tile, result: win, prio: 3 });
    var n = countIn(h.hands[seat], tile);
    if (n >= 3 && this.wallLeft() > 0) out.push({ kind: 'gang', tile: tile, prio: 2 });
    if (n >= 2) out.push({ kind: 'peng', tile: tile, prio: 2 });
    if ((from + 1) % 4 === seat) {
      var chis = this.chiOptions(seat, tile);
      for (var i = 0; i < chis.length; i++) out.push({ kind: 'chi', tile: tile, with: chis[i], prio: 1 });
    }
    return out;
  };

  Game.prototype._resolveClaims = function () {
    var h = this.h;
    if (!h.claim) {
      var all = [];
      for (var off = 1; off < 4; off++) {
        var s = (h.lastDiscard.seat + off) % 4;
        var opts = this.claimOptions(s);
        if (opts.length) all.push({ seat: s, options: opts, order: off });
      }
      h.claim = { all: all, humanDone: false, humanChoice: null };
      var humanEntry = null;
      for (var i = 0; i < all.length; i++) if (all[i].seat === 0) humanEntry = all[i];
      if (humanEntry) {
        h.pending = { type: 'claim', seat: 0, options: humanEntry.options, tile: h.lastDiscard.tile, from: h.lastDiscard.seat };
        this.emit('prompt', h.pending);
        return;
      }
      h.claim.humanDone = true;
    }
    if (!h.claim.humanDone) return;

    /* AI decisions + human choice, resolved by priority */
    var best = null;
    for (var k = 0; k < h.claim.all.length; k++) {
      var entry = h.claim.all[k], choice = null;
      if (entry.seat === 0) choice = h.claim.humanChoice;
      else choice = global.MJ.AI.claimDecision(this, entry.seat, entry.options);
      if (!choice) continue;
      var cand = { seat: entry.seat, order: entry.order, choice: choice };
      if (!best || choice.prio > best.choice.prio ||
          (choice.prio === best.choice.prio && entry.order < best.order)) best = cand;
    }
    h.claim = null;
    if (!best) { this._afterNoClaim(); return; }
    this._applyClaim(best.seat, best.choice);
  };

  Game.prototype._applyClaim = function (seat, choice) {
    var h = this.h, tile = h.lastDiscard.tile, from = h.lastDiscard.seat;
    if (choice.kind === 'hu') { this._declareWin(seat, choice.result, from); return; }
    h.discards[from].pop();                        // the tile leaves the discard row
    if (choice.kind === 'peng') {
      removeTile(h.hands[seat], tile); removeTile(h.hands[seat], tile);
      h.melds[seat].push({ type: 'peng', tiles: [tile, tile, tile], from: from, claimed: tile });
      this.emit('meld', { seat: seat, type: 'peng', tile: tile, from: from });
      h.turn = seat; h.phase = PHASE.DISCARD; h.drawn = null; h.turnActions = [];
      if (seat === 0) { h.pending = { type: 'discard', seat: 0, actions: [] }; this.emit('prompt', h.pending); }
    } else if (choice.kind === 'gang') {
      for (var i = 0; i < 3; i++) removeTile(h.hands[seat], tile);
      h.melds[seat].push({ type: 'minkan', tiles: [tile, tile, tile, tile], from: from, claimed: tile });
      this.emit('meld', { seat: seat, type: 'minkan', tile: tile, from: from });
      h.turn = seat;
      this._kongDraw(seat);
    } else if (choice.kind === 'chi') {
      removeTile(h.hands[seat], choice.with[0]); removeTile(h.hands[seat], choice.with[1]);
      var tiles = T.sortTiles([tile, choice.with[0], choice.with[1]]);
      h.melds[seat].push({ type: 'chi', tiles: tiles, from: from, claimed: tile });
      this.emit('meld', { seat: seat, type: 'chi', tiles: tiles, from: from });
      h.turn = seat; h.phase = PHASE.DISCARD; h.drawn = null; h.turnActions = [];
      if (seat === 0) { h.pending = { type: 'discard', seat: 0, actions: [] }; this.emit('prompt', h.pending); }
    }
  };

  Game.prototype._afterNoClaim = function () {
    var h = this.h;
    if (this.wallLeft() === 0) { this._exhaustiveDraw(); return; }
    h.turn = (h.lastDiscard.seat + 1) % 4;
    h.phase = PHASE.DRAW;
  };

  /* ---- human input ---- */
  Game.prototype.input = function (action) {
    var h = this.h;
    if (!h || !h.pending) return false;
    var p = h.pending;
    if (p.type === 'discard' || p.type === 'turn') {
      if (action.kind === 'discard') { h.pending = null; return this.doDiscard(0, action.tile); }
      if (action.kind === 'hu') { h.pending = null; this._declareWin(0, action.result, null); return true; }
      if (action.kind === 'ankan' || action.kind === 'bukan') { h.pending = null; return this.doKongFromHand(0, action); }
      if (action.kind === 'pass') { h.pending = { type: 'discard', seat: 0, actions: [] }; return true; }
      return false;
    }
    if (p.type === 'claim') {
      h.pending = null;
      h.claim.humanChoice = action.kind === 'pass' ? null : action;
      h.claim.humanDone = true;
      return true;
    }
    if (p.type === 'rob') {
      h.pending = null;
      if (action.kind === 'hu') { this._declareWin(0, p.result, p.meldSeat); return true; }
      // declined: complete the added kong
      var seat = p.meldSeat, tile = p.tile;
      var idx = -1;
      for (var i = 0; i < h.melds[seat].length; i++) {
        if (h.melds[seat][i].type === 'peng' && h.melds[seat][i].tiles[0] === tile) idx = i;
      }
      removeTile(h.hands[seat], tile);
      if (idx >= 0) { h.melds[seat][idx].type = 'bukan'; h.melds[seat][idx].tiles = [tile, tile, tile, tile]; }
      this.emit('meld', { seat: seat, type: 'bukan', tile: tile });
      h.robbing = null;
      this._kongDraw(seat);
      return true;
    }
    return false;
  };

  /* ---- hand end ---- */

  Game.prototype._declareWin = function (seat, result, fromSeat) {
    var h = this.h;
    h.phase = PHASE.OVER;
    h.pending = null;
    h.winner = seat;
    var fan = result.total;
    var delta = [0, 0, 0, 0];
    if (fromSeat === null || fromSeat === undefined) {
      for (var s = 0; s < 4; s++) if (s !== seat) { delta[s] = -(8 + fan); delta[seat] += 8 + fan; }
    } else {
      for (var s2 = 0; s2 < 4; s2++) {
        if (s2 === seat) continue;
        var pay = (s2 === fromSeat) ? (8 + fan) : 8;
        delta[s2] = -pay; delta[seat] += pay;
      }
    }
    for (var i = 0; i < 4; i++) this.scores[i] += delta[i];
    h.result = {
      type: 'win', winner: seat, loser: fromSeat === undefined ? null : fromSeat,
      selfDrawn: fromSeat === null || fromSeat === undefined,
      fan: fan, baseFan: result.baseTotal, flowerFan: result.flowerFan,
      fans: result.fans, delta: delta, handNo: this.handNo,
      roundWind: this.roundWind(), dealer: this.dealer(),
      winTile: result.ctx.winTile, concealed: result.ctx.concealed.slice(),
      melds: JSON.parse(JSON.stringify(h.melds[seat])), flowers: h.flowers[seat].slice()
    };
    this.history.push(h.result);
    this.emit('handend', h.result);
  };

  Game.prototype._exhaustiveDraw = function () {
    var h = this.h;
    h.phase = PHASE.OVER;
    h.pending = null;
    h.result = {
      type: 'draw', winner: null, loser: null, delta: [0, 0, 0, 0],
      handNo: this.handNo, roundWind: this.roundWind(), dealer: this.dealer()
    };
    this.history.push(h.result);
    this.emit('handend', h.result);
  };

  Game.prototype.nextHand = function () {
    if (this.handNo >= 15) { this.finished = true; this.emit('matchend', { scores: this.scores }); return false; }
    this.handNo++;
    this.startHand();
    return true;
  };

  /* ---- persistence ---- */
  Game.prototype.toJSON = function () {
    return {
      v: 1, matchId: this.matchId, minFan: this.minFan, difficulty: this.difficulty,
      luck: this.luck, seed: this.seed,
      handNo: this.handNo, scores: this.scores, history: this.history,
      finished: this.finished,
      hand: this.h ? {
        front: this.h.front, back: this.h.back, wall: this.h.wall,
        hands: this.h.hands, melds: this.h.melds, discards: this.h.discards,
        flowers: this.h.flowers, turn: this.h.turn, phase: this.h.phase,
        lastDiscard: this.h.lastDiscard, drawn: this.h.drawn,
        kongCount: this.h.kongCount, result: this.h.result
      } : null
    };
  };

  Game.fromJSON = function (o) {
    var g = new Game({ matchId: o.matchId, minFan: o.minFan, difficulty: o.difficulty,
                       luck: o.luck, seed: o.seed, handNo: o.handNo,
                       scores: o.scores, history: o.history });
    g.finished = !!o.finished;
    if (o.hand) {
      g.h = {
        wall: o.hand.wall, front: o.hand.front, back: o.hand.back,
        hands: o.hand.hands, melds: o.hand.melds, discards: o.hand.discards,
        flowers: o.hand.flowers, turn: o.hand.turn,
        phase: o.hand.result ? PHASE.OVER : (o.hand.phase === PHASE.CLAIM ? PHASE.CLAIM : o.hand.phase),
        lastDiscard: o.hand.lastDiscard, drawn: o.hand.drawn, afterKong: false,
        kongCount: o.hand.kongCount || 0, pending: null, claim: null, log: [],
        winner: o.hand.result ? o.hand.result.winner : null, result: o.hand.result || null,
        robbing: null
      };
      // a restored mid-claim state is simply resumed as "nobody claimed"
      if (g.h.phase === PHASE.CLAIM) g.h.phase = PHASE.CLAIM;
    }
    return g;
  };

  Game.PHASE = PHASE;
  global.MJ.Game = Game;
})(typeof window !== 'undefined' ? window : globalThis);
