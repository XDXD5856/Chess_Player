import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const root = resolve('site_bridge');
const publicDir = join(root, 'public');
const distDir = join(root, 'dist');
const port = 4173;

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

createServer((req, res) => {
  const urlPath = (req.url || '/').split('?')[0];
  const target = urlPath === '/' ? '/demo.html' : urlPath;
  const candidates = [join(publicDir, target), join(distDir, target)];
  const file = candidates.find((p) => existsSync(p));

  if (!file) {
    res.statusCode = 404;
    res.end('Not Found');
    return;
  }

  const ext = extname(file);
  res.setHeader('Content-Type', mime[ext] || 'text/plain; charset=utf-8');
  res.end(readFileSync(file));
}).listen(port, () => {
  console.log(`site_bridge demo: http://127.0.0.1:${port}`);
});
