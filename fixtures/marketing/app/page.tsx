/**
 * Fixture A — marketing surface.
 *
 * Stable section landmarks (`#navbar`, `#hero`, `#features`, `#social-proof`,
 * `#cta`, `#footer`) are load-bearing for the evaluation corpus: baseline
 * scoring (T0153) and the dual-stack mapping spike (T0700) key on them.
 * Content is synthetic and original (fixture licensing rule, T0102b).
 */

const features = [
  {
    id: 'feature-boards',
    title: 'Shared boards',
    body: 'Draft briefs with teammates in one place; every draft keeps its own revision trail.',
  },
  {
    id: 'feature-alerts',
    title: 'Quiet alerts',
    body: 'Notifications arrive in one daily digest by default, with per-project overrides.',
  },
  {
    id: 'feature-exports',
    title: 'Portable exports',
    body: 'Briefs and checklists leave as plain files — no lock-in, no proprietary format.',
  },
];

const quotes = [
  {
    id: 'quote-one',
    text: 'The digest replaced four separate update pings for our small team.',
    role: 'Operations lead, twelve-person team',
  },
  {
    id: 'quote-two',
    text: 'Exports as plain files meant we could audit every brief we had written.',
    role: 'Program coordinator, nonprofit',
  },
];

export default function MarketingPage() {
  return (
    <main id="main">
      <header id="navbar" className="section navbar" aria-label="Site navigation">
        <nav>
          <a href="#hero" className="wordmark">Nimbus Desk</a>
          <ul>
            <li><a href="#features">Features</a></li>
            <li><a href="#social-proof">Stories</a></li>
            <li><a href="#cta">Get started</a></li>
          </ul>
        </nav>
      </header>

      <section id="hero" className="section hero" aria-labelledby="hero-title">
        <h1 id="hero-title">Plan the week once, then let the plan work</h1>
        <p className="lede">
          Nimbus Desk is a hypothetical planning tool used as a test fixture.
          Its copy is synthetic: nothing here describes a real product or claims.
        </p>
        <a href="#cta" className="button primary">See the checklist</a>
      </section>

      <section id="features" className="section features" aria-labelledby="features-title">
        <h2 id="features-title">Three things it does on purpose</h2>
        <ul className="feature-list">
          {features.map((f) => (
            <li key={f.id} id={f.id} className="feature-card">
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section id="social-proof" className="section social-proof" aria-labelledby="social-proof-title">
        <h2 id="social-proof-title">Notes from the fixture dataset</h2>
        <figure className="quote" id="quote-one">
          <blockquote>{quotes[0]?.text}</blockquote>
          <figcaption>{quotes[0]?.role}</figcaption>
        </figure>
        <figure className="quote" id="quote-two">
          <blockquote>{quotes[1]?.text}</blockquote>
          <figcaption>{quotes[1]?.role}</figcaption>
        </figure>
      </section>

      <section id="cta" className="section cta" aria-labelledby="cta-title">
        <h2 id="cta-title">Try the demo checklist</h2>
        <p>This fixture intentionally ships no signup flow. The button is a demo control.</p>
        <button type="button" className="button secondary">Open demo</button>
      </section>

      <footer id="footer" className="section footer">
        <p>
          Fixture content for SUS evaluation. Synthetic copy, no real persons,
          no tracking scripts, no external requests.
        </p>
      </footer>
    </main>
  );
}
