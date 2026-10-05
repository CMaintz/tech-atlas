import { useState } from 'preact/hooks';
import {
  feedbackBody,
  feedbackIssue,
  sendFeedback,
  type FeedbackForm,
  type FeedbackIssue,
  type FeedbackStatus,
} from './feedback';
import type { Lang } from './site';

const EMPTY: FeedbackForm = { category: 'bug', message: '', email: '', website: '' };

/**
 * The Feedback form's state: the fields, what is wrong with them, and how
 * sending went. `submit` checks the form first and hands an invalid field to
 * `onInvalid` (synchronously, so the caller can focus it) instead of sending.
 */
export function useFeedbackForm(url: string, lang: Lang) {
  const [form, setForm] = useState<FeedbackForm>(EMPTY);
  const [status, setStatus] = useState<FeedbackStatus>('idle');
  const [issue, setIssue] = useState<FeedbackIssue>(null);

  const setField = <K extends keyof FeedbackForm>(key: K, value: FeedbackForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));
  /** Empty the text fields; the category stays as chosen. */
  const clearText = () => setForm((f) => ({ ...f, message: '', email: '', website: '' }));

  /** On (re)opening: forget the last outcome, unless a send is still under way. */
  const prepare = () => {
    if (status !== 'sending') setStatus('idle');
    setIssue(null);
  };
  /** "Send more": a fresh form. */
  const reset = () => {
    clearText();
    setIssue(null);
    setStatus('idle');
  };
  const send = async (f: FeedbackForm) => {
    setStatus('sending');
    const result = await sendFeedback(url, feedbackBody(f, location.pathname, lang));
    setStatus(result);
    if (result === 'sent') clearText();
  };
  const submit = async (onInvalid: (field: NonNullable<FeedbackIssue>) => void) => {
    if (status === 'sending') return;
    const problem = feedbackIssue(form);
    setIssue(problem);
    if (problem) return onInvalid(problem);
    await send(form);
  };
  return { form, setField, status, issue, prepare, reset, submit };
}
