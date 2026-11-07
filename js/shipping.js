/* Nova Shop Guatemala — Envíos: umbral de envío gratis y selección de paquetería.
   Se carga DESPUÉS de app.js. Lee los montos del carrito desde el DOM. */
(function () {
  'use strict';

  // ====== CONFIGURACIÓN (ajusta aquí las tarifas reales) ======
  const CONFIG = {
    freeShippingThreshold: 300,           // Q300.00 o más => envío gratis
    defaultCarrier: 'cargo-expreso',
  carriers: {
      'cargo-expreso': { name: 'Cargo Expreso', fee: 35 },
      'forza':         { name: 'Forza Delivery Express', fee: 35 }
    }
  };

  const $ = (id) => document.getElementById(id);
  const money = (n) => 'Q' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const parseMoney = (t) => { const n = parseFloat(String(t || '').replace(/[^0-9.\-]/g, '')); return isNaN(n) ? 0 : n; };
  const round2 = (n) => Math.round(n * 100) / 100;
  const setText = (el, t) => { if (el && el.textContent !== t) el.textContent = t; };
  const T = CONFIG.freeShippingThreshold;
  let lastOrder = null;

  function selectedCarrierKey() {
    const r = document.querySelector('input[name="courier"]:checked');
    return r && CONFIG.carriers[r.value] ? r.value : CONFIG.defaultCarrier;
  }

  // Regla de negocio: subtotal >= Q300 => envío Q0.00 con cualquier paquetería
  function calcShipping(subtotal, key) {
    const carrier = CONFIG.carriers[key];
    const free = subtotal >= T;
    const cost = (free || subtotal <= 0) ? 0 : carrier.fee;
    return { carrier, free, cost };
  }

  function update() {
    const subtotal = round2(parseMoney($('cartSubtotalAmount') && $('cartSubtotalAmount').textContent));
    const discRow = $('cartDiscountRow');
    const discount = discRow && discRow.style.display !== 'none'
      ? Math.abs(parseMoney($('cartDiscountAmount').textContent)) : 0;
    const s = calcShipping(subtotal, selectedCarrierKey());
    const total = round2(Math.max(0, subtotal - discount) + s.cost);
    const free = subtotal >= T;

    // Tarifas visibles en las opciones de paquetería
    Object.keys(CONFIG.carriers).forEach((k) => {
      const el = document.querySelector('[data-courier-fee="' + k + '"]');
      if (!el) return;
      setText(el, free ? 'Gratis' : money(CONFIG.carriers[k].fee));
      el.classList.toggle('is-free', free);
    });
    setText($('courierFreeNote'), free
      ? '¡Tu pedido califica para envío gratis con cualquier paquetería!'
      : 'Envío gratis desde ' + money(T) + ' en adelante, sin importar la paquetería.');

    // Resumen del checkout
    setText($('checkoutSubtotal'), money(subtotal));
    const dRow = $('checkoutDiscountRow');
    if (dRow) { const hide = !(discount > 0); if (dRow.hidden !== hide) dRow.hidden = hide; setText($('checkoutDiscount'), '-' + money(discount)); }
    setText($('checkoutCourierName'), s.carrier.name);
    setText($('checkoutShipping'), s.free ? 'Gratis (Q0.00)' : money(s.cost));
    setText($('checkoutSummaryTotal'), money(total));

    // Carrito lateral
    setText($('cartShippingAmount'), free ? 'Gratis (Q0.00)' : 'Se calcula en el checkout');
    setText($('cartTotalLabel'), free ? 'Total a Pagar:' : 'Total (sin envío):');

    // Barra de progreso de envío gratis
    const txt = subtotal <= 0 ? 'Envío Gratis desde ' + money(T) + ' en adelante'
      : free ? '¡Listo! Tu pedido tiene envío gratis'
      : 'Te faltan ' + money(round2(T - subtotal)) + ' para tener envío gratis';
    setText($('shippingProgressText'), txt);
    const fill = $('shippingProgressFill');
    const w = (Math.round(Math.min(100, (subtotal / T) * 100) * 10) / 10) + '%'; // mismo formato que serializa el navegador
    if (fill && fill.style.width !== w) fill.style.width = w;
  }

  // Datos de la orden (ubicación + paquetería + montos). Disponible también como NovaShipping.getOrderData()
  function getOrderData() {
    const val = (id) => ($(id) && $(id).value) || '';
    const subtotal = round2(parseMoney($('cartSubtotalAmount') && $('cartSubtotalAmount').textContent));
    const s = calcShipping(subtotal, selectedCarrierKey());
    return {
      departamento: val('checkoutDepartamento'),
      municipio: val('checkoutMunicipio'),
      direccion: val('checkoutDireccion'),
      carrier: s.carrier.name,
      subtotal: subtotal,
      shipping: s.cost,
      freeShipping: s.free,
      total: parseMoney($('checkoutSummaryTotal') && $('checkoutSummaryTotal').textContent)
    };
  }

  // Corrige el umbral antiguo (Q500) que app.js escribe en los textos legales
  function fixLegalText() {
    const body = $('legalModalBody');
    if (!body) return;
    const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
      if (/Q\s?500(\.00)?/.test(n.nodeValue)) {
        n.nodeValue = n.nodeValue.replace(/Q\s?500(\.00)?/g, (m, d) => 'Q300' + (d || ''));
      }
    }
  }

  // Añade paquetería y envío a la confirmación del pedido
  function addOrderNote() {
    const note = $('successPaymentNote');
    if (!note || !lastOrder || note.querySelector('.order-shipping-note')) return;
    const o = lastOrder;
    const esc = (t) => String(t).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
    note.insertAdjacentHTML('beforeend',
      '<div class="order-shipping-note">' +
      (o.municipio ? '<strong>Entrega en:</strong> ' + esc(o.municipio) + ', ' + esc(o.departamento) + '<br>' : '') +
      '<strong>Envío:</strong> ' + esc(o.carrier) + ' — ' + (o.freeShipping ? 'Gratis' : money(o.shipping)) +
      ' · <strong>Total con envío:</strong> ' + money(o.total) + '</div>');
  }

  function init() {
    update();
    fixLegalText();

    const form = $('checkoutForm');
    if (form) form.addEventListener('submit', () => {
      if (!form.checkValidity()) return;
      refresh();
      lastOrder = getOrderData();
    }, true);

    // IMPORTANTE: update() escribe en elementos que este mismo observador vigila. Para evitar un
    // bucle infinito (congelaba la pestaña), se desconecta durante update() y se difiere con setTimeout.
    const targets = ['cartSubtotalAmount', 'cartDiscountAmount', 'cartDiscountRow', 'checkoutSummaryTotal',
      'shippingProgressText', 'shippingProgressFill', 'checkoutModal'].map($).filter(Boolean);
    const opts = { childList: true, characterData: true, subtree: true, attributes: true };
    const watch = () => targets.forEach((el) => updObs.observe(el, opts));
    let timer = null, burst = 0, burstStart = 0;
    const refresh = () => {
      updObs.disconnect();
      try { update(); } finally { watch(); }
    };
    const updObs = new MutationObserver(() => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        const now = Date.now();
        if (now - burstStart > 1000) { burstStart = now; burst = 0; }
        if (++burst > 100) { updObs.disconnect(); console.warn('[shipping] demasiadas actualizaciones; observador detenido'); return; }
        refresh();
      }, 0);
    });
    document.addEventListener('change', (e) => { if (e.target && e.target.name === 'courier') refresh(); });
    watch();
    if ($('legalModalBody')) new MutationObserver(fixLegalText).observe($('legalModalBody'), { childList: true, characterData: true, subtree: true });
    if ($('successPaymentNote')) new MutationObserver(addOrderNote).observe($('successPaymentNote'), { childList: true, characterData: true, subtree: true });
  }

  window.NovaShipping = { CONFIG, calcShipping, getOrderData };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
