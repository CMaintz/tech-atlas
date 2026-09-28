// The `feedback` Edge Function's validation and email (supabase/functions/feedback, A100),
// and the browser half of the form (lib/feedback.ts). The handler: feedback-handler.test.ts.
import { describe, expect, it, vi } from 'vitest';
import {
  CATEGORIES,
  FEEDBACK_FROM,
  FEEDBACK_TO,
  MAX_EMAIL_CHARS,
  MAX_MESSAGE_CHARS,
  emailText,
  parseFeedback,
  resendPayload,
  subjectOf,
} from '../../../supabase/functions/feedback/logic';
import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_MAX_CHARS,
  FEEDBACK_MAX_EMAIL,
  FEEDBACK_UI,
  feedbackBody,
  feedbackIssue,
  sendFeedback,
} from './feedback';
import { valid } from './feedback-fixtures';

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

describe('parseFeedback', () => {
  it('accepts a full request and trims it', () => {
    const r = parseFeedback({ ...valid, message: '  hi  ', email: ' a@b.dk ' });
    expect(r).toEqual({
      ok: true,
      honeypot: false,
      value: { category: 'bug', message: 'hi', email: 'a@b.dk', page: valid.page, lang: 'da' },
    });
  });

  it('makes email and page optional', () => {
    const r = parseFeedback({ category: 'idea', message: 'x', lang: 'en' });
    expect(r.ok && r.value).toMatchObject({ email: null, page: null });
  });

  it.each([
    [{ ...valid, category: 'praise' }, 'category'],
    [{ ...valid, message: '   ' }, 'message'],
    [{ ...valid, message: 'x'.repeat(MAX_MESSAGE_CHARS + 1) }, 'message'],
    [{ ...valid, email: 'not-an-email' }, 'email'],
    [{ ...valid, email: 'a@b.dk\r\nBcc: x@y.z' }, 'email'],
    [{ ...valid, email: 42 }, 'email'],
    [{ ...valid, page: 'x'.repeat(501) }, 'page'],
    [{ ...valid, lang: 'de' }, 'lang'],
    [[], 'object'],
    [null, 'object'],
  ])('rejects %j', (body, field) => {
    const r = parseFeedback(body);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toContain(field);
  });

  it('accepts a message of exactly the limit', () => {
    expect(parseFeedback({ ...valid, message: 'x'.repeat(MAX_MESSAGE_CHARS) }).ok).toBe(true);
  });

  it('flags a filled honeypot', () => {
    const r = parseFeedback({ ...valid, website: 'https://spam.example' });
    expect(r.ok && r.honeypot).toBe(true);
  });
});

describe('the email', () => {
  const f = {
    category: 'content' as const,
    message:
      'The definition of\r\nphishing mixes up two ideas that should really be kept apart here',
    email: 'reader@example.com',
    page: '/tech-atlas/en/terms/security/phishing/',
    lang: 'en' as const,
  };

  it('has a one-line subject with the category and the first words', () => {
    const s = subjectOf(f);
    expect(s).toBe(
      '[Atlas feedback] Content error: The definition of phishing mixes up two ideas...',
    );
    expect(s).not.toMatch(/[\r\n]/);
    expect(subjectOf({ category: 'idea', message: 'Dark mode' })).toBe(
      '[Atlas feedback] Idea: Dark mode',
    );
  });

  it('caps a subject made of one long word', () => {
    expect(subjectOf({ category: 'other', message: 'x'.repeat(500) }).length).toBeLessThan(100);
  });

  it('sends every field as plain text, with reply_to only when given', () => {
    const at = new Date(Date.UTC(2026, 8, 28));
    const p = resendPayload(f, at);
    expect(p).toMatchObject({ from: FEEDBACK_FROM, to: [FEEDBACK_TO], reply_to: f.email });
    const text = emailText(f, at);
    for (const part of ['Content error', f.email, f.page, 'Language: en', f.message, '2026-09-28'])
      expect(text).toContain(part);
    expect(resendPayload({ ...f, email: null }, at)).not.toHaveProperty('reply_to');
    expect(FEEDBACK_FROM).toBe('Atlas <onboarding@resend.dev>');
    expect(FEEDBACK_TO).toBe('cmaintz@outlook.com');
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
