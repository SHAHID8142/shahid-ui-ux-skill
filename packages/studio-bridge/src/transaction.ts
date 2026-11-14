/**
 * Durable transaction machinery (T0805, DA-35).
 *
 * The recovery manifest (typed operation id, preimage hashes, file modes,
 * postimage hashes, multi-file list) is persisted ATOMICALLY (temp + rename)
 * BEFORE the first mutation. Every state change is itself recorded
 * atomically, so a kill -9 at any point leaves a consistent on-disk state
 * from which recovery either (a) rolls forward or back EXACTLY, or (b)
 * STOPS on conflict (file contents match neither preimage nor postimage —
 * someone else wrote to the file; never guessed over).
 *
 * Crash points are explicit: prepared → per-file applied → applied →
 * verified. Disposable fixtures exercise every kill point in tests; the
 * production writer (T0707) is a separate gated piece.
 */
import { createHash } from 'node:crypto';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { randomUUID } from 'node:crypto';

export type TxState = 'prepared' | 'applied' | 'verified' | 'rolled-back';

export interface TxFile {
  /** Repo-relative path of the target file. */
  path: string;
  /** SHA-256 of the file BEFORE mutation (the preimage). */
  preimageSha256: string;
  /** SHA-256 of the intended AFTER content. */
  postimageSha256: string;
  /** File mode in octal (e.g. 420 for 0644). */
  mode: number;
}

export interface TransactionManifest {
  opId: string;
  planId: string;
  contractVersion: number;
  createdAt: string;
  state: TxState;
  files: TxFile[];
}

export function sha256(content: string | Buffer): string {
  return createHash('sha256').update(content).digest('hex');
}

/** Atomic write: temp file in the same dir, then rename (DA-35: rename alone
 * is not the transaction — it's how EACH durable record is written). */
function atomicWrite(path: string, content: string | Buffer, mode?: number): void {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.tmp-${randomUUID()}`;
  writeFileSync(tmp, content);
  if (mode !== undefined) {
    // renameSync cannot set mode; chmod before rename on the temp file
    chmodSync(tmp, mode);
  }
  renameSync(tmp, path);
}

export class Transaction {
  readonly dir: string; // durable recovery dir: <root>/.sus/transactions/<opId>/
  readonly manifestPath: string;
  manifest: TransactionManifest;

  private constructor(
    readonly root: string,
    manifest: TransactionManifest,
  ) {
    this.dir = join(root, '.sus', 'transactions', manifest.opId);
    this.manifestPath = join(this.dir, 'manifest.json');
    this.manifest = manifest;
  }

  /** Creates the durable manifest + preimages BEFORE the first mutation. */
  static prepare(
    root: string,
    planId: string,
    contractVersion: number,
    files: Array<{ path: string; postimage: string; mode?: number }>,
  ): Transaction {
    const manifest: TransactionManifest = {
      opId: randomUUID(),
      planId,
      contractVersion,
      createdAt: new Date().toISOString(),
      state: 'prepared',
      files: files.map((f) => ({
        path: f.path,
        preimageSha256: sha256(readFileSync(join(root, f.path))),
        postimageSha256: sha256(f.postimage),
        mode: f.mode ?? 0o644,
      })),
    };
    const tx = new Transaction(root, manifest);
    mkdirSync(tx.dir, { recursive: true });
    // durable record FIRST: manifest + per-file postimages, all atomic
    atomicWrite(tx.manifestPath, JSON.stringify(manifest, null, 2));
    files.forEach((f, i) => {
      atomicWrite(join(tx.dir, `postimage-${i}.bin`), f.postimage, f.mode ?? 0o644);
      atomicWrite(join(tx.dir, `preimage-${i}.bin`), readFileSync(join(root, f.path)));
    });
    return tx;
  }

  /** Re-attaches to an existing on-disk transaction (recovery path). */
  static recover(root: string, opId: string): Transaction {
    const manifestPath = join(root, '.sus', 'transactions', opId, 'manifest.json');
    if (!existsSync(manifestPath)) throw new Error(`no transaction ${opId} on disk`);
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as TransactionManifest;
    return new Transaction(root, manifest);
  }

  private persistState(): void {
    atomicWrite(this.manifestPath, JSON.stringify(this.manifest, null, 2));
  }

  private postimage(i: number): Buffer {
    return readFileSync(join(this.dir, `postimage-${i}.bin`));
  }

  private preimage(i: number): Buffer {
    return readFileSync(join(this.dir, `preimage-${i}.bin`));
  }

  /**
   * Applies files one at a time (atomic rename per file). `stopAfter` is a
   * TEST-ONLY crash-point hook: apply the first N files then return, leaving
   * the on-disk state mid-transaction (a kill -9 equivalent).
   */
  apply(stopAfter?: number): void {
    if (this.manifest.state !== 'prepared') {
      throw new Error(`cannot apply from state "${this.manifest.state}"`);
    }
    const limit = stopAfter ?? this.manifest.files.length;
    for (let i = 0; i < limit; i += 1) {
      atomicWrite(join(this.root, this.manifest.files[i]!.path), this.postimage(i), this.manifest.files[i]!.mode);
    }
    // state advances to 'applied' only after EVERY file — a crash mid-apply
    // leaves the manifest in 'prepared', and recover() classifies files by
    // content hash (DA-35: the manifest never claims more than is true)
    if (limit >= this.manifest.files.length) {
      this.manifest.state = 'applied';
    }
    this.persistState();
  }

  /**
   * Recovery: classify every file by current content hash against the
   * manifest, then roll FORWARD (complete remaining files) or BACK (restore
   * preimages). A file matching NEITHER hash is a conflict — recovery stops
   * and reports; it never guesses over third-party writes. Untracked files
   * and unrelated user bytes are never touched.
   */
  recover(mode: 'roll-forward' | 'roll-back'): { status: 'recovered' | 'conflict'; conflicts: string[] } {
    const conflicts: string[] = [];
    for (const f of this.manifest.files) {
      const current = existsSync(join(this.root, f.path)) ? sha256(readFileSync(join(this.root, f.path))) : 'missing';
      if (current !== f.preimageSha256 && current !== f.postimageSha256) {
        conflicts.push(f.path);
      }
    }
    if (conflicts.length > 0) {
      return { status: 'conflict', conflicts };
    }
    this.manifest.files.forEach((f, i) => {
      const target = mode === 'roll-forward' ? this.postimage(i) : this.preimage(i);
      atomicWrite(join(this.root, f.path), target, f.mode);
    });
    this.manifest.state = mode === 'roll-forward' ? 'applied' : 'rolled-back';
    this.persistState();
    return { status: 'recovered', conflicts: [] };
  }

  /** Verifies: every file hash matches its postimage. */
  verify(): boolean {
    for (const f of this.manifest.files) {
      if (sha256(readFileSync(join(this.root, f.path))) !== f.postimageSha256) return false;
    }
    this.manifest.state = 'verified';
    this.persistState();
    return true;
  }

  /** Roll-back from any pre-verified state (restores preimages exactly). */
  rollback(): { status: 'rolled-back' | 'conflict'; conflicts: string[] } {
    const result = this.recover('roll-back');
    return { status: result.status === 'conflict' ? 'conflict' : 'rolled-back', conflicts: result.conflicts };
  }

  /** Cleanup (dispose fixtures). */
  dispose(): void {
    rmSync(this.dir, { recursive: true, force: true });
  }
}
