/**
 * SUS CLI invocation fallback (T0204) — deterministic entry points for hosts
 * that cannot run model-side skill loading. Every capability states its
 * degradation honestly: what this repository provides, what still requires a
 * capable model or a host browser, and what the CLI deliberately does not do.
 * No capability claims beyond that.
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
    cliProvides:
      'validates direction records under evals/directions/ (pnpm directions): schema, three real candidates, a refused blocking default, explained rejections; the direction reference is built',
    requiresModel:
      'Deriving a thesis for a new brief is model work — the checker audits a derivation, it cannot produce one',
    built: true,
  },
  {
    id: 'surface-playbooks',
    cliProvides:
      '36 playbooks in skill/references/playbooks/ validated by pnpm playbooks (schema) and pnpm parts (the twelve-part standard)',
    requiresModel:
      'Applying a playbook to a specific screen is model work — the checks validate content, they do not design',
    built: true,
  },
  {
    id: 'anti-slop-scanning',
    cliProvides:
      'sus-scan <file|dir> (packages/scanners) with documented exit codes 0 clean / 1 advisory / 2 blocking / 3 usage',
    requiresModel: null,
    built: true,
  },
  {
    id: 'live-studio',
    cliProvides:
      'Studio bridge vertical slice: annotate -> intent -> diff -> approval-gated apply -> verify -> undo, exercised by pnpm demo:loop against one Astro fixture',
    requiresModel:
      'A host browser over CDP and a supported local dev stack; no row reaches the supported tier yet, so other stacks and a CLI-only Studio are not available',
    built: true,
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
