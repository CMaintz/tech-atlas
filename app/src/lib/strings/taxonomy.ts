/** Names of the map's domains, clusters and relationship families, in both languages. */
import type { Lang } from '../lang';

export const DOMAIN_LABELS: Record<string, Record<Lang, string>> = {
  security: { en: 'Security', da: 'Sikkerhed' },
  cs: { en: 'Computer science', da: 'Datalogi' },
  ai: { en: 'AI', da: 'AI' },
  platform: { en: 'Platform', da: 'Platform' },
};

export const CLUSTER_LABELS: Record<string, Record<Lang, string>> = {
  fundamentals: { en: 'Fundamentals', da: 'Grundbegreber' },
  awareness: { en: 'People, culture & awareness', da: 'Mennesker, kultur og awareness' },
  controls: { en: 'Controls & technical basics', da: 'Kontroller og tekniske grundbegreber' },
  'risk-management': { en: 'Risk management', da: 'Risikostyring' },
  compliance: { en: 'Compliance & regulation', da: 'Compliance, styring og lovgivning' },
  'incident-response': { en: 'Incidents & continuity', da: 'Beredskab og hændelser' },
  'application-security': { en: 'Application security', da: 'Applikationssikkerhed' },
  'security-operations': { en: 'Detection & response', da: 'Detektion og respons' },
  networking: { en: 'Networking', da: 'Netværk' },
  os: { en: 'Operating systems', da: 'Styresystemer' },
  identity: { en: 'Identity & access', da: 'Identitet og adgang' },
  cryptography: { en: 'Cryptography', da: 'Kryptografi' },
  web: { en: 'Web & data', da: 'Web og data' },
  'ml-fundamentals': { en: 'Machine learning basics', da: 'Grundlæggende maskinlæring' },
  llm: { en: 'Language models', da: 'Sprogmodeller' },
  'ai-risk': { en: 'AI risk & governance', da: 'AI-risiko og governance' },
  training: { en: 'Training & optimisation', da: 'Træning og optimering' },
  evaluation: { en: 'Evaluation & metrics', da: 'Evaluering og målinger' },
  'model-architecture': { en: 'Model architectures', da: 'Modelarkitekturer' },
  prompting: { en: 'Prompting & generation', da: 'Prompting og generering' },
  'ai-infrastructure': { en: 'AI hardware & serving', da: 'AI-hardware og drift' },
  retrieval: { en: 'Retrieval & search', da: 'Genfinding og søgning' },
  agents: { en: 'Agents & tools', da: 'Agenter og værktøjer' },
  'ai-coding': { en: 'AI-assisted coding', da: 'AI-assisteret kodning' },
  cloud: { en: 'Cloud', da: 'Cloud' },
  containers: { en: 'Containers & orchestration', da: 'Containere og orkestrering' },
  delivery: { en: 'Software delivery', da: 'Softwarelevering' },
  observability: { en: 'Observability', da: 'Observerbarhed' },
};

export const FAMILY_LABELS: Record<string, Record<Lang, string>> = {
  structure: { en: 'Structure (kind of, part of)', da: 'Struktur (slags, del af)' },
  dependency: { en: 'Prerequisites', da: 'Forudsætninger' },
  contrast: { en: 'Contrasts & alternatives', da: 'Kontraster og alternativer' },
  security: { en: 'Attacks & defences', da: 'Angreb og forsvar' },
  regulation: { en: 'Regulation', da: 'Regulering' },
  lineage: { en: 'Lineage', da: 'Afstamning' },
  association: { en: 'Used together', da: 'Bruges sammen' },
};

/** A domain's name in `lang`; an unlabelled domain shows its id. */
export const domainLabel = (id: string, lang: Lang) => DOMAIN_LABELS[id]?.[lang] ?? id;

/** A cluster's name in `lang`; an unlabelled cluster shows its id. */
export const clusterLabel = (id: string, lang: Lang) => CLUSTER_LABELS[id]?.[lang] ?? id;
