// Menu data access. Today this reads a static JSON file; when the admin backend
// exists, only getMenu() changes (to fetch /api/menu).

const SITE_ROOT = new URL('../', import.meta.url);
const MENU_URL = new URL('data/menu.json', SITE_ROOT);

export const PLACEHOLDER_IMAGE = new URL('assets/img/dish-placeholder.svg', SITE_ROOT).href;

export async function getMenu() {
  const res = await fetch(MENU_URL, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`Menu request failed (${res.status})`);
  return res.json();
}

export function dishImage(dish) {
  return dish.image ? new URL(dish.image, SITE_ROOT).href : PLACEHOLDER_IMAGE;
}

// "2026-09-29" -> local Date at midnight (avoids the UTC shift of new Date("2026-09-29")).
export function parseDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'June', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
const LONG_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function ordinal(n) {
  const s = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' })[n % 10] || 'th';
  return `${n}${s}`;
}

// "Sept 29 – Oct 2" (short) or "September 29th – October 2nd" (long, poster style).
export function formatWeek(menu, { long = false } = {}) {
  const a = parseDate(menu.weekStart);
  const b = parseDate(menu.weekEnd);
  const months = long ? LONG_MONTHS : SHORT_MONTHS;
  const day = (d) => (long ? ordinal(d.getDate()) : d.getDate());
  const left = `${months[a.getMonth()]} ${day(a)}`;
  const right = a.getMonth() === b.getMonth() && !long ? `${day(b)}` : `${months[b.getMonth()]} ${day(b)}`;
  return `${left} – ${right}`;
}

// 'current' while the week is running or about to start, 'past' once it has ended.
export function menuStatus(menu, today = new Date()) {
  const end = parseDate(menu.weekEnd);
  end.setHours(23, 59, 59, 999);
  return today > end ? 'past' : 'current';
}
