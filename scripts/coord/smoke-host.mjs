#!/usr/bin/env node
/**
 * Identical host smoke test (T0902): every host runs THIS script unchanged;
 * passing it is the evidence that upgrades adapter tiers to 'verified'
 * (packages/adapters/src/adapter-interface.ts). Exit 0 = host passes, 1 = fail.
 *
 * Checks: (1) node runtime, (2) canonical skill bundle validates, (3) sus CLI
 * capability matrix honest, (4) route emits a schema-valid intent, (5) install
 * → doctor → uninstall round trip on a temp copy. JSON receipt on stdout.
 *
 * Implementation note: children run via spawnSync (not execFileSync) so spawn
 * errors surface in .error; run() takes args with a default — a missing
 * default parameter here once masked every check as "silent exit 1".
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { release as osRelease, tmpdir } from 'node:os';
import { isAbsolute, join } from 'node:path';

// repo root from THIS script's location (no cwd dependence)
const ROOT = join(import.meta.dirname, '..', '..');
import { ARTIFACT_ID, artifactSha256 } from '../lib/artifact-hash.mjs';
const results = [];
let failed = false;
function check(name, ok, detail = '') {
  results.push({ check: name, status: ok ? 'pass' : 'fail', detail: String(detail) });
  if (!ok) failed = true;
}

function run(script, args = [], cwd = ROOT) {
  const scriptPath = isAbsolute(script) ? script : join(ROOT, script);
  const r = spawnSync(process.execPath, [scriptPath, ...args], { encoding: 'utf8', cwd });
  if (r.error) return { status: 1, out: '', err: `SPAWN ERROR: ${String(r.error)}` };
  return { status: r.status ?? 1, out: r.stdout ?? '', err: r.stderr ?? '' };
}

// 1. runtime
check('node-runtime', typeof process.versions.node === 'string', `node ${process.versions.node}`);

// 2. canonical skill bundle validates on this host
const skill = run('scripts/validate-skill.mjs');
check(
  'skill-bundle-valid',
  skill.status === 0,
  skill.status === 0
    ? 'canonical bundle valid'
    : `out=${skill.out.slice(-160)} err=${skill.err.slice(-160)}`,
);

// 3. CLI capability matrix: exits clean, honest matrix content
const caps = run('packages/adapters/dist/cli.js', ['capabilities']);
check(
  'cli-capabilities',
  caps.status === 0 && caps.out.includes('honest degradation'),
  caps.out.split('\n')[0] ?? '',
);

// 4. routing emits a schema-valid intent for a marketing brief
const route = run('packages/adapters/dist/cli.js', [
  'route',
  'build a landing page hero for our marketing site',
]);
let routeOk;
try {
  const intent = JSON.parse(route.out);
  routeOk =
    intent.surface === 'marketing' && Array.isArray(intent.modules) && intent.modules.length > 0;
} catch {
  routeOk = false;
}
check('cli-route-intent', routeOk, routeOk ? 'schema-valid intent emitted' : route.out.slice(-160));

// 5. install → doctor → uninstall round trip on a temp copy
const tmp = mkdtempSync(join(tmpdir(), 'sus-smoke-'));
const install = run('scripts/install/install.mjs', ['install', '--dest', tmp]);
check(
  'install-roundtrip',
  install.status === 0,
  install.status === 0 ? 'installed' : install.out.slice(-160),
);
const doctor = run('scripts/install/doctor.mjs', ['--dir', join(tmp, 'shahid-ui-ux-skill')]);
check(
  'doctor-pass',
  doctor.status === 0,
  doctor.status === 0 ? 'installed bundle valid' : doctor.out.slice(-160),
);
const uninstall = run('scripts/install/install.mjs', ['uninstall', '--dest', tmp]);
check(
  'uninstall-clean',
  uninstall.status === 0,
  uninstall.status === 0 ? 'removed' : uninstall.out.slice(-160),
);
rmSync(tmp, { recursive: true, force: true });

const verdict = failed ? 'FAIL' : 'PASS';
console.log(
  JSON.stringify(
    {
      script: 'scripts/coord/smoke-host.mjs (identical for every host)',
      verdict,
      node: process.versions.node,
      at: new Date().toISOString(),
      // T0905: evidence binds to the artifact bytes it ran against, so a later
      // adapter change invalidates this run instead of silently inheriting it.
      artifact: { id: ARTIFACT_ID, sha256: artifactSha256(ROOT) },
      environment: {
        hostVersion: process.env.SUS_HOST_VERSION ?? 'unrecorded',
        browser: process.env.SUS_BROWSER ?? 'n/a (no Live Studio run)',
        framework: process.env.SUS_FRAMEWORK ?? 'n/a (no fixture build)',
        os: `${process.platform} ${osRelease()}`,
      },
      results,
    },
    null,
    2,
  ),
);
process.exitCode = failed ? 1 : 0;
