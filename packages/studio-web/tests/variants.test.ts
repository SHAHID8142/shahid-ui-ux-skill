/**
 * T0803 tests — variants, visual diff and simultaneous viewports.
 *
 * TASKS.json states the acceptance as "variant provenance recorded; discard is
 * cheap", so the tests treat both as obligations:
 *  - a variant without usable provenance is refused, and so is a set whose
 *    provenance points at a different intent;
 *  - discard releases the payload and touches nothing else — held bytes drop,
 *    provenance survives, and a discarded variant cannot be accepted later;
 *  - accepting one drops the rest cheaply, records the decision, and cannot be
 *    repeated;
 *  - every variant renders at every viewport simultaneously from ONE document,
 *    in a fully sandboxed frame, and executable markup never reaches a frame.
 */
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_VIEWPORTS,
  MAX_VARIANTS,
  VariantSession,
  type VariantInput,
  type VariantProvenance,
} from '../src/variants.js';

const INTENT = 'intent-abc';

function provenance(overrides: Partial<VariantProvenance> = {}): VariantProvenance {
  return {
    intentId: INTENT,
    model: 'synthetic-rule-based@1',
    promptSha256: 'a'.repeat(64),
    runId: 'run-1',
    createdAt: '2026-11-14T00:00:00.000Z',
    ...overrides,
  };
}

function variant(id: string, overrides: Partial<VariantInput> = {}): VariantInput {
  return {
    id,
    markup: `<section class="variant-${id}"><h2>Option ${id}</h2></section>`,
    provenance: provenance({ runId: `run-${id}` }),
    summary: `Option ${id}`,
    ...overrides,
  };
}

function open(variants: VariantInput[] = [variant('A'), variant('B'), variant('C')]) {
  const result = VariantSession.open(INTENT, variants);
  if (!result.ok) throw new Error(`unexpected refusal: ${result.reason} ${result.detail}`);
  return result.value;
}

describe('opening a comparison', () => {
  it('shows A/B/C side by side with provenance on every variant', () => {
    const session = open();
    const snapshot = session.snapshot();
    expect(snapshot.variants.map((entry) => entry.id)).toEqual(['A', 'B', 'C']);
    for (const entry of snapshot.variants) {
      expect(entry.provenance.intentId).toBe(INTENT);
      expect(entry.provenance.model).toBe('synthetic-rule-based@1');
      expect(entry.provenance.promptSha256).toHaveLength(64);
      expect(entry.provenance.runId).toMatch(/^run-/);
    }
    expect(snapshot.state).toBe('open');
    expect(snapshot.acceptedId).toBeNull();
  });

  it('renders every variant at every viewport simultaneously from one document', () => {
    const session = open();
    const [first] = session.snapshot().variants;
    expect(first!.frames.map((frame) => frame.viewport.id)).toEqual(
      DEFAULT_VIEWPORTS.map((viewport) => viewport.id),
    );
    // one document, not three: the host scales it per viewport
    const documents = new Set(first!.frames.map((frame) => frame.srcdoc));
    expect(documents.size).toBe(1);
    expect(first!.frames.map((frame) => frame.width)).toEqual([390, 768, 1280]);
    expect(session.compare()).toEqual([
      {
        id: 'A',
        cells: [
          { viewport: 'mobile', width: 390 },
          { viewport: 'tablet', width: 768 },
          { viewport: 'desktop', width: 1280 },
        ],
      },
      {
        id: 'B',
        cells: [
          { viewport: 'mobile', width: 390 },
          { viewport: 'tablet', width: 768 },
          { viewport: 'desktop', width: 1280 },
        ],
      },
      {
        id: 'C',
        cells: [
          { viewport: 'mobile', width: 390 },
          { viewport: 'tablet', width: 768 },
          { viewport: 'desktop', width: 1280 },
        ],
      },
    ]);
  });

  it('returns no sandbox permissions, so variant markup cannot reach the host', () => {
    for (const entry of open().snapshot().variants) {
      for (const frame of entry.frames) expect(frame.sandbox).toEqual([]);
    }
  });

  it('records a comparison digest that changes only when the set changes', () => {
    expect(open().comparisonDigest()).toBe(open().comparisonDigest());
    const altered = open([variant('A'), variant('B', { markup: '<p>different</p>' })]);
    expect(altered.comparisonDigest()).not.toBe(open().comparisonDigest());
  });
});

describe('refusals at open — a variant is shown only if it is attributable and inert', () => {
  it('refuses an empty comparison', () => {
    const result = VariantSession.open(INTENT, []);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('no-variants');
  });

  it(`refuses more than ${MAX_VARIANTS} variants`, () => {
    const result = VariantSession.open(
      INTENT,
      ['A', 'B', 'C', 'D'].map((id) => variant(id)),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('too-many-variants');
  });

  it('refuses duplicate ids, because "accept A" would be ambiguous', () => {
    const result = VariantSession.open(INTENT, [variant('A'), variant('A')]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('duplicate-variant-id');
  });

  it('refuses a variant with no model, no run id, no prompt hash or no timestamp', () => {
    const cases: Array<Partial<VariantProvenance>> = [
      { model: '' },
      { runId: '' },
      { promptSha256: 'not-a-digest' },
      { createdAt: 'yesterday' },
      { intentId: '' },
    ];
    for (const override of cases) {
      const result = VariantSession.open(INTENT, [
        variant('A', { provenance: provenance(override) }),
      ]);
      expect(result.ok, JSON.stringify(override)).toBe(false);
      if (result.ok) return;
      expect(result.reason).toBe('missing-provenance');
    }
  });

  it('refuses a variant that answers a different intent', () => {
    const result = VariantSession.open(INTENT, [
      variant('A', { provenance: provenance({ intentId: 'intent-other' }) }),
    ]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('provenance-intent-mismatch');
  });

  it('refuses executable markup instead of rendering it', () => {
    const payloads = [
      '<script>alert(1)</script>',
      '<img src="x" onerror="alert(1)">',
      '<a href="javascript:alert(1)">x</a>',
      '<iframe src="https://evil.example"></iframe>',
      '<object data="x"></object>',
      '<base href="https://evil.example">',
    ];
    for (const markup of payloads) {
      const result = VariantSession.open(INTENT, [variant('A', { markup })]);
      expect(result.ok, markup).toBe(false);
      if (result.ok) return;
      expect(result.reason).toBe('untrusted-markup');
    }
  });

  it('refuses empty markup rather than rendering a blank "option"', () => {
    const result = VariantSession.open(INTENT, [variant('A', { markup: '   ' })]);
    expect(result.ok).toBe(false);
  });
});

describe('discard is cheap', () => {
  it('releases the payload without touching the other variants', () => {
    const session = open();
    const before = session.heldBytes();
    const released = session.discard('B');
    expect(released.ok).toBe(true);
    if (!released.ok) return;
    expect(released.value.releasedBytes).toBeGreaterThan(0);
    expect(session.heldBytes()).toBe(before - released.value.releasedBytes);
    // A and C are untouched and still renderable
    expect(session.snapshot().variants.map((entry) => entry.id)).toEqual(['A', 'C']);
    expect(session.snapshot().variants.every((entry) => entry.frames[0]!.srcdoc !== '')).toBe(true);
  });

  it('keeps the discarded provenance for the audit trail', () => {
    const session = open();
    const released = session.discard('B');
    expect(released.ok).toBe(true);
    if (!released.ok) return;
    expect(released.value.provenance.runId).toBe('run-B');
    expect(released.value.provenance.promptSha256).toBe('a'.repeat(64));
  });

  it('refuses to discard twice or to discard an unknown variant', () => {
    const session = open();
    expect(session.discard('B').ok).toBe(true);
    const twice = session.discard('B');
    expect(twice.ok).toBe(false);
    if (twice.ok) return;
    expect(twice.reason).toBe('already-discarded');
    const unknown = session.discard('Z');
    expect(unknown.ok).toBe(false);
    if (unknown.ok) return;
    expect(unknown.reason).toBe('unknown-variant');
  });

  it('discards every undecided variant in one pass and reports the bytes released', () => {
    const session = open();
    const before = session.heldBytes();
    const result = session.discardAll();
    expect(result.discarded).toEqual(['A', 'B', 'C']);
    expect(session.heldBytes()).toBe(0);
    expect(result.releasedBytes).toBe(before);
    expect(session.snapshot().variants).toEqual([]);
  });

  it('a discarded variant cannot be accepted afterwards', () => {
    const session = open();
    session.discard('A');
    const accepted = session.accept('A');
    expect(accepted.ok).toBe(false);
    if (accepted.ok) return;
    expect(accepted.reason).toBe('already-discarded');
  });
});

describe('accept exactly one', () => {
  it('records the decision with provenance and drops the others cheaply', () => {
    const session = open();
    const before = session.heldBytes();
    const accepted = session.accept('B', { acceptedAt: '2026-11-14T01:00:00.000Z' });
    expect(accepted.ok).toBe(true);
    if (!accepted.ok) return;
    const decision = accepted.value;
    expect(decision.variantId).toBe('B');
    expect(decision.provenance).toMatchObject({ runId: 'run-B', intentId: INTENT });
    expect(decision.markup).toContain('variant-B');
    expect(decision.acceptedAt).toBe('2026-11-14T01:00:00.000Z');
    // the documented rollback: reload rather than hot-swap
    expect(decision.applyStrategy).toBe('full-page-reload');
    expect(decision.discarded.map((entry) => entry.id)).toEqual(['A', 'C']);
    // only the accepted payload is still held
    expect(session.heldBytes()).toBeLessThan(before);
    expect(session.heldBytes()).toBe(decision.markup.length);
    expect(session.snapshot().state).toBe('decided');
    expect(session.snapshot().acceptedId).toBe('B');
  });

  it('refuses a second decision', () => {
    const session = open();
    expect(session.accept('A').ok).toBe(true);
    const second = session.accept('B');
    expect(second.ok).toBe(false);
    if (second.ok) return;
    expect(second.reason).toBe('already-decided');
  });

  it('refuses to accept an unknown variant', () => {
    const session = open();
    const result = session.accept('Z');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('unknown-variant');
  });

  it('refuses to discard the accepted variant', () => {
    const session = open();
    expect(session.accept('A').ok).toBe(true);
    const discarded = session.discard('A');
    expect(discarded.ok).toBe(false);
    if (discarded.ok) return;
    expect(discarded.reason).toBe('already-decided');
  });

  it('keeps the accepted variant when discardAll runs after the decision', () => {
    const session = open();
    session.accept('A');
    const result = session.discardAll();
    expect(result.discarded).toEqual([]);
    expect(session.heldBytes()).toBeGreaterThan(0);
  });
});

describe('trusted-host control', () => {
  it('exposes no event hook, so the page under test cannot approve its own edit', () => {
    const session = open();
    const surface = Object.getOwnPropertyNames(Object.getPrototypeOf(session));
    // the property is negative: nothing on the surface subscribes to, listens
    // for, or is driven by an event — approval is a trusted-host method call
    const eventish = surface.filter(
      (name) => /^on[A-Z]/.test(name) || /event|listener|subscribe|emit|handler/i.test(name),
    );
    expect(eventish).toEqual([]);
    expect(typeof session.accept).toBe('function');
    // and the model holds no DOM reference at all
    expect(JSON.stringify(session.snapshot())).not.toMatch(/addEventListener|dispatchEvent/);
  });

  it('a single-variant comparison still works (nothing to discard)', () => {
    const session = open([variant('A')]);
    const accepted = session.accept('A');
    expect(accepted.ok).toBe(true);
    if (!accepted.ok) return;
    expect(accepted.value.discarded).toEqual([]);
  });
});
