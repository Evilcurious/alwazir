const express = require('express');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

const store = require('./lib/store');

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '2mb' }));

/* ---------- uploads (memory storage: disk locally, Blob on Vercel) ---------- */
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
async function requireAdmin(req, res, next) {
  try {
    const key = req.get('x-admin-key') || '';
    const db = await store.getData();
    if (key && key === db.settings.adminKey) return next();
    return res.status(401).json({ error: 'Unauthorized' });
  } catch (e) {
    return next(e);
  }
}

/* ---------- public API ---------- */
app.get('/api/settings', async (req, res, next) => {
  try {
    const db = await store.getData();
    res.json(publicSettings(db));
  } catch (e) {
    next(e);
  }
});

app.get('/api/products', async (req, res, next) => {
  try {
    const db = await store.getData();
    res.json(sortedProducts(db.products));
  } catch (e) {
    next(e);
  }
});

app.get('/api/products/:id', async (req, res, next) => {
  try {
    const db = await store.getData();
    const product = db.products.find((p) => p.id === req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (e) {
    next(e);
  }
});

app.post('/api/login', async (req, res, next) => {
  try {
    const db = await store.getData();
    const key = ((req.body && req.body.key) || '').toString().trim();
    if (key && key === db.settings.adminKey) return res.json({ ok: true });
    res.status(401).json({ error: 'Incorrect password' });
  } catch (e) {
    next(e);
  }
});

/* ---------- admin API ---------- */
app.get('/api/admin', requireAdmin, async (req, res, next) => {
  try {
    const db = await store.getData();
    res.json({ settings: db.settings, products: sortedProducts(db.products) });
  } catch (e) {
    next(e);
  }
});

app.post('/api/products', requireAdmin, async (req, res, next) => {
  try {
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
  } catch (e) {
    next(e);
  }
});

app.put('/api/products/:id', requireAdmin, async (req, res, next) => {
  try {
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
  } catch (e) {
    next(e);
  }
});

app.delete('/api/products/:id', requireAdmin, async (req, res, next) => {
  try {
    const db = await store.getData();
    const idx = db.products.findIndex((p) => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Product not found' });
    db.products.splice(idx, 1);
    await store.saveData(db);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

app.put('/api/settings', requireAdmin, async (req, res, next) => {
  try {
    const db = await store.getData();
    const body = req.body || {};
    if (body.brandName !== undefined) {
      const name = body.brandName.toString().trim();
      if (!name) return res.status(400).json({ error: 'Brand name cannot be empty' });
      db.settings.brandName = name;
    }
    if (body.tagline !== undefined) db.settings.tagline = body.tagline.toString().trim();
    if (body.logo !== undefined) db.settings.logo = body.logo.toString().trim();
    if (body.currency !== undefined) db.settings.currency = body.currency.toString().trim() || '$';
    if (body.theme !== undefined) {
      if (!store.THEMES.includes(body.theme)) return res.status(400).json({ error: 'Unknown theme' });
      db.settings.theme = body.theme;
    }
    if (body.adminKey !== undefined && body.adminKey !== '') {
      db.settings.adminKey = body.adminKey.toString().trim();
    }
    await store.saveData(db);
    res.json(db.settings);
  } catch (e) {
    next(e);
  }
});

app.post('/api/upload', requireAdmin, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
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
