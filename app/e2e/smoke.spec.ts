import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Keep the first-visit tour from covering the page.
  await page.addInitScript(() => localStorage.setItem('atlas.tour.done', '1'));
});

test('home page renders with search', async ({ page }) => {
  await page.goto('en/');
  await expect(page).toHaveTitle('Atlas');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Atlas');
  await expect(page.getByRole('searchbox')).toBeVisible();
});

test('search finds a term and opens its page', async ({ page }) => {
  await page.goto('en/');
  await page.getByRole('searchbox').fill('phishing');
  const hit = page.locator('#search ~ ul a[href$="/terms/security/phishing/"]');
  await expect(hit).toContainText('Phishing');
  await hit.click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Phishing');
});

test('term page shows the term', async ({ page }) => {
  await page.goto('en/terms/security/phishing/');
  await expect(page).toHaveTitle('Phishing - Atlas');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Phishing');
});

test('bare term name redirects to its page, in Danish too', async ({ page }) => {
  await page.goto('da/terms/phishing/');
  await expect(page).toHaveURL(/\/da\/terms\/security\/phishing\/$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'da');
});

test('explorer loads the graph', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('en/explorer/');
  await expect(page).toHaveTitle('Explorer - Atlas');
  await expect(page.locator('canvas').first()).toBeAttached({ timeout: 15_000 });
  expect(errors).toEqual([]);
});
