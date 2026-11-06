// Minimal static server for the lab viewer: node sim/serve.ts → http://localhost:5173/lab/viewer/
// Serves the repository root so the viewer can import game/data/content.json. TypeScript files
// are served as JavaScript with their types stripped (Node's built-in stripper, no build step).
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stripTypeScriptTypes } from 'node:module';

const root = fileURLToPath(new URL('../..', import.meta.url));
const types: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.ts': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
};
const port = Number(process.env.PORT ?? 5173);

createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  if (path === '/' || path === '/lab/viewer') path = '/lab/viewer/';
  if (path.endsWith('/')) path += 'index.html';
  const file = normalize(join(root, path));
  if (!file.startsWith(root) || file.includes('node_modules')) return res.writeHead(403).end();
  try {
    const raw = await readFile(file);
    const body = extname(file) === '.ts' ? stripTypeScriptTypes(raw.toString('utf8')) : raw;
    res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' }).end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
}).listen(port, () => console.log(`Viewer: http://localhost:${port}/lab/viewer/`));
