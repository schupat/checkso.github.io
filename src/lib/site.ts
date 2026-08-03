export const SITE = {
  title: 'Patricks Blog',
  tagline: 'Small blog about everything related to Microsoft products and IT.',
  description:
    'Arbeitsnotizen zu Microsoft-Infrastruktur, Entra ID, Azure, Containern und Heimnetz — von Patrick Schüle aus München.',
  url: 'https://schuele.xyz',
  author: 'Patrick Schüle',
  email: 'website@schuele.xyz',
  github: 'https://github.com/checkso',
  lang: 'en',
  /** Ab wie vielen Monaten ohne Verifizierung der Altersvermerk erscheint. */
  staleAfterMonths: 12,
  umami: {
    id: 'a976d73e-4e79-4bdd-a8ab-6841bce63168',
    src: 'https://cloud.umami.is/script.js',
  },
};

export const NAV = [
  { href: '/', label: 'Notizen' },
  { href: '/tags/', label: 'Themen' },
  { href: '/archives/', label: 'Archiv' },
  { href: '/about/', label: 'Über' },
  { href: '/feed.xml', label: 'RSS' },
];
