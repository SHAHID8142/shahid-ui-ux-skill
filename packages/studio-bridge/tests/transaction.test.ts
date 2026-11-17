/**
 * T0805 (DA-35): durable transaction machinery — kill at every step,
 * recover exactly or stop on conflict; untracked user bytes preserved;
 * manifest + preimages durable BEFORE first mutation.
 */
import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { sha256, Transaction } from '../src/transaction.js';

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
    rmSync(scriptPath, { force: true }); // self-clean the generated child
  });
});

/**
 * T1051 (audit finding T1003-6): the recovery manifest is data on disk inside the consumer's
 * tree — attacker-writable. Recovery must hold the same containment line the apply path does,
 * and a digest field that spells a sentinel must never be readable as a content hash: the old
 * classifier compared the literal 'missing' against stored values, so a planted prepared
 * manifest could write or delete outside the root on the next recovery.
 */
describe('planted-manifest containment (T1051, audit finding T1003-6)', () => {
  /** Writes a prepared manifest by hand, exactly the way an attacker with tree write access would. */
  function plantManifest(root: string, files: unknown[]): string {
    const opId = 'planted-0000';
    const dir = join(root, '.sus', 'transactions', opId);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'manifest.json'), JSON.stringify({
      opId,
      planId: 'planted-plan',
      contractVersion: 1,
      createdAt: new Date().toISOString(),
      state: 'prepared',
      files,
    }, null, 2));
    return opId;
  }

  it('refuses a planted manifest whose preimage digest spells the "missing" sentinel', () => {
    const root = fixtureProject();
    // The target is INSIDE the root on purpose: this isolates the sentinel defence from the
    // containment defence. The old classifier compared the literal 'missing' against a genuinely
    // absent file's hash and matched — so the postimage would have been written wherever the
    // manifest pointed.
    const opId = plantManifest(root, [
      {
        path: 'innocent.md',
        preimageSha256: 'missing',
        postimageSha256: 'a'.repeat(64),
        mode: 0o644,
      },
    ]);
    writeFileSync(join(root, '.sus', 'transactions', opId, 'postimage-0.bin'), 'payload');
    const result = Transaction.recover(root, opId).recover('roll-forward');
    expect(result.status).toBe('conflict');
    expect(result.conflicts.join(' ')).toContain('not a SHA-256');
    expect(existsSync(join(root, 'innocent.md'))).toBe(false);
  });

  it('refuses a planted manifest whose target resolves outside the root, for writes and deletions alike', () => {
    const root = fixtureProject();
    const opId = plantManifest(root, [
      {
        path: '../../victim.txt',
        preimageMissing: true,
        postimageSha256: 'b'.repeat(64),
        mode: 0o644,
      },
      {
        path: '../../gone.txt',
        preimageSha256: 'c'.repeat(64),
        postimageSha256: 'absent',
        mode: 0o644,
        deletion: true,
      },
    ]);
    writeFileSync(join(root, '.sus', 'transactions', opId, 'postimage-0.bin'), 'payload');
    const result = Transaction.recover(root, opId).recover('roll-forward');
    expect(result.status).toBe('conflict');
    expect(result.conflicts.join(' ')).toContain('outside the project root');
    expect(existsSync(join(root, '..', 'victim.txt'))).toBe(false);
    expect(existsSync(join(root, '..', 'gone.txt'))).toBe(false);
  });

  it('apply() refuses a hand-edited manifest with an escaping path before writing anything', () => {
    const root = fixtureProject();
    const opId = plantManifest(root, [
      {
        path: '../outside.txt',
        preimageSha256: 'd'.repeat(64),
        postimageSha256: 'e'.repeat(64),
        mode: 0o644,
      },
    ]);
    writeFileSync(join(root, '.sus', 'transactions', opId, 'postimage-0.bin'), 'payload');
    const tx = Transaction.recover(root, opId);
    expect(() => tx.apply()).toThrow(/outside the project root/);
    expect(existsSync(join(root, '..', 'outside.txt'))).toBe(false);
  });

  it('a manifest declaring preimageMissing rolls forward a legitimate create inside the root', () => {
    const root = fixtureProject();
    const content = 'created by a legitimate plan';
    const opId = plantManifest(root, [
      {
        path: 'new-file.md',
        preimageMissing: true,
        postimageSha256: sha256(content),
        mode: 0o644,
      },
    ]);
    writeFileSync(join(root, '.sus', 'transactions', opId, 'postimage-0.bin'), content);
    const result = Transaction.recover(root, opId).recover('roll-forward');
    expect(result.status).toBe('recovered');
    expect(readFileSync(join(root, 'new-file.md'), 'utf8')).toBe('created by a legitimate plan');
    // and roll-back removes the created file (its preimage was "absent")
    const back = Transaction.recover(root, opId).recover('roll-back');
    expect(back.status).toBe('recovered');
  });

  it('prepare() refuses an escaping target before any preimage is read or written', () => {
    const root = fixtureProject();
    expect(() =>
      Transaction.prepare(root, 'plan-x', 1, [{ path: '../escape.ts', postimage: 'x' }]),
    ).toThrow(/outside the project root/);
    expect(existsSync(join(root, '..', 'escape.ts'))).toBe(false);
  });
});
