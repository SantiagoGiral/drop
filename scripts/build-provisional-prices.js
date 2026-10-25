#!/usr/bin/env node
// Calculates a private review table from a supplied Dropi JSON. Output stays in OS temp.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const sourcePath = process.argv[2];
if (!sourcePath) {
  console.error('Uso: node scripts/build-provisional-prices.js <casa_clara_precios_envio_20k.json>');
  process.exit(2);
}

function roundUpTo900(value) {
  let proposed = Math.floor(value / 1000) * 1000 + 900;
  if (proposed < value) proposed += 1000;
  return proposed;
}

function csvCell(value) {
  const text = value === null || value === undefined ? '' : String(value);
  return '"' + text.replace(/"/g, '""') + '"';
}

try {
  const input = JSON.parse(fs.readFileSync(path.resolve(sourcePath), 'utf8').replace(/^\uFEFF/, ''));
  if (!Array.isArray(input) || input.length !== 12) throw new Error('Se esperaban 12 filas: 11 borradores y el ID pendiente.');
  const ids = new Set();
  const table = input.map((row) => {
    const id = String(row.id_dropi || '');
    if (!id || ids.has(id)) throw new Error('ID Dropi vacío o duplicado: ' + id);
    ids.add(id);
    const cost = row.costo_dropi_cop;
    const shipping = row.envio_estimado_cop;
    const target = row.ganancia_objetivo_cop;
    const missing = id === '2118677';
    if (missing) {
      if (cost !== null || row.precio_base_simulado_cop !== null) throw new Error('2118677 debe quedar sin costo ni precio.');
      return {
        id_dropi:id, producto:row.producto, costo_dropi_cop:null, envio_estimado_cop:null,
        ganancia_objetivo_cop:null, precio_base_simulado_cop:null, precio_venta_propuesto_cop:null,
        ganancia_antes_comisiones_publicidad_cop:null, estado_precio:'pendiente_identificar', pendiente:row.pendiente
      };
    }
    if (![cost,shipping,target,row.precio_base_simulado_cop].every(Number.isFinite)) throw new Error('Valores incompletos para ' + id);
    if (shipping !== 20000 || target !== 15000 || row.precio_base_simulado_cop !== cost + shipping + target) throw new Error('La simulación fuente no coincide con costo + envío + objetivo para ' + id);
    const variantDependent = /variante|variantes|tamaño|color/i.test(String(row.pendiente));
    const proposed = variantDependent ? null : roundUpTo900(row.precio_base_simulado_cop);
    return {
      id_dropi:id,
      producto:row.producto,
      costo_dropi_cop:cost,
      envio_estimado_cop:shipping,
      ganancia_objetivo_cop:target,
      precio_base_simulado_cop:row.precio_base_simulado_cop,
      precio_venta_propuesto_cop:proposed,
      ganancia_antes_comisiones_publicidad_cop:proposed === null ? null : proposed - cost - shipping,
      estado_precio:variantDependent ? 'pendiente_variante' : 'propuesto',
      pendiente:row.pendiente,
      nota:row.nota
    };
  });
  if (ids.size !== 12 || !ids.has('2118677')) throw new Error('Falta el registro pendiente 2118677.');
  const directory = os.tmpdir();
  const jsonPath = path.join(directory, 'casa_clara_tabla_precios_envio_20k.json');
  const csvPath = path.join(directory, 'casa_clara_tabla_precios_envio_20k.csv');
  const columns = ['id_dropi','producto','costo_dropi_cop','envio_estimado_cop','ganancia_objetivo_cop','precio_base_simulado_cop','precio_venta_propuesto_cop','ganancia_antes_comisiones_publicidad_cop','estado_precio','pendiente','nota'];
  const csv = [columns.map(csvCell).join(','), ...table.map((row) => columns.map((key) => csvCell(row[key])).join(','))].join('\r\n') + '\r\n';
  fs.writeFileSync(jsonPath, JSON.stringify(table,null,2) + '\n', 'utf8');
  fs.writeFileSync(csvPath, csv, 'utf8');
  console.log('Tabla interna guardada fuera del proyecto:');
  console.log(jsonPath);
  console.log(csvPath);
  console.log('Precios propuestos: ' + table.filter((row) => row.estado_precio === 'propuesto').length + '; pendientes por variante: ' + table.filter((row) => row.estado_precio === 'pendiente_variante').length + '; ID sin identificar: ' + table.filter((row) => row.estado_precio === 'pendiente_identificar').length + '.');
} catch (error) {
  console.error('No se generó la tabla de precios: ' + error.message);
  process.exitCode = 1;
}
