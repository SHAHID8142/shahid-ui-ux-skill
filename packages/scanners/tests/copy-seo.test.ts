/**
 * T0406: SEO/content checks emitting G3/G9 + claims register + DA-47
 * behavior contracts (non-waivable vs owner-taste separation).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ClaimsRegister, DomainBehaviorContract, type ClaimsRegisterEntryData } from '@sus/schemas';
import { checkSeo } from '../src/seo.js';
import { scanText } from '../src/engine.js';

describe('SEO structural checks (T0406)', () => {
  const good = `<!doctype html><html><head><title>Meridian — Notes for Researchers</title>
<meta name="description" content="Meridian is a note-taking tool for solo researchers with fast capture and plain-file export."></head>
<body><main><h1>Meridian</h1><h2>Features</h2><p>Capture notes fast.</p><img src="a.png" alt="App screenshot"></main></body></html>`;
  const r = checkSeo(good);
  it('clean page passes all checks and G3/G9 verdicts', () => {
    expect(r.checks.every((c) => c.status === 'pass')).toBe(true);
    expect(r.g3.status).toBe('pass');
    expect(r.g9.status).toBe('pass');
  });
  it('placeholder content flips G3 to fail', () => {
    const bad = checkSeo(good.replace('Capture notes fast.', 'Lorem ipsum dolor sit amet.'));
    expect(bad.g3.status).toBe('fail');
    expect(bad.g3.detail.join(' ')).toMatch(/Lorem/);
  });
  it('missing alt + skipped heading level flip G9 to fail', () => {
    const bad = checkSeo('<main><h1>T</h1><h3>Skipped</h3><img src="x.png"></main>');
    expect(bad.g9.status).toBe('fail');
    expect(bad.g9.detail.join(' ')).toMatch(/alt/);
  });
  it('fixture A served page passes G3/G9 (integration)', () => {
    const html = readFileSync(
      join(
        __dirname,
        '..',
        '..',
        '..',
        'fixtures',
        'marketing',
        '.next',
        'server',
        'app',
        'index.html',
      ),
      'utf8',
    );
    const result = checkSeo(html);
    expect(result.g3.status).toBe('pass');
    expect(result.g9.status).toBe('pass');
  });
});

describe('claims register (T0406)', () => {
  it('entries must cite provenance ids', () => {
    const entries: ClaimsRegisterEntryData[] = [
      {
        id: 'baseline-floor-copy',
        claim: 'Independent teams report 25-31/55 unassisted quality on our corpus.',
        provenanceId: 'sus-baseline-floor',
        placement: '/results',
      },
    ];
    expect(ClaimsRegister.safeParse({ version: 1, entries }).success).toBe(true);
    const ghost = entries.map((e) => ({ ...e, provenanceId: 'not-in-catalog' }));
    // register schema validates shape; provenance-id existence is the
    // knowledge lint's job (T0409) — shape-only here
    expect(ClaimsRegister.safeParse({ version: 1, entries: ghost }).success).toBe(true);
  });
});

describe('domain behavior contracts (DA-47, T0406)', () => {
  const behaviors = [
    {
      id: 'commerce-truthfulness',
      surface: 'commerce',
      requirement: 'no manufactured scarcity or urgency without factual basis',
      kind: 'non-waivable',
    },
    {
      id: 'commerce-payment-recoverable',
      surface: 'commerce',
      requirement: 'payment failure is recoverable without data loss',
      kind: 'non-waivable',
    },
    {
      id: 'commerce-duplicate-submit-protection',
      surface: 'commerce',
      requirement: 'double submit cannot double-charge',
      kind: 'non-waivable',
    },
    {
      id: 'operate-roles',
      surface: 'operate',
      requirement: 'role permissions visible in the UI',
      kind: 'non-waivable',
    },
    {
      id: 'operate-bulk-action-clarity',
      surface: 'operate',
      requirement: 'bulk selection explicit and reversible',
      kind: 'non-waivable',
    },
    {
      id: 'operate-auditability',
      surface: 'operate',
      requirement: 'actions logged with actor + timestamp',
      kind: 'non-waivable',
    },
    {
      id: 'tone-density',
      surface: 'operate',
      requirement: 'dense admin tone over marketing tone',
      kind: 'owner-taste',
      decidedBy: 'owner D03 quality-over-speed',
    },
  ];
  it('contract with non-waivable floor + recorded taste passes', () => {
    expect(DomainBehaviorContract.safeParse({ version: 1, behaviors }).success).toBe(true);
  });
  it('missing a required non-waivable behavior is rejected', () => {
    const bad = { version: 1, behaviors: behaviors.filter((b) => b.id !== 'operate-auditability') };
    expect(DomainBehaviorContract.safeParse(bad).success).toBe(false);
  });
  it('a required behavior marked owner-taste is rejected (structural separation)', () => {
    const bad = {
      version: 1,
      behaviors: behaviors.map((b) =>
        b.id === 'commerce-truthfulness' ? { ...b, kind: 'owner-taste', decidedBy: 'someone' } : b,
      ),
    };
    expect(DomainBehaviorContract.safeParse(bad).success).toBe(false);
  });
  it('owner-taste without decidedBy is rejected', () => {
    const bad = {
      version: 1,
      behaviors: behaviors.map((b) =>
        b.id === 'tone-density' ? { ...b, decidedBy: undefined } : b,
      ),
    };
    expect(DomainBehaviorContract.safeParse(bad).success).toBe(false);
  });
});
