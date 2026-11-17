/**
 * T1004 — the claim checker (PRD Part 9 + G3's numeric-claim rule).
 *
 * A README is a claim surface. This repository has already shipped the failure
 * mode once: a README that said "no code has been written yet" while 96 of 100
 * tasks were done. Prose that overstates is the same defect with better grammar.
 *
 * Two kinds of finding, with different severities:
 *
 *  - **comparative claims** (`beats`, `superior`, `faster`, `better than`,
 *    `outperforms`) block the build unless the benchmark claim gate is open;
 *  - **absolute claims** (`guarantees`, `100% accessible`, `proven`) block
 *    always, because no amount of benchmark data makes them true.
 *
 * Fenced code blocks and inline code are exempt: a protocol document has to be
 * able to quote the words it forbids.
 */
const COMPARATIVE = [
  /\bbeats?\b/i,
  /\bsuperior\b/i,
  /\bfaster than\b/i,
  /\bbetter than\b/i,
  /\boutperforms?\b/i,
  /\bmore effective than\b/i,
];

const ABSOLUTE = [
  /\bguarantees?\b/i,
  /\b100\s*%\s*accessible\b/i,
  /\bproven to\b/i,
  /\bnever fails?\b/i,
  /\balways accessible\b/i,
];

/** Removes fenced blocks and inline code so policy documents can quote themselves. */
export function stripCode(text) {
  return String(text ?? '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`\n]*`/g, ' ');
}

/**
 * A negated claim is not a claim: "does not guarantee ranking" is exactly the
 * honesty the checker exists to protect, and blocking it would push authors to
 * delete the limitation instead of the overstatement.
 */
export function isNegated(line, index) {
  const before = line.slice(Math.max(0, index - 32), index).toLowerCase();
  return /(\bnot\b|\bnever\b|\bcannot\b|\bcan't\b|n't\b|\bno\b)\s*$/.test(before);
}

/**
 * @param {string} text
 * @param {{gateOpen: boolean, allowAbsolute?: boolean}} options
 * @returns {{blocking: {kind: string, match: string, line: number, text: string}[], warning: []}}
 */
export function findClaims(text, { gateOpen }) {
  const stripped = stripCode(text);
  const blocking = [];
  const lines = stripped.split('\n');
  lines.forEach((line, index) => {
    for (const pattern of ABSOLUTE) {
      const match = pattern.exec(line);
      if (match && !isNegated(line, match.index)) {
        blocking.push({ kind: 'absolute', match: match[0], line: index + 1, text: line.trim() });
      }
    }
    if (!gateOpen) {
      for (const pattern of COMPARATIVE) {
        const match = pattern.exec(line);
        if (match && !isNegated(line, match.index)) {
          blocking.push({
            kind: 'comparative',
            match: match[0],
            line: index + 1,
            text: line.trim(),
          });
        }
      }
    }
  });
  // A line may match several patterns; report each once.
  const seen = new Set();
  return blocking.filter((finding) => {
    const key = `${finding.line}:${finding.match.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * The gate is open only when the benchmark status says so — the checker reads
 * the same artefact the benchmark writes, so there is no second source of truth.
 */
export function gateOpenFromStatus(status) {
  const arms = status?.gate?.allowed;
  return arms === true;
}

/** Files whose job is to discuss claims rather than make them. */
export const EXEMPT_FILES = new Set([
  'evals/benchmarks/PROTOCOL.md',
  'docs/PRD_AMENDMENTS_v1.1.md',
  'docs/PRD_GAP_ANALYSIS.md',
  'docs/DEEP_AUDIT_2026-11-13.md',
  'docs/REVIEW_RECONCILIATION.md',
  'docs/AUDIT_AND_OPEN_DECISIONS.md',
  'docs/THREAT_MODEL.md',
]);
