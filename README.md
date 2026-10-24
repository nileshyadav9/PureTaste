# Pure Taste by Chef David

Website for Chef David: personal chef, weekly meals and catering in Land O' Lakes / Lutz, FL.
Plain HTML, CSS and JavaScript plus self-hosted three.js. No frameworks, no build step, no npm.

See [PLAN.md](PLAN.md) for decisions and phases.

## Run it locally

```bash
powershell -NoProfile -ExecutionPolicy Bypass -File tools/serve.ps1 -Port 8080
```

Then open http://localhost:8080. Pages need a server (ES modules and `fetch` don't work from `file://`).

## Pages

| Page | What it is |
|---|---|
| `index.html` | 3D scroll story (Prep → Knife → Fire → Plate → Served), this week's dishes, services, about, ordering |
| `menu.html` | This week's menu, styled after David's weekly poster |
| `catering.html` | Catering & private chef, inquiry form that opens a pre-filled text to David |
| `poster.html` | Hidden tool: builds the weekly poster PNG (feed 4:5 or story 9:16) from the menu |

## Updating the menu (until the admin panel exists)

Edit `public/data/menu.json`:

- `weekStart` / `weekEnd`: dates as `YYYY-MM-DD` (Tuesday and Friday).
- `price`: per-meal price.
- `days`: one entry per day with `name`, `description`, `sides`, `image` and `soldOut`.

Every page reads this file, including the home page strip and the poster tool. After the week ends, the menu page automatically says "Next week's menu is coming soon".

## Adding food photos

1. Put photos in `public/assets/img/menu/`. JPG or WebP, about 1200px wide, landscape works best.
2. Set the dish's `image` in `menu.json`, e.g. `"image": "assets/img/menu/steak-tacos.webp"`.

A dish without a photo shows the "Photo coming soon" placeholder.

## How the 3D story works

- `js/home/story.js` maps scroll position to progress `p` (0–1), fades the captions and loads the scene.
- `js/home/scene.js` holds the camera path and fire/steam/ember timing; `produce.js` the vegetables and knife choreography; `props.js` the board, knife, skillet and plate; `fx.js` the shaders.
- Everything in the scene is a function of `p`, so scrolling back rewinds it.
- An inline script in `index.html` skips 3D for no WebGL2, reduced motion, very low memory or data saver. Those visitors get a static hero with the chapters stacked.
- On slow devices the pixel ratio drops automatically.

## Third-party code

- three.js 0.186.1 (MIT): `public/js/vendor/three/`, from the npm tarball with its sha512 checked.
- Playfair Display and Great Vibes (SIL OFL): `public/assets/fonts/`, from Fontsource 5.3.0 with sha512 checked.
