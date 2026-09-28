// The feedback form's messages (lib/feedback.ts, A100). The limits, the browser half and
// the Edge Function are tested in feedback-function.test.ts.
import { describe, expect, it } from 'vitest';
import { FEEDBACK_MAX_CHARS, FEEDBACK_UI, feedbackCounter, feedbackError } from './feedback';

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
