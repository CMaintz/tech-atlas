/**
 * The privacy page's content (A88), both languages. Kept apart from `UI` in site.ts
 * (as ui-extra.ts is) so the long text doesn't churn the main string table. Split by
 * section: browser storage, personal data, processors and the page's running text.
 *
 * Every storage key the site uses must be listed in STORAGE (privacy-storage.ts) —
 * privacy.test.ts scans the source and fails when a new key appears unlisted. Keep the
 * data inventory in step with the code and supabase/migrations/ whenever what is stored
 * changes, and bump UPDATED.
 */
export * from './privacy-storage';
export * from './privacy-data';
export * from './privacy-processors';
export * from './privacy-ui';

export const UPDATED = '2026-09-28';

export const CONTROLLER = {
  name: 'Christoffer Maintz Andersen',
  email: 'cmaintz@outlook.com',
};
