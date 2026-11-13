/**
 * T0202: intent router — every intent maps to an explicit module set;
 * unknown intents fall back honestly (research + open questions).
 */
import { describe, expect, it } from 'vitest';
import { Intent, MODULES } from '@sus/schemas';
import { fallbackIntent, routeIntent } from '../src/router.js';

describe('intent router v1 (T0202)', () => {
  it('routes commerce briefs to the commerce module set', () => {
    const intent = routeIntent('Build a checkout flow with a product grid for my tea shop');
    expect(intent.surface).toBe('commerce');
    expect(intent.modules).toContain('playbook:commerce');
    expect(intent.action).toBe('create');
    expect(Intent.safeParse(intent).success).toBe(true);
  });

  it('routes admin/CRM briefs to operate mode', () => {
    const intent = routeIntent('Review the dashboard of our CRM admin panel');
    expect(intent.surface).toBe('operate');
    expect(intent.action).toBe('review');
    expect(intent.modules).toContain('playbook:operate');
  });

  it('routes portfolio/docs briefs and docs actions', () => {
    const intent = routeIntent('Create a portfolio case study page with a docs article');
    expect(intent.surface).toBe('portfolio');
  });

  it('routes marketing briefs; redesign adds progressive workflow', () => {
    const create = routeIntent('Design a landing hero and pricing section for our home page');
    expect(create.surface).toBe('marketing');
    expect(create.modules).not.toContain('progressive-workflow');
    const redesign = routeIntent('Redesign the marketing site home page hero');
    expect(redesign.action).toBe('redesign');
    expect(redesign.modules).toContain('progressive-workflow');
  });

  it('every intent maps to an explicit, registered module set', () => {
    for (const brief of [
      'checkout flow for a store',
      'CRM dashboard review',
      'portfolio case study',
      'landing page hero',
      'totally ambiguous text',
    ]) {
      const intent = routeIntent(brief);
      expect(intent.modules.length).toBeGreaterThan(0);
      for (const m of intent.modules) {
        expect(MODULES).toContain(m);
      }
      expect(Intent.safeParse(intent).success).toBe(true);
    }
  });

  it('unknown intent → honest fallback with open questions (never a guessed surface)', () => {
    const intent = routeIntent('Fix a Python import error in my data pipeline');
    expect(intent.basis).toBe('heuristic-v1');
    expect(intent.action).toBe('research');
    expect(intent.openQuestions.length).toBeGreaterThan(0);
    expect(intent.openQuestions.join(' ')).toMatch(/surface mode unresolved/);
    expect(intent.modules).toEqual(['research', 'direction-reasoning']);
  });

  it('fallback intent is schema-valid too', () => {
    expect(Intent.safeParse(fallbackIntent('caller supplied no brief')).success).toBe(true);
  });
});
