export const SITE = {
  title: 'Patricks Blog',
  tagline: 'Small blog about everything related to Microsoft products and IT.',
  description:
    'Field notes on Microsoft infrastructure, Entra ID, Azure, containers and the home lab — by Patrick Schüle, Munich.',
  url: 'https://schuele.xyz',
  author: 'Patrick Schüle',
  email: 'website@schuele.xyz',
  github: 'https://github.com/schupat',
  githubLabel: 'github.com/schupat',
  lang: 'en',
  /** Locale used for every date shown on the site. */
  locale: 'en-US',
  /** After how many unverified months a post shows the age notice. */
  staleAfterMonths: 12,
  umami: {
    id: 'a976d73e-4e79-4bdd-a8ab-6841bce63168',
    src: 'https://cloud.umami.is/script.js',
  },
};

export const NAV = [
  { href: '/', label: 'Notes' },
  { href: '/tags/', label: 'Topics' },
  { href: '/archives/', label: 'Archive' },
  { href: '/about/', label: 'About' },
  { href: '/feed.xml', label: 'RSS' },
];
