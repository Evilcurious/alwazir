const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');

const store = require('./store');

const ROOT = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '2mb' }));

/* ---------- uploads (saved to public/uploads) ---------- */
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

/* ---------- server-rendered pages (settings injected to avoid theme flash) ---------- */
const PAGES = {
  '/': 'index.html',
  '/index.html': 'index.html',
  '/product.html': 'product.html',
  '/admin.html': 'admin.html'
};

function preloadScript(db) {
  const pub = publicSettings(db);
  const json = JSON.stringify(pub).replace(/</g, '\\u003c');
  return (
    '<script>window.__ALWAZIR_SETTINGS__=' + json + ';' +
    '(function(){var s=window.__ALWAZIR_SETTINGS__||{},b=document.body;' +
    'if(!b)return;' +
    'b.setAttribute("data-theme",s.theme||"gold");' +
    'b.setAttribute("data-mobile-columns",s.mobileColumns==="single"?"single":"double");' +
    'if(s.fontFamily&&s.fontFamily!=="default")b.setAttribute("data-font",s.fontFamily);else b.removeAttribute("data-font");' +
    'if(s.brandFont&&s.brandFont!=="default")b.setAttribute("data-brand-font",s.brandFont);else b.removeAttribute("data-brand-font");' +
    'b.setAttribute("data-bold",s.textBold?"true":"false");' +
    '})();</script>'
  );
}

function renderPage(file) {
  const html = fs.readFileSync(path.join(PUBLIC_DIR, file), 'utf8');
  const db = store.getData();
  // Insert the preload script right after <body ...> so the theme applies
  // before any visible content is painted (prevents the gold-theme flash).
  return html.replace(/<body([^>]*)>/, (m) => m + preloadScript(db));
}

Object.keys(PAGES).forEach((url) => {
  app.get(url, (req, res) => {
    try {
      res.set('Cache-Control', 'no-cache');
      res.type('html').send(renderPage(PAGES[url]));
    } catch (e) {
      res.status(404).type('html').send('Not found');
    }
  });
});

function sortedProducts(list) {
  return [...list].sort((a, b) => {
    if (!!a.popular !== !!b.popular) return a.popular ? -1 : 1;
    return (b.createdAt || 0) - (a.createdAt || 0);
  });
}

function sanitizeProduct(input, existing = {}) {
  const name = (input.name || '').toString().trim();
  if (!name) throw new Error('Product name is required');
  const price = Number(input.price);
  if (!Number.isFinite(price) || price < 0) throw new Error('Price must be a positive number');
  return {
    id: existing.id || crypto.randomUUID(),
    name,
    category: (input.category || '').toString().trim() || 'General',
    description: (input.description || '').toString().trim(),
    price,
    image: (input.image || existing.image || '').toString().trim(),
    popular: !!input.popular,
    special: !!input.special,
    createdAt: existing.createdAt || Date.now()
  };
}

/* ---------- admin auth ---------- */
function requireAdmin(req, res, next) {
  const key = req.get('x-admin-key') || '';
  const db = store.getData();
  if (key && key === db.settings.adminKey) return next();
  return res.status(401).json({ error: 'Unauthorized' });
}

/* ---------- public API ---------- */
app.get('/api/settings', (req, res) => {
  res.json(publicSettings(store.getData()));
});

app.get('/api/products', (req, res) => {
  res.json(sortedProducts(store.getData().products));
});

app.get('/api/products/:id', (req, res) => {
  const product = store.getData().products.find((p) => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});

app.post('/api/login', (req, res) => {
  const key = ((req.body && req.body.key) || '').toString().trim();
  if (key && key === store.getData().settings.adminKey) return res.json({ ok: true });
  res.status(401).json({ error: 'Incorrect password' });
});

/* ---------- admin API ---------- */
app.get('/api/admin', requireAdmin, (req, res) => {
  const db = store.getData();
  res.json({ settings: db.settings, products: sortedProducts(db.products) });
});

app.post('/api/products', requireAdmin, (req, res) => {
  let product;
  try {
    product = sanitizeProduct(req.body || {});
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
  const db = store.getData();
  db.products.push(product);
  store.saveData(db);
  res.status(201).json(product);
});

app.put('/api/products/:id', requireAdmin, (req, res) => {
  const db = store.getData();
  const idx = db.products.findIndex((p) => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Product not found' });
  let product;
  try {
    product = sanitizeProduct(req.body || {}, db.products[idx]);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
  db.products[idx] = product;
  store.saveData(db);
  res.json(product);
});

app.delete('/api/products/:id', requireAdmin, (req, res) => {
  const db = store.getData();
  const idx = db.products.findIndex((p) => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Product not found' });
  db.products.splice(idx, 1);
  store.saveData(db);
  res.json({ ok: true });
});

app.put('/api/settings', requireAdmin, (req, res) => {
  const db = store.getData();
  const body = req.body || {};
  if (body.brandName !== undefined) {
    const name = body.brandName.toString().trim();
    if (!name) return res.status(400).json({ error: 'Brand name cannot be empty' });
    db.settings.brandName = name;
  }
  if (body.tagline !== undefined) db.settings.tagline = body.tagline.toString().trim();
  if (body.logo !== undefined) db.settings.logo = body.logo.toString().trim();
  if (body.currency !== undefined) db.settings.currency = body.currency.toString().trim() || '$';
  if (body.whatsapp !== undefined) {
    const num = body.whatsapp.toString().replace(/\D/g, '');
    if (num) db.settings.whatsapp = num;
  }
  if (body.theme !== undefined) {
    if (!store.THEMES.includes(body.theme)) return res.status(400).json({ error: 'Unknown theme' });
    db.settings.theme = body.theme;
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
  store.saveData(db);
  res.json(db.settings);
});

app.post('/api/upload', requireAdmin, upload.single('file'), (req, res, next) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    const name = store.newUploadName(req.file.originalname);
    const url = store.saveUpload(name, req.file.buffer);
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
