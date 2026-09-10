/* ============================================================
   ALWAZIR — shared storefront logic (theme, cart, rendering)
   ============================================================ */

const Alwazir = (() => {
  let settings = { brandName: 'alwazir', tagline: '', logo: '', currency: '$', theme: 'gold', whatsapp: '923174541414' };

  /* ---------- currency formatting ---------- */
  function formatMoney(price) {
    const symbol = settings.currency || '$';
    const num = Number(price) || 0;
    return `${symbol}${num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  }

  /* ---------- settings & theme ---------- */
  async function loadSettings() {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) settings = { ...settings, ...(await res.json()) };
    } catch (e) {
      /* offline fallback */
    }
    applySettings();
  }

  function applySettings() {
    const body = document.body;
    body.setAttribute('data-theme', settings.theme || 'gold');

    document.querySelectorAll('[data-brand]').forEach((el) => {
      el.textContent = settings.brandName || 'alwazir';
    });
    document.querySelectorAll('[data-logo]').forEach((el) => {
      if (settings.logo) {
        el.src = settings.logo;
        el.classList.remove('hidden');
      } else {
        el.classList.add('hidden');
      }
    });
    document.querySelectorAll('[data-tagline]').forEach((el) => {
      el.textContent = settings.tagline || '';
    });
    const title = document.querySelector('title');
    if (title && !title.dataset.keep) {
      const page = title.dataset.page ? `${title.dataset.page} — ` : '';
      title.textContent = `${page}${settings.brandName || 'alwazir'}`;
    }
  }

  /* ---------- toast ---------- */
  let toastTimer = null;
  function toast(message) {
    let el = document.querySelector('.toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
  }

  /* ---------- cart ---------- */
  const CART_KEY = 'alwazir-cart';

  function loadCart() {
    try {
      const raw = localStorage.getItem(CART_KEY);
      const items = raw ? JSON.parse(raw) : [];
      return Array.isArray(items) ? items : [];
    } catch (e) {
      return [];
    }
  }

  function saveCart(items) {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    renderCartCount();
  }

  function getCart() {
    return loadCart();
  }

  function cartTotal() {
    return loadCart().reduce((sum, it) => sum + it.price * it.qty, 0);
  }

  function addToCart(product, qty = 1) {
    const items = loadCart();
    const existing = items.find((it) => it.id === product.id);
    if (existing) {
      existing.qty += qty;
      // keep the freshest description / image available
      if (product.description) existing.description = product.description;
      if (product.image) existing.image = product.image;
    } else {
      items.push({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        description: product.description || '',
        qty
      });
    }
    saveCart(items);
    toast(`Added "${product.name}" to cart`);
  }

  function updateQty(id, qty) {
    let items = loadCart();
    const item = items.find((it) => it.id === id);
    if (!item) return;
    if (qty <= 0) {
      items = items.filter((it) => it.id !== id);
    } else {
      item.qty = qty;
    }
    saveCart(items);
  }

  function removeFromCart(id) {
    saveCart(loadCart().filter((it) => it.id !== id));
  }

  function clearCart() {
    saveCart([]);
  }

  function renderCartCount() {
    const count = loadCart().reduce((n, it) => n + it.qty, 0);
    document.querySelectorAll('[data-cart-count]').forEach((el) => {
      el.textContent = count;
    });
  }

  /* ---------- product card rendering ---------- */
  function badgeHtml(p) {
    let html = '';
    if (p.popular) html += '<span class="badge badge-popular">&#9733; Popular</span>';
    if (p.special) html += '<span class="badge badge-special">% Special Offer</span>';
    return html;
  }

  function mediaHtml(p, extraClass) {
    if (p.image) {
      return `<img class="${extraClass || ''}" src="${p.image}" alt="${escapeHtml(p.name)}" loading="lazy">`;
    }
    const initial = (p.name || '?').charAt(0).toUpperCase();
    return `<div class="media-placeholder">${initial}</div>`;
  }

  function productCardHtml(p) {
    return `
      <article class="product-card" data-id="${p.id}">
        <div class="product-media">
          ${badgeHtml(p)}
          ${mediaHtml(p)}
        </div>
        <div class="product-body">
          <div class="product-category">${escapeHtml(p.category || 'General')}</div>
          <h3 class="product-name">${escapeHtml(p.name)}</h3>
          <p class="product-desc">${escapeHtml(p.description || '')}</p>
          <div class="product-foot">
            <div class="product-price">${formatMoney(p.price)}</div>
            <div class="product-actions">
              <button class="btn btn-outline" data-action="details" data-id="${p.id}">More Details</button>
              <button class="btn btn-gold" data-action="add" data-id="${p.id}">Add to Cart</button>
            </div>
          </div>
        </div>
      </article>`;
  }

  function miniCardHtml(p) {
    return `
      <article class="mini-card" data-id="${p.id}">
        <a class="mini-media" href="/product.html?id=${encodeURIComponent(p.id)}" aria-label="${escapeHtml(p.name)}">
          ${badgeHtml(p)}
          ${mediaHtml(p)}
        </a>
        <div class="mini-body">
          <div class="product-category">${escapeHtml(p.category || 'General')}</div>
          <h4 class="product-name">${escapeHtml(p.name)}</h4>
          <p class="product-desc">${escapeHtml(p.description || '')}</p>
          <div class="product-price">${formatMoney(p.price)}</div>
          <button class="btn btn-gold" data-action="add" data-id="${p.id}">Add to Cart</button>
        </div>
      </article>`;
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* ---------- delegated actions ---------- */
  function wireActions(root = document) {
    root.addEventListener('click', (e) => {
      const addBtn = e.target.closest('[data-action="add"]');
      const detailsBtn = e.target.closest('[data-action="details"]');
      if (addBtn) {
        e.preventDefault();
        const card = addBtn.closest('[data-id]');
        const product = window.__products && window.__products[card && card.dataset.id];
        if (product) {
          addToCart(product);
          return;
        }
        // fallback: fetch by id
        fetch(`/api/products/${card.dataset.id}`)
          .then((r) => r.json())
          .then((p) => addToCart(p));
        return;
      }
      if (detailsBtn) {
        e.preventDefault();
        const card = detailsBtn.closest('[data-id]');
        window.location.href = `/product.html?id=${encodeURIComponent(card.dataset.id)}`;
      }
    });
  }

  /* ---------- boot ---------- */
  let booted = false;
  async function boot() {
    if (booted) return;
    booted = true;
    await loadSettings();
    renderCartCount();
    wireActions();
  }

  return {
    boot,
    settings: () => settings,
    formatMoney,
    addToCart,
    updateQty,
    removeFromCart,
    clearCart,
    getCart,
    cartTotal,
    loadCart,
    saveCart,
    renderCartCount,
    productCardHtml,
    miniCardHtml,
    mediaHtml,
    badgeHtml,
    escapeHtml,
    toast,
    applySettings
  };
})();

if (typeof window !== 'undefined') {
  window.__products = window.__products || {};
  document.addEventListener('DOMContentLoaded', () => Alwazir.boot());
}
