/**
 * Synthetic invoice records for fixture C (issue #10, slice 2).
 *
 * Why a repository and not inline JSX: the rules this section exists to
 * demonstrate — `table-empty-two-kinds`, `table-error-keeps-state`,
 * `table-state-announced` — are about *states*, and a page that can only ever
 * be in the happy state cannot demonstrate any of them. So the records live
 * behind a function that can be slow and can fail.
 *
 * Everything here is invented: no customers, no amounts that mean anything, and
 * `loadInvoices` never touches the network. The delay is deliberate and stated
 * in the UI ("simulated latency"), because a fake 250ms waits labelled as real
 * would be exactly the kind of dishonesty this project is built to refuse.
 */

export type InvoiceStatus = 'Paid' | 'Due' | 'Overdue' | 'Draft';

export interface Invoice {
  id: string;
  number: string;
  client: string;
  /** Minor units (cents). Formatted at render time, never floating-point summed. */
  amountCents: number;
  status: InvoiceStatus;
  /** ISO date (date only: invoices are dated, not timestamped). */
  date: string;
}

export type SortKey = 'date' | 'amount' | 'client';

export interface InvoiceQuery {
  q: string;
  status: 'all' | InvoiceStatus;
  sort: SortKey;
  page: number;
}

export const PAGE_SIZE = 5;

export const DEFAULT_QUERY: InvoiceQuery = { q: '', status: 'all', sort: 'date', page: 1 };

/**
 * Twelve records: enough that pagination is real rather than decorative, and
 * small enough to read. The first entry carries a long unbroken number and a
 * long client name on purpose — those are what break a mobile layout late.
 */
export const INVOICES: Invoice[] = [
  {
    id: 'inv-1',
    number: 'INV-2026-11-000431-NORTHWIND-REGIONAL-DISTRIBUTION',
    client: 'Northwind Regional Distribution Cooperative',
    amountCents: 1_284_50,
    status: 'Overdue',
    date: '2026-10-02',
  },
  {
    id: 'inv-2',
    number: 'INV-2026-11-000432',
    client: 'Harbor & Leaf',
    amountCents: 96_00,
    status: 'Paid',
    date: '2026-11-04',
  },
  {
    id: 'inv-3',
    number: 'INV-2026-11-000433',
    client: 'Tea-ware Studio',
    amountCents: 480_00,
    status: 'Due',
    date: '2026-11-05',
  },
  {
    id: 'inv-4',
    number: 'INV-2026-11-000434',
    client: 'Iyer & Sons',
    amountCents: 12_50,
    status: 'Paid',
    date: '2026-11-05',
  },
  {
    id: 'inv-5',
    number: 'INV-2026-11-000435',
    client: 'Okafor Logistics',
    amountCents: 2_140_00,
    status: 'Due',
    date: '2026-11-06',
  },
  {
    id: 'inv-6',
    number: 'INV-2026-11-000436',
    client: 'Lin Atelier',
    amountCents: 74_25,
    status: 'Draft',
    date: '2026-11-06',
  },
  {
    id: 'inv-7',
    number: 'INV-2026-11-000437',
    client: 'Pacifica Foods',
    amountCents: 318_90,
    status: 'Overdue',
    date: '2026-11-07',
  },
  {
    id: 'inv-8',
    number: 'INV-2026-11-000438',
    client: 'Mira Bookshop',
    amountCents: 55_00,
    status: 'Paid',
    date: '2026-11-08',
  },
  {
    id: 'inv-9',
    number: 'INV-2026-11-000439',
    client: 'Delta Freight',
    amountCents: 905_60,
    status: 'Due',
    date: '2026-11-09',
  },
  {
    id: 'inv-10',
    number: 'INV-2026-11-000440',
    client: 'Sunlit Ceramics',
    amountCents: 132_40,
    status: 'Draft',
    date: '2026-11-10',
  },
  {
    id: 'inv-11',
    number: 'INV-2026-11-000441',
    client: 'Kestrel Audio',
    amountCents: 47_99,
    status: 'Paid',
    date: '2026-11-11',
  },
  {
    id: 'inv-12',
    number: 'INV-2026-11-000442',
    client: 'Wren & Field',
    amountCents: 610_00,
    status: 'Overdue',
    date: '2026-11-12',
  },
];

/** Which "nothing here" the operator is looking at. The two need different actions. */
export type EmptyKind = 'none' | 'no-records' | 'no-matches';

export interface InvoicePage {
  rows: Invoice[];
  /** Records matching the filters before pagination. */
  matched: number;
  /** Page actually shown, clamped to the available range. */
  page: number;
  pages: number;
  empty: EmptyKind;
  /** Echo of the query that produced this result, so the UI cannot drift from the data. */
  query: InvoiceQuery;
}

function matches(record: Invoice, query: InvoiceQuery): boolean {
  if (query.status !== 'all' && record.status !== query.status) return false;
  const needle = query.q.trim().toLowerCase();
  if (needle === '') return true;
  return (
    record.number.toLowerCase().includes(needle) ||
    record.client.toLowerCase().includes(needle) ||
    record.id.toLowerCase().includes(needle)
  );
}

function compare(a: Invoice, b: Invoice, sort: SortKey): number {
  if (sort === 'amount') return b.amountCents - a.amountCents;
  if (sort === 'client') return a.client.localeCompare(b.client, 'en');
  // Newest first; ties fall back to id so the order is deterministic.
  if (a.date === b.date) return a.id.localeCompare(b.id);
  return a.date < b.date ? 1 : -1;
}

/**
 * Pure selection used by both the component and its tests. Deliberately
 * separate from the async loader so the rules can be tested without a browser
 * or a clock.
 */
export function selectInvoices(records: readonly Invoice[], query: InvoiceQuery): InvoicePage {
  const filtered = records
    .filter((record) => matches(record, query))
    .sort((a, b) => compare(a, b, query.sort));
  const matched = filtered.length;
  const pages = Math.max(1, Math.ceil(matched / PAGE_SIZE));
  const page = Math.min(Math.max(1, Math.trunc(query.page) || 1), pages);
  const start = (page - 1) * PAGE_SIZE;
  const rows = filtered.slice(start, start + PAGE_SIZE);
  const empty: EmptyKind =
    records.length === 0 ? 'no-records' : matched === 0 ? 'no-matches' : 'none';
  return { rows, matched, page, pages, empty, query };
}

export interface LoadOptions {
  /** Fixture control: the repository call fails instead of returning. */
  fail?: boolean;
  /** Simulated latency in ms. Zero in unit tests. */
  latencyMs?: number;
}

/**
 * The "fetch". A rejected promise on `fail`, so the component's error path is a
 * real error path — a resolved flag would let a broken error branch pass a test.
 */
export async function loadInvoices(
  records: readonly Invoice[],
  query: InvoiceQuery,
  options: LoadOptions = {},
): Promise<InvoicePage> {
  const { fail = false, latencyMs = 250 } = options;
  if (latencyMs > 0) await new Promise((resolve) => setTimeout(resolve, latencyMs));
  if (fail) throw new Error('simulated repository failure (fixture control)');
  return selectInvoices(records, query);
}

/** Money as a person reads it; integer cents in, string out. */
export function formatAmount(cents: number): string {
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const whole = Math.trunc(abs / 100).toLocaleString('en-US');
  const fraction = String(abs % 100).padStart(2, '0');
  return `${negative ? '−' : ''}$${whole}.${fraction}`;
}

/** Query <-> URL. The rule says the operator's view lives in the address bar. */
export function queryToSearch(query: InvoiceQuery): string {
  const params = new URLSearchParams();
  if (query.q.trim() !== '') params.set('q', query.q.trim());
  if (query.status !== 'all') params.set('status', query.status);
  if (query.sort !== 'date') params.set('sort', query.sort);
  if (query.page !== 1) params.set('page', String(query.page));
  const search = params.toString();
  return search === '' ? '' : `?${search}`;
}

export function searchToQuery(search: string): InvoiceQuery {
  const params = new URLSearchParams(search);
  const status = params.get('status');
  const sort = params.get('sort');
  const page = Number(params.get('page') ?? '1');
  return {
    q: params.get('q') ?? '',
    status:
      status === 'Paid' || status === 'Due' || status === 'Overdue' || status === 'Draft'
        ? status
        : 'all',
    sort: sort === 'amount' || sort === 'client' ? sort : 'date',
    page: Number.isFinite(page) && page >= 1 ? Math.trunc(page) : 1,
  };
}
