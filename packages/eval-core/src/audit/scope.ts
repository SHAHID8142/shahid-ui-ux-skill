/**
 * T1021 — resolve a user's selection to something auditable, or say why not.
 *
 * Issue #15 asks for a command that works on "a selected/marked UI area, element,
 * component, or section". The failure modes of that request are all about scope, not
 * about checks: a selection that no longer exists, a selector matching three elements
 * when the user meant one, a screenshot rectangle with no source behind it. Any of those
 * silently resolved to "whatever is nearby" would make the command edit the wrong thing
 * and report a confident improvement to code the user never selected.
 *
 * So resolution is a first-class step with named outcomes — `resolved`, `ambiguous`,
 * `not-found`, `advisory`, `rejected` — and only `resolved` may proceed to a proposal.
 * Everything else produces a clarification the caller can show instead of guessing.
 *
 * This module decides *what* is in scope and *which dimensions are worth measuring* for
 * it. It runs no check itself: the checks are the audit's, so `/sus-bestpractice` cannot
 * drift into being a second scanner with its own opinions (issue #15 says so explicitly).
 */

/** How the user expressed the selection. */
export const SCOPE_KINDS = ['selector', 'component-path', 'region', 'editor-selection'] as const;
export type ScopeKind = (typeof SCOPE_KINDS)[number];

/**
 * Where the selection came from. A screenshot/annotation selection is `advisory`: it
 * identifies pixels, not code, and must be linked to source before anything is proposed.
 */
export type ScopeSource = 'source' | 'screenshot';

export interface ScopeReference {
  readonly kind: ScopeKind;
  /** Selector text, component path, annotation id or file path. */
  readonly value: string;
  readonly source?: ScopeSource;
}

/** The component classes this repository has guidance for. */
export const COMPONENT_KINDS = [
  'navbar',
  'button',
  'form',
  'form-field',
  'record-table',
  'dialog',
  'generic',
] as const;
export type ComponentKind = (typeof COMPONENT_KINDS)[number];

/** The dimensions a scope can be measured on. Never "everything". */
export const FOCUS_DIMENSIONS = [
  'responsive',
  'a11y',
  'motion',
  'copy',
  'performance',
  'visual',
] as const;
export type FocusDimension = (typeof FOCUS_DIMENSIONS)[number];

export interface FocusSelection {
  readonly kind: ComponentKind;
  readonly run: readonly FocusDimension[];
  /** Every dimension left out, with the reason. Silence about a dimension is not a pass. */
  readonly notApplicable: ReadonlyArray<{ dimension: FocusDimension; reason: string }>;
}

export interface ScopeTarget {
  /** Stable descriptor: tag + id/classes, never inner text. */
  readonly selector: string;
  readonly tag: string;
  readonly role: string | null;
  readonly kind: ComponentKind;
  readonly file: string | null;
}

/** The only thing read from the page: descriptors, never text content. */
interface RawElement {
  tagName: string;
  id: string;
  className: string;
  role: string | null;
}

export type ScopeOutcome = 'resolved' | 'ambiguous' | 'not-found' | 'advisory' | 'rejected';

export interface ScopeResolution {
  readonly outcome: ScopeOutcome;
  readonly reference: ScopeReference;
  readonly targets: readonly ScopeTarget[];
  /** What the user must answer, or null when the scope is usable as given. */
  readonly clarification: string | null;
  /** Why the reference was refused outright (injection, empty, too long). */
  readonly reason: string | null;
  /** True when observations about this selection cannot be applied to source. */
  readonly advisory: boolean;
  readonly focus: FocusSelection | null;
}

/** Refuse a reference that cannot be resolved safely, before it reaches a browser or shell. */
export const SCOPE_LIMITS = {
  /** Selectors beyond this are a paste error or an attempt to make the resolver do work. */
  maxSelectorLength: 200,
  /** More matches than this is never "the element the user selected". */
  maxTargets: 20,
} as const;

/** A selector that only means "everything" is not a selection. */
function rejectSelectorValue(value: string): string | null {
  if (value.trim().length === 0) return 'the selector is empty';
  if (value.length > SCOPE_LIMITS.maxSelectorLength) {
    return `the selector is longer than ${SCOPE_LIMITS.maxSelectorLength} characters`;
  }
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f]/.test(value)) return 'the selector contains control characters';
  if (value.trim() === '*' || value.trim() === 'html *')
    return 'the selector matches the whole page';
  return null;
}

/** Classify an element from its descriptor. Deterministic, and no inference from text. */
export function classifyComponent(input: {
  tag: string;
  role: string | null;
  classes: readonly string[];
}): ComponentKind {
  const tag = input.tag.toLowerCase();
  const role = (input.role ?? '').toLowerCase();
  const classes = input.classes.join(' ').toLowerCase();
  const has = (needle: string) => classes.includes(needle);

  if (tag === 'nav' || role === 'navigation' || has('navbar') || has('nav-')) return 'navbar';
  if (tag === 'table' || role === 'table' || role === 'grid') return 'record-table';
  if (role === 'dialog' || role === 'alertdialog' || has('dialog') || has('modal')) return 'dialog';
  if (
    tag === 'button' ||
    role === 'button' ||
    has('btn') ||
    has('button') ||
    has('cta') ||
    (tag === 'a' && has('cta'))
  ) {
    return 'button';
  }
  if (tag === 'form' || role === 'form') return 'form';
  if (
    tag === 'input' ||
    tag === 'select' ||
    tag === 'textarea' ||
    role === 'textbox' ||
    role === 'combobox' ||
    role === 'checkbox' ||
    role === 'radio'
  ) {
    return 'form-field';
  }
  return 'generic';
}

/**
 * Pick the dimensions worth measuring for a component class, and name the ones that are
 * not. `performance` is left out of most scopes on purpose: no scripted interaction is
 * driven for a single control, so a number there would be a lab artefact dressed as
 * evidence.
 */
export function selectFocus(kind: ComponentKind): FocusSelection {
  const table: Record<
    ComponentKind,
    { run: FocusDimension[]; skip: Partial<Record<FocusDimension, string>> }
  > = {
    navbar: {
      run: ['responsive', 'a11y', 'visual', 'copy'],
      skip: {
        motion: 'dropdown motion is reported only when the scope includes its panel',
        performance: 'no scripted interaction is driven for a navigation bar',
      },
    },
    button: {
      run: ['a11y', 'visual', 'copy'],
      skip: {
        responsive: 'a single control has no layout of its own; its size is measured under a11y',
        motion: 'hover/press transitions are measured only when the scope includes motion',
        performance:
          'an event handler budget needs a scripted interaction, which this scope does not run',
      },
    },
    form: {
      run: ['a11y', 'copy', 'visual', 'responsive'],
      skip: {
        motion: 'no transition is required by the form ruleset',
        performance: 'validation timing is measured by interaction tests, not by a scope scan',
      },
    },
    'form-field': {
      run: ['a11y', 'copy', 'visual'],
      skip: {
        responsive: 'a field reflows with its form; the form scope owns the layout',
        motion: 'no transition is required by the field ruleset',
        performance: 'no scripted interaction is driven for a single field',
      },
    },
    'record-table': {
      run: ['responsive', 'a11y', 'visual'],
      skip: {
        copy: 'cell wording is content, not a rule; a content kind must be supplied to judge it',
        motion: 'no transition is required by the record ruleset',
        performance:
          'row-count rendering is measured by the performance budget, not by a scope scan',
      },
    },
    dialog: {
      run: ['a11y', 'motion', 'visual', 'copy'],
      skip: {
        responsive:
          'a dialog is constrained by the viewport it opens in; its layout is measured there',
        performance: 'open/close timing needs an interaction trace, which this scope does not run',
      },
    },
    generic: {
      run: ['responsive', 'a11y', 'visual'],
      skip: {
        copy: 'no content kind was supplied, so wording cannot be judged',
        motion: 'no interaction was selected, so no transition can be attributed',
        performance: 'no scripted interaction is driven for a generic scope',
      },
    },
  };
  const chosen = table[kind];
  return {
    kind,
    run: chosen.run,
    notApplicable: FOCUS_DIMENSIONS.filter((d) => !chosen.run.includes(d)).map((dimension) => ({
      dimension,
      reason: chosen.skip[dimension] ?? 'not relevant to this component class',
    })),
  };
}

/** The descriptor an element is reported under. No inner text: reports must not leak content. */
function toTarget(raw: RawElement): ScopeTarget {
  const tag = raw.tagName.toLowerCase();
  const classes = raw.className.trim().split(/\s+/).filter(Boolean);
  const id = raw.id ? `#${raw.id}` : '';
  const cls = !id && classes.length > 0 ? `.${classes.slice(0, 2).join('.')}` : '';
  return {
    selector: tag + id + cls,
    tag,
    role: raw.role,
    kind: classifyComponent({ tag, role: raw.role, classes }),
    file: null,
  };
}

/** The subset of Playwright's Page this resolver uses, so a test can pass a fake. */
export interface ScopePage {
  evaluate: <T, A>(fn: (arg: A) => T, arg: A) => Promise<T>;
}

export interface ResolveOptions {
  /** Reads a file's text; injected so the resolver does no I/O of its own. */
  readFile?: (path: string) => string | null;
  maxTargets?: number;
}

/**
 * Resolve a reference against a live page (selectors) or the file tree (paths).
 *
 * Only `resolved` means "audit this". `advisory` means the pixels were selected but no
 * source was linked. `ambiguous` returns the candidates so the caller can ask which one,
 * and never picks the first.
 */
export async function resolveScope(
  page: ScopePage | null,
  reference: ScopeReference,
  options: ResolveOptions = {},
): Promise<ScopeResolution> {
  const advisory = reference.source === 'screenshot';
  const base = { reference, targets: [] as ScopeTarget[], advisory };

  if (reference.kind === 'selector') {
    const rejected = rejectSelectorValue(reference.value);
    if (rejected !== null) {
      return { ...base, outcome: 'rejected', clarification: null, reason: rejected, focus: null };
    }
    if (page === null) {
      return {
        ...base,
        outcome: 'not-found',
        clarification:
          'no browser is available to resolve a selector; pass a component path instead',
        reason: null,
        focus: null,
      };
    }
    const maxTargets = options.maxTargets ?? SCOPE_LIMITS.maxTargets;
    // The callback runs inside the browser, so it may only touch browser globals:
    // everything that needs a decision (classification) happens here in Node, where the
    // unit tests can also reach it.
    const raw = (await page.evaluate(
      ({ selector, limit }) =>
        Array.from(document.querySelectorAll(selector))
          .slice(0, limit)
          .map((node) => {
            const el = node as HTMLElement;
            return {
              tagName: el.tagName,
              id: el.id,
              className: typeof el.className === 'string' ? el.className : '',
              role: el.getAttribute('role'),
            };
          }),
      { selector: reference.value, limit: maxTargets },
    )) as RawElement[];
    const targets = raw.map(toTarget);
    if (targets.length === 0) {
      return {
        ...base,
        outcome: 'not-found',
        clarification:
          'nothing matches ' +
          reference.value +
          '; the selection may be stale — reselect or pass a component path',
        reason: null,
        focus: null,
      };
    }
    if (targets.length > 1) {
      const names = targets
        .map((t) => t.selector)
        .slice(0, 3)
        .join(', ');
      return {
        ...base,
        outcome: 'ambiguous',
        targets,
        clarification:
          reference.value +
          ' matches ' +
          targets.length +
          ' elements (' +
          names +
          (targets.length > 3 ? ', …' : '') +
          '); narrow the selector or confirm one of them before anything is proposed',
        reason: null,
        focus: null,
      };
    }
    const only = targets[0] as ScopeTarget;
    return {
      ...base,
      outcome: 'resolved',
      targets,
      clarification: null,
      reason: null,
      focus: selectFocus(only.kind),
    };
  }

  if (reference.kind === 'component-path' || reference.kind === 'editor-selection') {
    const path = reference.value.trim();
    if (path.length === 0) {
      return {
        ...base,
        outcome: 'rejected',
        clarification: null,
        reason: 'the component path is empty',
        focus: null,
      };
    }
    const readFile = options.readFile;
    const text = readFile === undefined ? null : readFile(path);
    if (text === null) {
      return {
        ...base,
        outcome: 'not-found',
        clarification:
          'no readable source at ' +
          path +
          '; the selection may be stale — reselect it from the file tree',
        reason: null,
        focus: null,
      };
    }
    const kind = classifyComponent({
      tag: 'div',
      role: null,
      classes: path.toLowerCase().split('/'),
    });
    const target: ScopeTarget = {
      selector: path,
      tag: 'file',
      role: null,
      kind,
      file: path,
    };
    return {
      ...base,
      outcome: 'resolved',
      targets: [target],
      clarification: null,
      reason: null,
      focus: selectFocus(kind),
    };
  }

  // A region annotation identifies pixels. Without a linked source there is nothing to
  // propose against, so it stays advisory no matter how confident the selection looked.
  return {
    ...base,
    outcome: 'advisory',
    clarification:
      'a drawn region is not linked to source: observations stay advisory until it is mapped to an element or file',
    reason: null,
    focus: null,
  };
}

/** One line the report can quote, plus the clarification when there is one. */
export function renderScope(resolution: ScopeResolution): string {
  const head =
    'scope: ' +
    resolution.reference.kind +
    ' `' +
    resolution.reference.value +
    '` → ' +
    resolution.outcome;
  const targets = resolution.targets.map((t) => t.selector).slice(0, 5);
  const lines = [head];
  if (targets.length > 0) lines.push('  targets: ' + targets.join(', '));
  if (resolution.focus !== null) {
    lines.push('  measuring: ' + resolution.focus.run.join(', '));
    for (const skip of resolution.focus.notApplicable) {
      lines.push('  not-applicable ' + skip.dimension + ': ' + skip.reason);
    }
  }
  if (resolution.clarification !== null)
    lines.push('  needs confirmation: ' + resolution.clarification);
  if (resolution.reason !== null) lines.push('  refused: ' + resolution.reason);
  return lines.join('\n');
}
