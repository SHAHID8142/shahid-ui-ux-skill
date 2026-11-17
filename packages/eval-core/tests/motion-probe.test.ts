/**
 * T1036 (issue #21 R7) — the motion dimension is measurable, and "not driven" stays distinguishable
 * from "passed".
 *
 * Before this, G6 was `not-run` for every target forever: the oracles evaluate traces and nothing
 * produced one. The probe drives one disclosure three ways (pointer, keyboard, reduced motion) and
 * hands the traces to the oracles. The two fixtures differ in exactly one thing — whether reduced
 * motion keeps the information — so the test is about the measurement, not about the CSS.
 */
import { pathToFileURL } from 'node:url';
import { expect, it, describe } from 'vitest';
import { probeMotion, motionCases } from '../src/harness/motion.js';
import { informationTokens } from '../src/harness/transition-oracle.js';

const HONEST = pathToFileURL('fixtures/bestpractice/motion/index.html').href;
const LOSSY = pathToFileURL('fixtures/bestpractice/motion-lost/index.html').href;
const NO_DISCLOSURE = pathToFileURL('fixtures/bestpractice/scoped-axe/index.html').href;
// The second disclosure shape (T1040): a native details/summary instead of an aria-expanded widget.
const DETAILS = pathToFileURL('fixtures/bestpractice/motion-details/index.html').href;
const DETAILS_LOST = pathToFileURL('fixtures/bestpractice/motion-details-lost/index.html').href;

describe('motion probe (issue #21 R7)', () => {
  it('measures an honest disclosure and passes parity', async () => {
    const result = await probeMotion(HONEST, []);
    expect(result.status).toBe('measured');
    expect(result.trigger).toBe('button#toggle');
    expect(result.transitionsMs).toBeGreaterThan(0);
    expect(result.verdict?.status).toBe('pass');
  }, 120000);

  it('fails a disclosure that drops information under reduced motion', async () => {
    const result = await probeMotion(LOSSY, []);
    expect(result.status).toBe('measured');
    expect(result.verdict?.status).toBe('fail');
    expect(result.verdict?.detail.join('\n')).toContain('reduced-motion-information-lost');
  }, 120000);

  it('drives a native details/summary disclosure too (T1040)', async () => {
    const result = await probeMotion(DETAILS, []);
    expect(result.status).toBe('measured');
    expect(result.trigger).toContain('details > summary');
    expect(result.verdict!.status).toBe('pass');
  }, 180000);

  it('sees information lost behind a native disclosure under reduced motion', async () => {
    const result = await probeMotion(DETAILS_LOST, []);
    expect(result.status).toBe('measured');
    expect(result.verdict!.status).toBe('fail');
    expect(result.verdict!.detail.join(' ')).toContain('reduced-motion-information-lost');
  }, 180000);

  it('reports not-run, with a reason, when the page has nothing to drive', async () => {
    const result = await probeMotion(NO_DISCLOSURE, []);
    expect(result.status).toBe('not-run');
    expect(result.reason).toContain('aria-expanded');
    // Not-run must never look like a pass.
    expect(result.verdict).toBeNull();
  }, 120000);

  it('builds the two oracle cases from the traces, not from the generated markup', () => {
    const snap = (state: string, text: string) => ({ state, text, visible: text !== '' });
    const cases = motionCases('/', {
      trigger: 'button#toggle',
      pointer: { before: snap('false', ''), after: snap('true', 'Invoice 1') },
      keyboard: { before: snap('false', ''), after: snap('true', 'Invoice 1') },
      reduced: { before: snap('false', ''), after: snap('true', 'Invoice 1') },
    });
    expect(cases.map((entry) => entry.scenario)).toEqual(['reduced-motion', 'modality']);
    // The baseline a reduced-motion case compares against is the pointer trace, and the keyboard
    // case carries its own: parity is about information, so both must hold the same tokens.
    expect(informationTokens(cases[0]!.baselineTrace!)).toEqual(informationTokens(cases[1]!.trace));
    expect(informationTokens(cases[0]!.trace)).toEqual(informationTokens(cases[0]!.baselineTrace!));
  });
});
