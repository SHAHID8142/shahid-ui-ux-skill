/**
 * T1024 — the five measured example classes.
 *
 * The report under `docs/BESTPRACTICE_EXAMPLES.md` is generated from a real deep audit, then
 * committed. This test keeps the committed report and the committed record in step, and checks the
 * claims that would otherwise be decoration: every example moved its own instrument, nothing is
 * `pass` without a measurement, and a dimension that was not measured is listed as such.
 *
 * It does not re-run the browser work: `pnpm examples:check` validates the committed record in
 * `pnpm verify`, and `node scripts/bestpractice/examples.mjs` regenerates it when the fixture or the
 * audit changes.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const RECORD = join(ROOT, 'evals', 'bestpractice', 'examples.json');
const DOC = join(ROOT, 'docs', 'BESTPRACTICE_EXAMPLES.md');
const FIXTURE = join(ROOT, 'fixtures', 'bestpractice', 'examples', 'index.html');

interface Measurement {
  label: string;
  before: string;
  after: string;
}

interface ExampleRecord {
  id: string;
  klass: string;
  scope: string;
  instrument: string;
  measurements: Measurement[];
  consulted: string[];
  notConsulted: Array<{ dimension: string; reason: string }>;
  itemsBefore: Array<{ severity: string; kind: string; dimension: string; title: string }>;
  itemsAfter: unknown[];
  verdict: string;
}

const record = JSON.parse(readFileSync(RECORD, 'utf8')) as {
  schema: string;
  mode: string;
  examples: ExampleRecord[];
  notClaimed: string[];
};

describe('committed example record', () => {
  it('covers the five classes issue #15 names, each with a scope', () => {
    expect(record.schema).toBe('sus.bestpractice.examples/1');
    expect(record.mode).toBe('deep');
    expect(record.examples.map((example) => example.klass)).toEqual([
      'cta',
      'navbar',
      'form',
      'record-row',
      'motion-keyboard',
    ]);
    for (const example of record.examples) expect(example.scope.startsWith('#')).toBe(true);
  });

  it('shows an improvement per example, backed by its own instrument', () => {
    for (const example of record.examples) {
      expect(example.itemsBefore.length, example.id + ' measured nothing').toBeGreaterThan(0);
      expect(example.itemsAfter.length, example.id + ' still has items').toBe(0);
      expect(example.verdict.startsWith('pass'), example.id + ': ' + example.verdict).toBe(true);
      const status = example.measurements.find((row) => row.label.includes('status'));
      expect(status, example.id + ' has no check status').toBeDefined();
      expect(status?.before).not.toBe('pass');
      expect(status?.after).toBe('pass');
    }
  });

  it('never files a measured item for a dimension it also says it did not measure', () => {
    for (const example of record.examples) {
      const notConsulted = new Set(example.notConsulted.map((entry) => entry.dimension));
      for (const item of example.itemsBefore) {
        expect(notConsulted.has(item.dimension), example.id + ' item in ' + item.dimension).toBe(
          false,
        );
      }
      for (const entry of example.notConsulted) expect(entry.reason.length).toBeGreaterThan(10);
    }
  });

  it('states what the examples do not claim, including the unmeasured motion arm', () => {
    const text = record.notClaimed.join('\n');
    expect(text).toContain('not-run');
    expect(text).toContain('axe');
    expect(text).toContain('temporary copy');
    expect(readFileSync(DOC, 'utf8')).toContain('What these examples do not claim');
  });

  it('keeps the committed markdown identical to what the record renders', () => {
    // Rendering is the script's job; running its check mode is the only way to prove the doc was
    // generated rather than hand-edited, and it needs no browser.
    const result = execFileSync(
      'node',
      [join(ROOT, 'scripts', 'bestpractice', 'examples.mjs'), '--check'],
      {
        cwd: ROOT,
        encoding: 'utf8',
      },
    );
    expect(result).toContain('all verdicts pass');
  }, 60000);

  it('leaves the fixture in its flawed state: the fixes are applied to a copy, not here', () => {
    const html = readFileSync(FIXTURE, 'utf8');
    // Each marker is the defect one fix removes; if a fix were ever applied in place the record
    // above would still say "pass" while describing a fixture that no longer has the problem.
    expect(html).toContain('width: 28px');
    expect(html).toContain('width: 720px');
    expect(html).toContain('min-width: 900px');
    expect(html).toContain('outline: none');
    expect(html).toContain('transition: transform 300ms ease-in-out');
  });
});
