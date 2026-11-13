/**
 * @sus/eval-core CLI (T0151). Zero-framework: plain node + parseArgs.
 *   sus-eval score --in <rubric-score.json> [--out <verdict.json>]
 * Judged axes are reported and flagged never-gates-CI; exit code never
 * depends on judged scores (tier rule).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { RubricScore, ScoringVerdict } from '@sus/schemas';
import { scoreSection } from './scoring.js';

function fail(message: string): never {
  console.error(`error: ${message}`);
  process.exit(2);
}

const args = process.argv.slice(2);
const command = args[0];

if (command === 'score') {
  const { values } = parseArgs({
    args: args.slice(1),
    options: { in: { type: 'string' }, out: { type: 'string' } },
  });
  if (!values.in) fail('score requires --in <rubric-score.json>');
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(values.in, 'utf8'));
  } catch (e) {
    fail(`cannot read ${values.in}: ${e instanceof Error ? e.message : e}`);
  }
  const parsedInput = RubricScore.safeParse(raw);
  if (!parsedInput.success) {
    fail(parsedInput.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '));
  }
  const verdict = scoreSection(parsedInput.data);
  const parsedOut = ScoringVerdict.safeParse(verdict);
  if (!parsedOut.success) fail('internal: verdict failed schema round-trip');
  const json = JSON.stringify(parsedOut.data, null, 2);
  if (values.out) {
    writeFileSync(values.out, `${json}\n`);
    console.log(`wrote ${values.out}`);
  } else {
    console.log(json);
  }
  process.exit(0);
}

if (command === 'capture') {
  const { values } = parseArgs({
    args: args.slice(1),
    options: { url: { type: 'string' }, out: { type: 'string' } },
  });
  if (!values.url || !values.out) fail('capture requires --url <url> --out <dir>');
  // playwright is a devDependency: imported lazily so `score` works without it
  const { captureMatrix } = await import('./harness/capture.js');
  const result = await captureMatrix(values.url, values.out);
  console.log(
    JSON.stringify(
      {
        url: result.url,
        combos: result.combos.map((c) => ({
          viewport: c.viewport,
          theme: c.theme,
          screenshot: c.screenshot,
          horizontalOverflow: c.metrics.horizontalOverflow,
          cls: c.metrics.cls,
          lcpMs: c.metrics.lcpMs,
          smallTapTargets: c.metrics.smallTapTargets.length,
        })),
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

if (command === 'evidence') {
  const { values } = parseArgs({
    args: args.slice(1),
    options: { in: { type: 'string' }, out: { type: 'string' } },
  });
  if (!values.in) fail('evidence requires --in <bundle.json>');
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(values.in, 'utf8'));
  } catch (e) {
    fail(`cannot read ${values.in}: ${e instanceof Error ? e.message : e}`);
  }
  const { EvidenceBundle, evaluateG11 } = await import('@sus/schemas');
  const parsed = EvidenceBundle.safeParse(raw);
  if (!parsed.success) {
    fail(parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '));
  }
  const g11 = evaluateG11(parsed.data);
  const json = JSON.stringify({ bundle: values.in, g11 }, null, 2);
  if (values.out) {
    writeFileSync(values.out, `${json}\n`);
    console.log(`wrote ${values.out}`);
  } else {
    console.log(json);
  }
  process.exit(0);
}

fail(`unknown command "${String(command)}" — usage: sus-eval score|capture|evidence`);
