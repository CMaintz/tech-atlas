import { FEEDBACK_UI, type FeedbackProps } from './feedback';
import { FEEDBACK_URL, url, type Lang } from './site';

export const feedbackProps = (lang: Lang): FeedbackProps =>
  FEEDBACK_URL
    ? {
        url: FEEDBACK_URL,
        lang,
        ui: { ...FEEDBACK_UI[lang] },
        privacyHref: url(`${lang}/privacy/#feedback`),
      }
    : null;
