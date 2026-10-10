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

function useFeedbackFields() {
  const [form, setForm] = useState<FeedbackForm>(EMPTY);
  const setField = <K extends keyof FeedbackForm>(key: K, value: FeedbackForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));
  const clearTextFields = () => setForm((f) => ({ ...f, message: '', email: '', website: '' }));
  return { form, setField, clearTextFields };
}

type Outcome = {
  status: FeedbackStatus;
  setStatus: (status: FeedbackStatus) => void;
  setIssue: (issue: FeedbackIssue) => void;
  clearTextFields: () => void;
};

function makeRestarts({ status, setStatus, setIssue, clearTextFields }: Outcome) {
  const prepare = () => {
    if (status !== 'sending') setStatus('idle');
    setIssue(null);
  };
  const reset = () => {
    clearTextFields();
    setIssue(null);
    setStatus('idle');
  };
  return { prepare, reset };
}

type Target = { url: string; lang: Lang };

function makeSend({ url, lang }: Target, { setStatus, clearTextFields }: Outcome) {
  return async (f: FeedbackForm) => {
    setStatus('sending');
    const result = await sendFeedback(url, feedbackBody(f, location.pathname, lang));
    setStatus(result);
    if (result === 'sent') clearTextFields();
  };
}

export function useFeedbackForm(url: string, lang: Lang) {
  const { form, setField, clearTextFields } = useFeedbackFields();
  const [status, setStatus] = useState<FeedbackStatus>('idle');
  const [issue, setIssue] = useState<FeedbackIssue>(null);
  const outcome: Outcome = { status, setStatus, setIssue, clearTextFields };
  const send = makeSend({ url, lang }, outcome);
  const submit = async (onInvalid: (field: NonNullable<FeedbackIssue>) => void) => {
    if (status === 'sending') return;
    const problem = feedbackIssue(form);
    setIssue(problem);
    if (problem) return onInvalid(problem);
    await send(form);
  };
  return { form, setField, status, issue, ...makeRestarts(outcome), submit };
}
