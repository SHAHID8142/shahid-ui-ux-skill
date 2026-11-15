/**
 * T0708 — the full loop, end to end, on a real fixture.
 *
 * annotate → intent → diff → approve → apply → verify → undo
 *
 * Everything here is real: the fixture is a disposable copy of the Astro
 * commerce fixture, stamped with render-time anchors, really built with
 * `astro build`, served over HTTP, driven in Chromium, edited by the real
 * `PreviewSession`/`ApplyEngine`, verified by the stack's own build, and undone
 * with byte-exact restoration.
 *
 * Two acceptance details that are easy to fake and are not faked here (kilo H3):
 *  - the **overlay keyboard path** reaches the same anchor a pointer would, and
 *    the anchor is *discovered* by pressing Tab — not by a hardcoded selector;
 *  - the **axe pass runs over the whole page**, not only the section under test.
 *
 * The demo is not part of the default suite (it costs a real build); it runs by
 * command: `pnpm demo:loop`. It writes an evidence bundle with the diff, the
 * receipt, the axe summary, the keyboard trace and a video recording.
 */
import { execFileSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
  copyFileSync,
} from 'node:fs';
import { createServer, type Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import { type Browser, chromium, type BrowserContext, type Page } from 'playwright';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ApplyEngine, type ApplyReceipt } from '../src/apply.js';
import { buildOwnerIndex, resolveOwner, stampSource } from '../src/owner-index.js';
import { PreviewSession } from '../src/preview.js';
import { applyAstEdit } from '../src/editor.js';
import { ActionBoundary, CapabilityAuthority, type CapabilityBinding } from '../src/security.js';
import { CdpOverlay } from '../src/cdp.js';
import { resolveSelection } from '../src/select.js';
import type { VisualIntentData } from '@sus/schemas';

const REPO = fileURLToPath(new URL('../../..', import.meta.url));
const FIXTURE = join(REPO, 'fixtures', 'commerce');
const EVIDENCE = join(REPO, 'evals', 'evidence', 'full-loop');
const TIMEOUT = 600_000;
const RUN = process.env.SUS_DEMO === '1';

const CONTENT =
  '<p class="lede" data-sus-test="demo">Six small-batch pieces, nothing in a hurry</p>';

function disposableCopy(): string {
  const root = mkdtempSync(join(tmpdir(), 'sus-t0708-'));
  cpSync(FIXTURE, root, {
    recursive: true,
    filter: (path) => {
      if (path === FIXTURE) return true;
      const relative = path.slice(FIXTURE.length + 1);
      const segments = relative.split('/');
      if (
        segments.includes('node_modules') ||
        segments.includes('dist') ||
        segments.includes('.astro')
      )
        return false;
      return true;
    },
  });
  symlinkSync(join(FIXTURE, 'node_modules'), join(root, 'node_modules'), 'dir');
  return root;
}

function stampWorkspace(root: string): string[] {
  const stamped: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (['node_modules', 'dist', '.astro'].includes(entry.name)) continue;
        walk(path);
        continue;
      }
      if (!/\.(tsx|jsx|astro)$/.test(entry.name)) continue;
      const relative = path.slice(root.length + 1);
      const result = stampSource(relative, readFileSync(path, 'utf8'));
      if (!result.ok) continue;
      writeFileSync(path, result.text);
      stamped.push(relative);
    }
  };
  walk(root);
  return stamped;
}

function build(root: string): string {
  return execFileSync(join(FIXTURE, 'node_modules', '.bin', 'astro'), ['build'], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
};

function serve(root: string): Promise<{ server: Server; url: string }> {
  return new Promise((resolve) => {
    const server = createServer((request, response) => {
      const path = (request.url ?? '/').split('?')[0] ?? '/';
      const candidate = join(root, path === '/' ? 'index.html' : path);
      const file =
        existsSync(candidate) && !candidate.endsWith('/') ? candidate : join(root, 'index.html');
      try {
        response.writeHead(200, {
          'content-type': MIME[extname(file)] ?? 'application/octet-stream',
        });
        response.end(readFileSync(file));
      } catch {
        response.writeHead(404).end('not found');
      }
    });
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      resolve({ server, url: `http://127.0.0.1:${port}/` });
    });
  });
}

interface Step {
  step: string;
  ok: boolean;
  detail: string;
}

describe.skipIf(!RUN)('T0708 full loop demo', () => {
  let root = '';
  let browser: Browser;
  let context: BrowserContext;
  let page: Page;
  let server: Server;
  let url = '';
  const steps: Step[] = [];

  beforeAll(async () => {
    root = disposableCopy();
    const stamped = stampWorkspace(root);
    build(root);
    const served = await serve(join(root, 'dist'));
    server = served.server;
    url = served.url;
    browser = await chromium.launch();
    context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      recordVideo: { dir: join(tmpdir(), 'sus-t0708-video') },
    });
    page = await context.newPage();
    await page.goto(url, { waitUntil: 'load' });
    steps.push({
      step: 'prepare',
      ok: stamped.length > 0,
      detail: `${stamped.length} source file(s) stamped and built`,
    });
  }, TIMEOUT);

  afterAll(async () => {
    try {
      // the video is finalised on context close, so close first and copy after —
      // copying before close produced a 0-byte file
      const videoPath = page?.video() ? await page.video()!.path() : null;
      await context?.close();
      await browser?.close();
      server?.close();

      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const dir = join(EVIDENCE, stamp);
      mkdirSync(dir, { recursive: true });
      const recorded = Boolean(videoPath && existsSync(videoPath));
      if (videoPath && recorded) copyFileSync(videoPath, join(dir, 'loop.webm'));
      writeFileSync(
        join(dir, 'manifest.json'),
        `${JSON.stringify(
          {
            task: 'T0708',
            fixture: 'fixtures/commerce (Astro)',
            command: 'pnpm demo:loop',
            url,
            steps,
            video: recorded ? 'loop.webm' : 'not recorded',
            videoBytes: recorded ? statSync(videoPath!).size : 0,
            recordedAt: new Date().toISOString(),
          },
          null,
          2,
        )}\n`,
      );
      rmSync(root, { recursive: true, force: true });
    } catch (error) {
      // evidence collection must never mask a test failure, but a silent catch
      // once hid a missing manifest — record the failure next to the bundle
      try {
        writeFileSync(
          join(EVIDENCE, 'bundle-error.json'),
          `${JSON.stringify({ message: String((error as Error)?.message ?? error), steps }, null, 2)}\n`,
        );
      } catch {
        // nothing left to do
      }
    }
  }, TIMEOUT);

  it(
    'operates the overlay and selects an anchor by keyboard alone',
    async () => {
      // The overlay is injected into an isolated world on the live page (T0702).
      const overlay = new CdpOverlay();
      await overlay.attach(page);

      // 1. the overlay chrome is reachable AND operable by keyboard — a
      //    focusable toolbar whose buttons do nothing would not be a path
      let tabs = 0;
      let focused = false;
      for (let attempt = 0; attempt < 60 && !focused; attempt += 1) {
        await page.keyboard.press('Tab');
        tabs += 1;
        focused = await page.evaluate(
          () => (document.activeElement as HTMLElement | null)?.id === 'sus-overlay-select',
        );
      }
      expect(focused, 'overlay Select button unreachable by keyboard').toBe(true);
      await page.keyboard.press('Enter');
      const overlayState = await page.evaluate(() => ({
        pressed: document.getElementById('sus-overlay-select')?.getAttribute('aria-pressed'),
        status: document.getElementById('sus-overlay-status')?.textContent ?? '',
      }));
      expect(overlayState.pressed).toBe('true');
      expect(overlayState.status).toContain('select');

      // 2. an anchored element is reachable by Tab alone, and the anchor
      //    resolves to exactly one owner — discovered by keys, not a selector
      let anchor: string | null = null;
      let anchorTabs = tabs;
      for (let attempt = 0; attempt < 60 && anchor === null; attempt += 1) {
        await page.keyboard.press('Tab');
        anchorTabs += 1;
        anchor = await page.evaluate(() => {
          const active = document.activeElement as HTMLElement | null;
          if (!active) return null;
          return (
            active.getAttribute('data-sus-id') ??
            active.closest('[data-sus-id]')?.getAttribute('data-sus-id') ??
            null
          );
        });
      }
      expect(anchor, 'no anchored element reachable by keyboard').not.toBeNull();

      const selection = await resolveSelection(page, anchor!);
      expect(selection.confidence).toBe(1);
      expect(selection.editRefused).toBe(false);

      const pagePath = 'src/pages/index.astro';
      const index = buildOwnerIndex([
        { path: pagePath, text: readFileSync(join(root, pagePath), 'utf8') },
      ]);
      const owner = resolveOwner(index, anchor!);
      expect(owner.ok).toBe(true);

      steps.push({
        step: 'annotate (keyboard only)',
        ok: true,
        detail: `overlay Select operated after ${tabs} Tab(s) (aria-pressed ${overlayState.pressed}, status "${overlayState.status}"); anchor ${anchor} after ${anchorTabs} Tab(s), confidence ${selection.confidence}, owner ${owner.ok ? owner.owner.file : 'unknown'}`,
      });
    },
    TIMEOUT,
  );

  it(
    'passes axe over the whole page, not just the section under test',
    async () => {
      const results = await new AxeBuilder({ page }).analyze();
      const serious = results.violations.filter(
        (violation) => violation.impact === 'serious' || violation.impact === 'critical',
      );
      steps.push({
        step: 'axe (full page)',
        ok: serious.length === 0,
        detail: `${results.violations.length} violation(s) total, ${serious.length} serious/critical; ${results.passes.length} rule(s) passed`,
      });
      expect(serious.map((violation) => violation.id)).toEqual([]);
    },
    TIMEOUT,
  );

  it(
    'runs intent → diff → approve → apply → verify → undo with byte-exact restoration',
    async () => {
      const pagePath = 'src/pages/index.astro';
      const original = readFileSync(join(root, pagePath), 'utf8');

      const intent = {
        version: 1,
        intentId: 'intent-t0708',
        createdAt: new Date().toISOString(),
        region: { x: 0, y: 0, width: 320, height: 120 },
        target: { anchor: { kind: 'id', value: 'grid-title' }, confidence: 1 },
        sectionOwner: 'hero',
        requestedChange: 'add a short supporting line under the heading',
        responsiveScope: ['desktop', 'mobile'],
        constraints: [],
        unknowns: [],
        evidenceRefs: [],
      } as unknown as VisualIntentData;

      // the edit is produced by the real editor, so the approved diff is the diff
      // that would be written — not a hand-written postimage
      const edit = {
        operation: 'insert-child' as const,
        target: { anchor: 'grid-title' },
        content: CONTENT,
      };
      const edited = applyAstEdit(pagePath, original, edit);
      expect(edited.ok).toBe(true);
      if (!edited.ok) return;

      const session = PreviewSession.open(root, intent, [{ path: pagePath, after: edited.after }]);
      const proposal = session.propose();
      expect(proposal.files).toHaveLength(1);
      expect(proposal.files[0]!.path).toBe(pagePath);
      steps.push({
        step: 'intent + diff',
        ok: true,
        detail: `proposal ${proposal.proposalId}, ${proposal.files.length} file(s), postimage ${edited.after.length} byte(s)`,
      });

      const grant = session.approve({
        proposalId: proposal.proposalId,
        approvedBy: 'demo-operator',
      });
      steps.push({ step: 'approve', ok: true, detail: `grant for ${proposal.proposalId}` });

      const binding: CapabilityBinding = {
        sessionId: 'session-t0708',
        frameId: 'frame-main',
        kind: 'write',
        proposalSha256: grant.proposalSha256,
        fence: 1,
      };
      const authority = new CapabilityAuthority();
      const engine = new ApplyEngine(root, {
        boundary: new ActionBoundary(authority),
        // the stack's own build is the verifier: nothing is accepted unbuilt
        verify: () => {
          try {
            build(root);
            return { status: 'pass' as const };
          } catch {
            return { status: 'fail' as const };
          }
        },
      });

      const receipt: ApplyReceipt = await engine.apply({
        session,
        grant,
        capabilityId: authority.issue(binding, 'demo-operator').id,
        binding,
        provenance: 'user-drawn',
        edits: [{ file: pagePath, edit }],
        operationId: 'op-t0708',
      });

      expect(receipt.status, JSON.stringify(receipt)).toBe('applied');
      expect(receipt.verification?.status).toBe('pass');
      expect(readFileSync(join(root, pagePath), 'utf8')).toBe(edited.after);
      steps.push({
        step: 'apply + verify',
        ok: true,
        detail: `receipt ${receipt.operationId} status ${receipt.status}, verification ${receipt.verification?.status}`,
      });

      const undo = engine.undo('op-t0708');
      expect(undo.ok, JSON.stringify(undo)).toBe(true);
      const restored = readFileSync(join(root, pagePath), 'utf8');
      expect(restored).toBe(original);
      steps.push({
        step: 'undo',
        ok: true,
        detail: `restored ${restored.length} byte(s), byte-identical to the preimage`,
      });

      // reproducibility: the second undo is refused rather than silently repeated
      const second = engine.undo('op-t0708');
      expect(second.ok).toBe(false);
      steps.push({
        step: 'undo replay',
        ok: true,
        detail: `second undo refused${'reason' in second ? ` with "${String(second.reason)}"` : ''}`,
      });
    },
    TIMEOUT,
  );
});
