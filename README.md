# Casa Clara — tienda de un producto

Página estática inicial para presentar un escurridor de platos metálico en Colombia. Está hecha con HTML, CSS y JavaScript, sin backend, base de datos, pasarela de pago ni dependencias externas.

## Archivos

- `index.html`: contenido y estructura de la página.
- `css/styles.css`: estilos, ilustración decorativa y diseño responsive.
- `js/config.js`: configuración del número de WhatsApp del negocio.
- `js/main.js`: activa el enlace de pedido y completa el año del pie de página.

La ilustración del encabezado es decorativa y no pretende mostrar el producto. Se dejó un espacio para una foto, pendiente de contar con una fuente autorizada y verificada. No se agregaron afirmaciones de disponibilidad ni tiempos de entrega.

## Ejecutar localmente

1. Abre la carpeta del proyecto en el Explorador de archivos.
2. Abre `index.html` con tu navegador. No requiere instalación ni conexión a servicios externos.
3. Para probar en móvil, abre las herramientas de desarrollador del navegador y activa la vista adaptable, o abre el archivo en el navegador de un teléfono desde una copia local.

## Activar y probar WhatsApp

1. Edita `js/config.js` y escribe el número de WhatsApp de tu negocio en formato internacional, solo con dígitos y sin `+` (por ejemplo, el prefijo de Colombia `57` seguido del número).
2. Guarda y recarga la página.
3. Pulsa «Consultar y pedir por WhatsApp». Debe abrirse WhatsApp con un mensaje que puedes revisar antes de enviar.
4. Sin número configurado, el botón informa cómo activarlo y no crea un enlace a un número inventado.

El precio actual del escurridor mostrado es `$59.900 COP`. Confirma que los precios y el número configurado correspondan a tu oferta antes de compartir la página. Este proyecto no se ha desplegado ni publicado.
