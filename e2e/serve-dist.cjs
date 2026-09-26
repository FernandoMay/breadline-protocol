/*
 * Static server for the built app, mirroring netlify.toml routing.
 *
 * The Vite dev server is unusable here: its file watcher hits EMFILE on this
 * OneDrive-synced directory. Serving `dist` instead also raises fidelity — the
 * suite exercises the artifact that actually ships, including the SPA rewrite.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', 'dist');
const PORT = Number(process.env.PORT || 5178);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.wasm': 'application/wasm',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
  const url = decodeURIComponent((req.url || '/').split('?')[0]);

  // netlify.toml: /app/* -> /app/index.html
  let file;
  if (url.startsWith('/app/') || url === '/app') {
    file = path.join(ROOT, 'app', 'index.html');
  } else {
    const direct = path.join(ROOT, url);
    file = fs.existsSync(direct) && fs.statSync(direct).isFile() ? direct : path.join(ROOT, 'index.html');
  }

  if (!fs.existsSync(file)) {
    res.writeHead(404).end('not found');
    return;
  }

  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('serving dist on http://127.0.0.1:' + PORT);
});
