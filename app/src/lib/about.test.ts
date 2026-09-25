import { describe, expect, it } from 'vitest';
import { initials, visibleLinks } from './about';

describe('initials', () => {
  it('takes the first and last word', () => {
    expect(initials('Christoffer Maintz')).toBe('CM');
    expect(initials('Christina Jakobsen')).toBe('CJ');
    expect(initials('Anna Marie van der Berg')).toBe('AB');
  });
  it('handles one word, extra spaces, lower case and non-ASCII', () => {
    expect(initials('  cher ')).toBe('C');
    expect(initials('øjvind  ærø')).toBe('ØÆ');
  });
  it('never returns an empty string', () => {
    expect(initials('   ')).toBe('?');
  });
});

describe('visibleLinks', () => {
  it('drops empty and non-URL placeholders, keeps real links in order', () => {
    const links = [
      { id: 'github', label: 'GitHub', href: 'https://github.com/CMaintz' },
      { id: 'linkedin', label: 'LinkedIn', href: '' },
      { id: 'x', label: 'X', href: 'TODO' },
      { id: 'site', label: 'Site', href: 'http://example.com/' },
    ];
    expect(visibleLinks(links).map((l) => l.id)).toEqual(['github', 'site']);
  });
});
