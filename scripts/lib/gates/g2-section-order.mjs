/**
 * G2 — section order: section N+1 may not be accepted while N is not.
 *
 * The rule already exists as TypeScript in `packages/schemas/src/progressive.ts`
 * (`sectionLockViolation`). This module mirrors that function in plain
 * JavaScript because `scripts/check-gates.mjs` must stay importable without a
 * build step. The mirror is deliberate, not accidental: it is the same map-based
 * walk over `order`, so a fixture that the schema would reject is the fixture
 * this gate rejects. `packages/schemas/tests` owns the TypeScript copy; the good
 * and bad fixtures here are what keep the two from drifting apart silently.
 *
 * Fail-closed: a fixture without a parseable section list, an unknown status, or
 * a duplicate id is a failure. "I could not read the status file" and "the
 * section order is legal" are different statements and only the second is a pass.
 */

/** Mirrors SECTION_STATUSES in packages/schemas/src/progressive.ts. */
export const SECTION_STATUSES = [
  'draft',
  'proposed',
  'approved',
  'applied',
  'verified',
  'accepted',
  'rejected',
  'blocked',
];

const STATUS = new Set(SECTION_STATUSES);

/**
 * Returns the id of the first section accepted before its predecessor, or null.
 * Direct mirror of `sectionLockViolation` in packages/schemas/src/progressive.ts:
 * a missing status means `draft`, and `draft` never satisfies the lock.
 *
 * @param {{id: string, status: string}[]} states
 * @param {string[]} order
 * @returns {string | null}
 */
export function sectionLockViolation(states, order) {
  const byId = new Map(states.map((state) => [state.id, state.status]));
  for (let index = 0; index < order.length - 1; index += 1) {
    const current = order[index];
    const next = order[index + 1];
    const nextStatus = byId.get(next) ?? 'draft';
    const currentStatus = byId.get(current) ?? 'draft';
    if (nextStatus !== 'draft' && currentStatus !== 'accepted') return next;
  }
  return null;
}

/**
 * @param {{order?: unknown, sections?: unknown}} fixture — parsed `.sus/SECTION_STATUS.md` data
 * @returns {{status: 'pass' | 'fail', detail: string[]}}
 */
export function evaluateG2(fixture) {
  const order = fixture?.order;
  const sections = fixture?.sections;
  if (!Array.isArray(order) || order.length === 0) {
    return { status: 'fail', detail: ['fixture-invalid: no section order recorded (fail-closed)'] };
  }
  if (!Array.isArray(sections) || sections.length === 0) {
    return {
      status: 'fail',
      detail: ['fixture-invalid: no section states recorded (fail-closed)'],
    };
  }
  if (new Set(order).size !== order.length) {
    return {
      status: 'fail',
      detail: ['fixture-invalid: duplicate section id in order (fail-closed)'],
    };
  }
  const problems = [];
  const seen = new Map();
  for (const section of sections) {
    const id = section?.id;
    const status = section?.status;
    if (typeof id !== 'string' || id.length === 0) {
      problems.push('fixture-invalid: section without an id (fail-closed)');
      continue;
    }
    if (seen.has(id)) problems.push(`fixture-invalid: duplicate section state for "${id}"`);
    seen.set(id, status);
    if (!STATUS.has(status)) {
      problems.push(`fixture-invalid: unknown status "${String(status)}" for "${id}"`);
    }
  }
  // A truncated status file would otherwise read as "every section is still draft",
  // which is indistinguishable from a legal early project — fail closed instead.
  for (const id of order) {
    if (!seen.has(id)) {
      problems.push(`fixture-invalid: no recorded state for "${id}" (fail-closed)`);
    }
  }
  if (problems.length > 0) return { status: 'fail', detail: problems };

  const violation = sectionLockViolation(sections, order);
  if (violation === null) {
    return {
      status: 'pass',
      detail: [`${order.length} section(s) in order; no section accepted before its predecessor`],
    };
  }
  const statusOf = new Map(sections.map((section) => [section.id, section.status]));
  const position = order.indexOf(violation);
  const predecessor = position > 0 ? order[position - 1] : null;
  return {
    status: 'fail',
    detail: [
      `section-order-violation: "${violation}" is ${statusOf.get(violation)} while ` +
        `"${predecessor}" is ${predecessor === null ? 'absent' : statusOf.get(predecessor)}`,
    ],
  };
}
