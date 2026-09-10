/* ============================================================
   ALWAZIR — storage layer
   Switches automatically between:
     • local   — JSON file + disk uploads (npm start / dev)
     • blob    — Vercel Blob for the database + uploads (production)
   On Vercel WITHOUT a Blob store, reads fall back to in-memory
   seed data and writes return a clear configuration error.
   ============================================================ */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { put, get, BlobNotFoundError } = require('@vercel/blob');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const UPLOAD_DIR = path.join(ROOT, 'public', 'uploads');

const BLOB_DB_PATH = 'alwazir/db.json';
const BLOB_UPLOAD_PREFIX = 'alwazir/uploads/';

const THEMES = ['gold', 'rose', 'emerald', 'midnight', 'ivory', 'royal'];

const DEFAULT_DB = {
  settings: {
    brandName: 'alwazir',
    tagline: 'Luxury Perfume Oils',
    logo: '/img/seed/logo.png',
    theme: 'gold',
    currency: '$',
    whatsapp: '923174541414',
    adminKey: 'evil123'
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

/* ---------- storage mode ---------- */
function storageMode() {
  if (process.env.BLOB_READ_WRITE_TOKEN) return 'blob';
  if (process.env.VERCEL) return 'vercel-noblob';
  return 'local';
}

function deepCopy(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function normalize(parsed) {
  const p = parsed && typeof parsed === 'object' ? parsed : null;
  if (!p) return deepCopy(DEFAULT_DB);
  return {
    settings: { ...DEFAULT_DB.settings, ...(p.settings || {}) },
    products: Array.isArray(p.products) ? p.products : deepCopy(DEFAULT_DB.products)
  };
}

/* ---------- local (JSON file) ---------- */
function loadLocal() {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    return normalize(JSON.parse(raw));
  } catch (e) {
    return normalize(null);
  }
}

function saveLocal(db) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE);
}

/* ---------- Vercel Blob ---------- */
async function loadBlob() {
  try {
    const blob = await get(BLOB_DB_PATH);
    const text = await blob.text();
    return normalize(JSON.parse(text));
  } catch (e) {
    // First run (no database yet) → return the seed. Anything else → surface it.
    if (e instanceof BlobNotFoundError) return normalize(null);
    throw e;
  }
}

async function saveBlob(db) {
  await put(BLOB_DB_PATH, JSON.stringify(db, null, 2), {
    access: 'public',
    addRandomSuffix: false,
    contentType: 'application/json',
    cacheControlMaxAge: 0
  });
}

/* ---------- read-through cache (serverless friendly) ---------- */
let cache = null;
let cacheAt = 0;
const CACHE_TTL = 2000; // ms — keeps warm instances fast while staying fresh

async function getData() {
  const now = Date.now();
  if (cache && now - cacheAt < CACHE_TTL) return cache;
  const mode = storageMode();
  if (mode === 'local') cache = loadLocal();
  else if (mode === 'blob') cache = await loadBlob();
  else cache = normalize(null); // vercel-noblob: in-memory seed only
  cacheAt = now;
  return cache;
}

async function saveData(db) {
  const mode = storageMode();
  if (mode === 'local') {
    saveLocal(db);
  } else if (mode === 'blob') {
    await saveBlob(db);
  } else {
    throw new Error(
      'Storage not configured: connect a Vercel Blob store to this project to enable saving.'
    );
  }
  // write-through: update the in-process cache immediately
  cache = db;
  cacheAt = Date.now();
}

/* ---------- uploads ---------- */
function newUploadName(originalName) {
  const ext = (path.extname(originalName || '') || '.jpg').toLowerCase();
  return `${Date.now()}-${crypto.randomBytes(5).toString('hex')}${ext}`;
}

async function saveUpload(name, buffer, contentType) {
  const mode = storageMode();
  if (mode === 'blob') {
    const blob = await put(BLOB_UPLOAD_PREFIX + name, buffer, {
      access: 'public',
      addRandomSuffix: false,
      contentType: contentType || 'application/octet-stream',
      cacheControlMaxAge: 31536000
    });
    return blob.url;
  }
  if (mode === 'local') {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    fs.writeFileSync(path.join(UPLOAD_DIR, name), buffer);
    return '/uploads/' + name;
  }
  throw new Error(
    'Storage not configured: connect a Vercel Blob store to this project to enable image uploads.'
  );
}

module.exports = {
  THEMES,
  DEFAULT_DB,
  getData,
  saveData,
  saveUpload,
  newUploadName,
  storageMode,
  normalize
};
