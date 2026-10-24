# Pure Taste by Chef David — Website Plan

Personal chef, weekly meal prep, catering. Faith, Flavor, and Fire.
Service area: Land O' Lakes / Lutz, FL · (813) 498-9199 · [Facebook](https://www.facebook.com/profile.php?id=61594036238337)

## Decisions

| Topic | Decision |
|---|---|
| Stack | Plain HTML/CSS/JS + three.js only. No frameworks, no bundler, ES modules + import map. |
| Third-party | three.js self-hosted (`js/vendor/three/`). Fonts self-hosted (OFL). No CDNs, no Google Fonts. |
| Hosting | Cloudflare Pages (free) + Pages Functions (vanilla JS) + KV (menu JSON, dish library, inquiries, images). No R2 (needs a card). |
| Domain | Start on `*.pages.dev`. Custom domain optional later (~$10/yr). |
| Admin auth | One password (Cloudflare secret) → HMAC-signed session cookie, 30 days. Login attempts rate-limited. |
| Admin users | David or the site owner. Phone-first UI. |
| Ordering | Text / call buttons only. "Pickup and delivery available for select areas." |
| Price | Fixed $20 per meal (one setting, editable later). |
| Menu shape | Tuesday–Friday, one dish per day. |
| Inquiries | Form opens a pre-filled SMS to David from the visitor's phone + saved to admin inbox. Desktop: number + copy button. |
| 3D assets | All built in code (vegetables, slices, knife, board, skillet, plate) with canvas-generated textures; fire, steam and the ember logo are shaders. No model files to download, so the payload is just three.js plus about 60 KB of scene code. CC0 models can still be swapped in later. |
| Food photos | Placeholders now; real photos added later to `assets/source/`. |
| Logo | Provided logo; cream background keyed out for a transparent version. |
| Poster | Admin "Download poster" → 1080×1350 PNG (optional 1080×1920 story) via Canvas 2D. |
| Tooling / Node | **Deferred.** Backend (admin saving, inquiry inbox) is postponed; the public site is fully static. |
| Vendored versions | three.js 0.186.1 (npm tarball, sha512 verified; unminified build — the host's gzip/brotli brings it to ~500 KB). Playfair Display (variable) + Great Vibes from Fontsource 5.3.0 (OFL, verified). Body text uses the system font stack. |
| Menu data (for now) | `public/data/menu.json`, read through `js/data.js`. When the backend lands, only `data.js` changes to call `/api/menu`. |

## Local dev & deploy (deferred — decide before Phase 3)

Local Node is v20.10.0 (end of life since 2026-04-30, no security fixes), and npm has had repeated supply-chain compromises through 2026. Recommended: **no Node / npm at all.**

- Deploy: Cloudflare Pages **Git integration** on `nileshyadav9/PureTaste`, root directory `/`, output `public`, no build command. Cloudflare detects `functions/` itself. Every pushed branch gets a preview URL; `main` is production.
- Local preview: `tools/serve.ps1`, a dependency-free PowerShell static server on `localhost`.
- Local admin testing: `js/api.js` switches to a mock backend (IndexedDB) on `localhost`, so the whole admin flow works offline. Real Functions get tested on the branch preview URL.
- Secrets (admin password, session key) and the KV binding are set in the Cloudflare dashboard, never committed.

## Site map

- `index.html`: 3D scroll story → services (Weekly Meal Prep, Private Chef, Catering) → about → gallery → service area → CTA. Persistent "This Week's Menu" button.
- `menu.html`: Poster-style week view: dates, Tue–Fri cards (photo, name, description, sides), $20 badge, "Text orders to (813) 498-9199, at least 24 hours in advance", pickup/delivery note. "Next week's menu coming soon" state.
- `catering.html`: Catering & private chef details + inquiry form.
- `admin/`: Login, menu editor, dish library, poster download, inquiries inbox.

## Scroll story: "Prep → Knife → Fire → Plate → Served"

1. **Prep:** whole vegetables on a wooden board, warm light.
2. **Knife:** chef's knife (matches logo) slices; whole models swap to code-built pieces.
3. **Fire:** pieces sweep into a skillet, flames rise, embers float.
4. **Plate:** food lands in a meal-prep container / plate, steam rises.
5. **Served:** camera pulls back, embers form the crossed-knives-and-flame logo, menu CTA appears.

Mobile: DPR cap 1.5, one light, fake shadows, render only while visible. Fallback to a static hero for no WebGL, low-end devices, or `prefers-reduced-motion`. Custom scroll timeline (no GSAP).

## Project structure

```
PureTaste/
  public/
    index.html  menu.html  catering.html
    admin/index.html
    css/        tokens.css base.css home.css menu.css admin.css
    js/
      api.js                  real API / localhost mock switch
      home/                   scene.js timeline.js models.js fx-fire.js fx-steam.js
      menu.js  inquiry.js  poster.js
      admin/                  app.js editor.js library.js inbox.js image-resize.js
      vendor/three/           three.module.min.js, GLTFLoader.js
    assets/     logo/ fonts/ models/ img/ source/ og-image.jpg
  functions/api/
    _middleware.js            auth check for write routes
    login.js logout.js menu.js dishes.js upload.js inquiries.js
    image/[key].js            serves KV images with cache headers
  tools/serve.ps1
  wrangler.toml               Pages config (KV binding name), no secrets
  README.md                   deploy steps + "how to update the menu" for David
```

## Data model (KV)

- `menu:published` / `menu:draft`: `{ weekStart, weekEnd, price: 20, note, days: [{ day, dishId, name, description, sides[], image, soldOut }] }`
- `dishes`: `[{ id, name, description, sides[], image, lastUsed }]`
- `inquiries`: `[{ id, createdAt, name, phone, eventDate, guests, type, notes }]`
- `img:<id>`: WebP binary, resized client-side (max ~1600px, ~200 KB)
- `settings`: phone, price, service area, pickup/delivery note

## Phases

- [x] 1. Foundation: folder, design tokens, fonts, logo cleanup, three.js vendored, page shells, nav/footer, `serve.ps1`
- [x] 2. Menu page + data model, seeded from the Sept 29 – Oct 2 poster, placeholder images
- [ ] 3. Functions + admin: login, editor, image upload, dish library, draft/preview/publish, inbox, localhost mock — **deferred** (needs the hosting/tooling decision)
- [x] 4. Poster generator (standalone `poster.html` for now; moves into the admin later)
- [x] 5. 3D scroll scene, mobile tuning, static fallback — built fully procedurally (no CC0 downloads needed)
- [x] 6. Catering page + inquiry form, SEO (LocalBusiness schema, OG tags), performance pass at phone sizes
  - Open: `og:image` / canonical URLs must become absolute once the domain is known.
- [ ] 7. Deploy: owner creates the Cloudflare account, connect repo, set KV binding + secrets, smoke test

## Seed menu (week of Sept 29 – Oct 2)

| Day | Dish | Description | Sides |
|---|---|---|---|
| Tue | Steak Taco Tuesday | Three tender steak tacos on warm flour tortillas with sautéed peppers & onions, fresh lime and house sauce. | Mexican-Style Rice, Seasoned Black Beans |
| Wed | Fried Chicken Tenders | Crispy, golden seasoned chicken tenders. | Creamy Mac & Cheese, Honey-Glazed Carrots, Cornbread |
| Thu | Sofrito Tomato Sirloin Steak | Tender sirloin simmered in a savory sofrito tomato sauce with peppers & onions. | Garlic Mashed Potatoes, Seasoned Sweet Corn, Warm Rustic Bread |
| Fri | Cajun Garlic Butter Chicken | Tender chicken breast with bold Cajun spices finished in a rich garlic butter sauce. | Seasoned Yellow Rice, Green Bean Almondine, House-Made Biscuits |
