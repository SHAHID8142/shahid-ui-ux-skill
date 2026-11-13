#!/usr/bin/env node
/**
 * SUS skill installer (T0904).
 *
 * Installs the canonical skill bundle (skill/) into a destination directory
 * as `<dest>/<frontmatter-name>/`. The Agent Skills spec requires the
 * installed directory name to match the SKILL.md frontmatter `name`, so the
 * name is read from the source frontmatter at runtime — never hardcoded; if
 * the frontmatter name ever differs from 'shahid-ui-ux-skill', that name is
 * used.
 *
 * Commands:
 *   install   --dest <dir> [--force]   copy the bundle to <dir>/<name>/
 *   uninstall --dest <dir>             remove <dir>/<name>/ (safety-checked)
 *   status    --dest <dir>             installed / partial / not-installed
 *
 * Safety model ("no silent installs", uninstall preserves user files DA-45):
 * - install refuses to overwrite an existing installation without --force.
 * - install records every file it created in `.sus-install-manifest.json`
 *   inside the installed directory (transactional install record).
 * - uninstall refuses (fail-closed, exit 3) when the installed directory
 *   contains files outside the recorded manifest — user files are preserved —
 *   or when no manifest exists and the contents therefore cannot be verified.
 * - install --force replaces the recorded installation only: manifest-listed
 *   files are removed, files outside the record are preserved (except a file
 *   sitting exactly at a path the new bundle ships, which is overwritten —
 *   --force is explicit overwrite consent). Without a manifest there is
 *   nothing to preserve and the directory is replaced wholesale.
 *
 * Exit codes: 0 success (an honest "not installed" status is success);
 * 1 operational failure (broken source bundle, unexpected filesystem error);
 * 2 invalid usage; 3 safety refusal (overwrite without --force, unsafe
 * uninstall target).
 *
 * Pure Node stdlib: no dependencies. The source bundle is located relative to
 * this script (`../../skill`), so the CLI works from any working directory.
 */
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const SOURCE_SKILL = resolve(SCRIPT_DIR, '..', '..', 'skill');
const DEFAULT_SKILL_NAME = 'shahid-ui-ux-skill';
const MANIFEST_NAME = '.sus-install-manifest.json';
const NAME_PATTERN = /^[\w-]+$/;
// Bundle entries copied on install. The repo-facing README.md is not bundle
// content (ADR-002 bundle = SKILL.md + references/ + scripts/ + evals/).
const COPY_ENTRIES = ['SKILL.md', 'references', 'scripts', 'evals'];

const USAGE = `usage:
  node scripts/install/install.mjs install   --dest <dir> [--force]
  node scripts/install/install.mjs uninstall --dest <dir>
  node scripts/install/install.mjs status    --dest <dir>

<dir> is the destination directory that contains (or will contain) the
installed skill directory <dir>/<frontmatter-name>. Exit codes:
0 success, 1 operational failure, 2 invalid usage, 3 safety refusal.`;

function fail(exitCode, message) {
  console.error(message);
  process.exit(exitCode);
}

function parseFrontmatter(text) {
  const m = /^---\n([\s\S]*?)\n---\n/.exec(text);
  if (!m) return null;
  const fm = {};
  for (const line of m[1].split('\n')) {
    const kv = /^([a-zA-Z]+):\s*(.*)$/.exec(line);
    if (kv) fm[kv[1].toLowerCase()] = kv[2].trim();
  }
  return fm;
}

function listFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(p));
    else if (entry.isFile()) out.push(p);
  }
  return out;
}

function relPosix(root, p) {
  return relative(root, p).split('\\').join('/');
}

/** Best-effort installed-name lookup; install itself is strict about the source. */
function installedDirName() {
  const p = join(SOURCE_SKILL, 'SKILL.md');
  if (!existsSync(p)) return DEFAULT_SKILL_NAME;
  const fm = parseFrontmatter(readFileSync(p, 'utf8'));
  const name = fm?.name;
  return typeof name === 'string' && NAME_PATTERN.test(name) ? name : DEFAULT_SKILL_NAME;
}

function resolveInstalledDir(dest, name) {
  const inDest = join(dest, name);
  if (existsSync(inDest) && statSync(inDest).isDirectory()) return inDest;
  // Tolerate --dest pointing at the installed skill directory itself.
  if (basename(resolve(dest)) === name && existsSync(join(dest, 'SKILL.md'))) {
    return resolve(dest);
  }
  return null;
}

function safeManifestFiles(manifest) {
  const files = Array.isArray(manifest?.files) ? manifest.files : [];
  // Reject anything that escapes the installation directory.
  return files.filter(
    (f) =>
      typeof f === 'string' &&
      f.length > 0 &&
      !f.startsWith('/') &&
      !f.split('/').some((seg) => seg === '..' || seg === '.' || seg === ''),
  );
}

function pruneEmptyDirs(root) {
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const child = join(root, entry.name);
    pruneEmptyDirs(child);
    if (readdirSync(child).length === 0) rmSync(child, { recursive: true, force: true });
  }
}

function parseCommand(argv) {
  const command = argv[0];
  const flags = { dest: null, force: false };
  for (let i = 1; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--force') {
      flags.force = true;
    } else if (a === '--dest') {
      flags.dest = argv[i + 1] ?? null;
      i += 1;
    } else {
      return null; // unknown flag or unexpected positional
    }
  }
  return command && flags.dest ? { command, dest: flags.dest, force: flags.force } : null;
}

function cmdInstall(dest, force) {
  const sourceSkillMd = join(SOURCE_SKILL, 'SKILL.md');
  if (!existsSync(sourceSkillMd)) {
    fail(1, `install: source bundle missing — ${sourceSkillMd} does not exist`);
  }
  const fm = parseFrontmatter(readFileSync(sourceSkillMd, 'utf8')) ?? {};
  const name = fm.name;
  if (typeof name !== 'string' || !NAME_PATTERN.test(name)) {
    fail(
      1,
      'install: source SKILL.md frontmatter has no valid `name` — refusing to produce a bundle the Agent Skills spec would reject',
    );
  }
  const target = join(dest, name);

  let replaceNote = null;
  if (existsSync(target)) {
    if (!force) {
      fail(
        3,
        `install: ${target} already exists — refusing to overwrite without --force (pass --force to replace the installation)`,
      );
    }
    const manifestPath = join(target, MANIFEST_NAME);
    if (existsSync(manifestPath)) {
      let oldManifest;
      try {
        oldManifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
      } catch {
        oldManifest = undefined; // unreadable record → treat as wholesale replace below
      }
      if (oldManifest) {
        const recorded = new Set([...safeManifestFiles(oldManifest), MANIFEST_NAME]);
        const foreign = listFiles(target)
          .map((p) => relPosix(target, p))
          .filter((f) => !recorded.has(f));
        for (const rel of safeManifestFiles(oldManifest)) {
          rmSync(join(target, ...rel.split('/')), { force: true });
        }
        rmSync(manifestPath, { force: true });
        pruneEmptyDirs(target);
        replaceNote =
          foreign.length > 0
            ? `replaced recorded installation (--force): ${foreign.length} file(s) outside the record were preserved`
            : 'replaced recorded installation (--force)';
      }
    }
    if (!replaceNote) {
      rmSync(target, { recursive: true, force: true });
      replaceNote = 'replaced existing directory (--force, no install record to preserve)';
    }
  }

  mkdirSync(dest, { recursive: true });
  for (const entry of COPY_ENTRIES) {
    const src = join(SOURCE_SKILL, entry);
    if (existsSync(src)) cpSync(src, join(target, entry), { recursive: true });
  }
  const files = listFiles(target).map((p) => relPosix(target, p));
  const manifest = {
    installer: 'sus-installer',
    skill: name,
    version: typeof fm.version === 'string' ? fm.version : null,
    installedAt: new Date().toISOString(),
    files,
  };
  writeFileSync(join(target, MANIFEST_NAME), `${JSON.stringify(manifest, null, 2)}\n`);

  console.log(`installed: ${name}`);
  console.log(`location: ${target}`);
  console.log(`files: ${files.length}`);
  for (const f of files) console.log(`  ${f}`);
  console.log(`manifest: ${MANIFEST_NAME} (uninstall refuses to remove files outside it)`);
  if (replaceNote) console.log(replaceNote);
}

function cmdUninstall(dest) {
  const name = installedDirName();
  const target = resolveInstalledDir(dest, name);
  if (!target) {
    console.log(`not installed at ${join(dest, name)} — nothing to uninstall`);
    return;
  }
  const manifestPath = join(target, MANIFEST_NAME);
  if (!existsSync(manifestPath)) {
    fail(
      3,
      `uninstall: safety refusal — ${manifestPath} is missing, so the directory contents cannot be verified against an installation record. Remove ${target} manually if you are sure it holds no user files.`,
    );
  }
  let manifest = null;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch (e) {
    fail(3, `uninstall: safety refusal — install manifest is unreadable: ${String(e)}`);
  }
  const recorded = safeManifestFiles(manifest);
  const known = new Set([...recorded, MANIFEST_NAME]);
  const foreign = listFiles(target)
    .map((p) => relPosix(target, p))
    .filter((f) => !known.has(f));
  if (foreign.length > 0) {
    fail(
      3,
      `uninstall: safety refusal — ${foreign.length} file(s) inside ${target} are not part of the recorded installation and are preserved (user files):\n  ${foreign.join('\n  ')}`,
    );
  }
  rmSync(target, { recursive: true, force: true });
  console.log(`uninstalled: ${name}`);
  console.log(`removed ${recorded.length} installed file(s) from ${target}`);
}

function cmdStatus(dest) {
  const name = installedDirName();
  const target = resolveInstalledDir(dest, name);
  if (!target) {
    console.log('STATUS: not-installed');
    console.log(`expected: ${join(dest, name)}`);
    return;
  }
  const skillMd = join(target, 'SKILL.md');
  if (!existsSync(skillMd)) {
    console.log('STATUS: partial — directory exists but SKILL.md is missing');
    console.log(`location: ${target}`);
    return;
  }
  const fm = parseFrontmatter(readFileSync(skillMd, 'utf8')) ?? {};
  console.log('STATUS: installed');
  console.log(`location: ${target}`);
  console.log(`name: ${typeof fm.name === 'string' ? fm.name : '(missing)'}`);
  console.log(`version: ${typeof fm.version === 'string' ? fm.version : '(not set)'}`);
  console.log(`files: ${listFiles(target).length}`);
}

const parsed = parseCommand(process.argv.slice(2));
if (!parsed) fail(2, USAGE);
try {
  switch (parsed.command) {
    case 'install':
      cmdInstall(parsed.dest, parsed.force);
      break;
    case 'uninstall':
      cmdUninstall(parsed.dest);
      break;
    case 'status':
      cmdStatus(parsed.dest);
      break;
    default:
      fail(2, USAGE);
  }
} catch (e) {
  fail(1, `install: operational failure — ${String(e)}`);
}
