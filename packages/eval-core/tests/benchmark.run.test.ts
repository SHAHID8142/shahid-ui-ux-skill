/**
 * T1002 — benchmark runner (PRD Part 9).
 *
 * `pnpm benchmark` measures whatever is measurable today and refuses to turn
 * that into a comparative claim. The three arms:
 *
 *  - **baseline** (no skill): the evaluated pages under `evals/baselines/<surface>/page.html`
 *    — measured now, deterministically;
 *  - **sus-assisted**: `not-run` — no assisted artefacts exist yet, so there is
 *    nothing to measure. Reported as not-run, never as a win;
 *  - **human** (blind A/B, n per the protocol): `not-run` — no participants have
 *    been recruited. This is the arm the protocol is built around, and inventing
 *    a result for it would poison every future claim.
 *
 * The artefact it writes (`evals/benchmarks/results/<ts>.json`) is the input to
 * the claim gate, so "no claim without this" is enforced by data, not by memory.
 *
 * Costs real browser work; not part of `pnpm verify`.
 */
import { createServer } from 'node:http';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import { chromium } from 'playwright';
import { describe, expect, it } from 'vitest';
import { comparativeClaimAllowed } from '../../../scripts/lib/benchmark.mjs';
import { DOGFOOD_CHECKS, evaluateSite, type DogfoodObservation } from '../src/index.js';

const REPO = fileURLToPath(new URL('../../..', import.meta.url));
const OUT = join(REPO, 'evals', 'benchmarks', 'results');
const RUN = process.env.SUS_BENCH === '1';
const SURFACES = ['marketing', 'commerce', 'admin', 'portfolio'];

async function serveFile(page: string, port: number) {
  const html = readFileSync(page, 'utf8');
  const server = createServer((request, response) => {
    if (request.url === '/' || request.url === '/index.html') {
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      response.end(html);
      return;
    }
    response.writeHead(404).end('not found');
  });
  await new Promise<void>((resolve) => server.listen(port, '127.0.0.1', resolve));
  return server;
}

async function measure(url: string): Promise<DogfoodObservation[]> {
  const browser = await chromium.launch();
  const observations: DogfoodObservation[] = [];
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });

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
    observations.push({
      checkId: 'labelled-controls',
      status: unlabelled.length === 0 ? 'pass' : 'fail',
      measured: unlabelled.length,
      failures: unlabelled.slice(0, 5),
    });
    // Focus visibility: walk the tab order until something focuses, then read the
    // ring. Same rule as the dogfood audit, measured on the baseline arm too.
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    let focusObservation: DogfoodObservation = {
      checkId: 'focus-visible',
      status: 'not-run',
      measured: 'no focusable element reached in 12 tabs',
    };
    for (let press = 0; press < 12; press += 1) {
      await page.keyboard.press('Tab');
      const style = await page.evaluate(() => {
        const element = document.activeElement as HTMLElement | null;
        if (!element || element === document.body) return null;
        const computed = getComputedStyle(element);
        return {
          tag: element.tagName.toLowerCase(),
          outlined: computed.outlineStyle !== 'none' && parseFloat(computed.outlineWidth) > 0,
          shadowed: computed.boxShadow !== 'none' && computed.boxShadow.includes('rgb'),
        };
      });
      if (!style) continue;
      const visible = style.outlined || style.shadowed;
      focusObservation = {
        checkId: 'focus-visible',
        status: visible ? 'pass' : 'fail',
        measured: `<${style.tag}> ${visible ? 'paints a focus ring' : 'has no focus ring'}`,
        failures: visible ? [] : [`<${style.tag}> has no outline and no focus shadow`],
      };
      break;
    }
    observations.push(focusObservation);
    await context.close();

    const reduced = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      reducedMotion: 'reduce',
    });
    const reducedPage = await reduced.newPage();
    await reducedPage.goto(url, { waitUntil: 'networkidle' });
    const offenders = await reducedPage.evaluate(() => {
      let count = 0;
      for (const element of Array.from(document.querySelectorAll('*'))) {
        const computed = getComputedStyle(element);
        const durations = `${computed.transitionDuration} ${computed.animationDuration}`
          .split(',')
          .map((value) => parseFloat(value))
          .filter((value) => Number.isFinite(value) && value > 0);
        if (durations.length > 0) count += 1;
      }
      return count;
    });
    observations.push({
      checkId: 'reduced-motion-quiet',
      status: offenders === 0 ? 'pass' : 'fail',
      measured: offenders,
    });
    await reduced.close();

    const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const mobilePage = await mobile.newPage();
    await mobilePage.goto(url, { waitUntil: 'networkidle' });
    const overflow = await mobilePage.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    observations.push({
      checkId: 'reflow-390',
      status: overflow <= 1 ? 'pass' : 'fail',
      measured: overflow,
      failures: overflow > 1 ? [`horizontal scroll of ${overflow}px`] : [],
    });
    await mobile.close();
  } finally {
    await browser.close();
  }
  return observations;
}

describe.runIf(RUN)('benchmark run (T1002)', () => {
  it('measures the baseline arm and refuses a comparative claim', async () => {
    const perSurface = [];
    let port = 4400;
    for (const surface of SURFACES) {
      const page = join(REPO, 'evals', 'baselines', surface, 'page.html');
      const server = await serveFile(page, port);
      try {
        const observations = await measure(`http://127.0.0.1:${port}/`);
        perSurface.push(evaluateSite(surface, observations));
      } finally {
        server.close();
      }
      port += 1;
    }

    const status = {
      generatedAt: new Date().toISOString(),
      protocol: 'evals/benchmarks/PROTOCOL.md',
      reproducibleBy: 'pnpm benchmark',
      heldOutInspected: false,
      arms: {
        baseline: {
          status: 'measured',
          note: 'no-skill baseline pages under evals/baselines, measured deterministically',
          surfaces: perSurface,
        },
        'sus-assisted': {
          status: 'not-run',
          note: 'no SUS-assisted artefacts generated for the held-out set yet',
        },
        human: {
          status: 'not-run',
          note: 'no participants recruited; blinding and sample size are specified in the protocol',
        },
      },
      deterministicChecks: DOGFOOD_CHECKS.map((check) => check.id),
    };

    const gate = comparativeClaimAllowed(status);
    mkdirSync(OUT, { recursive: true });
    const stamp = status.generatedAt.replace(/[:.]/g, '-');
    writeFileSync(join(OUT, `${stamp}.json`), `${JSON.stringify({ status, gate }, null, 2)}\n`);
    writeFileSync(join(OUT, 'status.json'), `${JSON.stringify({ status, gate }, null, 2)}\n`);

    expect(perSurface).toHaveLength(SURFACES.length);
    expect(gate.allowed).toBe(false);
    expect(status.arms.human.status).toBe('not-run');
    expect(status.arms['sus-assisted'].status).toBe('not-run');
  }, 900_000);
});
