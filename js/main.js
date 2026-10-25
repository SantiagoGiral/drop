(() => {
  const number = (window.STORE_CONFIG?.whatsappNumber || "").replace(/\D/g, "");
  const year = document.getElementById("year");

  if (year) {
    year.textContent = new Date().getFullYear();
  }

  const catalogGrid = document.querySelector('.catalog-grid');
  const filterButtons = [...document.querySelectorAll('[data-catalog-filter]')];
  if (catalogGrid && filterButtons.length) {
    const cards = [...catalogGrid.querySelectorAll('.catalog-card')];
    const filterStatus = document.getElementById('catalog-filter-status');
    filterButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const category = button.dataset.catalogFilter;
        let visible = 0;
        cards.forEach((card) => {
          const show = category === 'all' || card.dataset.category === category;
          card.hidden = !show;
          if (show) visible++;
        });
        filterButtons.forEach((filter) => {
          const active = filter === button;
          filter.classList.toggle('is-active', active);
          filter.setAttribute('aria-pressed', String(active));
        });
        if (filterStatus) filterStatus.textContent = `Mostrando ${visible} de ${cards.length} productos.`;
      });
    });
  }

  const heroCarousel = document.querySelector('[data-hero-carousel]');
  if (heroCarousel) {
    const slides = [...heroCarousel.querySelectorAll('[data-hero-slide]')];
    const previous = heroCarousel.querySelector('[data-hero-previous]');
    const next = heroCarousel.querySelector('[data-hero-next]');
    const toggle = heroCarousel.querySelector('[data-hero-toggle]');
    const count = heroCarousel.querySelector('[data-hero-count]');
    const caption = heroCarousel.querySelector('.hero-product-caption');
    const category = caption?.querySelector('[data-hero-category]');
    const title = caption?.querySelector('[data-hero-title]');
    const priceLabel = caption?.querySelector('[data-hero-price-label]');
    const price = caption?.querySelector('[data-hero-price]');
    const productLink = heroCarousel.querySelector('[data-hero-product-link]');
    if (slides.length) {
      let current = Math.max(0, slides.findIndex((slide) => !slide.hidden));
      let userPaused = Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
      let pointerPaused = false;
      let focusPaused = false;
      let timer = null;

      const render = (index) => {
        current = (index + slides.length) % slides.length;
        const active = slides[current];
        slides.forEach((slide, slideIndex) => {
          const selected = slideIndex === current;
          slide.hidden = !selected;
          slide.setAttribute('aria-hidden', String(!selected));
        });
        if (count) count.textContent = `${String(current + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
        if (category) category.textContent = active.dataset.heroCategory || '';
        if (title) title.textContent = active.dataset.heroName || '';
        if (priceLabel) priceLabel.textContent = active.dataset.heroPriceLabel || '';
        if (price) price.textContent = active.dataset.heroPrice || '';
        if (productLink && active.dataset.heroProductId) {
          productLink.href = `#product-${active.dataset.heroProductId}`;
        }
      };
      const stop = () => { if (timer) clearInterval(timer); timer = null; };
      const start = () => {
        stop();
        if (!userPaused && !pointerPaused && !focusPaused && slides.length > 1 && !document.hidden) {
          timer = setInterval(() => render(current + 1), 6000);
        }
      };
      const step = (amount) => { render(current + amount); start(); };
      previous?.addEventListener('click', () => step(-1));
      next?.addEventListener('click', () => step(1));
      productLink?.addEventListener('click', () => {
        const target = document.getElementById(productLink.hash.slice(1));
        if (target?.hidden) document.querySelector('[data-catalog-filter="all"]')?.click();
      });
      toggle?.addEventListener('click', () => {
        userPaused = !userPaused;
        toggle.setAttribute('aria-pressed', String(userPaused));
        toggle.setAttribute('aria-label', userPaused ? 'Reanudar rotación' : 'Pausar rotación');
        toggle.textContent = userPaused ? '▶' : 'Ⅱ';
        start();
      });
      heroCarousel.addEventListener('mouseenter', () => { pointerPaused = true; stop(); });
      heroCarousel.addEventListener('mouseleave', () => { pointerPaused = false; start(); });
      heroCarousel.addEventListener('focusin', () => { focusPaused = true; stop(); });
      heroCarousel.addEventListener('focusout', (event) => {
        if (!heroCarousel.contains(event.relatedTarget)) { focusPaused = false; start(); }
      });
      document.addEventListener('visibilitychange', start);
      render(current);
      if (toggle && userPaused) {
        toggle.setAttribute('aria-pressed', 'true');
        toggle.setAttribute('aria-label', 'Reanudar rotación');
        toggle.textContent = '▶';
      }
      start();
    }
  }

  document.querySelectorAll('img[data-image-fallback]').forEach((image) => {
    image.addEventListener('error', () => {
      if (image.dataset.fallbackShown) return;
      image.dataset.fallbackShown = 'true';
      image.hidden = true;
      const fallback = document.createElement('span');
      fallback.className = 'image-fallback';
      fallback.setAttribute('role', 'img');
      fallback.textContent = 'Imagen no disponible';
      image.parentElement?.append(fallback);
    });
  });

  document.querySelectorAll("[data-product-gallery]").forEach((gallery) => {
    const mainImage = gallery.querySelector(".gallery-main-image");
    const thumbnails = [...gallery.querySelectorAll(".gallery-thumbnail")];
    const images = thumbnails
      .map((thumbnail) => thumbnail.querySelector("img")?.getAttribute("src"))
      .filter(Boolean);
    if (!mainImage || images.length < 2) return;
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
    gallery.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") showImage(current - 1);
      if (event.key === "ArrowRight") showImage(current + 1);
    });
  });

  document.querySelectorAll("[data-whatsapp-product]").forEach((button) => {
    const note = document.getElementById(button.dataset.whatsappNote);
    const product = button.dataset.whatsappProduct;
    const price = button.dataset.whatsappPrice;
    const pickerId = button.dataset.whatsappColorPicker;
    const picker = pickerId
      ? document.querySelector(`[data-color-picker="${pickerId}"]`)
      : null;
    const variantSelectId = button.dataset.whatsappVariantSelect;
    const variantSelect = variantSelectId
      ? document.querySelector(`[data-whatsapp-variant-select="${variantSelectId}"]`)
      : null;

    if (number) {
      if (variantSelect) {
        button.setAttribute("aria-disabled", "true");
        button.textContent = "Selecciona una opci\u00f3n";
        variantSelect.addEventListener("change", () => {
          const option = variantSelect.selectedOptions[0];
          if (!option?.value) {
            button.setAttribute("aria-disabled", "true");
            button.textContent = "Selecciona una opci\u00f3n";
            return;
          }
          const selectedPrice = option.dataset.priceText || price;
          const message = `Hola, quiero consultar y hacer un pedido de ${product}. Variante seleccionada: ${option.value}. Precio: ${selectedPrice}.`;
          button.href = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
          button.target = "_blank";
          button.rel = "noopener noreferrer";
          button.textContent = `Pedir ${option.value} por WhatsApp`;
          button.setAttribute("aria-label", `Consultar y pedir ${product}, variante ${option.value}, por WhatsApp`);
          button.removeAttribute("aria-disabled");
          if (note) note.textContent = "Se abrir\u00e1 WhatsApp con el mensaje listo para revisar y enviar.";
        });
        button.addEventListener("click", (event) => {
          if (button.getAttribute("aria-disabled") === "true") event.preventDefault();
        });
      } else if (picker) {
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
            button.target = "_blank";
            button.rel = "noopener noreferrer";
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
        button.target = "_blank";
        button.rel = "noopener noreferrer";
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
