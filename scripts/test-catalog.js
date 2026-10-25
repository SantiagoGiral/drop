#!/usr/bin/env node
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { buildOutputs, writeOutputs, MARKER } = require('./build-catalog');
const { calculateMinimumPrice } = require('../js/pricing');
const root = path.resolve(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'catalog/products.json'), 'utf8'));
const internalTableFile = path.join(os.tmpdir(), 'casa_clara_tabla_precios_envio_20k.json');
const internalTable = fs.existsSync(internalTableFile) ? JSON.parse(fs.readFileSync(internalTableFile, 'utf8')) : null;
const expected = new Map([['924885',59900],['1899391',114900],['1976352',74900],['700560',79900],['2241912',79900],['2146043',74900]]);
const published = data.products.filter((p) => p.status === 'published');
const drafts = data.products.filter((p) => p.status === 'draft');
assert.equal(published.length, 6, 'se conservan seis productos publicados');
assert.deepEqual(new Map(published.map((p) => [p.dropiId, p.salePriceCop])), expected, 'precios actuales sin cambios');
assert.equal(drafts.length, 11, 'se importaron los 11 productos encontrados como borradores');
if (internalTable) {
  assert.equal(internalTable.length, 12, 'tabla interna incluye los 11 borradores y la consulta pendiente');
  for (const row of internalTable) {
    if (row.estado_precio === 'propuesto') {
      assert.ok(row.precio_venta_propuesto_cop >= row.costo_dropi_cop + row.envio_estimado_cop + row.ganancia_objetivo_cop, 'el precio nunca queda bajo costo + envío + objetivo');
      assert.equal(row.ganancia_antes_comisiones_publicidad_cop, row.precio_venta_propuesto_cop - row.costo_dropi_cop - row.envio_estimado_cop, 'ganancia estimada excluye comisiones y publicidad');
      assert.equal(row.precio_venta_propuesto_cop % 1000, 900, 'precio comercial termina en 900');
    } else assert.equal(row.precio_venta_propuesto_cop, null, 'variantes y producto no encontrado no reciben un precio único');
  }
  assert.equal(internalTable.filter((row) => row.estado_precio === 'propuesto').length, 9);
  assert.equal(internalTable.filter((row) => row.estado_precio === 'pendiente_variante').length, 2);
  assert.equal(internalTable.find((row) => row.id_dropi === '2118677').estado_precio, 'pendiente_identificar');
}
assert.match(fs.readFileSync(path.join(root,'admin/vista-previa-dropi.html'),'utf8'), /Envío estimado: \$20\.000 COP/);
const ids = new Set(data.products.map((p) => p.id));
assert.equal(ids.size, data.products.length, 'no hay productos duplicados');
const privateKeys = /^(supplierCost|supplierId|stockReported|suggestedPriceCop|storefrontPriceCop|notes|supplier_cost_cop|supplier_id|stock_reported|suggested_price_cop|storefront_price_cop)$/i;
const checkKeys = (value) => {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    assert.ok(!privateKeys.test(key), `el catálogo no copia el campo privado ${key}`);
    checkKeys(child);
  }
};
checkKeys(data);
for (const p of data.products) {
  for (const image of p.images) {
    if (/^https:\/\//i.test(image.src)) assert.equal(new URL(image.src).protocol, 'https:', 'las fotos remotas usan HTTPS');
    else assert.ok(fs.existsSync(path.join(root, image.src)), `existe la imagen ${image.src}`);
  }
}
for (const p of published) {
  const page = fs.readFileSync(path.join(root, `productos/${p.slug}.html`), 'utf8');
  assert.ok(page.includes(MARKER), `${p.slug} está marcada como generada`);
  assert.ok(page.includes(`data-whatsapp-product="${p.name}"`), `WhatsApp identifica ${p.name}`);
  assert.ok(page.includes(new Intl.NumberFormat('es-CO').format(p.salePriceCop)), `la ficha publica el precio correcto de ${p.name}`);
  assert.ok(page.includes(`data-whatsapp-price="$${new Intl.NumberFormat('es-CO').format(p.salePriceCop)} COP"`), `WhatsApp usa el precio correcto de ${p.name}`);
}
for (const p of drafts) {
  assert.equal(Object.hasOwn(p, 'salePriceCop'), false, `${p.dropiId} no tiene precio de venta final`);
  assert.ok(['propuesto','pendiente_variante'].includes(p.proposalStatus), `${p.dropiId} identifica el estado del precio propuesto`);
  if (p.proposalStatus === 'propuesto') assert.ok(Number.isInteger(p.proposedSalePriceCop), `${p.dropiId} tiene un precio propuesto numérico`);
  else assert.equal(p.proposedSalePriceCop, null, `${p.dropiId} no recibe precio sin identificar variante`);
  assert.equal(p.variants.length, 0, `${p.dropiId} no expone variantes técnicas`);
  assert.ok(!p.cardDescription.startsWith('Borrador:'), `${p.dropiId} usa la descripcion fuente`);
  assert.ok(Array.isArray(p.draftFeatures), `${p.dropiId} conserva caracteristicas`);
  assert.ok(!JSON.stringify(p).includes('internal_note'), `${p.dropiId} no copia notas internas`);
  assert.ok(p.images[0]?.src.startsWith('https://'), `${p.dropiId} conserva la URL original HTTPS`);
  assert.ok(p.images[0]?.previewSrc && fs.existsSync(path.join(root,p.images[0].previewSrc)), `${p.dropiId} tiene una copia local para previsualización`);
}
assert.ok(!JSON.stringify(data).includes('internal_note'), 'el catalogo no incluye notas internas de Dropi');
assert.ok(!data.products.some((p) => p.dropiId === '2118677'), '2118677 no aparece en el catálogo visible ni de borradores');
const publicFiles = ['index.html','sitemap.xml', ...published.map((p) => `productos/${p.slug}.html`)];
for (const filename of publicFiles) {
  const content = fs.readFileSync(path.join(root, filename), 'utf8');
  assert.ok(!/(supplierCost|providerCost|shippingCost|commissionRate|fixedFee|targetProfit|costo del proveedor|flete estimado|comisión porcentual)/i.test(content), `sin datos/campos de calculadora en ${filename}`);
}
const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
const homepage = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert.equal((homepage.match(/class="catalog-card(?: preview-card)?"/g) || []).length, 17, 'portada muestra seis publicados y once borradores');
assert.equal((homepage.match(/data-catalog-filter=/g) || []).length, 6, 'portada ofrece filtro general y cinco categorias');
assert.match(homepage, /hero-product[\s\S]*img\/imagenDrop1\.jpg/);
assert.equal((homepage.match(/data-hero-slide(?:\s|>)/g) || []).length, 17, 'carrusel destaca todos los productos');
for (const control of ['data-hero-previous','data-hero-next','data-hero-toggle','data-hero-count']) assert.ok(homepage.includes(control), `carrusel incluye control ${control}`);
assert.ok(!homepage.includes('class="art-card"') && !homepage.includes('class="art-sun"'), 'se elimina la ilustracion hero anterior');
assert.equal((homepage.match(/data-category="(?:cocina|bano|limpieza|tecnologia|hogar)"/g) || []).length, 17, 'todas las tarjetas tienen categoria filtrable');
assert.match(fs.readFileSync(path.join(root,'js/main.js'),'utf8'), /card\.hidden = !show/);
assert.ok(homepage.includes('no crean pedidos'), 'WhatsApp does not create orders automatically');
assert.ok(!/(horarios internos|generaci[oó]n de gu[ií]as|instrucciones log[ií]sticas|internal_note)/i.test(homepage), 'la portada no expone notas internas ni logística');
for (const p of published) { const cardStart=homepage.indexOf(`data-product-id="${p.id}"`); const card=homepage.slice(cardStart,homepage.indexOf('</article>',cardStart)); assert.ok(card.includes(`data-whatsapp-product="${p.name}"`), `${p.dropiId} tiene boton de WhatsApp`); }
for (const p of published) assert.ok(sitemap.includes(`/productos/${p.slug}.html`), `sitemap contiene ${p.slug}`);
for (const p of drafts) {
  assert.ok(!sitemap.includes(p.slug), `sitemap omite borrador ${p.dropiId}`);
  assert.ok(homepage.includes(`data-product-id="${p.id}"`), `portada muestra borrador ${p.dropiId}`);
  if (p.proposalStatus === 'propuesto') assert.ok(homepage.includes(new Intl.NumberFormat('es-CO').format(p.proposedSalePriceCop)), 'proposed price appears'); else assert.ok(/variante/i.test(homepage), 'variant pending appears');
  assert.ok(homepage.includes(p.cardDescription), `${p.dropiId} muestra la descripcion fuente en la portada`);
  for (const feature of p.draftFeatures) assert.ok(homepage.includes(feature), `${p.dropiId} muestra caracteristica: ${feature}`);
  if (p.draftMeasures) assert.ok(homepage.includes(p.draftMeasures), `${p.dropiId} muestra medidas originales`); else assert.ok(homepage.includes('Medidas:</strong> Pendientes de confirmar.'), `${p.dropiId} no inventa medidas`);
  if (p.draftPackageContents) assert.ok(homepage.includes(p.draftPackageContents), `${p.dropiId} muestra contenido recibido`);
  for (const option of p.draftVariants?.options || []) assert.ok(homepage.includes(option), `${p.dropiId} muestra opcion ${option}`);
  for (const offer of p.draftOffers || []) { if (offer.priceCop) assert.ok(homepage.includes(new Intl.NumberFormat('es-CO').format(offer.priceCop)), `${p.dropiId} muestra el precio de ${offer.name}`); else assert.ok(homepage.includes(offer.priceText), `${p.dropiId} conserva el precio desde indicado`); }
  const cardStart=homepage.indexOf(`data-product-id="${p.id}"`); const cardEnd=homepage.indexOf('</article>',cardStart); const card=homepage.slice(cardStart,cardEnd); assert.ok(card.includes(`data-whatsapp-product="${p.name}"`), `${p.dropiId} tiene consulta por WhatsApp`); assert.ok(card.includes('Pedir por WhatsApp'), `${p.dropiId} muestra boton de pedido`); assert.ok(card.includes('data-whatsapp-note='), `${p.dropiId} tiene aviso de WhatsApp`);
  assert.ok(!fs.existsSync(path.join(root, `productos/${p.slug}.html`)), `no se genera ficha sin precio final para ${p.dropiId}`);
}
assert.ok(!sitemap.includes('set-utensilios'), 'set no agregado');
const gridCss = fs.readFileSync(path.join(root, 'css/styles.css'), 'utf8');
assert.match(gridCss, /catalog-grid\{grid-template-columns:repeat\(3,minmax\(0,1fr\)\)\}/);
assert.match(gridCss, /@media\(max-width:980px\)\{\.catalog-grid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)\}\}/);
assert.match(gridCss, /@media\(max-width:760px\)\{\.catalog-grid\{grid-template-columns:1fr\}\}/);
assert.ok(!fs.readFileSync(path.join(root, 'js/main.js'), 'utf8').includes('.submit('), 'no se envían pedidos automáticamente');
const preview = fs.readFileSync(path.join(root,'admin/vista-previa-dropi.html'),'utf8');
assert.match(preview, /noindex, nofollow/);
assert.ok(!/wa\.me|whatsapp-product|href="#"/.test(preview), 'la vista previa no permite iniciar pedidos');
assert.match(fs.readFileSync(path.join(root,'js/dropi-preview.js'),'utf8'), /Precio de venta propuesto/);
assert.ok(!/costo_dropi_cop|ganancia_antes_comisiones|envio_estimado_cop/.test(fs.readFileSync(path.join(root,'js/dropi-preview.js'),'utf8')), 'la vista no recibe ni muestra costos o márgenes');
const previewScript = fs.readFileSync(path.join(root,'js/dropi-preview.js'),'utf8');
const staticHomepage = fs.readFileSync(path.join(root,'index.html'),'utf8');
assert.ok(!/costo_dropi_cop|precio_base_provisional_cop|dropi-preview\.js/.test(staticHomepage), 'la portada generada no incluye datos ni scripts de vista previa');
assert.ok(!fs.readFileSync(path.join(root,'scripts/serve-local.js'),'utf8').includes("html.replace('</head>'"), 'el servidor no vuelve a inyectar tarjetas duplicadas');
const outputsA = buildOutputs(root), outputsB = buildOutputs(root);
assert.deepEqual([...outputsA], [...outputsB], 'dos generaciones producen exactamente las mismas salidas');
assert.equal([...outputsA.keys()].length, 8, 'solo gestiona portada, seis fichas y sitemap');

// Prueba de flujo automático de filas con 4 y 5 fichas (sin alterar el proyecto real).
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'casa-clara-grid-'));
try {
  fs.mkdirSync(path.join(temp, 'catalog'), { recursive: true }); fs.mkdirSync(path.join(temp, 'templates'), { recursive: true }); fs.mkdirSync(path.join(temp, 'productos'), { recursive: true });
  fs.writeFileSync(path.join(temp, 'templates/index.html'), '<html><div class="catalog-grid">{{PRODUCT_CARDS}}</div></html>');
  fs.writeFileSync(path.join(temp, 'templates/product.html'), '<html>{{SEO_TITLE}} {{NAME}} {{PRICE}} {{WHATSAPP_NAME}} {{SEO_DESCRIPTION}} {{CANONICAL}} {{CATEGORY}} {{GALLERY_CLASS}} {{GALLERY_ATTRIBUTES}} {{GALLERY_CONTENT}} {{DESCRIPTION_BLOCK}} {{FEATURES_BLOCK}} {{NOTICES_BLOCK}} {{VARIANTS_BLOCK}} {{SOCIAL_IMAGE}} {{TWITTER_CARD}} {{TWITTER_IMAGE}} {{VARIANT_ATTRIBUTE}}</html>');
  fs.writeFileSync(path.join(temp, 'catalog/products.json'), JSON.stringify({products:published.slice(0,4).map((p) => ({...p, images:[]}))}));
  assert.equal((buildOutputs(temp).get('index.html').match(/class="catalog-card"/g)||[]).length,4,'producto 4 pasa a una nueva fila automática');
  fs.writeFileSync(path.join(temp, 'catalog/products.json'), JSON.stringify({products:published.slice(0,5).map((p) => ({...p, images:[]}))}));
  assert.equal((buildOutputs(temp).get('index.html').match(/class="catalog-card"/g)||[]).length,5,'producto 5 ocupa la segunda fila sin salto manual');
  const four = buildOutputs(temp); writeOutputs(four,temp);
  const generatedIndex = path.join(temp,'index.html');
  const firstWrite = fs.readFileSync(generatedIndex,'utf8');
  fs.writeFileSync(path.join(temp,'manual.txt'),'cambio manual');
  writeOutputs(four,temp);
  assert.equal(fs.readFileSync(generatedIndex,'utf8'),firstWrite,'repetir escritura no altera salidas idénticas');
  assert.equal(fs.readFileSync(path.join(temp,'manual.txt'),'utf8'),'cambio manual','el generador conserva archivos manuales fuera de la lista de salida');
  fs.writeFileSync(generatedIndex,'archivo editado sin marcador');
  assert.throws(() => writeOutputs(four,temp),/Se rechaza sobrescribir archivo no generado/,'no sobrescribe una salida sin marcador');
  const remote = {...published[0], images:[{src:'https://images.example.test/item.jpg',alt:'Imagen de prueba'}]};
  fs.writeFileSync(path.join(temp, 'catalog/products.json'), JSON.stringify({products:[remote]}));
  const remotePage = buildOutputs(temp).get('productos/' + remote.slug + '.html');
  assert.ok(remotePage.includes('src="https://images.example.test/item.jpg"'), 'preserva la URL remota sin prefijos inventados');
  assert.ok(remotePage.includes('loading="lazy" data-image-fallback'), 'imagen remota tiene lazy loading y fallback');
} finally { fs.rmSync(temp, { recursive:true, force:true }); }

const percent = calculateMinimumPrice({supplierCost:10, shippingCost:2, otherCost:0, desiredProfit:5, commissionRate:.05, fixedFee:0});
assert.ok(percent.estimatedProfit >= 5 && percent.suggestedMinimum % 1000 === 900, 'comisión porcentual y redondeo ascendente mantienen ganancia mínima');
const fixed = calculateMinimumPrice({supplierCost:10, shippingCost:2, desiredProfit:5, commissionRate:0, fixedFee:2});
assert.ok(fixed.estimatedProfit >= 5, 'comisión fija se incluye en la fórmula');
assert.throws(() => calculateMinimumPrice({supplierCost:1,desiredProfit:1,commissionRate:1}), /menor que 100/);
console.log('OK: 6 productos publicados intactos, 11 borradores seguros, precios, imágenes, WhatsApp, sitemap, cuadrícula 4/5, importación idempotente y fórmulas.');

assert.ok(!fs.readFileSync(path.join(root,'scripts/serve-local.js'),'utf8').includes('dropi-preview.js'), 'server does not inject duplicate cards');

assert.match(fs.readFileSync(path.join(root,'js/main.js'),'utf8'), /data-whatsapp-variant-select/);
