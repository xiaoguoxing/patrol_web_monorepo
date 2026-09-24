import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { networkInterfaces } from 'node:os';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const demoDirectory = dirname(fileURLToPath(import.meta.url));
const publicDirectory = resolve(demoDirectory, '..');
const host = process.env.PATROL_DEMO_HOST || '0.0.0.0';
const requestedPort = Number(process.env.PATROL_DEMO_PORT || 4175);
const port = Number.isInteger(requestedPort) && requestedPort > 0 && requestedPort < 65536 ? requestedPort : 4175;

const mimeTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.gif', 'image/gif'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml; charset=utf-8'],
  ['.webp', 'image/webp'],
]);

function sendText(response, statusCode, message) {
  response.writeHead(statusCode, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': Buffer.byteLength(message),
  });
  response.end(message);
}

function resolvePublicFile(pathname) {
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  const segments = decodedPath.split('/').filter(Boolean);
  if (segments.some((segment) => segment.startsWith('.'))) return null;
  const candidate = resolve(publicDirectory, `.${decodedPath}`);
  if (candidate !== publicDirectory && !candidate.startsWith(`${publicDirectory}${sep}`)) return null;
  return candidate;
}

const server = createServer(async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.setHeader('Allow', 'GET, HEAD');
    sendText(response, 405, 'Method Not Allowed');
    return;
  }

  const url = new URL(request.url || '/', 'http://localhost');
  if (url.pathname === '/') {
    response.writeHead(302, { Location: '/image-patrol-demo/' });
    response.end();
    return;
  }

  let filePath = resolvePublicFile(url.pathname);
  if (!filePath) {
    sendText(response, 403, 'Forbidden');
    return;
  }

  try {
    let fileStat = await stat(filePath);
    if (fileStat.isDirectory()) {
      if (!url.pathname.endsWith('/')) {
        response.writeHead(301, { Location: `${url.pathname}/${url.search}` });
        response.end();
        return;
      }
      filePath = join(filePath, 'index.html');
      fileStat = await stat(filePath);
    }
    if (!fileStat.isFile()) throw new Error('Not a file');

    const extension = extname(filePath).toLowerCase();
    response.writeHead(200, {
      'Content-Type': mimeTypes.get(extension) || 'application/octet-stream',
      'Content-Length': fileStat.size,
      'Cache-Control': extension === '.html' || extension === '.js' || extension === '.css' ? 'no-cache' : 'public, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
    });
    if (request.method === 'HEAD') {
      response.end();
      return;
    }
    createReadStream(filePath).pipe(response);
  } catch {
    sendText(response, 404, 'Not Found');
  }
});

server.on('error', (error) => {
  console.error(`图片巡检服务启动失败：${error.message}`);
  process.exitCode = 1;
});

server.listen(port, host, () => {
  const addresses = [];
  for (const interfaces of Object.values(networkInterfaces())) {
    for (const info of interfaces || []) {
      if (info.family === 'IPv4' && !info.internal) addresses.push(info.address);
    }
  }
  console.log(`图片巡检服务已启动，端口 ${port}`);
  console.log(`本机访问：http://localhost:${port}/image-patrol-demo/`);
  if (addresses.length) {
    console.log('内网访问：');
    addresses.forEach((address) => console.log(`  http://${address}:${port}/image-patrol-demo/`));
  } else {
    console.log('未读取到内网 IPv4 地址，请使用本机实际 IP 加端口访问。');
  }
  console.log('按 Ctrl+C 停止服务。');
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
