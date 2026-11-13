/**
 * SUS token contract (T0401, ADR-004): DTCG-aligned representation with a
 * SUS semantic layer. Canonical file `.sus/tokens.json`. Derived exports are
 * regenerable artifacts — hand edits are overwritten by the pipeline.
 * Gate ownership: G1 (token-only styling) + G12 (contract drift) emitted by
 * packages/tokens (see docs/GATE_REGISTRY.md).
 */
import { z } from 'zod';
import { defineSusSchema } from './versioning.js';

/** A DTCG group node: maps names to groups or tokens. Validated structurally. */
export interface DtcgGroup {
  [key: string]: DtcgToken | DtcgGroup;
}

export interface DtcgToken {
  $type?: string;
  $value: string | number;
  $description?: string;
}

const isGroup = (v: unknown): v is DtcgGroup =>
  typeof v === 'object' && v !== null && !('$value' in v);

const TokenNode: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z
      .object({
        $type: z.string().optional(),
        $value: z.union([z.string(), z.number()]),
        $description: z.string().optional(),
      })
      .strict(),
    z.record(z.string(), TokenNode),
  ]),
);

export const SusTokensFile = z
  .object({
    $schema: z.string().optional(),
    ...({} as Record<string, never>),
  })
  .passthrough()
  .superRefine((file, ctx) => {
    const walk = (node: unknown, path: string): void => {
      if (isGroup(node)) {
        if (Object.keys(node).length === 0) {
          ctx.addIssue({ code: 'custom', message: `empty token group at ${path}`, path: [path] });
        }
        for (const [k, child] of Object.entries(node)) {
          walk(child, `${path}.${k}`);
        }
      } else {
        const tok = node as DtcgToken;
        if (
          !('$value' in tok) ||
          (typeof tok.$value !== 'string' && typeof tok.$value !== 'number')
        ) {
          ctx.addIssue({
            code: 'custom',
            message: `token at ${path} lacks a $value`,
            path: [path],
          });
        }
      }
    };
    for (const [k, child] of Object.entries(file)) {
      if (k.startsWith('$')) continue; // metadata keys
      walk(child, k);
    }
  });

/** Semantic roles SUS requires in a token contract (the semantic layer). */
export const REQUIRED_SEMANTIC_ROLES = [
  'color.surface.base',
  'color.fg.default',
  'color.accent.default',
  'space.group',
  'space.section',
  'radius.card',
  'motion.duration.fast',
  'motion.duration.base',
  'motion.easing.standard',
  'typography.size.body',
];

export function flattenTokens(file: Record<string, unknown>): Map<string, DtcgToken> {
  const out = new Map<string, DtcgToken>();
  const walk = (node: unknown, path: string): void => {
    if (isGroup(node)) {
      for (const [k, child] of Object.entries(node)) walk(child, `${path}.${k}`);
      return;
    }
    out.set(path.slice(1), node as DtcgToken);
  };
  for (const [k, child] of Object.entries(file)) walk(child, `.${k}`);
  return out;
}

export function missingSemanticRoles(file: Record<string, unknown>): string[] {
  const flat = flattenTokens(file);
  return REQUIRED_SEMANTIC_ROLES.filter((role) => !flat.has(role));
}

export const SusTokens = defineSusSchema('sus.tokens-file', 1, SusTokensFile);

export type DtcgTokenType = DtcgToken;
