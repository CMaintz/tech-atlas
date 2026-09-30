/** The privacy page: the third parties involved and their own privacy policies (A88). */
import type { Lang } from './site';

type T = Record<Lang, string>;

export const LINKS = {
  datatilsynet: 'https://www.datatilsynet.dk/borger/klage',
  github:
    'https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement',
  supabase: 'https://supabase.com/privacy',
  cloudflare: 'https://developers.cloudflare.com/workers-ai/platform/privacy/',
  linkedin: 'https://www.linkedin.com/legal/privacy-policy',
  resend: 'https://resend.com/legal/privacy-policy',
};

export type Processor = { name: string; role: T; link: string };

export const PROCESSORS: Processor[] = [
  {
    name: 'GitHub, Inc. (GitHub Pages)',
    role: {
      en: 'Hosts the website and logs visits (USA). Also a sign-in provider, if you choose GitHub.',
      da: 'Hoster websitet og logger besøg (USA). Også login-udbyder, hvis du vælger GitHub.',
    },
    link: LINKS.github,
  },
  {
    name: 'Supabase, Inc.',
    role: {
      en: 'Accounts, synced progress, the search function and stored feedback; data stored in Frankfurt (EU). Our data processor.',
      da: 'Konti, synkroniserede fremskridt, søgefunktionen og gemt feedback; data opbevares i Frankfurt (EU). Vores databehandler.',
    },
    link: LINKS.supabase,
  },
  {
    name: 'Cloudflare, Inc. (Workers AI)',
    role: {
      en: 'Turns search questions into numbers. Receives only the question text, never who asked.',
      da: 'Omsætter søgespørgsmål til tal. Modtager kun spørgsmålets tekst, aldrig hvem der spurgte.',
    },
    link: LINKS.cloudflare,
  },
  {
    name: 'Resend, Inc.',
    role: {
      en: 'Delivers feedback from the Feedback form to our mailbox (USA). Receives the message, the page and your email address if you gave one.',
      da: 'Leverer feedback fra feedbackformularen til vores postkasse (USA). Modtager beskeden, siden og din e-mailadresse, hvis du har oplyst den.',
    },
    link: LINKS.resend,
  },
  {
    name: 'LinkedIn',
    role: {
      en: 'Sign-in provider, only if offered and you choose it. Like GitHub when you sign in with GitHub, LinkedIn is responsible for your account there and learns that you signed in to Atlas.',
      da: 'Login-udbyder, kun hvis den tilbydes, og du vælger den. Ligesom GitHub, når du logger ind med GitHub, er LinkedIn ansvarlig for din konto dér og får at vide, at du loggede ind på Atlas.',
    },
    link: LINKS.linkedin,
  },
];
