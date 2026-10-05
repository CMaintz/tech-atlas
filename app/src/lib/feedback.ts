/**
 * The feedback form: its limits, its strings (EN + DA) and the request it sends
 * to the `feedback` Edge Function (supabase/functions/feedback). The limits must equal
 * the function's; feedback-function.test.ts checks that they do. Pure: no DOM.
 */
import type { Lang } from './site';

export const FEEDBACK_CATEGORIES = ['bug', 'content', 'idea', 'other'] as const;
export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];
export const FEEDBACK_MAX_CHARS = 2000;
export const FEEDBACK_MAX_EMAIL = 254;
/** Give up waiting after this long; the function's own deadline is 8 s. */
export const FEEDBACK_TIMEOUT_MS = 10_000;

export type FeedbackForm = {
  category: FeedbackCategory;
  message: string;
  email: string;
  /** The hidden honeypot field; people never see it, so it stays empty. */
  website: string;
};

export type FeedbackIssue = 'message' | 'email' | null;

/** What stops the form from being sent, checked in the browser before sending. */
export function feedbackIssue(f: Pick<FeedbackForm, 'message' | 'email'>): FeedbackIssue {
  const m = f.message.trim();
  if (!m || f.message.length > FEEDBACK_MAX_CHARS) return 'message';
  const e = f.email.trim();
  if (
    e &&
    (e.length > FEEDBACK_MAX_EMAIL || !/^[^\s@<>()",;]+@[^\s@<>()",;]+\.[^\s@<>()",;]+$/.test(e))
  )
    return 'email';
  return null;
}

/** The JSON body: the form plus the page (path only, never the query) and language. */
export function feedbackBody(f: FeedbackForm, page: string, lang: Lang) {
  return {
    category: f.category,
    message: f.message.trim(),
    ...(f.email.trim() ? { email: f.email.trim() } : {}),
    page: page.slice(0, 500),
    lang,
    website: f.website,
  };
}

export type SendResult = 'sent' | 'limited' | 'failed';
/** Where the form stands: not yet sent, sending, or how the last send went. */
export type FeedbackStatus = 'idle' | 'sending' | SendResult;

/** POST the form to the function. Never throws. */
export async function sendFeedback(
  url: string,
  body: ReturnType<typeof feedbackBody>,
  doFetch: typeof fetch = fetch,
): Promise<SendResult> {
  try {
    const res = await doFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(FEEDBACK_TIMEOUT_MS),
    });
    if (res.status === 429) return 'limited';
    return res.ok ? 'sent' : 'failed';
  } catch {
    return 'failed';
  }
}

const FEEDBACK_EN = {
  feedback: 'Feedback',
  title: 'Send feedback',
  intro:
    'Found a bug or a mistake in a term, or have an idea? Tell us. The page you are on is sent along.',
  category: 'Type',
  bug: 'Bug',
  content: 'Content error',
  idea: 'Idea',
  other: 'Other',
  message: 'Message',
  messageHint: '{n} of {max} characters',
  email: 'Your email (optional)',
  emailHint: 'Only if you would like a reply.',
  honeypot: 'Leave this field empty',
  privacy: 'How we handle feedback',
  send: 'Send',
  sending: 'Sending...',
  cancel: 'Cancel',
  close: 'Close',
  sent: 'Thank you! Your feedback was sent.',
  sendAnother: 'Send more',
  errorMessage: 'Please write a message (at most {max} characters).',
  errorEmail: 'That does not look like an email address.',
  errorLimited: 'Too much feedback from here just now. Please try again in an hour.',
  errorFailed: 'Sorry, that did not go through. Please try again, or email us.',
};

export const FEEDBACK_UI: Record<Lang, Record<keyof typeof FEEDBACK_EN, string>> = {
  en: FEEDBACK_EN,
  da: {
    feedback: 'Feedback',
    title: 'Send feedback',
    intro:
      'Har du fundet en fejl på sitet eller i et begreb, eller har du en idé? Så skriv til os. Siden, du er på, sendes med.',
    category: 'Type',
    bug: 'Fejl på sitet',
    content: 'Fejl i indhold',
    idea: 'Idé',
    other: 'Andet',
    message: 'Besked',
    messageHint: '{n} af {max} tegn',
    email: 'Din e-mail (valgfri)',
    emailHint: 'Kun hvis du gerne vil have svar.',
    honeypot: 'Lad dette felt være tomt',
    privacy: 'Sådan behandler vi feedback',
    send: 'Send',
    sending: 'Sender...',
    cancel: 'Annuller',
    close: 'Luk',
    sent: 'Tak! Din feedback er sendt.',
    sendAnother: 'Send mere',
    errorMessage: 'Skriv venligst en besked (højst {max} tegn).',
    errorEmail: 'Det ligner ikke en e-mailadresse.',
    errorLimited: 'Der er sendt for meget feedback herfra lige nu. Prøv igen om en time.',
    errorFailed: 'Beklager, det gik ikke igennem. Prøv igen, eller skriv en e-mail til os.',
  },
};

export type FeedbackUi = (typeof FEEDBACK_UI)['en'];

/** The form's error line: a field problem first, else a failed send; '' when all is well. */
export function feedbackError(
  issue: FeedbackIssue,
  status: FeedbackStatus,
  ui: FeedbackUi,
): string {
  if (issue === 'message') return ui.errorMessage.replace('{max}', String(FEEDBACK_MAX_CHARS));
  if (issue === 'email') return ui.errorEmail;
  if (status === 'limited') return ui.errorLimited;
  if (status === 'failed') return ui.errorFailed;
  return '';
}

/** The counter under the message: "{n} of {max} characters". */
export const feedbackCounter = (n: number, ui: FeedbackUi) =>
  ui.messageHint.replace('{n}', String(n)).replace('{max}', String(FEEDBACK_MAX_CHARS));

/** Props for the Feedback island; null when the build has no feedback function. */
export type FeedbackProps = {
  url: string;
  lang: Lang;
  ui: FeedbackUi;
  privacyHref: string;
} | null;
