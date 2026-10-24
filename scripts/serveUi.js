// serveUi.js
// Simple Node static server (no external dependencies) serving the UI files.
// Usage: node serveUi.js [port]
// Serves the `src/ui` directory.

const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const PORT = process.argv[2] || 8080;
const PROJECT_ROOT = path.join(__dirname, '..');

function getMime(ext) {
  const map = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.json': 'application/json',
    '.xml': 'application/xml',
    '.txt': 'text/plain',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
  };
  return map[ext.toLowerCase()] || 'application/octet-stream';
}

const server = http.createServer((req, res) => {
  let reqPath = decodeURIComponent(req.url.split('?')[0]);
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';

  // Support clean SPA story routing: e.g. /story/crow_and_water_pot -> serve index.html
  if (reqPath.startsWith('/story/') && !path.extname(reqPath)) {
    reqPath = '/index.html';
  }

  // Handle nested asset requests if requested relative to /story/
  if (reqPath.startsWith('/story/')) {
    const stripped = reqPath.replace(/^\/story/, '');
    if (stripped.startsWith('/data/')) {
      const p1 = path.join(PROJECT_ROOT, 'src', stripped);
      const p2 = path.join(PROJECT_ROOT, 'src', 'ui', stripped);
      if (fs.existsSync(p1) || fs.existsSync(p2)) reqPath = stripped;
    } else {
      const p = path.join(PROJECT_ROOT, 'src', 'ui', stripped);
      if (fs.existsSync(p)) reqPath = stripped;
    }
  }

  let filePath;
  if (reqPath.startsWith('/data/')) {
    // Serve JSON or other data files from src/data (or src/ui/data fallback)
    const p1 = path.join(PROJECT_ROOT, 'src', reqPath);
    const p2 = path.join(PROJECT_ROOT, 'src', 'ui', reqPath);
    filePath = fs.existsSync(p1) ? p1 : p2;
  } else {
    // Serve UI files from src/ui
    filePath = path.join(PROJECT_ROOT, 'src', 'ui', reqPath);
  }

  // SPA fallback for navigation requests to non-existent paths without extensions
  if (!fs.existsSync(filePath) && !path.extname(reqPath)) {
    filePath = path.join(PROJECT_ROOT, 'src', 'ui', 'index.html');
  }
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.statusCode = 404;
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath);
    const mime = getMime(ext);
    const isAudio = ext === '.mp3' || ext === '.wav' || ext === '.ogg';
    const totalSize = stats.size;

    res.setHeader('Accept-Ranges', 'bytes');

    if (isAudio) {
      // High-performance long-term caching for static audio assets
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (ext === '.json' || ext === '.svg') {
      res.setHeader('Cache-Control', 'public, max-age=3600');
    } else {
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    }

    // Support HTTP 206 Range requests for seamless audio seeking & streaming on iOS/Chrome
    const rangeHeader = req.headers.range;
    if (rangeHeader && isAudio) {
      const parts = rangeHeader.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;

      if (isNaN(start) || start >= totalSize || (end && end >= totalSize)) {
        res.statusCode = 416;
        res.setHeader('Content-Range', `bytes */${totalSize}`);
        res.end();
        return;
      }

      const chunkSize = end - start + 1;
      res.statusCode = 206;
      res.setHeader('Content-Range', `bytes ${start}-${end}/${totalSize}`);
      res.setHeader('Content-Length', chunkSize);
      res.setHeader('Content-Type', mime);

      const stream = fs.createReadStream(filePath, { start, end });
      stream.pipe(res);
    } else {
      const acceptEncoding = req.headers['accept-encoding'] || '';
      res.statusCode = 200;
      res.setHeader('Content-Type', mime);
      res.setHeader('Vary', 'Accept-Encoding');

      // High-performance compression for text, JSON, CSS, JS, SVG assets (slashes transfer size by ~80%)
      if (!isAudio && /\bgzip\b/.test(acceptEncoding)) {
        res.setHeader('Content-Encoding', 'gzip');
        fs.createReadStream(filePath).pipe(zlib.createGzip()).pipe(res);
      } else if (!isAudio && /\bdeflate\b/.test(acceptEncoding)) {
        res.setHeader('Content-Encoding', 'deflate');
        fs.createReadStream(filePath).pipe(zlib.createDeflate()).pipe(res);
      } else {
        res.setHeader('Content-Length', totalSize);
        fs.createReadStream(filePath).pipe(res);
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`UI server running at http://localhost:${PORT}`);
});
