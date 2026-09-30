import { describe, expect, it } from 'vitest';
import { actionableReason, howToIssues, isActionable, type ActionableInput } from './actionable';
import { HowTo } from '../schema';

const t = (over: Partial<ActionableInput> & { id: string }): ActionableInput => ({
  domain: [over.id.split('/')[0]],
  cluster: 'fundamentals',
  ...over,
});

describe('actionableReason (A101)', () => {
  it('lets the explicit field win over every rule', () => {
    expect(
      isActionable(t({ id: 'security/control', cluster: 'controls', actionable: false })),
    ).toBe(false);
    expect(actionableReason(t({ id: 'security/grc', actionable: true }))).toBe('explicit');
  });

  it('counts a term with a howTo as actionable', () => {
    expect(actionableReason(t({ id: 'security/gap-analysis', howTo: {} }))).toBe('has howTo');
  });

  it('classifies laws and standards by their mandates edge', () => {
    expect(actionableReason(t({ id: 'security/gdpr', edges: { mandates: ['dpia'] } }))).toBe(
      'mandates',
    );
  });

  it('classifies kinds of control, framework, treatment and assessment', () => {
    const k = (p: string) => t({ id: 'security/x', edges: { 'kind-of': [`security/${p}`] } });
    expect(actionableReason(k('control'))).toBe('kind-of control');
    expect(actionableReason(k('security-framework'))).toBe('kind-of security-framework');
    expect(isActionable(k('threat'))).toBe(false);
  });

  it('uses the security controls and incident-response clusters', () => {
    expect(isActionable(t({ id: 'security/siem', cluster: 'controls' }))).toBe(true);
    const ir = (layer: string) => t({ id: 'security/x', cluster: 'incident-response', layer });
    expect(isActionable(ir('governance'))).toBe(true);
    expect(isActionable(ir('people'))).toBe(true);
    expect(isActionable(ir('data'))).toBe(false); // a data breach is an event, not a practice
  });

  it('treats platform delivery and process layers as practices', () => {
    expect(isActionable(t({ id: 'platform/gitops', cluster: 'delivery', layer: 'delivery' }))).toBe(
      true,
    );
    expect(
      isActionable(t({ id: 'platform/pod', cluster: 'containers', layer: 'orchestration' })),
    ).toBe(false);
  });

  it('uses mitigates, but in AI only for the risk, agent and coding clusters', () => {
    const m = { mitigates: [{ to: 'overfitting' }] };
    expect(isActionable(t({ id: 'cs/firewall', edges: m }))).toBe(true);
    expect(isActionable(t({ id: 'ai/guardrails', cluster: 'ai-risk', edges: m }))).toBe(true);
    expect(isActionable(t({ id: 'ai/regularization', cluster: 'training', edges: m }))).toBe(false);
  });

  it('leaves a legacy law out unless marked', () => {
    const nis1 = {
      id: 'security/nis1',
      status: 'legacy',
      edges: { mandates: ['incident-reporting'] },
    };
    expect(isActionable(t(nis1))).toBe(false);
    expect(isActionable(t({ ...nis1, actionable: true }))).toBe(true);
  });

  it('leaves plain concepts out', () => {
    expect(isActionable(t({ id: 'security/likelihood' }))).toBe(false);
  });
});

const steps = (n: number) => Array.from({ length: n }, (_, i) => `Step ${i + 1}.`);
const guide = (url: string) => ({ title: 'G', url, publisher: 'P', tier: 'standard' as const });
const valid = {
  steps: { en: steps(5), da: steps(5) },
  guides: [guide('https://a.example/x'), guide('https://b.example/y')],
};

describe('HowTo schema (A101, E10)', () => {
  it('accepts 5-10 steps and 2-5 guides', () => {
    expect(HowTo.safeParse(valid).success).toBe(true);
  });

  it('rejects unequal step counts, too few steps and too few guides', () => {
    expect(HowTo.safeParse({ ...valid, steps: { en: steps(5), da: steps(6) } }).success).toBe(
      false,
    );
    expect(HowTo.safeParse({ ...valid, steps: { en: steps(4), da: steps(4) } }).success).toBe(
      false,
    );
    expect(HowTo.safeParse({ ...valid, guides: [guide('https://a.example/')] }).success).toBe(
      false,
    );
  });

  it('rejects unequal pitfall counts', () => {
    const pitfalls = { en: ['One.', 'Two.'], da: ['En.'] };
    expect(HowTo.safeParse({ ...valid, pitfalls }).success).toBe(false);
  });

  it('rejects non-web guide URLs', () => {
    const guides = [guide('javascript:alert(1)'), guide('https://b.example/')];
    expect(HowTo.safeParse({ ...valid, guides }).success).toBe(false);
  });
});

describe('howToIssues (E13)', () => {
  it('passes a clean howTo', () => {
    expect(howToIssues(valid)).toEqual([]);
  });

  it('flags blank items and a guide listed twice', () => {
    const h = {
      steps: { en: [...steps(4), '  '], da: steps(5) },
      guides: [guide('https://a.example/x/'), guide('https://A.example/x')],
    };
    expect(howToIssues(h)).toEqual([
      'steps.en[4] is blank',
      'guide listed twice: https://A.example/x',
    ]);
  });
});
