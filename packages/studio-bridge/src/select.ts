/**
 * Element selection + stable anchors (T0703).
 *
 * Confidence model (gate: below 0.6 → NEVER edit; ask the user from ranked
 * candidates):
 *   1.0  id anchor — element carries an id unique in the document
 *   0.8  structural anchor — unique CSS structural path (tag + nth chain)
 *   0.7  text-signature anchor — unique normalized text match
 *   0.5  ambiguous — multiple candidates; editRefused=true, ranked list
 *
 * Selection state lives in the ISOLATED world (hostile page cannot forge
 * bridge tool state); anchors are computed from the live DOM at selection
 * time, not cached across navigations (stale anchors are T0802's conflict
 * territory).
 */
import type { Page } from 'playwright';

export type AnchorKind = 'id' | 'structural' | 'text';

export interface Anchor {
  kind: AnchorKind;
  /** id value, structural CSS path, or normalized text signature. */
  value: string;
}

export interface RankedCandidate {
  anchor: Anchor;
  tag: string;
  preview: string;
}

export interface SelectionResult {
  anchor: Anchor;
  confidence: number;
  /** true when confidence < 0.6: never edit; ask the user. */
  editRefused: boolean;
  rankedCandidates: RankedCandidate[];
}

interface DomNode {
  tag: string;
  id: string | null;
  text: string;
  path: string;
}

/** Collects an inventory of leaf + landmark elements with structural paths. */
async function inventory(page: Page): Promise<DomNode[]> {
  return page.evaluate(() => {
    const pathOf = (el: Element): string => {
      const parts: string[] = [];
      let cur: Element | null = el;
      while (cur && cur !== document.body && parts.length < 12) {
        const parent: Element | null = cur.parentElement;
        let nth = 1;
        if (parent) {
          const current: Element = cur;
          const same: Element[] = Array.from(parent.children).filter(
            (c: Element) => c.tagName === current.tagName,
          );
          if (same.length > 1) nth = same.indexOf(current) + 1;
        }
        parts.unshift(`${cur.tagName.toLowerCase()}${nth > 1 ? `:nth-of-type(${nth})` : ''}`);
        cur = parent;
      }
      return parts.join(' > ');
    };
    const nodes: DomNode[] = [];
    const els = Array.from(document.body.querySelectorAll<HTMLElement>('*')).slice(0, 600);
    for (const el of els) {
      const ownText = Array.from(el.childNodes)
        .filter((n) => n.nodeType === Node.TEXT_NODE)
        .map((n) => n.textContent ?? '')
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      const isLeaf = el.children.length === 0;
      if (isLeaf && ownText.length >= 4) {
        nodes.push({
          tag: el.tagName.toLowerCase(),
          id: el.id || null,
          text: ownText.slice(0, 120),
          path: pathOf(el),
        });
      } else if (el.id) {
        nodes.push({
          tag: el.tagName.toLowerCase(),
          id: el.id,
          text: ownText.slice(0, 120),
          path: pathOf(el),
        });
      }
    }
    return nodes;
  });
}

export async function resolveSelection(page: Page, targetId: string): Promise<SelectionResult> {
  const nodes = await inventory(page);
  const target = nodes.find((n) => n.id === targetId);
  if (!target) {
    return {
      anchor: { kind: 'structural', value: '' },
      confidence: 0,
      editRefused: true,
      rankedCandidates: [],
    };
  }
  // 1.0 — unique id anchor
  const idMatches = nodes.filter((n) => n.id === target.id);
  if (target.id && idMatches.length === 1) {
    return {
      anchor: { kind: 'id', value: target.id },
      confidence: 1,
      editRefused: false,
      rankedCandidates: [],
    };
  }
  // 0.8 — unique structural path
  const pathMatches = nodes.filter((n) => n.path === target.path);
  if (pathMatches.length === 1) {
    return {
      anchor: { kind: 'structural', value: target.path },
      confidence: 0.8,
      editRefused: false,
      rankedCandidates: [],
    };
  }
  // 0.7 — unique text signature
  const textKey = target.text.toLowerCase();
  const textMatches = nodes.filter((n) => n.text.toLowerCase() === textKey && n.tag === target.tag);
  if (textMatches.length === 1) {
    return {
      anchor: { kind: 'text', value: textKey.slice(0, 80) },
      confidence: 0.7,
      editRefused: false,
      rankedCandidates: [],
    };
  }
  // ambiguous — never edit; rank candidates for the user
  const candidates = (
    pathMatches.length ? pathMatches : textMatches.length ? textMatches : idMatches
  ).map((n) => ({
    anchor: n.id
      ? ({ kind: 'id', value: n.id } as Anchor)
      : ({ kind: 'structural', value: n.path } as Anchor),
    tag: n.tag,
    preview: n.text.slice(0, 60),
  }));
  return {
    anchor: { kind: 'structural', value: target.path },
    confidence: 0.5,
    editRefused: true,
    rankedCandidates: candidates.slice(0, 5),
  };
}
