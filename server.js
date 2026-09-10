const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const PUBLIC_DIR = path.join(ROOT, 'public');
const UPLOAD_DIR = path.join(PUBLIC_DIR, 'uploads');

const THEMES = ['gold', 'rose', 'emerald', 'midnight', 'ivory', 'royal'];

const DEFAULT_DB = {
  settings: {
    brandName: 'alwazir',
    tagline: 'Luxury Perfume Oils',
    logo: '/img/seed/logo.png',
    theme: 'gold',
    currency: '$',
    adminKey: 'alwazir123'
  },
  products: [
    {
      id: 'p-oud-royale',
      name: 'Oud Royale',
      category: 'Oud',
      description:
        'A regal blend of aged agarwood, warm amber and a whisper of saffron. Oud Royale opens with smoky, resinous depth and settles into a rich, long-lasting trail of leather and golden woods. The signature scent of the Alwazir house — bold, opulent and unmistakably royal.',
      price: 180,
      image: '/img/seed/oud-royale.jpg',
      popular: true,
      special: true,
      createdAt: 1700000000000
    },
    {
      id: 'p-white-musk',
      name: 'White Musk',
      category: 'Musk',
      description:
        'Clean, soft and endlessly elegant. White Musk wraps the skin in powdery musk, delicate white florals and a hint of warm vanilla. A gentle, intimate fragrance that lingers close to the skin all day.',
      price: 95,
      image: '/img/seed/white-musk.jpg',
      popular: true,
      special: false,
      createdAt: 1700000001000
    },
    {
      id: 'p-amber-gold',
      name: 'Amber Gold',
      category: 'Amber',
      description:
        'Liquid gold in a bottle. Warm amber, sweet labdanum and a touch of honeyed vanilla create a glowing, sun-kissed scent that feels luxurious from first drop to final dry-down.',
      price: 140,
      image: '/img/seed/amber-gold.jpg',
      popular: true,
      special: false,
      createdAt: 1700000002000
    },
    {
      id: 'p-rose-oud',
      name: 'Rose Oud',
      category: 'Floral',
      description:
        'Velvet rose meets deep oud in a modern classic. Bulgarian rose petals, dark oud wood and a soft touch of musk create a romantic, sophisticated fragrance that balances floral brightness with smoky richness.',
      price: 150,
      image: '/img/seed/rose-oud.jpg',
      popular: false,
      special: false,
      createdAt: 1700000003000
    },
    {
      id: 'p-saffron-gold',
      name: 'Saffron Gold',
      category: 'Spicy',
      description:
        'Radiant and rare. Precious saffron is layered over creamy sandalwood and warm spices, creating a golden, exotic fragrance that is both vibrant and deeply comforting.',
      price: 165,
      image: '/img/seed/saffron-gold.jpg',
      popular: false,
      special: false,
      createdAt: 1700000004000
    },
    {
      id: 'p-jasmine-white',
      name: 'Jasmine White',
      category: 'Floral',
      description:
        'A bouquet of white jasmine at midnight. Fresh jasmine blossoms, neroli and soft musk mingle in a luminous, clean fragrance that is pure, delicate and effortlessly feminine.',
      price: 85,
      image: '/img/seed/jasmine-white.jpg',
      popular: false,
      special: false,
      createdAt: 1700000005000
    },
    {
      id: 'p-sandalwood',
      name: 'Sandalwood',
      category: 'Woody',
      description:
        'Smooth, creamy and meditative. Pure sandalwood is softened with hints of cardamom and cedar, creating a grounding, spa-like scent that is warm, woody and quietly luxurious.',
      price: 120,
      image: '/img/seed/sandalwood.jpg',
      popular: false,
      special: false,
      createdAt: 1700000006000
    },
    {
      id: 'p-golden-vanilla',
      name: 'Golden Vanilla',
      category: 'Gourmand',
      description:
        'Sweet indulgence. Rich Madagascan vanilla, caramel and a touch of tonka bean melt into a warm, gourmand fragrance that feels like a golden embrace.',
      price: 75,
      image: '/img/seed/golden-vanilla.jpg',
      popular: false,
      special: false,
      createdAt: 1700000007000
    }
  ]
};

/* ---------- data store ---------- */
function loadDb() {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    const db = {
      settings: { ...DEFAULT_DB.settings, ...(parsed.settings || {}) },
      products: Array.isArray(parsed.products) ? parsed.products : []
    };
    return db;
  } catch (e) {
    return JSON.parse(JSON.stringify(DEFAULT_DB));
  }
}

function saveDb(db) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE);
}

let db = loadDb();
saveDb(db); // persist the seed on first run

/* ---------- helpers ---------- */
function publicSettings() {
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

/* ---------- app ---------- */
const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '2mb' }));

/* ---------- uploads (multer) ---------- */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = (path.extname(file.originalname) || '.jpg').toLowerCase();
    const name = `${Date.now()}-${crypto.randomBytes(5).toString('hex')}${ext}`;
    cb(null, name);
  }
});
const upload = multer({
  storage,
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

/* ---------- admin auth ---------- */
function requireAdmin(req, res, next) {
  const key = req.get('x-admin-key') || '';
  if (key && key === db.settings.adminKey) return next();
  return res.status(401).json({ error: 'Unauthorized' });
}

/* ---------- public API ---------- */
app.get('/api/settings', (req, res) => res.json(publicSettings()));

app.get('/api/products', (req, res) => res.json(sortedProducts(db.products)));

app.get('/api/products/:id', (req, res) => {
  const product = db.products.find((p) => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});

app.post('/api/login', (req, res) => {
  const key = (req.body && req.body.key) || '';
  if (key && key === db.settings.adminKey) return res.json({ ok: true });
  res.status(401).json({ error: 'Incorrect password' });
});

/* ---------- admin API ---------- */
app.get('/api/admin', requireAdmin, (req, res) => {
  res.json({ settings: db.settings, products: sortedProducts(db.products) });
});

app.post('/api/products', requireAdmin, (req, res) => {
  try {
    const product = sanitizeProduct(req.body || {});
    db.products.push(product);
    saveDb(db);
    res.status(201).json(product);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.put('/api/products/:id', requireAdmin, (req, res) => {
  const idx = db.products.findIndex((p) => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Product not found' });
  try {
    const product = sanitizeProduct(req.body || {}, db.products[idx]);
    db.products[idx] = product;
    saveDb(db);
    res.json(product);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/products/:id', requireAdmin, (req, res) => {
  const idx = db.products.findIndex((p) => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Product not found' });
  db.products.splice(idx, 1);
  saveDb(db);
  res.json({ ok: true });
});

app.put('/api/settings', requireAdmin, (req, res) => {
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
    if (!THEMES.includes(body.theme)) return res.status(400).json({ error: 'Unknown theme' });
    db.settings.theme = body.theme;
  }
  if (body.adminKey !== undefined && body.adminKey !== '') {
    db.settings.adminKey = body.adminKey.toString().trim();
  }
  saveDb(db);
  res.json(db.settings);
});

app.post('/api/upload', requireAdmin, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({ url: '/uploads/' + req.file.filename });
});

/* ---------- static + fallbacks ---------- */
app.use(express.static(PUBLIC_DIR));

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

app.listen(PORT, HOST, () => {
  console.log(`Alwazir server running at http://${HOST}:${PORT}`);
});
