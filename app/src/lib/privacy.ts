/**
 * The privacy page's content (A88), both languages. Kept apart from `UI` in site.ts
 * (as ui-extra.ts is) so the long text doesn't churn the main string table.
 *
 * Every storage key the site uses must be listed in STORAGE — privacy.test.ts scans
 * the source and fails when a new key appears here unlisted. Keep the data inventory
 * in step with the code and supabase/migrations/ whenever what is stored changes, and
 * bump UPDATED.
 */
import type { Lang } from './site';

type T = Record<Lang, string>;

export const UPDATED = '2026-09-25';

export const CONTROLLER = {
  name: 'Christoffer Maintz Andersen',
  email: 'cmaintz@outlook.com',
};

export const LINKS = {
  datatilsynet: 'https://www.datatilsynet.dk/borger/klage',
  github:
    'https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement',
  supabase: 'https://supabase.com/privacy',
  cloudflare: 'https://developers.cloudflare.com/workers-ai/platform/privacy/',
  linkedin: 'https://www.linkedin.com/legal/privacy-policy',
};

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

export type DataItem = {
  title: T;
  what: T;
  why: T;
  where: T;
  basis: T;
  retention: T;
};

/** Every piece of personal data, in the order a visitor meets it. */
export const DATA: DataItem[] = [
  {
    title: { en: 'Visiting the site', da: 'Når du besøger sitet' },
    what: {
      en: 'Your IP address and the pages you request.',
      da: 'Din IP-adresse og de sider, du henter.',
    },
    why: {
      en: 'To deliver the pages and keep the hosting secure.',
      da: 'For at levere siderne og holde hostingen sikker.',
    },
    where: {
      en: 'GitHub Pages (GitHub, Inc., USA) logs every visit to its sites. We cannot see or switch off these logs.',
      da: 'GitHub Pages (GitHub, Inc., USA) logger alle besøg på sine sites. Vi kan hverken se eller slå disse logs fra.',
    },
    basis: {
      en: 'Legitimate interest (GDPR Art. 6(1)(f)): running a secure website.',
      da: 'Legitim interesse (GDPR art. 6, stk. 1, litra f): at drive et sikkert website.',
    },
    retention: {
      en: "Decided by GitHub — see GitHub's privacy statement.",
      da: 'Bestemmes af GitHub — se GitHubs privatlivserklæring.',
    },
  },
  {
    title: { en: 'Search by meaning', da: 'Søgning på betydning' },
    what: {
      en: 'What you type in the search box, when it reads like a question (three or more words) or matches no term name. Searches for a name are handled in your browser and not sent.',
      da: 'Det, du skriver i søgefeltet, når det ligner et spørgsmål (tre ord eller flere) eller ikke matcher navnet på et begreb. Søgninger efter et navn klares i din browser og sendes ikke.',
    },
    why: {
      en: 'To find terms that match what you mean.',
      da: 'For at finde begreber, der passer til det, du mener.',
    },
    where: {
      en: 'Our search function at Supabase (Frankfurt, EU) turns the text into numbers using Cloudflare Workers AI. Cloudflare receives only the text — no IP address, account or other identifier — and may process it outside the EU. Please do not type personal information into the search box.',
      da: 'Vores søgefunktion hos Supabase (Frankfurt, EU) omsætter teksten til tal via Cloudflare Workers AI. Cloudflare modtager kun teksten — ingen IP-adresse, konto eller anden identifikation — og kan behandle den uden for EU. Skriv venligst ikke personoplysninger i søgefeltet.',
    },
    basis: {
      en: 'Legitimate interest (Art. 6(1)(f)): answering the search you asked for.',
      da: 'Legitim interesse (art. 6, stk. 1, litra f): at besvare den søgning, du har bedt om.',
    },
    retention: {
      en: 'We do not store the question, and we use no Cloudflare storage, so nothing is kept there. Cloudflare states that it does not use it to train models. Supabase keeps short technical request logs (about one day on our plan).',
      da: 'Vi gemmer ikke spørgsmålet, og vi bruger ingen lagring hos Cloudflare, så intet gemmes dér. Cloudflare oplyser, at de ikke bruger det til at træne modeller. Supabase gemmer korte tekniske logs over forespørgsler (cirka en dag på vores abonnement).',
    },
  },
  {
    title: { en: 'Protecting search from abuse', da: 'Beskyttelse af søgningen mod misbrug' },
    what: {
      en: 'A scrambled form (SHA-256 hash) of your IP address and a count of your searches in the current minute. Your IP address itself is never stored. Because an IP address can in principle be guessed back from its hash, we treat the hash as personal data.',
      da: 'En omformet udgave (SHA-256-hash) af din IP-adresse og antallet af dine søgninger i det aktuelle minut. Selve IP-adressen gemmes aldrig. Da en IP-adresse i princippet kan gættes ud fra sin hash, behandler vi hashen som en personoplysning.',
    },
    why: {
      en: 'To allow at most 30 searches a minute per visitor, so no one can use up the free service for everyone.',
      da: 'For højst at tillade 30 søgninger i minuttet pr. besøgende, så ingen kan opbruge den gratis tjeneste for alle andre.',
    },
    where: {
      en: 'Our database at Supabase (Frankfurt, EU), in a table only the search function can reach.',
      da: 'Vores database hos Supabase (Frankfurt, EU), i en tabel som kun søgefunktionen har adgang til.',
    },
    basis: {
      en: 'Legitimate interest (Art. 6(1)(f)): preventing abuse.',
      da: 'Legitim interesse (art. 6, stk. 1, litra f): at forhindre misbrug.',
    },
    retention: {
      en: 'Each per-minute counter expires 2 minutes after it starts and is deleted within 15 minutes. A site-wide daily total, which contains no identifier, is deleted after 2 days.',
      da: 'Hver minut-tæller udløber 2 minutter efter, den starter, og slettes inden for 15 minutter. En samlet daglig tæller for hele sitet, uden nogen identifikation, slettes efter 2 dage.',
    },
  },
  {
    title: { en: 'Your account (optional)', da: 'Din konto (valgfri)' },
    what: {
      en: 'What your sign-in provider (GitHub or LinkedIn) shares when you sign in: your email address, account ID, name or username and profile picture link. Supabase also records your sign-in sessions and a log of sign-in events, including the IP address and browser used.',
      da: 'Det, din login-udbyder (GitHub eller LinkedIn) deler, når du logger ind: din e-mailadresse, konto-id, navn eller brugernavn og link til profilbillede. Supabase registrerer også dine login-sessioner og en log over login-hændelser, herunder IP-adresse og browser.',
    },
    why: {
      en: 'To know that it is you, so your progress can follow you between devices. We show only your email address; we use nothing else.',
      da: 'For at vide, at det er dig, så dine fremskridt kan følge dig mellem enheder. Vi viser kun din e-mailadresse og bruger intet andet.',
    },
    where: {
      en: 'Supabase (Frankfurt, EU), as our data processor.',
      da: 'Supabase (Frankfurt, EU) som vores databehandler.',
    },
    basis: {
      en: 'Performance of the service you signed up for (Art. 6(1)(b)).',
      da: 'Opfyldelse af den tjeneste, du har tilmeldt dig (art. 6, stk. 1, litra b).',
    },
    retention: {
      en: 'Until you ask us to delete your account. Sessions end when you sign out.',
      da: 'Indtil du beder os om at slette din konto. Sessioner ophører, når du logger ud.',
    },
  },
  {
    title: { en: 'Synced progress (optional)', da: 'Synkroniserede fremskridt (valgfri)' },
    what: {
      en: 'The same progress kept in your browser (answers per term, when each is due, the status you set, and when), plus when it was last changed.',
      da: 'De samme fremskridt, som ligger i din browser (svar pr. begreb, hvornår det skal gentages, den status, du har sat, og hvornår), samt hvornår de sidst blev ændret.',
    },
    why: {
      en: 'To keep your progress in step across your devices.',
      da: 'For at holde dine fremskridt ens på tværs af dine enheder.',
    },
    where: {
      en: 'Supabase (Frankfurt, EU). Only you can read or change your own row.',
      da: 'Supabase (Frankfurt, EU). Kun du kan læse eller ændre din egen række.',
    },
    basis: {
      en: 'Performance of the service you signed up for (Art. 6(1)(b)).',
      da: 'Opfyldelse af den tjeneste, du har tilmeldt dig (art. 6, stk. 1, litra b).',
    },
    retention: {
      en: '"Delete my synced data" empties it at once. An empty marker with the time of deletion remains, so other devices cannot upload the progress again, until your account is deleted.',
      da: '"Slet mine synkroniserede data" tømmer dem med det samme. En tom markering med tidspunktet for sletningen bliver liggende, så andre enheder ikke kan uploade fremskridtene igen, indtil din konto slettes.',
    },
  },
  {
    title: { en: 'Emails you send us', da: 'E-mails, du sender os' },
    what: {
      en: 'Your email address and what you write.',
      da: 'Din e-mailadresse og det, du skriver.',
    },
    why: {
      en: 'To answer you, for example a request to delete your account.',
      da: 'For at svare dig, fx på en anmodning om at slette din konto.',
    },
    where: { en: 'Our mailbox (Microsoft Outlook).', da: 'Vores postkasse (Microsoft Outlook).' },
    basis: {
      en: 'Legitimate interest (Art. 6(1)(f)) in answering, or a legal obligation (Art. 6(1)(c)) when you use your rights.',
      da: 'Legitim interesse (art. 6, stk. 1, litra f) i at svare, eller en retlig forpligtelse (art. 6, stk. 1, litra c), når du bruger dine rettigheder.',
    },
    retention: {
      en: 'As long as needed to handle your request.',
      da: 'Så længe det er nødvendigt for at behandle din henvendelse.',
    },
  },
];

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
      en: 'Accounts, synced progress and the search function; data stored in Frankfurt (EU). Our data processor.',
      da: 'Konti, synkroniserede fremskridt og søgefunktionen; data opbevares i Frankfurt (EU). Vores databehandler.',
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
    name: 'LinkedIn',
    role: {
      en: 'Sign-in provider, only if offered and you choose it. Like GitHub when you sign in with GitHub, LinkedIn is responsible for your account there and learns that you signed in to Atlas.',
      da: 'Login-udbyder, kun hvis den tilbydes, og du vælger den. Ligesom GitHub, når du logger ind med GitHub, er LinkedIn ansvarlig for din konto dér og får at vide, at du loggede ind på Atlas.',
    },
    link: LINKS.linkedin,
  },
];

export const PRIVACY_UI = {
  en: {
    title: 'Privacy',
    intro:
      'Atlas collects as little as it can. You can use every part of it without an account, and nothing about you is sold, shared for advertising or used to track you.',
    updated: 'Last updated {date}.',
    controllerTitle: 'Who is responsible',
    controller: 'The data controller is {name}. Questions and requests about your data:',
    shortTitle: 'In short',
    short: [
      'No cookies, no analytics, no ads, no trackers.',
      'Your progress lives in your browser. It leaves it only if you sign in to sync it.',
      'Search questions are sent to our search function without anything that identifies you; your IP address is only used, scrambled, to limit abuse, and deleted within minutes.',
      'Account and synced data are stored in the EU (Frankfurt).',
    ],
    dataTitle: 'What we process, and why',
    what: 'What',
    why: 'Why',
    where: 'Where, and who processes it',
    basis: 'Legal basis',
    retention: 'How long',
    storageTitle: 'What is stored in your browser',
    storageIntro:
      'Atlas sets no cookies. It keeps the items below in your browser’s storage. They stay on your device (only your progress is synced, and only if you sign in), and you can remove them at any time by clearing the site data in your browser.',
    storageKey: 'Name',
    storageWhere: 'Kept in',
    storagePurpose: 'Purpose',
    consent:
      'Every item is either strictly necessary for something you asked for or remembers a choice you made, so under the ePrivacy rules (in Denmark, the cookie order — cookiebekendtgørelsen) no consent is needed and there is no cookie banner. Atlas uses no analytics, advertising or tracking. If that ever changes, we will ask for your consent first.',
    processorsTitle: 'Who else is involved',
    rightsTitle: 'Your rights',
    rights: [
      'Access: email us and we send you everything we hold about you.',
      'Rectification: your progress is yours to change on the site; your name and email come from your sign-in provider, so change them there — or email us.',
      'Erasure: "Delete my synced data" on the account page removes your progress from the server at once. To delete your account itself (email address and sign-in records), email us.',
      'Portability: "Download my progress" on the account page saves your progress as a JSON file.',
      'Objection and restriction: you may object to processing based on legitimate interest, or ask us to restrict it — email us.',
    ],
    rightsReply: 'We answer within one month.',
    complaintTitle: 'Complaints',
    complaint:
      'You can complain to the Danish Data Protection Agency (Datatilsynet). We would appreciate hearing from you first.',
    complaintLink: 'Complain to Datatilsynet',
    changesTitle: 'Changes',
    changes: 'If what we collect changes, this page changes first, with a new date at the top.',
  },
  da: {
    title: 'Privatliv',
    intro:
      'Atlas indsamler så lidt som muligt. Du kan bruge alle dele af sitet uden en konto, og intet om dig bliver solgt, delt til reklamer eller brugt til at spore dig.',
    updated: 'Senest opdateret {date}.',
    controllerTitle: 'Hvem er ansvarlig',
    controller: 'Dataansvarlig er {name}. Spørgsmål og anmodninger om dine data:',
    shortTitle: 'Kort fortalt',
    short: [
      'Ingen cookies, ingen statistik, ingen reklamer, ingen sporing.',
      'Dine fremskridt ligger i din browser. De forlader den kun, hvis du logger ind for at synkronisere dem.',
      'Søgespørgsmål sendes til vores søgefunktion uden noget, der identificerer dig; din IP-adresse bruges kun, i omformet form, til at begrænse misbrug og slettes efter få minutter.',
      'Konto og synkroniserede data opbevares i EU (Frankfurt).',
    ],
    dataTitle: 'Hvad vi behandler, og hvorfor',
    what: 'Hvad',
    why: 'Hvorfor',
    where: 'Hvor, og hvem behandler det',
    basis: 'Retsgrundlag',
    retention: 'Hvor længe',
    storageTitle: 'Hvad der gemmes i din browser',
    storageIntro:
      'Atlas sætter ingen cookies. Sitet gemmer nedenstående i din browsers lager. Det bliver på din enhed (kun dine fremskridt synkroniseres, og kun hvis du logger ind), og du kan til enhver tid fjerne det ved at rydde sitets data i din browser.',
    storageKey: 'Navn',
    storageWhere: 'Gemmes i',
    storagePurpose: 'Formål',
    consent:
      'Hvert element er enten strengt nødvendigt for noget, du har bedt om, eller husker et valg, du har truffet. Efter ePrivacy-reglerne (i Danmark cookiebekendtgørelsen) kræver det derfor ikke samtykke, og der er intet cookiebanner. Atlas bruger ingen statistik, reklamer eller sporing. Hvis det nogensinde ændrer sig, beder vi først om dit samtykke.',
    processorsTitle: 'Hvem er ellers involveret',
    rightsTitle: 'Dine rettigheder',
    rights: [
      'Indsigt: skriv til os, så sender vi dig alt, hvad vi har om dig.',
      'Berigtigelse: dine fremskridt kan du selv ændre på sitet; dit navn og din e-mail kommer fra din login-udbyder, så ret dem dér — eller skriv til os.',
      'Sletning: "Slet mine synkroniserede data" på kontosiden fjerner straks dine fremskridt fra serveren. Skriv til os for at slette selve kontoen (e-mailadresse og login-oplysninger).',
      'Dataportabilitet: "Download mine fremskridt" på kontosiden gemmer dine fremskridt som en JSON-fil.',
      'Indsigelse og begrænsning: du kan gøre indsigelse mod behandling, der bygger på legitim interesse, eller bede os begrænse den — skriv til os.',
    ],
    rightsReply: 'Vi svarer inden for en måned.',
    complaintTitle: 'Klage',
    complaint: 'Du kan klage til Datatilsynet. Vi vil dog gerne høre fra dig først.',
    complaintLink: 'Klag til Datatilsynet',
    changesTitle: 'Ændringer',
    changes: 'Hvis det, vi indsamler, ændrer sig, ændres denne side først, med en ny dato øverst.',
  },
} satisfies Record<Lang, Record<string, string | string[]>>;
