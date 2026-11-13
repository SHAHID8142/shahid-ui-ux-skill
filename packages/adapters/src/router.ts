/**
 * Deterministic intent router v1 (T0202).
 *
 * Heuristic keyword routing for CLI/no-model paths. A capable host model
 * routes better than this — the router exists so SUS behaves honestly where
 * no model is available, and every intent maps to an EXPLICIT module set.
 * Unknown inputs produce an honest fallback intent (research modules +
 * open questions), never a guessed surface.
 */
import { Intent, type IntentData } from '@sus/schemas';

interface SurfaceSignal {
  surface: IntentData['surface'];
  patterns: RegExp[];
  modules: IntentData['modules'];
}

const SIGNALS: SurfaceSignal[] = [
  {
    surface: 'commerce',
    patterns: [
      /checkout/i,
      /product (page|grid|detail)/i,
      /e-?commerce|storefront|shop|cart/i,
      /\bpdp\b/i,
    ],
    modules: ['playbook:commerce', 'direction-reasoning', 'tokens', 'copy-seo', 'scanner'],
  },
  {
    surface: 'operate',
    patterns: [
      /dashboard/i,
      /\badmin\b|\bcrm\b|\bcms\b/i,
      /content queue|settings (page|form)/i,
      /control panel/i,
    ],
    modules: ['playbook:operate', 'direction-reasoning', 'tokens', 'foundations', 'scanner'],
  },
  {
    surface: 'portfolio',
    patterns: [/portfolio|case stud/i, /\bdocs\b|documentation|article layout|gallery/i],
    modules: ['playbook:portfolio', 'direction-reasoning', 'tokens', 'copy-seo', 'scanner'],
  },
  {
    surface: 'marketing',
    patterns: [/landing (page|hero)/i, /marketing site/i, /pricing (page|section)/i, /home ?page/i],
    modules: ['playbook:marketing', 'direction-reasoning', 'tokens', 'copy-seo', 'scanner'],
  },
];

function actionOf(text: string): IntentData['action'] {
  if (/\b(redesign|rework|overhaul|revamp)\b/i.test(text)) return 'redesign';
  if (/\b(review|audit|critique|assess|check)\b/i.test(text)) return 'review';
  if (/\b(edit|fix|change|update|adjust|tweak|modify)\b/i.test(text)) return 'edit';
  if (/\b(research|explore|investigate|compare)\b/i.test(text)) return 'research';
  return 'create';
}

/** Honest fallback: research + ask, with the unresolved questions listed. */
export function fallbackIntent(reason: string): IntentData {
  return {
    surface: 'marketing',
    action: 'research',
    modules: ['research', 'direction-reasoning'],
    basis: 'heuristic-v1',
    openQuestions: [
      'surface mode unresolved — which of marketing/commerce/operate/portfolio applies?',
      reason,
    ],
  };
}

export function routeIntent(brief: string): IntentData {
  let matched: { surface: SurfaceSignal; hits: number } | null = null;
  for (const signal of SIGNALS) {
    const hits = signal.patterns.filter((p) => p.test(brief)).length;
    if (hits > 0 && (matched === null || hits > matched.hits)) {
      matched = { surface: signal, hits };
    }
  }
  if (matched === null) {
    return fallbackIntent('no surface signal matched the brief');
  }
  const intent: IntentData = {
    surface: matched.surface.surface,
    action: actionOf(brief),
    modules: [...matched.surface.modules],
    basis: 'heuristic-v1',
    openQuestions: [],
  };
  if (intent.action === 'edit' || intent.action === 'redesign') {
    if (!intent.modules.includes('progressive-workflow')) {
      intent.modules.push('progressive-workflow');
    }
  }
  const parsed = Intent.safeParse(intent);
  if (!parsed.success) {
    throw new Error(
      `router produced invalid intent: ${parsed.error.issues.map(String).join('; ')}`,
    );
  }
  return parsed.data;
}
