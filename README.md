# Casa Clara

Tienda estática hecha con HTML, CSS y JavaScript, sin backend, base de datos, pasarela de pago, dependencias ni servicios pagos. La portada conserva 17 tarjetas: los seis productos originales y los 11 productos Dropi añadidos. Las fichas independientes y el sitemap siguen incluyendo solo los seis productos originales. El set de utensilios continúa fuera del catálogo.

## Abrir y probar localmente

Se necesita Node.js instalado; no se instalan paquetes.

1. Abre PowerShell en la carpeta `Drop`.
2. Ejecuta `node scripts/serve-local.js`.
3. Abre `http://127.0.0.1:8000/` en el navegador.
4. Para detener el servidor, vuelve a PowerShell y pulsa `Ctrl+C`.

El servidor escucha solo en `127.0.0.1`, es decir, en este computador. Si el comando `node` no está disponible, usa una extensión Live Server ya instalada en el editor; no se descarga ninguna dependencia del proyecto.

Pruebas automatizadas: `node scripts/test-catalog.js`. Para una comprobación rápida de sintaxis: `node --check scripts/build-catalog.js`, `node --check scripts/test-catalog.js`, `node --check scripts/serve-local.js` y `node --check js/main.js`.

## Regenerar el catálogo

Desde la carpeta `Drop`, ejecuta `node scripts/build-catalog.js`. Puedes ejecutarlo varias veces: la salida es determinista, no añade tarjetas duplicadas y solo escribe diferencias. El generador falla si una salida existente perdió su marcador de generación. No elimina páginas, imágenes ni archivos que ya no estén referenciados.

### Archivos editables a mano

- `catalog/products.json`: fuente de datos públicos de productos. Incluye solo datos que pueden publicarse, como precio de venta, texto, características confirmadas, imágenes y SEO. No agregues costos del proveedor, fletes, comisiones ni márgenes aquí.
- `templates/index.html` y `templates/product.html`: estructura manual usada como plantilla.
- `js/config.js`: número WhatsApp existente; el generador no lo lee ni lo modifica.
- `css/styles.css`, `js/main.js`, `favicon.svg`, `robots.txt` e imágenes: archivos manuales y funcionalidad/identidad de la tienda.

### Archivos generados automáticamente

- `index.html` (portada y tarjetas).
- `productos/<slug>.html` para cada producto con estado `published` en el JSON.
- `sitemap.xml` (solo portada y fichas publicadas).

No edites manualmente esos tres tipos de salida: los archivos llevan un comentario marcador y el generador los administra. Las ediciones manuales deben hacerse en las plantillas o `catalog/products.json`. Si un producto deja de publicarse, el generador lo quita del catálogo y sitemap, pero no borra su antigua ficha; revísala y archívala manualmente si corresponde.

## WhatsApp y pedidos

El número está en `js/config.js`, en formato internacional y solo dígitos. El enlace prepara una consulta con el nombre y precio del producto; el cliente debe revisar y enviar el mensaje en WhatsApp. La tienda no crea pedidos automáticamente ni recibe confirmaciones. No hay backend ni pasarela de pago.

## Privacidad y publicación

No se incluyeron costos internos en el catálogo público. Las páginas de administración y vista previa se retiraron del proyecto. La portada muestra los 17 productos y sus botones de consulta; el sitemap y las páginas de detalle conservan únicamente los seis productos originales.

## Importación de borradores Dropi

Para integrar descripciones recibidas en JSON sin tocar los seis productos publicados, ejecuta:

    node scripts/import-dropi-descriptions.js "C:\Users\USER\Downloads\casa_clara_descripciones_dropi.json"
    node scripts/build-catalog.js

El importador actualiza únicamente campos descriptivos de borradores Dropi ya existentes, omite el ID 2118677 y no copia notas internas. Los precios, imágenes, estados, fichas publicadas y sitemap se conservan.

`catalog/products.json` conserva los seis productos publicados y los 11 productos Dropi como borradores de origen. La portada muestra las 17 tarjetas con botones de consulta por WhatsApp; el mensaje se revisa y se envía manualmente y no crea pedidos automáticamente. Para el zapatero se muestra el precio más alto entre sus colores. El protector conserva el precio indicado "desde". Ningún costo Dropi se muestra en el sitio. Los borradores no tienen fichas individuales ni aparecen en el sitemap.

Para importar desde otro archivo fuente, ejecuta desde Drop:

    node scripts/import-dropi-drafts.js "C:\ruta\a\dropi_products.json"

La importación es aditiva e idempotente: si un ID Dropi ya existe, lo omite sin editar su registro. Para revertir esta prueba, elimina únicamente de catalog/products.json los registros con id que comience por dropi- y ejecuta node scripts/build-catalog.js; los seis productos publicados no se modifican.

Pendientes internos de esta consulta: 1829387 requiere revisar el stock reportado en el padre frente a sus variantes; 2073846 permanece en borrador hasta obtener la lista completa de 70 variantes; 2118677 no apareció en la consulta por ID y no se agregó al catálogo. Los demás borradores esperan revisión y un precio final aprobado. Las imágenes originales se descargaron para revisión local; su permiso de uso no está confirmado. La instantánea de stock y precios de origen no se conserva en el catálogo del sitio.

### Imágenes de Dropi

Los 11 archivos de imagen descargados están en `img/dropi-preview/`. `scripts/download-dropi-images.js` valida sus firmas y tipos; la fuente original queda en `images[].src`. La portada los carga desde rutas locales. El sitemap mantiene solo la portada y las seis fichas originales.

## Propuestas de precio local

La tabla de precios interna se puede generar desde el JSON de cálculo con:

    node scripts/build-provisional-prices.js "C:\Users\USER\Downloads\casa_clara_precios_envio_20k.json"

El JSON y el CSV resultantes se guardan en `%TEMP%` como `casa_clara_tabla_precios_envio_20k.json` y `.csv`, fuera del proyecto.

El envío de $20.000 COP es una estimación por pedido. La ganancia indicada en la tabla es antes de comisiones y publicidad; esos importes faltan por confirmar y no se garantiza ganancia neta. Los productos con variantes siguen sin precio único hasta confirmar variante y costo. El ID 2118677 continúa pendiente de identificación.
