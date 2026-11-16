/**
 * The `sus-eval` command surface, exercised as a user would type it.
 *
 * Found by hand while checking readiness: `sus-eval score --help` crashed with a Node-internal
 * `ERR_PARSE_ARGS_UNKNOWN_OPTION` stack, and running the binary with no command printed
 * `unknown command "undefined"`. Both are usage errors, and a usage error has to read like one.
 *
 * These tests spawn the built binary (`dist/cli.js`), because the defect was in argument handling,
 * not in the functions behind it.
 */
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const CLI = join(process.cwd(), 'packages', 'eval-core', 'dist', 'cli.js');

function run(args: string[]): { status: number; out: string; err: string } {
  try {
    return {
      status: 0,
      out: execFileSync(process.execPath, [CLI, ...args], { encoding: 'utf8' }),
      err: '',
    };
  } catch (error) {
    const failure = error as { status?: number; stdout?: string; stderr?: string };
    return {
      status: failure.status ?? -1,
      out: String(failure.stdout ?? ''),
      err: String(failure.stderr ?? ''),
    };
  }
}

describe('sus-eval usage contract', () => {
  it('answers --help for every subcommand with a usage line and exit 0', () => {
    // audit and bestpractice have their own long help; the four small commands get a usage line.
    const longHelp = new Set(['audit', 'bestpractice']);
    for (const command of ['score', 'capture', 'evidence', 'budget', 'audit', 'bestpractice']) {
      const result = run([command, '--help']);
      expect(result.status, command).toBe(0);
      expect(result.out, command).toContain(
        longHelp.has(command) ? 'sus-eval ' + command : 'usage: sus-eval ' + command,
      );
      if (longHelp.has(command)) expect(result.out.toLowerCase(), command).toContain('usage:');
      expect(result.err, command).toBe('');
    }
  }, 60000);

  it('turns an unknown option into a usage error, not a stack trace', () => {
    const result = run(['score', '--in', 'x.json', '--nonsense']);
    expect(result.status).toBe(2);
    expect(result.err).toContain('usage: sus-eval score');
    // The old failure printed `node:internal/util/parse_args/...` and a caret diagram.
    expect(result.err).not.toContain('node:internal');
    expect(result.err).not.toContain('ERR_PARSE_ARGS');
  });

  it('says no command was given instead of `unknown command "undefined"`', () => {
    const result = run([]);
    expect(result.status).toBe(2);
    expect(result.err).toContain('no command given');
    expect(result.err).not.toContain('undefined');
    expect(result.err).toContain('usage: sus-eval');
  });
});
