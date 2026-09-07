const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

function createSiteServer({ root = __dirname, dataDir = path.join(__dirname, '.visit-data') } = {}) {
  fs.mkdirSync(dataDir, { recursive: true });
  const counterFile = path.join(dataDir, 'visits.json');
  let count = 0;
  try {
    count = JSON.parse(fs.readFileSync(counterFile, 'utf8')).count;
    if (!Number.isSafeInteger(count) || count < 0) throw new Error('Invalid stored visit count');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const types = { '.html':'text/html; charset=utf-8', '.css':'text/css', '.js':'application/javascript', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.svg':'image/svg+xml', '.webp':'image/webp', '.ico':'image/x-icon' };
  return http.createServer((req, res) => {
    let pathname;
    try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
    catch { res.writeHead(400).end(); return; }
    if (pathname === '/api/visits') {
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Content-Type', 'application/json');
      if (!['GET', 'POST'].includes(req.method)) { res.writeHead(405, { Allow:'GET, POST' }).end(); return; }
      try {
        if (req.method === 'POST') {
          const next = count + 1;
          if (!Number.isSafeInteger(next)) throw new Error('Counter limit reached');
          fs.writeFileSync(counterFile + '.tmp', JSON.stringify({ count:next }));
          fs.renameSync(counterFile + '.tmp', counterFile);
          count = next;
        }
        res.end(JSON.stringify({ count }));
      } catch { res.writeHead(503).end(JSON.stringify({ error:'Counter unavailable' })); }
      return;
    }
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405).end(); return; }
    const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
    const file = path.resolve(root, relative);
    // Serve only public website assets, never server code or stored counts.
    if (!file.startsWith(root + path.sep) || relative.split(/[\\/]/).some(part => part.startsWith('.')) || !types[path.extname(file)]) {
      res.writeHead(404).end(); return;
    }
    fs.readFile(file, (error, data) => {
      if (error) { res.writeHead(404).end(); return; }
      res.writeHead(200, { 'Content-Type':types[path.extname(file)], 'Cache-Control':'no-cache' });
      res.end(req.method === 'HEAD' ? undefined : data);
    });
  });
}
module.exports = { createSiteServer };
if (require.main === module) {
  const port = Number(process.env.PORT || 8002);
  createSiteServer().listen(port, '0.0.0.0', () => console.log(`Website with shared counter running on port ${port}`));
}
