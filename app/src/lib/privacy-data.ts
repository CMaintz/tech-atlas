/** The privacy page: every piece of personal data the site processes, and why (A88). */
import type { Lang } from './site';

type T = Record<Lang, string>;

export type DataItem = {
  /** Anchor on the privacy page, for items linked from elsewhere (e.g. #feedback). */
  id?: string;
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
      en: "Decided by GitHub - see GitHub's privacy statement.",
      da: 'Bestemmes af GitHub - se GitHubs privatlivserklæring.',
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
      en: 'Our search function at Supabase (Frankfurt, EU) turns the text into numbers using Cloudflare Workers AI. Cloudflare receives only the text - no IP address, account or other identifier - and may process it outside the EU. Please do not type personal information into the search box.',
      da: 'Vores søgefunktion hos Supabase (Frankfurt, EU) omsætter teksten til tal via Cloudflare Workers AI. Cloudflare modtager kun teksten - ingen IP-adresse, konto eller anden identifikation - og kan behandle den uden for EU. Skriv venligst ikke personoplysninger i søgefeltet.',
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
    id: 'feedback',
    title: { en: 'Feedback you send (optional)', da: 'Feedback, du sender (valgfri)' },
    what: {
      en: 'What you write in the Feedback form, the type you pick, the page you were on (its address without anything after "?"), the site language and, only if you give it, your email address. To limit abuse, also a scrambled form (SHA-256 hash) of your IP address, never the address itself.',
      da: 'Det, du skriver i feedbackformularen, den type, du vælger, siden, du var på (adressen uden noget efter "?"), sitets sprog og, kun hvis du oplyser den, din e-mailadresse. For at begrænse misbrug også en omformet udgave (SHA-256-hash) af din IP-adresse, aldrig selve adressen.',
    },
    why: {
      en: 'To fix what you report and improve Atlas, and to answer you if you asked for a reply. The scrambled IP address allows at most 5 messages an hour per visitor.',
      da: 'For at rette det, du melder, og forbedre Atlas, og for at svare dig, hvis du har bedt om svar. Den omformede IP-adresse tillader højst 5 beskeder i timen pr. besøgende.',
    },
    where: {
      en: 'Our database at Supabase (Frankfurt, EU), in a table that only the feedback function can write to and no visitor can read. A copy is emailed to our mailbox (Microsoft Outlook) through Resend, Inc. (USA), which delivers the email and so sees its content. Please do not put sensitive information in feedback.',
      da: 'Vores database hos Supabase (Frankfurt, EU), i en tabel, som kun feedbackfunktionen kan skrive i, og som ingen besøgende kan læse. En kopi sendes til vores postkasse (Microsoft Outlook) via Resend, Inc. (USA), som leverer e-mailen og derfor ser indholdet. Skriv venligst ikke følsomme oplysninger i din feedback.',
    },
    basis: {
      en: 'Legitimate interest (Art. 6(1)(f)): improving Atlas from what visitors report, and preventing abuse. Your email address only with your consent (Art. 6(1)(a)), which you give by entering it and can withdraw at any time.',
      da: 'Legitim interesse (art. 6, stk. 1, litra f): at forbedre Atlas ud fra det, besøgende melder, og at forhindre misbrug. Din e-mailadresse kun med dit samtykke (art. 6, stk. 1, litra a), som du giver ved at skrive den, og som du til enhver tid kan trække tilbage.',
    },
    retention: {
      en: 'Stored feedback is deleted automatically after 180 days; the scrambled IP address is removed from it after 2 days. The email copy is kept in our mailbox as long as needed to handle it; Resend keeps its delivery records for a limited time under its own policy. To have your feedback deleted sooner, email us (tell us roughly when you sent it).',
      da: 'Gemt feedback slettes automatisk efter 180 dage; den omformede IP-adresse fjernes fra den efter 2 dage. E-mailkopien gemmes i vores postkasse, så længe det er nødvendigt for at behandle den; Resend gemmer sine leveringsoplysninger i en begrænset periode efter sine egne regler. Skriv til os, hvis din feedback skal slettes før (fortæl os cirka, hvornår du sendte den).',
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
