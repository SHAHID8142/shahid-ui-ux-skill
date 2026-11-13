/**
 * Intent contract (T0202). A routed intent names the surface mode, the
 * action, and the EXPLICIT set of modules that serve it. The router maps
 * every intent to that module set; an unknown intent yields an honest
 * fallback (ask + research modules), never a guessed module.
 */
import { z } from 'zod';
import { defineSusSchema } from './versioning.js';

export const SURFACES = ['marketing', 'commerce', 'operate', 'portfolio'] as const;
export const ACTIONS = ['create', 'review', 'edit', 'redesign', 'research'] as const;

/** Modules SUS can route to (registered as they are built — honest status). */
export const MODULES = [
  'direction-reasoning', // M4
  'tokens', // M4
  'foundations', // M4
  'playbook:marketing', // M4
  'playbook:commerce', // M4
  'playbook:operate', // M4
  'playbook:portfolio', // M4
  'copy-seo', // M4
  'motion', // M6
  'research', // M3
  'scanner', // M3
  'progressive-workflow', // M5
  'studio', // M7
] as const;

export const Intent = z
  .object({
    surface: z.enum(SURFACES),
    action: z.enum(ACTIONS),
    /** Modules serving this intent, in load order. */
    modules: z.array(z.enum(MODULES)).min(1),
    /** How the router decided: deterministic heuristics v1. */
    basis: z.literal('heuristic-v1'),
    /** Unresolved aspects the caller must clarify (honest fallback data). */
    openQuestions: z.array(z.string()),
  })
  .strict();

export const SusIntent = defineSusSchema('sus.intent', 1, Intent);
export type IntentData = z.infer<typeof Intent>;
