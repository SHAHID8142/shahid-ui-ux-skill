/**
 * Fixture C — Operate-mode admin (CMS = the site's control panel, D20).
 * Landmarks are load-bearing for the evaluation corpus and Operate-mode
 * playbooks (T0407/T0809). All rows and metrics are invented.
 */

const kpis = [
  { id: 'kpi-published', label: 'Published entries', value: '128', delta: '+6 this week' },
  { id: 'kpi-queue', label: 'In review', value: '14', delta: '-3 since yesterday' },
  { id: 'kpi-media', label: 'Media items', value: '2,304', delta: 'storage 61%' },
  { id: 'kpi-authors', label: 'Active authors', value: '9', delta: '3 online now' },
];

const queue = [
  {
    id: 'row-1',
    title: 'Autumn release notes',
    status: 'In review',
    editor: 'A. Lin',
    updated: '2h ago',
  },
  {
    id: 'row-2',
    title: 'Pricing page copy',
    status: 'Draft',
    editor: 'M. Okafor',
    updated: '5h ago',
  },
  {
    id: 'row-3',
    title: 'Tea-ware catalog (import)',
    status: 'Blocked',
    editor: 'system',
    updated: '1d ago',
  },
  {
    id: 'row-4',
    title: 'Homepage hero variants',
    status: 'Scheduled',
    editor: 'R. Iyer',
    updated: '3d ago',
  },
];

const sidebarNav = [
  { href: '#kpi-row', label: 'Overview' },
  { href: '#content-queue', label: 'Content queue' },
  { href: '#settings-form', label: 'Settings' },
];

export default function AdminPage() {
  return (
    <main id="admin-shell">
      <aside id="admin-sidebar" aria-label="Admin sections">
        <p className="wordmark">Ledger CMS</p>
        <nav>
          <ul>
            {sidebarNav.map((item) => (
              <li key={item.href}>
                <a href={item.href}>{item.label}</a>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <div id="admin-content">
        <header id="admin-topbar">
          <h1>Overview</h1>
          <p className="env-note">Fixture environment — no live data, no real users.</p>
        </header>

        <section id="kpi-row" aria-label="Key metrics">
          {kpis.map((k) => (
            <div className="kpi" id={k.id} key={k.id}>
              <p className="kpi-value">{k.value}</p>
              <p className="kpi-label">{k.label}</p>
              <p className="kpi-delta">{k.delta}</p>
            </div>
          ))}
        </section>

        <section id="content-queue" aria-labelledby="queue-title">
          <h2 id="queue-title">Content queue</h2>
          {/*
            One table, two layouts (issue #10). The same `<table>` markup carries a
            real table on desktop and self-labelled stacked records below the reflow
            threshold, so there is no duplicated presentation to keep in sync and no
            second copy for a screen reader to meet twice. Each cell repeats its
            column name in `data-label`, which the narrow layout paints through
            `td::before`; the `<thead>` stays in the accessibility tree instead of
            being removed with `display: none`.
          */}
          <table>
            <caption className="visually-hidden">
              Content queue: entry, status, editor, updated, actions
            </caption>
            <thead>
              <tr>
                <th scope="col">Entry</th>
                <th scope="col">Status</th>
                <th scope="col">Editor</th>
                <th scope="col">Updated</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((row) => (
                <tr key={row.id} id={row.id}>
                  <td data-label="Entry">{row.title}</td>
                  <td data-label="Status">
                    <span className={`status ${row.status.toLowerCase()}`}>{row.status}</span>
                  </td>
                  <td data-label="Editor">{row.editor}</td>
                  <td data-label="Updated">{row.updated}</td>
                  <td data-label="Actions">
                    <button type="button" className="row-action">
                      Open
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section id="settings-form" aria-labelledby="settings-title">
          <h2 id="settings-title">Workspace settings (demo)</h2>
          <form>
            <label htmlFor="setting-name">Workspace name</label>
            <input id="setting-name" type="text" defaultValue="Harbor &amp; Leaf staging" />
            <label htmlFor="setting-schedule">Publish window</label>
            <select id="setting-schedule" defaultValue="09:00">
              <option value="09:00">09:00</option>
              <option value="13:00">13:00</option>
              <option value="17:00">17:00</option>
            </select>
            <button type="button">Save (demo)</button>
          </form>
        </section>

        <footer id="admin-footer">
          <p>Synthetic admin fixture. No authentication backend; no real data.</p>
        </footer>
      </div>
    </main>
  );
}
