/**
 * SUS CLI invocation fallback (T0204) — deterministic entry points for hosts
 * that cannot run model-side skill loading. Every capability states its
 * degradation honestly: what the CLI provides, what requires a capable model,
 * and what is not built yet. No capability claims beyond that.
 */
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { routeIntent } from './router.js';
import { loadModules } from './jit-loader.js';
import { resolvePrecedence, type Instruction } from './precedence.js';
import { statusText, type CompatibilityDocument } from './compatibility.js';

const REPO_ROOT = join(import.meta.dirname ?? process.cwd(), '..', '..', '..');

interface Capability {
  id: string;
  cliProvides: string;
  requiresModel: string | null;
  built: boolean;
}

export const CAPABILITY_MATRIX: Capability[] = [
  {
    id: 'intent-routing',
    cliProvides: 'deterministic heuristic-v1 routing to surface + explicit module set',
    requiresModel: 'a capable model routes more accurately; CLI routing is the honest floor',
    built: true,
  },
  {
    id: 'just-in-time-loading',
    cliProvides: 'loads built reference modules with measured token budget; refuses over-budget',
    requiresModel: null,
    built: true,
  },
  {
    id: 'precedence-resolution',
    cliProvides: 'fixed-layer injection + conflict surfacing (never silent resolution)',
    requiresModel: null,
    built: true,
  },
  {
    id: 'design-direction',
    cliProvides: 'nothing — direction reasoning is a model capability',
    requiresModel: 'all of it (M4: direction-reasoning module)',
    built: false,
  },
  {
    id: 'surface-playbooks',
    cliProvides: 'nothing yet',
    requiresModel: 'playbook application is model work guided by built playbooks (M4)',
    built: false,
  },
  {
    id: 'anti-slop-scanning',
    cliProvides: 'nothing yet (M3 ships the deterministic scanner CLI)',
    requiresModel: null,
    built: false,
  },
  {
    id: 'live-studio',
    cliProvides: 'nothing — Studio requires the bridge (M7) with safety prerequisites',
    requiresModel: null,
    built: false,
  },
];

export function capabilitiesText(): string {
  const rows = CAPABILITY_MATRIX.map(
    (c) =>
      `${c.built ? '[cli]' : '[unbuilt]'} ${c.id}\n  cli: ${c.cliProvides}\n  model: ${c.requiresModel ?? 'not required'}`,
  );
  return `SUS capability matrix (honest degradation per capability, T0204)\n\n${rows.join('\n\n')}\n`;
}

export function main(args: string[]): void {
  const command = args[0];
  if (command === 'capabilities') {
    console.log(capabilitiesText());
    return;
  }
  if (command === 'route') {
    const brief = args.slice(1).join(' ');
    if (!brief) {
      console.error('usage: sus route <brief text>');
      process.exitCode = 2;
      return;
    }
    const intent = routeIntent(brief);
    console.log(JSON.stringify(intent, null, 2));
    if (intent.openQuestions.length > 0) {
      console.error('open questions (honest fallback): ' + intent.openQuestions.join(' | '));
    }
    return;
  }
  if (command === 'load') {
    const brief = args.slice(1).join(' ');
    const intent = routeIntent(brief || '');
    const report = loadModules(intent, REPO_ROOT);
    console.log(
      JSON.stringify(
        {
          intent,
          loaded: report.loaded.map((m) => ({
            id: m.id,
            path: m.path,
            tokensEstimate: m.tokensEstimate,
          })),
          skipped: report.skipped,
          totalTokensEstimate: report.totalTokensEstimate,
          budget: report.budget,
          budgetExceeded: report.budgetExceeded,
        },
        null,
        2,
      ),
    );
    return;
  }
  if (command === 'status') {
    // T0905: the same generated record the docs page renders, one line per host.
    const docPath = join(REPO_ROOT, 'docs', 'compatibility.json');
    const doc = JSON.parse(readFileSync(docPath, 'utf8')) as CompatibilityDocument;
    console.log(statusText(doc));
    return;
  }
  if (command === 'precedence') {
    const file = args[1];
    let instructions: Instruction[] = [];
    if (file) {
      const parsed = JSON.parse(readFileSync(file, 'utf8')) as Instruction[];
      instructions = parsed;
    }
    console.log(JSON.stringify(resolvePrecedence(instructions), null, 2));
    return;
  }
  console.error('usage: sus route|load|precedence|capabilities|status');
  process.exitCode = 2;
}

// Only execute when this file IS the entry point: importing the package (the
// T0905 generator reads HOST_ADAPTERS from dist/index.js) must not run the CLI
// and must certainly not print usage over a generator's output.
const invokedDirectly =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) main(process.argv.slice(2));
