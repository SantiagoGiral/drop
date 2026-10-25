#!/usr/bin/env node
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { buildOutputs, writeOutputs, MARKER } = require('./build-catalog');
const root = path.resolve(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'catalog/products.json'), 'utf8'));
const internalTableFile = path.join(os.tmpdir(), 'casa_clara_tabla_precios_envio_20k.json');
const internalTable = fs.existsSync(internalTableFile) ? JSON.parse(fs.readFileSync(internalTableFile, 'utf8')) : null;
const expected = new Map([['924885',59900],['1899391',114900],['1976352',74900],['700560',79900],['2241912',79900],['2146043',74900]]);
const published = data.products.filter((p) => p.status === 'published');
const drafts = data.products.filter((p) => p.status === 'draft');
const shoeDraft = drafts.find((p) => p.dropiId === '1829387');
assert.equal(published.length, 6, 'se conservan seis productos publicados');
assert.deepEqual(new Map(published.map((p) => [p.dropiId, p.salePriceCop])), expected, 'precios actuales sin cambios');
assert.equal(drafts.length, 11, 'se importaron los 11 productos encontrados como borradores');
assert.deepEqual(shoeDraft.draftOffers.map((offer) => offer.priceCop), [111000,111000], 'ambos colores del zapatero conservan solo el precio más alto elegido');
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
assert.ok(!fs.existsSync(path.join(root,'admin/calculadora.html')) && !fs.existsSync(path.join(root,'admin/vista-previa-dropi.html')), 'se retiraron las páginas de administración');
assert.ok(!fs.existsSync(path.join(root,'js/dropi-preview.js')), 'se retiró el script de vista previa');
assert.ok(!fs.existsSync(path.join(root,'css/dropi-preview.css')), 'se retiraron los estilos de vista previa');
assert.ok(!fs.existsSync(path.join(root,'js/calculator.js')) && !fs.existsSync(path.join(root,'js/pricing.js')) && !fs.existsSync(path.join(root,'css/calculator.css')), 'se retiró la interfaz y lógica de calculadora del proyecto');
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
  assert.ok(page.includes('"@type":"Product"') && page.includes('"@type":"Offer"'), `${p.name} tiene Schema.org Product/Offer`);
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
const publicFiles = ['index.html','sitemap.xml', ...data.products.map((p) => `productos/${p.slug}.html`)];
for (const filename of publicFiles) {
  const content = fs.readFileSync(path.join(root, filename), 'utf8');
  assert.ok(!/(supplierCost|providerCost|shippingCost|commissionRate|fixedFee|targetProfit|costo del proveedor|flete estimado|comisión porcentual)/i.test(content), `sin datos/campos de calculadora en ${filename}`);
}
const seoTitles = [];
for (const product of data.products) {
  const page = fs.readFileSync(path.join(root, `productos/${product.slug}.html`), 'utf8');
  const title = page.match(/<title>([^<]+)<\/title>/)?.[1];
  assert.ok(title, `${product.dropiId} tiene título SEO`);
  seoTitles.push(title);
  assert.equal((page.match(/<h1\b/g) || []).length, 1, `${product.dropiId} tiene un H1`);
  assert.match(page, /<link rel="canonical" href="https:\/\/casaclara\.com\.co\/productos\//, `${product.dropiId} tiene canonical absoluta`);
}
assert.equal(new Set(seoTitles).size, seoTitles.length, 'no hay títulos SEO duplicados');
for (const filename of ['index.html', ...data.products.map((p) => `productos/${p.slug}.html`)]) {
  const html = fs.readFileSync(path.join(root, filename), 'utf8');
  for (const match of html.matchAll(/<(?:img|source)\b[^>]*>/g)) assert.match(match[0], /\balt="[^"]*"/, `${filename}: cada imagen tiene alt`);
  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const ref = match[1];
    if (/^(?:#|https?:|mailto:|tel:|data:|javascript:)/i.test(ref)) continue;
    const cleanRef = decodeURIComponent(ref.split(/[?#]/, 1)[0]);
    const target = path.resolve(root, path.dirname(filename), cleanRef);
    assert.ok(fs.existsSync(target), `${filename} apunta a una ruta local existente: ${ref}`);
  }
}
const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
const homepage = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert.equal((sitemap.match(/<loc>/g) || []).length, 18, 'sitemap incluye portada y 17 fichas enlazadas');
assert.equal((homepage.match(/class="catalog-card(?: preview-card)?"/g) || []).length, 17, 'portada muestra seis publicados y once borradores');
assert.equal((homepage.match(/data-catalog-filter=/g) || []).length, 6, 'portada ofrece filtro general y cinco categorias');
assert.match(homepage, /hero-product[\s\S]*img\/(?:optimized\/)?imagenDrop1\.(?:jpg|webp)/);
assert.equal((fs.readFileSync(path.join(root,'templates/index.html'),'utf8').match(/data-hero-title/g) || []).length, 1, 'el pie del carrusel no duplica el título');
assert.equal((homepage.match(/data-hero-slide(?:\s|>)/g) || []).length, 17, 'carrusel destaca todos los productos');
for (const control of ['data-hero-previous','data-hero-next','data-hero-toggle','data-hero-count']) assert.ok(homepage.includes(control), `carrusel incluye control ${control}`);
assert.ok(homepage.includes('data-hero-product-id="escurridor-platos"') && homepage.includes('id="product-escurridor-platos"'), 'carrusel enlaza a la tarjeta del producto activo');
const mainScript = fs.readFileSync(path.join(root,'js/main.js'),'utf8');
assert.match(mainScript, /const caption = heroCarousel\.querySelector\('\.hero-product-caption'\)/, 'el carrusel limita las actualizaciones al pie del producto');
for (const field of ['data-hero-category','data-hero-title','data-hero-price-label','data-hero-price']) assert.ok(mainScript.includes(`caption?.querySelector('[${field}]')`), `el carrusel no reemplaza la diapositiva al actualizar ${field}`);
assert.ok(!homepage.includes('class="art-card"') && !homepage.includes('class="art-sun"'), 'se elimina la ilustracion hero anterior');
assert.equal((homepage.match(/data-category="(?:cocina|bano|limpieza|tecnologia|hogar)"/g) || []).length, 17, 'todas las tarjetas tienen categoria filtrable');
const shoeCardStart = homepage.indexOf('data-product-id="dropi-1829387"');
const shoeCard = homepage.slice(shoeCardStart, homepage.indexOf('</article>', shoeCardStart));
assert.equal((shoeCard.match(/data-price-text="\$111\.000 COP"/g) || []).length, 2, 'ambos colores del zapatero usan el precio más alto en WhatsApp');
assert.ok(!shoeCard.includes('$109.900'), 'el catálogo ya no muestra el precio menor del zapatero');
assert.match(fs.readFileSync(path.join(root,'js/main.js'),'utf8'), /card\.hidden = !show/);
assert.ok(homepage.includes('no crea pedidos automáticamente'), 'WhatsApp does not create orders automatically');
assert.ok(!/(horarios internos|generaci[oó]n de gu[ií]as|instrucciones log[ií]sticas|internal_note)/i.test(homepage), 'la portada no expone notas internas ni logística');
for (const p of published) { const cardStart=homepage.indexOf(`data-product-id="${p.id}"`); const card=homepage.slice(cardStart,homepage.indexOf('</article>',cardStart)); assert.ok(card.includes(`data-whatsapp-product="${p.name}"`), `${p.dropiId} tiene boton de WhatsApp`); }
for (const p of published) assert.ok(sitemap.includes(`/productos/${p.slug}.html`), `sitemap contiene ${p.slug}`);
for (const p of drafts) {
  assert.ok(sitemap.includes(`/productos/${p.slug}.html`), `sitemap incluye la ficha enlazada de ${p.dropiId}`);
  assert.ok(homepage.includes(`data-product-id="${p.id}"`), `portada muestra borrador ${p.dropiId}`);
  const draftPage = fs.readFileSync(path.join(root, `productos/${p.slug}.html`), 'utf8');
  assert.ok(draftPage.includes(`href="https://casaclara.com.co/productos/${p.slug}.html"`), `${p.dropiId} tiene canonical propia`);
  assert.ok(draftPage.includes('"@type":"Product"') && draftPage.includes('"@type":"Offer"'), `${p.dropiId} tiene Schema.org Product/Offer`);
  const schemaText = draftPage.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
  const schema = JSON.parse(schemaText);
  const expectedPrice = (p.draftOffers || []).map((offer) => offer.priceCop).filter(Number.isInteger).length
    ? Math.max(...p.draftOffers.map((offer) => offer.priceCop).filter(Number.isInteger))
    : p.draftStartingPriceCop || p.proposedSalePriceCop;
  assert.equal(schema.offers.price, String(expectedPrice), `${p.dropiId} estructura el precio mostrado`);
  assert.equal(schema.offers.priceCurrency, 'COP', `${p.dropiId} usa moneda COP`);
  assert.ok(!Object.hasOwn(schema.offers, 'availability'), `${p.dropiId} no inventa disponibilidad`);
  assert.match(draftPage, /width="\d+" height="\d+"/, `${p.dropiId} declara dimensiones de imagen`);
  assert.ok(draftPage.includes(`data-whatsapp-product="${p.name}"`), `${p.dropiId} tiene CTA WhatsApp en su ficha`);
  assert.ok(draftPage.includes('href="../index.html#productos"'), `${p.dropiId} puede volver al catálogo`);
  assert.ok(!draftPage.includes('(borrador)'), `${p.dropiId} tiene título SEO listo para la ficha`);
  if (p.proposalStatus === 'propuesto') assert.ok(homepage.includes(new Intl.NumberFormat('es-CO').format(p.proposedSalePriceCop)), 'proposed price appears');
  else if ((p.draftOffers || []).some((offer) => Number.isInteger(offer.priceCop))) assert.ok(homepage.includes(new Intl.NumberFormat('es-CO').format(Math.max(...p.draftOffers.map((offer) => offer.priceCop).filter(Number.isInteger)))), 'variant price uses the highest option');
  else if (p.draftStartingPriceCop) assert.ok(homepage.includes(`Desde $${new Intl.NumberFormat('es-CO').format(p.draftStartingPriceCop)}`), 'starting price is preserved');
  else assert.ok(/variante/i.test(homepage), 'variant pending appears');
  assert.ok(homepage.includes(p.cardDescription), `${p.dropiId} muestra la descripcion fuente en la portada`);
  for (const feature of p.draftFeatures) assert.ok(homepage.includes(feature), `${p.dropiId} muestra caracteristica: ${feature}`);
  if (p.draftMeasures) assert.ok(homepage.includes(p.draftMeasures), `${p.dropiId} muestra medidas originales`); else assert.ok(homepage.includes('Medidas:</strong> Pendientes de confirmar.'), `${p.dropiId} no inventa medidas`);
  if (p.draftPackageContents) assert.ok(homepage.includes(p.draftPackageContents), `${p.dropiId} muestra contenido recibido`);
  for (const option of p.draftVariants?.options || []) assert.ok(homepage.includes(option), `${p.dropiId} muestra opcion ${option}`);
  const exactOfferPrices = (p.draftOffers || []).map((offer) => offer.priceCop).filter(Number.isInteger);
  if (exactOfferPrices.length) {
    const highest = Math.max(...exactOfferPrices);
    assert.ok(homepage.includes(new Intl.NumberFormat('es-CO').format(highest)), `${p.dropiId} muestra el precio más alto de sus variantes`);
    if (Math.min(...exactOfferPrices) < highest) assert.ok(!homepage.includes(new Intl.NumberFormat('es-CO').format(Math.min(...exactOfferPrices))), `${p.dropiId} ya no muestra un precio menor alternativo`);
  }
  for (const offer of p.draftOffers || []) if (offer.priceText) assert.ok(homepage.includes(offer.priceText), `${p.dropiId} conserva el precio desde indicado`);
  const cardStart=homepage.indexOf(`data-product-id="${p.id}"`); const cardEnd=homepage.indexOf('</article>',cardStart); const card=homepage.slice(cardStart,cardEnd); assert.ok(card.includes(`data-whatsapp-product="${p.name}"`), `${p.dropiId} tiene consulta por WhatsApp`); assert.ok(card.includes('Pedir por WhatsApp'), `${p.dropiId} muestra boton de pedido`); assert.ok(card.includes('data-whatsapp-note='), `${p.dropiId} tiene aviso de WhatsApp`);
  assert.ok(card.includes(`href="productos/${p.slug}.html"`) && card.includes('>Ver detalles'), `${p.dropiId} abre su ficha desde la tarjeta`);
}
assert.ok(!sitemap.includes('set-utensilios'), 'set no agregado');
const gridCss = fs.readFileSync(path.join(root, 'css/styles.css'), 'utf8');
const draftCss = fs.readFileSync(path.join(root, 'css/draft-catalog.css'), 'utf8');
assert.match(draftCss, /\.catalog-card\[hidden\]\{display:none!important\}/, 'los filtros ocultan visualmente las tarjetas fuera de la categoría');
assert.match(gridCss, /catalog-grid\{grid-template-columns:repeat\(3,minmax\(0,1fr\)\)\}/);
assert.match(gridCss, /@media\(max-width:980px\)\{\.catalog-grid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)\}\}/);
assert.match(gridCss, /@media\(max-width:760px\)\{\.catalog-grid\{grid-template-columns:1fr\}\}/);
assert.ok(!fs.readFileSync(path.join(root, 'js/main.js'), 'utf8').includes('.submit('), 'no se envían pedidos automáticamente');
const staticHomepage = fs.readFileSync(path.join(root,'index.html'),'utf8');
assert.ok(!/costo_dropi_cop|precio_base_provisional_cop|dropi-preview\.js|Propuesta provisional|Precio de venta propuesto|Precio propuesto|Precio sugerido/.test(staticHomepage), 'la portada no incluye datos internos ni etiquetas de propuesta provisional');
assert.ok(!fs.readFileSync(path.join(root,'scripts/serve-local.js'),'utf8').includes("html.replace('</head>'"), 'el servidor no vuelve a inyectar tarjetas duplicadas');
const outputsA = buildOutputs(root), outputsB = buildOutputs(root);
assert.deepEqual([...outputsA], [...outputsB], 'dos generaciones producen exactamente las mismas salidas');
assert.equal([...outputsA.keys()].length, 19, 'el generador gestiona portada, 17 fichas y sitemap');

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

console.log('OK: 6 productos publicados intactos, 11 borradores, precios, imágenes, WhatsApp, sitemap, cuadrícula 4/5 e importación idempotente.');

assert.ok(!fs.readFileSync(path.join(root,'scripts/serve-local.js'),'utf8').includes('dropi-preview.js'), 'server does not inject duplicate cards');

assert.match(fs.readFileSync(path.join(root,'js/main.js'),'utf8'), /data-whatsapp-variant-select/);
assert.match(mainScript, /button\.target = "_blank"/, 'WhatsApp se abre en una pestaña aparte');
assert.match(homepage, /js\/main\.js\?v=20261024-2/, 'la portada fuerza la carga de la versión actualizada del JavaScript');
assert.match(homepage, /js\/config\.js\?v=20261024-2/, 'la portada fuerza la carga de la configuración actualizada de WhatsApp');
