import { describe, expect, it, vi } from 'vitest';
import { panelCallbacks } from './use-term-panel';

describe('panelCallbacks', () => {
  it('shows a picked term in the panel', () => {
    const setId = vi.fn();
    panelCallbacks(setId).onSelect('cs/api');
    expect(setId).toHaveBeenCalledWith('cs/api');
  });
  it('hides the panel on close', () => {
    const setId = vi.fn();
    panelCallbacks(setId).onClose();
    expect(setId).toHaveBeenCalledWith(null);
  });
});
