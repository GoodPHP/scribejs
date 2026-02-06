import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const port = Number(process.env.PORT || 3000);

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

const safeResolve = (urlPath) => {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const resolved = path.resolve(rootDir, '.' + decoded);
  if (!resolved.startsWith(rootDir)) return null;
  return resolved;
};

const server = http.createServer((req, res) => {
  const urlPath = req.url || '/';
  const targetPath = urlPath === '/' ? '/index.html' : urlPath;
  const filePath = safeResolve(targetPath);

  if (!filePath) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.statusCode = 404;
      res.end('Not found');
      return;
    }

    const ext = path.extname(filePath);
    res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-store');

    const stream = fs.createReadStream(filePath);
    stream.on('error', () => {
      res.statusCode = 500;
      res.end('Server error');
    });
    stream.pipe(res);
  });
});

const getLanAddress = () => {
  const interfaces = os.networkInterfaces();
  for (const entries of Object.values(interfaces)) {
    if (!entries) continue;
    for (const entry of entries) {
      if (entry && entry.family === 'IPv4' && !entry.internal) {
        return entry.address;
      }
    }
  }
  return null;
};

server.listen(port, () => {
  const localUrl = `http://localhost:${port}/`;
  const lanAddress = getLanAddress();
  console.log('Dev server running at:');
  console.log(`  Local:   ${localUrl}`);
  if (lanAddress) {
    console.log(`  Network: http://${lanAddress}:${port}/`);
  }
});
