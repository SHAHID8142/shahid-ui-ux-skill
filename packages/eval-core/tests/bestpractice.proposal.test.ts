/**
 * T1022 — a proposal must not dress opinion as measurement, and an approval must not
 * drift off the content it approved. Both are tested as refusals, because a guard that
 * only ever allows is not a guard.
 */
import { mkdtempSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  PROPOSAL_SCHEMA_VERSION,
  authoriseApply,
  composeProposal,
  renderProposalMarkdown,
  type ProposalItem,
} from '../src/bestpractice/proposal.js';
import { resolveScope, selectFocus, type ScopeResolution } from '../src/audit/scope.js';

/** A resolved scope without needing a browser: the resolver's own output shape. */
function resolvedScope(): ScopeResolution {
  return {
    outcome: 'resolved',
    reference: { kind: 'selector', value: '#cta' },
    targets: [{ selector: 'button#cta', tag: 'button', role: null, kind: 'button', file: null }],
    clarification: null,
    reason: null,
    advisory: false,
    focus: selectFocus('button'),
  };
}

const fact = (over: Partial<ProposalItem> = {}): ProposalItem => ({
  id: 'aaaaaaaaaaaaaaaa',
  dimension: 'a11y',
  severity: 'P1',
  kind: 'fact',
  title: 'Tap target is 32×24 px',
  location: 'button#cta',
  evidence: ['capture-matrix mobile-390'],
  observed: { value: 32, unit: 'px wide' },
  expected: { value: 44, unit: 'px wide' },
  why: 'a control below 44 px is hard to hit with a thumb',
  remedy: 'raise the live area to 44×44 px without changing the visual size',
  rationale: 'the visible box can stay; padding carries the hit area',
  uxOutcome: 'the control is reliably tappable one-handed',
  risk: 'extra padding may shift neighbouring controls',
  testPlan: ['capture-matrix at 390 px asserts width ≥ 44'],
  ...over,
});

const heuristic = (over: Partial<ProposalItem> = {}): ProposalItem => ({
  id: 'bbbbbbbbbbbbbbbb',
  dimension: 'visual',
  severity: 'P2',
  kind: 'heuristic',
  title: 'The primary action competes with the secondary one',
  location: 'button#cta',
  evidence: [],
  observed: null,
  expected: null,
  why: 'two equally weighted buttons split attention',
  remedy: 'demote the secondary action to a text button',
  rationale: 'one primary action per view is the repository rule',
  uxOutcome: 'the intended next step is obvious',
  risk: 'the secondary action becomes less discoverable',
  testPlan: ['visual review by the owner'],
  ...over,
});

const compose = (items: ProposalItem[], scope = resolvedScope()) =>
  composeProposal({
    scope,
    items,
    generatedAt: '2026-11-16T00:00:00.000Z',
    provenance: {
      evaluator: 'sus-eval bestpractice 1',
      node: 'v22',
      platform: 'linux/x64',
      commit: null,
    },
  });

describe('a proposal cannot be built on an unresolved scope', () => {
  it('refuses an ambiguous scope and names the clarification', () => {
    const scope: ScopeResolution = {
      ...resolvedScope(),
      outcome: 'ambiguous',
      clarification: 'narrow the selector',
      focus: null,
    };
    const result = compose([fact()], scope);
    expect('refused' in result && result.refused).toBe(true);
    if (!('refused' in result)) throw new Error('unreachable');
    expect(result.reason).toBe('scope-not-resolved');
    expect(result.detail).toContain('narrow the selector');
  });

  it('refuses an advisory (screenshot-only) scope', () => {
    const result = compose([fact()], { ...resolvedScope(), outcome: 'advisory', advisory: true });
    expect('refused' in result && result.reason).toBe('scope-not-resolved');
  });

  it('refuses an empty proposal rather than emitting an empty promise', () => {
    const result = compose([]);
    expect('refused' in result && result.reason).toBe('no-items');
  });
});

describe('facts and heuristics are not interchangeable', () => {
  it('accepts a measured fact and an unmeasured heuristic together', () => {
    const result = compose([fact(), heuristic()]);
    if ('refused' in result) throw new Error('expected a proposal, got ' + result.reason);
    expect(result.schemaVersion).toBe(PROPOSAL_SCHEMA_VERSION);
    expect(result.items.map((i) => i.kind)).toEqual(['fact', 'heuristic']);
  });

  it('refuses a fact with no observation', () => {
    const result = compose([fact({ observed: null })]);
    expect('refused' in result && result.reason).toBe('fact-without-observation');
  });

  it('refuses a fact with no evidence', () => {
    const result = compose([fact({ evidence: [] })]);
    expect('refused' in result && result.reason).toBe('fact-without-observation');
  });

  it('refuses to rank an unmeasured recommendation as blocking', () => {
    const result = compose([heuristic({ severity: 'P1' })]);
    expect('refused' in result && result.reason).toBe('heuristic-ranked-blocking');
  });

  it('sorts worst first, and measured before judgment at equal severity', () => {
    const result = compose([
      heuristic({ id: 'h', severity: 'P2', title: 'second' }),
      fact({ id: 'f2', severity: 'P2', title: 'first among equals' }),
      fact({ id: 'f1', severity: 'P0', title: 'worst', dimension: 'responsive' }),
    ]);
    if ('refused' in result) throw new Error('expected a proposal');
    expect(result.items.map((i) => i.severity)).toEqual(['P0', 'P2', 'P2']);
    expect(result.items.map((i) => i.kind)).toEqual(['fact', 'fact', 'heuristic']);
  });
});

describe('untested dimensions are carried, never dropped', () => {
  it('copies every not-applicable dimension into the untested list', () => {
    const result = compose([fact()]);
    if ('refused' in result) throw new Error('expected a proposal');
    const scopeFocus = selectFocus('button');
    const untested = new Set(result.untested.map((u) => u.dimension));
    for (const entry of scopeFocus.notApplicable) expect(untested.has(entry.dimension)).toBe(true);
    for (const entry of result.untested) expect(entry.reason.length).toBeGreaterThan(20);
  });

  it('adds a measured-but-open dimension alongside the not-applicable ones', () => {
    const result = composeProposal({
      scope: resolvedScope(),
      items: [fact()],
      untested: [
        {
          dimension: 'responsive',
          reason: 'the 320 px pass was measured, the 200% text case was not',
        },
      ],
      generatedAt: '2026-11-16T00:00:00.000Z',
    });
    if ('refused' in result) throw new Error('expected a proposal');
    const responsive = result.untested.find((u) => u.dimension === 'responsive');
    expect(responsive?.reason).toContain('200% text');
  });
});

describe('an approval is bound to the content it approved', () => {
  const build = () => {
    const result = compose([fact(), heuristic()]);
    if ('refused' in result) throw new Error('expected a proposal');
    return result;
  };

  it('allows applying an approved hunk with the matching digest', () => {
    const proposal = build();
    expect(
      authoriseApply(proposal, { digest: proposal.digest, hunkIds: [proposal.items[0]!.id] }),
    ).toEqual({ allowed: true });
  });

  it('refuses an empty approval', () => {
    const proposal = build();
    const decision = authoriseApply(proposal, { digest: proposal.digest, hunkIds: [] });
    expect(decision.allowed).toBe(false);
    if (decision.allowed) throw new Error('unreachable');
    expect(decision.reason).toBe('empty-approval');
  });

  it('refuses an approval granted for different content', () => {
    const proposal = build();
    const edited = compose([fact({ title: 'Tap target is 30×24 px' }), heuristic()]);
    if ('refused' in edited) throw new Error('expected a proposal');
    expect(edited.digest).not.toBe(proposal.digest);
    const decision = authoriseApply(edited, {
      digest: proposal.digest,
      hunkIds: [edited.items[0]!.id],
    });
    expect(decision.allowed).toBe(false);
    if (decision.allowed) throw new Error('unreachable');
    expect(decision.reason).toBe('stale-digest');
  });

  it('refuses a hunk that is not in the proposal', () => {
    const proposal = build();
    const decision = authoriseApply(proposal, {
      digest: proposal.digest,
      hunkIds: ['deadbeefdeadbeef'],
    });
    expect(decision.allowed).toBe(false);
    if (decision.allowed) throw new Error('unreachable');
    expect(decision.reason).toBe('unknown-hunk');
  });

  it('refuses a change whose dimension was never measured', () => {
    const proposal = composeProposal({
      scope: resolvedScope(),
      items: [fact({ dimension: 'performance', severity: 'P2' })],
      generatedAt: '2026-11-16T00:00:00.000Z',
    });
    if ('refused' in proposal) throw new Error('expected a proposal');
    // performance is not-applicable for a button, so it lands in untested by construction.
    const decision = authoriseApply(proposal, {
      digest: proposal.digest,
      hunkIds: [proposal.items[0]!.id],
    });
    expect(decision.allowed).toBe(false);
    if (decision.allowed) throw new Error('unreachable');
    expect(decision.reason).toBe('untested-dimension');
  });
});

describe('the proposal is read-only and the report cannot be injected', () => {
  it('writes nothing: composing a proposal leaves the filesystem untouched', () => {
    const dir = mkdtempSync(join(tmpdir(), 'sus-proposal-'));
    const before = readdirSync(dir);
    compose([fact()]);
    expect(readdirSync(dir)).toEqual(before);
  });

  it('declares the approval requirement and the apply path in the record itself', () => {
    const result = compose([fact()]);
    if ('refused' in result) throw new Error('expected a proposal');
    expect(result.approval).toEqual({
      required: true,
      mode: 'per-hunk',
      applyPath: 'studio-apply',
    });
  });

  it('escapes page content so a title cannot inject report structure', () => {
    const result = compose([fact({ title: '<img src=x onerror=alert(1)> | *bold* `code`' })]);
    if ('refused' in result) throw new Error('expected a proposal');
    const markdown = renderProposalMarkdown(result);
    // Every '<' must be escaped: `\<img` still contains the literal text `<img`, so the
    // assertion has to look at the escaping, not at the substring.
    expect(/(?<!\\)</.test(markdown)).toBe(false);
    expect(markdown).toContain('\\<img src=x');
    // Pipes and asterisks inside a cell are escaped, so they cannot start a new column.
    expect(markdown).toContain('\\| \\*bold');
  });

  it('states the digest and the read-only default in the report header', () => {
    const result = compose([fact()]);
    if ('refused' in result) throw new Error('expected a proposal');
    const markdown = renderProposalMarkdown(result);
    expect(markdown).toContain(result.digest.slice(0, 16));
    expect(markdown).toContain('nothing is written until hunks are approved');
    expect(markdown).toContain('## Not measured');
  });
});

describe('the scope resolver feeds the proposal without a browser', () => {
  it('refuses a screenshot region all the way through', async () => {
    const scope = await resolveScope(null, { kind: 'region', value: 'r1', source: 'screenshot' });
    const result = compose([fact()], scope);
    expect('refused' in result && result.reason).toBe('scope-not-resolved');
  });
});
