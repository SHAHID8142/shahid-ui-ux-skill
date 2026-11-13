/**
 * Fixture C smoke (T0102b): admin surface renders via react-dom/server with
 * all Operate-mode landmarks and only synthetic data.
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import AdminPage from '../app/page';

const LANDMARKS = [
  'admin-sidebar',
  'admin-topbar',
  'kpi-row',
  'content-queue',
  'settings-form',
  'admin-footer',
];

describe('fixture C (admin, Next.js — Operate mode)', () => {
  const html = renderToStaticMarkup(<AdminPage />);

  it('renders all six admin landmarks', () => {
    for (const id of LANDMARKS) expect(html).toContain(`id="${id}"`);
  });

  it('shows four KPI widgets and a four-row content queue', () => {
    expect((html.match(/class="kpi"/g) ?? []).length).toBe(4);
    expect((html.match(/<tr/g) ?? []).length).toBe(5); // header row + 4 queue rows
  });

  it('is explicitly synthetic: no external URLs, no scripts, fixture notice present', () => {
    expect(html).not.toMatch(/https?:\/\//);
    expect(html).not.toContain('<script');
    expect(html).toContain('no live data');
  });
});
