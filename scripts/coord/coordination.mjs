#!/usr/bin/env node
/**
 * SUS inter-agent coordination bus (file-based, zero dependencies).
 *
 * Two agents (ZCode main/sub-agents, Pi, Codex, Claude Code) may work in this
 * repository at the same time. This bus lets them announce themselves, ask and
 * answer questions, and take exclusive claims on tasks and file paths BEFORE
 * they edit — so "two agents editing the same file" becomes a refused claim
 * instead of a lost commit.
 *
 * Design constraints (why it looks like this):
 *  - The bus lives in the git *common* directory, not the worktree, so it is
 *    invisible to `git status` and never pollutes a checkpoint commit, while
 *    still being shared by every worktree of this repository.
 *  - Claims are created with O_EXCL ("wx"), the only portable atomic
 *    create-if-not-exists on a local filesystem. No lock daemon, no network.
 *  - A claim/agent is "live" while its heartbeat is fresher than its TTL, so a
 *    crashed agent frees its work after TTL (or immediately with --force / gc)
 *    instead of blocking the other agent forever. Recorded pids are diagnostic
 *    only, because agents call this CLI as short-lived one-shot processes.
 *  - This is a coordination layer, never a status authority: task status stays
 *    in TASKS.json (docs/AGENT_COORDINATION.md).
 *
 * Usage: node scripts/coord/coordination.mjs <command> [flags]
 *        node scripts/coord/coordination.mjs help
 */

import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import {
  existsSync,
  linkSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve, sep } from 'node:path';

const DEFAULT_TTL = 900; // seconds; a claim without a heartbeat in 15 min is stale
const DEFAULT_AGENT_TTL = 900;

// ---------------------------------------------------------------- environment

function git(args, cwd = process.cwd()) {
  try {
    return execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

/** Bus directory: $SUS_COORD_DIR, else <git-common-dir>/sus-coord. */
export function busRoot(env = process.env) {
  if (env.SUS_COORD_DIR) return resolve(env.SUS_COORD_DIR);
  const common = git(['rev-parse', '--git-common-dir']);
  const top = git(['rev-parse', '--show-toplevel']);
  if (common && top) return resolve(top, common, 'sus-coord');
  return resolve(process.cwd(), '.sus-coord');
}

function paths(root) {
  return {
    root,
    agents: join(root, 'agents'),
    claims: join(root, 'claims'),
    inbox: join(root, 'inbox'),
    sent: join(root, 'sent'),
    read: join(root, 'read'),
    findings: join(root, 'findings'),
    log: join(root, 'log.jsonl'),
  };
}

function ensureDir(dir) {
  mkdirSync(dir, { recursive: true });
}

function readJson(file, fallback = null) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

/** Write JSON atomically: temp file in the same dir, then rename. */
function writeJson(file, value) {
  ensureDir(join(file, '..'));
  const tmp = `${file}.tmp-${process.pid}-${randomBytes(4).toString('hex')}`;
  writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  renameSync(tmp, file);
}

/**
 * Atomically create a file that must not already exist. Returns false on EEXIST.
 * The content is written to a temp file first and published with link(2), so a
 * racing reader can never observe a created-but-still-empty claim (which would
 * otherwise look unowned and let two agents win the same claim).
 */
function createExclusive(file, value) {
  ensureDir(join(file, '..'));
  const tmp = `${file}.tmp-${process.pid}-${randomBytes(4).toString('hex')}`;
  writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  try {
    linkSync(tmp, file);
  } catch (err) {
    unlinkSync(tmp);
    if (err.code === 'EEXIST') return false;
    throw err;
  }
  unlinkSync(tmp);
  return true;
}

function listJson(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => readJson(join(dir, f)))
    .filter(Boolean);
}

function log(root, entry) {
  const p = paths(root);
  ensureDir(p.root);
  writeFileSync(p.log, `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`, {
    flag: 'a',
  });
}

function nowIso() {
  return new Date().toISOString();
}

function ageSeconds(iso) {
  const t = Date.parse(iso ?? '');
  return Number.isNaN(t) ? Infinity : (Date.now() - t) / 1000;
}

/**
 * Liveness is heartbeat-based only. Agents call this CLI as short-lived one-shot
 * processes, so a recorded pid is diagnostic only — using pid liveness would make
 * every fresh claim look dead and hand the same task to both agents.
 */
function live(record, ttlField, ttlDefault) {
  if (!record) return false;
  const ttl = Number(record[ttlField] ?? ttlDefault);
  return ageSeconds(record.heartbeatAt ?? record.registeredAt ?? record.startedAt) <= ttl;
}

// ------------------------------------------------------------------- agents

function agentFile(root, id) {
  return join(paths(root).agents, `${id}.json`);
}

export function registerAgent(root, rec) {
  const previous = readJson(agentFile(root, rec.id), {});
  const record = {
    ttlSec: rec.ttlSec ?? DEFAULT_AGENT_TTL,
    ...previous,
    ...rec,
    registeredAt: previous.registeredAt ?? nowIso(),
    heartbeatAt: nowIso(),
  };
  writeJson(agentFile(root, rec.id), record);
  log(root, { ev: 'register', agent: rec.id, branch: rec.branch ?? null });
  return record;
}

export function listAgents(root) {
  return listJson(paths(root).agents)
    .map((a) => ({ ...a, live: live(a, 'ttlSec', DEFAULT_AGENT_TTL) }))
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));
}

function resolveAgent(root, explicit) {
  const id = explicit ?? process.env.SUS_COORD_AGENT;
  if (!id) throw new UsageError('agent id required (--as <id> or SUS_COORD_AGENT)');
  return id;
}

// ------------------------------------------------------------------- claims

function claimFile(root, task) {
  return join(paths(root).claims, `${String(task).replace(/[^\w.-]/g, '_')}.json`);
}

/** Path ownership overlap: exact match or directory prefix on a path boundary. */
export function pathsOverlap(a, b) {
  if (!a || !b) return false;
  const norm = (p) => p.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+$/, '');
  const x = norm(a);
  const y = norm(b);
  if (x === y) return true;
  return x.startsWith(`${y}${sep}`) || y.startsWith(`${x}${sep}`);
}

export function listClaims(root) {
  return listJson(paths(root).claims)
    .map((c) => ({ ...c, live: live(c, 'ttlSec', DEFAULT_TTL) }))
    .sort((a, b) => String(a.task).localeCompare(String(b.task)));
}

/**
 * Take an exclusive claim on a task (+ optional paths).
 * Refuses when another *live* agent holds the task or an overlapping path.
 * A dead/stale holder is taken over automatically and the takeover is logged.
 */
export function claim(
  root,
  { agent, task, ownerPaths = [], note = '', ttlSec = DEFAULT_TTL, pid = process.pid },
) {
  const record = {
    task,
    agent,
    paths: ownerPaths.map((p) => p.replace(/\\/g, '/')),
    note,
    pid,
    ttlSec,
    baseSha: git(['rev-parse', 'HEAD']),
    baseBranch: git(['rev-parse', '--abbrev-ref', 'HEAD']),
    startedAt: nowIso(),
    heartbeatAt: nowIso(),
  };
  const file = claimFile(root, task);

  const conflicts = listClaims(root).filter(
    (c) =>
      c.live &&
      c.agent !== agent &&
      c.paths?.some((p) => ownerPaths.some((mine) => pathsOverlap(p, mine))),
  );
  if (conflicts.length > 0) {
    return {
      ok: false,
      reason: 'path-conflict',
      conflicts: conflicts.map((c) => ({ task: c.task, agent: c.agent, paths: c.paths })),
    };
  }

  if (createExclusive(file, record)) {
    log(root, { ev: 'claim', agent, task, paths: record.paths });
    return { ok: true, claim: record };
  }

  const held = readJson(file, null);
  if (held === null) {
    // Holder vanished between create and read: refuse rather than risk a double win.
    return { ok: false, reason: 'race-retry' };
  }
  if (held && held.agent === agent) {
    writeJson(file, { ...held, ...record, startedAt: held.startedAt ?? record.startedAt });
    log(root, { ev: 'reclaim', agent, task });
    return { ok: true, claim: record, renewed: true };
  }
  if (held && live(held, 'ttlSec', DEFAULT_TTL)) {
    return {
      ok: false,
      reason: 'held',
      holder: { task: held.task, agent: held.agent, note: held.note },
    };
  }

  // Stale or crashed holder: take over (logged, never silent).
  try {
    unlinkSync(file);
  } catch {
    /* raced with another takeover: fall through to the create retry */
  }
  if (createExclusive(file, record)) {
    log(root, { ev: 'takeover', agent, task, from: held?.agent ?? null, stale: true });
    return { ok: true, claim: record, tookOverFrom: held?.agent ?? null };
  }
  return { ok: false, reason: 'held', holder: readJson(file, null) };
}

export function release(root, { agent, task, force = false }) {
  const file = claimFile(root, task);
  const held = readJson(file, null);
  if (!held) return { ok: true, released: false, reason: 'no-claim' };
  if (held.agent !== agent && !force) {
    return { ok: false, reason: 'not-owner', holder: held.agent };
  }
  unlinkSync(file);
  log(root, { ev: 'release', agent, task, forced: force && held.agent !== agent });
  return { ok: true, released: true, was: held.agent };
}

/** Refresh every claim + presence record owned by this agent. */
export function heartbeat(root, { agent }) {
  const at = nowIso();
  let claims = 0;
  for (const c of listClaims(root)) {
    if (c.agent === agent) {
      writeJson(claimFile(root, c.task), { ...c, heartbeatAt: at, pid: process.pid });
      claims += 1;
    }
  }
  const file = agentFile(root, agent);
  const rec = readJson(file, null);
  if (rec) writeJson(file, { ...rec, heartbeatAt: at, pid: process.pid });
  log(root, { ev: 'heartbeat', agent, claims });
  return { ok: true, at, claims };
}

class UsageError extends Error {}

// ----------------------------------------------------------------- messages

function messageId(prefix = 'm') {
  return `${prefix}${Date.now().toString(36)}-${randomBytes(3).toString('hex')}`;
}

function inboxDir(root, agent) {
  return join(paths(root).inbox, agent);
}

function readFile_(root, agent) {
  return join(paths(root).read, `${agent}.json`);
}

export function sendMessage(root, msg) {
  const record = {
    id: messageId(),
    at: nowIso(),
    type: 'notice',
    task: null,
    paths: [],
    replyTo: null,
    ...msg,
  };
  writeJson(join(inboxDir(root, record.to), `${record.id}.json`), record);
  writeJson(join(paths(root).sent, record.from, `${record.id}.json`), record);
  log(root, { ev: 'say', id: record.id, from: record.from, to: record.to, type: record.type });
  return record;
}

export function listInbox(root, { agent, includeSeen = false }) {
  const seen = readJson(readFile_(root, agent), { seen: [] }).seen ?? [];
  const seenIds = new Set(seen);
  return listJson(inboxDir(root, agent))
    .filter((m) => includeSeen || !seenIds.has(m.id))
    .sort((a, b) => String(a.at).localeCompare(String(b.at)));
}

export function markRead(root, { agent, ids }) {
  const file = readFile_(root, agent);
  const state = readJson(file, { seen: [] });
  const merged = [...new Set([...(state.seen ?? []), ...ids])].slice(-2000);
  writeJson(file, { seen: merged, updatedAt: nowIso() });
  return merged.length;
}

// -------------------------------------------------------------------- board

function gitSnapshot(cwd = process.cwd()) {
  const branch = git(['rev-parse', '--abbrev-ref', 'HEAD'], cwd) ?? '?';
  const head = (git(['rev-parse', '--short', 'HEAD'], cwd) ?? '?').slice(0, 7);
  const dirty = (git(['status', '--porcelain'], cwd) ?? '').split('\n').filter(Boolean);
  return { branch, head, dirty };
}

export function board(root, { agent } = {}) {
  const agents = listAgents(root);
  const claims = listClaims(root).filter((c) => c.live);
  const lines = [];
  lines.push(`SUS coordination bus — ${root}`);
  lines.push(
    `repo: ${gitSnapshot().branch} @ ${gitSnapshot().head}  dirty: ${gitSnapshot().dirty.length} path(s)`,
  );
  lines.push('');
  lines.push('AGENTS');
  if (agents.length === 0) lines.push('  (none registered)');
  for (const a of agents) {
    const age = Math.round(ageSeconds(a.heartbeatAt ?? a.registeredAt));
    const tag = a.live ? 'LIVE' : 'stale';
    lines.push(
      `  ${String(a.id).padEnd(12)} ${tag.padEnd(5)} hb ${String(age).padStart(5)}s  ${a.host ?? '?'}/${a.model ?? '?'}  br:${a.branch ?? '?'}${a.note ? `  — ${a.note}` : ''}`,
    );
  }
  lines.push('');
  lines.push('CLAIMS');
  if (claims.length === 0) lines.push('  (none)');
  for (const c of claims) {
    lines.push(
      `  ${String(c.task).padEnd(10)} by ${String(c.agent).padEnd(12)} hb ${Math.round(ageSeconds(c.heartbeatAt))}s  ${c.paths?.length ? c.paths.join(', ') : '(no paths)'}${c.note ? `  — ${c.note}` : ''}`,
    );
  }
  if (agent) {
    const unread = listInbox(root, { agent });
    lines.push('');
    lines.push(`INBOX ${agent}: ${unread.length} unread`);
    for (const m of unread.slice(-8)) {
      lines.push(
        `  [${m.type}] ${m.from} ${m.at}${m.task ? ` (${m.task})` : ''}: ${oneLine(m.body)}`,
      );
    }
  }
  return lines.join('\n');
}

function oneLine(text, max = 160) {
  const flat = String(text ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
}

// --------------------------------------------------------------------- wait

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Block until an unread message arrives or the timeout expires. */
export async function waitFor(
  root,
  { agent, timeoutSec = 120, intervalMs = 2000, untilType = null },
) {
  const deadline = Date.now() + timeoutSec * 1000;
  for (;;) {
    const unread = listInbox(root, { agent }).filter((m) => !untilType || m.type === untilType);
    if (unread.length > 0) return unread;
    if (Date.now() >= deadline) return [];
    await sleep(Math.min(intervalMs, Math.max(250, deadline - Date.now())));
  }
}

// ------------------------------------------------------------------- selftest

async function runSelftest() {
  const { mkdtempSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { spawn } = await import('node:child_process');
  const { fileURLToPath } = await import('node:url');
  const self = fileURLToPath(import.meta.url);
  const dir = mkdtempSync(join(tmpdir(), 'sus-coord-test-'));
  process.env.SUS_COORD_DIR = dir;
  const results = [];
  const t = (name, pass, detail = '') => results.push({ name, pass, detail });

  registerAgent(dir, { id: 'alpha', host: 'test', branch: 'b1', pid: process.pid });
  registerAgent(dir, { id: 'beta', host: 'test', branch: 'b2', pid: process.pid });
  t('register/list agents', listAgents(dir).length === 2);

  const c1 = claim(dir, { agent: 'alpha', task: 'T1', ownerPaths: ['packages/x/src'] });
  const c2 = claim(dir, { agent: 'beta', task: 'T1', ownerPaths: [] });
  t('exclusive task claim rejects second agent', c1.ok && !c2.ok && c2.reason === 'held');

  const c3 = claim(dir, {
    agent: 'beta',
    task: 'T2',
    ownerPaths: ['packages/x/src/inner/file.ts'],
  });
  t('overlapping path claim refused', !c3.ok && c3.reason === 'path-conflict');

  const c4 = claim(dir, { agent: 'beta', task: 'T3', ownerPaths: ['packages/y'] });
  t('disjoint path claim allowed', c4.ok);

  const c5 = claim(dir, { agent: 'alpha', task: 'T1', ownerPaths: ['packages/x/src'] });
  t('same-agent reclaim renews', c5.ok && c5.renewed === true);

  // stale takeover: old heartbeat (holder crashed or stopped heartbeating)
  writeJson(claimFile(dir, 'T9'), {
    task: 'T9',
    agent: 'ghost',
    paths: ['packages/z'],
    pid: 999_999_999,
    ttlSec: 900,
    startedAt: nowIso(),
    heartbeatAt: new Date(Date.now() - 3600_000).toISOString(),
  });
  const c6 = claim(dir, { agent: 'beta', task: 'T9', ownerPaths: ['packages/z'] });
  t('stale holder claim is taken over', c6.ok && c6.tookOverFrom === 'ghost');

  const deadPid = claim(dir, { agent: 'ghost2', task: 'T10', ownerPaths: ['packages/w'] });
  const c6b = claim(dir, { agent: 'beta', task: 'T10', ownerPaths: ['packages/w'] });
  t('fresh claim from an exited one-shot process stays owned', deadPid.ok && !c6b.ok);
  release(dir, { agent: 'ghost2', task: 'T10', force: true });

  heartbeat(dir, { agent: 'alpha' });
  const t1 = listClaims(dir).find((c) => c.task === 'T1');
  t('heartbeat refreshes claim', ageSeconds(t1.heartbeatAt) < 5);

  const m1 = sendMessage(dir, {
    from: 'alpha',
    to: 'beta',
    type: 'question',
    body: 'which task?',
    task: 'T1',
  });
  const m2 = sendMessage(dir, {
    from: 'beta',
    to: 'alpha',
    type: 'answer',
    body: 'T2',
    replyTo: m1.id,
  });
  t('message delivery', listInbox(dir, { agent: 'beta' }).length === 1);
  t('reply threading', m2.replyTo === m1.id);
  markRead(dir, { agent: 'beta', ids: [m1.id] });
  t('read cursor suppresses delivered message', listInbox(dir, { agent: 'beta' }).length === 0);
  t(
    'includeSeen still lists history',
    listInbox(dir, { agent: 'beta', includeSeen: true }).length === 1,
  );

  t('pathsOverlap prefix boundary', pathsOverlap('a/src', 'a/src-b') === false);

  const r = release(dir, { agent: 'beta', task: 'T1' });
  t('non-owner release refused', !r.ok && r.reason === 'not-owner');
  t('owner release', release(dir, { agent: 'alpha', task: 'T1' }).ok);

  // true concurrency: N processes race for one claim, exactly one must win
  const racers = Array.from(
    { length: 6 },
    (_, i) =>
      new Promise((res) => {
        const child = spawn(
          process.execPath,
          [self, 'claim', '--task', 'RACE', '--as', `racer${i}`, '--json'],
          {
            env: { ...process.env, SUS_COORD_DIR: dir },
          },
        );
        let out = '';
        child.stdout.on('data', (d) => (out += d));
        child.on('close', () => res(out.includes('"ok": true')));
      }),
  );
  const wins = (await Promise.all(racers)).filter(Boolean).length;
  t('6 concurrent processes -> exactly 1 claim winner', wins === 1, `${wins} winner(s)`);

  // repeated --path is the point of check-paths: assert the parser keeps all of them
  const parsed = parseArgv(['check-paths', '--path', 'a', '--path', 'b', '--strict']);
  t('repeated --path collected', multi(parsed.flags.path).length === 2);

  const failed = results.filter((x) => !x.pass);
  for (const x of results)
    console.log(`${x.pass ? 'PASS' : 'FAIL'} ${x.name}${x.detail ? ` — ${x.detail}` : ''}`);
  console.log(`\n${results.length - failed.length}/${results.length} passed  (bus: ${dir})`);
  return failed.length === 0 ? 0 : 1;
}

// ---------------------------------------------------------------------- CLI

function parseArgv(argv) {
  const positional = [];
  const flags = {};
  const set = (key, value) => {
    if (Object.prototype.hasOwnProperty.call(flags, key)) {
      const prev = flags[key];
      flags[key] = Array.isArray(prev) ? [...prev, value] : [prev, value];
    } else {
      flags[key] = value;
    }
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (!a.startsWith('--')) {
      positional.push(a);
      continue;
    }
    const [keyRaw, inline] = a.slice(2).split('=');
    const key = keyRaw.replace(/^no-/, '');
    if (inline !== undefined) {
      set(key, inline);
      continue;
    }
    const next = argv[i + 1];
    if (key.startsWith('no-')) {
      set(key, false);
    } else if (next !== undefined && !next.startsWith('--')) {
      set(key, next);
      i += 1;
    } else {
      set(key, true);
    }
  }
  return { positional, flags };
}

function multi(value) {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function print(obj, json) {
  if (json) {
    console.log(JSON.stringify(obj, null, 2));
    return;
  }
  if (typeof obj === 'string') console.log(obj);
  else console.log(JSON.stringify(obj, null, 2));
}

const HELP = `SUS inter-agent coordination bus

  register   --as <id> [--host h] [--model m] [--branch b] [--note "..."]
  whoami     [--as <id>]
  heartbeat  --as <id>
  claim      --as <id> --task T0704 [--path <p>]... [--note "..."] [--ttl 900] [--json]
  release    --as <id> --task T0704 [--force]
  claims     [--json] | agents [--json]
  say        --as <id> --to <id> [--type question|answer|notice|proposal] --body "..." [--task T] [--reply-to id] [--path p]
  ask        --as <id> --to <id> --body "..." [--task T]
  inbox      --as <id> [--all] [--json]
  wait       --as <id> [--timeout 120] [--type question]
  board      [--as <id>]
  check-paths --as <id> --path <p>... [--strict]
  negotiate  --as <id> --to <id> --offer "T0704 …" [--ask "..."]
  handshake  --as <id> --to <id>
  gc         [--days 7]
  selftest

Bus lives in <git-common-dir>/sus-coord (SUS_COORD_DIR overrides): invisible to
git status, shared by all worktrees. Task status remains TASKS.json.
Docs: docs/AGENT_COORDINATION.md`;

async function main(argv) {
  const { positional, flags } = parseArgv(argv);
  const cmd = positional[0] ?? 'help';
  const root = busRoot();
  const json = Boolean(flags.json);
  const as = typeof flags.as === 'string' ? flags.as : process.env.SUS_COORD_AGENT;

  switch (cmd) {
    case 'help':
    case '--help':
      console.log(HELP);
      return 0;

    case 'register': {
      const id = resolveAgent(root, as);
      const rec = registerAgent(root, {
        id,
        host: typeof flags.host === 'string' ? flags.host : (process.env.SUS_HOST ?? 'unknown'),
        model:
          typeof flags.model === 'string'
            ? flags.model
            : (process.env.SUS_MODEL ?? process.env.PI_MODEL ?? 'unknown'),
        branch:
          typeof flags.branch === 'string'
            ? flags.branch
            : git(['rev-parse', '--abbrev-ref', 'HEAD']),
        worktree: process.cwd(),
        pid: process.pid,
        note: typeof flags.note === 'string' ? flags.note : '',
      });
      print(rec, json);
      return 0;
    }

    case 'whoami': {
      const id = resolveAgent(root, as);
      print(listAgents(root).find((a) => a.id === id) ?? { id, registered: false }, json);
      return 0;
    }

    case 'heartbeat': {
      print(heartbeat(root, { agent: resolveAgent(root, as) }), json);
      return 0;
    }

    case 'claim': {
      const agent = resolveAgent(root, as);
      if (!flags.task) throw new UsageError('--task is required');
      const res = claim(root, {
        agent,
        task: flags.task,
        ownerPaths: multi(flags.path),
        note: typeof flags.note === 'string' ? flags.note : '',
        ttlSec: flags.ttl ? Number(flags.ttl) : DEFAULT_TTL,
      });
      print(res, json || !res.ok ? true : json);
      if (!res.ok) {
        console.error(
          res.reason === 'held'
            ? `REFUSED: ${flags.task} is held by ${res.holder?.agent ?? '?'}${res.holder?.note ? ` — ${res.holder.note}` : ''}`
            : `REFUSED: path conflict with ${res.conflicts.map((c) => `${c.task}/${c.agent}`).join(', ')}`,
        );
        return 1;
      }
      return 0;
    }

    case 'release': {
      const res = release(root, {
        agent: resolveAgent(root, as),
        task: flags.task,
        force: Boolean(flags.force),
      });
      print(res, json);
      return res.ok ? 0 : 1;
    }

    case 'claims':
      print(listClaims(root), json);
      return 0;

    case 'agents':
      print(listAgents(root), json);
      return 0;

    case 'say':
    case 'ask': {
      const from = resolveAgent(root, as);
      if (!flags.to) throw new UsageError('--to is required');
      if (!flags.body) throw new UsageError('--body is required');
      const msg = sendMessage(root, {
        from,
        to: flags.to,
        type: cmd === 'ask' ? 'question' : (flags.type ?? 'notice'),
        body: flags.body,
        task: typeof flags.task === 'string' ? flags.task : null,
        replyTo: typeof flags['reply-to'] === 'string' ? flags['reply-to'] : null,
        paths: multi(flags.path),
      });
      print(msg, json);
      if (!json) {
        console.error(
          `\nDelivered to ${msg.to}. They run: node scripts/coord/coordination.mjs inbox --as ${msg.to}`,
        );
      }
      return 0;
    }

    case 'inbox': {
      const agent = resolveAgent(root, as);
      const msgs = listInbox(root, { agent, includeSeen: Boolean(flags.all) });
      if (json) {
        print(msgs, true);
      } else if (msgs.length === 0) {
        console.log(`inbox ${agent}: empty`);
      } else {
        for (const m of msgs) {
          console.log(
            `[${m.type}] ${m.from} -> ${m.to}  ${m.at}  id=${m.id}${m.task ? `  task=${m.task}` : ''}`,
          );
          console.log(`  ${String(m.body).replace(/\n/g, '\n  ')}`);
          if (m.replyTo) console.log(`  reply-to=${m.replyTo}`);
          console.log('');
        }
      }
      if (!flags.all) markRead(root, { agent, ids: msgs.map((m) => m.id) });
      return 0;
    }

    case 'wait': {
      const agent = resolveAgent(root, as);
      const got = await waitFor(root, {
        agent,
        timeoutSec: flags.timeout ? Number(flags.timeout) : 120,
        untilType: typeof flags.type === 'string' ? flags.type : null,
      });
      if (got.length === 0) {
        print({ ok: false, reason: 'timeout', agent }, json);
        return 1;
      }
      print(got, json);
      markRead(root, { agent, ids: got.map((m) => m.id) });
      return 0;
    }

    case 'board':
      console.log(board(root, { agent: as }));
      return 0;

    case 'check-paths': {
      const agent = resolveAgent(root, as);
      const mine = multi(flags.path);
      if (mine.length === 0) throw new UsageError('--path is required');
      const clashes = listClaims(root).filter(
        (c) =>
          c.live && c.agent !== agent && c.paths?.some((p) => mine.some((m) => pathsOverlap(p, m))),
      );
      const snap = gitSnapshot();
      const dirtyHits = snap.dirty.filter((line) => mine.some((m) => line.includes(m)));
      const ok = clashes.length === 0 && (!flags.strict || dirtyHits.length === 0);
      print(
        { ok, checked: mine, clashes, dirtyHits, branch: snap.branch, head: snap.head },
        json || true,
      );
      return ok ? 0 : 1;
    }

    case 'negotiate': {
      const from = resolveAgent(root, as);
      if (!flags.to) throw new UsageError('--to is required');
      const body =
        `COORDINATION REQUEST from ${from} (${git(['rev-parse', '--abbrev-ref', 'HEAD'])}).\n` +
        `1) Which task do you currently hold, and which task will you take next?\n` +
        `2) Do you claim any of these paths? (list them)\n` +
        `I propose to work on: ${flags.offer ?? '(unspecified)'}.\n` +
        `If that does not overlap your plan, take/keep your claim and reply "answer" with your task+paths; ` +
        `I will claim ${flags.offer ?? 'my task'} and stay out of your files and canonical state.\n` +
        `Reply with: node scripts/coord/coordination.mjs say --as ${flags.to} --to ${from} --type answer --body "..."`;
      const msg = sendMessage(root, { from, to: flags.to, type: 'question', body, task: null });
      print(msg, json);
      if (!json) {
        console.error(
          `\nAsked ${flags.to}. While waiting, poll with:\n  node scripts/coord/coordination.mjs wait --as ${from} --timeout 120 --type answer`,
        );
      }
      return 0;
    }

    case 'handshake': {
      const from = resolveAgent(root, as);
      const msg = sendMessage(root, {
        from,
        to: flags.to,
        type: 'question',
        body:
          `HELLO from ${from}. Shared-file safety handshake: reply with your current task, your next task, ` +
          `and the paths you own. Bus: node scripts/coord/coordination.mjs board`,
      });
      print(msg, json);
      return 0;
    }

    case 'gc': {
      const days = flags.days ? Number(flags.days) : 7;
      let removed = 0;
      for (const c of listClaims(root)) {
        if (!c.live && ageSeconds(c.heartbeatAt) > days * 86_400) {
          unlinkSync(claimFile(root, c.task));
          removed += 1;
        }
      }
      for (const a of listAgents(root)) {
        if (!a.live && ageSeconds(a.heartbeatAt ?? a.registeredAt) > days * 86_400) {
          unlinkSync(agentFile(root, a.id));
          removed += 1;
        }
      }
      log(root, { ev: 'gc', removed, days });
      print({ ok: true, removed, days }, json || true);
      return 0;
    }

    case 'selftest':
      return runSelftest();

    default:
      throw new UsageError(`unknown command "${cmd}" (see --help)`);
  }
}

const isMain =
  process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname);
if (isMain) {
  main(process.argv.slice(2))
    .then((code) => process.exit(code ?? 0))
    .catch((err) => {
      if (err instanceof UsageError) {
        console.error(`usage error: ${err.message}`);
        process.exit(2);
      }
      console.error(err?.stack ?? String(err));
      process.exit(2);
    });
}

export { main, claimFile, agentFile, gitSnapshot, nowIso };
