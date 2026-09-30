import { describe, expect, it } from 'vitest';
import { UI_ACCOUNT } from './account';
import { UI_COMPARE } from './compare';
import { GRAPH_UI, UI_EXPLORER } from './explorer';
import { UI_HOME } from './home';
import { UI_LAYOUT } from './layout';
import { UI_STUDY } from './study';
import { clusterLabel, domainLabel } from './taxonomy';
import { UI_TERM } from './term';
import { TIMELINE_UI, UI_TIMELINE } from './timeline';
import { UI_TOUR } from './tour';

const SLICES = {
  UI_LAYOUT,
  UI_HOME,
  UI_STUDY,
  UI_EXPLORER,
  UI_TERM,
  UI_COMPARE,
  UI_TIMELINE,
  UI_ACCOUNT,
  UI_TOUR,
};

describe('UI slices', () => {
  it.each(Object.entries({ ...SLICES, GRAPH_UI, TIMELINE_UI }))(
    '%s has the same keys in en and da',
    (_, t) => expect(Object.keys(t.da)).toEqual(Object.keys(t.en)),
  );

  it('gives every key to exactly one slice', () => {
    const keys = Object.values(SLICES).flatMap((s) => Object.keys(s.en));
    expect(keys.length).toBe(new Set(keys).size);
  });
});

describe('taxonomy labels', () => {
  it('names a known domain and cluster in the page language', () => {
    expect(domainLabel('cs', 'da')).toBe('Datalogi');
    expect(clusterLabel('risk-management', 'en')).toBe('Risk management');
  });

  it('falls back to the id for an unlabelled one', () => {
    expect(domainLabel('quantum', 'en')).toBe('quantum');
    expect(clusterLabel('new-cluster', 'da')).toBe('new-cluster');
  });
});
