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
  'invoice-list',
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
    const queue = /<section id="content-queue"[\s\S]*?<\/section>/.exec(html)?.[0] ?? '';
    expect((queue.match(/<tr/g) ?? []).length).toBe(5); // header row + 4 queue rows
  });

  it('renders the invoice list server-side with its first page, not an empty shell', () => {
    // The list is a client component, but Next still renders it for the first
    // paint: a page whose table is empty until JavaScript arrives is exactly the
    // failure this fixture exists to catch elsewhere.
    const invoices = /<section id="invoice-list"[\s\S]*?<\/section>/.exec(html)?.[0] ?? '';
    expect(invoices).toContain('id="invoice-table-wrap"');
    expect(invoices).toContain('INV-2026-11-000442');
    expect((invoices.match(/<tr/g) ?? []).length).toBe(6); // header + PAGE_SIZE rows
    expect(invoices).toContain('Page 1 of 3');
  });

  it('is explicitly synthetic: no external URLs, no scripts, fixture notice present', () => {
    expect(html).not.toMatch(/https?:\/\//);
    expect(html).not.toContain('<script');
    expect(html).toContain('no live data');
  });
});
