const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const publicFiles = new Set([...require('./site-pages.cjs'),'styles.css','app.js','events.js','join.js']);
if (fs.existsSync(path.join(root, '.env')) && process.loadEnvFile) process.loadEnvFile(path.join(root, '.env'));
const membershipHandler = require('./api/membership.js');
const adminHandler = require('./api/admin.js');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const args = process.argv;
const port = Number(process.env.PORT || (args.includes('--port') && args[args.indexOf('--port') + 1]) || 5173);
http.createServer((req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch { res.writeHead(400).end(); return; }
  if (pathname === '/api/community-stats') { require('./api/community-stats.js')(req,res); return; }
  if (pathname === '/api/admin') { adminHandler(req, res).catch(() => { if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify({ message: 'Unable to process the request.' })); }); return; }
  if (pathname === '/admin' || pathname === '/admin/') pathname = '/admin.html';
  if (pathname === '/api/membership') { membershipHandler(req, res).catch(() => { if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ message: 'Unable to process your request.' })); }); return; }
  if (pathname === '/') pathname = '/index.html';
  if (!publicFiles.has(pathname.slice(1)) && !/^\/assets\/[a-zA-Z0-9._-]+$/.test(pathname)) { res.writeHead(404).end('Not found'); return; }
  const file = path.join(root, pathname);
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(404).end('Not found'); return; }
    if (pathname === '/admin.html') { res.setHeader('Cache-Control','no-store'); res.setHeader('X-Robots-Tag','noindex, nofollow'); }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' });
    res.end(data);
  });
}).listen(port, '127.0.0.1', () => console.log(`Girls in Luxembourg — http://localhost:${port}`));
