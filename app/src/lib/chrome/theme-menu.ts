/**
 * Colour theme: System / Light / Dark. public/theme-init.js applied it before
 * paint; this keeps it in step with the menu and the OS.
 */
import { THEME_KEY, parseTheme, resolveTheme, type ThemeChoice } from '../prefs';
import type { Dropdown } from './dropdowns';

/** The browser-chrome colour (`<meta name="theme-color">`) for a theme. */
export const themeColour = (theme: 'light' | 'dark') => (theme === 'light' ? '#ffffff' : '#0a0a0a');

function storedChoice(): ThemeChoice {
  try {
    return parseTheme(localStorage.getItem(THEME_KEY));
  } catch {
    return 'system'; // storage blocked: follow the OS
  }
}

function storeChoice(choice: ThemeChoice) {
  try {
    if (choice === 'system') localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, choice);
  } catch {
    /* this page only */
  }
}

/** Show `choice` on the page and tick it in the menu. */
function applyTheme(choice: ThemeChoice, osPrefersLight: boolean) {
  const theme = resolveTheme(choice, osPrefersLight);
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.dataset.themeChoice = choice;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeColour(theme));
  for (const item of document.querySelectorAll<HTMLElement>('[data-theme-set]')) {
    const on = item.dataset.themeSet === choice;
    item.setAttribute('aria-checked', String(on));
    const check = item.querySelector('[data-check]');
    if (check) check.textContent = on ? '✓' : '';
  }
}

/** Follow the stored choice and the OS; a menu item stores a new choice. */
export function initThemeMenu(dropdowns: Dropdown[]) {
  const osLight = window.matchMedia('(prefers-color-scheme: light)');
  let choice = storedChoice();
  const apply = () => applyTheme(choice, osLight.matches);
  osLight.addEventListener('change', apply);
  document.addEventListener('click', (e) => {
    const item = (e.target as Element | null)?.closest<HTMLElement>('[data-theme-set]');
    if (!item) return;
    choice = parseTheme(item.dataset.themeSet ?? null);
    storeChoice(choice);
    apply();
    for (const d of dropdowns) d.close(true);
  });
  apply();
}
