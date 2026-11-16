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
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  SCOPE_LIMITS,
  resolveScope,
  selectFocus,
  type FocusDimension,
  type ScopeReference,
  type ScopeResolution,
} from '../audit/scope.js';
import { runAudit, type AuditRun } from '../audit/pipeline.js';
import { itemsFromReport, untestedFromReport } from './from-audit.js';
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
  --scope <value>     what is in scope: a CSS selector (--url or built HTML) or a file path
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
  const url =
    request.liveUrl ??
    (targetIsDirectory && existsSync(join(request.target, 'index.html'))
      ? pathToFileURL(join(request.target, 'index.html')).href
      : null);
  if (url === null) return null;
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(url, { waitUntil: 'networkidle' });
  return { page, close: () => browser.close() };
}

export async function runBestPractice(request: BestPracticeRequest): Promise<BestPracticeRun> {
  if (request.scope.kind === 'selector') {
    if (request.scope.value.length > SCOPE_LIMITS.maxSelectorLength) {
      throw new Error('--scope is longer than ' + SCOPE_LIMITS.maxSelectorLength + ' characters');
    }
  }
  if (request.outDir.trim().length === 0)
    throw new Error('--out is required: reports never go into the target');

  // 1. The audit: the same engine /sus audit uses. Artifacts go in a subdirectory so the
  //    proposal and its evidence cannot overwrite each other.
  const audit = await runAudit({
    target: request.target,
    liveUrl: request.liveUrl,
    mode: request.mode,
    routes: null,
    outDir: join(request.outDir, 'audit'),
    authorizedHosts: [...(request.authorizedHosts ?? [])],
    fixPlan: false,
  });

  // 2. The scope: resolved or refused, never guessed.
  const targetIsDirectory = !request.target.includes('.') || existsSync(request.target);
  let scope: ScopeResolution;
  if (request.scope.kind === 'selector') {
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
  const requested = request.focus ?? scope.focus.run;
  const dimensions = scope.focus.run.filter((dimension) => requested.includes(dimension));
  const notApplicable = scope.focus.notApplicable.filter((entry) =>
    requested.includes(entry.dimension),
  );
  const targets = scope.targets.map((target) => target.selector);
  const { items, outOfScope, unattributed, unmapped } = itemsFromReport(audit.report, {
    dimensions,
    targets,
  });
  const extraUntested = [
    ...untestedFromReport(audit.report, { dimensions }),
    ...notApplicable.map((entry) => ({ dimension: entry.dimension, reason: entry.reason })),
  ];

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
