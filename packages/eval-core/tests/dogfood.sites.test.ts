/**
 * T0906 — build the three dogfood reference implementations and audit them.
 *
 * marketing (Next), commerce (Astro) and admin/dashboard (Next) are built, served
 * and driven in Chromium under the checks in `dogfood.ts`. Each check maps to a
 * rule the skill states, so a failure is a rule that did not survive contact with
 * a real page — written down as a finding, not smoothed over.
 *
 * Costs three real builds, so it is not in `pnpm verify`: run `pnpm dogfood`.
 *
 * Evidence policy (A10 acceptance): the bundle — screenshots, measurements, page
 * snapshots — is written under `evals/evidence/dogfood-private/`, which is
 * git-ignored, pending the artifact-level consent, licensing and PII/secret checks.
 * Only the redacted summary in `evals/evidence/dogfood/` is committed.
 */
import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import { type Browser, chromium } from 'playwright';
import { describe, expect, it } from 'vitest';
import {
  DOGFOOD_CHECKS,
  evaluateSite,
  renderSummary,
  summarise,
  type DogfoodObservation,
} from '../src/index.js';

const REPO = fileURLToPath(new URL('../../..', import.meta.url));
const PRIVATE = join(REPO, 'evals', 'evidence', 'dogfood-private');
const PUBLIC = join(REPO, 'evals', 'evidence', 'dogfood');
const RUN = process.env.SUS_DOGFOOD === '1';
const TIMEOUT = 900_000;

interface Site {
  name: string;
  dir: string;
  build: [string, string[]];
  serve: [string, string[]];
  path: string;
}

const SITES: Site[] = [
  {
    name: 'marketing',
    dir: join(REPO, 'fixtures', 'marketing'),
    build: ['next', ['build']],
    serve: ['next', ['start', '--port', '4310']],
    path: '/',
  },
  {
    name: 'commerce',
    dir: join(REPO, 'fixtures', 'commerce'),
    build: ['astro', ['build']],
    serve: ['astro', ['preview', '--host', '127.0.0.1', '--port', '4311']],
    path: '/',
  },
  {
    name: 'admin',
    dir: join(REPO, 'fixtures', 'admin'),
    build: ['next', ['build']],
    serve: ['next', ['start', '--port', '4312']],
    path: '/',
  },
];

async function waitForServer(url: string, child: ChildProcess): Promise<void> {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`server exited with ${child.exitCode}`);
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // not listening yet
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`server did not answer at ${url} within 120s`);
}

async function checkFocusVisible(page: import('playwright').Page): Promise<DogfoodObservation> {
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  let measured = 'no focusable element reached';
  for (let press = 0; press < 12; press += 1) {
    await page.keyboard.press('Tab');
    const style = await page.evaluate(() => {
      const element = document.activeElement as HTMLElement | null;
      if (!element || element === document.body) return null;
      const computed = getComputedStyle(element);
      return {
        tag: element.tagName.toLowerCase(),
        outlineStyle: computed.outlineStyle,
        outlineWidth: computed.outlineWidth,
        boxShadow: computed.boxShadow,
      };
    });
    if (!style) continue;
    const outline = style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0;
    const shadow = style.boxShadow !== 'none' && style.boxShadow.includes('rgb');
    if (!outline && !shadow) {
      return {
        checkId: 'focus-visible',
        status: 'fail',
        measured: `<${style.tag}> has no visible focus ring`,
        failures: [
          `<${style.tag}> outline=${style.outlineStyle} width=${style.outlineWidth} shadow=${style.boxShadow}`,
        ],
      };
    }
    measured = `<${style.tag}> paints a focus ring`;
    break;
  }
  return { checkId: 'focus-visible', status: measured.startsWith('<') ? 'pass' : 'fail', measured };
}

async function checkReducedMotion(page: import('playwright').Page): Promise<DogfoodObservation> {
  const offenders = await page.evaluate(() => {
    const dying: string[] = [];
    for (const element of Array.from(document.querySelectorAll('*'))) {
      const computed = getComputedStyle(element);
      const durations = `${computed.transitionDuration} ${computed.animationDuration}`
        .split(',')
        .map((value) => parseFloat(value))
        .filter((value) => Number.isFinite(value) && value > 0);
      if (durations.length > 0) {
        dying.push(`${element.tagName.toLowerCase()}.${element.className || '(no class)'}`);
      }
      if (dying.length >= 10) break;
    }
    return dying;
  });
  return {
    checkId: 'reduced-motion-quiet',
    status: offenders.length === 0 ? 'pass' : 'fail',
    measured: offenders.length,
    failures: offenders.slice(0, 5),
  };
}

async function checkLabelledControls(page: import('playwright').Page): Promise<DogfoodObservation> {
  const unlabelled = await page.evaluate(() => {
    const bad: string[] = [];
    for (const element of Array.from(document.querySelectorAll('input, select, textarea'))) {
      const input = element as HTMLInputElement;
      if (input.type === 'hidden') continue;
      const labelled =
        Boolean(input.getAttribute('aria-label')) ||
        Boolean(input.getAttribute('aria-labelledby')) ||
        Boolean((input as HTMLElement).closest('label')) ||
        Boolean(input.id && document.querySelector(`label[for="${input.id}"]`));
      if (!labelled) bad.push(`${input.tagName.toLowerCase()}[type=${input.type || 'text'}]`);
    }
    return bad;
  });
  return {
    checkId: 'labelled-controls',
    status: unlabelled.length === 0 ? 'pass' : 'fail',
    measured: unlabelled.length,
    failures: unlabelled.slice(0, 5),
  };
}

async function checkReflow(page: import('playwright').Page): Promise<DogfoodObservation> {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth };
  });
  const over = overflow.scrollWidth - overflow.clientWidth;
  return {
    checkId: 'reflow-390',
    status: over <= 1 ? 'pass' : 'fail',
    measured: over,
    failures: over > 1 ? [`horizontal scroll of ${over}px at 390px`] : [],
  };
}

async function auditSite(browser: Browser, site: Site, url: string): Promise<DogfoodObservation[]> {
  const observations: DogfoodObservation[] = [];
  const evidenceDir = join(PRIVATE, site.name);
  mkdirSync(evidenceDir, { recursive: true });

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.screenshot({
    path: join(evidenceDir, 'desktop.png'),
    fullPage: true,
    animations: 'disabled',
  });

  const axe = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const serious = axe.violations.filter(
    (violation) => violation.impact === 'serious' || violation.impact === 'critical',
  );
  observations.push({
    checkId: 'a11y-wcag-aa',
    status: serious.length === 0 ? 'pass' : 'fail',
    measured: axe.violations.length,
    failures: serious.map((violation) => `${violation.id} (${violation.nodes.length} nodes)`),
  });

  observations.push(await checkLabelledControls(page));
  observations.push(await checkFocusVisible(page));
  await context.close();

  const reduced = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'reduce',
  });
  const reducedPage = await reduced.newPage();
  await reducedPage.goto(url, { waitUntil: 'networkidle' });
  observations.push(await checkReducedMotion(reducedPage));
  await reduced.close();

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mobilePage = await mobile.newPage();
  await mobilePage.goto(url, { waitUntil: 'networkidle' });
  await mobilePage.screenshot({
    path: join(evidenceDir, 'mobile.png'),
    fullPage: true,
    animations: 'disabled',
  });
  observations.push(await checkReflow(mobilePage));
  await mobile.close();

  writeFileSync(
    join(evidenceDir, 'observations.json'),
    `${JSON.stringify({ site: site.name, url, observations }, null, 2)}\n`,
  );
  return observations;
}

describe.runIf(RUN)('dogfood reference implementations (T0906)', () => {
  it(
    'builds and audits marketing, commerce and dashboard, writing a redacted summary',
    async () => {
      const reports = [];
      const browser = await chromium.launch();
      try {
        for (const site of SITES) {
          execFileSync('pnpm', ['exec', ...site.build], {
            cwd: site.dir,
            stdio: 'pipe',
            env: { ...process.env, CI: '1' },
          });
          const [command, args] = site.serve;
          const child = spawn('pnpm', ['exec', command, ...args], {
            cwd: site.dir,
            stdio: 'ignore',
            env: { ...process.env },
          });
          const port = args.find((arg) => /^\d+$/.test(arg));
          const url = `http://127.0.0.1:${port}${site.path}`;
          try {
            await waitForServer(url, child);
            const observations = await auditSite(browser, site, url);
            reports.push(evaluateSite(site.name, observations));
          } finally {
            child.kill('SIGTERM');
          }
        }
      } finally {
        await browser.close();
      }

      const summary = summarise(reports, new Date().toISOString());
      mkdirSync(PUBLIC, { recursive: true });
      writeFileSync(join(PUBLIC, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
      writeFileSync(join(PUBLIC, 'SUMMARY.md'), renderSummary(summary));

      expect(reports).toHaveLength(SITES.length);
      // Every check must have produced a measurement: `not-run` would mean the
      // audit silently skipped, which is the failure this track exists to catch.
      expect(summary.notRun).toEqual([]);
      expect(DOGFOOD_CHECKS.length).toBeGreaterThan(0);
      expect(existsSync(join(PUBLIC, 'SUMMARY.md'))).toBe(true);
    },
    TIMEOUT,
  );
});
