/**
 * T0803 — variants, visual diff and simultaneous viewports.
 *
 * The studio shows A/B/C side by side, at every viewport at once, and lets the
 * user accept exactly one. Three properties matter more than the layout:
 *
 *  1. **Provenance is recorded, or the variant is not shown.** A proposal a user
 *     cannot trace back to an intent, a model and a prompt hash is an anonymous
 *     edit to their product — refused at construction, not filtered later.
 *  2. **Discard is cheap.** Discarding must not re-render, re-serialize or
 *     recompute anything: it drops the heavy payload reference and keeps the
 *     metadata for the audit trail. Ten discarded variants cost ten nulls.
 *  3. **Variant markup is data, never code.** Each variant renders in a sandbox
 *     without `allow-same-origin`, and markup carrying scripts, inline handlers,
 *     `javascript:` URLs or nested frames is refused outright — a generated
 *     variant that can execute is a compromised studio, not a preview.
 *
 * Accepting is a trusted-host action: this model exposes no DOM event hooks, so
 * a page under test cannot approve its own edit (peer finding: isolated worlds
 * isolate JS state, not DOM events).
 */

export type VariantViewportId = 'mobile' | 'tablet' | 'desktop';

export interface VariantViewport {
  id: VariantViewportId;
  label: string;
  width: number;
  height: number;
}

/** Simultaneous viewports, in the order they are laid out. */
export const DEFAULT_VIEWPORTS: readonly VariantViewport[] = [
  { id: 'mobile', label: 'Mobile · 390', width: 390, height: 844 },
  { id: 'tablet', label: 'Tablet · 768', width: 768, height: 1024 },
  { id: 'desktop', label: 'Desktop · 1280', width: 1280, height: 800 },
];

export const MAX_VARIANTS = 3;

export interface VariantProvenance {
  /** The intent this variant answers; must match the session's intent. */
  intentId: string;
  /** Generator identity, e.g. `synthetic-rule-based@1`. */
  model: string;
  /** sha256 of the exact prompt/instruction text that produced the variant. */
  promptSha256: string;
  /** Traceable generator run, for reproducing a proposal months later. */
  runId: string;
  createdAt: string;
  /** Optional generator seed, when the model is stochastic. */
  seed?: number;
}

export interface VariantInput {
  /** 'A' | 'B' | 'C' by convention; any unique label is accepted. */
  id: string;
  /** The proposed markup for the edited region (untrusted: sanitised here). */
  markup: string;
  provenance: VariantProvenance;
  /** Short rationale shown beside the variant. */
  summary?: string;
}

export type VariantRefusal =
  | 'no-variants'
  | 'too-many-variants'
  | 'duplicate-variant-id'
  | 'missing-provenance'
  | 'provenance-intent-mismatch'
  | 'untrusted-markup'
  | 'unknown-variant'
  | 'already-decided'
  | 'already-discarded';

export type VariantResult<T> =
  { ok: true; value: T } | { ok: false; reason: VariantRefusal; detail: string };

/** A frame descriptor: what the host must render, and with which sandbox. */
export interface VariantFrame {
  viewport: VariantViewport;
  /** Inline document. Never a URL the page under test controls. */
  srcdoc: string;
  /**
   * Sandbox tokens granted to the frame: none. An empty list is the strongest
   * sandbox (`allow-scripts`, `allow-forms`, `allow-same-origin`, popups all
   * denied), so generated markup can be *inspected* but can never reach the
   * host, the page under test, or storage.
   */
  sandbox: string[];
  width: number;
  height: number;
}

export interface VariantView {
  id: string;
  provenance: VariantProvenance;
  summary: string | null;
  /** Same markup for every viewport — rendered once, scaled by the host. */
  frames: VariantFrame[];
  discarded: boolean;
}

export type VariantViewSnapshot = VariantView;

export interface VariantSnapshot {
  intentId: string;
  state: 'open' | 'decided';
  variants: VariantViewSnapshot[];
  viewports: VariantViewport[];
  acceptedId: string | null;
}

export interface AcceptDecision {
  variantId: string;
  intentId: string;
  provenance: VariantProvenance;
  markup: string;
  acceptedAt: string;
  /** The rollback note in TASKS.json: the studio reloads rather than hot-swaps. */
  applyStrategy: 'full-page-reload';
  /** Variants dropped as part of the decision, with their metadata kept. */
  discarded: Array<{ id: string; provenance: VariantProvenance }>;
}

/** Markup patterns that make untrusted variant content executable. */
const UNSAFE_MARKUP: Array<{ pattern: RegExp; why: string }> = [
  { pattern: /<script[\s>]/i, why: 'contains a <script> element' },
  { pattern: /<iframe[\s>]/i, why: 'contains a nested frame' },
  { pattern: /<object[\s>]|<embed[\s>]/i, why: 'contains a plugin element' },
  { pattern: /\son[a-z]+\s*=/i, why: 'contains an inline event handler' },
  { pattern: /javascript:/i, why: 'contains a javascript: URL' },
  { pattern: /<base[\s>]/i, why: 'rewrites base URLs' },
];

/** No sandbox tokens are ever granted to a variant frame. */
function sandboxFor(): string[] {
  return [];
}

/**
 * Change-detector digest for the offered set. It runs in the overlay (a browser
 * context, no crypto module) and is NOT a security hash — `promptSha256` comes
 * from the generator and is validated for shape only. This exists so the studio
 * can tell "the user saw these three variants" from "the set changed".
 */
function digest(text: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    h1 = Math.imul(h1 ^ code, 2654435761);
    h2 = Math.imul(h2 ^ code, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
}

/** Structural sanity: a provenance record that cannot identify its variant. */
function provenanceProblem(provenance: VariantProvenance | undefined): string | null {
  if (!provenance) return 'no provenance record';
  if (!provenance.intentId) return 'no intent id';
  if (!provenance.model) return 'no generator model';
  if (!/^[0-9a-f]{64}$/.test(provenance.promptSha256)) return 'promptSha256 is not a sha256 digest';
  if (!provenance.runId) return 'no generator run id';
  if (!provenance.createdAt || Number.isNaN(Date.parse(provenance.createdAt)))
    return 'createdAt is not a timestamp';
  return null;
}

export class VariantSession {
  private readonly intentId: string;
  private readonly viewports: VariantViewport[];
  private readonly entries = new Map<
    string,
    { provenance: VariantProvenance; summary: string | null; markup: string | null }
  >();
  private readonly order: string[] = [];
  private acceptedId: string | null = null;
  private markupBytes = 0;

  private constructor(intentId: string, viewports: VariantViewport[]) {
    this.intentId = intentId;
    this.viewports = viewports;
  }

  /**
   * Opens a comparison. Refuses the whole set if any variant is unattributable
   * or executable — a half-attributed comparison is worse than none.
   */
  static open(
    intentId: string,
    variants: VariantInput[],
    options: { viewports?: VariantViewport[] } = {},
  ): VariantResult<VariantSession> {
    if (!intentId) {
      return { ok: false, reason: 'missing-provenance', detail: 'a comparison needs an intent id' };
    }
    if (variants.length === 0) {
      return { ok: false, reason: 'no-variants', detail: 'nothing to compare' };
    }
    if (variants.length > MAX_VARIANTS) {
      return {
        ok: false,
        reason: 'too-many-variants',
        detail: `${variants.length} variants offered; at most ${MAX_VARIANTS} can be compared honestly side by side`,
      };
    }
    const viewports = options.viewports ?? [...DEFAULT_VIEWPORTS];
    const session = new VariantSession(intentId, viewports);
    for (const variant of variants) {
      if (session.entries.has(variant.id)) {
        return {
          ok: false,
          reason: 'duplicate-variant-id',
          detail: `variant "${variant.id}" was offered twice; a duplicate makes "accept A" ambiguous`,
        };
      }
      const problem = provenanceProblem(variant.provenance);
      if (problem) {
        return {
          ok: false,
          reason: 'missing-provenance',
          detail: `variant "${variant.id}" cannot be attributed: ${problem}`,
        };
      }
      if (variant.provenance.intentId !== intentId) {
        return {
          ok: false,
          reason: 'provenance-intent-mismatch',
          detail: `variant "${variant.id}" answers intent ${variant.provenance.intentId}, not ${intentId}`,
        };
      }
      const unsafe = UNSAFE_MARKUP.find((rule) => rule.pattern.test(variant.markup));
      if (unsafe) {
        return {
          ok: false,
          reason: 'untrusted-markup',
          detail: `variant "${variant.id}" ${unsafe.why}; variants render as data, never code`,
        };
      }
      if (variant.markup.trim() === '') {
        return {
          ok: false,
          reason: 'missing-provenance',
          detail: `variant "${variant.id}" has no markup`,
        };
      }
      session.entries.set(variant.id, {
        provenance: { ...variant.provenance },
        summary: variant.summary ?? null,
        markup: variant.markup,
      });
      session.order.push(variant.id);
      session.markupBytes += variant.markup.length;
    }
    return { ok: true, value: session };
  }

  /**
   * Wraps variant markup for inspection. `markup` is inserted as markup (a
   * visual diff of escaped text would be useless), which is why unsafe patterns
   * are refused at construction AND the frame is fully sandboxed: two
   * independent controls, so one mistake is not a compromise.
   */
  private wrap(markup: string): string {
    return [
      '<!doctype html><html><head><meta charset="utf-8">',
      '<style>html,body{margin:0;font:16px system-ui}</style></head>',
      '<body data-sus-variant>',
      markup,
      '</body></html>',
    ].join('');
  }

  private view(id: string): VariantView {
    const entry = this.entries.get(id)!;
    const frames: VariantFrame[] = this.viewports.map((viewport) => ({
      viewport,
      // one document per variant, reused for every viewport: the host scales it
      srcdoc: entry.markup === null ? '' : this.wrap(entry.markup),
      sandbox: sandboxFor(),
      width: viewport.width,
      height: viewport.height,
    }));
    return {
      id,
      provenance: { ...entry.provenance },
      summary: entry.summary,
      frames,
      discarded: entry.markup === null,
    };
  }

  /** Everything the host renders. Undecided variants only, in offer order. */
  snapshot(): VariantSnapshot {
    return {
      intentId: this.intentId,
      state: this.acceptedId === null ? 'open' : 'decided',
      variants: this.liveIds().map((id) => this.view(id)),
      viewports: [...this.viewports],
      acceptedId: this.acceptedId,
    };
  }

  /** Variants still worth rendering (not discarded). */
  private liveIds(): string[] {
    return this.order.filter((id) => this.entries.get(id)!.markup !== null);
  }

  /** The side-by-side matrix: one row per variant, one column per viewport. */
  compare(): Array<{ id: string; cells: Array<{ viewport: VariantViewportId; width: number }> }> {
    return this.liveIds().map((id) => ({
      id,
      cells: this.viewports.map((viewport) => ({ viewport: viewport.id, width: viewport.width })),
    }));
  }

  /**
   * Drops one variant. Cheap by construction: the markup reference is released
   * and nothing is re-rendered or recomputed; provenance stays for the record.
   */
  discard(
    id: string,
  ): VariantResult<{ id: string; provenance: VariantProvenance; releasedBytes: number }> {
    const entry = this.entries.get(id);
    if (!entry) {
      return {
        ok: false,
        reason: 'unknown-variant',
        detail: `no variant "${id}" in this comparison`,
      };
    }
    if (entry.markup === null) {
      return {
        ok: false,
        reason: 'already-discarded',
        detail: `variant "${id}" is already discarded`,
      };
    }
    if (this.acceptedId === id) {
      return {
        ok: false,
        reason: 'already-decided',
        detail: `variant "${id}" is accepted; undo the decision first`,
      };
    }
    const releasedBytes = entry.markup.length;
    entry.markup = null;
    this.markupBytes -= releasedBytes;
    return { ok: true, value: { id, provenance: { ...entry.provenance }, releasedBytes } };
  }

  /** Discards every undecided variant; returns how much was released. */
  discardAll(): { discarded: string[]; releasedBytes: number } {
    const released: string[] = [];
    let bytes = 0;
    for (const id of this.liveIds()) {
      if (id === this.acceptedId) continue;
      const result = this.discard(id);
      if (result.ok) {
        released.push(id);
        bytes += result.value.releasedBytes;
      }
    }
    return { discarded: released, releasedBytes: bytes };
  }

  /**
   * Accepts exactly one variant. The others are dropped cheaply, and the
   * decision carries the provenance so the applied change stays attributable.
   */
  accept(id: string, options: { acceptedAt?: string } = {}): VariantResult<AcceptDecision> {
    if (this.acceptedId !== null) {
      return {
        ok: false,
        reason: 'already-decided',
        detail: `variant "${this.acceptedId}" was already accepted; one decision per comparison`,
      };
    }
    const entry = this.entries.get(id);
    if (!entry) {
      return {
        ok: false,
        reason: 'unknown-variant',
        detail: `no variant "${id}" in this comparison`,
      };
    }
    if (entry.markup === null) {
      return {
        ok: false,
        reason: 'already-discarded',
        detail: `variant "${id}" was discarded; it cannot be accepted`,
      };
    }
    const markup = entry.markup;
    const discarded: Array<{ id: string; provenance: VariantProvenance }> = [];
    for (const other of this.liveIds()) {
      if (other === id) continue;
      const otherEntry = this.entries.get(other)!;
      discarded.push({ id: other, provenance: { ...otherEntry.provenance } });
      this.markupBytes -= otherEntry.markup!.length;
      otherEntry.markup = null;
    }
    this.acceptedId = id;
    return {
      ok: true,
      value: {
        variantId: id,
        intentId: this.intentId,
        provenance: { ...entry.provenance },
        markup,
        acceptedAt: options.acceptedAt ?? new Date().toISOString(),
        applyStrategy: 'full-page-reload',
        discarded,
      },
    };
  }

  /** Bytes of variant markup currently held — the proof that discard is cheap. */
  heldBytes(): number {
    return this.markupBytes;
  }

  /** A stable digest of the offered set (see `digest`), for the session record. */
  comparisonDigest(): string {
    const canonical = this.order.map((id) => {
      const entry = this.entries.get(id)!;
      return `${id}:${entry.provenance.runId}:${entry.markup === null ? 'discarded' : digest(entry.markup)}`;
    });
    return digest(`${this.intentId}|${canonical.join('|')}`);
  }
}
