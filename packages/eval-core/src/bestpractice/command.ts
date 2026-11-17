/**
 * T1023 — `sus-eval bestpractice`: the honest CLI equivalent of `/sus-bestpractice`.
 *
 * The command is a scoped view of the audit: it runs the same engine, converts the findings inside
 * the selected dimensions into proposal items, and writes a proposal that Studio can apply after
 * approval. It never writes into the target, and it never claims a slash binding that a host has not
 * run — the CLI form is what this repository can verify.
 *
 * Exit codes are contractual, mirroring the audit:
 *   0 proposal written with nothing blocking, or nothing to propose
 *   1 proposal written containing P0/P1 items
 *   2 usage, target or scope error — no proposal written
 *   3 proposal written but nothing in scope was measured (every item is a judgment)
 */
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  SCOPE_LIMITS,
  isPageScopeReference,
  resolvePageScope,
  resolveScope,
  selectFocus,
  type FocusDimension,
  type ScopeReference,
  type ScopeResolution,
} from '../audit/scope.js';
import { runAudit, type AuditRun } from '../audit/pipeline.js';
import { itemsFromReport, untestedFromReport } from './from-audit.js';
import type { ProposalItem } from './proposal.js';
import {
  BestPracticeProposal,
  composeProposal,
  renderProposalMarkdown,
  type BestPracticeProposal as ProposalData,
} from './proposal.js';

export const BESTPRACTICE_HELP = `sus-eval bestpractice — scoped best-practice proposal (issue #15)

usage:
  sus-eval bestpractice --path <dir> --scope <selector|file> --out <dir> [options]
  sus-eval bestpractice --url <origin> --scope <selector> --out <dir> [options]

The command is READ-ONLY: it writes \`proposal.json\` and \`proposal.md\` under --out and nothing
into the target. Applying needs per-hunk approval in Studio, bound to the proposal digest.

options:
  --path <dir>        local project or built output (audited; selectors resolve against index.html)
  --url <origin>      authorized live target (loopback by default, else --authorize <host>)
  --scope <value>     what is in scope: a CSS selector (--url or built HTML), "page" for the whole
                      document, or a file path
  --scope-kind <k>    selector | component-path | editor-selection | region   (default: selector)
  --source <s>        source | screenshot   (screenshot ⇒ advisory: no proposal is written)
  --focus <list>      comma-separated subset of responsive,a11y,motion,copy,performance,visual
  --mode <mode>       quick | deep (default: deep: a proposal about layout needs the browser)
  --out <dir>         where proposal.json / proposal.md are written (required)
  --authorize <host>  allow a non-loopback host (repeatable)
  --json              print the proposal instead of the Markdown summary
  --dry-run           accepted, and the default: nothing is ever applied here
  --help              this text

exit codes:
  0  proposal written, nothing blocking (or nothing to propose)
  1  proposal written containing P0/P1 items
  2  usage, target or scope error — no proposal written
  3  proposal written but nothing in scope was measured: every item is a judgment
`;

export interface BestPracticeRequest {
  readonly target: string;
  readonly liveUrl: string | null;
  readonly scope: ScopeReference;
  readonly outDir: string;
  readonly mode: 'quick' | 'deep';
  readonly focus?: readonly FocusDimension[];
  readonly authorizedHosts?: readonly string[];
  readonly generatedAt?: string;
}

export interface BestPracticeRun {
  readonly exitCode: number;
  readonly audit: AuditRun;
  readonly scope: ScopeResolution;
  readonly proposal: ProposalData | null;
  readonly markdown: string;
  readonly proposalPath: string | null;
  readonly markdownPath: string | null;
  readonly message: string;
}

function fileReader(target: string) {
  return (path: string): string | null => {
    const full = isAbsolute(path) ? path : resolve(target, path);
    try {
      return readFileSync(full, 'utf8');
    } catch {
      return null;
    }
  };
}

/**
 * A selector needs a page. With a live URL that is the target; with a local path it is the built
 * `index.html`, loaded over `file://` — the same bytes an auditor would open, without a server.
 */
async function openScopePage(
  request: BestPracticeRequest,
  targetIsDirectory: boolean,
): Promise<{
  page: Awaited<
    ReturnType<Awaited<ReturnType<(typeof import('playwright'))['chromium']['launch']>>['newPage']>
  >;
  close: () => Promise<void>;
} | null> {
  if (request.scope.kind !== 'selector') return null;
  // A directory is resolved through its index.html; a single .html file is itself the page. Both
  // are file:// so resolving a selector never needs the network.
  const url =
    request.liveUrl ??
    (targetIsDirectory
      ? existsSync(join(request.target, 'index.html'))
        ? pathToFileURL(join(request.target, 'index.html')).href
        : null
      : /[^/]\.html?$/i.test(request.target)
        ? pathToFileURL(request.target).href
        : null);
  if (url === null) return null;
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(url, { waitUntil: 'networkidle' });
  return { page, close: () => browser.close() };
}

export interface ScopedSelection {
  readonly dimensions: readonly FocusDimension[];
  readonly notApplicable: readonly { dimension: FocusDimension; reason: string }[];
  readonly items: ProposalItem[];
  readonly untested: readonly { dimension: FocusDimension; reason: string }[];
  readonly outOfScope: number;
  readonly unattributed: number;
  readonly unmapped: number;
}

/**
 * The report → selection half of the command, separated from the run: one audit can answer
 * several scopes (that is what the T1024 example harness does), and a caller that already has a
 * report should not have to run the engine again to get a proposal.
 */
export function selectScopedItems(
  report: AuditRun['report'],
  scope: ScopeResolution,
  focus?: readonly FocusDimension[],
): ScopedSelection {
  if (scope.focus === null) {
    return {
      dimensions: [],
      notApplicable: [],
      items: [],
      untested: [],
      outOfScope: 0,
      unattributed: 0,
      unmapped: 0,
    };
  }
  const requested = focus ?? scope.focus.run;
  const dimensions = scope.focus.run.filter((dimension) => requested.includes(dimension));
  const notApplicable = scope.focus.notApplicable.filter((entry) =>
    requested.includes(entry.dimension),
  );
  // A selection owns what is inside it: the form's input is measured as part of the form.
  // The page owns everything measured on it: no element descriptor can be "outside" the document,
  // and the page-level findings (a missing description) are reported at their own route, which no
  // element descriptor would ever match. So a page scope attributes by dimension, not by selector.
  const targets =
    scope.focus.kind === 'page'
      ? undefined
      : scope.targets.flatMap((target) => [target.selector, ...(target.descendants ?? [])]);
  const { items, outOfScope, unattributed, unmapped } = itemsFromReport(report, {
    dimensions,
    targets,
  });
  return {
    dimensions,
    notApplicable,
    items,
    untested: [
      ...untestedFromReport(report, { dimensions }),
      ...notApplicable.map((entry) => ({ dimension: entry.dimension, reason: entry.reason })),
    ],
    outOfScope,
    unattributed,
    unmapped,
  };
}

export async function runBestPractice(request: BestPracticeRequest): Promise<BestPracticeRun> {
  if (request.scope.kind === 'selector') {
    if (request.scope.value.length > SCOPE_LIMITS.maxSelectorLength) {
      throw new Error('--scope is longer than ' + SCOPE_LIMITS.maxSelectorLength + ' characters');
    }
  }
  if (request.outDir.trim().length === 0)
    throw new Error('--out is required: reports never go into the target');
  // Same rule as the audit: a proposal is evidence about a tree, never a file inside it.
  if (request.liveUrl === null) {
    const target = resolve(request.target);
    const out = resolve(request.outDir);
    if (out === target || out.startsWith(target + sep)) {
      throw new Error(
        'refusing --out inside the selected target (' +
          target +
          '): write the proposal somewhere else, e.g. --out ./sus-bp',
      );
    }
  }

  // 1. The scope: resolved or refused, never guessed. It is resolved first because a resolved
  //    selector lets the audit confine axe to that element (issue #21 R2), and a scope that cannot
  //    be resolved must not spend a deep audit.
  // 1. scope
  // `includes('.')` guessed wrong for a path like `fixtures/site/index.html` (it is a file, not a
  // directory) and made a single-page target resolve no selector at all. Ask the filesystem.
  const targetIsDirectory = existsSync(resolve(request.target))
    ? statSync(resolve(request.target)).isDirectory()
    : false;
  let scope: ScopeResolution;
  if (isPageScopeReference(request.scope)) {
    // No browser and no DOM: the page is already the unit the audit measured.
    scope = resolvePageScope(request.scope);
  } else if (request.scope.kind === 'selector') {
    let opened: Awaited<ReturnType<typeof openScopePage>> = null;
    try {
      opened = await openScopePage(request, targetIsDirectory);
      scope = await resolveScope(opened?.page ?? null, request.scope);
    } catch (error) {
      scope = {
        outcome: 'not-found',
        reference: request.scope,
        targets: [],
        clarification:
          'the scope page could not be opened: ' +
          (error instanceof Error ? error.message.split('\n')[0] : String(error)),
        reason: null,
        advisory: false,
        focus: null,
      };
    } finally {
      if (opened !== null) await opened.close();
    }
  } else {
    scope = await resolveScope(null, request.scope, { readFile: fileReader(request.target) });
  }

  // 2. The audit: the same engine /sus audit uses. Artifacts go in a subdirectory so the proposal
  //    and its evidence cannot overwrite each other. When the scope resolved to one selected
  //    element, axe also scans inside it, which is what makes an a11y finding attributable to the
  //    selection instead of to the page.
  // A page scope needs no confined scan: the page-wide scan already measured exactly that unit, and
  // running both would report the same violation twice under two labels.
  const scopeSelectors =
    request.mode === 'deep' && scope.outcome === 'resolved' && scope.focus?.kind !== 'page'
      ? scope.targets.map((target) => ({ selector: target.selector, label: target.selector }))
      : [];
  const audit = await runAudit({
    target: request.target,
    liveUrl: request.liveUrl,
    mode: request.mode,
    routes: null,
    outDir: join(request.outDir, 'audit'),
    authorizedHosts: [...(request.authorizedHosts ?? [])],
    fixPlan: false,
    scopeSelectors,
  });

  mkdirSync(request.outDir, { recursive: true });
  if (scope.outcome !== 'resolved' || scope.focus === null) {
    const markdown = [
      '# Best practice proposal — not written',
      '',
      'Scope outcome: `' + scope.outcome + '`',
      scope.clarification === null ? '' : 'Needs confirmation: ' + scope.clarification,
      scope.reason === null ? '' : 'Refused: ' + scope.reason,
      '',
      'Nothing was proposed and nothing was changed. Resolve the scope and run again.',
      '',
    ]
      .filter((line, index, all) => !(line === '' && all[index - 1] === ''))
      .join('\n');
    const markdownPath = join(request.outDir, 'proposal.md');
    writeFileSync(markdownPath, markdown, 'utf8');
    return {
      exitCode: 2,
      audit,
      scope,
      proposal: null,
      markdown,
      proposalPath: null,
      markdownPath,
      message:
        'scope ' + scope.outcome + ': ' + (scope.clarification ?? scope.reason ?? 'no detail'),
    };
  }

  // 3. Selection: the scope's dimensions, optionally narrowed by --focus.
  const selection = selectScopedItems(audit.report, scope, request.focus);
  const {
    dimensions,
    items,
    untested: extraUntested,
    outOfScope,
    unattributed,
    unmapped,
  } = selection;

  if (items.length === 0) {
    const markdown = [
      '# Best practice proposal — nothing to propose',
      '',
      'Scope: `' +
        scope.reference.kind +
        ' ' +
        scope.reference.value +
        '` (' +
        scope.focus.kind +
        ')',
      '',
      'The audit measured ' +
        dimensions.join(', ') +
        ' and found nothing to change inside this scope' +
        (outOfScope === 0 ? '' : '; ' + outOfScope + ' finding(s) in other dimensions') +
        (unattributed === 0
          ? ''
          : '; ' + unattributed + ' finding(s) the audit attributes elsewhere on the page') +
        '.',
      '',
      '## Not measured',
      ...extraUntested.map((entry) => '- **' + entry.dimension + '** — ' + entry.reason),
      '',
    ].join('\n');
    const markdownPath = join(request.outDir, 'proposal.md');
    writeFileSync(markdownPath, markdown, 'utf8');
    return {
      exitCode: 0,
      audit,
      scope,
      proposal: null,
      markdown,
      proposalPath: null,
      markdownPath,
      message: 'nothing to propose in this scope',
    };
  }

  const composed = composeProposal({
    scope,
    items,
    untested: extraUntested,
    ...(request.generatedAt === undefined ? {} : { generatedAt: request.generatedAt }),
    provenance: {
      evaluator: 'sus-eval bestpractice 1',
      node: process.version,
      platform: process.platform + '/' + process.arch,
      commit: null,
    },
  });
  if ('refused' in composed) {
    throw new Error('proposal refused: ' + composed.reason + ' — ' + composed.detail);
  }
  // A refused scope cannot reach here, and an empty item list returned earlier, so a refusal now
  // means the item set itself is contradictory: surface it rather than writing a bad proposal.
  const validated = BestPracticeProposal.safeParse(composed);
  if (!validated.success) {
    throw new Error(
      'proposal failed validation: ' +
        validated.error.issues.map((i) => i.path.join('.') + ': ' + i.message).join('; '),
    );
  }
  const proposal = validated.data;
  const facts = proposal.items.filter((item) => item.kind === 'fact');
  const blocking = proposal.items.filter(
    (item) => item.severity === 'P0' || item.severity === 'P1',
  );
  const exitCode = facts.length === 0 ? 3 : blocking.length > 0 ? 1 : 0;

  const markdown = renderProposalMarkdown(proposal);
  const proposalPath = join(request.outDir, 'proposal.json');
  const markdownPath = join(request.outDir, 'proposal.md');
  writeFileSync(proposalPath, JSON.stringify(proposal, null, 2) + '\n', 'utf8');
  writeFileSync(markdownPath, markdown, 'utf8');
  return {
    exitCode,
    audit,
    scope,
    proposal,
    markdown,
    proposalPath,
    markdownPath,
    message:
      proposal.items.length +
      ' item(s), ' +
      facts.length +
      ' measured, ' +
      blocking.length +
      ' blocking' +
      (outOfScope === 0 ? '' : '; ' + outOfScope + ' finding(s) outside the scope') +
      (unmapped === 0 ? '' : '; ' + unmapped + ' finding(s) with no dimension mapping'),
  };
}

/** Parse a `--focus` value, refusing anything the contract does not know. */
export function parseFocus(value: string | undefined): FocusDimension[] | undefined {
  if (value === undefined) return undefined;
  const known: FocusDimension[] = ['responsive', 'a11y', 'motion', 'copy', 'performance', 'visual'];
  const parts = value
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  const unknown = parts.filter((part) => !known.includes(part as FocusDimension));
  if (unknown.length > 0) {
    throw new Error('--focus does not know ' + unknown.join(', ') + '; use ' + known.join(', '));
  }
  if (parts.length === 0) throw new Error('--focus was given with no dimensions');
  return [...new Set(parts)] as FocusDimension[];
}

/** The focus a scope would use, for tests and for `--help`-adjacent explanations. */
export function defaultFocus(componentKind: Parameters<typeof selectFocus>[0]): FocusDimension[] {
  return [...selectFocus(componentKind).run];
}
