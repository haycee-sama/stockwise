// src/test/aggregateCalculations.test.js
// Calculation regression tests for the report + dashboard aggregate
// functions. These are FRONTEND CONTRACT TESTS — they mock the
// Supabase JS client with known data and verify the aggregation
// logic (sums, counts, profit, period comparisons, ranking, etc.).
//
// They do NOT verify live Supabase behaviour — the PostgREST
// resource embedding, RLS filtering, and actual row limits are
// only verifiable against a configured Supabase project.
//
// Mock strategy:
// - `supabase.from(table)` returns a chainable mock.
// - `.range(start, end)` slices the mock data for that table
//   (simulating PostgREST pagination).
// - `.in(col, vals)` returns all mock rows for that table
//   (ignoring the filter — the test provides pre-filtered data).
// - `.eq()`, `.is()`, `.order()` are no-ops that return the chain.

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock Supabase client ──────────────────────────────────────────
// The real Supabase JS client's query builder is a THENABLE object:
// methods like .select(), .eq(), .is(), .order(), .range(), .in()
// all return the builder itself, and `await builder` triggers the
// query (via the builder's .then() method).
//
// This mock replicates that: the chain object is thenable — it has
// a .then() method that resolves with { data, error, count } from
// the pre-configured tableData, sliced by .range() if set.
function createMockSupabase(tableData = {}) {
  function createChain(table) {
    let _range = null;

    const chain = {
      _table: table,
      select() { return chain; },
      eq() { return chain; },
      is() { return chain; },
      order() { return chain; },
      range(start, end) { _range = [start, end]; return chain; },
      in() { return chain; },
      limit(n) { _range = [0, n - 1]; return chain; },
      maybeSingle() {
        const rows = tableData[table] ?? [];
        return Promise.resolve({ data: rows[0] ?? null, error: null });
      },
      single() {
        const rows = tableData[table] ?? [];
        return Promise.resolve({ data: rows[0] ?? null, error: null });
      },
      // Thenable — when the chain is awaited (directly or via
      // Promise.all), resolve with the mock data.
      then(resolve, reject) {
        let rows = tableData[table] ?? [];
        if (_range) {
          rows = rows.slice(_range[0], _range[1] + 1);
        }
        const allRows = tableData[table] ?? [];
        Promise.resolve({
          data: rows,
          error: null,
          count: allRows.length,
        }).then(resolve, reject);
      },
    };
    return chain;
  }

  return {
    from(table) { return createChain(table); },
    rpc() { return Promise.resolve({ data: null, error: null }); },
  };
}

// ── Test data ─────────────────────────────────────────────────────
const MOCK_SALES = [
  { id: 's1', sale_date: '2026-10-15T10:00:00Z', total: 1000, status: 'completed', payment: 'Cash', customer_id: null },
  { id: 's2', sale_date: '2026-10-20T10:00:00Z', total: 2000, status: 'completed', payment: 'Transfer', customer_id: 'c1' },
  { id: 's3', sale_date: '2026-09-10T10:00:00Z', total: 3000, status: 'completed', payment: 'Cash', customer_id: 'c2' },
  { id: 's4', sale_date: '2026-10-25T10:00:00Z', total: 500, status: 'pending', payment: 'Card', customer_id: 'c1' },
  { id: 's5', sale_date: '2026-09-15T10:00:00Z', total: 1500, status: 'cancelled', payment: 'Cash', customer_id: 'c2' },
];

const MOCK_SALE_ITEMS = [
  { sale_id: 's1', item_id: 'i1', qty: 2, unit_price: 500, item: { name: 'Shirt', sku: 'S-001', cost_price: 300 } },
  { sale_id: 's2', item_id: 'i2', qty: 1, unit_price: 2000, item: { name: 'Shoes', sku: 'SH-002', cost_price: 1200 } },
  { sale_id: 's3', item_id: 'i1', qty: 3, unit_price: 1000, item: { name: 'Shirt', sku: 'S-001', cost_price: 300 } },
  // s4 is pending — no line items fetched (not in completed sales).
  // s5 is cancelled — same.
  // Line item with missing item relationship (soft-deleted inventory):
  { sale_id: 's2', item_id: 'i3', qty: 1, unit_price: 500, item: null },
];

const MOCK_CUSTOMERS = [
  { id: 'c1', first_name: 'John', last_name: 'Doe', type: 'Retailer', status: 'active', created_at: '2026-09-01T00:00:00Z' },
  { id: 'c2', first_name: 'Jane', last_name: 'Smith', type: 'Wholesale', status: 'active', created_at: '2026-10-01T00:00:00Z' },
  { id: 'c3', first_name: 'Bob', last_name: 'Brown', type: 'Walk-in', status: 'new', created_at: '2026-10-05T00:00:00Z' },
];

const MOCK_INVENTORY = [
  { id: 'i1', stock: 5, threshold: 10, name: 'Shirt', sku: 'S-001', cost_price: 300, selling_price: 500 },
  { id: 'i2', stock: 0, threshold: 5, name: 'Shoes', sku: 'SH-002', cost_price: 1200, selling_price: 2000 },
  { id: 'i3', stock: 20, threshold: 15, name: 'Hat', sku: 'H-003', cost_price: 100, selling_price: 200 },
];

// ── salesReport() tests ──────────────────────────────────────────
describe('salesReport() calculations', () => {
  beforeEach(async () => {
    vi.resetModules();
    const mockSupabase = createMockSupabase({
      sw_sales: MOCK_SALES.filter(s => s.status === 'completed'),
      sw_sale_items: MOCK_SALE_ITEMS,
    });
    vi.doMock('../lib/supabase', () => ({ supabase: mockSupabase, isSupabaseConfigured: true }));
  });

  it('computes lifetime totals from ALL completed sales (not 6-month subset)', async () => {
    const { salesReport } = await import('../services/reportsSupabase');
    const { data, error } = await salesReport();
    expect(error).toBeNull();
    // 3 completed sales: s1 (1000) + s2 (2000) + s3 (3000) = 6000
    expect(data.totals.revenue).toBe(6000);
    expect(data.totals.orders).toBe(3);
    // avgOrder = 6000 / 3 = 2000
    expect(data.totals.avgOrder).toBe(2000);
  });

  it('computes payment breakdown by method with pct', async () => {
    const { salesReport } = await import('../services/reportsSupabase');
    const { data } = await salesReport();
    const cash = data.paymentBreakdown.find(p => p.name === 'Cash');
    const transfer = data.paymentBreakdown.find(p => p.name === 'Transfer');
    expect(cash.value).toBe(4000); // s1 (1000) + s3 (3000)
    expect(transfer.value).toBe(2000); // s2
    // pct: cash 4000/6000 = 67%, transfer 2000/6000 = 33%
    expect(cash.pct).toBe(67);
    expect(transfer.pct).toBe(33);
  });

  it('computes topProducts by revenue (not qty) with item names', async () => {
    const { salesReport } = await import('../services/reportsSupabase');
    const { data } = await salesReport();
    expect(data.topProducts.length).toBeGreaterThan(0);
    // i1: s1 (2*500=1000) + s3 (3*1000=3000) = 4000 revenue, 5 sold
    // i2: s2 (1*2000=2000) = 2000 revenue, 1 sold
    const shirt = data.topProducts.find(p => p.name === 'Shirt');
    expect(shirt).toBeDefined();
    expect(shirt.revenue).toBe(4000);
    expect(shirt.sold).toBe(5);
    // i3 (missing item): should show 'Unavailable product'
    const unavailable = data.topProducts.find(p => p.name === 'Unavailable product');
    expect(unavailable).toBeDefined();
    expect(unavailable.revenue).toBe(500); // s2 item i3: 1 * 500
  });

  it('computes profit and tracks excluded items with missing cost data', async () => {
    const { salesReport } = await import('../services/reportsSupabase');
    const { data } = await salesReport();
    // Profit per line item:
    // s1-i1: (500-300)*2 = 400
    // s2-i2: (2000-1200)*1 = 800
    // s3-i1: (1000-300)*3 = 2100
    // s2-i3: item is null → EXCLUDED (profitExcludedCount++)
    expect(data.totals.profit).toBe(400 + 800 + 2100); // 3300
    expect(data.profitExcludedCount).toBe(1); // s2-i3 has no item
  });

  it('computes momGrowthPct from last two trend months', async () => {
    const { salesReport } = await import('../services/reportsSupabase');
    const { data } = await salesReport();
    // Trend months: Sep (s3=3000) + Oct (s1+s2=3000)
    // momGrowthPct = (3000-3000)/3000 * 100 = 0
    expect(data.momGrowthPct).toBe(0);
  });

  it('handles empty dataset (0 completed sales)', async () => {
    vi.resetModules();
    const mockSupabase = createMockSupabase({
      sw_sales: [],
      sw_sale_items: [],
    });
    vi.doMock('../lib/supabase', () => ({ supabase: mockSupabase, isSupabaseConfigured: true }));
    const { salesReport } = await import('../services/reportsSupabase');
    const { data, error } = await salesReport();
    expect(error).toBeNull();
    expect(data.totals.revenue).toBe(0);
    expect(data.totals.orders).toBe(0);
    expect(data.topProducts).toEqual([]);
    expect(data.paymentBreakdown).toEqual([]);
    expect(data.profitExcludedCount).toBe(0);
  });
});

// ── customersReport() tests ─────────────────────────────────────
describe('customersReport() calculations', () => {
  beforeEach(async () => {
    vi.resetModules();
    const mockSupabase = createMockSupabase({
      sw_customers: MOCK_CUSTOMERS,
      sw_sales: MOCK_SALES.filter(s => s.status === 'completed'),
    });
    vi.doMock('../lib/supabase', () => ({ supabase: mockSupabase, isSupabaseConfigured: true }));
  });

  it('computes per-customer totalSpent + totalOrders from completed sales', async () => {
    const { customersReport } = await import('../services/reportsSupabase');
    const { data, error } = await customersReport();
    expect(error).toBeNull();
    // c1: s2 (2000) = 2000 totalSpent, 1 order
    // c2: s3 (3000) = 3000 totalSpent, 1 order
    // c3: no completed sales = 0 totalSpent, 0 orders
    const c1 = data.topCustomers.find(c => c.firstName === 'John');
    const c2 = data.topCustomers.find(c => c.firstName === 'Jane');
    const c3 = data.topCustomers.find(c => c.firstName === 'Bob');
    expect(c1.totalSpent).toBe(2000);
    expect(c1.totalOrders).toBe(1);
    expect(c2.totalSpent).toBe(3000);
    expect(c2.totalOrders).toBe(1);
    expect(c3.totalSpent).toBe(0);
    expect(c3.totalOrders).toBe(0);
  });

  it('ranks topCustomers by totalSpent descending', async () => {
    const { customersReport } = await import('../services/reportsSupabase');
    const { data } = await customersReport();
    // c2 (3000) > c1 (2000) > c3 (0)
    expect(data.topCustomers[0].firstName).toBe('Jane'); // 3000
    expect(data.topCustomers[1].firstName).toBe('John'); // 2000
  });

  it('computes acquisition trend (new customers per month)', async () => {
    const { customersReport } = await import('../services/reportsSupabase');
    const { data } = await customersReport();
    // c1 created in Sep, c2 + c3 created in Oct
    const sep = data.acquisition.find(a => a.month === 'Sep');
    const oct = data.acquisition.find(a => a.month === 'Oct');
    expect(sep).toBeDefined();
    expect(sep.newCustomers).toBe(1);
    expect(oct).toBeDefined();
    expect(oct.newCustomers).toBe(2);
  });

  it('computes typeBreakdown by customer type', async () => {
    const { customersReport } = await import('../services/reportsSupabase');
    const { data } = await customersReport();
    const retailer = data.typeBreakdown.find(t => t.name === 'Retailer');
    const wholesale = data.typeBreakdown.find(t => t.name === 'Wholesale');
    const walkin = data.typeBreakdown.find(t => t.name === 'Walk-in');
    expect(retailer.value).toBe(1); // c1
    expect(wholesale.value).toBe(1); // c2
    expect(walkin.value).toBe(1); // c3
  });
});

// ── dashboardSupabase.summary() tests ───────────────────────────
describe('dashboardSupabase.summary() calculations', () => {
  beforeEach(async () => {
    vi.resetModules();
    const mockSupabase = createMockSupabase({
      sw_inventory_items: MOCK_INVENTORY,
      sw_sales: MOCK_SALES, // summary fetches ALL sales (not just completed)
      sw_sale_items: MOCK_SALE_ITEMS,
    });
    vi.doMock('../lib/supabase', () => ({ supabase: mockSupabase, isSupabaseConfigured: true }));
  });

  it('computes totalSales from completed sales only', async () => {
    const { summary } = await import('../services/dashboardSupabase');
    const { data, error } = await summary();
    expect(error).toBeNull();
    // completed: s1 (1000) + s2 (2000) + s3 (3000) = 6000
    expect(data.totalSales).toBe(6000);
    // pending: s4 (1)
    expect(data.pendingOrdersCount).toBe(1);
  });

  it('computes totalProfit excluding items with missing cost data', async () => {
    const { summary } = await import('../services/dashboardSupabase');
    const { data } = await summary();
    // s1-i1: (500-300)*2 = 400
    // s2-i2: (2000-1200)*1 = 800
    // s3-i1: (1000-300)*3 = 2100
    // s2-i3: item is null → EXCLUDED
    expect(data.totalProfit).toBe(400 + 800 + 2100); // 3300
    expect(data.profitExcludedCount).toBe(1);
  });

  it('returns null for inventoryChange + lowStockChange (no historical data)', async () => {
    const { summary } = await import('../services/dashboardSupabase');
    const { data } = await summary();
    expect(data.inventoryChange).toBeNull();
    expect(data.lowStockChange).toBeNull();
  });

  it('computes outOfStock + lowStock from inventory data', async () => {
    const { summary } = await import('../services/dashboardSupabase');
    const { data } = await summary();
    // i1: stock=5, threshold=10 → low stock (0 < 5 <= 10)
    // i2: stock=0 → out of stock
    // i3: stock=20, threshold=15 → in stock (20 > 15)
    expect(data.outOfStock).toBe(1); // i2
    expect(data.lowStock).toBe(1); // i1
    expect(data.totalInventory).toBe(3);
  });

  it('handles empty dataset (0 sales, 0 inventory)', async () => {
    vi.resetModules();
    const mockSupabase = createMockSupabase({
      sw_inventory_items: [],
      sw_sales: [],
      sw_sale_items: [],
    });
    vi.doMock('../lib/supabase', () => ({ supabase: mockSupabase, isSupabaseConfigured: true }));
    const { summary } = await import('../services/dashboardSupabase');
    const { data, error } = await summary();
    expect(error).toBeNull();
    expect(data.totalSales).toBe(0);
    expect(data.totalProfit).toBe(0);
    expect(data.profitExcludedCount).toBe(0);
    expect(data.inventoryChange).toBeNull();
    expect(data.lowStockChange).toBeNull();
    expect(data.pendingOrdersCount).toBe(0);
  });
});

// ── StatCard null-change handling test ──────────────────────────
describe('StatCard null-change handling', () => {
  it('shows "—" badge when change is null (unavailable metric)', async () => {
    const { render, screen } = await import('@testing-library/react');
    const StatCard = (await import('../components/dashboard/StatCard')).default;
    render(
      <StatCard
        icon={() => null}
        iconBg="bg-gray-100"
        iconColor="text-gray-600"
        label="Inventory Items"
        value={42}
        change={null}
        changeLabel="vs last month"
      />
    );
    // The "—" should be visible as an aria-label "Metric unavailable"
    expect(screen.getByLabelText('Metric unavailable')).toBeInTheDocument();
  });

  it('shows "+0%" badge when change is 0 (genuine zero)', async () => {
    const { render, screen } = await import('@testing-library/react');
    const StatCard = (await import('../components/dashboard/StatCard')).default;
    render(
      <StatCard
        icon={() => null}
        iconBg="bg-gray-100"
        iconColor="text-gray-600"
        label="Total Sales"
        value={5000}
        change={0}
        changeLabel="vs last month"
      />
    );
    // Genuine 0 should show "+0%" (not "—")
    expect(screen.getByText('+0%')).toBeInTheDocument();
  });
});
