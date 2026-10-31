import { describe, expect, it } from 'vitest';
import type { TermData } from '../schema';
import { exportTerms, toAnki, toCsv, type ExportTerm } from './export';

const facet = (en: string, da = `${en} (da)`) => ({ en, da });
const term = (over: Partial<TermData>): TermData => ({
  term: facet('Phishing', 'Phishing'),
  aka: { en: [], da: [] },
  domain: ['security'],
  cluster: 'awareness',
  status: 'current',
  summary: facet('A fake message, "urgent", that tricks you.'),
  body: {
    formal: facet('formal'),
    plain: facet('plain\twith a tab'),
    inPractice: facet('practice'),
    whyItMatters: facet('why'),
  },
  edges: {},
  sources: [{ title: 'NIST', tier: 'standard' }],
  draft: true,
  ...over,
});

const SITE = 'https://x.test/tech-atlas/';
const records = exportTerms(
  [
    {
      id: 'security/spear-phishing',
      depth: 1,
      data: term({
        term: facet('Spear phishing', 'Spear phishing'),
        aka: { en: ['targeted phishing'], da: [] },
        edges: {
          'kind-of': ['phishing'],
          exploits: [
            { to: 'human-trust', confidence: 'medium', strength: 'primary', sources: [] },
            'no-such-term',
          ],
        },
      }),
    },
    { id: 'security/phishing', depth: 0, data: term({ era: 1996, layer: 'people' }) },
    { id: 'security/human-trust', depth: 0, data: term({ term: facet('Human trust') }) },
  ],
  SITE,
);

describe('exportTerms', () => {
  it('sorts by id and builds absolute URLs per language', () => {
    expect(records.map((r) => r.id)).toEqual([
      'security/human-trust',
      'security/phishing',
      'security/spear-phishing',
    ]);
    expect(records[1].url).toEqual({
      en: 'https://x.test/tech-atlas/en/terms/security/phishing/',
      da: 'https://x.test/tech-atlas/da/terms/security/phishing/',
    });
  });

  it('resolves edge targets to full ids and drops dangling ones', () => {
    expect(records[2].edges).toEqual([
      { type: 'kind-of', to: 'security/phishing', confidence: 'high', strength: 'normal' },
      { type: 'exploits', to: 'security/human-trust', confidence: 'medium', strength: 'primary' },
    ]);
  });

  it('keeps optional fields only when authored', () => {
    expect(records[1]).toMatchObject({ era: 1996, layer: 'people', depth: 0 });
    expect('era' in records[0]).toBe(false);
    expect('layer' in records[0]).toBe(false);
  });
});

describe('toCsv', () => {
  const rowOf = (t: ExportTerm) => toCsv([t]).split('\r\n')[1];
  const afterId = rowOf(records[0]).slice(records[0].id.length);
  // The id leads the row, so a CSV cell can be read off any string put there.
  const cell = (id: string) => rowOf({ ...records[0], id }).slice(0, -afterId.length);

  it('quotes fields with commas, quotes or line breaks', () => {
    expect(cell('a,b')).toBe('"a,b"');
    expect(cell('say "hi"')).toBe('"say ""hi"""');
    expect(cell('plain')).toBe('plain');
    expect(rowOf(records[0])).toContain(',awareness,,current,,0,');
  });

  it('defuses cells a spreadsheet would run as a formula', () => {
    expect(cell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(cell('+1')).toBe("'+1");
    expect(cell('-x')).toBe("'-x");
    expect(cell('@SUM(A1)')).toBe("'@SUM(A1)");
    expect(cell('\tx')).toBe("'\tx");
    expect(cell('\rx')).toBe(`"'\rx"`);
    expect(rowOf({ ...records[0], era: -3 })).toContain(',current,-3,0,'); // numbers are data, not formulas
  });

  it('writes a header and one CRLF row per term', () => {
    const csv = toCsv(records);
    const lines = csv.split('\r\n');
    expect(lines[0]).toBe(
      'id,term_en,term_da,aka_en,aka_da,domain,cluster,layer,status,era,depth,' +
        'summary_en,summary_da,url_en,url_da,draft',
    );
    expect(lines).toHaveLength(records.length + 2); // + header + trailing newline
    expect(lines[3]).toContain(
      'security/spear-phishing,Spear phishing,Spear phishing,targeted phishing',
    );
  });
});

describe('toAnki', () => {
  const anki = toAnki(records, 'en', 'Atlas (English)');
  const lines = anki.trimEnd().split('\n');

  it('starts with the Anki import headers', () => {
    expect(lines.slice(0, 6)).toEqual([
      '#separator:tab',
      '#html:true',
      '#notetype:Basic',
      '#deck:Atlas (English)',
      '#tags column:3',
      '#guid column:4',
    ]);
  });

  it('writes four tab-separated columns per note, with HTML escaped and tabs removed', () => {
    const note = lines[7].split('\t');
    expect(note).toHaveLength(4);
    expect(note[0]).toBe('Phishing');
    expect(note[1]).toContain('<b>A fake message, &quot;urgent&quot;, that tricks you.</b>');
    expect(note[1]).toContain('plain with a tab');
    expect(note[1]).toContain('href="https://x.test/tech-atlas/en/terms/security/phishing/"');
    expect(note[2]).toBe('atlas security awareness');
    expect(note[3]).toBe('atlas-en-security/phishing');
  });

  it('escapes a leading # so Anki does not read the note as a header', () => {
    const [hashed] = exportTerms(
      [{ id: 'cs/c-sharp', depth: 0, data: term({ term: facet('#C', '#C') }) }],
      SITE,
    );
    const line = toAnki([hashed], 'en', 'd').trimEnd().split('\n').pop()!;
    expect(line.startsWith('&#35;C\t')).toBe(true);
  });
});
