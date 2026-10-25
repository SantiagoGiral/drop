#!/usr/bin/env node
// Merge only customer-facing description fields into existing Dropi draft records.
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const sourceFile = process.argv[2];
if (!sourceFile) {
  console.error('Uso: node scripts/import-dropi-descriptions.js "C:\\ruta\\casa_clara_descripciones_dropi.json"');
  process.exit(1);
}

const source = JSON.parse(fs.readFileSync(path.resolve(sourceFile), 'utf8').replace(/^\uFEFF/, ''));
const catalogPath = path.join(root, 'catalog/products.json');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
if (!Array.isArray(source.products)) throw new Error('El JSON fuente debe contener products[].');

const variantOptions = {
  '1829387': { label: 'Color', options: ['Blanco', 'Negro'] },
  '2073846': {
    label: 'Tamaño',
    options: [
      'Sencillo — 100 × 190 cm',
      'Semidoble — 120 × 190 cm',
      'Doble — 140 × 190 cm',
      'Queen — 160 × 190 cm',
      'King — 200 × 200 cm'
    ]
  }
};
const byDropiId = new Map(catalog.products.map((product) => [String(product.dropiId), product]));
const sourceIds = new Set();
let updated = 0;

for (const item of source.products) {
  const id = String(item.id || '');
  if (!id || sourceIds.has(id)) throw new Error(`ID vacío o duplicado en JSON fuente: ${id}`);
  sourceIds.add(id);
  if (id === '2118677') continue;
  const product = byDropiId.get(id);
  if (!product || product.status !== 'draft') throw new Error(`No existe un borrador Dropi para ID ${id}; no se importan productos automáticamente.`);
  if (typeof item.description !== 'string' || !Array.isArray(item.characteristics)) throw new Error(`Descripción o características inválidas para ${id}.`);

  const description = item.description.trim();
  if (!description) throw new Error(`Descripción vacía para ${id}.`);
  product.cardDescription = description;
  product.description = [description];
  product.draftMeasures = item.measures && !/^no especificadas?$/i.test(item.measures.trim()) ? item.measures.trim() : null;
  product.draftFeatures = item.characteristics.filter((value) => typeof value === 'string' && value.trim()).map((value) => value.trim());
  const packageContents = typeof item.package_contents === 'string' ? item.package_contents.trim() : '';
  product.draftPackageContents = packageContents && !/^no especificado en la informaci[oó]n recibida$/i.test(packageContents)
    ? packageContents
    : null;
  if (variantOptions[id]) product.draftVariants = variantOptions[id];
  else delete product.draftVariants;
  updated++;
}

const expected = catalog.products.filter((product) => product.status === 'draft').length;
if (updated !== expected) throw new Error(`Se actualizaron ${updated} de ${expected} borradores; se cancela para evitar una importación parcial.`);
fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + '\n', 'utf8');
console.log(`Descripciones integradas en ${updated} borradores existentes. Se omitió 2118677; no se copiaron notas internas.`);
