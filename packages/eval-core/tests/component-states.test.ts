/**
 * T1038 (issue #21 R6) — component states are measured where they can be driven.
 *
 * Issue #15's fifth box read "partly" because pressed/loading/disabled/success/error had no instrument.
 * `loading`, `success` and `error` are application states: setting a guessed class would measure our
 * guess, so they are named as not driven. `pressed` and `disabled` are real DOM states, and their style
 * deltas are numbers a report can carry.
 *
 * The two fixtures differ in one thing — whether the primary button acknowledges a press — so a test
 * that passes on both would prove nothing.
 */
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { probeStates } from '../src/harness/states.js';
import { runAudit } from '../src/audit/pipeline.js';

const HONEST = pathToFileURL('fixtures/bestpractice/states/index.html').href;
const FLAT = pathToFileURL('fixtures/bestpractice/states-flat/index.html').href;
// A page with text and nothing to press: no button, no link, no submit input.
const noControlsPage = (): string => {
  const dir = mkdtempSync(join(tmpdir(), 'sus-no-controls-'));
  const file = join(dir, 'index.html');
  writeFileSync(
    file,
    '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Text only</title>' +
      '<meta name="description" content="A page with no interactive control at all, used to prove the state probe says not-run instead of pass.">' +
      '</head><body><main><h1>Text only</h1><p>Nothing to press here.</p></main></body></html>',
    'utf8',
  );
  return pathToFileURL(file).href;
};

const audit = async (target: string) => {
  const out = mkdtempSync(join(tmpdir(), 'sus-states-'));
  const run = await runAudit({
    target,
    liveUrl: null,
    mode: 'deep',
    outDir: out,
    authorizedHosts: [],
    fixPlan: false,
  });
  return {
    check: run.report.checks.find((entry) => entry.id === 'component-states'),
    findings: run.report.findings.filter((finding) => finding.check === 'component-states'),
  };
};

describe('component states (issue #21 R6)', () => {
  it('measures a press delta when the control has a pressed state', async () => {
    const result = await probeStates(HONEST, []);
    expect(result.status).toBe('measured');
    const control = result.controls[0];
    expect(control?.descriptor).toBe('button.primary');
    expect(control!.pressed.changed.length).toBeGreaterThan(0);
    // The disabled state is measured on its own, and is visible in this fixture.
    expect(control!.disabled.changed.length).toBeGreaterThan(0);
    // The three application states are named, never implied.
    expect(result.notDriven).toEqual(['loading', 'success', 'error']);
  }, 120000);

  it('reports a control that gives no press feedback as a measured finding', async () => {
    const result = await probeStates(FLAT, []);
    const control = result.controls[0];
    expect(control!.pressed.changed).toEqual([]);
    expect(control!.disabled.changed.length).toBeGreaterThan(0);

    const audited = await audit('fixtures/bestpractice/states-flat');
    expect(audited.check?.status).toBe('fail');
    const press = audited.findings.find((finding) => finding.title.startsWith('No press feedback'));
    expect(press).toBeDefined();
    expect(press!.observation.location).toBe('button.primary');
    expect(press!.observation.observed).toEqual({
      value: 0,
      unit: 'changed style properties on press',
    });
    expect(press!.observation.expected).toEqual({
      value: 1,
      unit: 'changed style properties on press',
    });
  }, 420000);

  it('passes, with no finding, when the control has both states', async () => {
    const audited = await audit('fixtures/bestpractice/states');
    expect(audited.check?.status).toBe('pass');
    expect(audited.findings).toEqual([]);
    expect(audited.check?.detail.join(' ')).toContain('loading, success, error');
  }, 420000);

  it('is not-run with a reason when there is nothing to drive', async () => {
    const result = await probeStates(noControlsPage(), []);
    expect(result.status).toBe('not-run');
    expect(result.reason).toContain('no interactive control');
  }, 120000);
});
