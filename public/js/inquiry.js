// Catering inquiry: builds a pre-filled text message to Chef David.
// Phones open Messages directly; computers get a copyable message instead.
// When the backend exists, also POST the inquiry to /api/inquiries here so it lands in the admin inbox.
import { smsHref } from './config.js';

const form = document.getElementById('inquiry-form');
const errorBox = form.querySelector('.form-error');
const desktop = form.querySelector('.desktop-send');
const msgBox = form.querySelector('.desktop-msg');
const copyBtn = form.querySelector('[data-copy]');
const openSms = form.querySelector('[data-open-sms]');

const isPhone = () => window.matchMedia('(pointer: coarse)').matches && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

function formatDate(value) {
  if (!value) return '';
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function buildMessage(data) {
  const lines = [
    'Hi Chef David! New inquiry from your website.',
    `Name: ${data.name}`,
    `Phone: ${data.phone}`,
    `Service: ${data.service}`,
  ];
  if (data.date) lines.push(`Date: ${formatDate(data.date)}`);
  if (data.guests) lines.push(`Guests: ${data.guests}`);
  if (data.location) lines.push(`Location: ${data.location}`);
  if (data.notes) lines.push(`Details: ${data.notes}`);
  return lines.join('\n');
}

function validate() {
  const problems = [];
  for (const input of form.querySelectorAll('[required]')) {
    const ok = input.value.trim() !== '' && input.checkValidity();
    input.setAttribute('aria-invalid', String(!ok));
    if (!ok) problems.push(input);
  }
  const phone = form.elements.phone;
  if (phone.value && phone.value.replace(/\D/g, '').length < 10) {
    phone.setAttribute('aria-invalid', 'true');
    if (!problems.includes(phone)) problems.push(phone);
  }
  return problems;
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const problems = validate();
  if (problems.length) {
    errorBox.hidden = false;
    errorBox.textContent = 'Please add your name and a phone number so Chef David can reach you.';
    problems[0].focus();
    return;
  }
  errorBox.hidden = true;

  const data = Object.fromEntries(new FormData(form).entries());
  for (const k in data) data[k] = String(data[k]).trim();
  const message = buildMessage(data);
  const href = smsHref(message);

  if (isPhone()) {
    window.location.href = href;
  } else {
    msgBox.textContent = message;
    openSms.href = href;
    desktop.hidden = false;
    desktop.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
});

form.addEventListener('input', (e) => {
  if (e.target.getAttribute('aria-invalid') === 'true' && e.target.value.trim()) e.target.removeAttribute('aria-invalid');
});

copyBtn.addEventListener('click', async () => {
  const label = copyBtn.lastChild;
  try {
    await navigator.clipboard.writeText(msgBox.textContent);
    label.textContent = ' Copied!';
  } catch {
    const range = document.createRange();
    range.selectNodeContents(msgBox);
    getSelection().removeAllRanges();
    getSelection().addRange(range);
    label.textContent = ' Press Ctrl+C to copy';
  }
  setTimeout(() => { label.textContent = ' Copy message'; }, 2500);
});
