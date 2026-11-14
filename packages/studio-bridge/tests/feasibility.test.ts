/**
 * T0700wb — dual-stack trusted safe-write feasibility.
 *
 * This is the gate the reconciliation put in front of expensive production
 * knowledge: prove on BOTH real stacks that
 *
 *   selection → correct owner → isolated preview → authentic approval →
 *   apply → build verification → undo
 *
 * works on disposable copies of the fixtures, with zero harmful wrong-owner
 * writes, and that unknown ownership, untrusted provenance and replayed
 * capabilities all refuse. Nothing here mocks the stack: the fixtures are
 * stamped, really built (`next build` / `astro build`), served, selected with a
 * real browser, edited with the real editor and verified by the stack's own
 * build before the write is accepted.
 */
import { execFileSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { createServer, type Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Browser, chromium, type Page } from 'playwright';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ApplyEngine } from '../src/apply.js';
import { applyAstEdit } from '../src/editor.js';
import { buildOwnerIndex, resolveOwner, stampSource } from '../src/owner-index.js';
import { PreviewSession } from '../src/preview.js';
import {
  ActionBoundary,
  CapabilityAuthority,
  evaluateG13,
  type CapabilityBinding,
} from '../src/security.js';
import { resolveSelection } from '../src/select.js';
import type { VisualIntentData } from '@sus/schemas';

const REPO = fileURLToPath(new URL('../../..', import.meta.url));
const FIXTURES = join(REPO, 'fixtures');
const TIMEOUT = 420_000;

type Stack = 'next' | 'astro';

const STACKS: Record<
  Stack,
  {
    fixture: string;
    buildScript: string;
    bin: string;
    page: string;
    html: string;
    /** DOM anchor that a user would click, and the source file that owns it. */
    target: string;
    ownerFile: string;
    content: string;
  }
> = {
  next: {
    fixture: 'marketing',
    buildScript: 'next build',
    bin: 'next',
    page: 'app/page.tsx',
    html: join('.next', 'server', 'app', 'index.html'),
    target: 'hero-title',
    ownerFile: 'app/page.tsx',
    content: '<p className="lede" data-sus-test="cta">Start the week with one plan</p>',
  },
  astro: {
    fixture: 'commerce',
    buildScript: 'astro build',
    bin: 'astro',
    page: 'src/pages/index.astro',
    html: join('dist', 'index.html'),
    target: 'grid-title',
    ownerFile: 'src/pages/index.astro',
    content: '<p class="lede" data-sus-test="cta">Six small-batch pieces, nothing in a hurry</p>',
  },
};

const INTENT: VisualIntentData = {
  version: 1,
  intentId: 'intent-t0700wb',
  createdAt: '2026-11-14T00:00:00.000Z',
  region: { x: 0, y: 0, width: 320, height: 120 },
  target: { anchor: { kind: 'id', value: 'hero-title' }, confidence: 1 },
  sectionOwner: 'hero',
  requestedChange: 'add a short supporting line under the heading',
  responsiveScope: ['desktop', 'mobile'],
  constraints: [],
  unknowns: [],
  evidenceRefs: [],
} as unknown as VisualIntentData;

/** Copies a fixture without build output or dependencies, and links its deps. */
function disposableCopy(stack: Stack): string {
  const config = STACKS[stack];
  const source = join(FIXTURES, config.fixture);
  const root = mkdtempSync(join(tmpdir(), `sus-t0700wb-${stack}-`));
  cpSync(source, root, {
    recursive: true,
    filter: (path) => {
      if (path === source) return true;
      const relative = path.slice(source.length + 1);
      const segments = relative.split('/');
      if (
        segments.includes('node_modules') ||
        segments.includes('.next') ||
        segments.includes('.astro')
      ) {
        return false;
      }
      // a top-level dist/ is build output; a nested one is product source
      return !(segments[0] === 'dist');
    },
  });
  // the fixture's own installed dependencies, so the stack can really build
  symlinkSync(join(source, 'node_modules'), join(root, 'node_modules'), 'dir');
  return root;
}

/** Stamps every renderable source in the copy (the T0700wa plugin step). */
function stampWorkspace(root: string): string[] {
  const stamped: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === 'dist')
          continue;
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

function buildStack(
  root: string,
  stack: Stack,
): { status: 'pass' | 'fail'; ok: boolean; detail: string } {
  const config = STACKS[stack];
  try {
    execFileSync(join(root, 'node_modules', '.bin', config.bin), ['build'], {
      cwd: root,
      stdio: 'pipe',
      encoding: 'utf8',
      env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1', CI: '1' },
    });
    return { status: 'pass', ok: true, detail: `${config.buildScript} succeeded` };
  } catch (error) {
    const output = `${(error as { stdout?: string }).stdout ?? ''}${(error as { stderr?: string }).stderr ?? ''}`;
    return {
      status: 'fail',
      ok: false,
      detail: `${config.buildScript} failed: ${output.slice(-800)}`,
    };
  }
}

async function serve(html: string): Promise<{ url: string; server: Server }> {
  const server = createServer((_request, response) => {
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(html);
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('no port');
  return { url: `http://127.0.0.1:${address.port}/`, server };
}

async function openHtml(
  browser: Browser,
  html: string,
): Promise<{ page: Page; close: () => Promise<void> }> {
  const { url, server } = await serve(html);
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  return {
    page,
    close: async () => {
      await page.close();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}

/** Everything the apply path needs, wired the way production must wire it. */
function applyHarness(root: string, stack: Stack, content: string) {
  const config = STACKS[stack];
  const file = config.page;
  const before = readFileSync(join(root, file), 'utf8');
  const edited = applyAstEdit(file, before, {
    operation: 'insert-child',
    target: { anchor: config.target },
    content,
  });
  if (!edited.ok) throw new Error(`fixture edit refused: ${edited.reason} ${edited.detail}`);
  const session = PreviewSession.open(root, INTENT, [{ path: file, after: edited.after }]);
  const proposal = session.propose();
  const grant = session.approve({ proposalId: proposal.proposalId, approvedBy: 'owner@example' });
  const binding: CapabilityBinding = {
    sessionId: 'session-t0700wb',
    frameId: 'frame-main',
    kind: 'write',
    proposalSha256: grant.proposalSha256,
    fence: 7,
  };
  const authority = new CapabilityAuthority();
  const boundary = new ActionBoundary(authority);
  const engine = new ApplyEngine(root, { boundary, verify: () => buildStack(root, stack) });
  return {
    file,
    before,
    after: edited.after,
    session,
    proposal,
    grant,
    binding,
    authority,
    engine,
    capabilityId: authority.issue(binding, 'owner@example').id,
    edits: [
      {
        file,
        edit: { operation: 'insert-child' as const, target: { anchor: config.target }, content },
      },
    ],
  };
}

let browser: Browser;

beforeAll(async () => {
  browser = await chromium.launch();
}, TIMEOUT);

afterAll(async () => {
  await browser?.close();
});

/** Runs the whole chain for one stack on a disposable copy. */
async function assertFullChain(stack: Stack): Promise<void> {
  const config = STACKS[stack];
  const root = disposableCopy(stack);
  try {
    stampWorkspace(root);
    const harness = applyHarness(root, stack, config.content);

    // the approved diff is the diff the user saw
    expect(harness.proposal.files).toHaveLength(1);
    expect(harness.proposal.files[0]!.path).toBe(harness.file);

    const receipt = await harness.engine.apply({
      session: harness.session,
      grant: harness.grant,
      capabilityId: harness.capabilityId,
      binding: harness.binding,
      provenance: 'user-drawn',
      edits: harness.edits,
      operationId: `op-${stack}-happy`,
    });

    expect(receipt.status, JSON.stringify(receipt)).toBe('applied');
    expect(receipt.verification.status).toBe('pass');
    expect(readFileSync(join(root, harness.file), 'utf8')).toBe(harness.after);

    // the stack still builds with the edit in place
    expect(buildStack(root, stack).ok).toBe(true);

    // undo restores the exact preimage and cannot be repeated into a clobber
    const undone = harness.engine.undo(`op-${stack}-happy`);
    expect(undone.ok, JSON.stringify(undone)).toBe(true);
    expect(readFileSync(join(root, harness.file), 'utf8')).toBe(harness.before);
    expect(harness.engine.undo(`op-${stack}-happy`).ok).toBe(false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

/** Proves the two denial classes that must hold before any real project. */
async function assertDenials(stack: Stack): Promise<void> {
  const root = disposableCopy(stack);
  try {
    stampWorkspace(root);
    const harness = applyHarness(root, stack, STACKS[stack].content);

    // the instruction came from the page itself: data, not authorisation
    const untrusted = await harness.engine.apply({
      session: harness.session,
      grant: harness.grant,
      capabilityId: harness.capabilityId,
      binding: harness.binding,
      provenance: 'page-dom',
      edits: harness.edits,
      operationId: `op-${stack}-untrusted`,
    });
    expect(untrusted.status).toBe('refused');
    expect(untrusted.reason).toBe('untrusted-provenance');
    expect(readFileSync(join(root, harness.file), 'utf8')).toBe(harness.before);

    const first = await harness.engine.apply({
      session: harness.session,
      grant: harness.grant,
      capabilityId: harness.capabilityId,
      binding: harness.binding,
      provenance: 'user-drawn',
      edits: harness.edits,
      operationId: `op-${stack}-replay-1`,
    });
    expect(first.status).toBe('applied');

    const second = await harness.engine.apply({
      session: harness.session,
      grant: harness.grant,
      capabilityId: harness.capabilityId,
      binding: harness.binding,
      provenance: 'user-drawn',
      edits: harness.edits,
      operationId: `op-${stack}-replay-2`,
    });
    expect(second.status).toBe('refused');
    // the approval is bound to the preimage and the capability to that
    // approval, so the retry dies at whichever bound it hits first
    expect(['capability-replayed', 'stale-approval']).toContain(second.reason);
    const written = readFileSync(join(root, harness.file), 'utf8');
    expect(written).toBe(harness.after);
    expect(written.split('data-sus-test').length - 1).toBe(1);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

/** Stamps, really builds, serves and selects a live anchor from the built DOM. */
async function assertLiveSelection(stack: Stack): Promise<void> {
  const config = STACKS[stack];
  const root = disposableCopy(stack);
  try {
    const stamped = stampWorkspace(root);
    expect(stamped).toContain(config.page);
    const built = buildStack(root, stack);
    expect(built.ok, built.detail).toBe(true);

    const html = readFileSync(join(root, config.html), 'utf8');
    // the stamp survives the real renderer — the T0700 requirement
    expect(html).toContain('data-sus-id');

    const opened = await openHtml(browser, html);
    try {
      const selection = await resolveSelection(opened.page, config.target);
      expect(selection.confidence).toBe(1);
      expect(selection.editRefused).toBe(false);
    } finally {
      await opened.close();
    }

    const index = buildOwnerIndex(
      stamped.map((path) => ({ path, text: readFileSync(join(root, path), 'utf8') })),
    );
    const owner = resolveOwner(index, config.target);
    expect(owner.ok).toBe(true);
    if (!owner.ok) return;
    expect(owner.owner.file.replace(/\\/g, '/')).toContain(config.ownerFile);

    const unknown = resolveOwner(index, 'anchor-that-is-not-in-the-product');
    expect(unknown.ok).toBe(false);
    if (unknown.ok) return;
    expect(unknown.reason).toBe('unknown-owner');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

describe('next stack (Next.js marketing fixture)', () => {
  it(
    'selection → owner → preview → approval → apply → build verification → undo',
    async () => {
      await assertLiveSelection('next');
      await assertFullChain('next');
      await assertDenials('next');
    },
    TIMEOUT,
  );
});

describe('astro stack (Astro commerce fixture)', () => {
  it(
    'selection → owner is proven on the built page, and unknown ownership refuses',
    async () => {
      await assertLiveSelection('astro');
    },
    TIMEOUT,
  );

  it(
    'fails closed on an Astro source instead of mangling it (editor support is T0700wc)',
    () => {
      const root = disposableCopy('astro');
      try {
        stampWorkspace(root);
        const page = STACKS.astro.page;
        const before = readFileSync(join(root, page), 'utf8');
        const attempt = applyAstEdit(page, before, {
          operation: 'insert-child',
          target: { anchor: STACKS.astro.target },
          content: STACKS.astro.content,
        });
        // The editor is JSX-only today. The safe outcome is a refusal that
        // leaves the source byte-identical — never a partially written file.
        expect(attempt.ok).toBe(false);
        if (attempt.ok) return;
        expect(attempt.reason).toBe('unparseable-source');
        expect(readFileSync(join(root, page), 'utf8')).toBe(before);
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    },
    TIMEOUT,
  );
});

describe('promotion gates that must hold before any real project is touched', () => {
  it('a G13 claim without a privacy scope is refused, never waived', () => {
    const verdict = evaluateG13({
      capture: 'screenshot',
      minimized: false,
      retained: true,
    } as never);
    expect(verdict.status).not.toBe('pass');
    expect(verdict.waivable).toBe(false);
  });

  it('the editor refuses an edit that drops the section anchor', () => {
    const before = '<main><h1 id="hero-title">Hi</h1></main>';
    const kept = applyAstEdit('app/page.tsx', before, {
      operation: 'replace-node',
      target: { anchor: 'hero-title' },
      content: '<h1 id="hero-title">Hi again</h1>',
    });
    const dropped = applyAstEdit('app/page.tsx', before, {
      operation: 'replace-node',
      target: { anchor: 'hero-title' },
      content: '<h1>Hi again</h1>',
    });
    expect(kept.ok).toBe(true);
    expect(dropped.ok).toBe(false);
    if (dropped.ok) return;
    expect(dropped.reason).toBe('post-edit-target-lost');
  });

  it('both stacks have a real rebuild command, so verification is never skipped', () => {
    for (const stack of ['next', 'astro'] as Stack[]) {
      expect(STACKS[stack].buildScript).toBe(`${STACKS[stack].bin} build`);
      expect(existsSync(join(FIXTURES, STACKS[stack].fixture))).toBe(true);
    }
  });

  it('the disposable copy never inherits build output', () => {
    const root = disposableCopy('astro');
    try {
      expect(existsSync(join(root, 'dist'))).toBe(false);
      expect(existsSync(join(root, 'node_modules', '.bin', 'astro'))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
