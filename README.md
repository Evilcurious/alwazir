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

The app is Vercel-ready: the Express API runs as a serverless function (`api/index.js`),
the pages/assets are served from `public/`, and data + image uploads live in **Vercel Blob**.

### Steps

1. **Push this repo to GitHub** (it already is — see the `arena/01a08c34-alwazir` branch).
2. Go to [vercel.com/new](https://vercel.com/new) and **import the repository**.
   - Vercel auto-detects the setup (`api/index.js` function + `public/` static).
   - No build command or output directory is needed.
3. **Connect a Blob store** (required so the admin panel can save):
   - In the project dashboard → **Storage** tab → **Create Blob store** → connect it to the project.
   - This sets the `BLOB_READ_WRITE_TOKEN` environment variable automatically.
4. **Redeploy** (the first import may happen before the Blob store is connected — just redeploy after step 3).

That's it. `alwazir.vercel.app` will show the store; open `/admin.html` to manage it.

> ⚠️ **Without a Blob store**, the site still works read-only (seed products are shown in
> memory), but the admin panel cannot save changes or upload images. Connect Blob to unlock
> full editing.

### How it works on Vercel

| Concern | Local (`npm start`) | Vercel |
| --- | --- | --- |
| API | `server.js` listens on a port | `api/index.js` exports the Express app (serverless function) |
| Routing | Express serves everything | `vercel.json` rewrites `/api/*` to the function; `public/` is served by the CDN |
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

- `app.js` — the Express application (all routes, exported for both environments).
- `server.js` — local development launcher (`npm start`).
- `api/index.js` — Vercel serverless entry point.
- `lib/store.js` — storage abstraction (local JSON file vs Vercel Blob).
- `public/` — the three pages, shared CSS and JS, and seed imagery.
