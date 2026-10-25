/* Costos introducidos por la persona usuaria solo se procesan en el navegador. */
(function (root) {
  'use strict';
  function calculateMinimumPrice({ supplierCost, shippingCost = 0, otherCost = 0, desiredProfit, commissionRate = 0, fixedFee = 0 }) {
    const values = [supplierCost, shippingCost, otherCost, desiredProfit, commissionRate, fixedFee].map(Number);
    if (values.some((n) => !Number.isFinite(n) || n < 0)) throw new Error('Usa valores numéricos iguales o mayores que cero.');
    const [supplier, shipping, other, profit, rate, fixed] = values;
    if (rate >= 1) throw new Error('La comisión porcentual debe ser menor que 100%.');
    const raw = (supplier + shipping + other + profit + fixed) / (1 - rate);
    // Redondea hacia arriba al siguiente precio terminado en 900 COP.
    let rounded = Math.ceil((raw - 900) / 1000) * 1000 + 900;
    while (rounded * (1 - rate) - fixed - supplier - shipping - other < profit) rounded += 1000;
    return { rawMinimum: Math.ceil(raw), suggestedMinimum: rounded, estimatedProfit: Math.floor(rounded * (1 - rate) - fixed - supplier - shipping - other) };
  }
  const api = { calculateMinimumPrice };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.CasaClaraPricing = api;
})(typeof window !== 'undefined' ? window : globalThis);
