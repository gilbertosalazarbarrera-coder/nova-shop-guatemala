/**
 * Aplicación de Comercio Electrónico "Shop Style" - Edición Guatemala
 * Sede Oficial y Operaciones: Ciudad de Guatemala, Guatemala.
 * Moneda oficial: Quetzales (GTQ - Q)
 * Método de pago único en Checkout: Transferencia Bancaria / Depósito a BANRURAL (Cuenta de Ahorro No. 4080161041 - IDALMA ODILI BARRERA).
 */

// Función utilitaria para formatear moneda en Quetzales de Guatemala (ej. Q265.00)
function formatMoney(amount) {
  const formatted = Number(amount || 0).toLocaleString('es-GT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return `Q${formatted}`;
}

// Estado global de la aplicación
const AppState = {
  products: [...PRODUCTS_DATA],
  filteredProducts: [...PRODUCTS_DATA],
  cart: [],
  wishlist: new Set(),
  currentCategory: 'all',
  searchQuery: '',
  sortBy: 'featured',
  discountPercent: 0,
  activeCoupon: null,
  freeShippingThreshold: 300.00, // Envío gratis a partir de Q300.00
  selectedPaymentMethod: 'transfer'
};

// Cargar carrito previo de localStorage
function loadPersistedData() {
  try {
    const savedCart = localStorage.getItem('shop_cart_items_gt');
    if (savedCart) {
      AppState.cart = JSON.parse(savedCart);
    }
    const savedWishlist = localStorage.getItem('shop_wishlist_items_gt');
    if (savedWishlist) {
      AppState.wishlist = new Set(JSON.parse(savedWishlist));
    }
  } catch (e) {
    console.error('Error cargando datos locales', e);
  }
}

function saveCartToStorage() {
  try {
    localStorage.setItem('shop_cart_items_gt', JSON.stringify(AppState.cart));
  } catch (e) {
    console.error('Error guardando carrito', e);
  }
}

function saveWishlistToStorage() {
  try {
    localStorage.setItem('shop_wishlist_items_gt', JSON.stringify([...AppState.wishlist]));
  } catch (e) {
    console.error('Error guardando wishlist', e);
  }
}


/* ==========================================================================
   CATÁLOGO ADMINISTRABLE DESDE EL PANEL (data/products.json)
   Si el archivo no carga, se usa el catálogo incluido en js/products.js.
   ========================================================================== */

const CATEGORY_NAMES = {
  audio: 'Audio & Sonido',
  relojes: 'Relojes & Smart',
  tecnologia: 'Tecnología',
  calzado: 'Calzado Urbano',
  accesorios: 'Accesorios de Moda',
  hogar: 'Hogar & Decoración'
};

const PLACEHOLDER_IMAGE = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect width="400" height="400" fill="#f2f4f5"/>' +
  '<text x="200" y="210" font-family="Arial" font-size="22" fill="#787574" text-anchor="middle">Sin imagen</text></svg>');

function normalizeProduct(p, index) {
  const num = (v, d) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
  const clean = (v) => String(v == null ? '' : v).replace(/[<>"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const list = (v) => (Array.isArray(v) ? v.filter((x) => x != null && String(x).trim() !== '').map(clean) : []);
  const name = clean(p.name || 'Producto');
  const slug = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const price = Math.max(0, num(p.price, 0));
  const original = num(p.originalPrice, 0);
  const category = String(p.category || 'accesorios');
  return {
    id: String(p.id || ('prod-' + (slug || index))).replace(/[^A-Za-z0-9_-]/g, '-'),
    name: name,
    brand: clean(p.brand),
    category: category,
    categoryName: CATEGORY_NAMES[category] || clean(p.categoryName) || category,
    price: price,
    originalPrice: original > price ? original : null,
    rating: Math.min(5, Math.max(0, num(p.rating, 0))),
    reviewsCount: Math.max(0, Math.round(num(p.reviewsCount, 0))),
    badge: clean(p.badge),
    isNew: p.isNew === true,
    image: p.image ? String(p.image) : PLACEHOLDER_IMAGE,
    description: clean(p.description),
    features: list(p.features),
    colors: list(p.colors),
    sizes: list(p.sizes),
    stock: Math.max(0, Math.round(num(p.stock, 10)))
  };
}

async function loadCatalogFromCMS() {
  try {
    const res = await fetch('data/products.json?v=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const raw = Array.isArray(data) ? data : data.products;
    if (!Array.isArray(raw)) throw new Error('Formato inesperado');
    const products = raw.filter((p) => p && p.visible !== false).map(normalizeProduct);
    AppState.products = products;
    AppState.filteredProducts = [...products];
    AppState.catalogFromCMS = true;
  } catch (e) {
    console.warn('[Catálogo] Se usa el catálogo de js/products.js:', e.message);
  }
}

// Pone al día el carrito guardado: precios/nombres actuales y quita productos que ya no existen
function syncCartWithCatalog() {
  if (!AppState.catalogFromCMS) return;
  AppState.cart = AppState.cart.filter((item) => AppState.products.some((p) => p.id === item.productId)).map((item) => {
    const p = AppState.products.find((x) => x.id === item.productId);
    return Object.assign({}, item, { name: p.name, price: p.price, image: p.image, brand: p.brand });
  });
  saveCartToStorage();
}

// Inicialización de componentes cuando el DOM está listo
document.addEventListener('DOMContentLoaded', async () => {
  await loadCatalogFromCMS();
  loadPersistedData();
  syncCartWithCatalog();
  renderCategoriesBar();
  applyFiltersAndSort();
  updateCartBadge();
  initEventListeners();
  checkCookieConsent();
  setupNavRailActiveLinks();
  setupPaymentMethodSelector();
});

/* ==========================================================================
   RENDERIZADO DE CATEGORÍAS EN PILL
   ========================================================================== */

function renderCategoriesBar() {
  const container = document.getElementById('categoriesBar');
  if (!container) return;

  container.innerHTML = CATEGORIES_DATA.map(cat => `
    <button class="category-pill ${AppState.currentCategory === cat.id ? 'active' : ''}" 
            data-category="${cat.id}">
      ${getCategoryIcon(cat.icon)}
      <span>${cat.name}</span>
    </button>
  `).join('');

  container.querySelectorAll('.category-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      const catId = btn.getAttribute('data-category');
      AppState.currentCategory = catId;
      
      container.querySelectorAll('.category-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      applyFiltersAndSort();
    });
  });
}

function getCategoryIcon(type) {
  switch (type) {
    case 'grid':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>`;
    case 'headphones':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 18v-6a9 9 0 0 1 18 0v6"></path><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path></svg>`;
    case 'watch':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="7"></circle><polyline points="12 9 12 12 13.5 13.5"></polyline><path d="M16.51 17.35l-.35 3.83a2 2 0 0 1-2 1.82H9.83a2 2 0 0 1-2-1.82l-.35-3.83m.01-10.7l.35-3.83A2 2 0 0 1 9.83 1h4.35a2 2 0 0 1 2 1.82l.35 3.83"></path></svg>`;
    case 'laptop':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>`;
    case 'footprints':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 16v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1M4 12h16M7 8l5-5 5 5"></path></svg>`;
    case 'sparkles':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z"></path></svg>`;
    case 'home':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`;
    default:
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"></circle></svg>`;
  }
}

/* ==========================================================================
   FILTRADO, BÚSQUEDA Y ORDENAMIENTO
   ========================================================================== */

function applyFiltersAndSort() {
  let list = [...AppState.products];

  // Filtro por categoría
  if (AppState.currentCategory !== 'all') {
    list = list.filter(item => item.category === AppState.currentCategory);
  }

  // Filtro por búsqueda de texto
  if (AppState.searchQuery.trim() !== '') {
    const q = AppState.searchQuery.toLowerCase().trim();
    list = list.filter(item => 
      item.name.toLowerCase().includes(q) ||
      item.brand.toLowerCase().includes(q) ||
      item.categoryName.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q)
    );
  }

  // Ordenamiento
  switch (AppState.sortBy) {
    case 'price-low':
      list.sort((a, b) => a.price - b.price);
      break;
    case 'price-high':
      list.sort((a, b) => b.price - a.price);
      break;
    case 'rating':
      list.sort((a, b) => b.rating - a.rating);
      break;
    case 'featured':
    default:
      break;
  }

  AppState.filteredProducts = list;
  renderCatalogGrid();
  updateCatalogCount();
}

/* ==========================================================================
   RENDERIZADO DE TARJETAS DE PRODUCTO (En Quetzales)
   ========================================================================== */

function renderCatalogGrid() {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;

  if (AppState.filteredProducts.length === 0) {
    grid.innerHTML = `
      <div class="empty-state-box">
        <div class="empty-state-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            <line x1="8" y1="11" x2="14" y2="11"></line>
          </svg>
        </div>
        <h3 style="font-size: 1.35rem; margin-bottom: 8px;">No encontramos coincidencias</h3>
        <p class="text-muted" style="margin-bottom: 20px;">
          Intenta ajustar los términos de búsqueda o selecciona otra categoría.
        </p>
        <button class="btn-primary-shop" style="max-width: 240px; margin: 0 auto;" onclick="resetSearchAndFilters()">
          Ver todos los productos
        </button>
      </div>
    `;
    return;
  }

  grid.innerHTML = AppState.filteredProducts.map(product => {
    const isWishlisted = AppState.wishlist.has(product.id);
    const badgeHtml = product.badge ? `
      <span class="product-badge ${product.badge.includes('OFF') ? 'badge-sale' : ''}">
        ${product.badge}
      </span>
    ` : '';

    return `
      <article class="product-card" data-product-id="${product.id}">
        <!-- Contenedor 1:1 con radio 20px y marco blanco -->
        <div class="product-image-container">
          <img src="${product.image}" alt="${product.name}" class="product-image" loading="lazy" />
          ${badgeHtml}
          
          <button class="product-wishlist-btn ${isWishlisted ? 'active' : ''}" 
                  title="${isWishlisted ? 'Quitar de favoritos' : 'Añadir a favoritos'}"
                  onclick="toggleWishlist('${product.id}', event)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
          </button>

          <button class="product-quickview-btn" onclick="openQuickView('${product.id}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
            Vista rápida
          </button>
        </div>

        <!-- Información y Jerarquía Visual -->
        <div class="product-info-wrap">
          <span class="product-brand">${product.brand}</span>
          <h3 class="product-title" title="${product.name}">${product.name}</h3>

          <!-- Calificación de estrellas -->
          ${product.reviewsCount > 0 ? `<div class="product-rating-row">
            <div class="star-rating-stars">
              ${renderStarRating(product.rating)}
            </div>
            <span class="rating-score">${product.rating.toFixed(1)}</span>
            <span class="rating-count">(${product.reviewsCount})</span>
          </div>` : ''}

          <!-- Precios Estrictamente en Quetzales (Q) -->
          <div class="product-pricing-row">
            <span class="product-price-current">${formatMoney(product.price)}</span>
            ${product.originalPrice ? `<span class="product-price-original">${formatMoney(product.originalPrice)}</span>` : ''}
          </div>

          <!-- Botones de Acción Estilo Pill -->
          <div class="product-actions-group">
            <button class="btn-primary-shop" onclick="buyNowDirect('${product.id}')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                <circle cx="9" cy="21" r="1"></circle>
                <circle cx="20" cy="21" r="1"></circle>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
              </svg>
              Comprar ahora
            </button>
            <button class="btn-secondary-shop" onclick="addToCart('${product.id}', 1)">
              Añadir al Carrito
            </button>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

function renderStarRating(rating) {
  let stars = '';
  const fullStars = Math.floor(rating);
  for (let i = 0; i < fullStars; i++) {
    stars += `<svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;
  }
  if (rating % 1 !== 0) {
    stars += `<svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;
  }
  return stars;
}

function updateCatalogCount() {
  const countEl = document.getElementById('catalogCount');
  if (countEl) {
    countEl.textContent = `${AppState.filteredProducts.length} productos`;
  }
}

function resetSearchAndFilters() {
  AppState.searchQuery = '';
  AppState.currentCategory = 'all';
  const searchInput = document.getElementById('searchInput');
  if (searchInput) searchInput.value = '';
  const clearBtn = document.getElementById('searchClearBtn');
  if (clearBtn) clearBtn.classList.remove('visible');
  renderCategoriesBar();
  applyFiltersAndSort();
}

/* ==========================================================================
   CARRITO DE COMPRAS Y GESTIÓN EN QUETZALES (GTQ)
   ========================================================================== */

function addToCart(productId, quantity = 1) {
  const product = AppState.products.find(p => p.id === productId);
  if (!product) return;

  const existingItem = AppState.cart.find(item => item.productId === productId);
  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    AppState.cart.push({
      productId: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      brand: product.brand,
      quantity: quantity
    });
  }

  saveCartToStorage();
  updateCartBadge();
  renderCartDrawer();
  showToast(`"${product.name}" añadido al carrito`);
}

function updateItemQuantity(productId, delta) {
  const itemIndex = AppState.cart.findIndex(i => i.productId === productId);
  if (itemIndex > -1) {
    AppState.cart[itemIndex].quantity += delta;
    if (AppState.cart[itemIndex].quantity <= 0) {
      AppState.cart.splice(itemIndex, 1);
    }
    saveCartToStorage();
    updateCartBadge();
    renderCartDrawer();
  }
}

function removeCartItem(productId) {
  AppState.cart = AppState.cart.filter(item => item.productId !== productId);
  saveCartToStorage();
  updateCartBadge();
  renderCartDrawer();
  showToast('Producto eliminado del carrito');
}

function buyNowDirect(productId) {
  addToCart(productId, 1);
  openCartDrawer();
}

function updateCartBadge() {
  const totalItems = AppState.cart.reduce((sum, item) => sum + item.quantity, 0);
  const badge = document.getElementById('cartCounterBadge');
  if (badge) {
    badge.textContent = totalItems;
    badge.style.display = totalItems > 0 ? 'inline-block' : 'none';
  }
}

function renderCartDrawer() {
  const itemsContainer = document.getElementById('cartDrawerItems');
  const subtotalEl = document.getElementById('cartSubtotalAmount');
  const discountRow = document.getElementById('cartDiscountRow');
  const discountEl = document.getElementById('cartDiscountAmount');
  const totalEl = document.getElementById('cartTotalAmount');
  const progressText = document.getElementById('shippingProgressText');
  const progressFill = document.getElementById('shippingProgressFill');

  if (!itemsContainer) return;

  if (AppState.cart.length === 0) {
    itemsContainer.innerHTML = `
      <div class="cart-empty-message">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" width="60" height="60" style="margin: 0 auto 12px; color: var(--muted-gray);">
          <circle cx="9" cy="21" r="1"></circle>
          <circle cx="20" cy="21" r="1"></circle>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
        </svg>
        <p style="font-weight: 600; font-size: 1.05rem; margin-bottom: 6px; color: var(--ink-black);">Tu carrito está vacío</p>
        <p style="font-size: 0.88rem;">Explora nuestro catálogo en Quetzales y añade tus artículos favoritos.</p>
      </div>
    `;
    if (subtotalEl) subtotalEl.textContent = formatMoney(0);
    if (totalEl) totalEl.textContent = formatMoney(0);
    if (discountRow) discountRow.style.display = 'none';
    if (progressText) progressText.innerHTML = `<span>Agrega ${formatMoney(AppState.freeShippingThreshold)} para obtener <strong>Envío Gratis en Guatemala</strong></span>`;
    if (progressFill) progressFill.style.width = '0%';
    return;
  }

  // Renderizar items con formato Quetzales
  itemsContainer.innerHTML = AppState.cart.map(item => `
    <div class="cart-item-card">
      <img src="${item.image}" alt="${item.name}" class="cart-item-img" />
      <div class="cart-item-details">
        <h4 class="cart-item-name">${item.name}</h4>
        <div class="cart-item-price">${formatMoney(item.price * item.quantity)}</div>
        <div class="cart-item-qty-row">
          <div class="qty-control-pill">
            <button class="qty-btn" onclick="updateItemQuantity('${item.productId}', -1)">-</button>
            <span class="qty-number">${item.quantity}</span>
            <button class="qty-btn" onclick="updateItemQuantity('${item.productId}', 1)">+</button>
          </div>
          <button class="cart-item-remove-btn" onclick="removeCartItem('${item.productId}')" title="Eliminar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `).join('');

  // Cálculos en Quetzales
  const subtotal = AppState.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discount = subtotal * (AppState.discountPercent / 100);
  const total = Math.max(0, subtotal - discount);

  if (subtotalEl) subtotalEl.textContent = formatMoney(subtotal);
  
  if (discountRow) {
    if (discount > 0) {
      discountRow.style.display = 'flex';
      discountEl.textContent = `-${formatMoney(discount)} (${AppState.discountPercent}%)`;
    } else {
      discountRow.style.display = 'none';
    }
  }

  if (totalEl) totalEl.textContent = formatMoney(total);

  // Barra de progreso de envío gratis
  if (progressText && progressFill) {
    if (subtotal >= AppState.freeShippingThreshold) {
      progressText.innerHTML = `🎉 <strong>¡Felicitaciones! Tienes Envío Gratis en toda Guatemala.</strong>`;
      progressFill.style.width = '100%';
    } else {
      const remaining = AppState.freeShippingThreshold - subtotal;
      const percent = Math.min(100, Math.round((subtotal / AppState.freeShippingThreshold) * 100));
      progressText.innerHTML = `Faltan <strong>${formatMoney(remaining)}</strong> para <strong>Envío Gratis en Guatemala</strong>`;
      progressFill.style.width = `${percent}%`;
    }
  }
}

function openCartDrawer() {
  renderCartDrawer();
  const drawerOverlay = document.getElementById('cartDrawerOverlay');
  if (drawerOverlay) drawerOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCartDrawer() {
  const drawerOverlay = document.getElementById('cartDrawerOverlay');
  if (drawerOverlay) drawerOverlay.classList.remove('open');
  document.body.style.overflow = '';
}

function applyCouponCode() {
  const input = document.getElementById('couponCodeInput');
  if (!input) return;
  const code = input.value.trim().toUpperCase();

  if (code === 'SHOP10') {
    AppState.discountPercent = 10;
    AppState.activeCoupon = 'SHOP10';
    showToast('¡Cupón SHOP10 aplicado con éxito! 10% de descuento.');
    renderCartDrawer();
    input.value = '';
  } else if (code === 'GUATE20') {
    AppState.discountPercent = 20;
    AppState.activeCoupon = 'GUATE20';
    showToast('¡Cupón GUATE20 aplicado con éxito! 20% de descuento.');
    renderCartDrawer();
    input.value = '';
  } else {
    showToast('Cupón no válido. Prueba "SHOP10" o "GUATE20"');
  }
}

/* ==========================================================================
   WISHLIST / FAVORITOS
   ========================================================================== */

function toggleWishlist(productId, event) {
  if (event) event.stopPropagation();

  if (AppState.wishlist.has(productId)) {
    AppState.wishlist.delete(productId);
    showToast('Eliminado de favoritos');
  } else {
    AppState.wishlist.add(productId);
    showToast('Añadido a tus favoritos');
  }

  saveWishlistToStorage();
  renderCatalogGrid();
}

/* ==========================================================================
   VISTA RÁPIDA (QUICK VIEW MODAL EN QUETZALES)
   ========================================================================== */

function openQuickView(productId) {
  const product = AppState.products.find(p => p.id === productId);
  if (!product) return;

  const modalContainer = document.getElementById('quickViewContent');
  if (!modalContainer) return;

  modalContainer.innerHTML = `
    <div class="quickview-grid">
      <div class="quickview-img-box">
        <img src="${product.image}" alt="${product.name}" />
      </div>
      <div>
        <span class="product-brand">${product.brand}</span>
        <h2 style="font-size: 1.5rem; margin-bottom: 8px;">${product.name}</h2>
        
        ${product.reviewsCount > 0 ? `<div class="product-rating-row" style="margin-bottom: 14px;">
          <div class="star-rating-stars">
            ${renderStarRating(product.rating)}
          </div>
          <span class="rating-score">${product.rating.toFixed(1)}</span>
          <span class="rating-count">(${product.reviewsCount} reseñas verificadas)</span>
        </div>` : ''}

        <div class="product-pricing-row" style="margin-bottom: 16px;">
          <span class="product-price-current">${formatMoney(product.price)}</span>
          ${product.originalPrice ? `<span class="product-price-original">${formatMoney(product.originalPrice)}</span>` : ''}
        </div>

        <p class="text-muted" style="margin-bottom: 20px; font-size: 0.92rem; line-height: 1.6;">
          ${product.description}
        </p>

        <div style="margin-bottom: 20px;">
          <h4 style="font-size: 0.88rem; font-weight: 700; margin-bottom: 8px;">Características destacadas:</h4>
          <ul style="font-size: 0.85rem; padding-left: 18px; color: #4b5563; line-height: 1.6;">
            ${product.features.map(f => `<li>${f}</li>`).join('')}
          </ul>
        </div>

        <div style="display: flex; gap: 10px; margin-top: 24px;">
          <button class="btn-primary-shop" style="flex: 1;" onclick="addToCart('${product.id}', 1); closeQuickView();">
            Añadir al Carrito
          </button>
          <button class="btn-secondary-shop" style="width: auto; padding: 12px;" onclick="toggleWishlist('${product.id}'); closeQuickView();" title="Guardar">
            <svg viewBox="0 0 24 24" fill="${AppState.wishlist.has(product.id) ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" width="18" height="18">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `;

  const modal = document.getElementById('quickViewModal');
  if (modal) modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeQuickView() {
  const modal = document.getElementById('quickViewModal');
  if (modal) modal.classList.remove('open');
  document.body.style.overflow = '';
}

/* ==========================================================================
   CHECKOUT ESPECÍFICO PARA GUATEMALA (Método Único: Transferencia / Depósito Banrural)
   ========================================================================== */

function setupPaymentMethodSelector() {
  const radios = document.querySelectorAll('input[name="paymentMethod"]');
  radios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      AppState.selectedPaymentMethod = e.target.value;
      updatePaymentPanelsDisplay(e.target.value);
    });
  });
}

function updatePaymentPanelsDisplay(method = 'transfer') {
  const transferPanel = document.getElementById('panelTransferPayment');
  if (transferPanel) transferPanel.style.display = 'block';

  const transferInput = document.getElementById('transferBoletaInput');
  if (transferInput) {
    transferInput.required = true;
  }
}

function openCheckoutModal() {
  if (AppState.cart.length === 0) {
    showToast('Tu carrito está vacío. Agrega productos antes de proceder.');
    return;
  }
  closeCartDrawer();
  
  const total = AppState.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discount = total * (AppState.discountPercent / 100);
  const finalTotal = Math.max(0, total - discount);

  const totalDisplay = document.getElementById('checkoutSummaryTotal');
  if (totalDisplay) totalDisplay.textContent = formatMoney(finalTotal);

  updatePaymentPanelsDisplay('transfer');

  const modal = document.getElementById('checkoutModal');
  if (modal) modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCheckoutModal() {
  const modal = document.getElementById('checkoutModal');
  if (modal) modal.classList.remove('open');
  document.body.style.overflow = '';
}

function processCheckoutOrder(event) {
  event.preventDefault();

  // Validación estricta y obligatoria de aceptación de Términos y Condiciones y Privacidad
  const termsCheckbox = document.getElementById('acceptLegalTermsCheckbox');
  if (!termsCheckbox || !termsCheckbox.checked) {
    showToast('Debes aceptar obligatoriamente los Términos y Condiciones y la Política de Privacidad.');
    if (termsCheckbox) termsCheckbox.focus();
    return;
  }

  // Validación de nombre del depositante
  const nombreDepositante = document.getElementById('transferNombreDepositante');
  if (nombreDepositante && !nombreDepositante.value.trim()) {
    showToast('Por favor ingresa el nombre de quien realiza el depósito.');
    nombreDepositante.focus();
    return;
  }

  // Validación obligatoria del número de boleta o transferencia bancaria
  const boletaInput = document.getElementById('transferBoletaInput');
  if (!boletaInput || !boletaInput.value.trim()) {
    showToast('Por favor ingresa el número de boleta o transferencia bancaria.');
    if (boletaInput) boletaInput.focus();
    return;
  }
  
  const submitBtn = document.getElementById('checkoutSubmitBtn');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
      <svg class="animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18" style="animation: spin 1s linear infinite;">
        <circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-linecap="round"></circle>
      </svg>
      Validando comprobante Banrural...
    `;
  }

  // Simulación de procesamiento
  setTimeout(() => {
    const orderNumber = 'GT-' + Math.floor(100000 + Math.random() * 900000);
    
    // Limpiar carrito
    AppState.cart = [];
    AppState.discountPercent = 0;
    AppState.activeCoupon = null;
    saveCartToStorage();
    updateCartBadge();
    
    closeCheckoutModal();
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Confirmar y Finalizar Pedido';
    }

    // Mostrar confirmación
    showOrderConfirmationModal(orderNumber, 'transfer');
  }, 1400);
}

function showOrderConfirmationModal(orderNumber, method = 'transfer') {
  const modal = document.getElementById('orderSuccessModal');
  const orderNumberEl = document.getElementById('successOrderNumber');
  const methodNoteEl = document.getElementById('successPaymentNote');
  
  if (orderNumberEl) orderNumberEl.textContent = orderNumber;

  if (methodNoteEl) {
    methodNoteEl.innerHTML = `
      <strong>Transferencia / Depósito a BANRURAL registrado:</strong><br />
      Hemos registrado tu reporte para la <strong>Cuenta de Ahorro No. 4080161041</strong> a nombre de <strong>IDALMA ODILI BARRERA</strong>. 
      Nuestro equipo contable en Ciudad de Guatemala validará la boleta y procederá con el empaque y despacho inmediato de tu orden.
    `;
  }

  if (modal) modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeOrderSuccessModal() {
  const modal = document.getElementById('orderSuccessModal');
  if (modal) modal.classList.remove('open');
  document.body.style.overflow = '';
  applyFiltersAndSort();
}

/* ==========================================================================
   MÓDULOS LEGALES OBLIGATORIOS (Adaptados a Ciudad de Guatemala, Guatemala)
   ========================================================================== */

const LEGAL_DOCS = {
  terms: {
    title: "Términos y Condiciones Generales de Uso (Guatemala)",
    updated: "Noviembre 2026",
    content: `
      <div class="legal-badge-verified">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        Sede Oficial y Domicilio Fiscal: Ciudad de Guatemala, Guatemala
      </div>

      <h3>1. Identificación Mercantil y Sede de Operaciones</h3>
      <p>
        El presente contrato mercantil regula las transacciones en este sitio web, propiedad y operación exclusiva de 
        <strong>NOVA COMMERCE SOLUTIONS DE GUATEMALA, S.A.</strong> (en adelante "La Empresa"), entidad legalmente constituida 
        bajo las leyes de la República de Guatemala, inscrita en el Registro Mercantil General de la República bajo el 
        número de registro 129482, folio 182, libro 89 de Sociedades Mercantiles, e identificada ante la Superintendencia 
        de Administración Tributaria (SAT) con el <strong>NIT: 10482910-4</strong>.
      </p>
      <p>
        <strong>Domicilio Fiscal y Sede Principal de Operaciones:</strong><br />
        Diagonal 6, 10-01 Zona 10, Centro Gerencial Las Margaritas, Torre II, Nivel 12, Ciudad de Guatemala, Guatemala.<br />
        Teléfono corporativo: +502 2339-4820 | Correo: soporte@tiendanovacomerce.com.
      </p>

      <h3>2. Legislación Aplicable y Protección al Consumidor (DIACO)</h3>
      <p>
        Las presentes condiciones se rigen expresamente por las leyes de la República de Guatemala, en especial por el 
        <strong>Código de Comercio de Guatemala (Decreto Número 2-70)</strong>, el Código Civil (Decreto Ley 106) y la 
        <strong>Ley de Protección al Consumidor y Usuario (Decreto Número 06-2003 del Congreso de la República de Guatemala)</strong>, 
        bajo la supervisión y competencia administrativa de la Dirección de Atención y Asistencia al Consumidor (DIACO).
      </p>

      <h3>3. Moneda de Curso Legal y Formación de Precios</h3>
      <p>
        Todos los precios, costos de transporte y cargos adicionales se encuentran expresados y facturados en 
        <strong>Quetzales (GTQ - Q)</strong>, moneda de curso legal de la República de Guatemala, e incluyen el 
        Impuesto al Valor Agregado (IVA - 12%) conforme a la legislación tributaria guatemalteca. Se emitirá la correspondiente 
        Factura Electrónica en Línea (FEL) certificada por la SAT por cada compraventa realizada.
      </p>

      <h3>4. Método de Pago Único Oficial en Guatemala</h3>
      <p>
        Para garantizar la máxima transparencia, seguridad y trazabilidad en el territorio guatemalteco, el sitio opera bajo la modalidad de 
        <strong>pago único mediante Transferencia Bancaria o Depósito Monetario</strong> a la cuenta oficial autorizada:
      </p>
      <ul>
        <li><strong>Banco:</strong> BANRURAL</li>
        <li><strong>Tipo de Cuenta:</strong> Cuenta de Ahorro en Quetzales</li>
        <li><strong>Número de Cuenta:</strong> 4080161041</li>
        <li><strong>Nombre del Titular:</strong> IDALMA ODILI BARRERA</li>
      </ul>
      <p>
        El cliente deberá ingresar obligatoriamente en el formulario de compra el nombre de la persona que efectúa el depósito y el número 
        de boleta física o de transferencia electrónica, con la posibilidad de adjuntar la captura del comprobante o remitirlo vía WhatsApp (+502 3257-8665). 
        Ningún paquete será despachado de bodega sin la verificación y conciliación previa del depósito.
      </p>

      <h3>5. Limitación de Responsabilidad y Garantías</h3>
      <p>
        La Empresa responderá por la entrega efectiva y el óptimo funcionamiento técnico de los bienes comercializados conforme a las 
        especificaciones oficiales de los fabricantes. La responsabilidad patrimonial máxima quedará circunscrita al monto total facturado en Quetzales.
      </p>

      <h3>6. Jurisdicción y Resolución de Conflictos</h3>
      <p>
        Las partes renuncian expresamente al fuero de sus respectivos domicilios y se someten irrevocablemente a la jurisdicción de 
        los tribunales y juzgados competentes de la <strong>Ciudad de Guatemala, Guatemala</strong>, o a las instancias de mediación 
        dispuestas por la DIACO.
      </p>
    `
  },
  privacy: {
    title: "Política de Privacidad y Protección de Datos Personales (Guatemala)",
    updated: "Noviembre 2026",
    content: `
      <div class="legal-badge-verified">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        Sede: Ciudad de Guatemala, Guatemala — Cumplimiento Ley de Acceso a la Información
      </div>

      <h3>1. Responsable del Tratamiento y Datos de Contacto</h3>
      <p>
        El responsable del tratamiento de los datos personales es <strong>NOVA COMMERCE SOLUTIONS DE GUATEMALA, S.A.</strong>, 
        sociedad mercantil con sede y domicilio fiscal en la Ciudad de Guatemala, Guatemala (NIT 10482910-4). 
        Canal oficial de privacidad: <strong>privacidad@tiendanovacomerce.com</strong>.
      </p>

      <h3>2. Datos Personales Recabados</h3>
      <p>Recopilamos únicamente los datos necesarios para perfeccionar la entrega y facturación en el territorio guatemalteco:</p>
      <ul>
        <li><strong>Datos de Identificación y Facturación:</strong> Nombre completo, NIT (o Consumidor Final - C/F), número de Documento Personal de Identificación (DPI).</li>
        <li><strong>Datos de Envío y Contacto:</strong> Dirección exacta de entrega (indicando Zona, Municipio o Departamento de Guatemala), correo electrónico y número de teléfono celular (código de área +502).</li>
        <li><strong>Datos de Transacción:</strong> Referencia bancaria, número de boleta de depósito o token seguro de la pasarela de pagos.</li>
      </ul>

      <h3>3. Finalidades del Tratamiento</h3>
      <ul>
        <li>Emisión y certificación de la Factura Electrónica en Línea (FEL) ante la SAT de Guatemala.</li>
        <li>Coordinación de la logística y entrega de paquetes mediante mensajería propia en la Ciudad de Guatemala o empresas transportadoras autorizadas a nivel nacional (Cargo Expreso, Guatex, Forzatec).</li>
        <li>Gestión de atención al cliente, consultas vía WhatsApp y garantías de producto.</li>
      </ul>

      <h3>4. Derechos del Titular y Confidencialidad</h3>
      <p>
        El usuario puede solicitar en todo momento la actualización, corrección o eliminación de sus datos de contacto remitiendo 
        un mensaje a <strong>privacidad@tiendanovacomerce.com</strong>. No vendemos ni cedemos sus datos a terceros para mercadeo o publicidad no deseada.
      </p>

      <h3>5. Seguridad Tecnológica</h3>
      <p>
        Nuestra infraestructura emplea certificados SSL/TLS con encriptación de 256 bits y almacenamiento restringido para evitar accesos no autorizados.
      </p>
    `
  },
  shipping: {
    title: "Política de Envíos, Garantías y Devoluciones (Guatemala)",
    updated: "Noviembre 2026",
    content: `
      <div class="legal-badge-verified">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        Cobertura en Ciudad de Guatemala y los 22 Departamentos
      </div>

      <h3>1. Cobertura y Tiempos de Entrega</h3>
      <p>
        Realizamos entregas seguras en toda la República de Guatemala:
      </p>
      <ul>
        <li><strong>Ciudad de Guatemala (Zonas 1 a 21):</strong> 24 a 48 horas hábiles mediante mensajería directa con pago previo verificado por transferencia o depósito a cuenta de ahorro Banrural.</li>
        <li><strong>Municipios del Departamento de Guatemala:</strong> Mixco, Villa Nueva, Santa Catarina Pinula, San Miguel Petapa, Fraijanes, San José Pinula (24 a 48 horas).</li>
        <li><strong>Departamentos del Interior:</strong> Quetzaltenango, Escuintla, Sacatepéquez (Antigua Guatemala), Chimaltenango, Alta Verapaz, Petén, Izabal, Huehuetenango, etc., en 48 a 72 horas hábiles a través de Cargo Expreso, Guatex o Forza Delivery Express.</li>
        <li><strong>Envío Gratuito:</strong> Aplica automáticamente en todas las compras a partir de <strong>Q300.00</strong> a cualquier punto del país.</li>
      </ul>

      <h3>2. Derecho de Retracto y Garantía de Satisfacción</h3>
      <p>
        En cumplimiento con los estándares de protección al consumidor de la DIACO, el comprador cuenta con 
        <strong>treinta (30) días calendario</strong> a partir de la recepción para solicitar el cambio de producto o la devolución de su dinero si el artículo no cumple sus expectativas.
      </p>
      <p><strong>Condiciones indispensables:</strong></p>
      <ul>
        <li>El producto debe encontrarse sin uso, en su empaque original sellado, con todos sus manuales, plásticos y accesorios.</li>
        <li>Presentar la Factura Electrónica FEL o comprobante digital de compra emitido por Nova Shop.</li>
      </ul>

      <h3>3. Cobertura de Garantía por Defectos de Fábrica</h3>
      <ul>
        <li><strong>Línea de Tecnología, Audio y Relojería:</strong> 12 meses de garantía directa.</li>
        <li><strong>Calzado, Mochilas y Accesorios:</strong> 90 días calendario de garantía.</li>
      </ul>

      <h3>4. Procedimiento de Reembolso</h3>
      <p>
        Los reembolsos aprobados se procesarán en un plazo de <strong>3 a 5 días hábiles</strong> mediante transferencia bancaria a la cuenta en Quetzales indicada por el titular de la compra.
      </p>
    `
  }
};

function openLegalModal(tabName = 'terms') {
  const modal = document.getElementById('legalModal');
  if (!modal) return;

  switchLegalTab(tabName);
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeLegalModal() {
  const modal = document.getElementById('legalModal');
  if (modal) modal.classList.remove('open');
  document.body.style.overflow = '';
}

function switchLegalTab(tabKey) {
  const doc = LEGAL_DOCS[tabKey];
  if (!doc) return;

  document.querySelectorAll('.legal-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabKey);
  });

  const titleEl = document.getElementById('legalModalTitle');
  const bodyEl = document.getElementById('legalModalBody');

  if (titleEl) titleEl.textContent = doc.title;
  if (bodyEl) {
    bodyEl.innerHTML = `
      <div class="legal-doc-content">
        ${doc.content}
        <div style="margin-top: 32px; padding-top: 18px; border-top: 1px solid var(--faint-border); font-size: 0.8rem; color: var(--muted-gray); display: flex; justify-content: space-between; align-items: center;">
          <span>Sede Oficial: Ciudad de Guatemala, Guatemala — ${doc.updated}</span>
          <button class="action-pill-btn" onclick="window.print()" style="padding: 6px 14px; font-size: 0.75rem;">
            Imprimir copia oficial
          </button>
        </div>
      </div>
    `;
  }
}

/* ==========================================================================
   AVISO FLOTANTE DE COOKIES (LocalStorage)
   ========================================================================== */

function checkCookieConsent() {
  const consent = localStorage.getItem('shop_cookies_consent');
  const banner = document.getElementById('cookieNoticeBanner');
  if (!consent && banner) {
    setTimeout(() => {
      banner.classList.add('show');
    }, 1200);
  }
}

function acceptAllCookies() {
  localStorage.setItem('shop_cookies_consent', 'accepted_all');
  const banner = document.getElementById('cookieNoticeBanner');
  if (banner) banner.classList.remove('show');
  showToast('Preferencias de cookies guardadas.');
}

function acceptEssentialCookies() {
  localStorage.setItem('shop_cookies_consent', 'essential_only');
  const banner = document.getElementById('cookieNoticeBanner');
  if (banner) banner.classList.remove('show');
  showToast('Solo se activaron cookies técnicas esenciales.');
}

/* ==========================================================================
   WHATSAPP BOTÓN FLOTANTE CON CÓDIGO DE GUATEMALA (+502)
   ========================================================================== */

function toggleWhatsAppBubble() {
  const bubble = document.getElementById('whatsappChatBubble');
  if (bubble) {
    bubble.classList.toggle('open');
  }
}

function closeWhatsAppBubble(event) {
  if (event) event.stopPropagation();
  const bubble = document.getElementById('whatsappChatBubble');
  if (bubble) {
    bubble.classList.remove('open');
  }
}

function launchWhatsAppChat(customMessage = '') {
  const phone = '50232578665'; // Número oficial de Guatemala (+502 3257-8665)
  const defaultText = customMessage || 'Hola, estoy interesado en sus productos y quiero más información.';
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(defaultText)}`;
  window.open(url, '_blank');
}

/* ==========================================================================
   TOAST NOTIFICATIONS
   ========================================================================== */

function showToast(message) {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast-item toast-success';
  toast.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="18" height="18">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    toast.style.transition = 'all 0.25s ease';
    setTimeout(() => toast.remove(), 250);
  }, 3200);
}

/* ==========================================================================
   NAVEGACIÓN LATERAL ACTIVA (Nav Rail)
   ========================================================================== */

function setupNavRailActiveLinks() {
  const links = document.querySelectorAll('.nav-rail-link');
  links.forEach(link => {
    link.addEventListener('click', () => {
      links.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
    });
  });
}

/* ==========================================================================
   INICIALIZACIÓN DE EVENT LISTENERS
   ========================================================================== */

function initEventListeners() {
  // Input de búsqueda
  const searchInput = document.getElementById('searchInput');
  const searchClearBtn = document.getElementById('searchClearBtn');
  const searchForm = document.getElementById('searchPillForm');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      AppState.searchQuery = e.target.value;
      if (searchClearBtn) {
        searchClearBtn.classList.toggle('visible', e.target.value.length > 0);
      }
      applyFiltersAndSort();
    });
  }

  if (searchClearBtn) {
    searchClearBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      searchClearBtn.classList.remove('visible');
      AppState.searchQuery = '';
      applyFiltersAndSort();
      if (searchInput) searchInput.focus();
    });
  }

  if (searchForm) {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      applyFiltersAndSort();
      const catalogSection = document.getElementById('catalogSection');
      if (catalogSection) {
        catalogSection.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  // Ordenamiento
  const sortSelect = document.getElementById('catalogSortSelect');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      AppState.sortBy = e.target.value;
      applyFiltersAndSort();
    });
  }

  // Cerrar modales con Escape
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeCartDrawer();
      closeQuickView();
      closeLegalModal();
      closeCheckoutModal();
      closeOrderSuccessModal();
    }
  });

  // Mostrar mensaje de bienvenida proactivo en WhatsApp tras 6 segundos
  setTimeout(() => {
    const bubble = document.getElementById('whatsappChatBubble');
    if (bubble && !bubble.classList.contains('open')) {
      bubble.classList.add('open');
    }
  }, 6000);
}
