'use strict';
/**
 * Static file server + persistence API for the MCR mahjong game.
 * No npm dependencies: Node's http + fs + node:sqlite only.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const db = require('./db.js');

const PORT = Number(process.env.PORT) || 8030;
const HOST = process.env.HOST || '0.0.0.0';
const ROOT = path.join(__dirname, 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

function sendJson(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let n = 0;
    const chunks = [];
    req.on('data', (c) => {
      n += c.length;
      if (n > 4 * 1024 * 1024) { reject(new Error('payload too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

async function handleApi(req, res, url) {
  const route = url.pathname.replace(/^\/api\//, '');
  try {
    if (req.method === 'GET' && route === 'profile') return sendJson(res, 200, db.getProfile());
    if (req.method === 'GET' && route === 'savegame') {
      const slot = url.searchParams.get('slot') || 'default';
      return sendJson(res, 200, { save: db.loadGame(slot) });
    }
    if (req.method === 'GET' && route === 'health') {
      return sendJson(res, 200, { ok: true, store: db.kind, port: PORT });
    }

    if (req.method === 'POST') {
      const body = await readBody(req);
      switch (route) {
        case 'hand':        return sendJson(res, 200, db.recordHand(body));
        case 'match':       return sendJson(res, 200, db.finishMatch(body));
        case 'savegame':    return sendJson(res, 200, db.saveGame(body.slot || 'default', body.state));
        case 'clearsave':   return sendJson(res, 200, db.clearGame(body.slot || 'default'));
        case 'reset':       return sendJson(res, 200, db.resetProfile(body));
      }
    }
    return sendJson(res, 404, { error: 'no such endpoint: ' + route });
  } catch (err) {
    console.error('[api]', route, err);
    return sendJson(res, 500, { error: String(err && err.message || err) });
  }
}

function serveStatic(req, res, url) {
  let rel = decodeURIComponent(url.pathname);
  if (rel === '/' || rel === '') rel = '/index.html';
  const file = path.join(ROOT, path.normalize(rel).replace(/^(\.\.[/\\])+/, ''));
  if (!file.startsWith(ROOT)) {
    res.writeHead(403).end('forbidden');
    return;
  }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('404 Not Found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Content-Length': st.size,
      'Cache-Control': 'no-cache'
    });
    fs.createReadStream(file).pipe(res);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));
  if (url.pathname.startsWith('/api/')) return void handleApi(req, res, url);
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405).end('method not allowed');
    return;
  }
  serveStatic(req, res, url);
});

server.listen(PORT, HOST, () => {
  const nets = os.networkInterfaces();
  const lan = [];
  for (const name of Object.keys(nets)) {
    for (const ni of nets[name] || []) {
      if (ni.family === 'IPv4' && !ni.internal) lan.push(ni.address);
    }
  }
  console.log('');
  console.log('  国标麻将 / MCR Mahjong');
  console.log('  storage : ' + db.kind + '  (data/mahjong.db)');
  console.log('  local   : http://localhost:' + PORT + '/');
  for (const ip of lan) console.log('  network : http://' + ip + ':' + PORT + '/');
  console.log('');
});

process.on('SIGINT', () => { console.log('\nbye'); server.close(() => process.exit(0)); });
