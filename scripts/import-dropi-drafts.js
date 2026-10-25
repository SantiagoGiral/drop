#!/usr/bin/env node
// Imports only safe catalog fields. Never copies costs, suppliers, stock,
// suggested prices, notes or technical variation details.
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const inputPath = process.argv[2];
if (!inputPath) {
  console.error('Uso: node scripts/import-dropi-drafts.js <ruta-a-dropi_products.json>');
  process.exit(2);
}
const slugify = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
try {
  const source = JSON.parse(fs.readFileSync(path.resolve(inputPath), 'utf8'));
  if (!Array.isArray(source.products)) throw new Error('El JSON de origen no tiene products[].');
  const file = path.join(ROOT, 'catalog/products.json');
  const catalog = JSON.parse(fs.readFileSync(file, 'utf8'));
  const known = new Set(catalog.products.map((p) => String(p.dropiId)));
  const added = [];
  const notFound = [];
  for (const sourceProduct of source.products) {
    const dropiId = String(sourceProduct.dropi_id ?? '');
    if (!dropiId) throw new Error('Producto de origen sin dropi_id.');
    if (sourceProduct.status === 'not_found_by_id_search' || !sourceProduct.name) { notFound.push(dropiId); continue; }
    if (known.has(dropiId)) continue;
    const name = String(sourceProduct.name).trim();
    const slug = slugify(name) + '-' + dropiId;
    const category = Array.isArray(sourceProduct.categories) && sourceProduct.categories.length
      ? sourceProduct.categories.map((item) => String(item).trim()).join(' · ')
      : 'Por clasificar';
    const imageUrl = Array.isArray(sourceProduct.image_urls) ? sourceProduct.image_urls[0] : null;
    const images = [];
    if (imageUrl) {
      const parsed = new URL(imageUrl);
      if (parsed.protocol !== 'https:') throw new Error('Imagen de ' + dropiId + ' no usa HTTPS.');
      images.push({ src: imageUrl, alt: 'Imagen de ' + name });
    }
    catalog.products.push({
      id: 'dropi-' + dropiId,
      dropiId,
      slug,
      status: 'draft',
      name,
      category,
      cardDescription: 'Borrador: «' + name + '». Texto neutral derivado solo del nombre; requiere revisión antes de publicarse.',
      description: ['Borrador: ' + name + '. Texto provisional basado únicamente en el nombre recibido; requiere revisión antes de publicarse.'],
      features: [],
      notices: [],
      images,
      variants: [],
      seo: { title: name + ' | Casa Clara (borrador)', description: 'Ficha en preparación para ' + name + '.' }
    });
    known.add(dropiId);
    added.push(dropiId);
  }
  fs.writeFileSync(file, JSON.stringify(catalog, null, 2) + '\n', 'utf8');
  console.log('Borradores agregados: ' + added.length + (added.length ? ' (' + added.join(', ') + ')' : '') + '.');
  console.log('IDs omitidos por no encontrarse: ' + (notFound.join(', ') || 'ninguno') + '.');
} catch (error) {
  console.error('No se importó el catálogo: ' + error.message);
  process.exitCode = 1;
}
