// The browser half of the feedback form (lib/feedback.ts, A100), and that it agrees with
// the `feedback` Edge Function (supabase/functions/feedback; see feedback-function.test.ts).
import { describe, expect, it, vi } from 'vitest';
import {
  CATEGORIES,
  MAX_EMAIL_CHARS,
  MAX_MESSAGE_CHARS,
  parseFeedback,
} from '../../../supabase/functions/feedback/logic';
import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_MAX_CHARS,
  FEEDBACK_MAX_EMAIL,
  FEEDBACK_UI,
  feedbackBody,
  feedbackCounter,
  feedbackError,
  feedbackIssue,
  sendFeedback,
} from './feedback';

describe('the form and the function agree', () => {
  it('uses the same limits and categories', () => {
    expect(FEEDBACK_CATEGORIES).toEqual(CATEGORIES);
    expect(FEEDBACK_MAX_CHARS).toBe(MAX_MESSAGE_CHARS);
    expect(FEEDBACK_MAX_EMAIL).toBe(MAX_EMAIL_CHARS);
  });

  it('has every string in both languages', () => {
    expect(Object.keys(FEEDBACK_UI.da).sort()).toEqual(Object.keys(FEEDBACK_UI.en).sort());
    for (const lang of ['en', 'da'] as const)
      for (const [k, v] of Object.entries(FEEDBACK_UI[lang]))
        expect(v.trim(), `${lang}.${k}`).not.toBe('');
  });
});

describe('the browser half', () => {
  const form = { category: 'idea' as const, message: ' More terms ', email: '', website: '' };

  it('checks the message and the optional email', () => {
    expect(feedbackIssue(form)).toBeNull();
    expect(feedbackIssue({ ...form, message: '  ' })).toBe('message');
    expect(feedbackIssue({ ...form, message: 'x'.repeat(FEEDBACK_MAX_CHARS + 1) })).toBe('message');
    expect(feedbackIssue({ ...form, email: 'nope' })).toBe('email');
    expect(feedbackIssue({ ...form, email: 'a@b.dk' })).toBeNull();
  });

  it('builds a body the function accepts', () => {
    const body = feedbackBody(form, '/tech-atlas/en/', 'en');
    expect(body).toEqual({
      category: 'idea',
      message: 'More terms',
      page: '/tech-atlas/en/',
      lang: 'en',
      website: '',
    });
    const parsed = parseFeedback(body);
    expect(parsed.ok && !parsed.honeypot).toBe(true);
  });

  it('maps the answer to sent / limited / failed', async () => {
    const body = feedbackBody(form, '/', 'en');
    const answer = (status: number) => vi.fn(async () => new Response('{}', { status }));
    expect(await sendFeedback('u', body, answer(200))).toBe('sent');
    expect(await sendFeedback('u', body, answer(429))).toBe('limited');
    expect(await sendFeedback('u', body, answer(502))).toBe('failed');
    const down = vi.fn(async () => {
      throw new TypeError('offline');
    });
    expect(await sendFeedback('u', body, down)).toBe('failed');
  });
});

describe('feedbackCounter', () => {
  it('fills in the count and the limit', () => {
    expect(feedbackCounter(12, FEEDBACK_UI.en)).toBe('12 of 2000 characters');
    expect(feedbackCounter(0, FEEDBACK_UI.da)).toBe('0 af 2000 tegn');
  });
});

describe('feedbackError', () => {
  const ui = FEEDBACK_UI.en;

  it('is empty while all is well', () => {
    expect(feedbackError(null, 'idle', ui)).toBe('');
    expect(feedbackError(null, 'sending', ui)).toBe('');
    expect(feedbackError(null, 'sent', ui)).toBe('');
  });

  it('names a field problem first, with the limit filled in', () => {
    expect(feedbackError('message', 'failed', ui)).toBe(
      ui.errorMessage.replace('{max}', String(FEEDBACK_MAX_CHARS)),
    );
    expect(feedbackError('message', 'idle', ui)).toContain('2000');
    expect(feedbackError('email', 'limited', ui)).toBe(ui.errorEmail);
  });

  it('then explains a failed send', () => {
    expect(feedbackError(null, 'limited', ui)).toBe(ui.errorLimited);
    expect(feedbackError(null, 'failed', ui)).toBe(ui.errorFailed);
  });
});
