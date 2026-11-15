#!/usr/bin/env node
/**
 * T0905 — what "the artifact" means, in one place.
 *
 * Support evidence is only meaningful if it names the bytes it ran against. The
 * artifact is the built adapter package: its manifest (which declares the version
 * and entry points) plus the compiled entry points the hosts actually load. Source
 * files are deliberately excluded — they are not what ships, and reformatting a
 * comment must not invalidate a smoke run.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const ARTIFACT_ID = 'sus-adapters';

/** Built entry points in a stable order; the manifest comes first. */
export const ARTIFACT_FILES = [
  'packages/adapters/package.json',
  'packages/adapters/dist/index.js',
  'packages/adapters/dist/cli.js',
];

export function artifactSha256(root) {
  const hash = createHash('sha256');
  for (const relative of ARTIFACT_FILES) {
    const path = join(root, relative);
    if (!existsSync(path)) {
      throw new Error(`artifact file missing: ${relative} (build the package first)`);
    }
    hash.update(relative);
    hash.update('\0');
    hash.update(readFileSync(path));
    hash.update('\0');
  }
  return hash.digest('hex');
}
