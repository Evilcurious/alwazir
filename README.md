# Alwazir — Luxury Perfume Oils 🕌✨

A gold & white storefront for a perfume oil business. Built with **Node.js + Express**
(JSON file storage) and a vanilla-JS frontend — no build step required.

## Run it

```bash
npm install
npm start
```

Then open http://localhost:3000

## Pages

| Page | URL | What it does |
| --- | --- | --- |
| Home | `/` | Brand name, search bar, **special offer showcase** (only if one is set), and a full-screen 2-products-per-row catalog with image, description, price, **Add to Cart** and **More Details**. |
| Product details | `/product.html?id=…` | Full description + price, and **4 similar products** from the home collection. |
| Admin panel | `/admin.html` | Add / edit / delete products, change brand name, logo and theme, and mark products as **Popular** or **Special Offer**. |

## Admin access

- **Default password:** `alwazir123`
- Change it from the **Security** tab in the admin panel.

> ⚠️ This is a lightweight demo store. Data is stored in `data/db.json`
> (auto-created on first run, git-ignored). For production, back it up and
> replace the simple password gate with real authentication.

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

- `server.js` — Express API (`/api/*`), static file serving, multer image uploads.
- `public/` — the three pages, shared CSS and JS.
- Seed data lives in `server.js` (`DEFAULT_DB`) and is written to `data/db.json` on first boot.
