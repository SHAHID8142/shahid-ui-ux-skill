/**
 * T0401: token pipeline — validation, semantic roles, deterministic
 * exports, G12 drift detection, G1 verdict. The canonical SUS contract at
 * .sus/tokens.json is the positive fixture.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { flattenTokens } from '@sus/schemas';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { evaluateG1, evaluateG12, generateCss, generateTs, loadTokens } from '../src/pipeline.js';

const REPO = join(__dirname, '..', '..', '..');
const TOKENS = join(REPO, '.sus', 'tokens.json');

describe('token pipeline (T0401)', () => {
  it('canonical SUS token contract validates with all semantic roles', () => {
    const r = loadTokens(TOKENS);
    expect(r.valid).toBe(true);
    expect(r.detail).toEqual([]);
    expect(r.tokens.size).toBeGreaterThanOrEqual(10);
    expect(r.tokens.has('color.surface.base')).toBe(true);
    expect(r.tokens.has('motion.easing.standard')).toBe(true);
  });

  it('missing semantic roles fail validation with named roles', () => {
    const dir = mkdtempSync(join(tmpdir(), 't0401-'));
    const partial = join(dir, 'tokens.json');
    writeFileSync(
      partial,
      JSON.stringify({ color: { fg: { default: { $type: 'color', $value: '#000' } } } }),
    );
    const r = loadTokens(partial);
    expect(r.valid).toBe(false);
    expect(r.detail.join(' ')).toContain('color.surface.base');
  });

  it('exports are deterministic and regenerable', () => {
    const file = JSON.parse(readFileSync(TOKENS, 'utf8')) as Record<string, unknown>;
    const tokens = flattenTokens(file);
    const css1 = generateCss(tokens);
    const css2 = generateCss(tokens);
    expect(css1).toBe(css2);
    expect(css1).toContain('--sus-color-surface-base: #ffffff;');
    const ts1 = generateTs(tokens);
    expect(ts1).toContain('SUS_TOKENS');
    expect(generateTs(tokens)).toBe(ts1);
  });

  it('G12 fails closed: missing or drifting committed exports', () => {
    const fail = evaluateG12(TOKENS, null, null);
    expect(fail.status).toBe('fail');
    const drift = evaluateG12(TOKENS, ':root {\n  --stale: 1;\n}', 'export const STALE = 1;\n');
    expect(drift.status).toBe('fail');
    expect(drift.detail.join(' ')).toMatch(/diverges/);
    const r = loadTokens(TOKENS);
    const ok = evaluateG12(TOKENS, generateCss(r.tokens), generateTs(r.tokens));
    expect(ok.status).toBe('pass');
  });

  it('CLI: exports regenerate + gates emit G1/G12 verdicts', () => {
    const cli = join(REPO, 'packages', 'tokens', 'dist', 'cli.js');
    execFileSync(process.execPath, [cli, 'exports'], { encoding: 'utf8' });
    const gates = JSON.parse(
      execFileSync(process.execPath, [cli, 'gates'], { encoding: 'utf8' }),
    ) as Array<{ gate: string; status: string }>;
    expect(gates.find((g) => g.gate === 'G1')?.status).toBe('pass');
    expect(gates.find((g) => g.gate === 'G12')?.status).toBe('pass');
    // committed exports now exist and match: rerun to confirm sync
    expect(
      readFileSync(join(REPO, 'packages', 'tokens', 'exports', 'tokens.css'), 'utf8'),
    ).toContain('--sus-space-group');
  });

  it('G1 fails closed without a token contract', () => {
    const r = evaluateG1(join(REPO, '.sus', 'does-not-exist.json'));
    expect(r.status).toBe('fail');
  });
});
