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

fail(`unknown command "${String(command)}" — usage: sus-eval score --in <file> [--out <file>]`);
