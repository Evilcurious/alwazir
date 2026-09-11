# Alwazir — Luxury Perfume Oils 🕌✨

A gold & white storefront for a perfume oil business. Built with **Node.js + Express**
and a vanilla-JS frontend — no build step required.

## Run it

```bash
npm install
npm start
```

Then open http://localhost:3000

Everything is stored in **one simple JSON file**: `data/db.json`
(created automatically on first run). Product images uploaded from the admin
panel are saved to `public/uploads/`.

## Pages

| Page | URL | What it does |
| --- | --- | --- |
| Home | `/` | Brand name, search bar, **special offer showcase** (only if one is set), and a 2-products-per-row catalog with image, description, price, **Chat** and **Add to Cart**. |
| Product details | `/product.html?id=…` | Full description + price, and **4 similar products** from the home collection. |
| Admin panel | `/admin.html` | Add / edit / delete products, change brand name, logo, theme and mobile view, and mark products as **Popular** or **Special Offer**. |

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
- **Themes** — 6 selectable color themes (Gold & White, Rose Gold, Emerald,
  Midnight Gold, Ivory, Royal Blue).
- **Brand customization** — editable name, tagline, logo, WhatsApp number and currency symbol.
- **Product images** — upload images directly from the admin panel.
- **Cart** — add to cart, adjust quantities, and order via WhatsApp chat.

## How it's organized

- `dev.js` — starts the server locally (`npm start`).
- `lib/app.js` — the Express application (all routes).
- `lib/store.js` — loads and saves `data/db.json` (the only database).
- `public/` — the three pages, shared CSS and JS, and seed imagery.
- `data/db.json` — your products and settings (auto-created; add it to backups).

## Notes

- The data file (`data/db.json`) is git-ignored, so it won't be overwritten when
  you pull updates — but remember to back it up.
- To reset everything to the demo products, just delete `data/db.json` and restart.
- This simple setup stores data in a local file, so it's meant to run on a normal
  server or your own computer (any Node host with a writable disk works — Render,
  Railway, a VPS, etc.). If you host it on Vercel (serverless, read-only disk), the
  store still loads and shows products, but admin changes won't be saved between visits.

