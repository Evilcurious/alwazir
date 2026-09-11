# Alwazir — Luxury Perfume Oils 🕌✨

A gold & white storefront for a perfume oil business. Built with **Node.js + Express**
and a vanilla-JS frontend — no build step required.

The app has **two storage modes**, chosen automatically:

| Mode | When | Database | Image uploads |
| --- | --- | --- | --- |
| **local** | no Blob token set (default) | `data/db.json` | `public/uploads/` |
| **blob** | `BLOB_READ_WRITE_TOKEN` set (Vercel) | `alwazir/db.json` in Vercel Blob (private) | `alwazir/uploads/*` in Vercel Blob (public) |

---

## Option 1 — Run it locally (easiest)

```bash
npm install
npm start
```

Then open http://localhost:3000. Everything (products, settings, uploaded images)
is saved on disk: `data/db.json` and `public/uploads/`. Admin password: `evil123`.

---

## Option 2 — Deploy to Vercel (with working image uploads)

Vercel's filesystem is read-only, so to make the admin panel and **image uploads**
actually save, the app stores data and uploads in **Vercel Blob**. Setting it up
takes ~2 minutes:

### Step 1 — Connect a Blob store

1. Go to [vercel.com](https://vercel.com) → open your project → **Storage** tab.
2. Click **Create Database** → choose **Blob** (or **Create Blob store**).
3. Give it a name (e.g. `alwazir`) and click **Connect** / **Create**.
4. Vercel automatically adds the `BLOB_READ_WRITE_TOKEN` environment variable to
   your project. (You can double-check it under **Settings → Environment Variables**.)

> The app also understands `BLOB_STORE_ID` if you prefer OIDC, but the token is the
> simplest and works everywhere.

### Step 2 — Deploy the code

1. On [vercel.com/new](https://vercel.com/new), **import this repository**.
2. Pick the right branch (the one with your site code).
3. Framework preset: **Other**. Leave build command and output directory **blank**.
4. Click **Deploy**.

### Step 3 — Redeploy after connecting Blob

If you connected the Blob store *after* the first deploy, go to the project →
**Deployments** → **⋯ Redeploy** (latest commit) so the new environment variable
takes effect.

That's it — the admin panel now saves products, settings, and **image uploads**
(they're stored in Blob and served from Vercel's CDN). Open `/admin.html` to manage
the store. Default password: `evil123`.

### How the app decides the mode

`lib/store.js` checks for `BLOB_READ_WRITE_TOKEN` / `BLOB_STORE_ID`:

- **Set** → `blob` mode (database at `alwazir/db.json`, uploads at `alwazir/uploads/<name>`).
- **Not set** → `local` mode (JSON file + `public/uploads/`).

So the exact same code runs locally and on Vercel with zero changes.

---

## Pages

| Page | URL | What it does |
| --- | --- | --- |
| Home | `/` | Brand name, search bar, **special offer showcase** (only if one is set), and a 2-products-per-row catalog with image, description, price, **Chat** and **Add to Cart**. |
| Product details | `/product.html?id=…` | Full description + price, and **4 similar products** from the home collection. |
| Admin panel | `/admin.html` | Add / edit / delete products, change brand name, logo, theme, fonts and mobile view, and mark products as **Popular** or **Special Offer**. |

## Admin access

- **Default password:** `evil123`
- Change it from the **Security** tab in the admin panel.

> ⚠️ This is a lightweight single-admin store. The password gate is intentionally
> simple — replace it with real authentication before using it in production.

## Features

- **Popular pin** — popular products are pinned to the top of the list.
- **Special offer** — mark a product as a special offer and it is showcased on the
  home page; if none is set, the section is hidden automatically.
- **Search** — instant search by product name and category, ranked by relevance.
- **Mobile product view** — admin toggle for **Single Mode** (1 per row) or
  **Double Mode** (2 per row) on phones.
- **Themes** — 10 selectable color themes (Gold & White, Rose Gold, Emerald,
  Midnight Gold, Ivory, Royal Blue, Dark Black & Green, Dark Black & White,
  Black & Emerald, Silver & Emerald).
- **Text style** — 7 selectable fonts for the body text, a separate 7-font picker
  for the **brand name**, and a **bold** toggle.
- **Brand customization** — editable name, tagline, logo, WhatsApp number and
  currency symbol.
- **Product images** — upload an image file **or paste an image URL** (both work),
  directly from the admin panel.
- **Cart** — add to cart, adjust quantities, and order via WhatsApp chat.

## How it's organized

- `dev.js` — starts the server locally (`npm start`).
- `lib/app.js` — the Express application (all routes).
- `lib/store.js` — storage layer (local JSON file ↔ Vercel Blob).
- `api/index.js` — Vercel serverless entry point.
- `vercel.json` — routes pages + `/api/*` through the function, includes `public/**`.
- `public/` — the three pages, shared CSS and JS, and seed imagery.
- `data/db.json` — local database (local mode only; auto-created).

## Notes

- **Local mode:** back up `data/db.json` and `public/uploads/`. Delete `data/db.json`
  to reset to the demo products.
- **Blob mode:** data lives at `alwazir/db.json` (private) and uploads at
  `alwazir/uploads/*` (public) in your Blob store. You can browse them in the
  Vercel dashboard → **Storage** → your Blob store.
- Blob writes propagate within ~60 seconds; this app reads the database with a
  short freshness window so admin changes show up quickly for everyone.
