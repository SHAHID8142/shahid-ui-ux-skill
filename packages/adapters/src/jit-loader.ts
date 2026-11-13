/**
 * Just-in-time module loader (T0203).
 *
 * Loads only the modules an intent needs, from a registry that maps module
 * ids to skill-bundle paths. Token cost per load is measured (chars/4
 * estimate, the same conservative method as the skill validator) and checked
 * against an explicit budget — over-budget loads are REFUSED, not truncated
 * silently. Modules that are registered but not yet built carry
 * status: 'not-built' and are skipped with an honest report (never served
 * as empty content).
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { IntentData } from '@sus/schemas';

export interface ModuleDescriptor {
  id: string;
  /** Repo-relative path inside the skill bundle (or null until built). */
  path: string | null;
  status: 'built' | 'not-built';
}

export interface LoadedModule {
  id: string;
  path: string;
  tokensEstimate: number;
  content: string;
}

export interface LoadReport {
  loaded: LoadedModule[];
  skipped: Array<{ id: string; reason: string }>;
  totalTokensEstimate: number;
  budget: number;
  withinBudget: boolean;
  /** true when any wanted module was refused for the budget (never truncated). */
  budgetExceeded: boolean;
}

export const DEFAULT_LOAD_BUDGET = 20_000;

/** Module registry — mirrors skill/references/surfaces.md honesty status. */
export function moduleRegistry(): ModuleDescriptor[] {
  return [
    { id: 'direction-reasoning', path: null, status: 'not-built' },
    { id: 'tokens', path: null, status: 'not-built' },
    { id: 'foundations', path: null, status: 'not-built' },
    { id: 'playbook:marketing', path: null, status: 'not-built' },
    { id: 'playbook:commerce', path: null, status: 'not-built' },
    { id: 'playbook:operate', path: null, status: 'not-built' },
    { id: 'playbook:portfolio', path: null, status: 'not-built' },
    { id: 'copy-seo', path: 'skill/references/copy-seo.md', status: 'built' },
    { id: 'motion', path: null, status: 'not-built' },
    { id: 'research', path: null, status: 'not-built' },
    { id: 'scanner', path: null, status: 'not-built' },
    { id: 'progressive-workflow', path: null, status: 'not-built' },
    { id: 'studio', path: null, status: 'not-built' },
    { id: 'precedence', path: 'skill/references/precedence.md', status: 'built' },
    { id: 'surfaces', path: 'skill/references/surfaces.md', status: 'built' },
  ];
}

export function loadModules(
  intent: IntentData,
  repoRoot: string,
  budget: number = DEFAULT_LOAD_BUDGET,
): LoadReport {
  const registry = moduleRegistry();
  const wanted = new Set(['precedence', 'surfaces', ...intent.modules]);
  const loaded: LoadedModule[] = [];
  const skipped: LoadReport['skipped'] = [];
  let total = 0;
  for (const mod of registry) {
    if (!wanted.has(mod.id)) continue;
    if (mod.status === 'not-built' || mod.path === null) {
      skipped.push({ id: mod.id, reason: 'module registered but not built yet (honest skip)' });
      continue;
    }
    const abs = join(repoRoot, mod.path);
    if (!existsSync(abs)) {
      skipped.push({ id: mod.id, reason: `declared path missing: ${mod.path}` });
      continue;
    }
    const content = readFileSync(abs, 'utf8');
    const tokensEstimate = Math.ceil(content.length / 4);
    if (total + tokensEstimate > budget) {
      skipped.push({
        id: mod.id,
        reason: `load budget exceeded (would need ${total + tokensEstimate} > ${budget} est. tokens) — refused, not truncated`,
      });
      continue;
    }
    total += tokensEstimate;
    loaded.push({ id: mod.id, path: mod.path, tokensEstimate, content });
  }
  return {
    loaded,
    skipped,
    totalTokensEstimate: total,
    budget,
    withinBudget: total <= budget && !skipped.some((x) => /budget exceeded/.test(x.reason)),
    budgetExceeded: skipped.some((x) => /budget exceeded/.test(x.reason)),
  };
}
