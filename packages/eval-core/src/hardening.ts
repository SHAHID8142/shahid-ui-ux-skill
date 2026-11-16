/**
 * Hardening matrix runner (T0551, DA-46).
 *
 * Matrix over a served page: viewports (incl. the G7 320px equivalence
 * column) × themes × reduced-motion. Each cell records overflow + tap
 * targets + landmark presence. The 400% zoom equivalence is a **separate**
 * measurement, not a matrix cell: 400% zoom on a 1280×1024 window is a 320×256
 * CSS px viewport rasterised at device scale factor 4, which the 320×568 phone
 * column cannot stand in for (a fixed header that fits a 568 px height can eat
 * a 256 px one). The user-agent zoom setting itself is still never driven —
 * that, and text-only zoom, stay `not-run` rather than assumed.
 * Locale set is prioritized PER BRIEF (shaping/fallback fonts, segmentation,
 * input methods, currency/date/numerals, translated errors) — never a
 * universal locale claim.
 */
import { chromium, type Browser, type Page } from 'playwright';
import { collectPageMetrics, type PageMetrics } from './harness/metrics.js';

export interface MatrixCell {
  viewport: string;
  theme: 'light' | 'dark';
  reducedMotion: 'reduce' | 'no-preference';
  metrics: PageMetrics;
  overflow: boolean;
  pass: boolean;
}

export interface HardeningResult {
  url: string;
  cells: MatrixCell[];
  failures: string[];
  localeSet: string[];
  /**
   * The 400% zoom equivalence record G7 consumes (`evaluateZoom400`).
   * `null` means the visit could not be made; the gate then reports `not-run`.
   */
  zoom400: Zoom400Record | null;
  zoomNote: string;
}

/** One content-clipping container: the "looks reflowed" cheat G7 must catch. */
export interface ClippingElement {
  selector: string;
  overflow: string;
  /** How much content is clipped, in CSS px: the measured value, not just a verdict. */
  overflowPx: number;
}

/**
 * 400% zoom on a 1280×1024 window, recorded as the CSS px viewport it produces.
 * The declared numbers travel with the measurements so a reader can check the
 * arithmetic instead of trusting the label.
 */
export interface Zoom400Record {
  url: string;
  width: 320;
  height: 256;
  deviceScaleFactor: 4;
  theme: 'light';
  reducedMotion: 'no-preference';
  metrics: PageMetrics;
  documentScrollWidth: number;
  documentClientWidth: number;
  overflowingElements: string[];
  clippingElements: ClippingElement[];
  overflow: boolean;
}

/** The CSS px viewport 400% zoom produces on a 1280×1024 window. */
export const ZOOM400_EQUIVALENCE = { width: 320, height: 256, deviceScaleFactor: 4 } as const;

/**
 * Clipping probe: containers that hide overflow while content still overflows
 * them. `overflow: hidden` makes the horizontal scrollbar disappear from a
 * measurement while the content stays unreachable, so it is recorded, not ignored.
 */
async function collectClippingElements(page: Page): Promise<ClippingElement[]> {
  return page.evaluate(() => {
    const found: Array<{ selector: string; overflow: string; overflowPx: number }> = [];
    for (const el of Array.from(document.body.querySelectorAll<HTMLElement>('*')).slice(0, 400)) {
      const style = getComputedStyle(el);
      const hidden = (value: string) => value === 'hidden' || value === 'clip';
      if (!hidden(style.overflowX) && !hidden(style.overflowY)) continue;
      const clips = el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1;
      if (!clips) continue;
      found.push({
        selector:
          el.tagName.toLowerCase() +
          (el.id
            ? `#${el.id}`
            : el.className && typeof el.className === 'string'
              ? `.${el.className.trim().split(/\s+/).slice(0, 2).join('.')}`
              : ''),
        overflow: hidden(style.overflowX) ? style.overflowX : style.overflowY,
        overflowPx: Math.max(el.scrollWidth - el.clientWidth, el.scrollHeight - el.clientHeight, 0),
      });
      if (found.length >= 10) break;
    }
    return found;
  });
}

async function measureZoom400(browser: Browser, url: string): Promise<Zoom400Record> {
  const { width, height, deviceScaleFactor } = ZOOM400_EQUIVALENCE;
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor,
    colorScheme: 'light',
    reducedMotion: 'no-preference',
    // Desktop UA on purpose: 400% zoom is a desktop-browser setting, and mobile
    // emulation would apply the viewport meta, changing the layout being measured.
    isMobile: false,
  });
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: 'networkidle' });
    const metrics = await collectPageMetrics(page);
    const clippingElements = await collectClippingElements(page);
    const documentScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const documentClientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    return {
      url: metrics.url,
      width,
      height,
      deviceScaleFactor,
      theme: 'light',
      reducedMotion: 'no-preference',
      metrics,
      documentScrollWidth,
      documentClientWidth,
      overflowingElements: metrics.overflowingElements,
      clippingElements,
      overflow:
        metrics.horizontalOverflow ||
        documentScrollWidth > documentClientWidth ||
        metrics.overflowingElements.length > 0,
    };
  } finally {
    await context.close();
  }
}

const VIEWPORTS = [
  { name: 'mobile-320', width: 320, height: 568 },
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'desktop-1440', width: 1440, height: 900 },
];

export async function runHardeningMatrix(
  url: string,
  localeSet: string[] = ['en'],
): Promise<HardeningResult> {
  const browser = await chromium.launch();
  const cells: MatrixCell[] = [];
  const failures: string[] = [];
  let zoom400: Zoom400Record | null = null;
  let zoomFailure: string | null = null;
  try {
    for (const vp of VIEWPORTS) {
      for (const theme of ['light', 'dark'] as const) {
        for (const reducedMotion of ['reduce', 'no-preference'] as const) {
          const context = await browser.newContext({
            viewport: { width: vp.width, height: vp.height },
            colorScheme: theme,
            reducedMotion,
          });
          const page = await context.newPage();
          await page.goto(url, { waitUntil: 'networkidle' });
          const metrics = await collectPageMetrics(page);
          // G7: overflow fails the cell except inside deliberate scroll
          // regions (data tables etc. — overflow collection already counts
          // only leaf elements wider than the viewport)
          const overflow = metrics.horizontalOverflow;
          const pass = !overflow;
          if (!pass) failures.push(`${vp.name}/${theme}/${reducedMotion}: horizontal overflow`);
          cells.push({ viewport: vp.name, theme, reducedMotion, metrics, overflow, pass });
          await context.close();
        }
      }
    }

    // The 400% zoom equivalence is measured after the matrix, in its own
    // context: same page, different CSS px viewport and raster scale. A visit
    // that throws leaves the record null, which the gate reports as `not-run`
    // rather than inheriting the matrix's result.
    try {
      zoom400 = await measureZoom400(browser, url);
      if (zoom400.overflow) {
        failures.push(
          `zoom400/${ZOOM400_EQUIVALENCE.width}x${ZOOM400_EQUIVALENCE.height}: horizontal overflow at 400% zoom equivalence`,
        );
      }
    } catch (error) {
      zoomFailure = error instanceof Error ? error.message : String(error);
    }
  } finally {
    await browser.close();
  }
  return {
    url,
    cells,
    failures,
    localeSet,
    zoom400,
    zoomNote: zoomFailure
      ? `400%-zoom equivalence not-run — the zoom visit failed: ${zoomFailure}`
      : zoom400 === null
        ? '400%-zoom equivalence not-run — no zoom record was produced'
        : `400%-zoom equivalence measured as ${ZOOM400_EQUIVALENCE.width}x${ZOOM400_EQUIVALENCE.height} CSS px at device scale factor ${ZOOM400_EQUIVALENCE.deviceScaleFactor}` +
          ' (the viewport a 400% zoom produces on a 1280x1024 window). The user-agent zoom setting and text-only zoom are still not driven: not-run, not claimed.',
  };
}
