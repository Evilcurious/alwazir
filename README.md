# Alwazir — Luxury Perfume Oils 🕌✨

A gold & white storefront for a perfume oil business. Built with **Node.js + Express**
and a vanilla-JS frontend — no build step required.

## Run it locally

```bash
npm install
npm start
```

Then open http://localhost:3000

## Deploy to Vercel

The app is Vercel-ready with **zero configuration**: Vercel auto-detects the Express app
in `index.js` and serves the pages/assets from `public/`. Data and image uploads are stored
in **Vercel Blob**.

### Steps

1. **Make sure the code is on the branch you import.** Vercel imports a single branch
   (default: `main`). All the website code lives on the `arena/01a08c34-alwazir` branch
   (or `main` after merging the open pull request).
   - When importing, pick that branch from the **"Branch"** dropdown, or merge the PR to `main` first.
2. Go to [vercel.com/new](https://vercel.com/new) and **import the repository**.
   - Framework preset: **Other** (or it will be auto-detected as Express).
   - No build command, no output directory — leave them blank.
3. **Connect a Blob store** (required so the admin panel can save):
   - Project dashboard → **Storage** tab → **Create Blob store** → connect it to the project.
   - This sets the `BLOB_READ_WRITE_TOKEN` environment variable automatically.
4. **Redeploy** (if you connected Blob after the first import, deploy again).

That's it. Your `*.vercel.app` URL shows the store; open `/admin.html` to manage it.

> ⚠️ **Without a Blob store**, the site still works read-only (seed products are shown in
> memory), but the admin panel cannot save changes or upload images. Connect Blob to unlock
> full editing.

### How it works on Vercel

| Concern | Local (`npm start`) | Vercel |
| --- | --- | --- |
| API | `dev.js` listens on a port | `index.js` exports the Express app (auto-detected serverless function) |
| Routing | Express serves everything | `public/` is served by the CDN; every other path goes to the Express function |
| Database | `data/db.json` | `alwazir/db.json` in Vercel Blob |
| Uploads | `public/uploads/` | `alwazir/uploads/*` in Vercel Blob |

The storage layer (`lib/store.js`) switches automatically based on
`BLOB_READ_WRITE_TOKEN` / `VERCEL` environment variables — no code changes needed.

## Pages

| Page | URL | What it does |
| --- | --- | --- |
| Home | `/` | Brand name, search bar, **special offer showcase** (only if one is set), and a full-screen 2-products-per-row catalog with image, description, price, **Add to Cart** and **More Details**. |
| Product details | `/product.html?id=…` | Full description + price, and **4 similar products** from the home collection. |
| Admin panel | `/admin.html` | Add / edit / delete products, change brand name, logo and theme, and mark products as **Popular** or **Special Offer**. |

## Admin access

- **Default password:** `alwazir123`
- Change it from the **Security** tab in the admin panel.

> ⚠️ This is a lightweight single-admin demo store. The password gate is intentionally
> simple — replace it with real authentication before using it in production.

## Features

- **Popular pin** — popular products are pinned to the top of the list.
- **Special offer** — mark a product as a special offer and it is showcased on the
  home page; if none is set, the section is hidden automatically.
- **Themes** — 6 selectable color themes (Gold & White, Rose Gold, Emerald,
  Midnight Gold, Ivory, Royal Blue).
- **Brand customization** — editable name, tagline, logo and currency symbol.
- **Product images** — upload images directly from the admin panel.
- **Cart** — add to cart, adjust quantities, and place an order via WhatsApp.

## Tech

- `index.js` — the Express application (all routes, exported for both environments).
- `dev.js` — local development launcher (`npm start`).
- `lib/store.js` — storage abstraction (local JSON file vs Vercel Blob).
- `public/` — the three pages, shared CSS and JS, and seed imagery.
