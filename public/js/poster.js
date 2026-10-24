// Weekly menu poster, drawn with Canvas 2D in the style of Chef David's flyers.
// drawPoster(canvas, menu, { format: 'feed' | 'story' }) -> Promise<void>
import { dishImage, formatWeek, PLACEHOLDER_IMAGE } from './data.js';
import { SITE } from './config.js';

export const FORMATS = {
  feed: { w: 1080, h: 1350 },   // 4:5 — Facebook / Instagram feed
  story: { w: 1080, h: 1920 },  // 9:16 — stories
};

const C = {
  bg: '#0d0b09', panel: 'rgba(251,246,233,0.035)', line: 'rgba(214,165,72,0.35)',
  cream: '#fbf6e9', creamDim: '#ddd3bf', gold: '#d6a548', goldHi: '#f2cf7e',
  red: '#c9361a', redHi: '#e04a22',
};
const DISPLAY = '"Playfair Display", Georgia, serif';
const SCRIPT = '"Great Vibes", cursive';
const BODY = 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
const LOGO = new URL('../assets/logo/logo-mark.png', import.meta.url).href;

async function loadFonts() {
  await Promise.all([
    document.fonts.load(`800 40px ${DISPLAY}`),
    document.fonts.load(`700 40px ${DISPLAY}`),
    document.fonts.load(`italic 400 40px ${DISPLAY}`),
    document.fonts.load(`400 40px ${SCRIPT}`),
  ]);
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => {
      if (src === PLACEHOLDER_IMAGE) return resolve(null);
      loadImage(PLACEHOLDER_IMAGE).then(resolve);
    };
    img.src = src;
  });
}

// ---------- drawing helpers ----------

function spaced(ctx, text, x, y, spacing, align = 'center') {
  const chars = [...text];
  const widths = chars.map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  const prev = ctx.textAlign;
  ctx.textAlign = 'left';
  chars.forEach((ch, i) => { ctx.fillText(ch, cx, y); cx += widths[i] + spacing; });
  ctx.textAlign = prev;
  return total;
}

function wrap(ctx, text, maxW) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width <= maxW || !line) line = test;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function coverImage(ctx, img, x, y, w, h, r) {
  ctx.save();
  roundRect(ctx, x, y, w, h, r);
  ctx.clip();
  ctx.fillStyle = '#2a241c';
  ctx.fillRect(x, y, w, h);
  if (img) {
    const iw = img.naturalWidth || 800;
    const ih = img.naturalHeight || 600;
    const s = Math.max(w / iw, h / ih);
    ctx.drawImage(img, x + (w - iw * s) / 2, y + (h - ih * s) / 2, iw * s, ih * s);
  }
  ctx.restore();
  ctx.save();
  roundRect(ctx, x, y, w, h, r);
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function ribbon(ctx, cx, y, w, h, text, size) {
  const notch = h * 0.32;
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, C.redHi);
  g.addColorStop(1, '#a32610');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(cx - w / 2, y);
  ctx.lineTo(cx + w / 2, y);
  ctx.lineTo(cx + w / 2 - notch, y + h / 2);
  ctx.lineTo(cx + w / 2, y + h);
  ctx.lineTo(cx - w / 2, y + h);
  ctx.lineTo(cx - w / 2 + notch, y + h / 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = `800 ${size}px ${DISPLAY}`;
  ctx.textBaseline = 'middle';
  spaced(ctx, text.toUpperCase(), cx, y + h / 2 + 1, size * 0.14);
  ctx.textBaseline = 'alphabetic';
}

function cross(ctx, x, y, s, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x - s * 0.08, y - s * 0.5, s * 0.16, s);
  ctx.fillRect(x - s * 0.32, y - s * 0.22, s * 0.64, s * 0.14);
}

function phoneIcon(ctx, x, y, w, h, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  roundRect(ctx, x, y, w, h, 9);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.fillRect(x + w * 0.35, y + h - 12, w * 0.3, 4);
  ctx.fillRect(x + w * 0.38, y + 8, w * 0.24, 3);
  ctx.restore();
}

function goldGradient(ctx, x0, y0, x1, y1) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, '#b98a33');
  g.addColorStop(0.45, C.goldHi);
  g.addColorStop(1, '#c4933a');
  return g;
}

// Seeded random so the background bokeh is identical every time.
function rng(seed) {
  return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
}

function background(ctx, w, h) {
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, w, h);
  let g = ctx.createRadialGradient(w * 0.85, h * 0.05, 0, w * 0.85, h * 0.05, w * 0.9);
  g.addColorStop(0, 'rgba(240,100,42,0.22)');
  g.addColorStop(1, 'rgba(240,100,42,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  g = ctx.createRadialGradient(w * 0.1, h * 0.2, 0, w * 0.1, h * 0.2, w * 0.7);
  g.addColorStop(0, 'rgba(214,165,72,0.12)');
  g.addColorStop(1, 'rgba(214,165,72,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const rand = rng(42);
  for (let i = 0; i < 26; i++) {
    const x = rand() * w, y = rand() * h * 0.35, r = 6 + rand() * 26;
    const b = ctx.createRadialGradient(x, y, 0, x, y, r);
    b.addColorStop(0, `rgba(255,190,110,${0.05 + rand() * 0.08})`);
    b.addColorStop(1, 'rgba(255,190,110,0)');
    ctx.fillStyle = b;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  g = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.8);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function header(ctx, w, menu, logo) {
  // logo mark
  if (logo) {
    const lw = 190, lh = lw * (logo.naturalHeight / logo.naturalWidth);
    ctx.drawImage(logo, 50, 46, lw, lh);
  }
  // wordmark
  ctx.textAlign = 'center';
  ctx.fillStyle = goldGradient(ctx, 340, 60, 740, 160);
  ctx.font = `400 128px ${SCRIPT}`;
  ctx.fillText('Pure Taste', w / 2, 150);
  ctx.fillStyle = C.cream;
  ctx.font = `700 30px ${DISPLAY}`;
  spaced(ctx, 'BY CHEF DAVID', w / 2, 196, 6);
  ctx.fillStyle = C.red;
  ctx.fillRect(w / 2 - 150, 214, 300, 3);
  ctx.fillStyle = C.gold;
  ctx.font = `600 21px ${BODY}`;
  spaced(ctx, 'FAITH, FLAVOR, AND FIRE', w / 2, 248, 5);

  // week box
  const bx = 812, by = 52, bw = 222, bh = 128;
  ctx.strokeStyle = C.gold;
  ctx.lineWidth = 2.5;
  ctx.strokeRect(bx, by, bw, bh);
  ctx.fillStyle = C.gold;
  ctx.font = `700 19px ${BODY}`;
  spaced(ctx, 'WEEK OF', bx + bw / 2, by + 34, 4);
  ctx.fillStyle = C.cream;
  const [from, to] = formatWeek(menu, { long: true }).toUpperCase().split(' – ');
  let size = 25;
  ctx.font = `800 ${size}px ${DISPLAY}`;
  while (Math.max(ctx.measureText(`${from} –`).width, ctx.measureText(to).width) > bw - 24 && size > 16) {
    size -= 1;
    ctx.font = `800 ${size}px ${DISPLAY}`;
  }
  ctx.fillText(`${from} –`, bx + bw / 2, by + 74);
  ctx.fillText(to, bx + bw / 2, by + 106);

  // fresh ingredients
  cross(ctx, bx + bw / 2, by + bh + 34, 30, C.gold);
  ctx.fillStyle = C.creamDim;
  ctx.font = `700 15px ${BODY}`;
  spaced(ctx, 'FRESH INGREDIENTS.', bx + bw / 2, by + bh + 74, 2.5);
  spaced(ctx, 'SCRATCH MADE.', bx + bw / 2, by + bh + 94, 2.5);
}

function orderBar(ctx, w, y, h, price) {
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(0, y, w, h);
  ctx.fillStyle = C.gold;
  ctx.fillRect(0, y, w, 3);

  const mid = y + h / 2;
  phoneIcon(ctx, 56, mid - 46, 52, 92, C.cream);
  ctx.textAlign = 'left';
  ctx.fillStyle = C.cream;
  ctx.font = `700 24px ${BODY}`;
  spaced(ctx, 'TEXT ORDERS TO', 134, mid - 26, 3, 'left');
  ctx.font = `800 58px ${DISPLAY}`;
  ctx.fillText(SITE.phoneDisplay, 132, mid + 30);
  ctx.fillStyle = C.gold;
  ctx.font = `700 19px ${BODY}`;
  spaced(ctx, `AT LEAST ${SITE.orderLeadHours} HOURS ADVANCE`, 134, mid + 62, 2.5, 'left');

  ctx.fillStyle = C.line;
  ctx.fillRect(700, y + 24, 2, h - 48);

  ctx.textAlign = 'center';
  ctx.fillStyle = goldGradient(ctx, 760, mid - 50, 1000, mid + 20);
  ctx.font = `800 76px ${DISPLAY}`;
  ctx.fillText(`$${price}`, 880, mid + 12);
  ctx.fillStyle = C.cream;
  ctx.font = `700 18px ${BODY}`;
  spaced(ctx, 'PER MEAL', 880, mid + 42, 4);
  ctx.fillStyle = C.creamDim;
  ctx.font = `500 16px ${BODY}`;
  ctx.fillText('Pickup & delivery for select areas', 880, mid + 70);
}

// Lays out a dish's text inside `maxW`, shrinking until it fits `maxH`. Returns draw ops.
function layoutText(ctx, dish, maxW, maxH, base) {
  for (let scale = 1; scale >= 0.6; scale -= 0.04) {
    const nameSize = base.name * scale, descSize = base.desc * scale, sideSize = base.side * scale;
    const ops = [];
    let y = 0;
    ctx.font = `800 ${nameSize}px ${DISPLAY}`;
    for (const line of wrap(ctx, dish.name, maxW)) {
      y += nameSize * 1.12;
      ops.push({ font: ctx.font, color: C.cream, text: line, y });
    }
    if (dish.description) {
      y += descSize * 0.7;
      ctx.font = `400 ${descSize}px ${BODY}`;
      for (const line of wrap(ctx, dish.description, maxW)) {
        y += descSize * 1.32;
        ops.push({ font: ctx.font, color: C.creamDim, text: line, y });
      }
    }
    if (dish.sides?.length) {
      y += descSize * 0.9;
      ops.push({ rule: true, y });
      y += descSize * 0.5;
      ctx.font = `650 ${sideSize}px ${BODY}`;
      for (const side of dish.sides) {
        for (const line of wrap(ctx, side, maxW)) {
          y += sideSize * 1.32;
          ops.push({ font: ctx.font, color: C.goldHi, text: line, y });
        }
      }
    }
    if (y <= maxH || scale <= 0.62) return { ops, height: y };
  }
}

function drawOps(ctx, ops, x, y, align = 'center') {
  ctx.textAlign = align;
  for (const op of ops) {
    if (op.rule) {
      ctx.fillStyle = C.red;
      ctx.fillRect(align === 'center' ? x - 26 : x, y + op.y - 2, 52, 3);
      continue;
    }
    ctx.font = op.font;
    ctx.fillStyle = op.color;
    ctx.fillText(op.text, x, y + op.y);
  }
}

function soldOut(ctx, x, y, w, h) {
  ctx.save();
  ctx.fillStyle = 'rgba(13,11,9,0.6)';
  roundRect(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(-0.18);
  ctx.fillStyle = C.cream;
  ctx.fillRect(-w * 0.45, -22, w * 0.9, 44);
  ctx.fillStyle = C.bg;
  ctx.font = `800 22px ${BODY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  spaced(ctx, 'SOLD OUT', 0, 2, 4);
  ctx.restore();
}

function feedLayout(ctx, menu, images, w, h) {
  ctx.textAlign = 'center';
  ctx.fillStyle = goldGradient(ctx, 300, 260, 780, 300);
  ctx.font = `400 46px ${SCRIPT}`;
  ctx.fillText('Blessed to Cook, Grateful to Serve', w / 2, 312);

  const top = 340, bottom = 1158, margin = 36, gap = 14;
  const days = menu.days;
  const colW = (w - margin * 2 - gap * (days.length - 1)) / days.length;

  // Photos share one height: whatever space the longest text column leaves (at least 230px).
  const textTop = top + 76, minImg = 230;
  const layouts = days.map((dish) =>
    layoutText(ctx, dish, colW - 26, bottom - 12 - minImg - 18 - textTop, { name: 31, desc: 19, side: 19 }));
  const imgY = textTop + Math.max(...layouts.map((l) => l.height)) + 22;
  const imgH = bottom - 12 - imgY;

  days.forEach((dish, i) => {
    const x = margin + i * (colW + gap);
    ctx.save();
    roundRect(ctx, x, top, colW, bottom - top, 14);
    ctx.fillStyle = C.panel;
    ctx.fill();
    ctx.strokeStyle = 'rgba(214,165,72,0.22)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    ribbon(ctx, x + colW / 2, top + 16, colW - 30, 44, dish.day, 22);

    drawOps(ctx, layouts[i].ops, x + colW / 2, textTop);

    coverImage(ctx, images[i], x + 10, imgY, colW - 20, imgH, 10);
    if (dish.soldOut) soldOut(ctx, x + 10, imgY, colW - 20, imgH);
  });

  orderBar(ctx, w, 1186, 164, menu.price ?? 20);
}

function storyLayout(ctx, menu, images, w, h) {
  ctx.textAlign = 'center';
  ctx.fillStyle = goldGradient(ctx, 300, 260, 780, 300);
  ctx.font = `400 50px ${SCRIPT}`;
  ctx.fillText('Blessed to Cook, Grateful to Serve', w / 2, 318);

  const top = 352, rowH = 318, gap = 14, margin = 40;
  menu.days.forEach((dish, i) => {
    const y = top + i * (rowH + gap);
    ctx.save();
    roundRect(ctx, margin, y, w - margin * 2, rowH, 16);
    ctx.fillStyle = C.panel;
    ctx.fill();
    ctx.strokeStyle = 'rgba(214,165,72,0.22)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    const imgW = 360, imgX = margin + 14, imgY = y + 14, imgH = rowH - 28;
    coverImage(ctx, images[i], imgX, imgY, imgW, imgH, 12);
    if (dish.soldOut) soldOut(ctx, imgX, imgY, imgW, imgH);

    const tx = imgX + imgW + 28, tw = w - margin - 24 - tx;
    ribbon(ctx, tx + 110, y + 22, 220, 42, dish.day, 21);
    const { ops } = layoutText(ctx, dish, tw, rowH - 96, { name: 42, desc: 24, side: 24 });
    drawOps(ctx, ops, tx, y + 76, 'left');
  });

  orderBar(ctx, w, h - 210, 210, menu.price ?? 20);
}

export async function drawPoster(canvas, menu, { format = 'feed' } = {}) {
  const { w, h } = FORMATS[format];
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  const [logo, ...images] = await Promise.all([
    loadFonts().then(() => loadImage(LOGO)),
    ...menu.days.map((d) => loadImage(dishImage(d))),
  ]);

  background(ctx, w, h);
  header(ctx, w, menu, logo);
  if (format === 'story') storyLayout(ctx, menu, images, w, h);
  else feedLayout(ctx, menu, images, w, h);
}
