(() => {
  const button = document.getElementById("whatsapp-button");
  const note = document.getElementById("contact-note");
  const year = document.getElementById("year");
  const number = (window.STORE_CONFIG?.whatsappNumber || "").replace(/\D/g, "");
  const message = "Hola, quiero consultar y hacer un pedido de Escurridor de platos metálico. Precio: $43.900 COP.";

  year.textContent = new Date().getFullYear();

  if (number) {
    button.href = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
    button.setAttribute("aria-label", "Consultar y pedir el escurridor por WhatsApp");
    button.removeAttribute("aria-disabled");
    note.textContent = "Se abrirá WhatsApp con el mensaje de consulta listo para revisar y enviar.";
  } else {
    button.setAttribute("aria-disabled", "true");
    note.textContent = "WhatsApp no está configurado. Añade un número en js/config.js para habilitar consultas.";
    button.addEventListener("click", (event) => {
      event.preventDefault();
      note.textContent = "WhatsApp no está configurado. Añade un número en js/config.js para habilitar consultas.";
    });
  }
})();
