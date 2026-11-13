/**
 * Runner smoke (T0102): proves vitest executes inside the pnpm workspace
 * against @sus/eval-core. Placeholder content; real rubric/evidence logic
 * arrives in M1.5 (T0151+).
 */
import { describe, expect, it } from 'vitest';
import { SUS_EVAL_CORE_PACKAGE } from '../src/index.js';

describe('@sus/eval-core skeleton', () => {
  it('exports its version marker', () => {
    expect(SUS_EVAL_CORE_PACKAGE).toBe('0.0.0');
  });
});
