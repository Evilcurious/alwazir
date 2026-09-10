/* ============================================================
   ALWAZIR — home page logic
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {
  await Alwazir.boot();

  const grid = document.querySelector('[data-grid]');
  const empty = document.querySelector('[data-empty]');
  const searchForm = document.querySelector('[data-search-form]');
  const searchInput = document.querySelector('[data-search-input]');
  const specialSection = document.querySelector('[data-special-section]');

  let products = [];
  let query = '';

  async function fetchProducts() {
    try {
      const res = await fetch('/api/products');
      products = res.ok ? await res.json() : [];
    } catch (e) {
      products = [];
    }
    // expose for add-to-cart resolution
    window.__products = {};
    products.forEach((p) => (window.__products[p.id] = p));
  }

  function filteredProducts() {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q)
    );
  }

  function renderCatalog() {
    const list = filteredProducts();
    grid.innerHTML = list.map((p) => Alwazir.productCardHtml(p)).join('');
    empty.classList.toggle('hidden', list.length > 0);
  }

  function renderSpecial() {
    const special = products.find((p) => p.special);
    if (!special) {
      specialSection.classList.add('hidden');
      return;
    }
    specialSection.classList.remove('hidden');
    const detailsUrl = `/product.html?id=${encodeURIComponent(special.id)}`;
    specialSection.querySelector('[data-special-media]').innerHTML =
      `<a class="special-media-link" href="${detailsUrl}" aria-label="View ${Alwazir.escapeHtml(special.name)} details">${Alwazir.mediaHtml(special)}</a>`;
    specialSection.querySelector('[data-special-name]').textContent = special.name;
    specialSection.querySelector('[data-special-desc]').textContent = special.description || '';
    specialSection.querySelector('[data-special-price]').textContent = Alwazir.formatMoney(special.price);
    const addBtn = specialSection.querySelector('[data-special-add]');
    addBtn.dataset.id = special.id;
    const chatBtn = specialSection.querySelector('[data-special-chat]');
    chatBtn.dataset.id = special.id;
  }

  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    query = searchInput.value;
    renderCatalog();
  });

  searchInput.addEventListener('input', () => {
    query = searchInput.value;
    renderCatalog();
  });

  document.querySelector('[data-year]').textContent = new Date().getFullYear();

  await fetchProducts();
  renderSpecial();
  renderCatalog();
});
