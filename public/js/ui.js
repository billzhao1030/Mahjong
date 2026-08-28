/* =====================================================================
 * ui.js — screens, table rendering, input, persistence
 * ===================================================================== */
(function (global) {
  'use strict';
  var T = MJ.Tiles, H = MJ.Hand, Face = MJ.Face, I = MJ.I18n, D = MJ.FanDefs;
  var t = function (k, v) { return I.t(k, v); };
  var $ = function (id) { return document.getElementById(id); };

  var game = null, profile = null, aiTimer = null, lastSave = null;
  var SEAT_KEYS = ['you', 'right', 'across', 'left'];

  /* ------------------------------------------------------------------ */
  /* API                                                                 */
  /* ------------------------------------------------------------------ */
  function api(path, body) {
    var opt = body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {};
    return fetch('/api/' + path, opt).then(function (r) { return r.json(); }).catch(function (e) {
      console.warn('api', path, e); return null;
    });
  }

  /* ------------------------------------------------------------------ */
  /* small helpers                                                       */
  /* ------------------------------------------------------------------ */
  function windName(rank) { return [t('east'), t('south'), t('west'), t('north')][rank - 1]; }
  function seatName(s) { return t(SEAT_KEYS[s]); }
  function tileEl(tile, opts) { return Face.el(tile, opts); }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }
  function div(cls, html) { var d = document.createElement('div'); d.className = cls || ''; if (html !== undefined) d.innerHTML = html; return d; }

  function toast(msg) {
    var el = div('toast', msg);
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, 1800);
  }
  function announce(txt) {
    var w = div('announce', '<span>' + txt + '</span>');
    document.body.appendChild(w);
    setTimeout(function () { w.remove(); }, 950);
  }

  function tilesInline(list) {
    return list.map(function (x) { return '<span class="tile xs"><span class="tile-top">' + Face.svg(x) + '</span></span>'; }).join('');
  }

  /* ------------------------------------------------------------------ */
  /* overlays                                                            */
  /* ------------------------------------------------------------------ */
  function openPanel(opts) {
    var ov = div('overlay');
    var p = div('panel' + (opts.cls ? ' ' + opts.cls : ''));
    var head = div('panel-head');
    head.innerHTML = '<h2>' + opts.title + '</h2><div class="spacer"></div>';
    if (opts.closable !== false) {
      var x = document.createElement('button');
      x.className = 'btn ghost'; x.textContent = '✕';
      x.onclick = function () { ov.remove(); if (opts.onClose) opts.onClose(); };
      head.appendChild(x);
    }
    var body = div('panel-body');
    if (typeof opts.body === 'string') body.innerHTML = opts.body; else if (opts.body) body.appendChild(opts.body);
    p.appendChild(head); p.appendChild(body);
    if (opts.foot) { var f = div('panel-foot'); f.appendChild(opts.foot); p.appendChild(f); }
    ov.appendChild(p);
    $('overlays').appendChild(ov);
    if (opts.closable !== false) ov.addEventListener('click', function (e) { if (e.target === ov) { ov.remove(); if (opts.onClose) opts.onClose(); } });
    return { ov: ov, body: body, close: function () { ov.remove(); } };
  }

  function button(label, cls, fn) {
    var b = document.createElement('button');
    b.className = 'btn ' + (cls || '');
    b.innerHTML = label;
    b.onclick = fn;
    return b;
  }

  /* ------------------------------------------------------------------ */
  /* language                                                            */
  /* ------------------------------------------------------------------ */
  function applyLang() {
    document.body.className = I.getLang() === 'en' ? 'en' : 'zh';
    document.documentElement.lang = I.getLang() === 'en' ? 'en' : 'zh-CN';
    var nodes = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < nodes.length; i++) nodes[i].textContent = t(nodes[i].getAttribute('data-i18n'));
    document.title = t('title') + ' · MCR Mahjong';
    if (game) render();
    refreshSaveNote();
  }
  function toggleLang() {
    I.setLang(I.getLang() === 'zh' ? 'en' : 'zh');
    try { localStorage.setItem('mj_lang', I.getLang()); } catch (e) {}
    applyLang();
  }

  /* ------------------------------------------------------------------ */
  /* menu                                                                */
  /* ------------------------------------------------------------------ */
  function buildMenuTiles() {
    var box = $('menu-tiles'); clear(box);
    [T.tileId(2, 1), T.tileId(1, 5), T.tileId(0, 9), 32, 31].forEach(function (x) {
      box.appendChild(tileEl(x));
    });
  }

  function refreshSaveNote() {
    var note = $('save-note'), btn = $('btn-continue');
    if (!lastSave || !lastSave.state) {
      note.textContent = t('noSave');
      btn.disabled = true;
      return;
    }
    var st = lastSave.state;
    var dname = { novice: 'diffNovice', normal: 'diffNormal', expert: 'diffExpert', master: 'diffMaster' }[st.difficulty || 'normal'];
    note.textContent = t('resumeHand', { n: (st.handNo || 0) + 1, round: windName(Math.floor((st.handNo || 0) / 4) + 1), score: st.scores ? st.scores[0] : 0 })
      + ' · ' + t('difficulty') + ' ' + t(dname);
    btn.disabled = false;
  }

  function showMenu() {
    stopLoop();
    $('screen-game').classList.add('hidden');
    $('screen-menu').classList.remove('hidden');
    api('savegame?slot=default').then(function (r) { lastSave = r && r.save; refreshSaveNote(); });
  }
  function showGame() {
    $('screen-menu').classList.add('hidden');
    $('screen-game').classList.remove('hidden');
  }

  /* ------------------------------------------------------------------ */
  /* min-fan chooser                                                     */
  /* ------------------------------------------------------------------ */
  function chooseSetup() {
    var selFan = 8, selDiff = 'normal', selLuck = 50;
    var wrap = div('');

    function section(titleKey, hintKey, opts, initial, onPick) {
      var h = document.createElement('h3');
      h.className = 'sec'; h.textContent = t(titleKey);
      wrap.appendChild(h);
      if (hintKey) {
        var hint = div('');
        hint.style.cssText = 'color:var(--ui-dim);font-size:12px;margin:-4px 0 10px';
        hint.textContent = t(hintKey);
        wrap.appendChild(hint);
      }
      var list = div('fan-options');
      opts.forEach(function (o) {
        var card = div('fan-opt' + (o.key === initial ? ' sel' : ''));
        card.innerHTML = '<div class="big">' + o.big + '</div><div><div class="nm">' + t(o.nm) +
          '</div><div class="desc">' + t(o.desc) + '</div></div>';
        card.onclick = function () {
          list.querySelectorAll('.fan-opt').forEach(function (n) { n.classList.remove('sel'); });
          card.classList.add('sel');
          onPick(o.key);
        };
        list.appendChild(card);
      });
      wrap.appendChild(list);
    }

    section('minFanTitle', 'minFanHint', [
      { key: 0, big: '0', nm: 'minFan0', desc: 'minFan0d' },
      { key: 4, big: '4', nm: 'minFan4', desc: 'minFan4d' },
      { key: 8, big: '8', nm: 'minFan8', desc: 'minFan8d' }
    ], 8, function (k) { selFan = k; });

    section('difficultyTitle', null, [
      { key: 'novice', big: '★', nm: 'diffNovice', desc: 'diffNoviceD' },
      { key: 'normal', big: '★★', nm: 'diffNormal', desc: 'diffNormalD' },
      { key: 'expert', big: '★★★', nm: 'diffExpert', desc: 'diffExpertD' },
      { key: 'master', big: '★★★★', nm: 'diffMaster', desc: 'diffMasterD' }
    ], 'normal', function (k) { selDiff = k; });

    /* luck */
    var lh = document.createElement('h3');
    lh.className = 'sec'; lh.textContent = t('luckTitle');
    wrap.appendChild(lh);
    var lhint = div('');
    lhint.style.cssText = 'color:var(--ui-dim);font-size:12px;margin:-4px 0 12px;line-height:1.6';
    lhint.textContent = t('luckHint');
    wrap.appendChild(lhint);
    var lrow = div('luck-row');
    var slider = document.createElement('input');
    slider.type = 'range'; slider.min = '0'; slider.max = '100'; slider.step = '5';
    slider.value = '50'; slider.className = 'luck-slider';
    var lval = div('luck-val', '50%');
    var lmood = div('luck-mood', t('luckFair'));
    slider.oninput = function () {
      selLuck = Number(slider.value);
      lval.textContent = selLuck + '%';
      lval.className = 'luck-val ' + (selLuck > 55 ? 'up' : (selLuck < 45 ? 'down' : ''));
      lmood.textContent = selLuck > 55 ? t('luckGood') : (selLuck < 45 ? t('luckBad') : t('luckFair'));
    };
    lrow.appendChild(slider);
    var lbox = div('luck-box');
    lbox.appendChild(lval); lbox.appendChild(lmood);
    lrow.appendChild(lbox);
    wrap.appendChild(lrow);

    var foot = div('');
    var panel;
    foot.appendChild(button(t('cancel'), 'ghost', function () { panel.close(); }));
    foot.appendChild(button(t('start'), 'primary', function () { panel.close(); startNewGame(selFan, selDiff, selLuck); }));
    panel = openPanel({ title: t('setupTitle'), body: wrap, foot: foot, cls: 'narrow' });
  }

  /* ------------------------------------------------------------------ */
  /* game lifecycle                                                      */
  /* ------------------------------------------------------------------ */
  function wire(g) {
    g.on(function (ev) {
      if (ev.type === 'meld') {
        var m = ev.data.type;
        var label = m === 'chi' ? t('chi') : (m === 'peng' ? t('peng') : t('gang'));
        if (ev.data.seat !== 0) announce(label);
      }
      if (ev.type === 'flower' && ev.data.seat === 0) toast(t('flowers') + ' ' + T.tileName(ev.data.tile, I.getLang()));
    });
  }

  function startNewGame(minFan, difficulty, luck) {
    game = new MJ.Game({ minFan: minFan, difficulty: difficulty || 'normal',
                         luck: luck === undefined ? 50 : luck });
    wire(game);
    game.startHand();
    showGame();
    render();
    saveGame();
    loop();
  }

  function continueGame() {
    if (!lastSave || !lastSave.state) return;
    game = MJ.Game.fromJSON(lastSave.state);
    wire(game);
    if (!game.h || game.h.phase === 'over') {
      if (game.h && game.h.result) { showGame(); render(); showHandResult(game.h.result); return; }
      game.startHand();
    }
    showGame();
    render();
    loop();
  }

  function saveGame() {
    if (!game) return;
    api('savegame', { slot: 'default', state: game.toJSON() });
  }

  /* ---- main pump ---- */
  function stopLoop() { if (aiTimer) { clearTimeout(aiTimer); aiTimer = null; } }

  function loop() {
    stopLoop();
    if (!game || !game.h) return;
    var h = game.h;
    if (h.pending) { render(); return; }
    if (h.phase === 'over') { render(); onHandOver(); return; }
    var before = h.phase, seat = h.turn;
    game.tick();
    render();
    var delay = 90;
    if (before === 'discard' && seat !== 0) delay = 520;
    else if (before === 'draw' && seat !== 0) delay = 260;
    else if (before === 'claim') delay = 200;
    aiTimer = setTimeout(loop, delay);
  }

  /* ------------------------------------------------------------------ */
  /* rendering                                                           */
  /* ------------------------------------------------------------------ */
  function meldEl(m, small) {
    var box = div('meld' + (m.type === 'ankan' ? ' kong-concealed' : ''));
    var tiles = m.tiles.slice();
    for (var i = 0; i < tiles.length; i++) {
      var hide = (m.type === 'ankan') && (i === 0 || i === 3);
      box.appendChild(tileEl(tiles[i], { face: hide ? false : true, cls: small ? 'sm' : '' }));
    }
    return box;
  }

  function render() {
    if (!game || !game.h) return;
    var h = game.h, s;

    /* top bar */
    $('chip-round').innerHTML = '<b>' + windName(game.roundWind()) + '</b> ' + t('round');
    $('chip-hand').textContent = t('handNoLabel', { n: game.handNo + 1 });
    $('chip-minfan').innerHTML = t('minFanLabel') + ' <b>' + game.minFan + '</b>';
    var dstars = { novice: '★', normal: '★★', expert: '★★★', master: '★★★★' }[game.difficulty] || '★★';
    $('chip-diff').innerHTML = t('difficulty') + ' <b>' + dstars + '</b>';
    $('chip-luck').innerHTML = t('luck') + ' <b>' + game.luck + '%</b>';

    /* seats */
    for (s = 0; s < 4; s++) {
      var box = $('seat-' + s); clear(box);
      if (s !== 0) {
        var hr = div('hand-row');
        for (var k = 0; k < h.hands[s].length; k++) hr.appendChild(tileEl(0, { face: false }));
        box.appendChild(hr);
      }
      var mr = div('meld-row');
      for (var mi = 0; mi < h.melds[s].length; mi++) mr.appendChild(meldEl(h.melds[s][mi]));
      if (h.flowers[s].length) {
        var fm = div('meld');
        for (var fi = 0; fi < h.flowers[s].length; fi++) fm.appendChild(tileEl(h.flowers[s][fi]));
        mr.appendChild(fm);
      }
      box.appendChild(mr);
      var plate = div('plate' + (h.turn === s && h.phase !== 'over' ? ' turn' : '') + (game.dealer() === s ? ' dealer' : ''));
      plate.innerHTML = '<span class="wd">' + windName(game.seatWind(s)) + '</span>' +
        '<span class="nm">' + seatName(s) + '</span>' +
        '<span class="sc">' + (game.scores[s] >= 0 ? '+' : '') + game.scores[s] + '</span>';
      box.appendChild(plate);
    }

    /* discards — each pile is oriented towards its own player, 8 per row */
    for (s = 0; s < 4; s++) {
      var dbox = $('disc-' + s); clear(dbox);
      var arr = h.discards[s];
      for (var di = 0; di < arr.length; di++) {
        var isLast = h.lastDiscard && h.lastDiscard.seat === s && di === arr.length - 1;
        var slot = div('dslot');
        slot.appendChild(tileEl(arr[di], { cls: isLast ? 'last' : '' }));
        dbox.appendChild(slot);
      }
    }

    /* centre */
    $('info').innerHTML =
      '<div class="wind-big">' + windName(game.roundWind()) + '</div>' +
      '<div class="wall">' + t('wallLeft') + ' <b>' + game.wallLeft() + '</b></div>' +
      '<div class="handno">' + t('handNoLabel', { n: game.handNo + 1 }) + '</div>' +
      '<div class="minfan">' + t('minFanLabel') + ' ' + game.minFan + '</div>';

    renderMyHand();
    renderActions();
    renderHint();
  }

  function renderMyHand() {
    var h = game.h, box = $('my-hand'); clear(box);
    var hand = T.sortTiles(h.hands[0]);
    var drawn = (h.turn === 0 && h.drawn !== null && h.drawn !== undefined) ? h.drawn : null;
    var list = hand.slice();
    if (drawn !== null) {
      var idx = list.lastIndexOf(drawn);
      if (idx >= 0) list.splice(idx, 1);
    }
    var canDiscard = h.pending && (h.pending.type === 'discard' || h.pending.type === 'turn');
    list.forEach(function (x) {
      var el = tileEl(x, { cls: canDiscard ? 'clickable' : '' });
      if (canDiscard) el.onclick = function () { doDiscard(x); };
      box.appendChild(el);
    });
    if (drawn !== null) {
      var d = tileEl(drawn, { cls: 'drawn just' + (canDiscard ? ' clickable' : '') });
      if (canDiscard) d.onclick = function () { doDiscard(drawn); };
      box.appendChild(d);
    }
  }

  function doDiscard(tile) {
    if (!game.h.pending) return;
    game.input({ kind: 'discard', tile: tile });
    render();
    loop();
  }

  /** one big option button: label, optional fan, and the resulting tile group */
  function cbtn(kind, label, tiles, claimed, sub, fn) {
    var b = document.createElement('button');
    b.className = 'cbtn ' + kind;
    b.appendChild(div('cl', label));
    if (sub) b.appendChild(div('cs', sub));
    if (tiles && tiles.length) {
      var row = div('ct'), marked = false;
      tiles.forEach(function (x) {
        var mark = !marked && claimed !== null && claimed !== undefined && x === claimed;
        if (mark) marked = true;
        row.appendChild(tileEl(x, { cls: mark ? 'claimed' : '' }));
      });
      b.appendChild(row);
    }
    b.onclick = fn;
    return b;
  }

  function renderActions() {
    var h = game.h, box = $('actions'); clear(box);
    if (!h.pending) return;
    var p = h.pending, row = div('claim-row'), title;

    if (p.type === 'turn') {
      title = div('claim-title');
      title.innerHTML = t('yourTurn');
      if (h.drawn !== null && h.drawn !== undefined) title.appendChild(tileEl(h.drawn));
      box.appendChild(title);
      p.actions.forEach(function (a) {
        if (a.kind === 'hu') {
          row.appendChild(cbtn('hu', t('hu'), null, null, a.result.total + ' ' + t('fanValue'), function () {
            game.input({ kind: 'hu', result: a.result }); render(); onHandOver();
          }));
        } else {
          row.appendChild(cbtn('gang', t(a.kind === 'ankan' ? 'angang' : 'bukan'),
            [a.tile, a.tile, a.tile, a.tile], null, null, function () {
              game.input(a); render(); loop();
            }));
        }
      });
      row.appendChild(cbtn('pass', t('pass'), null, null, null, function () { game.input({ kind: 'pass' }); render(); }));
      box.appendChild(row);
      return;
    }

    if (p.type === 'rob') {
      title = div('claim-title');
      title.innerHTML = t('robPrompt', { who: seatName(p.from), tile: '' });
      title.appendChild(tileEl(p.tile));
      box.appendChild(title);
      row.appendChild(cbtn('hu', t('hu'), null, null, p.result.total + ' ' + t('fanValue'), function () {
        game.input({ kind: 'hu', result: p.result }); render(); onHandOver();
      }));
      row.appendChild(cbtn('pass', t('pass'), null, null, null, function () { game.input({ kind: 'pass' }); render(); loop(); }));
      box.appendChild(row);
      return;
    }

    if (p.type === 'claim') {
      title = div('claim-title');
      var lbl = div('');
      lbl.textContent = seatName(p.from) + ' ' + t('discard');
      title.appendChild(lbl);
      title.appendChild(tileEl(p.tile));
      box.appendChild(title);

      var order = { hu: 0, gang: 1, peng: 2, chi: 3 };
      p.options.slice().sort(function (a, b) { return order[a.kind] - order[b.kind]; }).forEach(function (o) {
        if (o.kind === 'hu') {
          row.appendChild(cbtn('hu', t('hu'), null, null, o.result.total + ' ' + t('fanValue'), function () { claim(o); }));
        } else if (o.kind === 'gang') {
          row.appendChild(cbtn('gang', t('gang'), [o.tile, o.tile, o.tile, o.tile], o.tile, null, function () { claim(o); }));
        } else if (o.kind === 'peng') {
          row.appendChild(cbtn('peng', t('peng'), [o.tile, o.tile, o.tile], o.tile, null, function () { claim(o); }));
        } else {
          var seq = T.sortTiles([o.tile, o.with[0], o.with[1]]);
          row.appendChild(cbtn('chi', t('chi'), seq, o.tile, null, function () { claim(o); }));
        }
      });
      row.appendChild(cbtn('pass', t('pass'), null, null, null, function () { claim(null); }));
      box.appendChild(row);
    }
  }

  function claim(opt) {
    game.input(opt || { kind: 'pass' });
    render();
    if (opt && opt.kind === 'hu') { onHandOver(); return; }
    loop();
  }

  function renderHint() {
    var h = game.h, el = $('hint');
    if (!h.pending) { el.innerHTML = ''; return; }
    var p = h.pending;
    if (p.type === 'claim' || p.type === 'rob') { el.innerHTML = ''; return; }
    /* my turn: show readiness */
    var hand = h.hands[0].slice();
    var sh = H.shanten(hand, h.melds[0]);
    if (sh <= 0) {
      var ws = bestWaits(hand, h.melds[0]);
      if (ws.length) { el.innerHTML = '<b>' + t('tenpai') + '</b> · ' + t('readyHint', { tiles: tilesInline(ws) }); return; }
    }
    el.innerHTML = sh > 0 ? t('shantenN', { n: sh }) : t('discardPrompt');
  }

  /** waits reachable from the current 14-tile hand after the best discard */
  function bestWaits(hand, melds) {
    var need = 14 - 3 * melds.length;
    if (hand.length === need) {
      var seen = {}, out = [];
      for (var i = 0; i < hand.length; i++) {
        if (seen[hand[i]]) continue;
        seen[hand[i]] = 1;
        var rest = hand.slice();
        rest.splice(rest.indexOf(hand[i]), 1);
        var w = H.waits(rest, melds);
        for (var j = 0; j < w.length; j++) if (out.indexOf(w[j]) < 0) out.push(w[j]);
      }
      return T.sortTiles(out);
    }
    return T.sortTiles(H.waits(hand, melds));
  }

  /* ------------------------------------------------------------------ */
  /* hand / match results                                                */
  /* ------------------------------------------------------------------ */
  function onHandOver() {
    stopLoop();
    var r = game.h.result;
    if (!r) return;
    if (r._recorded) { showHandResult(r); return; }
    r._recorded = true;

    var rec = {
      matchId: game.matchId, handNo: game.handNo, roundWind: r.roundWind, dealer: r.dealer,
      result: r.type, winner: r.winner, loser: r.loser, fan: r.fan || 0,
      minFan: game.minFan, delta: r.delta, selfDrawn: !!r.selfDrawn,
      detail: r.type === 'win' ? {
        fan: r.fan, baseFan: r.baseFan, flowerFan: r.flowerFan,
        fans: r.fans.map(function (f) { return { zh: f.zh, en: f.en, v: f.v, n: f.n, sub: f.sub }; }),
        tiles: r.concealed, winTile: r.winTile, melds: r.melds, flowers: r.flowers,
        handNo: game.handNo + 1, roundWind: r.roundWind
      } : null,
      patterns: (r.type === 'win' && r.winner === 0) ? r.fans.map(function (f) { return { name: f.id || f.zh, value: f.v }; }) : []
    };
    api('hand', rec).then(function (p) { if (p) profile = p; });
    saveGame();
    showHandResult(r);
  }

  function showHandResult(r) {
    var body = div('');
    var head = div('result-head');
    if (r.type === 'draw') {
      head.innerHTML = '<div class="big">' + t('drawGame') + '</div>';
    } else {
      var who = seatName(r.winner);
      head.innerHTML = '<div class="big">' + (r.selfDrawn ? t('winSelf', { who: who }) : t('winBy', { who: who })) + '</div>' +
        '<div class="sub">' + (r.selfDrawn ? '' : t('dealIn', { who: seatName(r.loser) })) + '</div>';
    }
    body.appendChild(head);

    if (r.type === 'win') {
      var tw = div('win-tiles');
      var shown = T.sortTiles(r.concealed);   // the winning tile is pulled out and shown last
      var idx = shown.lastIndexOf(r.winTile);
      if (idx >= 0) shown.splice(idx, 1);
      shown.forEach(function (x) { tw.appendChild(tileEl(x)); });
      (r.melds || []).forEach(function (m) { tw.appendChild(div('sep')); tw.appendChild(meldEl(m)); });
      tw.appendChild(div('sep'));
      tw.appendChild(tileEl(r.winTile, { cls: 'win-tile' }));
      if (r.flowers && r.flowers.length) {
        tw.appendChild(div('sep'));
        r.flowers.forEach(function (x) { tw.appendChild(tileEl(x, { cls: 'sm' })); });
      }
      body.appendChild(tw);

      var fl = div('fan-lines');
      r.fans.forEach(function (f) {
        fl.appendChild(div('fl-n', (I.getLang() === 'en' ? f.en : f.zh) + (f.n > 1 ? ' ×' + f.n : '')));
        fl.appendChild(div('fl-v', '+' + f.sub));
      });
      fl.appendChild(div('fl-n tot', t('fanTotal', { n: r.fan })));
      fl.appendChild(div('fl-v tot', r.fan));
      body.appendChild(fl);

      var pay = div('');
      pay.style.cssText = 'text-align:center;color:var(--ui-dim);font-size:13px;margin-top:12px';
      pay.textContent = r.selfDrawn ? t('paymentSelf', { n: 8 + r.fan }) : t('paymentDeal', { a: 8 + r.fan, b: 8 });
      body.appendChild(pay);
    }

    var row = div('score-row');
    for (var s = 0; s < 4; s++) {
      var c = div('score-cell' + (s === 0 ? ' me' : ''));
      var d = r.delta[s];
      c.innerHTML = '<div class="n">' + windName(game.seatWind(s)) + ' ' + seatName(s) + '</div>' +
        '<div class="d ' + (d > 0 ? 'pos' : (d < 0 ? 'neg' : '')) + '">' + (d > 0 ? '+' : '') + d + '</div>' +
        '<div class="t">' + game.scores[s] + '</div>';
      row.appendChild(c);
    }
    body.appendChild(row);

    var foot = div('');
    var panel;
    var isLast = game.handNo >= 15;
    foot.appendChild(button(isLast ? t('matchEnd') : t('nextHand'), 'primary', function () {
      panel.close();
      if (isLast) { finishMatch(); return; }
      game.nextHand();
      render();
      saveGame();
      loop();
    }));
    panel = openPanel({ title: t('handEnd'), body: body, foot: foot, closable: false });
  }

  function finishMatch() {
    var order = [0, 1, 2, 3].sort(function (a, b) { return game.scores[b] - game.scores[a]; });
    var myRank = order.indexOf(0) + 1;
    api('match', { matchId: game.matchId, won: myRank === 1, scores: game.scores });
    api('clearsave', { slot: 'default' });
    lastSave = null;

    var body = div('');
    var head = div('result-head');
    head.innerHTML = '<div class="big">' + t('matchEnd') + '</div><div class="sub">' + t('rank') + ' ' + myRank + ' / 4</div>';
    body.appendChild(head);
    var row = div('score-row');
    order.forEach(function (s, i) {
      var c = div('score-cell' + (s === 0 ? ' me' : ''));
      c.innerHTML = '<div class="n">#' + (i + 1) + ' ' + seatName(s) + '</div>' +
        '<div class="d ' + (game.scores[s] > 0 ? 'pos' : (game.scores[s] < 0 ? 'neg' : '')) + '">' + game.scores[s] + '</div>';
      row.appendChild(c);
    });
    body.appendChild(row);

    var tbl = document.createElement('table');
    tbl.className = 'tbl';
    tbl.innerHTML = '<tr><th>' + t('hand') + '</th><th>' + t('round') + '</th><th>' + t('hu') + '</th><th class="num">' + t('fanValue') + '</th><th class="num">' + t('score') + '</th></tr>';
    game.history.forEach(function (r, i) {
      var tr = document.createElement('tr');
      tr.innerHTML = '<td>' + (i + 1) + '</td><td>' + windName(r.roundWind) + '</td>' +
        '<td>' + (r.type === 'draw' ? t('drawGame') : seatName(r.winner) + (r.selfDrawn ? ' (' + t('selfDraw') + ')' : '')) + '</td>' +
        '<td class="num">' + (r.fan || '') + '</td>' +
        '<td class="num ' + (r.delta[0] > 0 ? 'pos' : (r.delta[0] < 0 ? 'neg' : '')) + '">' + (r.delta[0] > 0 ? '+' : '') + r.delta[0] + '</td>';
      tbl.appendChild(tr);
    });
    var wrap = div(''); wrap.innerHTML = '<h3 class="sec">' + t('recentHands') + '</h3>';
    wrap.appendChild(tbl);
    body.appendChild(wrap);

    var foot = div('');
    var panel;
    foot.appendChild(button(t('backToMenu'), 'primary', function () { panel.close(); game = null; showMenu(); }));
    panel = openPanel({ title: t('matchEnd'), body: body, foot: foot, closable: false, cls: 'wide' });
  }

  /* ------------------------------------------------------------------ */
  /* hand statistics panel                                               */
  /* ------------------------------------------------------------------ */

  /** which discards leave the hand ready, and on what */
  function tenpaiOptions(hand, melds) {
    var need = 14 - 3 * melds.length, out = [], i;
    if (hand.length === need) {
      var seen = {};
      for (i = 0; i < hand.length; i++) {
        var tl = hand[i];
        if (seen[tl]) continue;
        seen[tl] = 1;
        var rest = hand.slice();
        rest.splice(rest.indexOf(tl), 1);
        var w = H.waits(rest, melds);
        if (w.length) out.push({ discard: tl, hand: rest, waits: T.sortTiles(w) });
      }
    } else {
      var w2 = H.waits(hand, melds);
      if (w2.length) out.push({ discard: null, hand: hand.slice(), waits: T.sortTiles(w2) });
    }
    return out;
  }

  /** what seat 0 would score winning on `tile` */
  function previewFan(hand13, melds, tile, selfDrawn) {
    var r = MJ.Fan.score({
      concealed: hand13.concat([tile]), melds: melds, winTile: tile,
      selfDrawn: !!selfDrawn, seatWind: game.seatWind(0), roundWind: game.roundWind(),
      flowers: game.h.flowers[0].length,
      lastOfKind: false, lastTileDraw: false, lastTileClaim: false,
      afterKong: false, robbedKong: false
    });
    return r ? { total: r.total, base: r.baseTotal, ok: r.baseTotal >= game.minFan } : null;
  }

  /** copies of a tile nobody has seen yet, from seat 0's point of view */
  function unseenCount(t) {
    var h = game.h, n = 4, i, s, j;
    for (s = 0; s < 4; s++) {
      for (i = 0; i < h.discards[s].length; i++) if (h.discards[s][i] === t) n--;
      for (i = 0; i < h.melds[s].length; i++) {
        var m = h.melds[s][i];
        if (m.type === 'ankan' && s !== 0) continue;   // an opponent's concealed kong is unknown
        for (j = 0; j < m.tiles.length; j++) if (m.tiles[j] === t) n--;
      }
    }
    for (i = 0; i < h.hands[0].length; i++) if (h.hands[0][i] === t) n--;
    return Math.max(0, n);
  }

  function waitCard(tile, fanInfo) {
    var c = div('wait-card' + (fanInfo ? (fanInfo.ok ? ' ok' : ' no') : ''));
    c.appendChild(tileEl(tile));
    var info = div('wi');
    var left = unseenCount(tile);
    var line = fanInfo
      ? '<b>' + fanInfo.total + '</b> ' + t('fanValue') + (fanInfo.ok ? '' : ' · ' + t('notEnoughFan'))
      : '';
    info.innerHTML = line + '<br>' + t('remaining') + ' ' + left;
    c.appendChild(info);
    return c;
  }

  function showHandStats() {
    if (!game || !game.h) return;
    var h = game.h, s, i;
    var body = div('');

    /* ---- overview ---- */
    var turnNo = 0;
    for (s = 0; s < 4; s++) turnNo = Math.max(turnNo, h.discards[s].length);
    var sh = H.shanten(h.hands[0], h.melds[0]);
    var sec1 = div(''); sec1.innerHTML = '<h3 class="sec">' + t('overview') + '</h3>';
    var g1 = div('grid-stats');
    [[t('handNoLabel', { n: game.handNo + 1 }), windName(game.roundWind()) + t('round'), true],
     [t('seatWind'), windName(game.seatWind(0)) + (game.dealer() === 0 ? ' · ' + t('dealerMark') : ''), true],
     [t('turnNo'), turnNo, false],
     [t('tilesLeft'), game.wallLeft(), false],
     [t('minFanLabel'), game.minFan, false],
     [t('difficulty'), t({ novice: 'diffNovice', normal: 'diffNormal', expert: 'diffExpert', master: 'diffMaster' }[game.difficulty] || 'diffNormal'), true],
     [t('luck'), game.luck + '%', false],
     [t('myWaits'), sh <= 0 ? t('tenpai') : t('shantenN', { n: sh }), true]
    ].forEach(function (kv) {
      g1.appendChild(div('stat', '<div class="k">' + kv[0] + '</div><div class="v gold' + (kv[2] ? ' sm' : '') + '">' + kv[1] + '</div>'));
    });
    sec1.appendChild(g1);
    body.appendChild(sec1);

    /* ---- my waits, with the fan each would score ---- */
    var sec2 = div(''); sec2.innerHTML = '<h3 class="sec">' + t('waitFan') + '</h3>';
    var opts = tenpaiOptions(h.hands[0], h.melds[0]);
    if (!opts.length) {
      sec2.appendChild(div('', '<p style="color:var(--ui-dim);font-size:13px;margin:0">' + t('noTenpai') + '</p>'));
    } else {
      opts.slice(0, 10).forEach(function (o) {
        var head = div('');
        head.style.cssText = 'font-size:12px;color:var(--ui-dim);margin:10px 0 7px';
        if (o.discard !== null) {
          head.innerHTML = t('discardTo') + ' ' + tilesInline([o.discard]) + ' ' + t('thenWait');
        } else {
          head.innerHTML = t('myWaits');
        }
        sec2.appendChild(head);
        var list = div('wait-list');
        o.waits.forEach(function (w) {
          list.appendChild(waitCard(w, previewFan(o.hand, h.melds[0], w, false)));
        });
        sec2.appendChild(list);
      });
    }
    body.appendChild(sec2);

    /* ---- the four players ---- */
    var sec3 = div(''); sec3.innerHTML = '<h3 class="sec">' + t('players') + '</h3>';
    var mt = div('mini-table');
    for (s = 0; s < 4; s++) {
      var c = div('mini-seat' + (s === 0 ? ' me' : ''));
      var html = '<h5><span class="wd">' + windName(game.seatWind(s)) + '</span> ' + seatName(s) +
        (game.dealer() === s ? ' <span style="font-size:10px;border:1px solid var(--gold-dim);border-radius:4px;padding:0 4px;color:var(--gold)">' + t('dealerMark') + '</span>' : '') +
        ' <span style="margin-left:auto;color:#9fe0b8">' + (game.scores[s] >= 0 ? '+' : '') + game.scores[s] + '</span></h5>';
      html += '<div class="kv"><span>' + t('melds') + ' <b>' + h.melds[s].length + '</b></span>' +
              '<span>' + t('flowers') + ' <b>' + h.flowers[s].length + '</b></span>' +
              '<span>' + t('discardCount') + ' <b>' + h.discards[s].length + '</b></span></div>';
      if (h.melds[s].length) {
        html += '<div class="lbl">' + t('melds') + '</div><div class="row">';
        h.melds[s].forEach(function (m) {
          m.tiles.forEach(function (x, k) {
            var hide = m.type === 'ankan' && s !== 0 && (k === 0 || k === 3);
            html += hide ? '<span class="tile xs back"><span class="tile-top"></span></span>'
                         : '<span class="tile xs"><span class="tile-top">' + Face.svg(x) + '</span></span>';
          });
        });
        html += '</div>';
      }
      if (h.flowers[s].length) html += '<div class="lbl">' + t('flowers') + '</div><div class="row">' + tilesInline(h.flowers[s]) + '</div>';
      html += '<div class="lbl">' + t('discardsOf', { who: seatName(s) }) + '</div>' +
        '<div class="row">' + (h.discards[s].length ? tilesInline(h.discards[s]) : '<span style="color:var(--ui-dim);font-size:12px">—</span>') + '</div>';
      c.innerHTML = html;
      mt.appendChild(c);
    }
    sec3.appendChild(mt);
    body.appendChild(sec3);

    /* ---- remaining-tile tracker ---- */
    var sec4 = div('');
    sec4.innerHTML = '<h3 class="sec">' + t('tracker') + '</h3>' +
      '<p style="color:var(--ui-dim);font-size:12px;margin:-4px 0 10px">' + t('trackerHint') + '</p>';
    var trk = div('tracker');
    var order = [];
    for (i = 0; i < 34; i++) order.push(i);
    order.sort(function (a, b) { return T.sortKey(a) - T.sortKey(b); });
    order.forEach(function (tt) {
      var n = unseenCount(tt);
      var cell = div('trk' + (n === 0 ? ' gone' : ''));
      cell.appendChild(tileEl(tt));
      cell.appendChild(div('n' + (n === 1 ? ' low' : ''), String(n)));
      trk.appendChild(cell);
    });
    sec4.appendChild(trk);
    body.appendChild(sec4);

    /* ---- match progress ---- */
    if (game.history.length) {
      var tbl = document.createElement('table');
      tbl.className = 'tbl';
      tbl.innerHTML = '<tr><th>#</th><th>' + t('round') + '</th><th>' + t('hu') + '</th>' +
        '<th class="num">' + t('fanValue') + '</th><th class="num">' + t('score') + '</th></tr>';
      game.history.forEach(function (r, k) {
        var tr = document.createElement('tr');
        tr.innerHTML = '<td>' + (k + 1) + '</td><td>' + windName(r.roundWind) + '</td>' +
          '<td>' + (r.type === 'draw' ? t('drawGame') : seatName(r.winner) + (r.selfDrawn ? ' (' + t('selfDraw') + ')' : '')) + '</td>' +
          '<td class="num">' + (r.fan || '') + '</td>' +
          '<td class="num ' + (r.delta[0] > 0 ? 'pos' : (r.delta[0] < 0 ? 'neg' : '')) + '">' + (r.delta[0] > 0 ? '+' : '') + r.delta[0] + '</td>';
        tbl.appendChild(tr);
      });
      var sec5 = div('');
      sec5.innerHTML = '<h3 class="sec">' + t('matchProgress') + ' · ' + t('handsPlayed') + ' ' + game.history.length + '/16</h3>';
      sec5.appendChild(tbl);
      body.appendChild(sec5);
    }

    openPanel({ title: t('stats'), body: body, cls: 'wide' });
  }

  /** draw the illustrative hand attached to a fan definition */
  function exampleEl(d) {
    if (!d.ex) return null;
    var wrap = div('ex-wrap');
    wrap.appendChild(div('ex-label', t('example')));
    var row = div('ex-row');
    var groups = D.parseExample(d.ex);
    var winTile = d.exw ? D.parseTile(d.exw) : null;
    var winMarked = false;
    groups.forEach(function (g) {
      var cls = 'ex-grp' + (g.kind === 'melded' ? ' melded' : '') + (g.kind === 'flower' ? ' flower' : '');
      var gb = div(cls);
      g.tiles.forEach(function (x, i) {
        var hidden = (g.kind === 'ankan') && (i === 0 || i === 3);
        var isWin = !winMarked && winTile !== null && x === winTile && g.kind === 'concealed';
        if (isWin) winMarked = true;
        gb.appendChild(tileEl(x, { face: hidden ? false : true, cls: isWin ? 'ex-win' : '' }));
      });
      row.appendChild(gb);
    });
    wrap.appendChild(row);
    var legend = [];
    if (/[*]/.test(d.ex)) legend.push('<i class="k-meld">▁ ' + t('exampleMelded') + '</i>');
    if (winTile !== null) legend.push('<i class="k-win">▢ ' + t('exampleWin') + '</i>');
    if (legend.length) wrap.appendChild(div('ex-legend', legend.join('')));
    return wrap;
  }

  /* ------------------------------------------------------------------ */
  /* fan manual                                                          */
  /* ------------------------------------------------------------------ */
  function showManual() {
    var body = div('');
    var got = {};
    if (profile && profile.patterns) profile.patterns.forEach(function (p) { got[p.name] = p.times; });

    var search = document.createElement('input');
    search.className = 'fan-search';
    search.placeholder = t('searchFan');
    body.appendChild(search);
    var listBox = div('');
    body.appendChild(listBox);

    function draw(filter) {
      clear(listBox);
      var f = (filter || '').trim().toLowerCase();
      var groups = {}, order = [];
      D.list.forEach(function (d) {
        if (f) {
          var hay = (d.zh + ' ' + d.en + ' ' + d.dz + ' ' + d.de + ' ' + d.v).toLowerCase();
          if (hay.indexOf(f) < 0) return;
        }
        if (!groups[d.v]) { groups[d.v] = []; order.push(d.v); }
        groups[d.v].push(d);
      });
      order.sort(function (a, b) { return b - a; });
      order.forEach(function (v) {
        var g = div('fan-group');
        g.innerHTML = '<h4>' + v + ' ' + t('fanValue') + ' · ' + groups[v].length + '</h4>';
        var l = div('fan-list');
        groups[v].forEach(function (d) {
          var n = got[d.id] || got[d.zh] || 0;
          var card = div('fan-card' + (n ? ' got' : ''));
          card.appendChild(div('v', String(d.v)));
          var body = div('');
          body.innerHTML = '<div class="nm">' + (I.getLang() === 'en' ? d.en : d.zh) +
            (n ? '<span class="badge">' + n + ' ' + t('times') + '</span>' : '') +
            '</div><div class="en">' + (I.getLang() === 'en' ? d.zh : d.en) + '</div>' +
            '<div class="ds">' + (I.getLang() === 'en' ? d.de : d.dz) + '</div>';
          var ex = exampleEl(d);
          if (ex) body.appendChild(ex);
          card.appendChild(body);
          l.appendChild(card);
        });
        g.appendChild(l);
        listBox.appendChild(g);
      });
      if (!order.length) listBox.innerHTML = '<p style="color:var(--ui-dim)">—</p>';
    }
    search.oninput = function () { draw(search.value); };
    draw('');
    openPanel({ title: t('manualTitle') + ' · ' + D.list.length, body: body, cls: 'wide' });
  }

  /* ------------------------------------------------------------------ */
  /* tutorial                                                            */
  /* ------------------------------------------------------------------ */
  function showTutorial() {
    var secs = I.TUTORIAL[I.getLang()] || I.TUTORIAL.zh;
    var html = '<div class="tut">';
    secs.forEach(function (s) {
      html += '<h3>' + s.h + '</h3>';
      s.p.forEach(function (p) { html += '<p>' + p + '</p>'; });
    });
    html += '</div>';
    openPanel({ title: t('tutorialTitle'), body: html });
  }

  /* ------------------------------------------------------------------ */
  /* career                                                              */
  /* ------------------------------------------------------------------ */
  function showCareer() {
    api('profile').then(function (p) {
      profile = p;
      var body = div('');
      if (!p) { body.innerHTML = '<p>' + t('careerEmpty') + '</p>'; openPanel({ title: t('career'), body: body }); return; }
      var wr = p.hands_total ? Math.round(100 * p.hands_won / p.hands_total) : 0;
      var g = div('grid-stats');
      [[t('matches'), p.matches_total], [t('matchWins'), p.matches_won],
       [t('handsTotal'), p.hands_total], [t('handsWon'), p.hands_won],
       [t('handsLost'), p.hands_lost], [t('handsDrawn'), p.hands_drawn],
       [t('dealtIn'), p.hands_dealt_in], [t('selfDraws'), p.self_draws],
       [t('winRate'), wr + '%'], [t('bestFan'), p.best_fan || '—'],
       [t('totalPoints'), (p.total_points > 0 ? '+' : '') + p.total_points]
      ].forEach(function (kv) {
        g.appendChild(div('stat', '<div class="k">' + kv[0] + '</div><div class="v gold">' + kv[1] + '</div>'));
      });
      body.appendChild(g);

      if (p.best_hand && p.best_hand.fans) {
        var bh = div(''); bh.innerHTML = '<h3 class="sec">' + t('bestFan') + ' · ' + p.best_fan + ' ' + t('fanValue') + '</h3>';
        var tw = div('win-tiles');
        T.sortTiles(p.best_hand.tiles || []).forEach(function (x) { tw.appendChild(tileEl(x, { cls: 'sm' })); });
        bh.appendChild(tw);
        var fl = div('fan-lines');
        p.best_hand.fans.forEach(function (f) {
          fl.appendChild(div('fl-n', (I.getLang() === 'en' ? f.en : f.zh) + (f.n > 1 ? ' ×' + f.n : '')));
          fl.appendChild(div('fl-v', '+' + f.sub));
        });
        bh.appendChild(fl);
        body.appendChild(bh);
      }

      var achieved = (p.patterns || []).length;
      var ph = div('');
      ph.innerHTML = '<h3 class="sec">' + t('patternsGot') + ' · ' + t('patternCount', { n: achieved, total: D.list.length }) + '</h3>';
      var pl = div('fan-list');
      D.list.forEach(function (d) {
        var rec = (p.patterns || []).filter(function (x) { return x.name === d.id || x.name === d.zh; })[0];
        var card = div('fan-card' + (rec ? ' got' : ''));
        card.innerHTML = '<div class="v">' + d.v + '</div><div><div class="nm">' +
          (I.getLang() === 'en' ? d.en : d.zh) +
          (rec ? '<span class="badge">' + rec.times + ' ' + t('times') + '</span>' : '') + '</div>' +
          '<div class="en">' + (rec ? '' : t('never')) + '</div></div>';
        pl.appendChild(card);
      });
      ph.appendChild(pl);
      body.appendChild(ph);

      if (p.recent && p.recent.length) {
        var tbl = document.createElement('table');
        tbl.className = 'tbl';
        tbl.innerHTML = '<tr><th>' + t('hand') + '</th><th>' + t('hu') + '</th><th class="num">' + t('fanValue') + '</th><th class="num">' + t('score') + '</th></tr>';
        p.recent.slice(0, 20).forEach(function (r) {
          var d0 = (r.delta && r.delta[0]) || 0;
          var tr = document.createElement('tr');
          tr.innerHTML = '<td>' + (r.hand_no + 1) + '</td>' +
            '<td>' + (r.result === 'draw' ? t('drawGame') : seatName(r.winner)) + '</td>' +
            '<td class="num">' + (r.fan || '') + '</td>' +
            '<td class="num ' + (d0 > 0 ? 'pos' : (d0 < 0 ? 'neg' : '')) + '">' + (d0 > 0 ? '+' : '') + d0 + '</td>';
          tbl.appendChild(tr);
        });
        var rh = div(''); rh.innerHTML = '<h3 class="sec">' + t('recentHands') + '</h3>';
        rh.appendChild(tbl);
        body.appendChild(rh);
      }

      var foot = div('');
      var panel;
      foot.appendChild(button(t('resetProfile'), 'ghost', function () {
        if (confirm(t('resetConfirm'))) {
          api('reset', {}).then(function () { panel.close(); lastSave = null; refreshSaveNote(); });
        }
      }));
      foot.appendChild(button(t('close'), '', function () { panel.close(); }));
      panel = openPanel({ title: t('career'), body: body, foot: foot, cls: 'wide' });
    });
  }

  /* ------------------------------------------------------------------ */
  /* boot                                                                */
  /* ------------------------------------------------------------------ */
  function boot() {
    try { var l = localStorage.getItem('mj_lang'); if (l) I.setLang(l); } catch (e) {}
    buildMenuTiles();
    applyLang();

    $('btn-new').onclick = chooseSetup;
    $('btn-continue').onclick = continueGame;
    $('btn-career').onclick = showCareer;
    $('btn-manual').onclick = showManual;
    $('btn-manual2').onclick = showManual;
    $('btn-tutorial').onclick = showTutorial;
    $('btn-tutorial2').onclick = showTutorial;
    $('btn-lang').onclick = toggleLang;
    $('btn-lang2').onclick = toggleLang;
    $('btn-stats').onclick = showHandStats;
    $('btn-quit').onclick = function () {
      if (!game) { showMenu(); return; }
      if (confirm(t('quitConfirm'))) { saveGame(); stopLoop(); game = null; showMenu(); }
    };

    api('profile').then(function (p) { profile = p; });
    showMenu();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  global.MJ.UI = { render: render, showMenu: showMenu };
})(typeof window !== 'undefined' ? window : globalThis);
