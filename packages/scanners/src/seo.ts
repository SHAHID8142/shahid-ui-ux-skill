/**
 * SEO/content structural checks (T0406) — deterministic HTML checks emitting
 * the G3 (placeholder content) and G9 (semantics) verdicts. G3/G9 ownership:
 * T0406 emits these; the scanner corpus rules (T0305) contribute to G3.
 */
export interface SeoCheck {
  id: string;
  status: 'pass' | 'fail';
  detail: string;
}

export interface SeoResult {
  checks: SeoCheck[];
  g3: { gate: 'G3'; status: 'pass' | 'fail'; detail: string[] };
  g9: { gate: 'G9'; status: 'pass' | 'fail'; detail: string[] };
}

export function checkSeo(html: string): SeoResult {
  const checks: SeoCheck[] = [];
  const g3detail: string[] = [];
  const g9detail: string[] = [];

  const title = /<title>([^<]*)<\/title>/i.exec(html)?.[1]?.trim() ?? '';
  checks.push({
    id: 'title-present',
    status: title.length > 0 && title.length <= 60 ? 'pass' : 'fail',
    detail: title
      ? `title ${title.length} chars${title.length > 60 ? ' (>60, truncates in SERP)' : ''}`
      : 'missing <title>',
  });

  const desc = /<meta\s+name="description"\s+content="([^"]*)"/i.exec(html)?.[1] ?? '';
  checks.push({
    id: 'meta-description',
    status: desc.length >= 50 && desc.length <= 158 ? 'pass' : 'fail',
    detail: desc ? `meta description ${desc.length} chars` : 'missing meta description',
  });

  const h1Count = (html.match(/<h1[\s>]/gi) ?? []).length;
  checks.push({
    id: 'single-h1',
    status: h1Count === 1 ? 'pass' : 'fail',
    detail: `${h1Count} h1 element(s)`,
  });
  if (h1Count !== 1) g9detail.push(`${h1Count} h1 elements (project convention: exactly one)`);

  const headings = [...html.matchAll(/<h([1-6])[\s>]/gi)].map((m) => Number(m[1]));
  let skipFound = false;
  for (let i = 1; i < headings.length; i += 1) {
    if (headings[i]! - headings[i - 1]! > 1) skipFound = true;
  }
  checks.push({
    id: 'heading-ladder',
    status: skipFound ? 'fail' : 'pass',
    detail: skipFound ? 'skipped heading level' : 'no skipped levels',
  });
  if (skipFound) g9detail.push('heading ladder skips a level');

  const imgs = [...html.matchAll(/<img\b([^>]*)>/gi)];
  const noAlt = imgs.filter((m) => !/\balt=/i.test(String(m[1])));
  checks.push({
    id: 'img-alt',
    status: noAlt.length === 0 ? 'pass' : 'fail',
    detail: `${noAlt.length} of ${imgs.length} images missing alt`,
  });
  if (noAlt.length > 0) g9detail.push(`${noAlt.length} images without alt text`);

  // G3: placeholder content in shipped HTML
  const placeholder = /lorem ipsum|TODO:|FIXME:|placeholder content|xxx/i.exec(html);
  checks.push({
    id: 'no-placeholders',
    status: placeholder ? 'fail' : 'pass',
    detail: placeholder
      ? `placeholder text found: "${String(placeholder[0])}"`
      : 'no placeholder content',
  });
  if (placeholder) g3detail.push(`placeholder content: "${String(placeholder[0])}"`);

  const mains = (html.match(/<main[\s>]/gi) ?? []).length;
  checks.push({
    id: 'single-main',
    status: mains === 1 ? 'pass' : 'fail',
    detail: `${mains} main landmark(s)`,
  });
  if (mains !== 1) g9detail.push(`${mains} main landmarks (expected exactly 1)`);

  return {
    checks,
    g3: {
      gate: 'G3',
      status: g3detail.length === 0 ? 'pass' : 'fail',
      detail: g3detail.length ? g3detail : ['no placeholder content'],
    },
    g9: {
      gate: 'G9',
      status: g9detail.length === 0 ? 'pass' : 'fail',
      detail: g9detail.length ? g9detail : ['heading ladder + landmarks + alt coverage pass'],
    },
  };
}
