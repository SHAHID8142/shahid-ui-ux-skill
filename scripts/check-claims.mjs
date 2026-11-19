#!/usr/bin/env node
/**
 * T1004 — docs lint: the claim checker. `pnpm claims`, part of `pnpm verify`.
 *
 * Scans the claim-bearing documents (README, the published docs pages, the skill
 * text) and refuses comparative claims while the benchmark gate is closed, plus
 * absolute claims always. A file that exists to *discuss* claims is exempt — the
 * protocol has to be able to quote the words it forbids.
 */
import { readFileSync } from 'node:fs';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EXEMPT_FILES, findClaims, gateOpenFromStatus } from './lib/claims.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

/** The publishable claim surface: what a reader is meant to trust. */
const TARGETS = [
  'README.md',
  'ROADMAP.md',
  'HANDOFF.md',
  'TEST_EVIDENCE.md',
  'docs/LIMITATIONS.md',
  'docs/MAINTENANCE.md',
  'docs/SUPPORT_MATRIX.md',
  'docs/COVERAGE_MATRIX.md',
  'docs/STUDIO.md',
  'docs/BESTPRACTICE_EXAMPLES.md',
  'docs/BUILD_COMPLETION_HANDOFF.md',
  // Release-facing claim surfaces (T1091): the preview install path and the third-party
  // licence notices are exactly the pages a release reader is meant to trust.
  'docs/QUICKSTART.md',
  'docs/RELEASE_NOTES_v0.1.0-preview.1.md',
  'docs/THIRD_PARTY_NOTICES.md',
  'skill/SKILL.md',
  'skill/README.md',
  // The shipped product text (T1057, audit finding T1003-12): a comparative claim in a
  // reference file would never have been caught by the six-file scan set.
  'skill/references/art-direction.md',
  'skill/references/copy-seo.md',
  'skill/references/direction.md',
  'skill/references/foundations-color-typography.md',
  'skill/references/foundations-heuristics-ia.md',
  'skill/references/foundations-layout-responsive.md',
  'skill/references/motion-interruption.md',
  'skill/references/precedence.md',
  'skill/references/surfaces.md',
];

function readStatus() {
  const path = join(ROOT, 'evals/benchmarks/results/status.json');
  if (!existsSync(path)) return { gateOpen: false, note: 'no benchmark status file' };
  try {
    const status = JSON.parse(readFileSync(path, 'utf8'));
    return { gateOpen: gateOpenFromStatus(status), note: 'benchmark status read' };
  } catch {
    return { gateOpen: false, note: 'benchmark status unreadable (fail-closed)' };
  }
}

const { gateOpen, note } = readStatus();
console.log(
  `[INFO] claims: benchmark gate ${gateOpen ? 'OPEN' : 'CLOSED'} (${note}); scan set ${TARGETS.length} file(s)`,
);

let violations = 0;
let scanned = 0;
for (const relative of TARGETS) {
  if (EXEMPT_FILES.has(relative)) continue;
  const path = join(ROOT, relative);
  if (!existsSync(path)) {
    console.error(`[FAIL] claim scan target missing: ${relative}`);
    violations += 1;
    continue;
  }
  scanned += 1;
  const findings = findClaims(readFileSync(path, 'utf8'), { gateOpen });
  for (const finding of findings) {
    violations += 1;
    const why =
      finding.kind === 'absolute'
        ? 'absolute claim — no benchmark makes this true'
        : 'comparative claim — the benchmark claim gate is closed';
    console.error(`[FAIL] ${relative}:${finding.line} "${finding.match}" — ${why}`);
    console.error(`       ${finding.text.slice(0, 160)}`);
  }
}

if (violations > 0) {
  console.error(`\n[FAIL] ${violations} claim violation(s) across ${scanned} file(s).`);
  process.exit(1);
}
console.log(`[PASS] ${scanned} claim-bearing file(s) carry no unsupported claims`);
