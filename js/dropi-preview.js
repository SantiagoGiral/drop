(() => {
  'use strict';
  const grid = document.getElementById('dropi-preview-grid');
  const status = document.getElementById('preview-status');
  if (!grid) return;

  const html = (value) => String(value).replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const formatCop = (value) => '$' + new Intl.NumberFormat('es-CO').format(value) + ' COP';
  const showFallback = (event) => {
    const image = event.target;
    if (!(image instanceof HTMLImageElement) || !image.matches('[data-image-fallback]') || image.dataset.fallbackShown) return;
    image.dataset.fallbackShown = 'true';
    image.hidden = true;
    const fallback = document.createElement('span');
    fallback.className = 'image-fallback';
    fallback.setAttribute('role', 'img');
    fallback.textContent = 'Imagen no disponible';
    image.parentElement?.append(fallback);
  };
  document.addEventListener('error', showFallback, true);

  fetch('../catalog/products.json').then((response) => {
    if (!response.ok) throw new Error('No se pudo cargar el catÃ¡logo local.');
    return response.json();
  }).then((catalog) => {
    const drafts = catalog.products.filter((product) => product.status === 'draft');
    grid.innerHTML = drafts.map((product) => {
      const image = product.images?.[0];
      const rawSrc = image?.previewSrc || image?.src || '';
      const src = rawSrc && !/^https:\/\//i.test(rawSrc) ? '../' + rawSrc : rawSrc;
      const price = product.proposalStatus === 'propuesto' && Number.isFinite(product.proposedSalePriceCop)
        ? '<div class="preview-price"><span>Precio de venta propuesto</span><strong>' + html(formatCop(product.proposedSalePriceCop)) + '</strong><span class="price-status">Propuesta provisional</span></div>'
        : '<div class="preview-price"><span>Precio de venta</span><strong>Por definir segÃºn variante</strong><span class="price-status">Pendiente de confirmar</span></div>';
      const media = src
        ? '<div class="catalog-card-media"><img src="' + html(src) + '" alt="' + html(image.alt) + '" loading="lazy" data-image-fallback></div>'
        : '<div class="catalog-card-media"><div class="image-pending" role="img" aria-label="FotografÃ­a pendiente">FotografÃ­a pendiente</div></div>';
      return '<article class="catalog-card preview-card" data-dropi-id="' + html(product.dropiId) + '">' + media +
        '<div class="catalog-card-info"><p class="product-kicker">' + html(product.category) + '</p><h2>' + html(product.name) + '</h2>' + price +
        '<span class="button preview-button" aria-disabled="true">Borrador Â· sin pedidos</span></div></article>';
    }).join('');
    if (status) status.textContent = drafts.length + ' borradores cargados desde archivos locales.';
  }).catch((error) => { if (status) status.textContent = error.message; });
})();
