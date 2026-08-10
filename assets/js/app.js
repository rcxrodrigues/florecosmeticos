/*
 * Florè Cosméticos — comportamento da página.
 * Reproduz exatamente os estados do componente React original (Lovable / TanStack Start).
 */
(function () {
  "use strict";

  var D = JSON.parse(document.getElementById("flore-data").textContent);

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  function fmt(n) {
    return "R$ " + n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  /* ------------------------------------------------------------------ UTMs */

  var UTM_STORAGE_KEY = "flore_utms";
  var UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term",
    "utm_id", "src", "sck", "fbclid", "gclid", "ttclid", "xcod"];

  function getStoredUtms() {
    try {
      var raw = window.localStorage.getItem(UTM_STORAGE_KEY);
      if (!raw) return {};
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (e) { return {}; }
  }

  function captureUtms() {
    var search = new URLSearchParams(window.location.search);
    var found = {};
    UTM_KEYS.forEach(function (key) {
      var value = search.get(key);
      if (value) found[key] = value;
    });
    var stored = getStoredUtms();
    if (Object.keys(found).length === 0) return stored;
    var merged = Object.assign({}, stored, found);
    try { window.localStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(merged)); } catch (e) {}
    return merged;
  }

  function withUtms(url) {
    var utms = getStoredUtms();
    var entries = Object.keys(utms);
    if (entries.length === 0) return url;
    try {
      var parsed = new URL(url, window.location.href);
      entries.forEach(function (key) {
        if (!parsed.searchParams.has(key)) parsed.searchParams.set(key, utms[key]);
      });
      return parsed.toString();
    } catch (e) { return url; }
  }

  captureUtms();

  /* ---------------------------------------------------------------- estado */

  var state = {
    ann: 0,
    img: 0,
    qty: 1,
    variant: 0,
    openInfo: 0,
    openFaq: null,
    cartQty: 0,
    pkg: false,
    visibleReviews: 6,
    reviewRating: 5,
    reviewHover: 0
  };

  /* --------------------------------------------------- barra de anúncios */

  var annText = $("[data-ann-text]");
  function renderAnn() { annText.textContent = D.announcements[state.ann]; }

  $$("[data-ann]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var n = D.announcements.length;
      state.ann = btn.getAttribute("data-ann") === "next"
        ? (state.ann + 1) % n
        : (state.ann - 1 + n) % n;
      renderAnn();
    });
  });
  setInterval(function () {
    state.ann = (state.ann + 1) % D.announcements.length;
    renderAnn();
  }, 4000);

  /* ------------------------------------------------------------- galeria */

  var hero = $("[data-hero]");
  var thumbs = $$("[data-thumb]");

  function renderGallery() {
    hero.src = D.images[state.img];
    thumbs.forEach(function (btn, i) {
      btn.className = "shrink-0 overflow-hidden rounded-xl border-2 transition " +
        (i === state.img ? "border-wine" : "border-transparent opacity-80 hover:opacity-100");
    });
  }

  thumbs.forEach(function (btn, i) {
    btn.addEventListener("click", function () { state.img = i; renderGallery(); });
  });

  /* --------------------------------------------------------------- cores */

  var colourBtns = $$("[data-colour]");
  var variantLabel = $("[data-variant-label]");

  function renderVariant() {
    variantLabel.textContent = D.colours[state.variant];
    colourBtns.forEach(function (btn, i) {
      btn.className = "tap h-10 w-10 rounded-full border-2 transition " +
        (i === state.variant ? "border-wine" : "border-transparent");
    });
  }

  colourBtns.forEach(function (btn, i) {
    btn.addEventListener("click", function () {
      state.variant = i;
      state.img = i === 0 ? 1 : 2;
      renderVariant();
      renderGallery();
      renderCart();
    });
  });

  /* ---------------------------------------------------------- quantidade */

  var qtyValue = $("[data-qty-value]");

  function renderQty() {
    qtyValue.textContent = state.qty;
  }

  $$("[data-qty]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var delta = Number(btn.getAttribute("data-qty"));
      state.qty = Math.max(1, state.qty + delta);
      renderQty();
    });
  });

  /* ------------------------------------------------------------ acordeões */

  function wireAccordion(btnAttr, panelAttr, stateKey) {
    var buttons = $$("[" + btnAttr + "]");
    var panels = $$("[" + panelAttr + "]");

    function render() {
      buttons.forEach(function (btn, i) {
        var chevron = btn.querySelector("svg");
        var open = state[stateKey] === i;
        chevron.setAttribute("class", "lucide lucide-chevron-down transition" + (open ? " rotate-180" : ""));
      });
      panels.forEach(function (panel, i) { panel.hidden = state[stateKey] !== i; });
    }

    buttons.forEach(function (btn, i) {
      btn.addEventListener("click", function () {
        state[stateKey] = state[stateKey] === i ? null : i;
        render();
      });
    });
    render();
  }

  wireAccordion("data-info", "data-info-panel", "openInfo");
  wireAccordion("data-faq", "data-faq-panel", "openFaq");

  /* ------------------------------------------------------- barra fixa */

  // Listener passivo + rAF: no celular o evento de scroll dispara dezenas de vezes
  // por segundo e mexer em classes direto dentro dele trava a rolagem.
  var sticky = $("[data-sticky]");
  var stickyTicking = false;
  window.addEventListener("scroll", function () {
    if (stickyTicking) return;
    stickyTicking = true;
    window.requestAnimationFrame(function () {
      var show = window.scrollY > 900;
      sticky.classList.toggle("translate-y-full", !show);
      sticky.classList.toggle("translate-y-0", show);
      stickyTicking = false;
    });
  }, { passive: true });

  /* ------------------------------------------------------ modal avaliação */

  var reviewModal = $("[data-review-modal]");
  var reviewForm = $("[data-review-form]");
  var reviewThanks = $("[data-review-thanks]");
  var starBtns = $$("[data-star]");

  function renderRating() {
    var active = state.reviewHover || state.reviewRating;
    starBtns.forEach(function (btn, idx) {
      var svg = btn.querySelector("svg");
      var on = idx + 1 <= active;
      svg.setAttribute("fill", on ? "currentColor" : "none");
      svg.setAttribute("stroke-width", on ? "0" : "1.5");
    });
  }

  starBtns.forEach(function (btn, idx) {
    btn.addEventListener("click", function () { state.reviewRating = idx + 1; renderRating(); });
    btn.addEventListener("mouseenter", function () { state.reviewHover = idx + 1; renderRating(); });
    btn.addEventListener("mouseleave", function () { state.reviewHover = 0; renderRating(); });
  });

  $("[data-review-open]").addEventListener("click", function () {
    reviewThanks.hidden = true;
    reviewForm.hidden = false;
    reviewModal.hidden = false;
  });

  function closeReview() { reviewModal.hidden = true; }
  $("[data-review-close]").addEventListener("click", closeReview);
  reviewModal.addEventListener("click", closeReview);
  $("[data-review-panel]").addEventListener("click", function (e) { e.stopPropagation(); });

  reviewForm.addEventListener("submit", function (e) {
    e.preventDefault();
    reviewForm.reset();
    state.reviewRating = 5;
    state.reviewHover = 0;
    renderRating();
    reviewForm.hidden = true;
    reviewThanks.hidden = false;
  });

  /* ------------------------------------------------------- mais avaliações */

  var STAR_PATH = "M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z";
  var CHECK_PATH = "M20 6 9 17l-5-5";

  function svgIcon(name, path, size, fill, strokeWidth, cls) {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size +
      '" viewBox="0 0 24 24" fill="' + fill + '" stroke="currentColor" stroke-width="' + strokeWidth +
      '" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-' + name +
      (cls ? " " + cls : "") + '" aria-hidden="true"><path d="' + path + '"/></svg>';
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function reviewCardHtml(r) {
    var starRow = "";
    for (var s = 1; s <= 5; s++) {
      var on = s <= r.rating;
      starRow += svgIcon("star", STAR_PATH, 13, on ? "currentColor" : "none", on ? 0 : 1.5,
        on ? "text-terracotta" : "text-border");
    }
    return '<article class="mb-4 break-inside-avoid rounded-2xl bg-background p-5 shadow-sm ring-1 ring-border/60">' +
      '<header class="flex items-center gap-2">' +
      '<span class="grid h-8 w-8 place-items-center rounded-full bg-rose/20 text-xs font-semibold text-wine">' + escapeHtml(r.initial) + "</span>" +
      '<span class="text-sm font-medium text-wine">' + escapeHtml(r.name) + "</span>" +
      (r.verified ? '<span title="' + escapeHtml(D.reviewsVerified) + '" class="text-rose">' + svgIcon("check", CHECK_PATH, 14, "none", 2.5, "") + "</span>" : "") +
      "</header>" +
      '<div class="mt-2 flex gap-0.5 text-terracotta">' + starRow + "</div>" +
      (r.title ? '<h3 class="mt-3 text-sm font-semibold text-wine">' + escapeHtml(r.title) + "</h3>" : "") +
      '<p class="mt-1.5 text-sm leading-relaxed text-wine/80">' + escapeHtml(r.body) + "</p>" +
      '<footer class="mt-4 flex items-center justify-between text-xs text-muted-foreground">' +
      "<span>" + escapeHtml(D.reviewsHelpful) + "</span>" +
      '<div class="flex items-center gap-3">' +
      '<span class="inline-flex items-center gap-1">👍 ' + r.helpful + "</span>" +
      '<span class="inline-flex items-center gap-1">👎 ' + r.unhelpful + "</span>" +
      "</div></footer></article>";
  }

  var reviewsGrid = $("[data-reviews-grid]");
  var reviewsShowing = $("[data-reviews-showing]");
  var loadMoreWrap = $("[data-loadmore-wrap]");
  var loadMoreBtn = $("[data-reviews-more]");

  loadMoreBtn.addEventListener("click", function () {
    var from = state.visibleReviews;
    state.visibleReviews = Math.min(state.visibleReviews + 5, D.reviews.length);
    var html = "";
    for (var i = from; i < state.visibleReviews; i++) html += reviewCardHtml(D.reviews[i]);
    reviewsGrid.insertAdjacentHTML("beforeend", html);
    reviewsShowing.textContent = D.reviewsShowing
      .replace("{{count}}", String(state.visibleReviews))
      .replace("{{total}}", String(D.reviews.length));
    if (state.visibleReviews >= D.reviews.length) loadMoreBtn.remove();
  });

  /* ------------------------------------------------------------- carrinho */

  var SHIPPING_THRESHOLD = 99;
  var PKG_PRICE = 9.9;

  var cart = $("[data-cart]");
  var cartBackdrop = $("[data-cart-backdrop]");
  var cartBadge = $("[data-cart-badge]");
  var cartLines = $("[data-cart-lines]");
  var cartItem = $("[data-cart-item]");
  var cartEmpty = $("[data-cart-empty]");
  var cartThumb = $("[data-cart-thumb]");
  var cartVariant = $("[data-cart-variant]");
  var cartQtyValue = $("[data-cart-qty-value]");
  var cartCompare = $("[data-cart-compare]");
  var cartTotal = $("[data-cart-total]");
  var cartSave = $("[data-cart-save]");
  var shipText = $("[data-ship-text]");
  var shipBar = $("[data-ship-bar]");
  var shipDots = $$("[data-ship-dot]");
  var pkgBtn = $("[data-pkg]");
  var pkgKnob = $("[data-pkg-knob]");
  var checkoutLink = $("[data-checkout-link]");
  var checkoutDisabled = $("[data-checkout-disabled]");
  var checkoutTotal = $("[data-checkout-total]");
  var checkoutTotalDisabled = $("[data-checkout-total-disabled]");

  function renderCart() {
    var subtotal = D.price * state.cartQty + (state.pkg ? PKG_PRICE : 0);
    var remaining = Math.max(0, SHIPPING_THRESHOLD - subtotal);
    var progress = Math.min(100, (subtotal / SHIPPING_THRESHOLD) * 100);
    var isBlack = state.variant === 0;

    cartBadge.textContent = state.cartQty;
    cartLines.textContent = state.cartQty > 0 ? 1 : 0;

    shipText.innerHTML = remaining > 0
      ? "Faltam " + fmt(remaining) + ' para <span class="font-semibold">Frete Grátis!</span>'
      : '<span class="font-semibold text-terracotta">Você desbloqueou o frete grátis!</span>';

    shipBar.style.width = progress + "%";
    shipDots.forEach(function (dot) {
      var p = Number(dot.getAttribute("data-ship-dot"));
      var reached = progress >= p;
      dot.className = "absolute grid h-5 w-5 place-items-center rounded-full text-[10px] " +
        (reached ? "bg-terracotta text-white" : "bg-rose/30 text-white");
    });

    cartItem.hidden = state.cartQty <= 0;
    cartEmpty.hidden = state.cartQty > 0;

    cartThumb.src = isBlack ? D.cartThumbs[0] : D.cartThumbs[1];
    cartVariant.textContent = D.colours[state.variant];
    cartQtyValue.textContent = state.cartQty;
    cartCompare.textContent = fmt(D.compareAt * state.cartQty);
    cartTotal.textContent = fmt(D.price * state.cartQty);
    cartSave.textContent = fmt((D.compareAt - D.price) * state.cartQty);

    pkgBtn.setAttribute("aria-checked", String(state.pkg));
    pkgBtn.className = "tap relative h-6 w-11 shrink-0 rounded-full transition " + (state.pkg ? "bg-terracotta" : "bg-border");
    pkgKnob.className = "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition " + (state.pkg ? "left-[22px]" : "left-0.5");

    checkoutTotal.textContent = fmt(subtotal);
    checkoutTotalDisabled.textContent = fmt(subtotal);
    checkoutLink.hidden = state.cartQty <= 0;
    checkoutDisabled.hidden = state.cartQty > 0;
    checkoutLink.href = withUtms(isBlack ? D.checkout.black : D.checkout.brown);
  }

  function openCart() {
    cartBackdrop.hidden = false;
    cart.classList.remove("translate-x-full");
    cart.classList.add("translate-x-0");
  }

  function closeCart() {
    cartBackdrop.hidden = true;
    cart.classList.add("translate-x-full");
    cart.classList.remove("translate-x-0");
  }

  $$("[data-add-to-cart]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      state.cartQty = state.qty;
      renderCart();
      openCart();
    });
  });

  $("[data-cart-open]").addEventListener("click", openCart);
  $("[data-cart-close]").addEventListener("click", closeCart);
  cartBackdrop.addEventListener("click", closeCart);

  $$("[data-cart-qty]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var delta = Number(btn.getAttribute("data-cart-qty"));
      state.cartQty = Math.max(1, state.cartQty + delta);
      renderCart();
    });
  });

  $("[data-cart-remove]").addEventListener("click", function () {
    state.cartQty = 0;
    renderCart();
  });

  pkgBtn.addEventListener("click", function () {
    state.pkg = !state.pkg;
    renderCart();
  });

  /* ---------------------------------------------------------- newsletter */

  var newsletterForm = $("[data-newsletter]");
  var newsletterMsg = $("[data-newsletter-msg]");
  var newsletterInput = newsletterForm.querySelector("input[type=email]");
  var newsletterBtn = newsletterForm.querySelector("button[type=submit]");
  var newsletterDone = false;

  newsletterForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var email = newsletterInput.value.trim();
    if (!email || newsletterDone) return;

    newsletterInput.disabled = true;
    newsletterBtn.disabled = true;
    newsletterBtn.textContent = "Subscribing...";
    newsletterMsg.hidden = true;

    fetch(D.supabase.url + "/rest/v1/email_subscribers", {
      method: "POST",
      headers: {
        apikey: D.supabase.key,
        Authorization: "Bearer " + D.supabase.key,
        "Content-Type": "application/json",
        Prefer: "return=minimal"
      },
      body: JSON.stringify({ email: email, source: "footer_newsletter" })
    })
      .then(function (res) {
        if (res.ok) return { ok: true, message: "Thank you for subscribing." };
        return res.json().then(function (body) {
          if (body && body.code === "23505") return { ok: true, message: "You're already subscribed." };
          throw new Error("Failed to subscribe. Please try again.");
        });
      })
      .then(function (result) {
        newsletterDone = true;
        newsletterInput.value = "";
        newsletterMsg.className = "text-sm text-emerald-600";
        newsletterMsg.textContent = result.message;
        newsletterMsg.hidden = false;
        newsletterBtn.textContent = D.newsletter.cta;
      })
      .catch(function (err) {
        newsletterInput.disabled = false;
        newsletterBtn.disabled = false;
        newsletterBtn.textContent = D.newsletter.cta;
        newsletterMsg.className = "text-sm text-[#B65860]";
        newsletterMsg.textContent = err.message || D.newsletter.error;
        newsletterMsg.hidden = false;
      });
  });

  /* ------------------------------------------------- diagnóstico na tela */

  /*
   * Painel de status do rastreamento. Aparece SOMENTE com ?debug no endereço,
   * então é invisível para quem visita a loja. Serve para conferir GTM e pixel
   * sem depender do Tag Assistant, do console ou de extensão de navegador.
   * Usa estilo embutido de propósito: não depende do CSS compilado.
   */
  if (/[?&]debug\b/.test(location.search)) {
    var painel = document.createElement("div");
    painel.style.cssText =
      "position:fixed;left:12px;bottom:12px;z-index:99999;max-width:min(92vw,380px);" +
      "background:#fff;color:#7B3532;border:2px solid #C27C65;border-radius:16px;" +
      "padding:16px 18px;font:14px/1.5 system-ui,sans-serif;box-shadow:0 8px 32px rgba(0,0,0,.18)";
    document.body.appendChild(painel);

    var linha = function (rotulo, ok, detalhe) {
      return (
        '<div style="display:flex;gap:8px;align-items:flex-start;margin-top:8px">' +
        '<span style="font-size:16px;line-height:1.3">' + (ok ? "✅" : "❌") + "</span>" +
        "<span><strong>" + rotulo + "</strong>" +
        (detalhe ? '<br><span style="opacity:.75;font-size:13px">' + detalhe + "</span>" : "") +
        "</span></div>"
      );
    };

    var desenhar = function () {
      var gtm = Object.keys(window.google_tag_manager || {}).filter(function (k) {
        return k.indexOf("GTM-") === 0;
      });
      var script = !!document.querySelector('script[src*="googletagmanager.com/gtm.js"]');
      var eventos = (window.dataLayer || [])
        .map(function (e) { return e && e.event; })
        .filter(Boolean);
      var meta = (window.fbq && window.fbq.instance && window.fbq.instance.pixelsByID)
        ? Object.keys(window.fbq.instance.pixelsByID) : [];
      var tudoOk = gtm.length > 0 && script && eventos.length >= 3;

      painel.innerHTML =
        '<div style="font-weight:700;font-size:15px;border-bottom:1px solid #eadfdb;padding-bottom:8px">' +
        (tudoOk ? "Rastreamento ativo" : "Verificando…") +
        '<button style="float:right;border:0;background:none;color:#7B3532;font-size:18px;' +
        'cursor:pointer;line-height:1;padding:0" aria-label="Fechar">×</button></div>' +
        linha("Script do GTM na página", script, "googletagmanager.com/gtm.js") +
        linha("Container ativo", gtm.length > 0, gtm.join(", ") || "nenhum") +
        linha("Eventos disparados", eventos.length >= 3, eventos.join(" · ") || "nenhum") +
        linha("Pixel da Meta", meta.length > 0, meta.join(", ") || "nenhum") +
        '<div style="margin-top:12px;padding-top:8px;border-top:1px solid #eadfdb;' +
        'font-size:12px;opacity:.7">Só aparece com ?debug no endereço. Visitantes não veem.</div>';

      painel.querySelector("button").addEventListener("click", function () {
        painel.remove();
      });
    };

    desenhar();
    var tentativas = 0;
    var relogio = setInterval(function () {
      desenhar();
      if (++tentativas > 20) clearInterval(relogio);
    }, 500);
  }

  /* -------------------------------------------------------- render inicial */

  renderAnn();
  renderGallery();
  renderVariant();
  renderQty();
  renderRating();
  renderCart();
})();
