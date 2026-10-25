(() => {
  'use strict';
  const $ = (selector) => document.querySelector(selector);
  const format = (value) => '$' + new Intl.NumberFormat('es-CO').format(value) + ' COP';
  const storageKey = 'casa-clara-pricing-private-v1';
  let products = [];
  let result = null;
  const form = $('#calculator-form');
  const fields = [...form.querySelectorAll('input')];
  const readSaved = () => { try { return JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch { return {}; } };
  const save = (data) => localStorage.setItem(storageKey, JSON.stringify(data));
  const selectedProduct = () => products.find((p) => p.id === $('#product').value);

  fetch('../catalog/products.json').then((response) => {
    if (!response.ok) throw new Error('No se pudo leer el catálogo local.');
    return response.json();
  }).then((data) => {
    products = data.products.filter((p) => p.status === 'published');
    $('#product').innerHTML = products.map((p) => `<option value="${p.id}">${p.name}</option>`).join('');
    loadProduct();
  }).catch((error) => { $('#save-status').textContent = error.message; });

  function loadProduct() {
    const product = selectedProduct();
    if (!product) return;
    $('#published-price').textContent = format(product.salePriceCop);
    const saved = readSaved()[product.id] || {};
    fields.forEach((input) => { input.value = saved[input.name] ?? ''; });
    $('#result').hidden = true;
    result = null;
  }
  $('#product').addEventListener('change', loadProduct);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    try {
      const data = Object.fromEntries(new FormData(form));
      data.commissionRate = Number(data.commissionRate || 0) / 100;
      data.shippingCost = Number(data.shippingCost || 0);
      data.otherCost = Number(data.otherCost || 0);
      data.fixedFee = Number(data.fixedFee || 0);
      result = window.CasaClaraPricing.calculateMinimumPrice(data);
      $('#minimum-price').textContent = format(result.suggestedMinimum);
      $('#estimated-profit').textContent = format(result.estimatedProfit);
      $('#result').hidden = false;
      const all = readSaved();
      all[selectedProduct().id] = Object.fromEntries(fields.map((field) => [field.name, field.value]));
      save(all);
    } catch (error) { $('#save-status').textContent = error.message; }
  });
  $('#save-candidate').addEventListener('click', () => {
    if (!result) return;
    const all = readSaved();
    all[selectedProduct().id] = { ...(all[selectedProduct().id] || {}), candidatePriceCop: result.suggestedMinimum };
    save(all);
    $('#save-status').textContent = 'Precio candidato guardado solo en este navegador; no se aplicó al catálogo.';
  });
  $('#export-candidates').addEventListener('click', () => {
    const all = readSaved();
    const candidates = products.filter((p) => all[p.id]?.candidatePriceCop).map((p) => ({ id: p.id, dropiId: p.dropiId, name: p.name, candidateSalePriceCop: all[p.id].candidatePriceCop }));
    const blob = new Blob([JSON.stringify({ candidates }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = Object.assign(document.createElement('a'), { href: url, download: 'casa-clara-precios-candidatos.json' });
    link.click(); URL.revokeObjectURL(url);
    $('#save-status').textContent = 'Archivo exportado: contiene únicamente producto y precio candidato.';
  });
})();
