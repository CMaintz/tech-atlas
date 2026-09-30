import type { Bi, Lang } from '../lang';

/**
 * The About dialog: owner links and credits. A link whose href is not a real
 * URL is not rendered, so a placeholder never becomes a broken link.
 */
export const ABOUT_LINKS = {
  github: 'https://github.com/CMaintz',
  // Empty = the LinkedIn pill is left out.
  linkedin: 'https://www.linkedin.com/in/christoffer-maintz/',
  website: 'https://maintz.dev',
};

export interface AboutPerson {
  section: 'credits' | 'thanks';
  name: string;
  role: Bi;
  /**
   * File under app/public/about/. Any aspect ratio: it is cropped to a centred circle
   * (object-fit: cover). Missing at build time = an initials circle instead.
   */
  photo: string;
  /** CSS object-position for the crop, e.g. '50% 30%' to keep a face in frame. */
  photoPosition?: string;
}

export const ABOUT_PEOPLE: AboutPerson[] = [
  {
    section: 'credits',
    name: 'Christoffer Maintz',
    role: { en: 'Atlas author · Tech wizard', da: 'Forfatter til Atlas · Tech-troldmand' },
    photo: 'christoffer.jpg',
  },
  {
    section: 'thanks',
    name: 'Christina Jakobsen',
    role: {
      en: 'Partner in crime · Chief term-wrangler',
      da: 'Makker i ugerningen · Chefordkløver',
    },
    photo: 'christina.jpg',
  },
];

const ABOUT_EN = {
  about: 'About',
  aboutTitle: 'The Tech Atlas',
  aboutBody:
    'Tech jargon is everywhere: NIS2, zero trust, embeddings, Kubernetes, prompt injection. Everyone uses the words, and half the time nobody agrees on what they mean. So here is an atlas.',
  aboutBeta:
    'A bilingual (English and Danish) dictionary of security, computer science, AI and platform terms, built for learning, and wired into a map of how the ideas connect: what you need to know first, what protects against what, and what is easily confused. Click a term and follow the threads. Atlas is a passion project and free forever: no ads, no paywall, no tracking.',
  credits: 'Credits',
  thanks: 'Thanks',
  close: 'Close',
  opensInNewTab: '(opens in a new tab)',
  releaseNotes: 'Release notes',
};

export const ABOUT_UI: Record<Lang, Record<keyof typeof ABOUT_EN, string>> = {
  en: ABOUT_EN,
  da: {
    about: 'Om',
    aboutTitle: 'Tech Atlas',
    aboutBody:
      'Tech-jargon er overalt: NIS2, zero trust, embeddings, Kubernetes, prompt injection. Alle bruger ordene, og halvdelen af tiden er ingen enige om, hvad de betyder. Så her er et atlas.',
    aboutBeta:
      'En tosproget (dansk og engelsk) ordbog over begreber inden for sikkerhed, datalogi, AI og platforme, bygget til at lære og koblet ind i et kort over, hvordan idéerne hænger sammen: hvad du skal kende først, hvad der beskytter mod hvad, og hvad der let forveksles. Klik på et begreb, og følg trådene. Atlas er et hjerteprojekt og gratis for altid: ingen reklamer, ingen betalingsmur, ingen sporing.',
    credits: 'Medvirkende',
    thanks: 'Tak til',
    close: 'Luk',
    opensInNewTab: '(åbner i en ny fane)',
    releaseNotes: 'Udgivelsesnoter',
  },
};
