#!/usr/bin/env node
/**
 * T1032 (issue #21 R3) — one entry point.
 *
 * Before this, using SUS meant knowing `./packages/{adapters,eval-core,scanners}/dist/cli.js`, or
 * three `pnpm exec sus-…` names that do not appear anywhere a user starts reading. This dispatcher
 * adds no behaviour of its own: it hands the remaining arguments to the CLI that already owns the
 * command and returns that CLI's exit code unchanged, so `sus audit …` and `sus-eval audit …` cannot
 * disagree.
 *
 * Nothing here is published: the repository is public (D34) but the product is not released (T1005),
 * so this is an in-repo entry point (`pnpm exec sus …` / `node bin/sus.mjs …`).
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

/** Every command the three CLIs advertise, mapped to the package that owns it. */
const OWNERS = {
  'eval-core': ['audit', 'bestpractice', 'capture', 'evidence', 'score', 'budget'],
  adapters: ['route', 'load', 'precedence', 'capabilities', 'status'],
  scanners: ['scan'],
};

const CLI = {
  'eval-core': join(ROOT, 'packages/eval-core/dist/cli.js'),
  adapters: join(ROOT, 'packages/adapters/dist/cli.js'),
  scanners: join(ROOT, 'packages/scanners/dist/cli.js'),
};

/** `sus-scan` takes a path, not a subcommand, so its owner is handed no command word. */
const TAKES_COMMAND_WORD = { 'eval-core': true, adapters: true, scanners: false };

export const COMMANDS = Object.fromEntries(
  Object.entries(OWNERS).flatMap(([owner, commands]) =>
    commands.map((command) => [command, owner]),
  ),
);

export const USAGE =
  'usage: sus <command> [args...]\n' +
  '\n' +
  '  audit, bestpractice, capture, evidence, score, budget   (eval-core: reports and proposals)\n' +
  '  scan                                                    (scanners: anti-slop findings)\n' +
  '  route, load, precedence, capabilities, status           (adapters: intents and host support)\n' +
  '\n' +
  'Each command is the CLI that already owns it; arguments and exit codes pass through unchanged,\n' +
  'so `sus audit --help` shows exactly what `sus-eval audit --help` shows.\n' +
  '\n' +
  'Run `pnpm build` first: these commands run the built packages, not the sources.\n';

export function plan(argv) {
  const [command, ...rest] = argv;
  if (command === undefined || command === '--help' || command === '-h' || command === 'help') {
    return { kind: command === undefined ? 'usage-error' : 'help', rest };
  }
  const owner = COMMANDS[command];
  if (owner === undefined) {
    return { kind: 'unknown', command, rest };
  }
  return {
    kind: 'run',
    command,
    owner,
    cli: CLI[owner],
    argv: TAKES_COMMAND_WORD[owner] === true ? [command, ...rest] : rest,
  };
}

function main(argv) {
  const step = plan(argv);
  if (step.kind === 'help') {
    process.stdout.write(USAGE);
    return 0;
  }
  if (step.kind === 'usage-error') {
    process.stderr.write(USAGE);
    return 2;
  }
  if (step.kind === 'unknown') {
    // Naming the closest command would be a guess; list what exists instead.
    process.stderr.write('unknown command "' + step.command + '"\n\n' + USAGE);
    return 2;
  }
  if (!existsSync(step.cli)) {
    process.stderr.write(
      'error: ' + step.owner + ' is not built (' + step.cli + ')\nrun: pnpm build\n',
    );
    return 2;
  }
  const run = spawnSync(process.execPath, [step.cli, ...step.argv], { stdio: 'inherit' });
  if (run.error !== undefined) {
    process.stderr.write('error: could not run ' + step.cli + ': ' + run.error.message + '\n');
    return 2;
  }
  // Pass the child's code through: SUS exit codes are contractual and a wrapper that rewrote them
  // would break every script that reads them.
  return run.status ?? 2;
}

process.exitCode = main(process.argv.slice(2));
