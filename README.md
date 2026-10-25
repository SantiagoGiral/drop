# Casa Clara

Tienda estática hecha con HTML, CSS y JavaScript, sin backend, base de datos, pasarela de pago, dependencias ni servicios pagos. Las fichas y el catálogo mantienen seis productos publicados y sus precios actuales. El set de utensilios sigue fuera del catálogo hasta contar con imágenes e información confirmadas.

## Abrir y probar localmente

Se necesita Node.js instalado; no se instalan paquetes.

1. Abre PowerShell en la carpeta `Drop`.
2. Ejecuta `node scripts/serve-local.js`.
3. Abre `http://127.0.0.1:8000/` en el navegador. La calculadora está en `http://127.0.0.1:8000/admin/calculadora.html`.
4. Para detener el servidor, vuelve a PowerShell y pulsa `Ctrl+C`.

El servidor escucha solo en `127.0.0.1`, es decir, en este computador. La página puede abrirse directamente como archivo, pero la calculadora necesita el servidor local para cargar el JSON por HTTP. Si el comando `node` no está disponible, instala Node.js desde su sitio oficial o usa una extensión Live Server ya instalada en el editor; no se descarga ninguna dependencia del proyecto.

Pruebas automatizadas: `node scripts/test-catalog.js`. Para una comprobación rápida de sintaxis: `node --check scripts/build-catalog.js`, `node --check scripts/test-catalog.js`, `node --check scripts/serve-local.js`, `node --check js/main.js`, `node --check js/calculator.js`.

## Regenerar el catálogo

Desde la carpeta `Drop`, ejecuta `node scripts/build-catalog.js`. Puedes ejecutarlo varias veces: la salida es determinista, no añade tarjetas duplicadas y solo escribe diferencias. El generador falla si una salida existente perdió su marcador de generación. No elimina páginas, imágenes ni archivos que ya no estén referenciados.

### Archivos editables a mano

- `catalog/products.json`: fuente de datos públicos de productos. Incluye solo datos que pueden publicarse, como precio de venta, texto, características confirmadas, imágenes y SEO. No agregues costos del proveedor, fletes, comisiones ni márgenes aquí.
- `templates/index.html` y `templates/product.html`: estructura manual usada como plantilla.
- `js/config.js`: número WhatsApp existente; el generador no lo lee ni lo modifica.
- `css/styles.css`, `js/main.js`, `favicon.svg`, `robots.txt` e imágenes: archivos manuales y funcionalidad/identidad de la tienda.
- `admin/calculadora.html`, `js/calculator.js`, `js/pricing.js`, `css/calculator.css`: herramienta local; edítalos manualmente.

### Archivos generados automáticamente

- `index.html` (portada y tarjetas).
- `productos/<slug>.html` para cada producto con estado `published` en el JSON.
- `sitemap.xml` (solo portada y fichas publicadas).

No edites manualmente esos tres tipos de salida: los archivos llevan un comentario marcador y el generador los administra. Las ediciones manuales deben hacerse en las plantillas o `catalog/products.json`. Si un producto deja de publicarse, el generador lo quita del catálogo y sitemap, pero no borra su antigua ficha; revísala y archívala manualmente si corresponde.

## Calculadora local de precio

Abre `/admin/calculadora.html` con el servidor local. El cálculo ocurre en el navegador; solo lee el catálogo desde este proyecto y no hace solicitudes a servicios externos. Costos, fletes, comisiones y resultados se guardan en `localStorage` de ese navegador, no en archivos del proyecto, Git ni HTML generado. El botón de exportación genera un archivo con nombre, ID de producto y precio candidato, sin los costos ingresados.

El flete y las comisiones no se suponen confirmados: si quedan vacíos, la simulación los trata como cero para hacer el cálculo, pero el resultado debe considerarse provisional hasta que se ingresen sus valores reales. El redondeo sube al siguiente precio terminado en 900 COP y nunca reduce la ganancia neta deseada para los datos proporcionados.

Los precios publicados no cambian al calcular ni guardar candidatos. Para actualizar un precio público, revisa y autoriza la propuesta; después cambia manualmente `salePriceCop` del producto en `catalog/products.json` y regenera el catálogo.

## WhatsApp y pedidos

El número está en `js/config.js`, en formato internacional y solo dígitos. El enlace prepara una consulta con el nombre y precio del producto; el cliente debe revisar y enviar el mensaje en WhatsApp. La tienda no crea pedidos automáticamente ni recibe confirmaciones. No hay backend ni pasarela de pago.

## Privacidad y publicación

No se incluyeron costos internos en los datos públicos del proyecto. La calculadora y sus scripts no envían entradas a servidores, pero al publicar la carpeta completa su interfaz estaría accesible en la web; los datos solo están en el almacenamiento local del navegador que los introdujo. Para usar la calculadora, se recomienda mantener la copia local. No se realizó push ni despliegue como parte de estos cambios.

## Importación de borradores Dropi

Para integrar descripciones recibidas en JSON sin tocar los seis productos publicados, ejecuta:

    node scripts/import-dropi-descriptions.js "C:\Users\USER\Downloads\casa_clara_descripciones_dropi.json"
    node scripts/build-catalog.js

El importador actualiza únicamente campos descriptivos de borradores Dropi ya existentes, omite el ID 2118677 y no copia notas internas. Los precios, imágenes, estados, fichas publicadas y sitemap se conservan.

catalog/products.json conserva los seis productos publicados y 11 productos Dropi como borradores. La portada generada muestra todos junto a los seis productos actuales. Las tarjetas incluyen botones de consulta por WhatsApp; el mensaje se revisa y se envia manualmente y no crea pedidos automaticamente. Las propuestas siguen marcadas como provisionales. El zapatero ofrece precios sugeridos por color y el protector muestra un precio sugerido "desde" y permite consultar por tama?o. Ningun costo Dropi se muestra en el sitio. Los borradores no tienen fichas individuales ni aparecen en el sitemap.

Para importar desde otro archivo fuente, ejecuta desde Drop:

    node scripts/import-dropi-drafts.js "C:\ruta\a\dropi_products.json"

La importación es aditiva e idempotente: si un ID Dropi ya existe, lo omite sin editar su registro. Para revertir esta prueba, elimina únicamente de catalog/products.json los registros con id que comience por dropi- y ejecuta node scripts/build-catalog.js; los seis productos publicados no se modifican.

Pendientes internos de esta consulta: 1829387 requiere revisar el stock reportado en el padre frente a sus variantes; 2073846 permanece en borrador hasta obtener la lista completa de 70 variantes; 2118677 no apareció en la consulta por ID y no se agregó al catálogo. Los demás borradores esperan revisión y un precio final aprobado. Las imágenes originales se descargaron para revisión local; su permiso de uso no está confirmado. La instantánea de stock y precios de origen no se conserva en el catálogo del sitio.

### Vista previa local de imágenes y tarjetas

Los 11 archivos de imagen descargados estan en `img/dropi-preview/`. `scripts/download-dropi-images.js` valida sus firmas y tipos, y anade la ruta local `previewSrc`; la fuente original queda en `images[].src`. La descarga se puede repetir y omite archivos validos existentes. La vista `admin/vista-previa-dropi.html` permanece disponible; lee datos seguros de `catalog/products.json`, no muestra costos ni margenes y no tiene botones de pedido.

La portada `index.html` se regenera con las tarjetas de los seis productos publicados y los 11 borradores, cada uno con su boton de consulta por WhatsApp. El servidor local sirve ese mismo archivo sin inyectar recursos ni duplicar tarjetas. El sitemap conserva solo la portada y las seis fichas publicadas.

## Propuestas de precio local

La tabla interna se genera desde el JSON adjunto con:

    node scripts/build-provisional-prices.js "C:\Users\USER\Downloads\casa_clara_precios_envio_20k.json"

El JSON y el CSV resultantes se guardan en %TEMP% como casa_clara_tabla_precios_envio_20k.json y .csv, fuera del proyecto. La vista local recibe solo ID, precio propuesto y estado; no recibe costo, envío ni ganancia estimada.

El envío de $20.000 COP es una estimación por pedido. La ganancia indicada en la tabla es antes de comisiones y publicidad; esos importes faltan por confirmar y no se garantiza ganancia neta. Los productos con variantes siguen sin precio único hasta confirmar variante y costo. El ID 2118677 continúa pendiente de identificación.
