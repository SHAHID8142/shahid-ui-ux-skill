/**
 * Shared path-containment guard (T1051).
 *
 * Proposal paths are produced by walking the root, so traversal is not reachable through the public
 * API today. This refuses it anyway, because the cost of the guard is one `realpath` and the cost of
 * the bug would be a write outside the tree the owner approved — the one thing an apply path must
 * never do. Lives in its own module so both `ApplyEngine` and the durable `Transaction` machinery
 * can hold the same line without a circular import (transaction cannot import apply).
 */
import { realpathSync } from 'node:fs';
import { basename, dirname, join, resolve, sep } from 'node:path';

/**
 * Whether a proposal path stays inside the project root, after symlinks are resolved.
 *
 * Exported so the guard can be tested without constructing a whole session.
 */
export function insideRoot(root: string, path: string): boolean {
  try {
    const canonicalRoot = realpathSync(root);
    // `resolve`, not `join`: join concatenates, so an absolute `path` would have been glued onto the root
    // and then failed to exist, refusing a legitimate inside path. resolve also normalises `..`.
    const absolute = resolve(root, path);
    // The parent is resolved, the leaf is joined: resolving the leaf too would make a symlinked file
    // look like its target, and the write replaces the link rather than following it.
    const parent = realpathSync(dirname(absolute));
    const canonical = join(parent, basename(absolute));
    return canonical === canonicalRoot || canonical.startsWith(canonicalRoot + sep);
  } catch {
    return false;
  }
}
