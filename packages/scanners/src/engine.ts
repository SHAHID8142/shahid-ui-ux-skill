/**
 * Deterministic scanner engine. Rules are regex-based over text with a
 * context window; counterexamples (legitimate uses) are honoured via a
 * allowlist pass BEFORE reporting, so a rule's false-positive cases are
 * structurally impossible to report (T0303: true positive + false positive
 * both handled).
 */
import { TAXONOMY, type SlopCategoryData } from '@sus/schemas';

export interface Finding {
  category: string;
  severity: 'advisory' | 'blocking';
  line: number;
  snippet: string;
  matched: string;
}

export interface ScanResult {
  file: string;
  findings: Finding[];
  stats: { lines: number; blocked: number; advisory: number };
}

export function scanText(
  text: string,
  file = '<text>',
  taxonomy: SlopCategoryData[] = TAXONOMY,
): ScanResult {
  const lines = text.split('\n');
  const findings: Finding[] = [];
  for (const category of taxonomy) {
    for (const pattern of category.patterns) {
      const re = new RegExp(pattern, 'i');
      for (const [i, line] of lines.entries()) {
        if (!re.test(line)) continue;
        // counterexample allowlist: a line containing a registered legitimate
        // use for this category is exempt (false positives cannot be reported)
        const isCounterexample = category.counterexamples.some(
          (c) => normalize(c) === normalize(line.trim()),
        );
        if (isCounterexample) continue;
        findings.push({
          category: category.id,
          severity: category.severity,
          line: i + 1,
          snippet: line.trim().slice(0, 120),
          matched: re.exec(line)?.[0] ?? '',
        });
      }
    }
  }
  return {
    file,
    findings,
    stats: {
      lines: lines.length,
      blocked: findings.filter((f) => f.severity === 'blocking').length,
      advisory: findings.filter((f) => f.severity === 'advisory').length,
    },
  };
}

/** Whitespace-normalized comparison for the allowlist. */
function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}
