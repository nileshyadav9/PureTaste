import { getMenu, dishImage, formatWeek, menuStatus, PLACEHOLDER_IMAGE } from './data.js';
import { SITE, smsHref } from './config.js';
import { observeReveals } from './site.js';

const grid = document.querySelector('[data-menu-grid]');
const notice = document.querySelector('[data-notice]');

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function orderMessage(dish, price) {
  return `Hi Chef David! I'd like to order ${dish.day}'s ${dish.name} ($${price}).\nName: \nQuantity: 1\nPickup or delivery: `;
}

function renderDish(dish, price, index) {
  const card = el('article', 'dish reveal');
  card.style.transitionDelay = `${index * 80}ms`;
  if (dish.soldOut) card.classList.add('is-sold-out');

  const photo = el('figure', 'dish-photo');
  const img = el('img');
  img.src = dishImage(dish);
  img.alt = dish.image ? dish.name : '';
  img.loading = 'lazy';
  img.decoding = 'async';
  img.width = 800;
  img.height = 600;
  img.addEventListener('error', () => { img.src = PLACEHOLDER_IMAGE; }, { once: true });
  photo.append(img);

  const body = el('div', 'dish-body');
  body.append(el('div', 'dish-day', dish.day));
  body.append(el('h3', 'dish-name', dish.name));
  if (dish.description) body.append(el('p', 'dish-desc', dish.description));
  if (dish.sides?.length) {
    body.append(el('hr', 'dish-rule'));
    const sides = el('ul', 'dish-sides');
    sides.setAttribute('aria-label', 'Sides');
    dish.sides.forEach((s) => sides.append(el('li', null, s)));
    body.append(sides);
  }
  const order = el('a', 'btn btn-ghost dish-order', dish.soldOut ? 'Sold out' : `Order ${dish.day}`);
  order.href = smsHref(orderMessage(dish, price));
  if (dish.soldOut) order.setAttribute('aria-disabled', 'true');
  body.append(order);

  if (dish.soldOut) card.append(el('span', 'sold-badge', 'Sold out'));
  card.append(body, photo);
  return card;
}

function showSkeleton() {
  for (let i = 0; i < 4; i++) grid.append(el('div', 'dish-skeleton'));
}

async function init() {
  showSkeleton();
  try {
    const menu = await getMenu();
    const price = menu.price ?? 20;

    document.querySelectorAll('[data-week]').forEach((n) => { n.textContent = formatWeek(menu); });
    document.querySelectorAll('[data-price]').forEach((n) => { n.textContent = `$${price}`; });
    document.title = `This Week's Menu (${formatWeek(menu)}) | Pure Taste by Chef David`;

    if (menuStatus(menu) === 'past') {
      notice.hidden = false;
      notice.append(el('strong', null, 'Next week’s menu is coming soon.'));
      notice.append(document.createTextNode(` Here’s the most recent one. Text ${SITE.phoneDisplay} to ask what’s cooking next.`));
    }

    grid.replaceChildren(...menu.days.map((d, i) => renderDish(d, price, i)));
    observeReveals(grid);
  } catch (err) {
    console.error(err);
    grid.replaceChildren(el('p', 'menu-error', `We couldn’t load the menu right now. Text ${SITE.phoneDisplay} and Chef David will tell you what’s cooking.`));
  }

  const general = document.querySelector('[data-sms-order]');
  if (general) general.href = smsHref("Hi Chef David! I'd like to place an order from this week's menu.\nName: \nDays & quantities: \nPickup or delivery: ");
}

init();
