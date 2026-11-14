/**
 * Line diff engine for proposal previews (T0706).
 *
 * Why hand-rolled: the preview must render unified AND split views of the
 * proposed source change, and the bridge's dependency surface is deliberately
 * tiny (the security review flagged every added package as new supply-chain
 * exposure). A longest-common-subsequence diff over lines is ~60 lines of
 * deterministic code with no I/O, so it is cheaper to own than to import.
 *
 * Deliberate limits, stated rather than hidden:
 *  - Line granularity only (no intra-line word diff). Source edits proposed by
 *    the Studio are whole-block insertions/replacements; word diff would add
 *    rendering complexity without changing a single decision.
 *  - O(n*m) memory. Proposals touch one section of one file; a hostile
 *    multi-megabyte input would be rejected upstream by the bridge payload cap.
 */

export type LineOp = { kind: 'context' | 'del' | 'add'; text: string };

/** Splits into lines WITHOUT a trailing empty element for a final newline. */
export function toLines(text: string): string[] {
  if (text === '') return [];
  const lines = text.split('\n');
  if (lines[lines.length - 1] === '') lines.pop();
  return lines;
}

/**
 * LCS-based line diff. Returns context/del/add ops in reading order.
 * Additions are emitted after the deletions they replace, so a modified block
 * reads as "old lines out, new lines in" rather than interleaved.
 */
export function diffLines(before: string, after: string): LineOp[] {
  const a = toLines(before);
  const b = toLines(after);

  // common prefix/suffix trimming keeps the DP table small for the usual case
  // (a proposal changes one section of an otherwise identical file)
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start += 1;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA -= 1;
    endB -= 1;
  }

  const midA = a.slice(start, endA);
  const midB = b.slice(start, endB);
  const n = midA.length;
  const m = midB.length;

  // lcs[i][j] = LCS length of midA[i..] and midB[j..]
  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      lcs[i]![j] =
        midA[i] === midB[j] ? lcs[i + 1]![j + 1]! + 1 : Math.max(lcs[i + 1]![j]!, lcs[i]![j + 1]!);
    }
  }

  const ops: LineOp[] = a.slice(0, start).map((text) => ({ kind: 'context', text }));
  const pendingDel: LineOp[] = [];
  const flush = (): void => {
    ops.push(...pendingDel);
    pendingDel.length = 0;
  };
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && midA[i] === midB[j]) {
      flush();
      ops.push({ kind: 'context', text: midA[i]! });
      i += 1;
      j += 1;
    } else if (j < m && (i >= n || lcs[i]![j + 1]! >= lcs[i + 1]![j]!)) {
      flush();
      ops.push({ kind: 'add', text: midB[j]! });
      j += 1;
    } else {
      pendingDel.push({ kind: 'del', text: midA[i]! });
      i += 1;
    }
  }
  flush();
  for (const text of a.slice(endA)) ops.push({ kind: 'context', text });
  return ops;
}

export interface Hunk {
  beforeStart: number;
  beforeCount: number;
  afterStart: number;
  afterCount: number;
  ops: LineOp[];
}

/** Groups ops into hunks with `context` unchanged lines around each change. */
export function buildHunks(before: string, after: string, context = 3): Hunk[] {
  const ops = diffLines(before, after);
  const changed = ops
    .map((op, index) => (op.kind === 'context' ? -1 : index))
    .filter((x) => x >= 0);
  if (changed.length === 0) return [];

  // merge change indices that are within 2*context unchanged lines of each other
  const ranges: Array<[number, number]> = [];
  for (const index of changed) {
    const last = ranges[ranges.length - 1];
    if (last && index - last[1] <= context * 2) last[1] = index;
    else ranges.push([index, index]);
  }

  // line numbers walk alongside the ops so each hunk can declare its @@ header
  const beforeNo: number[] = [];
  const afterNo: number[] = [];
  let bn = 1;
  let an = 1;
  for (const op of ops) {
    beforeNo.push(bn);
    afterNo.push(an);
    if (op.kind !== 'add') bn += 1;
    if (op.kind !== 'del') an += 1;
  }

  return ranges.map(([from, to]) => {
    const start = Math.max(0, from - context);
    const end = Math.min(ops.length - 1, to + context);
    const slice = ops.slice(start, end + 1);
    return {
      beforeStart: beforeNo[start]!,
      beforeCount: slice.filter((op) => op.kind !== 'add').length,
      afterStart: afterNo[start]!,
      afterCount: slice.filter((op) => op.kind !== 'del').length,
      ops: slice,
    };
  });
}

export interface DiffStats {
  additions: number;
  deletions: number;
}

export function diffStats(before: string, after: string): DiffStats {
  const ops = diffLines(before, after);
  return {
    additions: ops.filter((op) => op.kind === 'add').length,
    deletions: ops.filter((op) => op.kind === 'del').length,
  };
}

/** Unified diff (`--- a/path` / `+++ b/path` / `@@` hunks), git-compatible shape. */
export function unifiedDiff(path: string, before: string, after: string, context = 3): string {
  const hunks = buildHunks(before, after, context);
  if (hunks.length === 0) return '';
  const out: string[] = [`--- a/${path}`, `+++ b/${path}`];
  for (const hunk of hunks) {
    out.push(
      `@@ -${hunk.beforeStart},${hunk.beforeCount} +${hunk.afterStart},${hunk.afterCount} @@`,
    );
    for (const op of hunk.ops) {
      const prefix = op.kind === 'add' ? '+' : op.kind === 'del' ? '-' : ' ';
      out.push(`${prefix}${op.text}`);
    }
  }
  return `${out.join('\n')}\n`;
}

export type SplitRow =
  | {
      kind: 'context';
      left: { n: number; text: string };
      right: { n: number; text: string };
    }
  | {
      kind: 'change';
      /** Row-aligned: either side may be null when the change is longer. */
      left: { n: number; text: string } | null;
      right: { n: number; text: string } | null;
    };

/**
 * Side-by-side rows for the split view. A changed block pairs deletions with
 * additions row-by-row (padding the shorter side) so the reader compares
 * *corresponding* lines instead of scanning two unrelated columns — the
 * "diff readability" risk this task owns.
 */
export function splitDiff(before: string, after: string): SplitRow[] {
  const ops = diffLines(before, after);
  const rows: SplitRow[] = [];
  let bn = 1;
  let an = 1;
  let dels: Array<{ n: number; text: string }> = [];
  let adds: Array<{ n: number; text: string }> = [];

  const flush = (): void => {
    const count = Math.max(dels.length, adds.length);
    for (let k = 0; k < count; k += 1) {
      rows.push({ kind: 'change', left: dels[k] ?? null, right: adds[k] ?? null });
    }
    dels = [];
    adds = [];
  };

  for (const op of ops) {
    if (op.kind === 'del') {
      dels.push({ n: bn, text: op.text });
      bn += 1;
    } else if (op.kind === 'add') {
      adds.push({ n: an, text: op.text });
      an += 1;
    } else {
      flush();
      rows.push({
        kind: 'context',
        left: { n: bn, text: op.text },
        right: { n: an, text: op.text },
      });
      bn += 1;
      an += 1;
    }
  }
  flush();
  return rows;
}
