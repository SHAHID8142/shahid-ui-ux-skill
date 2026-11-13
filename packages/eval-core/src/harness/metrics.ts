/**
 * DOM metric collection (T0152): overflow, CLS, LCP proxy, tap targets,
 * landmarks. Runs inside the page via Playwright evaluate. Deterministic:
 * no network-dependence beyond the page itself, buffered observers.
 */
import type { Page } from 'playwright';

export interface PageMetrics {
  url: string;
  title: string;
  /** G7 proxy: page scrolls horizontally at this viewport. */
  horizontalOverflow: boolean;
  /** Elements wider than the viewport (their selectors, first 10). */
  overflowingElements: string[];
  /** Cumulative Layout Shift (0 = stable). */
  cls: number;
  /** Largest Contentful Paint in ms (0 if not reported). */
  lcpMs: number;
  /** Interactive elements smaller than 44×44 css px (G8 proxy). */
  smallTapTargets: Array<{ selector: string; width: number; height: number }>;
  /** Landmark/section census (ids + roles). */
  landmarks: string[];
  /** Heading outline (level + text) — hierarchy evidence. */
  headings: Array<{ level: number; text: string }>;
}

interface TapTarget {
  selector: string;
  width: number;
  height: number;
}

export async function collectPageMetrics(page: Page): Promise<PageMetrics> {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const vw = doc.clientWidth;

    const overflowing: string[] = [];
    for (const el of Array.from(document.body.querySelectorAll<HTMLElement>('*')).slice(0, 400)) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.right > vw + 1 && el.children.length === 0) {
        const describe = el.tagName.toLowerCase() + (el.id ? `#${el.id}` : '');
        overflowing.push(describe);
        if (overflowing.length >= 10) break;
      }
    }

    let cls: number;
    try {
      const entries = performance.getEntriesByType('layout-shift') as unknown as Array<{
        value: number;
        hadRecentInput: boolean;
      }>;
      cls = entries.filter((e) => !e.hadRecentInput).reduce((s, e) => s + e.value, 0);
    } catch {
      cls = 0;
    }

    let lcpMs: number;
    try {
      const lcp = (
        performance.getEntriesByType('largest-contentful-paint') as unknown as Array<{
          startTime: number;
        }>
      ).at(-1);
      lcpMs = lcp ? Math.round(lcp.startTime) : 0;
    } catch {
      lcpMs = 0;
    }

    const small: TapTarget[] = [];
    const interactive = document.querySelectorAll('a, button, input, [role="button"]');
    for (const el of Array.from(interactive).slice(0, 200)) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && (r.width < 44 || r.height < 44)) {
        small.push({
          selector:
            el.tagName.toLowerCase() +
            (el.id
              ? `#${el.id}`
              : el.textContent && el.textContent.trim()
                ? `:${el.textContent.trim().slice(0, 24)}`
                : ''),
          width: Math.round(r.width),
          height: Math.round(r.height),
        });
      }
      if (small.length >= 20) break;
    }

    const landmarkEls = document.querySelectorAll(
      'header, nav, main, section, footer, aside, [role="main"], [role="navigation"]',
    );
    const landmarks = Array.from(landmarkEls)
      .slice(0, 30)
      .map((el) => el.tagName.toLowerCase() + (el.id ? `#${el.id}` : ''));

    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map((h) => ({
      level: Number(h.tagName.slice(1)),
      text: h.textContent?.trim().slice(0, 60) ?? '',
    }));

    return {
      url: location.href,
      title: document.title,
      horizontalOverflow: doc.scrollWidth > doc.clientWidth,
      overflowingElements: overflowing,
      cls: Math.round(cls * 1000) / 1000,
      lcpMs,
      smallTapTargets: small,
      landmarks,
      headings,
    };
  });
}
