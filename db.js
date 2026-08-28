'use strict';
/**
 * Persistence layer for the MCR mahjong game.
 * Uses Node's built-in SQLite (node:sqlite, Node >= 22.5) so the project has zero
 * npm dependencies. Falls back to a JSON file if node:sqlite is unavailable.
 */
const path = require('path');
const fs = require('fs');

// MJ_DATA_DIR lets tests (and anyone who wants the data elsewhere) point away
// from the live database.
const DATA_DIR = process.env.MJ_DATA_DIR || path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'mahjong.db');
const JSON_PATH = path.join(DATA_DIR, 'mahjong.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

let impl = null;

/* ------------------------------------------------------------------ */
/* SQLite implementation                                               */
/* ------------------------------------------------------------------ */
function makeSqliteImpl() {
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec(`
    CREATE TABLE IF NOT EXISTS profile (
      id            INTEGER PRIMARY KEY CHECK (id = 1),
      created_at    TEXT NOT NULL,
      updated_at    TEXT NOT NULL,
      matches_total INTEGER NOT NULL DEFAULT 0,
      matches_won   INTEGER NOT NULL DEFAULT 0,
      hands_total   INTEGER NOT NULL DEFAULT 0,
      hands_won     INTEGER NOT NULL DEFAULT 0,
      hands_lost    INTEGER NOT NULL DEFAULT 0,
      hands_drawn   INTEGER NOT NULL DEFAULT 0,
      hands_dealt_in INTEGER NOT NULL DEFAULT 0,
      self_draws    INTEGER NOT NULL DEFAULT 0,
      total_points  INTEGER NOT NULL DEFAULT 0,
      best_fan      INTEGER NOT NULL DEFAULT 0,
      best_hand     TEXT,
      best_at       TEXT
    );

    CREATE TABLE IF NOT EXISTS patterns (
      name       TEXT PRIMARY KEY,
      value      INTEGER NOT NULL DEFAULT 0,
      times      INTEGER NOT NULL DEFAULT 0,
      first_at   TEXT,
      last_at    TEXT
    );

    CREATE TABLE IF NOT EXISTS hand_log (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      played_at   TEXT NOT NULL,
      match_id    TEXT NOT NULL,
      hand_no     INTEGER NOT NULL,
      round_wind  INTEGER NOT NULL,
      dealer      INTEGER NOT NULL,
      result      TEXT NOT NULL,
      winner      INTEGER,
      loser       INTEGER,
      fan         INTEGER NOT NULL DEFAULT 0,
      min_fan     INTEGER NOT NULL DEFAULT 8,
      delta       TEXT NOT NULL,
      detail      TEXT
    );

    CREATE TABLE IF NOT EXISTS savegame (
      slot       TEXT PRIMARY KEY,
      updated_at TEXT NOT NULL,
      state      TEXT NOT NULL
    );
  `);
  const now = () => new Date().toISOString();
  db.prepare(
    'INSERT OR IGNORE INTO profile (id, created_at, updated_at) VALUES (1, ?, ?)'
  ).run(now(), now());

  return {
    kind: 'sqlite',
    getProfile() {
      const row = db.prepare('SELECT * FROM profile WHERE id = 1').get();
      const pats = db
        .prepare('SELECT name, value, times, first_at, last_at FROM patterns ORDER BY value DESC, times DESC')
        .all();
      const recent = db
        .prepare('SELECT * FROM hand_log ORDER BY id DESC LIMIT 50')
        .all()
        .map((r) => ({ ...r, delta: JSON.parse(r.delta), detail: r.detail ? JSON.parse(r.detail) : null }));
      return {
        ...row,
        best_hand: row.best_hand ? JSON.parse(row.best_hand) : null,
        patterns: pats,
        recent
      };
    },

    recordHand(rec) {
      const ts = now();
      db.prepare(
        `INSERT INTO hand_log
           (played_at, match_id, hand_no, round_wind, dealer, result, winner, loser, fan, min_fan, delta, detail)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`
      ).run(
        ts,
        String(rec.matchId),
        rec.handNo | 0,
        rec.roundWind | 0,
        rec.dealer | 0,
        rec.result,
        rec.winner == null ? null : rec.winner | 0,
        rec.loser == null ? null : rec.loser | 0,
        rec.fan | 0,
        rec.minFan | 0,
        JSON.stringify(rec.delta || [0, 0, 0, 0]),
        rec.detail ? JSON.stringify(rec.detail) : null
      );

      const p = db.prepare('SELECT * FROM profile WHERE id = 1').get();
      const upd = {
        hands_total: p.hands_total + 1,
        hands_won: p.hands_won + (rec.winner === 0 ? 1 : 0),
        hands_lost: p.hands_lost + (rec.result === 'win' && rec.winner !== 0 ? 1 : 0),
        hands_drawn: p.hands_drawn + (rec.result === 'draw' ? 1 : 0),
        hands_dealt_in: p.hands_dealt_in + (rec.loser === 0 ? 1 : 0),
        self_draws: p.self_draws + (rec.winner === 0 && rec.selfDrawn ? 1 : 0),
        total_points: p.total_points + ((rec.delta && rec.delta[0]) | 0),
        best_fan: p.best_fan,
        best_hand: p.best_hand,
        best_at: p.best_at
      };
      if (rec.winner === 0 && (rec.fan | 0) > p.best_fan) {
        upd.best_fan = rec.fan | 0;
        upd.best_hand = JSON.stringify(rec.detail || null);
        upd.best_at = ts;
      }
      db.prepare(
        `UPDATE profile SET updated_at=?, hands_total=?, hands_won=?, hands_lost=?, hands_drawn=?,
           hands_dealt_in=?, self_draws=?, total_points=?, best_fan=?, best_hand=?, best_at=?
         WHERE id = 1`
      ).run(
        ts, upd.hands_total, upd.hands_won, upd.hands_lost, upd.hands_drawn,
        upd.hands_dealt_in, upd.self_draws, upd.total_points, upd.best_fan,
        upd.best_hand, upd.best_at
      );

      if (rec.winner === 0 && Array.isArray(rec.patterns)) {
        const ins = db.prepare(
          `INSERT INTO patterns (name, value, times, first_at, last_at) VALUES (?,?,1,?,?)
           ON CONFLICT(name) DO UPDATE SET times = times + 1, last_at = excluded.last_at`
        );
        for (const pat of rec.patterns) ins.run(String(pat.name), pat.value | 0, ts, ts);
      }
      return this.getProfile();
    },

    finishMatch(rec) {
      const ts = now();
      const p = db.prepare('SELECT * FROM profile WHERE id = 1').get();
      db.prepare(
        'UPDATE profile SET updated_at=?, matches_total=?, matches_won=? WHERE id = 1'
      ).run(ts, p.matches_total + 1, p.matches_won + (rec.won ? 1 : 0));
      return this.getProfile();
    },

    saveGame(slot, state) {
      db.prepare(
        `INSERT INTO savegame (slot, updated_at, state) VALUES (?,?,?)
         ON CONFLICT(slot) DO UPDATE SET updated_at = excluded.updated_at, state = excluded.state`
      ).run(String(slot), now(), JSON.stringify(state));
      return { ok: true };
    },

    loadGame(slot) {
      const row = db.prepare('SELECT * FROM savegame WHERE slot = ?').get(String(slot));
      if (!row) return null;
      return { updatedAt: row.updated_at, state: JSON.parse(row.state) };
    },

    clearGame(slot) {
      db.prepare('DELETE FROM savegame WHERE slot = ?').run(String(slot));
      return { ok: true };
    },

    /** opts: {career:bool, save:bool} — both default to true (wipe everything) */
    resetProfile(opts) {
      opts = opts || {};
      const career = opts.career !== false;
      const save = opts.save !== false;
      const ts = now();
      if (career) {
        db.exec('DELETE FROM patterns; DELETE FROM hand_log;');
        db.prepare(
          `UPDATE profile SET updated_at=?, matches_total=0, matches_won=0, hands_total=0,
             hands_won=0, hands_lost=0, hands_drawn=0, hands_dealt_in=0, self_draws=0,
             total_points=0, best_fan=0, best_hand=NULL, best_at=NULL WHERE id = 1`
        ).run(ts);
      }
      if (save) db.exec('DELETE FROM savegame;');
      return this.getProfile();
    }
  };
}

/* ------------------------------------------------------------------ */
/* JSON fallback (only used if node:sqlite is missing)                 */
/* ------------------------------------------------------------------ */
function makeJsonImpl() {
  const blank = () => ({
    profile: {
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      matches_total: 0, matches_won: 0, hands_total: 0, hands_won: 0, hands_lost: 0,
      hands_drawn: 0, hands_dealt_in: 0, self_draws: 0, total_points: 0,
      best_fan: 0, best_hand: null, best_at: null
    },
    patterns: {}, hand_log: [], savegame: {}
  });
  let store;
  try { store = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8')); } catch { store = blank(); }
  const flush = () => fs.writeFileSync(JSON_PATH, JSON.stringify(store, null, 2));
  const now = () => new Date().toISOString();
  const self = {
    kind: 'json',
    getProfile() {
      return {
        ...store.profile,
        patterns: Object.entries(store.patterns)
          .map(([name, v]) => ({ name, ...v }))
          .sort((a, b) => b.value - a.value || b.times - a.times),
        recent: store.hand_log.slice(-50).reverse()
      };
    },
    recordHand(rec) {
      const ts = now();
      store.hand_log.push({ played_at: ts, ...rec });
      const p = store.profile;
      p.updated_at = ts;
      p.hands_total++;
      if (rec.winner === 0) p.hands_won++;
      if (rec.result === 'win' && rec.winner !== 0) p.hands_lost++;
      if (rec.result === 'draw') p.hands_drawn++;
      if (rec.loser === 0) p.hands_dealt_in++;
      if (rec.winner === 0 && rec.selfDrawn) p.self_draws++;
      p.total_points += (rec.delta && rec.delta[0]) | 0;
      if (rec.winner === 0 && (rec.fan | 0) > p.best_fan) {
        p.best_fan = rec.fan | 0; p.best_hand = rec.detail || null; p.best_at = ts;
      }
      if (rec.winner === 0 && Array.isArray(rec.patterns)) {
        for (const pat of rec.patterns) {
          const e = store.patterns[pat.name] || { value: pat.value | 0, times: 0, first_at: ts };
          e.times++; e.last_at = ts; e.value = pat.value | 0;
          store.patterns[pat.name] = e;
        }
      }
      flush();
      return self.getProfile();
    },
    finishMatch(rec) {
      store.profile.matches_total++;
      if (rec.won) store.profile.matches_won++;
      store.profile.updated_at = now();
      flush();
      return self.getProfile();
    },
    saveGame(slot, state) { store.savegame[slot] = { updatedAt: now(), state }; flush(); return { ok: true }; },
    loadGame(slot) { return store.savegame[slot] || null; },
    clearGame(slot) { delete store.savegame[slot]; flush(); return { ok: true }; },
    resetProfile(opts) {
      opts = opts || {};
      const saved = (opts.save === false) ? store.savegame : {};
      if (opts.career !== false) { store = blank(); store.savegame = saved; }
      else if (opts.save !== false) { store.savegame = {}; }
      flush();
      return self.getProfile();
    }
  };
  return self;
}

try {
  impl = makeSqliteImpl();
} catch (err) {
  console.warn('[db] node:sqlite unavailable (' + err.message + '), falling back to JSON store');
  impl = makeJsonImpl();
}

module.exports = impl;
