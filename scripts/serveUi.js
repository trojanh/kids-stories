// serveUi.js
// Simple Node static server (no external dependencies) serving the UI files.
// Usage: node serveUi.js [port]
// Serves the `src/ui` directory.

const http = require('http');
const fs = require('fs');
const path = require('path');

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
  let filePath;
  if (reqPath.startsWith('/data/')) {
    // Serve JSON or other data files from src/data
    filePath = path.join(PROJECT_ROOT, 'src', reqPath);
  } else {
    // Serve UI files from src/ui
    filePath = path.join(PROJECT_ROOT, 'src', 'ui', reqPath);
  }
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.statusCode = 404;
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath);
    res.setHeader('Content-Type', getMime(ext));
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`UI server running at http://localhost:${PORT}`);
});
