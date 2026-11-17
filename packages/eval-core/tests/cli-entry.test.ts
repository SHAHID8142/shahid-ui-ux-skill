/**
 * T1032 (issue #21 R3) — one entry point, and it cannot claim a command that does not exist.
 *
 * The dispatcher adds no behaviour: it hands arguments to the CLI that owns the command and returns
 * that CLI's exit code. The risk with a wrapper is drift — it lists a command the CLIs dropped, or
 * misses one they added — so the test reads each CLI's own usage line and compares.
 */
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error — the dispatcher is a plain .mjs entry point, not a typed module.
import { COMMANDS, USAGE, plan } from '../../../bin/sus.mjs';

const ROOT = process.cwd();
const run = (argv: string[]) =>
  spawnSync(process.execPath, [join(ROOT, 'bin/sus.mjs'), ...argv], { encoding: 'utf8' });

/** The commands each CLI advertises in its own usage line. */
const advertised = (): Record<string, string[]> => {
  const evalCore = spawnSync(process.execPath, [join(ROOT, 'packages/eval-core/dist/cli.js')], {
    encoding: 'utf8',
  });
  const adapters = spawnSync(
    process.execPath,
    [join(ROOT, 'packages/adapters/dist/cli.js'), '--help'],
    {
      encoding: 'utf8',
    },
  );
  const evalText = evalCore.stderr + evalCore.stdout;
  const adaptersText = adapters.stderr + adapters.stdout;
  const evalCommands = /sus-eval ([\w|]+)/.exec(evalText)?.[1]?.split('|') ?? [];
  const adapterCommands = /sus ([\w|]+)/.exec(adaptersText)?.[1]?.split('|') ?? [];
  return { 'eval-core': evalCommands, adapters: adapterCommands, scanners: ['scan'] };
};

describe('single entry point (issue #21 R3)', () => {
  it('maps exactly the commands the CLIs advertise', () => {
    const owners = advertised();
    const mapped = Object.entries(COMMANDS as Record<string, string>).reduce<
      Record<string, string[]>
    >((accumulator, [command, owner]) => {
      accumulator[owner] = [...(accumulator[owner] ?? []), command];
      return accumulator;
    }, {});
    for (const [owner, commands] of Object.entries(owners)) {
      expect(new Set(mapped[owner]), owner).toEqual(new Set(commands));
    }
  });

  it('prints usage and exits 2 with no command, and 0 for --help', () => {
    const bare = run([]);
    expect(bare.status).toBe(2);
    expect(bare.stderr).toContain('usage: sus <command>');
    const help = run(['--help']);
    expect(help.status).toBe(0);
    expect(help.stdout).toBe(USAGE);
  });

  it('refuses an unknown command without guessing a replacement', () => {
    const result = run(['auditt']);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('unknown command "auditt"');
    expect(result.stderr).not.toContain('did you mean');
  });

  it('passes arguments and exit codes through unchanged', () => {
    // A usage error in the child stays a usage error (2), not a wrapper-specific code.
    const bad = run(['audit', '--bogus']);
    expect(bad.status).toBe(2);
    expect(bad.stderr).toContain('--bogus');
    // The scanners CLI takes a path, not a command word; a clean file is exit 0.
    const scan = run(['scan', 'fixtures/bestpractice/scoped-axe/index.html']);
    expect(scan.status).toBe(0);
    // `--help` reaches the owner CLI rather than being answered by the wrapper.
    const auditHelp = run(['audit', '--help']);
    expect(auditHelp.status).toBe(0);
    expect(auditHelp.stdout).toContain('sus-eval audit');
  });

  it('plans a path for each owner, and keeps the command word only where the CLI takes one', () => {
    expect(plan(['route', 'x'])).toMatchObject({ kind: 'run', owner: 'adapters' });
    expect(plan(['scan', 'x'])).toMatchObject({ kind: 'run', owner: 'scanners' });
    expect(plan(['scan', 'x']).argv).toEqual(['x']);
    expect(plan(['audit', 'x']).argv).toEqual(['audit', 'x']);
  });
});
