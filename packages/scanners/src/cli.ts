/**
 * sus-scan CLI (T0304). JSON output contract: ScanResult[].
 * Exit codes (documented):
 *   0 = no findings          2 = blocking findings present (commit gate)
 *   1 = advisory-only        3 = usage/IO error
 * The blocking threshold implements G3/§6 policy: blocking categories stop a
 * commit; advisory categories inform.
 */
import { readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { scanText, type ScanResult } from './engine.js';

export const EXIT = { CLEAN: 0, ADVISORY: 1, BLOCKING: 2, USAGE: 3 } as const;

function collectFiles(target: string): string[] {
  const st = statSync(target);
  if (st.isFile()) return [target];
  const out: string[] = [];
  for (const f of readdirSync(target)) {
    const p = join(target, f);
    if (statSync(p).isFile() && /\.(md|html|txt|tsx?|json|css)$/.test(f) && !f.endsWith('.min.')) {
      out.push(p);
    }
  }
  return out;
}

export function main(argv: string[]): void {
  const args = argv.slice(2);
  const targetIdx = args.findIndex((a) => a !== '--format' && a !== 'json' && !a.startsWith('--'));
  if (args.length === 0 || targetIdx === -1) {
    console.error('usage: sus-scan <file|dir> [--format json]');
    process.exit(EXIT.USAGE);
  }
  const target = args[targetIdx]!;
  let results: ScanResult[];
  try {
    results = collectFiles(target).map((f) => scanText(readFileSync(f, 'utf8'), f));
  } catch (e) {
    console.error(String(e));
    process.exit(EXIT.USAGE);
  }
  if (args.includes('--format') || args.includes('json')) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    for (const r of results) {
      for (const f of r.findings) {
        console.log(`${r.file}:${f.line} [${f.severity}] ${f.category}: …${f.snippet}`);
      }
    }
    console.log(`${results.reduce((s, r) => s + r.findings.length, 0)} finding(s)`);
  }
  const blocking = results.some((r) => r.stats.blocked > 0);
  const advisory = results.some((r) => r.stats.advisory > 0);
  process.exit(blocking ? EXIT.BLOCKING : advisory ? EXIT.ADVISORY : EXIT.CLEAN);
}

// run only when executed directly (not on import by tests/consumers)
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  main(process.argv);
}
