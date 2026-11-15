/**
 * Fixture C invoice repository (issue #10, slice 2) — the rules without a browser.
 *
 * These cover what a browser test cannot pin down cheaply: the two kinds of
 * empty, page clamping, deterministic ordering, exact money formatting and the
 * query<->URL round trip. The states a person can see are checked in
 * `packages/eval-core/tests/admin-invoice-states.test.ts`.
 */
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_QUERY,
  INVOICES,
  PAGE_SIZE,
  formatAmount,
  loadInvoices,
  queryToSearch,
  searchToQuery,
  selectInvoices,
  type InvoiceQuery,
} from '../app/invoice-repository';

const q = (over: Partial<InvoiceQuery> = {}): InvoiceQuery => ({ ...DEFAULT_QUERY, ...over });

describe('selectInvoices', () => {
  it('pages twelve records five at a time and clamps an out-of-range page', () => {
    const first = selectInvoices(INVOICES, q());
    expect(first.matched).toBe(12);
    expect(first.pages).toBe(3);
    expect(first.rows).toHaveLength(PAGE_SIZE);
    const clamped = selectInvoices(INVOICES, q({ page: 99 }));
    expect(clamped.page).toBe(3);
    expect(clamped.rows).toHaveLength(2);
    expect(selectInvoices(INVOICES, q({ page: -4 })).page).toBe(1);
  });

  it('distinguishes "no records yet" from "no matches"', () => {
    expect(selectInvoices(INVOICES, q()).empty).toBe('none');
    expect(selectInvoices([], q()).empty).toBe('no-records');
    expect(selectInvoices(INVOICES, q({ q: 'nothing-matches-this' })).empty).toBe('no-matches');
    // The distinction matters because the two states offer different actions.
    expect(selectInvoices([], q({ q: 'anything' })).empty).toBe('no-records');
  });

  it('filters by status and by a case-insensitive needle over number, client and id', () => {
    const overdue = selectInvoices(INVOICES, q({ status: 'Overdue' }));
    expect(overdue.rows.every((row) => row.status === 'Overdue')).toBe(true);
    expect(overdue.matched).toBe(3);

    expect(selectInvoices(INVOICES, q({ q: 'northwind' })).matched).toBe(1);
    expect(selectInvoices(INVOICES, q({ q: 'INV-2026-11-000437' })).rows[0].id).toBe('inv-7');
    expect(selectInvoices(INVOICES, q({ q: '  ' })).matched).toBe(12);
  });

  it('sorts newest first by default and falls back to id for equal dates', () => {
    const rows = selectInvoices(INVOICES, q()).rows;
    expect(rows[0].date >= rows[rows.length - 1].date).toBe(true);
    // inv-3 and inv-4 share 2026-11-05; the id tiebreak keeps the order stable.
    const sameDate = INVOICES.filter((row) => row.date === '2026-11-05').map((row) => row.id);
    const sorted = selectInvoices(INVOICES, q({ sort: 'date', page: 1 })).rows.map((row) => row.id);
    const asSeen = sorted.filter((id) => sameDate.includes(id));
    expect(asSeen).toEqual(['inv-4', 'inv-3'].filter((id) => asSeen.includes(id)));
  });

  it('sorts by amount descending and by client name ascending', () => {
    const byAmount = selectInvoices(INVOICES, q({ sort: 'amount' })).rows;
    expect(byAmount[0].amountCents).toBe(Math.max(...INVOICES.map((row) => row.amountCents)));
    const byClient = selectInvoices(INVOICES, q({ sort: 'client' })).rows;
    expect(byClient.map((row) => row.client)).toEqual(
      [...byClient.map((row) => row.client)].sort((a, b) => a.localeCompare(b, 'en')),
    );
  });

  it('pagination keeps the query it was computed from', () => {
    const query = q({ status: 'Due', sort: 'amount', page: 2 });
    expect(selectInvoices(INVOICES, query).query).toEqual(query);
  });
});

describe('formatAmount', () => {
  it('formats integer cents without floating-point drift', () => {
    expect(formatAmount(1_284_50)).toBe('$1,284.50');
    expect(formatAmount(0)).toBe('$0.00');
    expect(formatAmount(5)).toBe('$0.05');
    expect(formatAmount(1_000_000_00)).toBe('$1,000,000.00');
    expect(formatAmount(-250)).toBe('−$2.50');
  });
});

describe('query <-> URL', () => {
  it('omits defaults so the address bar stays readable', () => {
    expect(queryToSearch(DEFAULT_QUERY)).toBe('');
    expect(queryToSearch(q({ q: 'north', status: 'Due', sort: 'amount', page: 3 }))).toBe(
      '?q=north&status=Due&sort=amount&page=3',
    );
  });

  it('round-trips, and refuses values that are not valid options', () => {
    const query = q({ q: 'tea ware', status: 'Overdue', sort: 'client', page: 2 });
    expect(searchToQuery(queryToSearch(query))).toEqual(query);
    // A hand-edited URL must not put the view in a state the UI cannot render.
    expect(searchToQuery('?status=Nonsense&sort=colour&page=zero')).toEqual(DEFAULT_QUERY);
    expect(searchToQuery('')).toEqual(DEFAULT_QUERY);
  });
});

describe('loadInvoices', () => {
  it('resolves a page when the repository works', async () => {
    const page = await loadInvoices(INVOICES, q(), { latencyMs: 0 });
    expect(page.rows).toHaveLength(PAGE_SIZE);
  });

  it('rejects instead of resolving a flag, so the error path is a real path', async () => {
    await expect(loadInvoices(INVOICES, q(), { latencyMs: 0, fail: true })).rejects.toThrow(
      /simulated repository failure/,
    );
  });
});
