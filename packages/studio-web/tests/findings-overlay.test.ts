/**
 * T0804 tests — scanner overlay + dismissals with reasons.
 *
 * Acceptance under test:
 *  - source-linked findings: every finding carries file + line + snippet
 *  - suppress with recorded reason: dismissal requires a real justification;
 *    unknown/already-dismissed/empty-reason attempts are refused
 *  - re-scan: findings are replaced, dismissals survive by CONTENT
 *    fingerprint (line shifts do not resurrect a dismissed finding), and
 *    dismissals whose finding vanished are surfaced as stale
 *  - dismissal log in DECISIONS.md: deterministic markdown table, escaped
 *  - alert-fatigue rollback lever: a single named severity-filter default
 */
import { describe, expect, it } from 'vitest';
import type { ScanResult } from '@sus/scanners';
import {
  DEFAULT_SEVERITY_FILTER,
  FindingsOverlayStore,
  MIN_DISMISSAL_REASON_CHARS,
  type Dismissal,
} from '../src/findings-overlay.js';

const AT = '2026-11-14T08:00:00.000Z';

function scan(
  file: string,
  findings: Array<{
    category?: string;
    severity?: 'advisory' | 'blocking';
    line: number;
    snippet: string;
    matched?: string;
  }>,
): ScanResult {
  return {
    file,
    findings: findings.map((f) => ({
      category: f.category ?? 'hero-centered',
      severity: f.severity ?? 'advisory',
      line: f.line,
      snippet: f.snippet,
      matched: f.matched ?? 'centered',
    })),
    stats: { lines: 100, blocked: 0, advisory: 0 },
  };
}

function overlay(): FindingsOverlayStore {
  return new FindingsOverlayStore({ author: 'pi' });
}

describe('T0804 — source-linked findings', () => {
  it('places every scanner finding in its source context', () => {
    const store = overlay();
    store.ingest([scan('src/hero.tsx', [{ line: 12, snippet: 'className="text-center"' }])]);
    const [f] = store.all();
    expect(f).toBeDefined();
    expect(f!.file).toBe('src/hero.tsx');
    expect(f!.line).toBe(12);
    expect(f!.snippet).toBe('className="text-center"');
    expect(f!.locator).toBe('src/hero.tsx:12');
    expect(f!.category).toBe('hero-centered');
    expect(f!.dismissed).toBe(false);
  });

  it('ingest replaces the finding set rather than accumulating', () => {
    const store = overlay();
    store.ingest([scan('a.tsx', [{ line: 1, snippet: 'one' }])]);
    store.ingest([scan('b.tsx', [{ line: 2, snippet: 'two' }])]);
    expect(store.all()).toHaveLength(1);
    expect(store.all()[0]!.file).toBe('b.tsx');
  });

  it('distinguishes identical findings in one file by occurrence', () => {
    const store = overlay();
    store.ingest([
      scan('a.tsx', [
        { line: 3, snippet: 'same text' },
        { line: 9, snippet: 'same text' },
      ]),
    ]);
    const keys = store.all().map((f) => f.key);
    expect(keys).toHaveLength(2);
    expect(new Set(keys).size).toBe(2);
    expect(keys[1]).toContain('#2');
  });
});

describe('T0804 — dismissals with recorded reasons', () => {
  function seeded(): { store: FindingsOverlayStore; key: string } {
    const store = overlay();
    store.ingest([scan('a.tsx', [{ line: 5, snippet: 'className="text-center"' }])]);
    return { store, key: store.all()[0]!.key };
  }

  it('dismisses a finding with a recorded reason', () => {
    const { store, key } = seeded();
    const result = store.dismiss(key, 'intentional: matches the brand lockup', AT);
    expect(result.ok).toBe(true);
    expect(store.visible()).toHaveLength(0);
    const [record] = store.dismissalsList();
    expect(record).toEqual<Dismissal>({
      key,
      category: 'hero-centered',
      severity: 'advisory',
      file: 'a.tsx',
      line: 5,
      snippet: 'className="text-center"',
      reason: 'intentional: matches the brand lockup',
      author: 'pi',
      at: AT,
    });
  });

  it('refuses a dismissal with no reason, a blank reason, or a trivially short one', () => {
    const { store, key } = seeded();
    for (const bad of ['', '   ', 'nope', 'x'.repeat(MIN_DISMISSAL_REASON_CHARS - 1)]) {
      const r = store.dismiss(key, bad, AT);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reasons.join()).toContain('reason');
    }
    expect(store.visible()).toHaveLength(1); // nothing was suppressed
    expect(store.dismissalsList()).toHaveLength(0);
  });

  it('refuses an unknown key and a duplicate dismissal', () => {
    const { store, key } = seeded();
    const unknown = store.dismiss('no-such-key', 'a perfectly good reason here', AT);
    expect(unknown.ok).toBe(false);
    if (!unknown.ok) expect(unknown.reasons.join()).toContain('no finding with key');

    expect(store.dismiss(key, 'first justification recorded', AT).ok).toBe(true);
    const twice = store.dismiss(key, 'second justification recorded', AT);
    expect(twice.ok).toBe(false);
    if (!twice.ok) expect(twice.reasons.join()).toContain('already dismissed');
    expect(store.dismissalsList()).toHaveLength(1);
  });

  it('restore reverses a dismissal; restoring a non-dismissed key is refused', () => {
    const { store, key } = seeded();
    store.dismiss(key, 'justification recorded here', AT);
    expect(store.restore(key).ok).toBe(true);
    expect(store.visible()).toHaveLength(1);
    expect(store.dismissalsList()).toHaveLength(0);
    const again = store.restore(key);
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.reasons.join()).toContain('no dismissal recorded');
  });
});

describe('T0804 — re-scan keeps decisions', () => {
  it('a dismissal survives re-scan when only the LINE moved', () => {
    const store = overlay();
    store.ingest([scan('a.tsx', [{ line: 5, snippet: 'className="text-center"' }])]);
    const key = store.all()[0]!.key;
    store.dismiss(key, 'brand lockup exemption documented', AT);

    // an unrelated edit above shifts the finding down 20 lines
    store.ingest([scan('a.tsx', [{ line: 25, snippet: 'className="text-center"' }])]);
    const [after] = store.all();
    expect(after!.line).toBe(25); // display follows the source
    expect(after!.key).toBe(key); // identity does not
    expect(after!.dismissed).toBe(true);
    expect(store.visible()).toHaveLength(0);
  });

  it('a fixed finding stops being reported and its dismissal becomes stale', () => {
    const store = overlay();
    store.ingest([scan('a.tsx', [{ line: 5, snippet: 'className="text-center"' }])]);
    store.dismiss(store.all()[0]!.key, 'brand lockup exemption documented', AT);
    expect(store.staleDismissals()).toHaveLength(0);

    store.ingest([scan('a.tsx', [])]); // fixed
    expect(store.all()).toHaveLength(0);
    expect(store.staleDismissals()).toHaveLength(1);
    // stale decisions are reported, never silently deleted
    expect(store.dismissalsList()).toHaveLength(1);
  });

  it('a different finding in the same file does not inherit a dismissal', () => {
    const store = overlay();
    store.ingest([scan('a.tsx', [{ line: 5, snippet: 'className="text-center"' }])]);
    store.dismiss(store.all()[0]!.key, 'brand lockup exemption documented', AT);
    store.ingest([scan('a.tsx', [{ line: 5, snippet: 'px-[13px]' }])]);
    expect(store.all()[0]!.dismissed).toBe(false);
    expect(store.visible()).toHaveLength(1);
  });

  it('re-scan preserves dismissals across multiple files', () => {
    const store = overlay();
    store.ingest([
      scan('a.tsx', [{ line: 1, snippet: 'text-center' }]),
      scan('b.tsx', [{ line: 7, snippet: 'text-center' }]),
    ]);
    const keyA = store.all()[0]!.key;
    store.dismiss(keyA, 'exemption recorded for file a', AT);
    store.ingest([
      scan('a.tsx', [{ line: 3, snippet: 'text-center' }]),
      scan('b.tsx', [{ line: 9, snippet: 'text-center' }]),
    ]);
    expect(store.all().find((f) => f.file === 'a.tsx')!.dismissed).toBe(true);
    expect(store.all().find((f) => f.file === 'b.tsx')!.dismissed).toBe(false);
  });
});

describe('T0804 — severity filter + counts', () => {
  function mixed(): FindingsOverlayStore {
    const store = overlay();
    store.ingest([
      scan('a.tsx', [
        { line: 1, snippet: 'text-center', severity: 'advisory' },
        { line: 2, snippet: 'rounded-[13px]', severity: 'blocking' },
      ]),
      scan('b.tsx', [{ line: 3, snippet: 'gradient-hero', severity: 'blocking' }]),
    ]);
    return store;
  }

  it('defaults to the documented filter constant', () => {
    const store = mixed();
    expect(store.severityFilter()).toBe(DEFAULT_SEVERITY_FILTER);
    expect(DEFAULT_SEVERITY_FILTER).toBe('all');
    expect(store.visible()).toHaveLength(3);
  });

  it('filters by severity without changing dismissal state', () => {
    const store = mixed();
    expect(store.setFilter('blocking').ok).toBe(true);
    expect(store.visible().map((f) => f.severity)).toEqual(['blocking', 'blocking']);
    const counts = store.counts();
    expect(counts.total).toBe(3);
    expect(counts.visible).toBe(2);
    expect(counts.filteredOut).toBe(1);

    expect(store.setFilter('advisory').ok).toBe(true);
    expect(store.visible()).toHaveLength(1);
  });

  it('refuses an unknown filter value', () => {
    const store = mixed();
    // @ts-expect-error — deliberately invalid filter from a caller
    const r = store.setFilter('critical');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reasons.join()).toContain("'all' | 'blocking' | 'advisory'");
  });

  it('counts separate dismissed from filtered-out', () => {
    const store = mixed();
    const key = store.all()[0]!.key; // the advisory
    store.dismiss(key, 'advisory accepted for this sprint', AT);
    const counts = store.counts();
    expect(counts.total).toBe(3);
    expect(counts.blocking).toBe(2);
    expect(counts.advisory).toBe(1);
    expect(counts.dismissed).toBe(1);
    expect(counts.visible).toBe(2);
    expect(counts.filteredOut).toBe(0);
  });
});

describe('T0804 — dismissal log for DECISIONS.md', () => {
  it('is empty when nothing was dismissed', () => {
    const store = overlay();
    store.ingest([scan('a.tsx', [{ line: 1, snippet: 'text-center' }])]);
    expect(store.dismissalLogLines()).toEqual([]);
  });

  it('emits DECISIONS.md rows in the house append-only format', () => {
    const store = overlay();
    store.ingest([
      scan('b.tsx', [{ line: 9, snippet: 'gradient-hero', severity: 'blocking' }]),
      scan('a.tsx', [{ line: 3, snippet: 'text-center' }]),
    ]);
    for (const f of store.all()) store.dismiss(f.key, `reason for ${f.file} recorded`, AT);
    const lines = store.dismissalLogLines();
    expect(lines).toHaveLength(2);

    // date | decision | rationale | alternatives | approval | scope
    const first = lines[0]!;
    const fields = first.replace(/^- /, '').split(' | ');
    expect(fields).toHaveLength(6);
    expect(fields[0]).toBe('2026-11-14');
    expect(fields[1]).toBe('Dismiss scanner finding hero-centered at a.tsx:3');
    expect(fields[2]).toBe('reason for a.tsx recorded');
    expect(fields[3]).toBe('—');
    expect(fields[4]).toBe('operator pi');
    expect(fields[5]).toBe('hero-centered');

    // deterministic + ordered by key (a.tsx before b.tsx)
    expect(store.dismissalLogLines()).toEqual(lines);
    expect(lines[0]).toContain('a.tsx:3');
    expect(lines[1]).toContain('b.tsx:9');
  });

  it('keeps one row per decision even when content contains pipes or newlines', () => {
    const store = overlay();
    store.ingest([scan('a.tsx', [{ line: 1, snippet: 'text-center' }])]);
    store.dismiss(store.all()[0]!.key, 'reason with | pipe and\nnewline inside', AT);
    const lines = store.dismissalLogLines();
    expect(lines).toHaveLength(1);
    const line = lines[0]!;
    // still exactly six fields once escaped pipes are honoured
    expect(line.split(/(?<!\\)\|/)).toHaveLength(6);
    expect(line).toContain('newline inside'); // newline folded to a space
  });

  it('flags a stale dismissal in its rationale', () => {
    const store = overlay();
    store.ingest([scan('a.tsx', [{ line: 1, snippet: 'text-center' }])]);
    store.dismiss(store.all()[0]!.key, 'decision that later became obsolete', AT);
    store.ingest([scan('a.tsx', [])]);
    const lines = store.dismissalLogLines();
    expect(lines[0]).toContain('stale: finding no longer reported');
  });
});

describe('T0804 — defensive copies', () => {
  it('returned findings and dismissals cannot mutate store state', () => {
    const store = overlay();
    store.ingest([scan('a.tsx', [{ line: 1, snippet: 'text-center' }])]);
    const key = store.all()[0]!.key;
    store.dismiss(key, 'justification recorded here', AT);

    const findings = store.all();
    findings[0]!.dismissed = false;
    findings[0]!.line = 999;

    const log = store.dismissalsList();
    log[0]!.reason = 'tampered';

    expect(store.all()[0]!.dismissed).toBe(true);
    expect(store.all()[0]!.line).toBe(1);
    expect(store.dismissalsList()[0]!.reason).toBe('justification recorded here');
  });
});
