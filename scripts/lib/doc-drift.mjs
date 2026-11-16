/**
 * Live-document drift checks (T1026, issue #17).
 *
 * The repository keeps history on purpose: receipts, owner decisions and old handoffs are *not*
 * rewritten. What it must never keep is an *active* document that asserts a status contradicting
 * `TASKS.json`, the generated host matrix or the recorded build flag — issue #17 found five such
 * contradictions under a green CI.
 *
 * Rules enforced here:
 *  1. no live document may call a done task `pending` (or a pending task `done`);
 *  2. the machine-readable build flag may not contradict `.sus-dev/STATE.md`;
 *  3. a host row may not cite smoke evidence other than the one `docs/compatibility.json` records;
 *  4. documents declared historical must say so, in their first 40 lines;
 *  5. hand-maintained "N of M done" counts must match `TASKS.json`.
 *
 * Historical documents are exempt only by being listed in HISTORICAL_DOCUMENTS *and* carrying the
 * banner: exempting a document that does not say it is historical would launder the same drift.
 */

export const HISTORICAL_DOCUMENTS = [
  'docs/BUILD_COMPLETION_HANDOFF.md',
  'docs/OWNER_DECISIONS_LOG.md',
  'docs/STUDIO_SAFETY_CONTRACT.md',
];

/** Documents whose status claims are user-facing; a stale line here misleads a newcomer. */
export const LIVE_DOCUMENTS = [
  'docs/AUDIT_COMMAND.md',
  'docs/BESTPRACTICE_COMMAND.md',
  'docs/COVERAGE_MATRIX.md',
  'docs/LIMITATIONS.md',
  'docs/SUPPORT_MATRIX.md',
  'docs/EFFECTIVE_REQUIREMENTS.json',
];

const HISTORICAL_MARKER = /historical/i;

/**
 * @param {{ tasks: {id: string, status: string, m?: string}[], files: Record<string,string>, compatibility?: {rows: {host: string, evidenceState: string, evidence: unknown}[]}, expectedBuildCompletePushed?: boolean }} input
 * @returns {{rule: string, path: string, detail: string}[]}
 */
export function checkDocDrift(input) {
  const findings = [];
  const status = new Map(input.tasks.map((task) => [task.id, task.status]));
  const files = input.files ?? {};

  const isHistorical = (path) => {
    if (!HISTORICAL_DOCUMENTS.includes(path)) return false;
    const head = (files[path] ?? '').split('\n').slice(0, 40).join('\n');
    return HISTORICAL_MARKER.test(head);
  };

  // Every document declared historical must actually say so: an exemption without a banner would
  // launder the same drift the live-document rules exist to catch.
  for (const path of HISTORICAL_DOCUMENTS) {
    const text = files[path];
    if (text === undefined) continue;
    if (!isHistorical(path)) {
      findings.push({
        rule: 'historical-document-unmarked',
        path,
        detail: 'listed as historical but carries no "historical" marker near the top',
      });
    }
  }

  for (const path of LIVE_DOCUMENTS) {
    const text = files[path];
    if (text === undefined) continue;
    if (isHistorical(path)) continue;
    text.split('\n').forEach((line, index) => {
      for (const match of line.matchAll(/T(\d{4})[a-z]?/g)) {
        const id = `T${match[1]}`;
        const actual = status.get(id);
        if (actual === undefined) continue;
        const saysPending = /\bpending\b/i.test(line);
        const saysDone = /\b(done|complete|completed|shipped)\b/i.test(line);
        if (saysPending && actual === 'done') {
          findings.push({
            rule: 'stale-task-claim',
            path,
            detail: `line ${index + 1} calls ${id} pending; TASKS.json has it ${actual}`,
          });
        }
        if (saysDone && actual === 'pending') {
          findings.push({
            rule: 'premature-task-claim',
            path,
            detail: `line ${index + 1} calls ${id} done; TASKS.json has it ${actual}`,
          });
        }
      }
    });
  }

  if (input.expectedBuildCompletePushed !== undefined) {
    const requirements = files['docs/EFFECTIVE_REQUIREMENTS.json'];
    if (requirements !== undefined) {
      let parsed;
      try {
        parsed = JSON.parse(requirements);
      } catch {
        findings.push({
          rule: 'effective-requirements-unparseable',
          path: 'docs/EFFECTIVE_REQUIREMENTS.json',
          detail: 'not valid JSON',
        });
      }
      if (parsed !== undefined && parsed.build_complete_pushed !== undefined) {
        if (parsed.build_complete_pushed !== input.expectedBuildCompletePushed) {
          findings.push({
            rule: 'build-flag-contradiction',
            path: 'docs/EFFECTIVE_REQUIREMENTS.json',
            detail:
              'build_complete_pushed=' +
              String(parsed.build_complete_pushed) +
              ' but the recorded build state is ' +
              String(input.expectedBuildCompletePushed),
          });
        }
      }
    }
  }

  const rows = input.compatibility?.rows ?? [];
  const evidenceByHost = new Map(rows.map((row) => [row.host, row]));
  for (const path of LIVE_DOCUMENTS) {
    const text = files[path];
    if (text === undefined || isHistorical(path)) continue;
    text.split('\n').forEach((line, index) => {
      for (const match of line.matchAll(/evals\/host-smoke\/([a-z0-9-]+)-([a-f0-9]{8,})\.json/g)) {
        const host = match[1];
        const row = evidenceByHost.get(host);
        if (row === undefined) continue;
        const recorded =
          row.evidence && typeof row.evidence === 'object' && 'ref' in row.evidence
            ? String(row.evidence.ref)
            : '';
        const cited = `evals/host-smoke/${host}-${match[2]}.json`;
        const state = String(row.evidenceState ?? 'missing');
        const labeled = new RegExp(`\\b${state}\\b`, 'i').test(line);
        if (!recorded.includes(cited) || !labeled) {
          findings.push({
            rule: 'stale-host-evidence',
            path,
            detail:
              'line ' +
              (index + 1) +
              ' cites ' +
              cited +
              ' (' +
              (labeled ? 'labelled ' + state : 'state not named') +
              '); compatibility.json records ' +
              (recorded || 'no evidence') +
              ' as ' +
              state,
          });
        }
      }
    });
  }

  const done = input.tasks.filter((task) => task.status === 'done').length;
  const total = input.tasks.length;
  for (const path of LIVE_DOCUMENTS) {
    const text = files[path];
    if (text === undefined || isHistorical(path)) continue;
    text.split('\n').forEach((line, index) => {
      for (const match of line.matchAll(
        /(\d{1,3})\s+(?:of|\/)\s+(\d{1,3})\s+(?:tasks\s+)?done/gi,
      )) {
        const claimedDone = Number(match[1]);
        const claimedTotal = Number(match[2]);
        if (claimedDone !== done || claimedTotal !== total) {
          findings.push({
            rule: 'stale-count-claim',
            path,
            detail:
              'line ' +
              (index + 1) +
              ' says ' +
              claimedDone +
              ' of ' +
              claimedTotal +
              ' done; TASKS.json has ' +
              done +
              ' of ' +
              total,
          });
        }
      }
    });
  }

  return findings;
}

export function formatDocDrift(findings) {
  if (findings.length === 0) return 'no live-document drift';
  return findings
    .map((finding) => `${finding.path}: ${finding.rule} — ${finding.detail}`)
    .join('\n');
}
