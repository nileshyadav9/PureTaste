// Home page "This week's meals" strip, filled from the menu data.
import { getMenu, dishImage, formatWeek, PLACEHOLDER_IMAGE } from '../data.js';
import { observeReveals } from '../site.js';

const strip = document.querySelector('[data-week-strip]');

async function init() {
  if (!strip) return;
  try {
    const menu = await getMenu();
    document.querySelectorAll('.this-week [data-week]').forEach((n) => { n.textContent = formatWeek(menu); });
    document.querySelectorAll('.this-week [data-price]').forEach((n) => { n.textContent = `$${menu.price ?? 20}`; });

    strip.replaceChildren(...menu.days.map((dish, i) => {
      const a = document.createElement('a');
      a.className = 'week-item reveal';
      a.href = 'menu.html';
      a.style.transitionDelay = `${i * 70}ms`;
      if (dish.soldOut) a.classList.add('is-sold-out');

      const img = document.createElement('img');
      img.src = dishImage(dish);
      img.alt = dish.image ? dish.name : '';
      img.loading = 'lazy';
      img.width = 800;
      img.height = 600;
      img.addEventListener('error', () => { img.src = PLACEHOLDER_IMAGE; }, { once: true });

      const body = document.createElement('div');
      body.className = 'week-item-body';
      const day = document.createElement('span');
      day.className = 'week-day';
      day.textContent = dish.soldOut ? `${dish.day} · Sold out` : dish.day;
      const name = document.createElement('span');
      name.className = 'week-name';
      name.textContent = dish.name;
      body.append(day, name);
      a.append(img, body);
      return a;
    }));
    observeReveals(strip);
  } catch (err) {
    console.error(err);
    strip.closest('section').hidden = true;
  }
}

init();
