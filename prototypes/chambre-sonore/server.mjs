import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

const prototypeRoot = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(prototypeRoot, '../..');
const exactExternalFiles = new Map([
  ['/vendor/three.module.js', resolve(workspaceRoot, 'node_modules/three/build/three.module.js')],
  ['/vendor/three.core.js', resolve(workspaceRoot, 'node_modules/three/build/three.core.js')],
  ['/vendor/RoomEnvironment.js', resolve(workspaceRoot, 'node_modules/three/examples/jsm/environments/RoomEnvironment.js')],
  ['/media/signature.wav', resolve(workspaceRoot, 'public/audio/synaura-sonic-logo.wav')],
]);

const contentTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.avif', 'image/avif'],
  ['.gif', 'image/gif'],
  ['.ico', 'image/x-icon'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
  ['.wav', 'audio/wav'],
  ['.mp3', 'audio/mpeg'],
  ['.ogg', 'audio/ogg'],
]);

function respond(request, response, status, message, extraHeaders = {}) {
  const body = Buffer.from(message);
  response.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': body.length,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...extraHeaders,
  });
  response.end(request.method === 'HEAD' ? undefined : body);
}

function decodePath(rawUrl) {
  if (!rawUrl?.startsWith('/') || rawUrl.startsWith('//')) return null;
  let pathname;
  try {
    pathname = decodeURIComponent(rawUrl.split('?')[0]);
  } catch {
    return null;
  }
  // Check before URL/path normalization, including encoded Windows separators.
  if (/[\\\u0000-\u001f\u007f:%#]/.test(pathname)) return null;
  const segments = pathname.split('/');
  if (segments.some((segment) => segment.startsWith('.'))) return null;
  return pathname === '/' ? '/index.html' : pathname;
}

async function locateFile(pathname) {
  const externalFile = exactExternalFiles.get(pathname);
  if (externalFile) return externalFile;
  if (pathname.startsWith('/vendor/') || pathname.startsWith('/media/')) return null;
  if (!contentTypes.has(extname(pathname).toLowerCase())) return null;

  const target = resolve(prototypeRoot, `.${pathname}`);
  const [rootRealPath, targetRealPath] = await Promise.all([
    realpath(prototypeRoot),
    realpath(target),
  ]);
  const relativePath = relative(rootRealPath, targetRealPath);
  if (!relativePath || relativePath === '..' || relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath)) {
    return null;
  }
  if (relativePath.split(sep).some((segment) => segment.startsWith('.')) || !contentTypes.has(extname(targetRealPath).toLowerCase())) {
    return null;
  }
  return targetRealPath;
}

function parseRange(header, size) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match || (!match[1] && !match[2])) return null;
  const first = match[1] ? Number(match[1]) : null;
  const last = match[2] ? Number(match[2]) : null;
  if ((first !== null && !Number.isSafeInteger(first)) || (last !== null && !Number.isSafeInteger(last))) return null;
  const start = first === null ? Math.max(0, size - last) : first;
  const end = first === null || last === null ? size - 1 : Math.min(last, size - 1);
  if (start > end || start >= size || start < 0) return null;
  return { start, end };
}

/** Creates an unbound server; tests can bind an ephemeral loopback port. */
export function createChamberServer() {
  return createServer(async (request, response) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      respond(request, response, 405, 'Method not allowed.\n', { Allow: 'GET, HEAD' });
      return;
    }

    const pathname = decodePath(request.url);
    if (!pathname) {
      respond(request, response, 404, 'Not found.\n');
      return;
    }

    try {
      const filePath = await locateFile(pathname);
      if (!filePath) {
        respond(request, response, 404, 'Not found.\n');
        return;
      }
      const file = await stat(filePath);
      if (!file.isFile()) {
        respond(request, response, 404, 'Not found.\n');
        return;
      }

      let range = null;
      if (request.method === 'GET' && request.headers.range) {
        range = parseRange(request.headers.range, file.size);
        if (!range) {
          respond(request, response, 416, 'Range not satisfiable.\n', {
            'Content-Range': `bytes */${file.size}`,
          });
          return;
        }
      }

      response.writeHead(range ? 206 : 200, {
        'Content-Type': contentTypes.get(extname(filePath).toLowerCase()),
        'Content-Length': range ? range.end - range.start + 1 : file.size,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer',
        'Accept-Ranges': 'bytes',
        ...(range ? { 'Content-Range': `bytes ${range.start}-${range.end}/${file.size}` } : {}),
      });
      if (request.method === 'HEAD') {
        response.end();
        return;
      }
      await pipeline(createReadStream(filePath, range ?? undefined), response);
    } catch (error) {
      if (response.destroyed) return;
      if (response.headersSent) {
        response.destroy();
        return;
      }
      const missing = error?.code === 'ENOENT' || error?.code === 'ENOTDIR';
      respond(request, response, missing ? 404 : 500, missing ? 'Not found.\n' : 'Unable to serve this file.\n');
    }
  });
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const rawPort = process.env.CHAMBER_PORT ?? '3100';
  const port = /^\d+$/.test(rawPort) ? Number(rawPort) : NaN;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error('CHAMBER_PORT must be an integer from 1 to 65535.');
    process.exitCode = 1;
  } else {
    const server = createChamberServer();
    server.once('error', (error) => {
      console.error(error.code === 'EADDRINUSE'
        ? `Port ${port} is already in use. Choose another CHAMBER_PORT.`
        : `Unable to start La Chambre Sonore: ${error.message}`);
      process.exitCode = 1;
    });
    server.listen(port, '127.0.0.1', () => {
      console.log(`La Chambre Sonore ready: http://127.0.0.1:${port}/`);
    });
    const close = () => server.close();
    process.once('SIGINT', close);
    process.once('SIGTERM', close);
  }
}
