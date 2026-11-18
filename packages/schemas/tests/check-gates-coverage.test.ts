/**
 * T1056 (audit finding T1003-11): the gate checker's assertions were uncounted and untestable —
 * a regression that deleted a negative-assertion `report()` line still exited 0 printing
 * "13/13 gates implemented and verified", with one fewer line and no failure anywhere.
 *
 * This file is the checker's own negative control, in three layers:
 *  1. a floor: the checker prints at least one `[PASS]`/`[FAIL]` line per unconditional
 *     `report()` call site in its source, so deleting any always-printing assertion drops the
 *     output below the floor and turns this test red;
 *  2. a canary list pinned HERE, independently of the checker's source: each name is an
 *     assertion that must appear in a live run's output, so deleting (or renaming away) one of
 *     these specific lines fails even when other assertions happen to keep the floor met. The
 *     list is long on purpose: when the checker legitimately gains or changes an assertion,
 *     updating this file is the reviewable diff that proves someone looked;
 *  3. the verdict line itself, so "implemented and verified" cannot survive a checker that
 *     stopped asserting.
 *
 * What this cannot catch: a condition weakened in place (`report(true, …)` keeps printing the
 * same name). The bad-fixture discipline is enforced one level down — every evaluator runs
 * both a good and a bad committed fixture, and the evaluators' own suites assert the bad
 * fixtures fail — so a weakened checker condition diverges from the evaluator suites it
 * summarises rather than from nothing.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = resolve(dirname(import.meta.dirname), '..', '..');
const CHECKER_SOURCE = readFileSync(join(REPO_ROOT, 'scripts', 'check-gates.mjs'), 'utf8');

const CHECKER_OUTPUT = execFileSync('node', ['scripts/check-gates.mjs'], {
  cwd: REPO_ROOT,
  encoding: 'utf8',
});
const assertionLines = CHECKER_OUTPUT.split('\n').filter((line) => /^\[(PASS|FAIL)\]/.test(line));

// 'G13 is never waivable' and 'registry registers semantic prerequisites' are literal-false
// guards that print only when the registry is wrong — they are covered by the checker's exit
// code, not by a green run's output.
const CANARIES: readonly string[] = [
  'G1: bad fixture trips the shared rule',
  'G2: ordered section states pass',
  'G2: section N+1 accepted before N fails',
  'G3: finished copy passes',
  'G3: filler text, placeholder marker and unregistered numeric claim each fail',
  'G6: reduced-motion traces preserve information',
  'G6: reduced-motion information loss fails',
  'G6: no recorded traces fail closed',
  'G7: 320 CSS px reflow passes',
  'G7: horizontal overflow at 320px fails',
  'G7: overflow:hidden instead of reflowing fails',
  'G7: 400% zoom equivalence passes when the zoom record is clean',
  'G7: horizontal overflow at the 400% zoom equivalence fails',
  'G7: a clipping container at the 400% zoom equivalence fails',
  'G8: conforming controls pass',
  'G8: sub-24px control and non-standard exception both fail',
  'G8: no measured controls is not-run, never pass',
  'G9: semantic page passes',
  'G10: registry declares numeric precision/recall targets',
  'G10: labelled corpus meets precision/recall targets',
  'G10: recall below target fails',
  'G10: no labelled cases fails closed',
  'G10: fixture predictions match the shipped detector (corpus not stale)',
  'G4: empty scans fail closed',
  'G5: no runs fail closed',
  'G13: fully defended evidence passes and the verdict stays non-waivable',
  'ancestry(T1001) covers every pre-M11 non-M10 task',
  'ancestry(T1005) covers every task',
  'T1006 stops at the private-push boundary (no audit/publication deps)',
];

describe('the gate checker cannot silently stop asserting (T1056)', () => {
  it('prints at least one assertion line per unconditional report() call site', () => {
    // `report(` minus the `function report(` definition; literal `report(false, …)` calls are
    // failure branches that print only when the guard fires, so they are excluded from the floor.
    const callSites = (CHECKER_SOURCE.match(/(?<!function )\breport\(/g) ?? []).length;
    const conditionalFailureBranches = (CHECKER_SOURCE.match(/report\(false/g) ?? []).length;
    expect(callSites).toBeGreaterThan(40);
    expect(conditionalFailureBranches).toBeGreaterThan(0);
    expect(assertionLines.length).toBeGreaterThanOrEqual(callSites - conditionalFailureBranches);
  });

  it('still asserts every pinned negative- and positive-fixture check, by name', () => {
    for (const name of CANARIES) {
      expect(
        assertionLines.some((line) => line.includes(name)),
        'the checker stopped asserting: ' + name,
      ).toBe(true);
    }
  });

  it('reaches the implemented-and-verified verdict the registry claims', () => {
    expect(CHECKER_OUTPUT).toContain('13/13 gates implemented and verified');
  });
});
