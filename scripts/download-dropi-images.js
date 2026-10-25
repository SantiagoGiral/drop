#!/usr/bin/env node
// Download original images for local draft review; keeps source URLs unchanged.
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const catalogPath = path.join(ROOT, 'catalog/products.json');
const outputDir = path.join(ROOT, 'img/dropi-preview');
const maxBytes = 30 * 1024 * 1024;
const extByType = { 'image/jpeg':'.jpg', 'image/png':'.png', 'image/webp':'.webp', 'image/gif':'.gif' };
const typeByExt = { '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.png':'image/png', '.webp':'image/webp', '.gif':'image/gif' };

function isImage(bytes, type) {
  if (type === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === 'image/png') return bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  if (type === 'image/webp') return bytes.toString('ascii',0,4) === 'RIFF' && bytes.toString('ascii',8,12) === 'WEBP';
  if (type === 'image/gif') return /^GIF8[79]a$/.test(bytes.toString('ascii',0,6));
  return false;
}

async function main() {
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  fs.mkdirSync(outputDir, { recursive:true });
  let downloaded = 0, skipped = 0;
  const failures = [];
  for (const product of catalog.products.filter((p) => p.status === 'draft')) {
    const image = product.images?.[0];
    if (!image || !/^https:\/\//i.test(image.src)) { failures.push(product.dropiId + ': URL principal ausente o no HTTPS'); continue; }
    const sourceUrl = new URL(image.src);
    const sourceExt = path.extname(decodeURIComponent(sourceUrl.pathname)).toLowerCase();
    const normalizedExt = sourceExt === '.jpeg' ? '.jpg' : sourceExt;
    const filename = 'dropi-' + product.dropiId + (typeByExt[normalizedExt] ? normalizedExt : '');
    const expectedPath = filename.endsWith(product.dropiId) ? '' : path.join(outputDir, filename);
    const existingPath = image.previewSrc ? path.resolve(ROOT, image.previewSrc) : expectedPath;
    if (existingPath && existingPath.startsWith(outputDir + path.sep) && fs.existsSync(existingPath)) {
      const ext = path.extname(existingPath).toLowerCase();
      const buffer = fs.readFileSync(existingPath);
      if (!isImage(buffer, typeByExt[ext])) throw new Error('La imagen local existente no tiene una firma válida: ' + existingPath);
      image.previewSrc = path.relative(ROOT, existingPath).replace(/\\/g, '/');
      skipped++;
      continue;
    }
    try {
      const response = await fetch(image.src, { signal:AbortSignal.timeout(30000), redirect:'follow' });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const type = (response.headers.get('content-type') || '').split(';')[0].toLowerCase();
      if (!Object.hasOwn(extByType, type)) throw new Error('Content-Type no compatible: ' + type);
      const buffer = Buffer.from(await response.arrayBuffer());
      if (!buffer.length || buffer.length > maxBytes || !isImage(buffer, type)) throw new Error('Contenido vacío, muy grande o firma de imagen inválida');
      const actualFilename = 'dropi-' + product.dropiId + extByType[type];
      const absolute = path.join(outputDir, actualFilename);
      const temporary = absolute + '.part';
      fs.writeFileSync(temporary, buffer, { flag:'w' });
      fs.renameSync(temporary, absolute);
      image.previewSrc = 'img/dropi-preview/' + actualFilename;
      downloaded++;
      console.log('Descargada imagen original: ' + product.dropiId + ' (' + buffer.length + ' bytes)');
    } catch (error) {
      failures.push(product.dropiId + ': ' + error.message);
      console.error('No se pudo descargar ' + product.dropiId + ': ' + error.message);
    }
  }
  fs.writeFileSync(catalogPath, JSON.stringify(catalog,null,2) + '\n','utf8');
  console.log('Descargas nuevas: ' + downloaded + '; ya disponibles: ' + skipped + '; fallidas: ' + failures.length + '.');
  if (failures.length) process.exitCode = 1;
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
