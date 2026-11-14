/**
 * Shared test support: the BUILT commerce fixture HTML.
 *
 * Both the selection (T0703) and CDP (T0702) suites need the same static page.
 * `astro build` clears `dist/` while writing, so a build running in parallel
 * with a suite can leave the artefact absent for a moment — these suites then
 * fail for a reason that has nothing to do with the code under test. Build it
 * on demand instead of assuming the order.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const COMMERCE_FIXTURE = join(__dirname, '..', '..', '..', '..', 'fixtures', 'commerce');

/** Returns the built fixture HTML, building the fixture if the artefact is absent. */
export function commerceFixtureHtml(): string {
  const artefact = join(COMMERCE_FIXTURE, 'dist', 'index.html');
  if (!existsSync(artefact)) {
    execFileSync('pnpm', ['--filter', '@sus/fixture-commerce', 'build'], {
      stdio: 'pipe',
      encoding: 'utf8',
    });
  }
  return readFileSync(artefact, 'utf8');
}
