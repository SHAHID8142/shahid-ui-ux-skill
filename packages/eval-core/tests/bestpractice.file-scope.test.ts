/**
 * T1037 (issue #21 R8) — a file scope must not report "nothing to propose" when the truth is
 * "nothing can be attributed to a file".
 *
 * A finding names an element (`input#email`); a `component-path` scope names a source file. No rule in
 * this repository maps one to the other, and inventing one would attribute one element's defect to
 * whatever file the user picked. So the scope stays honest: it states that the measured findings could
 * not be attributed, suggests the scopes that can attribute them, and exits **3** (nothing in scope was
 * measured) instead of 0 (measured and clean).
 */
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runBestPractice } from '../src/bestpractice/command.js';

const TARGET = 'fixtures/bestpractice';

describe('file scopes and attribution (issue #21 R8)', () => {
  it('says the findings exist but cannot be attributed, and exits 3', async () => {
    const out = mkdtempSync(join(tmpdir(), 'sus-file-scope-'));
    const run = await runBestPractice({
      target: TARGET,
      liveUrl: null,
      mode: 'deep',
      outDir: out,
      authorizedHosts: [],
      scope: { kind: 'component-path', value: 'motion/index.html' },
      focus: null,
    });
    expect(run.scope.outcome).toBe('resolved');
    expect(run.proposal).toBeNull();
    expect(run.exitCode).toBe(3);
    expect(run.message).toContain('cannot attribute');
    expect(run.markdown).toContain('none can be attributed to a file');
    // The remedy is named, not left to the reader to discover.
    expect(run.markdown).toContain('--scope page');
    expect(run.markdown).toContain("--scope '#email'");
    // And it is not phrased as a pass.
    expect(run.markdown).not.toContain('found nothing to change');
  }, 420000);

  it('still exits 0 when a scope genuinely measured nothing to change', async () => {
    // A clean single page, quick mode: no browser dimensions, no findings, nothing unattributed.
    const dir = mkdtempSync(join(tmpdir(), 'sus-clean-'));
    writeFileSync(
      join(dir, 'index.html'),
      [
        '<!doctype html><html lang="en"><head><meta charset="utf-8">',
        '<meta name="viewport" content="width=device-width, initial-scale=1">',
        '<title>Clean page</title>',
        '<meta name="description" content="' + 'A'.repeat(90) + '">',
        '</head><body><main><h1>Clean page</h1><p>Nothing to fix here.</p></main></body></html>',
      ].join(''),
      'utf8',
    );
    const out = mkdtempSync(join(tmpdir(), 'sus-clean-out-'));
    const run = await runBestPractice({
      target: dir,
      liveUrl: null,
      mode: 'quick',
      outDir: out,
      authorizedHosts: [],
      scope: { kind: 'component-path', value: 'index.html' },
      focus: null,
    });
    expect(run.scope.outcome).toBe('resolved');
    expect(run.exitCode).toBe(0);
    expect(run.message).toBe('nothing to propose in this scope');
  }, 120000);
});
