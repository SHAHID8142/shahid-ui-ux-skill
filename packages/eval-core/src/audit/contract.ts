/**
 * /sus audit invocation contract (T1012, issue #13).
 *
 * Single source of truth for what the audit command accepts, runs, writes and
 * refuses to do. Pure data plus small parsers: no I/O, so the CLI, the tests and
 * docs/AUDIT_COMMAND.md all read the same contract instead of restating it.
 *
 * Rules encoded here (issue #13):
 *  - read-only by default: the audit never edits the target, never installs
 *    dependencies, never applies a fix;
 *  - a check that could not run is not-run, never pass;
 *  - human judgment is never recorded as a machine pass.
 */

/** CLI invocation name. The adapters CLI verb is a separate ticket (T1015). */
export const AUDIT_COMMAND = 'sus-eval audit';

export type AuditTargetKind = 'local-path' | 'authorized-url';

/** How a target is named on the command line. */
export const AUDIT_TARGET_KINDS: readonly AuditTargetKind[] = ['local-path', 'authorized-url'];

export type AuditMode = 'quick' | 'deep';

/** quick = static evidence only; deep adds the browser phases. */
export const AUDIT_MODES: readonly AuditMode[] = ['quick', 'deep'];

export type AuditCheckStatus = 'pass' | 'fail' | 'not-run';

/** Same vocabulary as the gate registry: a missing measurement is never a pass. */
export const AUDIT_CHECK_STATUSES: readonly AuditCheckStatus[] = ['pass', 'fail', 'not-run'];

export type AuditSeverity = 'P0' | 'P1' | 'P2' | 'P3';

export const AUDIT_SEVERITIES: readonly AuditSeverity[] = ['P0', 'P1', 'P2', 'P3'];

/**
 * What a performance number in a SUS report is, said next to the number (issue #21 R11).
 *
 * Lighthouse ran in this browser on this machine: that is a lab measurement, not field data about
 * real users. T1005 is unpublished and no human benchmark has been run, so no comparative claim is
 * permitted either. A reader who sees a duration must not have to reach a limitations page to learn
 * what it is.
 */
export const LAB_MEASUREMENT_NOTICE =
  'lab measurement: Lighthouse in this browser, no field data, no comparative claim';

/** What each severity means, so a report consumer never has to guess the scale. */
export const AUDIT_SEVERITY_MEANING: Readonly<Record<AuditSeverity, string>> = {
  P0: 'blocks every use: an accessibility barrier or layout overflow at a documented width',
  P1: 'blocks release: a measured gate miss or a structural SEO/structure failure',
  P2: 'should fix before release: quality debt that a reviewer would flag',
  P3: 'polish: advisory findings that block nothing',
};

export type AuditEffort = 'quick-win' | 'structural';

/** One documented viewport. The set is a contract, not a preference. */
export interface AuditViewport {
  readonly name: string;
  readonly width: number;
  readonly height: number;
  /** Which existing runner produces measurements at this width. */
  readonly measuredBy: string;
}

/**
 * Documented viewport set: the union of what the gates and issue #13 require.
 * 320 is non-negotiable (G7 reflow); 390/1440 are the capture anchors and 768
 * keeps the capture tablet column. Neither runner covers the whole set alone, so
 * the audit documents the union and reports uncovered cells as not-run.
 */
export const AUDIT_VIEWPORTS: readonly AuditViewport[] = [
  {
    name: 'mobile-320',
    width: 320,
    height: 568,
    measuredBy: 'runHardeningMatrix (reflow); no full-page screenshot at this width',
  },
  {
    name: 'mobile-390',
    width: 390,
    height: 844,
    measuredBy: 'captureMatrix (device scale factor 3) plus runHardeningMatrix',
  },
  {
    name: 'tablet-768',
    width: 768,
    height: 1024,
    measuredBy: 'captureMatrix (device scale factor 2)',
  },
  {
    name: 'desktop-1440',
    width: 1440,
    height: 900,
    measuredBy: 'captureMatrix (device scale factor 1) plus runHardeningMatrix',
  },
];

export const AUDIT_THEMES: readonly ('light' | 'dark')[] = ['light', 'dark'];
export const AUDIT_REDUCED_MOTION: readonly ('reduce' | 'no-preference')[] = [
  'reduce',
  'no-preference',
];

/** A check the audit can report, with the gate it speaks to. */
export interface AuditCheckDescriptor {
  readonly id: string;
  readonly title: string;
  /** Gate the check feeds, or null when it is audit-only evidence. */
  readonly gate: string | null;
  /** Modes in which the check is expected to produce a measurement. */
  readonly modes: readonly AuditMode[];
  readonly effort: AuditEffort;
  /** A not-run result for a required check makes the report incomplete. */
  readonly required: boolean;
}

export const AUDIT_CHECKS: readonly AuditCheckDescriptor[] = [
  {
    id: 'capture-matrix',
    title: 'Capture matrix: overflow, tap targets, CLS and LCP per viewport and theme',
    gate: 'G8',
    modes: ['deep'],
    effort: 'structural',
    required: true,
  },
  {
    id: 'reflow-matrix',
    title: 'Reflow matrix: horizontal overflow at 320/390/1440 in both themes',
    gate: 'G7',
    modes: ['deep'],
    effort: 'structural',
    required: true,
  },
  {
    id: 'keyboard-flow',
    title: 'Keyboard traversal: Tab order, focus indicator, detours and cycles',
    gate: 'G9',
    modes: ['deep'],
    effort: 'structural',
    required: true,
  },
  {
    id: 'axe-a11y',
    title: 'axe accessibility scan: serious or critical violations fail the gate',
    gate: 'G4',
    modes: ['deep'],
    effort: 'structural',
    required: true,
  },
  {
    id: 'lighthouse-budgets',
    title: 'Lighthouse budgets (LCP, CLS, TBT, bytes): fails closed on missing metrics',
    gate: 'G5',
    modes: ['deep'],
    effort: 'structural',
    required: true,
  },
  {
    id: 'seo-structure',
    title: 'SEO/structure checks on served or built HTML: title, meta, headings, alt, main',
    gate: 'G3',
    modes: ['quick', 'deep'],
    effort: 'quick-win',
    required: true,
  },
  {
    id: 'anti-slop',
    title: 'Anti-slop source scan: blocking findings are quality debt, not a gate',
    gate: null,
    modes: ['quick', 'deep'],
    effort: 'quick-win',
    required: false,
  },
  {
    id: 'transition-oracle',
    title: 'State-transition oracle cases: one disclosure is driven per route (T1036)',
    gate: 'G6',
    modes: ['deep'],
    effort: 'structural',
    required: false,
  },
  {
    id: 'evidence-bundle',
    title: 'Evidence bundle completeness (G11) over the produced evidence',
    gate: 'G11',
    modes: ['deep'],
    effort: 'structural',
    required: false,
  },
];

/** Files the audit writes inside the --out directory. */
export const AUDIT_OUTPUT_FILES = {
  report: 'audit.json',
  markdown: 'audit.md',
  shotsDir: 'shots',
  evidenceDir: 'evidence',
  fixPlan: 'fix-plan.json',
} as const;

/**
 * The explicit will-not-do list (T1012 acceptance a). Every line is a real
 * boundary and docs/AUDIT_COMMAND.md repeats it verbatim.
 */
export const AUDIT_WILL_NOT: readonly string[] = [
  'will not edit the target, its dependencies or its lockfile: the audit is read-only',
  'will not apply a fix: a proposal is written to a plan file that needs explicit approval',
  'will not score human judgment as a machine pass: manual items stay needs-review',
  'will not invent an interaction: motion is measured by driving an element that declares aria-expanded (pointer, keyboard, and again under prefers-reduced-motion), so a page with no such element reports not-run rather than a made-up scenario, and hover-only transitions, carousels or drag gestures are not driven at all',
  'will not invent translations, screen-reader sessions or a user-agent zoom setting: 400% zoom is measured only as the CSS px viewport it produces (320x256 at device scale factor 4)',
  'will not treat a missing measurement as a pass: an unrun check is reported as not-run',
  'will not audit a host that was not authorized: loopback is allowed, anything else needs --authorize',
  'will not press Escape, arrow keys or a screen reader: the keyboard check records Tab order, focus indicators, detours and cycles, not Escape dismissal, composite-widget semantics or announcements',
  'will not publish, release or claim release-readiness',
];

/** Exit codes are part of the contract: 3 means produced but incomplete. */
export const AUDIT_EXIT_CODES: Readonly<Record<number, string>> = {
  0: 'report produced, no P0/P1 findings and no required check is not-run',
  1: 'report produced with at least one P0/P1 finding or a failed check',
  2: 'usage, target or authorization error (no report written)',
  3: 'report produced, but at least one required check is not-run: never reads as pass',
};

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

function isLoopback(hostname: string): boolean {
  return LOOPBACK_HOSTS.has(hostname) || hostname.endsWith('.localhost');
}

/**
 * Authorized-URL gate. Loopback targets are allowed by default, any other host
 * must be named with --authorize <host> or granted as a suffix with .example.com.
 */
/**
 * The authorization predicate on its own, so redirect hops and browser navigations can be checked
 * with the same rule the initial target was checked with (issue #18).
 */
export function isAuthorizedHost(
  hostname: string,
  authorizedHosts: readonly string[] = [],
): boolean {
  const host = hostname.toLowerCase();
  return (
    isLoopback(host) ||
    authorizedHosts.some((rawHost) => {
      const allowed = rawHost.trim().toLowerCase();
      if (allowed.length === 0) return false;
      if (allowed.startsWith('.')) return host === allowed.slice(1) || host.endsWith(allowed);
      return host === allowed;
    })
  );
}

export function isAuthorizedUrl(url: URL, authorizedHosts: readonly string[] = []): boolean {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
  if (url.username || url.password) return false;
  return isAuthorizedHost(url.hostname, authorizedHosts);
}

export function assertAuthorizedUrl(raw: string, authorizedHosts: readonly string[] = []): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('"' + raw + '" is not an absolute URL');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('"' + raw + '" must be http(s), got "' + url.protocol + '"');
  }
  if (url.username || url.password) {
    throw new Error('credentials in the target URL are not allowed');
  }
  const hostname = url.hostname.toLowerCase();
  if (!isAuthorizedHost(hostname, authorizedHosts)) {
    throw new Error(
      'host "' +
        hostname +
        '" is not authorized: pass --authorize ' +
        hostname +
        ' to accept it explicitly',
    );
  }
  return url;
}

/** Comma-separated route list to normalized absolute paths, deduped, order kept. */
export function parseRoutes(raw: string | null | undefined): string[] {
  if (raw === undefined || raw === null || raw.trim().length === 0) return ['/'];
  const seen = new Set<string>();
  const routes: string[] = [];
  for (const part of raw.split(',')) {
    const trimmed = part.trim();
    if (trimmed.length === 0) continue;
    const route = trimmed.startsWith('/') ? trimmed : '/' + trimmed;
    if (seen.has(route)) continue;
    seen.add(route);
    routes.push(route);
  }
  return routes.length > 0 ? routes : ['/'];
}

/** Viewport names in documented order, used by the report and the tests. */
export function viewportNames(): string[] {
  return AUDIT_VIEWPORTS.map((v) => v.name);
}

export const AUDIT_HELP = [
  AUDIT_COMMAND + ': read-only, evidence-backed design audit (issue #13)',
  '',
  'Usage:',
  '  sus-eval audit --path <dir> [--url <live-origin>] --out <dir> [--mode quick|deep] [--route /,/pricing]',
  '  sus-eval audit --url <url> [--authorize <host>] --out <dir> [--mode quick|deep]',
  '  sus-eval audit --help',
  '',
  'Targets (exactly one):',
  '  --path <dir>     local project directory; source and built HTML are read, never written',
  '  --url <url>      authorized http(s) target; loopback hosts are allowed by default,',
  '                   every other host must be named with --authorize <host>',
  '',
  'Options:',
  '  --mode quick     default: SEO/structure on served or built HTML plus the anti-slop scan',
  '  --mode deep      adds capture matrix, reflow matrix, axe and Lighthouse (needs Chromium)',
  '  --route <list>   comma-separated routes, default every route found in a local build',
  '  --out <dir>      output directory for audit.json, audit.md, shots/ and evidence/',
  '  --fix-plan       write fix-plan.json: a proposal that needs approval and is never applied',
  '  --json           print the JSON report instead of the markdown summary',
  '  --help           print this contract',
  '',
  'Viewports (fixed): ' +
    AUDIT_VIEWPORTS.map((v) => v.name + ' ' + v.width + 'x' + v.height).join(', '),
  'Themes: ' +
    AUDIT_THEMES.join('/') +
    '; reduced motion: ' +
    AUDIT_REDUCED_MOTION.join('/') +
    ' (capture runs reduce only)',
  '',
  'Exit codes:',
  ...Object.entries(AUDIT_EXIT_CODES).map(([code, meaning]) => '  ' + code + '  ' + meaning),
  '',
  'Will not do:',
  ...AUDIT_WILL_NOT.map((line) => '  - ' + line),
].join('\n');

/** Markdown contract, rendered from the same constants the CLI enforces. */
export function renderContractMarkdown(): string {
  const rows = AUDIT_CHECKS.map(
    (c) =>
      '| `' +
      c.id +
      '` | ' +
      (c.gate === null ? '-' : c.gate) +
      ' | ' +
      c.modes.join(', ') +
      ' | ' +
      c.effort +
      ' | ' +
      (c.required ? 'required' : 'optional') +
      ' |',
  );
  const viewportRows = AUDIT_VIEWPORTS.map(
    (v) => '| `' + v.name + '` | ' + v.width + '×' + v.height + ' | ' + v.measuredBy + ' |',
  );
  const exitLine = Object.entries(AUDIT_EXIT_CODES)
    .map(([code, meaning]) => code + ' = ' + meaning)
    .join('; ');
  return [
    '# /sus audit: invocation contract',
    '',
    'The audit is read-only and evidence-backed: every check reports pass, fail or',
    'not-run, and a missing measurement is never rendered as a pass (D28, issue #13).',
    '',
    '## Invocation',
    '',
    '```bash',
    'sus-eval audit --path ./fixtures/marketing --out .sus-audit/marketing --mode quick',
    'sus-eval audit --path ./fixtures/marketing --url http://127.0.0.1:3000 --out .sus-audit/marketing --mode deep',
    'sus-eval audit --url https://example.com --authorize example.com --out .sus-audit/example --mode deep',
    '```',
    '',
    '## Targets',
    '',
    '| kind | flag | behavior |',
    '| --- | --- | --- |',
    '| `local-path` | `--path <dir>` | reads source and built HTML; live phases need an accompanying `--url` |',
    '| `authorized-url` | `--url <url>` | loopback allowed by default, any other host requires `--authorize <host>` |',
    '',
    '## Modes',
    '',
    '- `quick` (default): SEO/structure on served or built HTML plus the anti-slop source scan.',
    '  No browser is required, so quick works on a machine without Chromium; browser phases',
    '  are reported as `not-run`.',
    '- `deep`: adds the capture matrix, the reflow matrix, axe and Lighthouse. Requires',
    '  Chromium/Playwright; if the browser cannot launch those checks are `not-run`.',
    '',
    '## Viewports (fixed contract)',
    '',
    '| name | size (CSS px) | measured by |',
    '| --- | --- | --- |',
    ...viewportRows,
    '',
    '320 is required by G7 reflow; 390/768/1440 keep the existing capture columns. The set is',
    'the union of both runners, so each width is measured by at least one of them and uncovered',
    'cells are reported as `not-run` rather than omitted.',
    '',
    'Themes: light and dark. Reduced motion: reduce and no-preference (capture runs reduce only).',
    '',
    '## Checks',
    '',
    '| id | gate | modes | effort | requirement |',
    '| --- | --- | --- | --- | --- |',
    ...rows,
    '',
    '## Output',
    '',
    '```text',
    '<out>/audit.json        the machine report (validated before it is written)',
    '<out>/audit.md          the same report as summary tables',
    '<out>/shots/            capture screenshots (deep mode)',
    '<out>/evidence/         axe scans and budget table (deep mode)',
    '```',
    '',
    'Exit codes: ' + exitLine,
    '',
    'Exit code 3 exists on purpose: a report missing a required measurement is not a pass and',
    'must not be treated as one by CI.',
    '',
    '## What the audit will not do',
    '',
    ...AUDIT_WILL_NOT.map((line) => '- ' + line),
    '',
    'Manual-judgment items (screen readers, real translations, the user-agent zoom setting and',
    'text-only zoom, blind A/B ratings) are listed as needs-review and never auto-pass. The 400%',
    'zoom equivalence — the CSS px viewport a 400% zoom produces — is measured by the reflow',
    'matrix and is a separate check from the 320 px column.',
    '',
    '## Provenance',
    '',
    'The report is a runtime artifact of `@sus/eval-core`, validated inside that package. It is',
    'not a versioned SUS record type, so it adds no JSON-Schema export; the evidence bundle it',
    'embeds uses the registered `sus.evidence-bundle` v1 contract.',
    '',
  ].join('\n');
}
