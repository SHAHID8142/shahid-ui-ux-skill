/**
 * T0805 (DA-35): durable transaction machinery — kill at every step,
 * recover exactly or stop on conflict; untracked user bytes preserved;
 * manifest + preimages durable BEFORE first mutation.
 */
import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { Transaction } from '../src/transaction.js';

function fixtureProject(): string {
  const dir = mkdtempSync(join(tmpdir(), 't0805-fixture-'));
  writeFileSync(join(dir, 'page.tsx'), 'export const hero = "before";\n');
  writeFileSync(join(dir, 'styles.css'), '.hero { color: red; }\n');
  // untracked user bytes that recovery must NEVER touch
  writeFileSync(join(dir, 'user-notes.md'), 'my own scratch notes — preserve me');
  return dir;
}

const FILES = [
  { path: 'page.tsx', postimage: 'export const hero = "after";\n' },
  { path: 'styles.css', postimage: '.hero { color: blue; }\n' },
];

describe('durable transaction recovery (T0805, DA-35)', () => {
  it('manifest + preimages are durable BEFORE first mutation', () => {
    const root = fixtureProject();
    const tx = Transaction.prepare(root, 'plan-1', 1, FILES);
    expect(existsSync(tx.manifestPath)).toBe(true);
    expect(existsSync(join(tx.dir, 'preimage-0.bin'))).toBe(true);
    expect(existsSync(join(tx.dir, 'postimage-0.bin'))).toBe(true);
    // nothing mutated yet
    expect(readFileSync(join(root, 'page.tsx'), 'utf8')).toContain('before');
    expect(tx.manifest.state).toBe('prepared');
  });

  it('full apply + verify: both files end at postimage, hashes match', () => {
    const root = fixtureProject();
    const tx = Transaction.prepare(root, 'plan-1', 1, FILES);
    tx.apply();
    expect(readFileSync(join(root, 'page.tsx'), 'utf8')).toContain('after');
    expect(tx.verify()).toBe(true);
    tx.dispose();
  });

  it('crash after FIRST file: roll-forward completes exactly (DA-35 exact recovery)', () => {
    const root = fixtureProject();
    const tx = Transaction.prepare(root, 'plan-1', 1, FILES);
    tx.apply(1); // crash point: first file applied, second NOT
    expect(readFileSync(join(root, 'page.tsx'), 'utf8')).toContain('after');
    expect(readFileSync(join(root, 'styles.css'), 'utf8')).toContain('red'); // untouched

    const recovered = Transaction.recover(root, tx.manifest.opId);
    expect(recovered.manifest.state).toBe('prepared'); // on-disk state was mid-flight
    const result = recovered.recover('roll-forward');
    expect(result.status).toBe('recovered');
    expect(readFileSync(join(root, 'page.tsx'), 'utf8')).toContain('after');
    expect(readFileSync(join(root, 'styles.css'), 'utf8')).toContain('blue'); // completed
    expect(recovered.verify()).toBe(true);
  });

  it('crash mid-transaction: roll-back restores preimages EXACTLY', () => {
    const root = fixtureProject();
    const tx = Transaction.prepare(root, 'plan-1', 1, FILES);
    tx.apply(1);
    const recovered = Transaction.recover(root, tx.manifest.opId);
    const result = recovered.rollback();
    expect(result.status).toBe('rolled-back');
    expect(readFileSync(join(root, 'page.tsx'), 'utf8')).toContain('before');
    expect(readFileSync(join(root, 'styles.css'), 'utf8')).toContain('red');
  });

  it('conflict: a third-party write stops recovery — never guessed over', () => {
    const root = fixtureProject();
    const tx = Transaction.prepare(root, 'plan-1', 1, FILES);
    tx.apply(1);
    // someone else wrote to the un-applied file between crash and recovery
    writeFileSync(join(root, 'styles.css'), 'third-party edit — conflicting bytes');
    const recovered = Transaction.recover(root, tx.manifest.opId);
    const result = recovered.recover('roll-forward');
    expect(result.status).toBe('conflict');
    expect(result.conflicts).toEqual(['styles.css']);
    // conflicting bytes untouched
    expect(readFileSync(join(root, 'styles.css'), 'utf8')).toContain('third-party edit');
  });

  it('untracked user bytes survive apply + rollback untouched', () => {
    const root = fixtureProject();
    const tx = Transaction.prepare(root, 'plan-1', 1, FILES);
    tx.apply();
    tx.rollback();
    expect(readFileSync(join(root, 'user-notes.md'), 'utf8')).toBe(
      'my own scratch notes — preserve me',
    );
    expect(existsSync(join(root, 'user-notes.md'))).toBe(true);
  });

  it('kill -9 mid-flight (real SIGKILL child): recovery from disk is exact', () => {
    const root = fixtureProject();
    // child process: prepare + apply first file, then SIGKILL itself
    // dist path baked as a literal: the child's __dirname is tmpdir, not here
    const distPath = join(__dirname, '..', 'dist', 'transaction.js');
    const childScript = [
      `import { Transaction } from ${JSON.stringify(distPath)};`,
      `const tx = Transaction.prepare(${JSON.stringify(root)}, 'plan-kill', 1, ${JSON.stringify(FILES)});`,
      'tx.apply(1);',
      "process.kill(process.pid, 'SIGKILL');",
    ].join('\n');
    // generated INSIDE the package: ESM resolution of @sus/schemas walks up
    // to packages/studio-bridge/node_modules (a tmpdir child cannot resolve)
    const scriptPath = join(__dirname, '..', '.kill-child.mjs');
    writeFileSync(scriptPath, childScript);
    try {
      // SIGKILL exit is the expected outcome of the child
      execFileSync(process.execPath, [scriptPath], { stdio: 'ignore' });
    } catch {
      /* killed as designed */
    }
    // child is dead; on-disk state: manifest + preimages + first file applied
    expect(existsSync(join(root, '.sus', 'transactions'))).toBe(true);

    const txDir = join(root, '.sus', 'transactions');
    const dirs = readdirSync(txDir);
    expect(dirs.length).toBe(1);
    const recovered = Transaction.recover(root, dirs[0]!);
    const result = recovered.recover('roll-forward');
    expect(result.status).toBe('recovered');
    expect(recovered.verify()).toBe(true);
    expect(readFileSync(join(root, 'page.tsx'), 'utf8')).toContain('after');
    expect(readFileSync(join(root, 'styles.css'), 'utf8')).toContain('blue');
    expect(readFileSync(join(root, 'user-notes.md'), 'utf8')).toContain('preserve me');
  });
});
