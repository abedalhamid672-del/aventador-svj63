// Minimal static server for tools/preview.html (dev only).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.glb': 'model/gltf-binary', '.wasm': 'application/wasm' };
import { fileURLToPath } from 'node:url';
// Serve the project root (one level up from tools/) regardless of the launch cwd.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
http.createServer((req, res) => {
  const file = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(5178, () => console.log('preview on http://localhost:5178/tools/preview.html'));
