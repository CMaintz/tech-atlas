/** The privacy page: everything the site keeps in the browser (A88). */
import type { Lang } from './site';

type T = Record<Lang, string>;

export type StorageItem = {
  key: string;
  store: 'localStorage' | 'sessionStorage';
  purpose: T;
};

/** Everything the site keeps in the browser. No cookies are set. */
export const STORAGE: StorageItem[] = [
  {
    key: 'atlas:learner:v2',
    store: 'localStorage',
    purpose: {
      en: 'Your study progress: which terms you have answered, when they are due again, and the status you gave them. Synced only if you sign in.',
      da: 'Dine fremskridt: hvilke begreber du har svaret på, hvornår de skal gentages, og den status, du har givet dem. Synkroniseres kun, hvis du logger ind.',
    },
  },
  {
    key: 'atlas.recent',
    store: 'localStorage',
    purpose: {
      en: 'The last few terms you opened, for "Recently viewed" on the front page.',
      da: 'De sidste begreber, du har åbnet, til "Senest set" på forsiden.',
    },
  },
  {
    key: 'atlas.langSuggest.dismissed',
    store: 'localStorage',
    purpose: {
      en: 'That you closed the suggestion to read the site in Danish.',
      da: 'At du har lukket forslaget om at læse sitet på dansk.',
    },
  },
  {
    key: 'atlas.theme',
    store: 'localStorage',
    purpose: {
      en: 'The colour theme you picked (light or dark). Not set while you follow your system setting.',
      da: 'Det farvetema, du har valgt (lyst eller mørkt). Sættes ikke, så længe du følger din systemindstilling.',
    },
  },
  {
    key: 'atlas.explorer.legend',
    store: 'localStorage',
    purpose: {
      en: 'Whether you left the Explorer legend open or closed.',
      da: 'Om du lod Explorer-forklaringen stå åben eller lukket.',
    },
  },
  {
    key: 'atlas.tour',
    store: 'localStorage',
    purpose: {
      en: 'Where you are in the guided tour, so it can continue on the next page.',
      da: 'Hvor du er i rundvisningen, så den kan fortsætte på næste side.',
    },
  },
  {
    key: 'atlas.tour.done',
    store: 'localStorage',
    purpose: {
      en: 'That you finished or turned off the tour, so it is not offered again.',
      da: 'At du har gennemført eller slået rundvisningen fra, så den ikke tilbydes igen.',
    },
  },
  {
    key: 'atlas.tour.snoozed',
    store: 'sessionStorage',
    purpose: {
      en: 'That you chose "not now" for the tour. Gone when you close the tab.',
      da: 'At du har valgt "ikke nu" til rundvisningen. Forsvinder, når du lukker fanen.',
    },
  },
  {
    key: 'atlas.probe',
    store: 'localStorage',
    purpose: {
      en: 'Written and removed at once, to check that the browser allows storage.',
      da: 'Skrives og slettes med det samme for at tjekke, om browseren tillader lagring.',
    },
  },
  {
    key: 'atlas:account:notice',
    store: 'localStorage',
    purpose: {
      en: 'Only with an account: a note that you were signed out because your synced data was deleted on another device.',
      da: 'Kun med en konto: en besked om, at du blev logget ud, fordi dine synkroniserede data blev slettet på en anden enhed.',
    },
  },
  {
    key: 'sb-<project>-auth-token',
    store: 'localStorage',
    purpose: {
      en: 'Only while signed in: your sign-in session (set by Supabase), so you stay signed in. Removed when you sign out.',
      da: 'Kun mens du er logget ind: din login-session (sat af Supabase), så du forbliver logget ind. Slettes, når du logger ud.',
    },
  },
  {
    key: 'sb-<project>-auth-token-…-code-verifier',
    store: 'localStorage',
    purpose: {
      en: 'Only during sign-in: a one-time secret that proves the sign-in was started in this browser. Removed when sign-in completes.',
      da: 'Kun under login: en engangsnøgle, der beviser, at login blev startet i denne browser. Slettes, når login er gennemført.',
    },
  },
];
