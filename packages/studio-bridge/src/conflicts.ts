/**
 * T0802 — stale mapping, user-edit conflicts and fail-closed behaviour.
 *
 * The dangerous failure of a source-mapping studio is not "the edit did not
 * apply". It is "the edit applied somewhere else": an anchor survived in a
 * different element, a section moved, or the user edited the file after the
 * overlay was drawn. Every one of those produces a *plausible* write that
 * silently damages the product.
 *
 * So this module refuses by default and never repairs silently:
 *
 *  - an anchor that moved, disappeared, duplicated or now belongs to a different
 *    element is a conflict, not a re-target;
 *  - a file whose bytes changed since the annotation was recorded is a conflict,
 *    even when the anchor still resolves;
 *  - a conflict never destroys work: the annotations are kept verbatim and the
 *    caller is offered exactly two honest actions — `retry` (re-resolve against
 *    the current tree) or `export` (hand the annotations back to the user).
 *
 * There is no third option. Nothing here writes source: `apply` belongs to
 * T0707's engine, and it will only run after this module reports `clear`.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildOwnerIndex, resolveOwner, type AnchorEntry, type OwnerIndex } from './owner-index.js';

/** One user annotation, preserved exactly as it was made. */
export interface PreservedAnnotation {
  id: string;
  intentId: string;
  /** Anchor the user selected on. */
  anchor: string;
  /** Region in viewport pixels, as drawn. */
  region: { x: number; y: number; width: number; height: number };
  /** sha256 of the source file when the annotation was made. */
  fileSha256: string;
  /** File the annotation was mapped to at creation time. */
  file: string;
  createdAt: string;
  /** Free-form text the user typed; never rewritten. */
  note?: string;
}

export type ConflictKind =
  | 'anchor-missing'
  | 'anchor-moved'
  | 'anchor-duplicated'
  | 'owner-changed'
  | 'file-changed'
  | 'file-deleted'
  | 'ambiguous-owner';

export interface Conflict {
  annotationId: string;
  kind: ConflictKind;
  detail: string;
  /** What the caller may do. There is no silent third option. */
  options: Array<'retry' | 'export'>;
  /** Anchor entries that could be the new owner, for a UI to show — never auto-applied. */
  candidates: Array<{ file: string; line: number; tagName: string }>;
}

export type Resolution =
  | { state: 'clear'; annotation: PreservedAnnotation; owner: AnchorEntry }
  | { state: 'conflict'; conflict: Conflict };

export interface SourceTree {
  /** Absolute path of the project root. */
  root: string;
  /** Files to index, relative to root. */
  files: string[];
}

export interface ExportBundle {
  schemaVersion: 1;
  exportedAt: string;
  annotations: PreservedAnnotation[];
  conflicts: Conflict[];
  /** True when the user can retry; included so a UI never guesses. */
  retryAvailable: boolean;
}

function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

/**
 * Tracks a set of annotations against a source tree and answers "may this be
 * applied?" per annotation. Fail-closed: anything it cannot prove is a conflict.
 */
export class MappingConflictSession {
  private readonly annotations: Map<string, PreservedAnnotation>;
  private index: OwnerIndex;
  private readonly tree: SourceTree;

  private constructor(tree: SourceTree, annotations: PreservedAnnotation[], index: OwnerIndex) {
    this.tree = tree;
    this.annotations = new Map(annotations.map((annotation) => [annotation.id, annotation]));
    this.index = index;
  }

  /** Reads and indexes the tree, refusing (not repairing) unreadable sources. */
  static open(tree: SourceTree, annotations: PreservedAnnotation[]): MappingConflictSession {
    const seen = new Set<string>();
    for (const annotation of annotations) {
      if (seen.has(annotation.id)) {
        throw new Error(`duplicate annotation id: ${annotation.id}`);
      }
      seen.add(annotation.id);
    }
    return new MappingConflictSession(tree, annotations, MappingConflictSession.index(tree));
  }

  private static index(tree: SourceTree): OwnerIndex {
    const files: Array<{ path: string; text: string }> = [];
    for (const path of tree.files) {
      const absolute = join(tree.root, path);
      if (!existsSync(absolute)) continue;
      files.push({ path, text: readFileSync(absolute, 'utf8') });
    }
    return buildOwnerIndex(files);
  }

  /** Re-reads the tree. Nothing is mutated: the annotations stay as recorded. */
  refresh(): void {
    this.index = MappingConflictSession.index(this.tree);
  }

  /** All annotations, in insertion order, verbatim. */
  preserved(): PreservedAnnotation[] {
    return [...this.annotations.values()];
  }

  /**
   * Decides whether one annotation can be applied. Every uncertainty is a
   * conflict with `retry`/`export`; a clear result carries the owner the write
   * would target, so the caller can preview before applying.
   */
  check(annotationId: string): Resolution {
    const annotation = this.annotations.get(annotationId);
    if (!annotation) throw new Error(`unknown annotation: ${annotationId}`);
    const absolute = join(this.tree.root, annotation.file);
    const advice = { options: ['retry', 'export'] as Array<'retry' | 'export'> };

    if (!existsSync(absolute)) {
      return {
        state: 'conflict',
        conflict: {
          annotationId,
          kind: 'file-deleted',
          detail: `${annotation.file} no longer exists; the annotation cannot be applied to a file that is gone`,
          candidates: [],
          ...advice,
        },
      };
    }

    const current = readFileSync(absolute, 'utf8');
    const ownership = resolveOwner(this.index, annotation.anchor);

    // The user edited the file after drawing: refuse even if the anchor still
    // resolves, because the two edits have never been reconciled.
    if (sha256(current) !== annotation.fileSha256) {
      return {
        state: 'conflict',
        conflict: {
          annotationId,
          kind: 'file-changed',
          detail: `${annotation.file} changed after this annotation was made; re-preview before applying`,
          candidates: ownership.ok
            ? [
                {
                  file: ownership.owner.file,
                  line: ownership.owner.line,
                  tagName: ownership.owner.tagName,
                },
              ]
            : [],
          ...advice,
        },
      };
    }

    if (!ownership.ok) {
      const kind: ConflictKind =
        ownership.reason === 'ambiguous-owner' ? 'ambiguous-owner' : 'anchor-missing';
      return {
        state: 'conflict',
        conflict: {
          annotationId,
          kind,
          detail: ownership.detail,
          candidates: ownership.candidates.map((candidate) => ({
            file: candidate.file,
            line: candidate.line,
            tagName: candidate.tagName,
          })),
          ...advice,
        },
      };
    }

    const owner = ownership.owner;
    if (owner.file !== annotation.file) {
      return {
        state: 'conflict',
        conflict: {
          annotationId,
          kind: 'owner-changed',
          detail: `"${annotation.anchor}" now resolves to ${owner.file}, not ${annotation.file}; refusing to retarget silently`,
          candidates: [{ file: owner.file, line: owner.line, tagName: owner.tagName }],
          ...advice,
        },
      };
    }

    const duplicates = this.index.entries.filter(
      (entry) => entry.anchor === annotation.anchor && entry.file === annotation.file,
    );
    if (duplicates.length > 1) {
      return {
        state: 'conflict',
        conflict: {
          annotationId,
          kind: 'anchor-duplicated',
          detail: `"${annotation.anchor}" now appears ${duplicates.length} times in ${annotation.file}`,
          candidates: duplicates.map((entry) => ({
            file: entry.file,
            line: entry.line,
            tagName: entry.tagName,
          })),
          ...advice,
        },
      };
    }

    const recordedLine = this.index.entries.find(
      (entry) => entry.anchor === annotation.anchor && entry.file === annotation.file,
    );
    if (!recordedLine) {
      return {
        state: 'conflict',
        conflict: {
          annotationId,
          kind: 'anchor-missing',
          detail: `"${annotation.anchor}" is not declared in ${annotation.file}`,
          candidates: [],
          ...advice,
        },
      };
    }

    return { state: 'clear', annotation, owner };
  }

  /** Every annotation's resolution, in order. */
  checkAll(): Resolution[] {
    return [...this.annotations.keys()].map((id) => this.check(id));
  }

  /**
   * Re-resolves after a refresh. Returns the same shape as `check`, so a retry
   * that still conflicts is still a conflict — retrying is never a bypass.
   */
  retry(annotationId: string): Resolution {
    this.refresh();
    return this.check(annotationId);
  }

  /** Hands the user back everything, including the conflicts that blocked it. */
  exportBundle(options: { exportedAt?: string; retryAvailable?: boolean } = {}): ExportBundle {
    const resolutions = this.checkAll();
    const conflicts = resolutions
      .filter(
        (resolution): resolution is Extract<Resolution, { state: 'conflict' }> =>
          resolution.state === 'conflict',
      )
      .map((resolution) => resolution.conflict);
    return {
      schemaVersion: 1,
      exportedAt: options.exportedAt ?? new Date().toISOString(),
      annotations: this.preserved(),
      conflicts,
      retryAvailable: options.retryAvailable ?? true,
    };
  }

  /** True only when every annotation can be applied without guessing. */
  isClear(): boolean {
    return this.checkAll().every((resolution) => resolution.state === 'clear');
  }
}
