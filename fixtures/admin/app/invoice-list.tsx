'use client';

/**
 * Fixture C — invoice record list (issue #10, slice 2).
 *
 * This is the part of the admin fixture that can be in more than one state, so
 * it is the part the rules about states can be checked on:
 *
 * - `table-state-in-url` — q / status / sort / page live in the address bar, so a
 *   filtered view survives a refresh and can be shared.
 * - `table-state-announced` — after a filter, sort or page change the result
 *   count is announced through a live region, and focus stays in the toolbar.
 * - `table-empty-two-kinds` — "no records yet" (create something) and "no matches"
 *   (clear the filters) are different messages with different actions.
 * - `table-error-keeps-state` — a failed load keeps the previous rows on screen
 *   with an inline error and a retry; the table is never blanked.
 * - `table-content-adaptive` — the same markup is a table above 640px and a
 *   self-labelled record card below it (see `globals.css`).
 *
 * Honesty notes, since a fixture can easily lie:
 * - The "repository" is `invoice-repository.ts`: no network, deliberately slow.
 *   The UI says so instead of implying a real backend.
 * - The controls at the top are labelled **Fixture controls**. They exist to put
 *   the page into states a static build otherwise cannot reach.
 * - The first paint is server-rendered from `DEFAULT_QUERY`, so the page has real
 *   content without JavaScript. The URL is then adopted on mount; a page opened
 *   with filters in the address bar shows the unfiltered first page for one frame
 *   before the filters apply. That flash is a known limitation of this fixture,
 *   recorded rather than hidden.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_QUERY,
  INVOICES,
  PAGE_SIZE,
  selectInvoices,
  formatAmount,
  loadInvoices,
  queryToSearch,
  searchToQuery,
  type InvoicePage,
  type InvoiceQuery,
  type InvoiceStatus,
  type SortKey,
} from './invoice-repository';

const STATUSES: (InvoiceStatus | 'all')[] = ['all', 'Due', 'Overdue', 'Paid', 'Draft'];
const SORTS: { value: SortKey; label: string }[] = [
  { value: 'date', label: 'Newest first' },
  { value: 'amount', label: 'Largest amount' },
  { value: 'client', label: 'Client A–Z' },
];

type LoadStatus = 'ready' | 'loading' | 'error';

export default function InvoiceList() {
  const [query, setQuery] = useState<InvoiceQuery>(DEFAULT_QUERY);
  // The first page is computed, not fetched: the server renders real rows, so the
  // table is readable without JavaScript. A pure function keeps that render
  // identical on the client, which is what makes hydration safe.
  const [result, setResult] = useState<InvoicePage>(() => selectInvoices(INVOICES, DEFAULT_QUERY));
  const [status, setStatus] = useState<LoadStatus>('ready');
  const [error, setError] = useState<string | null>(null);
  const [failNext, setFailNext] = useState(false);
  const [emptyWorkspace, setEmptyWorkspace] = useState(false);
  const [announcement, setAnnouncement] = useState(() =>
    announcementFor(selectInvoices(INVOICES, DEFAULT_QUERY)),
  );
  const requestSeq = useRef(0);
  const hydrated = useRef(false);

  const records = useMemo(() => (emptyWorkspace ? [] : INVOICES), [emptyWorkspace]);

  const load = useCallback(
    async (next: InvoiceQuery, recordsNow: readonly (typeof INVOICES)[number][], fail: boolean) => {
      const token = ++requestSeq.current;
      setStatus('loading');
      try {
        const page = await loadInvoices(recordsNow, next, { fail });
        // A stale response must not overwrite a newer one.
        if (token !== requestSeq.current) return;
        setResult(page);
        setError(null);
        setStatus('ready');
        setAnnouncement(announcementFor(page));
      } catch (cause) {
        if (token !== requestSeq.current) return;
        setError(cause instanceof Error ? cause.message : String(cause));
        setStatus('error');
      }
    },
    [],
  );

  // Adopt the address bar once, then keep it in step with the query.
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    const fromUrl = searchToQuery(window.location.search);
    // Nothing to adopt: the server-rendered default page is already correct.
    if (queryToSearch(fromUrl) === '') return;
    setQuery(fromUrl); // the effect below runs for the new query
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    const delay = query.q === '' ? 0 : 200;
    const timer = setTimeout(() => void load(query, records, failNext), delay);
    window.history.replaceState(null, '', `${window.location.pathname}${queryToSearch(query)}`);
    return () => clearTimeout(timer);
  }, [query, records, failNext, load]);

  function update(fields: Partial<InvoiceQuery>) {
    setQuery((current) => ({ ...current, ...fields }));
  }

  const showing = status === 'loading' && result.rows.length === 0 ? [] : result.rows;
  const busy = status === 'loading';

  return (
    <div id="invoice-panel">
      <div id="invoice-controls" role="group" aria-label="Invoice filters">
        <p className="control">
          <label htmlFor="invoice-search">Search invoices</label>
          <input
            id="invoice-search"
            type="search"
            value={query.q}
            placeholder="number or client"
            onChange={(event) => update({ q: event.target.value, page: 1 })}
          />
        </p>
        <p className="control">
          <label htmlFor="invoice-status">Status</label>
          <select
            id="invoice-status"
            value={query.status}
            onChange={(event) =>
              update({ status: event.target.value as InvoiceQuery['status'], page: 1 })
            }
          >
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {value === 'all' ? 'All statuses' : value}
              </option>
            ))}
          </select>
        </p>
        <p className="control">
          <label htmlFor="invoice-sort">Sort</label>
          <select
            id="invoice-sort"
            value={query.sort}
            onChange={(event) => update({ sort: event.target.value as SortKey, page: 1 })}
          >
            {SORTS.map((sort) => (
              <option key={sort.value} value={sort.value}>
                {sort.label}
              </option>
            ))}
          </select>
        </p>
      </div>

      <fieldset id="invoice-fixture-controls">
        <legend>Fixture controls (synthetic)</legend>
        <label>
          <input
            type="checkbox"
            checked={failNext}
            onChange={(event) => setFailNext(event.target.checked)}
          />
          Make the next load fail (the repository has a simulated 250 ms delay)
        </label>
        <label>
          <input
            type="checkbox"
            checked={emptyWorkspace}
            onChange={(event) => setEmptyWorkspace(event.target.checked)}
          />
          Simulate an empty workspace (no invoices yet)
        </label>
      </fieldset>

      <p id="invoice-status-line" role="status" aria-live="polite" className="status-line">
        {busy ? 'Loading invoices…' : result.empty === 'none' ? announcement : ''}
      </p>

      {status === 'error' && (
        <p id="invoice-error" role="alert" className="error-line">
          Invoices did not load: {error}. The rows below are from the last successful load.{' '}
          <button
            type="button"
            className="btn"
            onClick={() => {
              setFailNext(false);
              void load(query, records, false);
            }}
          >
            Retry
          </button>
        </p>
      )}

      {result.empty === 'no-records' ? (
        <div id="invoice-empty-records" className="empty-state">
          <p>No invoices yet. Nothing has been billed in this workspace.</p>
          <button type="button" className="btn" disabled>
            Create the first invoice (demo)
          </button>
        </div>
      ) : result.empty === 'no-matches' ? (
        <div id="invoice-empty-matches" className="empty-state">
          <p>No invoices match these filters.</p>
          <button type="button" className="btn" onClick={() => setQuery(DEFAULT_QUERY)}>
            Clear filters
          </button>
        </div>
      ) : (
        <div id="invoice-table-wrap" aria-busy={busy}>
          <table>
            <caption className="visually-hidden">
              Invoices: number, client, amount, status, due date, actions
            </caption>
            <thead>
              <tr>
                <th scope="col">Invoice</th>
                <th scope="col">Client</th>
                <th scope="col">Amount</th>
                <th scope="col">Status</th>
                <th scope="col">Dated</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {showing.map((row) => (
                <tr key={row.id} id={row.id}>
                  <td data-label="Invoice">{row.number}</td>
                  <td data-label="Client">{row.client}</td>
                  <td data-label="Amount" className="amount">
                    {formatAmount(row.amountCents)}
                  </td>
                  <td data-label="Status">
                    <span className={`status ${row.status.toLowerCase()}`}>{row.status}</span>
                  </td>
                  <td data-label="Dated">{row.date}</td>
                  <td data-label="Actions">
                    {/* Named per record: five buttons all called "Open" are five
                        indistinguishable items in a screen reader's list. */}
                    <button
                      type="button"
                      className="row-action btn"
                      aria-label={`Open invoice ${row.number}`}
                    >
                      Open
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {result.empty === 'none' && (
        <nav id="invoice-pagination" aria-label="Invoice pages">
          <button
            type="button"
            className="btn"
            disabled={result.page <= 1}
            onClick={() => update({ page: result.page - 1 })}
          >
            Previous
          </button>
          {/* The count is already in the live region above; repeating it here
              made the same sentence appear twice on one screen. */}
          <p>
            Page {result.page} of {result.pages}
          </p>
          <button
            type="button"
            className="btn"
            disabled={result.page >= result.pages}
            onClick={() => update({ page: result.page + 1 })}
          >
            Next
          </button>
        </nav>
      )}
    </div>
  );
}

/** One sentence, said once, covering both the count and the position. */
function announcementFor(page: InvoicePage): string {
  if (page.empty !== 'none') return '';
  const first = (page.page - 1) * PAGE_SIZE + 1;
  const last = first + page.rows.length - 1;
  return `Showing ${first}–${last} of ${page.matched} invoice${page.matched === 1 ? '' : 's'}, page ${page.page} of ${page.pages}.`;
}
