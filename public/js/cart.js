/* ============================================================
   ALWAZIR — cart drawer (home + product pages)
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  const drawer = document.querySelector('[data-cart-drawer]');
  const overlay = document.querySelector('[data-cart-overlay]');
  if (!drawer) return;

  const itemsEl = drawer.querySelector('[data-cart-items]');
  const totalEl = drawer.querySelector('[data-cart-total]');
  const form = drawer.querySelector('[data-checkout-form]');
  const clearBtn = drawer.querySelector('[data-cart-clear]');

  function openCart() {
    render();
    drawer.classList.add('open');
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeCart() {
    drawer.classList.remove('open');
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  document.querySelectorAll('[data-cart-open]').forEach((el) => el.addEventListener('click', openCart));
  document.querySelector('[data-cart-close]').addEventListener('click', closeCart);
  overlay.addEventListener('click', closeCart);

  function render() {
    const items = Alwazir.getCart();
    totalEl.textContent = Alwazir.formatMoney(Alwazir.cartTotal());

    if (items.length === 0) {
      itemsEl.innerHTML = '<div class="cart-empty">Your cart is empty.<br>Add a fragrance to begin.</div>';
      form.classList.add('hidden');
      clearBtn.classList.add('hidden');
      return;
    }

    form.classList.remove('hidden');
    clearBtn.classList.remove('hidden');
    itemsEl.innerHTML = items
      .map(
        (it) => `
      <div class="cart-item" data-id="${it.id}">
        ${it.image ? `<img class="cart-item-img" src="${it.image}" alt="">` : `<div class="cart-item-img media-placeholder" style="font-size:1.6rem">${(it.name || '?').charAt(0).toUpperCase()}</div>`}
        <div class="cart-item-info">
          <div class="cart-item-name">${Alwazir.escapeHtml(it.name)}</div>
          <div class="cart-item-price">${Alwazir.formatMoney(it.price)}</div>
          <div class="qty-control">
            <button class="qty-btn" data-qty="-1">&#8722;</button>
            <span class="qty-num">${it.qty}</span>
            <button class="qty-btn" data-qty="+1">+</button>
            <button class="cart-remove" data-remove>Remove</button>
          </div>
        </div>
      </div>`
      )
      .join('');
  }

  itemsEl.addEventListener('click', (e) => {
    const itemEl = e.target.closest('.cart-item');
    if (!itemEl) return;
    const id = itemEl.dataset.id;

    if (e.target.closest('[data-qty]')) {
      const delta = Number(e.target.closest('[data-qty]').dataset.qty);
      const current = Alwazir.getCart().find((it) => it.id === id);
      if (current) {
        Alwazir.updateQty(id, current.qty + delta);
        render();
      }
    } else if (e.target.closest('[data-remove]')) {
      Alwazir.removeFromCart(id);
      render();
    }
  });

  clearBtn.addEventListener('click', () => {
    Alwazir.clearCart();
    render();
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = form.elements.namedItem('name').value.trim();
    const phone = form.elements.namedItem('phone').value.trim();
    if (!name || !phone) return;
    const total = Alwazir.cartTotal();
    const items = Alwazir.getCart();
    const msg = encodeURIComponent(
      `Hello! I'd like to order:\n\n${items.map((i) => `• ${i.name} x${i.qty} — ${Alwazir.formatMoney(i.price * i.qty)}`).join('\n')}\n\nTotal: ${Alwazir.formatMoney(total)}\n\nName: ${name}\nPhone: ${phone}`
    );
    // WhatsApp-order convenience link
    const wa = window.open(`https://wa.me/?text=${msg}`, '_blank');
    Alwazir.toast('Order prepared — confirm via WhatsApp');
    Alwazir.clearCart();
    render();
    if (!wa) {
      itemsEl.innerHTML = `<div class="checkout-success">
        <div class="tick">&#10004;</div>
        <h3>Order received!</h3>
        <p>Thank you, ${Alwazir.escapeHtml(name)}. We'll contact you shortly.</p>
      </div>`;
      form.classList.add('hidden');
      clearBtn.classList.add('hidden');
    }
  });
});
