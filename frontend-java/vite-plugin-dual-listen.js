import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function lanHosts() {
  const hosts = ['localhost', '127.0.0.1'];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const n of list || []) {
      const family = n.family === 'IPv4' || n.family === 4;
      if (family && n.address && !n.internal) hosts.push(n.address);
    }
  }
  return [...new Set(hosts)];
}

function loadOrCreateCert(hosts) {
  const dir = path.join(__dirname, 'node_modules/.vite/dev-ssl');
  fs.mkdirSync(dir, { recursive: true });
  const keyPath = path.join(dir, 'key.pem');
  const certPath = path.join(dir, 'cert.pem');
  const stampPath = path.join(dir, 'hosts.txt');
  const stamp = hosts.slice().sort().join(',');

  const reuse =
    fs.existsSync(keyPath) &&
    fs.existsSync(certPath) &&
    fs.existsSync(stampPath) &&
    fs.readFileSync(stampPath, 'utf8') === stamp;

  if (!reuse) {
    const san = hosts
      .map((h) => (/^\d+\.\d+\.\d+\.\d+$/.test(h) ? `IP:${h}` : `DNS:${h}`))
      .join(',');
    execFileSync(
      'openssl',
      [
        'req',
        '-x509',
        '-newkey',
        'rsa:2048',
        '-sha256',
        '-days',
        '825',
        '-nodes',
        '-keyout',
        keyPath,
        '-out',
        certPath,
        '-subj',
        '/CN=portal-dev',
        '-addext',
        `subjectAltName=${san}`,
      ],
      { stdio: 'pipe' }
    );
    fs.writeFileSync(stampPath, stamp);
  }

  return {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  };
}

function proxyHttp(innerPort, req, res) {
  const p = http.request(
    {
      hostname: '127.0.0.1',
      port: innerPort,
      path: req.url,
      method: req.method,
      headers: req.headers,
    },
    (pr) => {
      res.writeHead(pr.statusCode || 502, pr.headers);
      pr.pipe(res);
    }
  );
  p.on('error', () => {
    if (!res.headersSent) res.writeHead(502);
    res.end('Dev proxy error');
  });
  req.pipe(p);
}

function proxyUpgrade(innerPort, req, socket, head) {
  const target = net.connect(innerPort, '127.0.0.1', () => {
    const headerLines = Object.entries(req.headers)
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
      .join('\r\n');
    target.write(`${req.method} ${req.url} HTTP/1.1\r\n${headerLines}\r\n\r\n`);
    if (head?.length) target.write(head);
    target.pipe(socket);
    socket.pipe(target);
  });
  const fail = () => {
    try {
      socket.destroy();
    } catch {
      /* ignore */
    }
    try {
      target.destroy();
    } catch {
      /* ignore */
    }
  };
  target.on('error', fail);
  socket.on('error', fail);
}

/**
 * Vite stays on a loopback HTTP port. Public 5173 accepts both HTTP (admin
 * bookmarks) and HTTPS (camera on other laptops).
 */
export default function dualListenPlugin({ publicPort = 5173 } = {}) {
  return {
    name: 'portal-dual-listen',
    apply: 'serve',
    configureServer(server) {
      let dual;
      let started = false;
      const start = () => {
        if (started) return;
        const inner = server.httpServer?.address();
        const innerPort = typeof inner === 'object' && inner ? inner.port : null;
        if (!innerPort) return;
        if (innerPort === publicPort) {
          console.warn(
            `[dev] Vite is already on ${publicPort}. Restart with \`npm run dev\` so HTTP+HTTPS can share that port.`
          );
          return;
        }
        started = true;

        let ssl;
        try {
          ssl = loadOrCreateCert(lanHosts());
        } catch (err) {
          console.warn('[dev] Could not create HTTPS cert:', err?.message || err);
          return;
        }

        const httpServer = http.createServer((req, res) => proxyHttp(innerPort, req, res));
        httpServer.on('upgrade', (req, socket, head) => proxyUpgrade(innerPort, req, socket, head));

        const httpsServer = https.createServer(ssl, (req, res) => proxyHttp(innerPort, req, res));
        httpsServer.on('upgrade', (req, socket, head) => proxyUpgrade(innerPort, req, socket, head));

        dual = net.createServer((socket) => {
          socket.once('data', (data) => {
            socket.pause();
            socket.unshift(data);
            const isTls = data[0] === 0x16 || data[0] === 0x80;
            const dest = isTls ? httpsServer : httpServer;
            dest.emit('connection', socket);
            process.nextTick(() => socket.resume());
          });
          socket.on('error', () => {});
        });

        dual.on('error', (err) => {
          console.warn(`[dev] Could not bind ${publicPort}:`, err.message);
        });

        dual.listen(publicPort, '0.0.0.0', () => {
          const hosts = lanHosts().filter((h) => h !== 'localhost' && h !== '127.0.0.1');
          console.log(`\n  ➜  Local:    http://localhost:${publicPort}/`);
          console.log(`  ➜  Local:    https://localhost:${publicPort}/`);
          for (const ip of hosts) {
            console.log(`  ➜  Network:  https://${ip}:${publicPort}/  (camera / other laptops)`);
          }
          console.log('');
        });
      };

      server.httpServer?.once('listening', start);
      if (server.httpServer?.listening) start();
      const close = () => {
        try {
          dual?.close();
        } catch {
          /* ignore */
        }
      };
      server.httpServer?.once('close', close);
    },
  };
}
