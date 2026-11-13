/**
 * Fixture A smoke: the page module renders the six landmark sections and
 * only synthetic content. Uses react-dom/server to keep this a real render,
 * not a string match.
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import MarketingPage from '../app/page';

const LANDMARKS = ['navbar', 'hero', 'features', 'social-proof', 'cta', 'footer'] as const;

describe('fixture A (marketing) contract', () => {
  it('renders all six landmark sections', () => {
    const html = renderToStaticMarkup(<MarketingPage />);
    for (const id of LANDMARKS) {
      expect(html).toContain(`id="${id}"`);
    }
  });

  it('renders exactly one h1 in the hero', () => {
    const html = renderToStaticMarkup(<MarketingPage />);
    expect(html).toContain('id="hero-title"');
    expect((html.match(/<h1/g) ?? []).length).toBe(1);
  });

  it('contains no external asset URLs and no tracking scripts', () => {
    const html = renderToStaticMarkup(<MarketingPage />);
    expect(html).not.toMatch(/https?:\/\//);
    expect(html).not.toContain('<script');
  });
});
