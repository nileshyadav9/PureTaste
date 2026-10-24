// Shared page behaviour: header state, mobile nav, scroll reveals, action bar, footer year.

const header = document.querySelector('.site-header');
const toggle = document.querySelector('.nav-toggle');
const nav = document.getElementById('site-nav');

function updateHeader() {
  header?.classList.toggle('is-solid', window.scrollY > 24);
}
updateHeader();
window.addEventListener('scroll', updateHeader, { passive: true });

function setOpen(open) {
  header.classList.toggle('is-open', open);
  toggle.setAttribute('aria-expanded', String(open));
  toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
}
toggle?.addEventListener('click', () => setOpen(!header.classList.contains('is-open')));
nav?.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && header?.classList.contains('is-open')) setOpen(false); });

// Mark the current page in the nav.
const here = location.pathname.replace(/\/index(\.html)?$/, '/').replace(/\.html$/, '');
nav?.querySelectorAll('a').forEach((a) => {
  const target = new URL(a.href).pathname.replace(/\/index(\.html)?$/, '/').replace(/\.html$/, '');
  if (target === here && !a.hash) a.setAttribute('aria-current', 'page');
});

// Fade sections in as they enter the viewport.
const revealer = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-in');
      revealer.unobserve(entry.target);
    }
  }
}, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
export function observeReveals(root = document) {
  root.querySelectorAll('.reveal:not(.is-in)').forEach((el) => revealer.observe(el));
}
observeReveals();

// Hide the mobile action bar while the footer is on screen (the footer has the same links).
const bar = document.querySelector('.action-bar');
const footer = document.querySelector('.site-footer');
if (bar && footer) {
  new IntersectionObserver(([entry]) => bar.classList.toggle('is-hidden', entry.isIntersecting))
    .observe(footer);
}

document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
