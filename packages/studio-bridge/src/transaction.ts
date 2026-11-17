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
import { insideRoot } from './paths.js';

/** A digest field must be a real SHA-256 hex digest — never a sentinel that reads as one. */
const HEX64 = /^[0-9a-f]{64}$/;

export type TxState = 'prepared' | 'applied' | 'verified' | 'rolled-back';

export interface TxFile {
  /** Repo-relative path of the target file. */
  path: string;
  /** SHA-256 of the file BEFORE mutation (the preimage). */
  preimageSha256: string;
  /**
   * True when the target did not exist before the transaction (a create): the preimage is
   * "absent" and the stored `preimageSha256` field is not a hash and must never be compared
   * against one. Set explicitly, because the classifier cannot tell "no preimage" from a
   * digest that spells `missing` (T1051, audit finding T1003-6).
   */
  preimageMissing?: boolean;
  /** SHA-256 of the intended AFTER content. */
  postimageSha256: string;
  /** File mode in octal (e.g. 420 for 0644). */
  mode: number;
  /** True when the transaction removes this file (rollback recreates it). */
  deletion?: boolean;
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
    files: Array<{ path: string; postimage?: string; mode?: number; deletion?: boolean }>,
  ): Transaction {
    // T1051 (audit finding T1003-6): the preimage step reads the target, so an escaping path
    // would hash — and the transaction would later write — outside the approved tree. Refuse
    // before anything is persisted.
    for (const f of files) {
      if (!insideRoot(root, f.path)) {
        throw new Error(
          `transaction target resolves outside the project root: ${f.path} — a transaction never touches a file the root does not contain`,
        );
      }
    }
    const manifest: TransactionManifest = {
      opId: randomUUID(),
      planId,
      contractVersion,
      createdAt: new Date().toISOString(),
      state: 'prepared',
      files: files.map((f) => ({
        path: f.path,
        preimageSha256: sha256(readFileSync(join(root, f.path))),
        postimageSha256: f.deletion ? 'absent' : sha256(f.postimage ?? ''),
        mode: f.mode ?? 0o644,
        ...(f.deletion ? { deletion: true } : {}),
      })),
    };
    const tx = new Transaction(root, manifest);
    mkdirSync(tx.dir, { recursive: true });
    // durable record FIRST: manifest + per-file postimages, all atomic
    atomicWrite(tx.manifestPath, JSON.stringify(manifest, null, 2));
    files.forEach((f, i) => {
      if (!f.deletion)
        atomicWrite(join(tx.dir, `postimage-${i}.bin`), f.postimage ?? '', f.mode ?? 0o644);
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
    // T1051 (audit finding T1003-6): the manifest is data on disk inside the consumer's tree,
    // so it is attacker-writable; applying it must never write outside the root it was prepared
    // for. Refuse rather than normalise.
    for (const file of this.manifest.files) {
      if (!insideRoot(this.root, file.path)) {
        throw new Error(
          `transaction ${this.manifest.opId} refuses a target outside the project root: ${file.path}`,
        );
      }
    }
    const limit = stopAfter ?? this.manifest.files.length;
    for (let i = 0; i < limit; i += 1) {
      const file = this.manifest.files[i]!;
      if (file.deletion) rmSync(join(this.root, file.path), { force: true });
      else atomicWrite(join(this.root, file.path), this.postimage(i), file.mode);
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
  recover(mode: 'roll-forward' | 'roll-back'): {
    status: 'recovered' | 'conflict';
    conflicts: string[];
  } {
    const conflicts: string[] = [];
    for (const f of this.manifest.files) {
      const absolute = join(this.root, f.path);
      // T1051 (audit finding T1003-6): a manifest is on-disk data in the consumer's tree, so it
      // is attacker-writable — recovery must hold the same containment line the apply path does.
      // An escaping path is a conflict: recovery stops and reports, it never guesses.
      if (!insideRoot(this.root, f.path)) {
        conflicts.push(`${f.path} (resolves outside the project root)`);
        continue;
      }
      // The classifier once compared the literal sentinel 'missing' against stored digest
      // fields, so a planted manifest declaring preimageSha256 'missing' matched a genuinely
      // absent file and its postimage was written anywhere. A stored digest that is not a
      // real SHA-256 hex digest is now a conflict — unverifiable, never executed.
      if (f.preimageMissing !== true && !HEX64.test(f.preimageSha256)) {
        conflicts.push(`${f.path} (manifest preimage digest is not a SHA-256)`);
        continue;
      }
      if (f.deletion !== true && !HEX64.test(f.postimageSha256)) {
        conflicts.push(`${f.path} (manifest postimage digest is not a SHA-256)`);
        continue;
      }
      const current = existsSync(absolute) ? sha256(readFileSync(absolute)) : null;
      const preimage = f.preimageMissing === true ? null : f.preimageSha256;
      const postimage = f.deletion === true ? null : f.postimageSha256;
      if (current !== preimage && current !== postimage) {
        conflicts.push(f.path);
      }
    }
    if (conflicts.length > 0) {
      return { status: 'conflict', conflicts };
    }
    this.manifest.files.forEach((f, i) => {
      const absolute = join(this.root, f.path);
      if (mode === 'roll-forward' && f.deletion) rmSync(absolute, { force: true });
      else if (mode === 'roll-back' && f.preimageMissing === true) {
        // rolling back a create: the preimage was "absent", so restore absence (T1051)
        rmSync(absolute, { force: true });
      } else if (
        mode === 'roll-back' &&
        f.deletion &&
        !existsSync(join(this.dir, `postimage-${i}.bin`))
      ) {
        // restoring a deleted file: preimage + original mode
        atomicWrite(absolute, this.preimage(i), f.mode);
      } else {
        atomicWrite(
          absolute,
          mode === 'roll-forward' ? this.postimage(i) : this.preimage(i),
          f.mode,
        );
      }
    });
    this.manifest.state = mode === 'roll-forward' ? 'applied' : 'rolled-back';
    this.persistState();
    return { status: 'recovered', conflicts: [] };
  }

  /** Verifies: every file hash matches its postimage. */
  verify(): boolean {
    for (const f of this.manifest.files) {
      const absolute = join(this.root, f.path);
      // T1051: a manifest path that leaves the root can never verify — verification reads and
      // hashes only inside the approved tree.
      if (!insideRoot(this.root, f.path)) return false;
      if (f.deletion) {
        if (existsSync(absolute)) return false;
        continue;
      }
      if (!existsSync(absolute)) return false;
      if (sha256(readFileSync(absolute)) !== f.postimageSha256) return false;
    }
    this.manifest.state = 'verified';
    this.persistState();
    return true;
  }

  /** Roll-back from any pre-verified state (restores preimages exactly). */
  rollback(): { status: 'rolled-back' | 'conflict'; conflicts: string[] } {
    const result = this.recover('roll-back');
    return {
      status: result.status === 'conflict' ? 'conflict' : 'rolled-back',
      conflicts: result.conflicts,
    };
  }

  /** Cleanup (dispose fixtures). */
  dispose(): void {
    rmSync(this.dir, { recursive: true, force: true });
  }
}
