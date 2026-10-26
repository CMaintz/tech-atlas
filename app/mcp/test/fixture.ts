import type { AtlasBundle, BundleTerm } from '../src/bundle';

const SITE = 'https://atlas.maintz.dev/';

type Names = { en: string; da: string };

const placement = (id: string) => ({
  url: { en: `${SITE}en/terms/${id}/`, da: `${SITE}da/terms/${id}/` },
  domain: [id.split('/')[0]],
  cluster: 'test',
  depth: 0,
});

const prose = ({ en, da }: Names) => ({
  summary: { en: `${en} summary.`, da: `${da} resume.` },
  body: { plain: { en: `${en} in plain words.`, da: `${da} med enkle ord.` } },
  sources: [{ title: `${en} source`, tier: 'reference' as const }],
});

function term(id: string, names: Names, extra: Partial<BundleTerm> = {}): BundleTerm {
  const aka = { en: [], da: [] };
  return { id, term: names, aka, ...placement(id), ...prose(names), ...extra };
}

const TERMS: BundleTerm[] = [
  term('cs/tls', { en: 'TLS', da: 'TLS' }, { aka: { en: ['Transport Layer Security'], da: [] } }),
  term(
    'security/encryption',
    { en: 'Encryption', da: 'Kryptering' },
    {
      aka: { en: ['enciphering'], da: ['kryptografering'] },
    },
  ),
  term('security/digital-certificate', { en: 'Digital certificate', da: 'Digitalt certifikat' }),
  term('security/pki', { en: 'Public key infrastructure', da: 'Offentlig nøgleinfrastruktur' }),
  term(
    'ai/accuracy',
    { en: 'Accuracy', da: 'Nøjagtighed (accuracy)' },
    {
      aka: { en: ['classification accuracy'], da: ['træfsikkerhed'] },
    },
  ),
  term('ai/f1-score', { en: 'F1 score', da: 'F1-score' }),
  term('cs/model', { en: 'Model (data)', da: 'Datamodel' }),
  term('ai/model', { en: 'Model', da: 'Model' }),
];

export const FIXTURE: AtlasBundle = {
  terms: TERMS,
  links: [
    { source: 'cs/tls', target: 'security/encryption', type: 'requires' },
    { source: 'cs/tls', target: 'security/digital-certificate', type: 'requires' },
    { source: 'security/digital-certificate', target: 'security/pki', type: 'part-of' },
    { source: 'ai/accuracy', target: 'ai/f1-score', type: 'contrasts-with' },
  ],
  search: TERMS.map((t) => ({
    id: t.id,
    term: t.term,
    aka: t.aka,
    summary: t.summary,
    contrasts: [],
  })),
  questions: {
    en: [
      {
        id: 'q-tls-order',
        terms: ['cs/tls'],
        kind: 'order',
        stem: 'In which order does a TLS handshake happen?',
        options: ['Keys, then certificate', 'Certificate, then keys'],
        answer: 1,
        explanation: 'The certificate is checked before keys are agreed.',
        difficulty: 2,
        answeredBy: [],
      },
      {
        id: 'q-accuracy-concept',
        terms: ['ai/accuracy'],
        kind: 'concept',
        stem: 'What share of cases does a model get right?',
        options: ['F1 score', 'Accuracy'],
        answer: 1,
        explanation: 'Accuracy is the share of all cases a model gets right.',
        difficulty: 1,
        answeredBy: ['ai/accuracy'],
      },
    ],
    da: [
      {
        id: 'q-tls-order',
        terms: ['cs/tls'],
        kind: 'order',
        stem: 'I hvilken rækkefølge sker et TLS-håndtryk?',
        options: ['Nøgler, så certifikat', 'Certifikat, så nøgler'],
        answer: 1,
        explanation: 'Certifikatet kontrolleres, før nøglerne aftales.',
        difficulty: 2,
        answeredBy: [],
      },
    ],
  },
};
