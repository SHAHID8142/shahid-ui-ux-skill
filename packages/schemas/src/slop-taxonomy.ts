/**
 * Anti-slop taxonomy (T0302). Every category carries counterexamples —
 * legitimate uses that must NOT be flagged. Rules without ≥1
 * false-positive case cannot ship (G10: precision before blocking).
 */
import { z } from 'zod';
import { defineSusSchema } from './versioning.js';

export const SlopCategory = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/, 'category id: lowercase-hyphen'),
    name: z.string().min(1),
    /** What generic AI output looks like for this category. */
    description: z.string().min(1),
    severity: z.enum(['advisory', 'blocking']),
    /** Deterministic detection hints (implemented per rule, M3). */
    patterns: z.array(z.string()).min(1),
    /** Legitimate uses that must NOT be flagged — ≥1 required. */
    counterexamples: z.array(z.string()).min(1),
  })
  .strict();

export const TAXONOMY: Array<z.infer<typeof SlopCategory>> = [
  {
    id: 'template-speak',
    name: 'Template speak',
    description:
      'Stock AI phrases pasted regardless of content ("unlock the power of", "seamless experience", "elevate your X").',
    severity: 'blocking',
    patterns: [
      'unlock the power of',
      'seamless(ly)? (experience|integration|blend)',
      'elevate your',
      'game-?changer',
      "in today's (fast-paced|digital) world",
    ],
    counterexamples: [
      'The integration is seamless after you pair the devices once — this documents observed behavior.',
      'Elevate your desk 12 mm using the rear feet; the tilt is intentional for cable access.',
    ],
  },
  {
    id: 'fake-precision',
    name: 'Fake precision',
    description:
      'Unregistered numeric claims (percentages, multiples) presented as fact without a provenance reference.',
    severity: 'blocking',
    patterns: ['\\b\\d{2,3}%\\b(?![^{]*\\bprovenance\\b)', '\\b\\d+x (faster|better|more)\\b'],
    counterexamples: [
      'A 20% deposit is required at booking — that is our stated policy, not a claim.',
      'The zoom control scales to 200% for accessibility testing.',
    ],
  },
  {
    id: 'generic-voice',
    name: 'Generic voice',
    description:
      'Filler that works for any product: "innovative solutions", "take it to the next level", "empower your journey".',
    severity: 'advisory',
    patterns: [
      'innovative solutions?',
      'take it to the next level',
      'empower(ing)? your',
      'revolutioniz\\w+',
    ],
    counterexamples: [
      'The lever was an innovative solution to a cramped mounting bracket — specific mechanism described.',
      'Empowering your team requires deleting three approval steps, not adding dashboards.',
    ],
  },
  {
    id: 'hedge-storm',
    name: 'Hedge storm',
    description:
      'Stacked unverifiable qualifiers replacing commitment ("arguably perhaps possibly might").',
    severity: 'advisory',
    patterns: [
      '\\b(arguably|perhaps|possibly|might|could)\\b[^.]*\\b(arguably|perhaps|possibly|might|could)\\b',
    ],
    counterexamples: ['It might be the cache; run the trace before we conclude anything.'],
  },
  {
    id: 'dark-urgency',
    name: 'Dark-pattern urgency',
    description:
      'Manufactured scarcity/urgency with no factual basis ("only 2 left!!", "act now or lose forever").',
    severity: 'blocking',
    patterns: ['only \\d+ left', 'act now', "don'?t miss out", 'offer expires soon'],
    counterexamples: [
      'Only 2 left in the warehouse system as of the last sync — shown with a refresh timestamp.',
      'The offer expires March 31 per the contract terms; the date is stated.',
    ],
  },
];

export const SusSlopTaxonomy = defineSusSchema(
  'sus.slop-taxonomy',
  1,
  z.array(SlopCategory).min(1),
);

export type SlopCategoryData = z.infer<typeof SlopCategory>;
