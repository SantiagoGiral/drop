(() => {
  const number = (window.STORE_CONFIG?.whatsappNumber || "").replace(/\D/g, "");
  const year = document.getElementById("year");

  if (year) {
    year.textContent = new Date().getFullYear();
  }


  document.querySelectorAll("[data-product-gallery]").forEach((gallery) => {
    const mainImage = gallery.querySelector(".gallery-main-image");
    const thumbnails = [...gallery.querySelectorAll(".gallery-thumbnail")];
    const images = thumbnails
      .map((thumbnail) => thumbnail.querySelector("img")?.getAttribute("src"))
      .filter(Boolean);
    const imageDescription = mainImage.alt.replace(/, vista \d+$/, "");
    let current = 0;

    const showImage = (index) => {
      current = (index + images.length) % images.length;
      mainImage.src = images[current];
      mainImage.alt = `${imageDescription}, vista ${current + 1}`;
      thumbnails.forEach((thumbnail, thumbnailIndex) => {
        const active = thumbnailIndex === current;
        thumbnail.classList.toggle("is-active", active);
        thumbnail.setAttribute("aria-pressed", String(active));
      });
    };
    gallery.querySelector(".gallery-previous").addEventListener("click", () => showImage(current - 1));
    gallery.querySelector(".gallery-next").addEventListener("click", () => showImage(current + 1));
    thumbnails.forEach((thumbnail) => thumbnail.addEventListener("click", () => showImage(Number(thumbnail.dataset.galleryIndex))));
  });

  document.querySelectorAll("[data-whatsapp-product]").forEach((button) => {
    const note = document.getElementById(button.dataset.whatsappNote);
    const product = button.dataset.whatsappProduct;
    const price = button.dataset.whatsappPrice;
    const pickerId = button.dataset.whatsappColorPicker;
    const picker = pickerId
      ? document.querySelector(`[data-color-picker="${pickerId}"]`)
      : null;

    if (number) {
      if (picker) {
        let selectedColor = "";
        button.setAttribute("aria-disabled", "true");

        picker.querySelectorAll("[data-color-value]").forEach((option) => {
          option.addEventListener("click", () => {
            selectedColor = option.dataset.colorValue;
            picker.querySelectorAll("[data-color-value]").forEach((colorOption) => {
              const selected = colorOption === option;
              colorOption.setAttribute("aria-pressed", String(selected));
              colorOption.classList.toggle("is-selected", selected);
            });

            const message = `Hola, quiero consultar y hacer un pedido de ${product}. Color consultado: ${selectedColor}. Precio: ${price}.`;
            button.href = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
            button.setAttribute("aria-label", `Consultar ${product}, color ${selectedColor}, por WhatsApp`);
            button.removeAttribute("aria-disabled");
            if (note) {
              note.textContent = `Color seleccionado para consultar: ${selectedColor}. La disponibilidad debe confirmarse con el proveedor.`;
            }
          });
        });

        button.addEventListener("click", (event) => {
          if (!selectedColor) {
            event.preventDefault();
            if (note) {
              note.textContent = "Selecciona un color para preparar tu consulta por WhatsApp.";
            }
          }
        });
      } else {
        const message = `Hola, quiero consultar y hacer un pedido de ${product}. Precio: ${price}.`;
        button.href = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
        button.setAttribute("aria-label", `Consultar y pedir ${product} por WhatsApp`);
        button.removeAttribute("aria-disabled");
        if (note) {
          note.textContent = "Se abrirá WhatsApp con el mensaje de consulta listo para revisar y enviar.";
        }
      }
    } else {
      button.setAttribute("aria-disabled", "true");
      if (note) {
        note.textContent = "WhatsApp no está configurado. Añade un número en js/config.js para habilitar consultas.";
      }
      button.addEventListener("click", (event) => {
        event.preventDefault();
        if (note) {
          note.textContent = "WhatsApp no está configurado. Añade un número en js/config.js para habilitar consultas.";
        }
      });
    }
  });
})();
