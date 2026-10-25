#!/usr/bin/env node
// Static local preview only; binds to loopback and uses Node built-ins.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const root = path.resolve(__dirname, '..');
const port = Number(process.argv[2] || 8000);
const pricingFile = process.argv[3] ? path.resolve(process.argv[3]) : path.join(os.tmpdir(), 'casa_clara_tabla_precios_envio_20k.json');
const types = { '.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.gif':'image/gif','.xml':'application/xml; charset=utf-8','.txt':'text/plain; charset=utf-8' };
http.createServer((req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname); } catch { res.writeHead(400).end('Bad request'); return; }
  if (pathname === '/__local/precios-provisionales.json') {
    const client = req.socket.remoteAddress;
    if (!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(client)) { res.writeHead(403).end('Local preview only'); return; }
    fs.readFile(pricingFile, 'utf8', (error, content) => {
      if (error) { res.writeHead(404, { 'Cache-Control':'no-store' }).end('Local pricing JSON not found'); return; }
      try {
        const cleanContent = content.replace(/^\uFEFF/, '');
        const rows = JSON.parse(cleanContent);
        if (!Array.isArray(rows) || rows.some((row) => !row || typeof row.id_dropi !== 'string' || !['propuesto','pendiente_variante','pendiente_identificar'].includes(row.estado_precio) || !(row.precio_venta_propuesto_cop === null || Number.isFinite(row.precio_venta_propuesto_cop)))) throw new Error('Invalid local proposal schema');
        const previewRows = rows.map((row) => ({
          id: row.id_dropi,
          proposedPriceCop: row.precio_venta_propuesto_cop,
          priceStatus: row.estado_precio
        }));
        res.writeHead(200, { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store' }).end(JSON.stringify(previewRows));
      } catch { res.writeHead(400, { 'Cache-Control':'no-store' }).end('Invalid local pricing JSON'); }
    });
    return;
  }
  if (pathname === '/') pathname = '/index.html';
  const file = path.resolve(root, `.${pathname}`);
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end('Forbidden'); return; }
  fs.stat(file, (error, stat) => {
    if (error || !stat.isFile()) { res.writeHead(404).end('Not found'); return; }
    const headers = { 'Content-Type': types[path.extname(file).toLowerCase()] || 'application/octet-stream', 'X-Content-Type-Options':'nosniff' };
    res.writeHead(200, headers);
    fs.createReadStream(file).pipe(res);
  });
}).listen(port, '127.0.0.1', () => console.log(`Casa Clara disponible en http://127.0.0.1:${port}/ (solo en este equipo).`));
