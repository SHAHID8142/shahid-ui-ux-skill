/**
 * T0804 — scanner overlay + dismissals with reasons.
 *
 * The overlay's job: take deterministic scanner output (`@sus/scanners`
 * ScanResult, T0304 contract), present findings IN CONTEXT of the inspected
 * page (source-linked: file + line + snippet), let the operator SUPPRESS a
 * finding only by recording why, and re-scan without losing those decisions.
 *
 * Design constraints that matter:
 *  - Dismissals are keyed by a CONTENT FINGERPRINT (category + file +
 *    normalized snippet + occurrence), NOT by line number: editing an
 *    unrelated line above must not resurrect a dismissed finding, and fixing
 *    the finding must not silently transfer its dismissal to a different
 *    problem. Line numbers are display data only.
 *  - A dismissal without a recorded reason is refused. Suppression is a
 *    decision, and decisions carry justification (it lands in DECISIONS.md).
 *  - Re-scan REPLACES the finding set and PRESERVES dismissals; dismissals
 *    that no longer match anything are reported as stale (never silently
 *    dropped, never silently kept) so the log cannot rot.
 *  - Alert fatigue is the stated risk. The severity filter default is a single
 *    named constant: the documented rollback for this task is flipping
 *    DEFAULT_SEVERITY_FILTER, not rewriting the overlay.
 */

import type { Finding, ScanResult } from '@sus/scanners';

/** Rollback lever (TASKS.json T0804 rollback: "severity filter default"). */
export const DEFAULT_SEVERITY_FILTER: SeverityFilter = 'all';

export type SeverityFilter = 'all' | 'blocking' | 'advisory';
export type Severity = Finding['severity'];

/** A dismissal must say something. Counting characters is crude but honest. */
export const MIN_DISMISSAL_REASON_CHARS = 12;

/** One finding placed in its source context. */
export interface SourceFinding {
  /** Content fingerprint — the dismissal identity (line-independent). */
  key: string;
  category: string;
  severity: Severity;
  file: string;
  line: number;
  /** Truncated source line as reported by the scanner (display only). */
  snippet: string;
  matched: string;
  /** `file:line` — the source link the overlay renders. */
  locator: string;
  dismissed: boolean;
}

/** An operator decision to suppress one finding, with its justification. */
export interface Dismissal {
  key: string;
  category: string;
  severity: Severity;
  file: string;
  line: number;
  snippet: string;
  reason: string;
  author: string;
  at: string;
}

export interface OverlayCounts {
  total: number;
  blocking: number;
  advisory: number;
  dismissed: number;
  /** Visible after filter + dismissals. */
  visible: number;
  /** Hidden by the severity filter (not dismissed — just filtered out). */
  filteredOut: number;
}

export type OverlayResult = { ok: true } | { ok: false; reasons: string[] };

export class FindingsOverlayStore {
  private findings: SourceFinding[] = [];
  private dismissals = new Map<string, Dismissal>();
  private filter: SeverityFilter;
  private readonly author: string;

  constructor(params: { author?: string; severityFilter?: SeverityFilter } = {}) {
    this.author = params.author ?? 'studio-web';
    this.filter = params.severityFilter ?? DEFAULT_SEVERITY_FILTER;
  }

  /**
   * Replaces the finding set from a fresh scan, preserving dismissals by
   * fingerprint. Returns the overlay's post-ingest state description; stale
   * dismissals are reported through `staleDismissals()`.
   */
  ingest(results: readonly ScanResult[]): SourceFinding[] {
    const occurrences = new Map<string, number>();
    const next: SourceFinding[] = [];
    for (const result of results) {
      for (const finding of result.findings) {
        const base = fingerprint(finding, result.file);
        const seen = (occurrences.get(base) ?? 0) + 1;
        occurrences.set(base, seen);
        // Duplicate identical findings in one file are distinguished by
        // occurrence order — documented limitation: if the first occurrence
        // is fixed, the second becomes #1 and inherits its dismissal.
        const key = seen === 1 ? base : `${base}#${seen}`;
        next.push({
          key,
          category: finding.category,
          severity: finding.severity,
          file: result.file,
          line: finding.line,
          snippet: finding.snippet,
          matched: finding.matched,
          locator: `${result.file}:${finding.line}`,
          dismissed: this.dismissals.has(key),
        });
      }
    }
    this.findings = next;
    return this.all();
  }

  /** All findings, dismissed included (each flagged), in scan order. */
  all(): SourceFinding[] {
    return this.findings.map((f) => ({ ...f }));
  }

  /** Findings the operator should see: not dismissed, matching the filter. */
  visible(): SourceFinding[] {
    return this.findings
      .filter((f) => !f.dismissed && this.matchesFilter(f.severity))
      .map((f) => ({ ...f }));
  }

  counts(): OverlayCounts {
    const active = this.findings.filter((f) => !f.dismissed);
    const visible = active.filter((f) => this.matchesFilter(f.severity));
    return {
      total: this.findings.length,
      blocking: this.findings.filter((f) => f.severity === 'blocking').length,
      advisory: this.findings.filter((f) => f.severity === 'advisory').length,
      dismissed: this.findings.filter((f) => f.dismissed).length,
      visible: visible.length,
      filteredOut: active.length - visible.length,
    };
  }

  /**
   * Suppresses one finding. Refused when the finding is unknown, already
   * dismissed, or the reason is missing/trivially short — a suppression
   * without justification is exactly the alert-fatigue failure mode this task
   * exists to prevent.
   */
  dismiss(key: string, reason: string, at?: string): OverlayResult {
    const finding = this.findings.find((f) => f.key === key);
    if (!finding) {
      return { ok: false, reasons: [`dismiss: no finding with key ${key}`] };
    }
    if (this.dismissals.has(key)) {
      return { ok: false, reasons: [`dismiss: finding ${key} is already dismissed`] };
    }
    const trimmed = typeof reason === 'string' ? reason.trim() : '';
    if (trimmed.length < MIN_DISMISSAL_REASON_CHARS) {
      return {
        ok: false,
        reasons: [
          `dismiss: a recorded reason of at least ${MIN_DISMISSAL_REASON_CHARS} characters is required (got ${trimmed.length})`,
        ],
      };
    }
    this.dismissals.set(key, {
      key,
      category: finding.category,
      severity: finding.severity,
      file: finding.file,
      line: finding.line,
      snippet: finding.snippet,
      reason: trimmed,
      author: this.author,
      at: at ?? new Date().toISOString(),
    });
    const index = this.findings.findIndex((f) => f.key === key);
    const updated = this.findings[index];
    if (updated) this.findings[index] = { ...updated, dismissed: true };
    return { ok: true };
  }

  /** Reverses a dismissal (the operator changed their mind). */
  restore(key: string): OverlayResult {
    if (!this.dismissals.delete(key)) {
      return { ok: false, reasons: [`restore: no dismissal recorded for ${key}`] };
    }
    const index = this.findings.findIndex((f) => f.key === key);
    const updated = this.findings[index];
    if (updated) this.findings[index] = { ...updated, dismissed: false };
    return { ok: true };
  }

  setFilter(filter: SeverityFilter): OverlayResult {
    if (filter !== 'all' && filter !== 'blocking' && filter !== 'advisory') {
      return { ok: false, reasons: [`filter: expected 'all' | 'blocking' | 'advisory'`] };
    }
    this.filter = filter;
    return { ok: true };
  }

  severityFilter(): SeverityFilter {
    return this.filter;
  }

  dismissalsList(): Dismissal[] {
    return [...this.dismissals.values()]
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((d) => ({ ...d }));
  }

  /**
   * Dismissals whose finding no longer exists in the latest scan — the
   * finding was fixed, or the file changed. Surfaced, never auto-deleted:
   * an obsolete suppression is a stale decision someone may still want to
   * understand.
   */
  staleDismissals(): Dismissal[] {
    const live = new Set(this.findings.map((f) => f.key));
    return this.dismissalsList().filter((d) => !live.has(d.key));
  }

  /**
   * Markdown table for DECISIONS.md. The overlay does NOT write that file —
   * exporting text and applying it is a separate, approval-gated write
   * (T0706/T0707). Deterministic ordering by key.
   */
  dismissalLogMarkdown(): string {
    const log = this.dismissalsList();
    if (log.length === 0) return '';
    const rows = log.map(
      (d) =>
        `| ${escapeCell(d.category)} | ${escapeCell(`${d.file}:${d.line}`)} | ${escapeCell(d.severity)} | ${escapeCell(d.reason)} | ${escapeCell(d.author)} | ${escapeCell(d.at)} |`,
    );
    const stale = new Set(this.staleDismissals().map((d) => d.key));
    const annotated = rows.map((row, i) => {
      const d = log[i];
      return d && stale.has(d.key) ? row.replace(/ \|$/, ' ⚠ stale |') : row;
    });
    return [
      '### Dismissed scanner findings',
      '',
      '| Category | Source | Severity | Reason | Author | Recorded |',
      '| --- | --- | --- | --- | --- | --- |',
      ...annotated,
      '',
    ].join('\n');
  }

  private matchesFilter(severity: Severity): boolean {
    return this.filter === 'all' || severity === this.filter;
  }
}

/** Whitespace-normalized, lowercased text — the fingerprint's text fold. */
function foldText(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Content fingerprint: category + file + folded snippet + matched token.
 * Deliberately excludes the line number (line shifts must not resurrect a
 * dismissed finding).
 */
function fingerprint(finding: Finding, file: string): string {
  return [finding.category, file, foldText(finding.snippet), foldText(finding.matched)].join('|');
}

/** Escapes a markdown table cell (pipes + newlines would break the table). */
function escapeCell(s: string): string {
  return s.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}
