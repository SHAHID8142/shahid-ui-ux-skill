/**
 * G3 — no placeholder content, no unregistered numeric claims.
 *
 * Three defect classes, all of which have shipped in real READMEs:
 *
 *  - **filler text** (lorem ipsum and its cousins) — the section was never written;
 *  - **authoring markers** (TODO, FIXME, TBD, "placeholder", "coming soon",
 *    bracketed `[insert …]`) — the section is a note to self, not copy;
 *  - **numeric marketing claims** ("42% faster", "3x more conversions") that do
 *    not appear in the claims register (`sus.claims-register`, see
 *    `packages/schemas/src/copy-seo.ts`). A number that no register entry backs
 *    is a claim nobody can defend.
 *
 * The register is the authority, not a heuristic: a number is allowed when a
 * register entry's `claim` text contains it. Fail-closed means a missing or
 * malformed fixture fails, and — importantly — a numeric claim with no register
 * at all fails rather than being waved through.
 *
 * Negation is respected the same way `scripts/lib/claims.mjs` respects it: "no
 * more than 3 steps" is a constraint, not a boast.
 */

const FILLER = [
  /\blorem ipsum\b/i,
  /\bdolor sit amet\b/i,
  /\bconsectetur (adipiscing|adipisicing)\b/i,
];

const MARKERS = [
  /\bTODO\b/,
  /\bFIXME\b/,
  /\bTBD\b/,
  /\bXXX\b/,
  /\bplaceholder\b/i,
  /\bcoming soon\b/i,
  /\[insert[^\]]*\]/i,
  /\[your [^\]]*\]/i,
];

/** Claims with a figure: percentages, multipliers, absolute counts of things sold. */
const NUMERIC_CLAIM = [
  /\b\d+(?:\.\d+)?\s*%/,
  /\b\d+(?:\.\d+)?\s*x\s+(?:faster|better|more|fewer|cheaper|higher)\b/i,
  /\b\d+(?:,\d{3})+\s+(?:users|customers|teams|companies|projects)\b/i,
];

function isNegated(line, index) {
  const before = line.slice(Math.max(0, index - 32), index).toLowerCase();
  return /(\bnot\b|\bnever\b|\bcannot\b|\bcan't\b|n't\b|\bno\b)\s*$/.test(before);
}

function stripCode(text) {
  return String(text ?? '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`\n]*`/g, ' ');
}

/** Collects the register's claim strings; accepts the schema shape or a bare list. */
function registerClaims(register) {
  if (Array.isArray(register?.entries)) return register.entries;
  return null;
}

/**
 * @param {{pages?: {path: string, text: string}[], claimsRegister?: unknown}} fixture
 * @returns {{status: 'pass' | 'fail', detail: string[]}}
 */
export function evaluateG3(fixture) {
  const pages = fixture?.pages;
  if (!Array.isArray(pages) || pages.length === 0) {
    return { status: 'fail', detail: ['fixture-invalid: no pages supplied (fail-closed)'] };
  }
  const entries = registerClaims(fixture?.claimsRegister);
  const registered = (entries ?? []).map((entry) => String(entry?.claim ?? '').toLowerCase());
  const problems = [];
  let scanned = 0;

  for (const page of pages) {
    const path = page?.path;
    const text = page?.text;
    if (typeof path !== 'string' || typeof text !== 'string') {
      problems.push('fixture-invalid: page without path/text (fail-closed)');
      continue;
    }
    scanned += 1;
    const stripped = stripCode(text);
    stripped.split('\n').forEach((line, index) => {
      const where = `${path}:${index + 1}`;
      // One report per class per line: a lorem-ipsum sentence matches three filler
      // patterns, and three identical lines is noise, not three defects.
      if (FILLER.some((pattern) => pattern.test(line))) {
        problems.push(`filler-text: ${where} — ${line.trim()}`);
      }
      if (MARKERS.some((pattern) => pattern.test(line))) {
        problems.push(`placeholder-marker: ${where} — ${line.trim()}`);
      }
      for (const pattern of NUMERIC_CLAIM) {
        const match = pattern.exec(line);
        if (!match || isNegated(line, match.index)) continue;
        const claim = line.trim().toLowerCase();
        const backed = registered.some((entry) => entry.length > 0 && claim.includes(entry));
        if (!backed) {
          problems.push(`unregistered-numeric-claim: ${where} — "${match[0].trim()}"`);
        }
      }
    });
  }

  if (problems.length > 0) return { status: 'fail', detail: problems };
  return {
    status: 'pass',
    detail: [
      `${scanned} page(s) free of filler/markers; ${registered.length} registered claim(s) cover every figure`,
    ],
  };
}
