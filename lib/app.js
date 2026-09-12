const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');

const store = require('./store');
/* Shared with the browser (public/js/theme-colors.js): derives the CSS variables
   for the admin's two-colour theme, so the colours can be injected pre-paint. */
const themeColors = require('../public/js/theme-colors');

const ROOT = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const VIEWS_DIR = path.join(ROOT, 'views');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', true); // use X-Forwarded-Proto for absolute URLs
app.use(express.json({ limit: '2mb' }));

/* ---------- uploads ---------- */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /^image\/(jpe?g|png|webp|gif|avif)$/i.test(file.mimetype);
    if (ok) cb(null, true);
    else {
      const err = new Error('Only image files are allowed');
      err.status = 400;
      cb(err);
    }
  }
});

/* ---------- helpers ---------- */
function publicSettings(db) {
  const { adminKey, ...pub } = db.settings;
  return pub;
}

function sortedProducts(list) {
  return [...list].sort((a, b) => {
    if (!!a.popular !== !!b.popular) return a.popular ? -1 : 1;
    return (b.createdAt || 0) - (a.createdAt || 0);
  });
}

function sanitizeVariants(input) {
  const list = Array.isArray(input) ? input : [];
  const byMl = new Map();
  for (const raw of list) {
    if (!raw || typeof raw !== 'object') continue;
    const ml = Number(raw.ml);
    const price = Number(raw.price);
    if (!Number.isFinite(ml) || ml <= 0) continue;
    if (!Number.isFinite(price) || price < 0) continue;
    // one entry per size — the last one wins if a size is entered twice
    byMl.set(Math.round(ml * 100) / 100, Math.round(price * 100) / 100);
  }
  return [...byMl.entries()]
    .sort((a, b) => a[0] - b[0]) // smallest size first
    .map(([ml, price]) => ({ ml, price }));
}

function sanitizeProduct(input, existing = {}) {
  const name = (input.name || '').toString().trim();
  if (!name) throw new Error('Product name is required');

  const variants = sanitizeVariants(input.variants);

  let price = Number(input.price);
  if (!Number.isFinite(price) || price < 0) {
    if (!variants.length) throw new Error('Price must be a positive number');
    price = variants[0].price; // no base price typed — derive it from the smallest size
  }
  // With sizes, the price shown on cards / special offers is the smallest size's price.
  if (variants.length) price = variants[0].price;

  return {
    id: existing.id || crypto.randomUUID(),
    name,
    category: (input.category || '').toString().trim() || 'General',
    description: (input.description || '').toString().trim(),
    price,
    variants,
    image: (input.image || existing.image || '').toString().trim(),
    popular: !!input.popular,
    special: !!input.special,
    createdAt: existing.createdAt || Date.now()
  };
}

/* ---------- server-rendered pages (settings injected to avoid theme flash) ---------- */
const PAGES = {
  '/': 'index.html',
  '/index.html': 'index.html',
  '/product.html': 'product.html',
  '/admin': 'admin.html',
  '/admin.html': 'admin.html'
};

const THEME_BG = {
  gold: '#ffffff', rose: '#ffffff', emerald: '#ffffff', royal: '#ffffff',
  ivory: '#fbf7ef', midnight: '#10130f', dark: '#0a0e0b', bw: '#0a0a0a',
  blackemerald: '#060a08', silveremerald: '#f2f4f5'
};

function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function absoluteUrl(req, value) {
  if (!value) return '';
  const v = String(value).trim();
  if (/^https?:\/\//i.test(v)) return v;
  const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'https').split(',')[0].trim();
  const host = req.get('host');
  if (!host) return v;
  return proto + '://' + host + (v.charAt(0) === '/' ? v : '/' + v);
}

/* Open Graph / link-preview tags: show the brand logo + name when the site
   link is shared on WhatsApp, Facebook, Twitter, etc. */
function ogMeta(db, req) {
  const s = db.settings || {};
  const title = (s.shareTitle || s.brandName || 'alwazir').toString();
  const desc = (s.shareDescription || s.tagline || '').toString();
  const image = absoluteUrl(req, s.shareImage || s.logo || '');
  let out = '<meta property="og:type" content="website">';
  out += '<meta property="og:site_name" content="' + escapeHtml(s.brandName || 'alwazir') + '">';
  out += '<meta property="og:title" content="' + escapeHtml(title) + '">';
  if (desc) out += '<meta property="og:description" content="' + escapeHtml(desc) + '">';
  if (image) out += '<meta property="og:image" content="' + escapeHtml(image) + '">';
  out += '<meta name="twitter:card" content="summary_large_image">';
  out += '<meta name="twitter:title" content="' + escapeHtml(title) + '">';
  if (desc) out += '<meta name="twitter:description" content="' + escapeHtml(desc) + '">';
  if (image) out += '<meta name="twitter:image" content="' + escapeHtml(image) + '">';
  return out;
}

function preloadScript(db) {
  const pub = publicSettings(db);
  const json = JSON.stringify(pub).replace(/</g, '\\u003c');
  // Custom two-colour theme: inject the derived variables so the whole palette
  // (not just the background) is right on the very first paint.
  const custom = pub.theme === 'custom' ? pub.customColors || {} : null;
  const customStyle = custom
    ? '<style>' +
      themeColors.styleText(custom.bg, custom.accent) +
      '</style>'
    : '';
  // Background color per theme so the page never flashes white/unstyled
  // before the stylesheet arrives.
  const bg = custom
    ? themeColors.normalizeHex(custom.bg, themeColors.DEFAULT_CUSTOM.bg)
    : THEME_BG[pub.theme] || '#ffffff';
  return (
    customStyle +
    '<style>html{background:' + bg + ';}</style>' +
    '<script>(function(){try{' +
    'window.__ALWAZIR_SETTINGS__=' + json + ';' +
    'var s=window.__ALWAZIR_SETTINGS__||{},d=document.documentElement;' +
    'd.setAttribute("data-theme",s.theme||"gold");' +
    'd.setAttribute("data-mobile-columns",s.mobileColumns==="single"?"single":"double");' +
    'if(s.fontFamily&&s.fontFamily!=="default")d.setAttribute("data-font",s.fontFamily);else d.removeAttribute("data-font");' +
    'if(s.brandFont&&s.brandFont!=="default")d.setAttribute("data-brand-font",s.brandFont);else d.removeAttribute("data-brand-font");' +
    'd.setAttribute("data-bold",s.textBold?"true":"false");' +
    '}catch(e){}})();</script>'
  );
}

async function renderPage(file, req) {
  const html = fs.readFileSync(path.join(VIEWS_DIR, file), 'utf8');
  const db = await store.getData();
  const logo = (db.settings && db.settings.logo) || '/img/seed/logo.png';
  // Point the favicon (browser tab icon) at the current brand logo so it
  // updates when the admin uploads a new logo.
  const withFavicon = html.replace(
    /(<link[^>]+rel=["']icon["'][^>]*href=["'])[^"']*(["'])/i,
    '$1' + escapeHtml(logo) + '$2'
  );
  // Inject into <head> so the theme is set on <html> before any visible
  // content is painted (prevents the theme flash on refresh), plus the
  // Open Graph tags for link previews. Injected at the end of <head> so the
  // custom-theme variables also win over the stylesheet.
  return withFavicon.replace(/<\/head>/i, preloadScript(db) + ogMeta(db, req) + '</head>');
}

Object.keys(PAGES).forEach((url) => {
  app.get(url, async (req, res) => {
    try {
      res.set('Cache-Control', 'no-cache');
      res.type('html').send(await renderPage(PAGES[url], req));
    } catch (e) {
      res.status(404).type('html').send('Not found');
    }
  });
});

/* ---------- admin auth ---------- */
async function requireAdmin(req, res, next) {
  const key = req.get('x-admin-key') || '';
  const db = await store.getData();
  if (key && key === db.settings.adminKey) return next();
  return res.status(401).json({ error: 'Unauthorized' });
}

/* ---------- public API ---------- */
app.get('/api/settings', async (req, res) => {
  res.json(publicSettings(await store.getData()));
});

app.get('/api/products', async (req, res) => {
  res.json(sortedProducts((await store.getData()).products));
});

app.get('/api/products/:id', async (req, res) => {
  const product = (await store.getData()).products.find((p) => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});

app.post('/api/login', async (req, res) => {
  const key = ((req.body && req.body.key) || '').toString().trim();
  const db = await store.getData();
  if (key && key === db.settings.adminKey) return res.json({ ok: true });
  res.status(401).json({ error: 'Incorrect password' });
});

/* Storage / database connection status (no auth — no secrets returned). */
app.get('/api/status', async (req, res) => {
  const mode = store.storageMode();
  const probe = mode === 'blob' ? await store.probeBlob() : { connected: false, access: null };
  res.json({
    mode,
    blobConnected: probe.connected,
    storeAccess: probe.access,
    persistable: store.persistable()
  });
});

/* ---------- admin API ---------- */
app.get('/api/admin', requireAdmin, async (req, res) => {
  const db = await store.getData();
  res.json({ settings: db.settings, products: sortedProducts(db.products) });
});

app.post('/api/products', requireAdmin, async (req, res) => {
  let product;
  try {
    product = sanitizeProduct(req.body || {});
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
  const db = await store.getData();
  db.products.push(product);
  await store.saveData(db);
  res.status(201).json(product);
});

app.put('/api/products/:id', requireAdmin, async (req, res) => {
  const db = await store.getData();
  const idx = db.products.findIndex((p) => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Product not found' });
  let product;
  try {
    product = sanitizeProduct(req.body || {}, db.products[idx]);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
  db.products[idx] = product;
  await store.saveData(db);
  res.json(product);
});

app.delete('/api/products/:id', requireAdmin, async (req, res) => {
  const db = await store.getData();
  const idx = db.products.findIndex((p) => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Product not found' });
  db.products.splice(idx, 1);
  await store.saveData(db);
  res.json({ ok: true });
});

app.put('/api/settings', requireAdmin, async (req, res) => {
  const db = await store.getData();
  const body = req.body || {};
  if (body.brandName !== undefined) {
    const name = body.brandName.toString().trim();
    if (!name) return res.status(400).json({ error: 'Brand name cannot be empty' });
    db.settings.brandName = name;
  }
  if (body.tagline !== undefined) db.settings.tagline = body.tagline.toString().trim();
  if (body.logo !== undefined) db.settings.logo = body.logo.toString().trim();
  if (body.shareTitle !== undefined) db.settings.shareTitle = body.shareTitle.toString().trim();
  if (body.shareDescription !== undefined) db.settings.shareDescription = body.shareDescription.toString().trim();
  if (body.shareImage !== undefined) db.settings.shareImage = body.shareImage.toString().trim();
  if (body.currency !== undefined) db.settings.currency = body.currency.toString().trim() || '$';
  if (body.whatsapp !== undefined) {
    const num = body.whatsapp.toString().replace(/\D/g, '');
    if (num) db.settings.whatsapp = num;
  }
  if (body.theme !== undefined) {
    if (!store.THEMES.includes(body.theme)) return res.status(400).json({ error: 'Unknown theme' });
    db.settings.theme = body.theme;
  }
  if (body.customColors !== undefined) {
    const input = body.customColors && typeof body.customColors === 'object' ? body.customColors : {};
    const next = { ...db.settings.customColors };
    for (const key of ['bg', 'accent']) {
      if (input[key] === undefined) continue; // not sent — keep the saved colour
      const hex = themeColors.normalizeHex(input[key]);
      if (!hex) {
        return res.status(400).json({ error: `Theme colour "${key}" must be a colour code like #c9a227` });
      }
      next[key] = hex;
    }
    db.settings.customColors = next;
  }
  if (body.mobileColumns !== undefined) {
    if (!['single', 'double'].includes(body.mobileColumns)) {
      return res.status(400).json({ error: 'mobileColumns must be "single" or "double"' });
    }
    db.settings.mobileColumns = body.mobileColumns;
  }
  if (body.fontFamily !== undefined) {
    if (!store.FONTS.some((f) => f.id === body.fontFamily)) {
      return res.status(400).json({ error: 'Unknown font' });
    }
    db.settings.fontFamily = body.fontFamily;
  }
  if (body.brandFont !== undefined) {
    if (!store.FONTS.some((f) => f.id === body.brandFont)) {
      return res.status(400).json({ error: 'Unknown brand font' });
    }
    db.settings.brandFont = body.brandFont;
  }
  if (body.textBold !== undefined) db.settings.textBold = !!body.textBold;
  if (body.adminKey !== undefined && body.adminKey !== '') {
    db.settings.adminKey = body.adminKey.toString().trim();
  }
  await store.saveData(db);
  res.json(db.settings);
});

app.post('/api/upload', requireAdmin, upload.single('file'), async (req, res, next) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    const name = store.newUploadName(req.file.originalname);
    const url = await store.saveUpload(name, req.file.buffer, req.file.mimetype);
    res.json({ url });
  } catch (e) {
    next(e);
  }
});

/* ---------- static + fallbacks ---------- */
app.use(express.static(PUBLIC_DIR));

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: err.message || 'Server error' });
});

module.exports = app;
