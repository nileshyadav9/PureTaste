// Business details used across pages. Change them here, not in page scripts.
export const SITE = {
  name: 'Pure Taste by Chef David',
  phone: '+18134989199',
  phoneDisplay: '(813) 498-9199',
  facebook: 'https://www.facebook.com/profile.php?id=61594036238337',
  area: "Land O' Lakes / Lutz, FL",
  orderLeadHours: 24,
  fulfillment: 'Pickup and delivery available for select areas.',
};

// `?&body=` is the form both iOS and Android Messages accept.
export const smsHref = (body = '') =>
  `sms:${SITE.phone}${body ? `?&body=${encodeURIComponent(body)}` : ''}`;

export const telHref = () => `tel:${SITE.phone}`;
