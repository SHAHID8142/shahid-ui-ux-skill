#!/usr/bin/env node
/**
 * T0700 — dual-stack mapping spike (read-only; NO source writes).
 *
 * Question: can a rendered DOM element be resolved to a UNIQUE source owner
 * on both stacks (Next.js App Router fixture A, Astro fixture B/D) with
 * evidence-backed confidence, without framework plugins?
 *
 * Method (deterministic): parse fixture SOURCE into an element inventory
 * (tag, id, text signature), parse the BUILT HTML into a DOM inventory,
 * match by signature, and measure:
 *   - match rate: how many DOM landmarks find a source counterpart
 *   - unique-owner rate: how many resolve to exactly ONE source element
 *     (ambiguous matches would need user confirmation before any write)
 *
 * GO threshold (recorded in the review packet): >= 90% unique-owner on BOTH
 * stacks supports the instrumented approach. Below that, the ADR-003
 * fallback ladder step applies. This spike does NOT write to any source.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();

function parseSource(path) {
  const text = readFileSync(path, 'utf8');
  const elements = [];
  // JSX/Astro element inventory: opening tags with optional id + inner text
  const re =
    /<(h[1-6]|p|button|a|section|header|footer|nav|ul|li|main|article|label|input|table|dl|figure)\b([^>]*)>/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const attrs = m[2];
    const id = /id="([^"]+)"/.exec(attrs)?.[1] ?? null;
    // capture text until closing tag (same tag) — bounded window
    const window = text.slice(m.index, m.index + 400);
    const textContent = />([^<>{}]{4,120})</.exec(window)?.[1]?.trim() ?? null;
    elements.push({
      tag: m[1],
      id,
      text: textContent,
      pos: m.index,
      line: text.slice(0, m.index).split('\n').length,
    });
  }
  return elements;
}

function parseBuiltHtml(html) {
  const dom = [];
  // leaf elements: text-bearing, matched against source text signatures
  const leafRe = /<(h[1-6]|p|button|a|label|li|td|th|dt|dd)\b([^>]*)>([\s\S]*?)<\/\1>/g;
  let m;
  while ((m = leafRe.exec(html)) !== null) {
    const id = /id="([^"]+)"/.exec(m[2])?.[1] ?? null;
    const text = m[3]
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (text.length > 0) dom.push({ tag: m[1], id, text: text.slice(0, 120) });
  }
  // container landmarks: identified by id attribute only (structure owners)
  const contRe = /<(section|header|footer|nav|main|article)\b[^>]*id="([^"]+)"/g;
  while ((m = contRe.exec(html)) !== null) {
    dom.push({ tag: m[1], id: m[2], text: null, landmark: true });
  }
  return dom;
}

function normalize(s) {
  return (s ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function spike(name, sourcePath, builtPath) {
  if (!existsSync(sourcePath) || !existsSync(builtPath)) {
    return { name, error: `missing ${!existsSync(sourcePath) ? sourcePath : builtPath}` };
  }
  const src = parseSource(sourcePath);
  const dom = parseBuiltHtml(readFileSync(builtPath, 'utf8'));
  let matched = 0;
  let unique = 0;
  const ambiguous = [];
  for (const el of dom) {
    const candidates = el.landmark
      ? src.filter((s) => s.tag === el.tag && s.id === el.id)
      : src.filter((s) => {
          if (s.tag !== el.tag) return false;
          if (el.id) return s.id === el.id;
          const key = normalize(el.text);
          return key.length > 8 && normalize(s.text) === key;
        });
    if (candidates.length > 0) matched += 1;
    if (candidates.length === 1) unique += 1;
    else if (candidates.length > 1)
      ambiguous.push({ id: el.id, tag: el.tag, n: candidates.length });
  }
  const matchRate = dom.length ? matched / dom.length : 0;
  const uniqueRate = dom.length ? unique / dom.length : 0;
  return {
    name,
    domElements: dom.length,
    sourceElements: src.length,
    matched,
    unique,
    matchRate,
    uniqueRate,
    ambiguousSample: ambiguous.slice(0, 5),
  };
}

// fixture A: Next.js marketing (built output: .next/server/app/index.html)
const A_SRC = join(ROOT, 'fixtures', 'marketing', 'app', 'page.tsx');
let A_BUILT = join(ROOT, 'fixtures', 'marketing', '.next', 'server', 'app', 'index.html');
if (!existsSync(A_BUILT)) {
  // find the prerendered html anywhere under .next/server/app
  const appDir = join(ROOT, 'fixtures', 'marketing', '.next', 'server', 'app');
  if (existsSync(appDir)) {
    const candidates = readdirSync(appDir).filter((f) => f.endsWith('.html'));
    A_BUILT = candidates.length ? join(appDir, candidates[0]) : A_BUILT;
  }
}
// fixture B: Astro commerce (dist/index.html)
const B_SRC = join(ROOT, 'fixtures', 'commerce', 'src', 'pages', 'index.astro');
const B_BUILT = join(ROOT, 'fixtures', 'commerce', 'dist', 'index.html');

const results = [
  spike('fixtureA:next-marketing', A_SRC, A_BUILT),
  spike('fixtureB:astro-commerce', B_SRC, B_BUILT),
];

const THRESHOLD = 0.9;
console.log(JSON.stringify({ threshold: THRESHOLD, results }, null, 2));
const errors = results.filter((r) => r.error);
if (errors.length > 0) {
  console.error('spike blocked:', errors.map((e) => e.error).join('; '));
  process.exit(3);
}
const go = results.every((r) => r.uniqueRate >= THRESHOLD);
console.log(
  `VERDICT: ${go ? 'GO' : 'NO-GO'} (unique-owner ${results.map((r) => `${r.name}=${(r.uniqueRate * 100).toFixed(0)}%`).join(', ')})`,
);
process.exit(go ? 0 : 2);
