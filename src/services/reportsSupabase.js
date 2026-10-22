// src/services/reportsSupabase.js
// Supabase-backed implementation of the Reports page aggregates.
// These queries are intentionally simple — for a real production
// deployment they should be replaced with materialised views.

import { supabase } from '../lib/supabase';

export async function salesReport() {
  if (!supabase) return { data: null, error: { code: 'NOT_CONFIGURED', message: 'Supabase client not configured' } };
  // Aggregate COMPLETED sales by month for the last 6 months.
  //
  // We filter to status='completed' at the query level so that
  // `revenue` (sum of totals) and `orders` (count of rows) are
  // consistent. The previous implementation summed revenue across
  // ALL sales (including pending + cancelled) while only counting
  // completed orders — which inflated `avgOrder = revenue / orders`.
  const { data: sales, error } = await supabase
    .from('sw_sales')
    .select('id, sale_date, total, status, payment')
    .eq('status', 'completed')
    .is('deleted_at', null)
    .order('sale_date', { ascending: true });
  if (error) return { data: null, error: { code: error.code, message: error.message } };

  const completedSales = sales ?? [];

  // ── Monthly trend (last 6 months with sales) ─────────────────
  const byMonth = {};
  for (const s of completedSales) {
    const d = new Date(s.sale_date);
    const key = d.toLocaleDateString('en-US', { month: 'short' });
    if (!byMonth[key]) byMonth[key] = { month: key, revenue: 0, profit: 0, orders: 0 };
    byMonth[key].revenue += Number(s.total);
    byMonth[key].orders += 1;
  }
  const trend = Object.values(byMonth).slice(-6);

  const totals = trend.reduce((acc, m) => {
    acc.revenue += m.revenue;
    acc.profit += m.profit;
    acc.orders += m.orders;
    return acc;
  }, { revenue: 0, profit: 0, orders: 0 });
  totals.avgOrder = totals.orders > 0 ? Math.round(totals.revenue / totals.orders) : 0;
  totals.margin = totals.revenue > 0 ? Math.round((totals.profit / totals.revenue) * 100) : 0;

  // ── Payment-method breakdown (computed from the same sales) ──
  // Each sale has exactly one `payment` value — no double-counting
  // risk. The breakdown sums to 100% when revenue > 0.
  const byPayment = {};
  for (const s of completedSales) {
    const p = s.payment ?? 'Unknown';
    if (!byPayment[p]) byPayment[p] = { name: p, value: 0, color: '#16a34a' };
    byPayment[p].value += Number(s.total);
  }
  const paymentTotal = Object.values(byPayment).reduce((s, p) => s + p.value, 0);
  const paymentBreakdown = Object.values(byPayment)
    .map(p => ({
      ...p,
      pct: paymentTotal > 0 ? Math.round((p.value / paymentTotal) * 100) : 0,
    }))
    .sort((a, b) => b.value - a.value);

  // ── Top products (by revenue) ─────────────────────────────────
  // Fetch line items for all completed sales in a single batched
  // query, then aggregate by item_id. Embed the inventory item name
  // via PostgREST resource embedding so the table can show the
  // product name without a separate sw_inventory_items lookup.
  // If the inventory item has been soft-deleted AND the FK filters
  // it out, `item` will be null and we display 'Unavailable product'.
  let topProducts = [];
  if (completedSales.length > 0) {
    const saleIds = completedSales.map(s => s.id);
    const { data: lineItems, error: liErr } = await supabase
      .from('sw_sale_items')
      .select('item_id, qty, unit_price, item:item_id(name, sku)')
      .in('sale_id', saleIds);
    if (liErr) return { data: null, error: { code: liErr.code, message: liErr.message } };

    const byItem = {};
    for (const li of (lineItems ?? [])) {
      const id = li.item_id;
      if (!byItem[id]) {
        byItem[id] = {
          name: li.item?.name ?? 'Unavailable product',
          sku: li.item?.sku ?? 'SKU-?',
          sold: 0,
          revenue: 0,
          growth: 0, // growth not computed — would need a prior period
        };
      }
      byItem[id].sold += Number(li.qty);
      byItem[id].revenue += Number(li.qty) * Number(li.unit_price);
    }
    topProducts = Object.values(byItem)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }

  // ── Month-over-month growth (last two trend points) ──────────
  // If the trend has fewer than 2 months, growth is 0 (no prior
  // period to compare). Otherwise compute (this - last) / last * 100.
  let momGrowthPct = 0;
  if (trend.length >= 2) {
    const last = trend[trend.length - 2];
    const curr = trend[trend.length - 1];
    momGrowthPct = last.revenue > 0
      ? Number((((curr.revenue - last.revenue) / last.revenue) * 100).toFixed(1))
      : 0;
  }

  return {
    data: { totals, trend, momGrowthPct, topProducts, paymentBreakdown },
    error: null,
  };
}

export async function inventoryReport() {
  if (!supabase) return { data: null, error: { code: 'NOT_CONFIGURED', message: 'Supabase client not configured' } };
  const { data: items, error } = await supabase
    .from('sw_inventory_items')
    .select('id, name, category, stock, cost_price, selling_price')
    .is('deleted_at', null);
  if (error) return { data: null, error: { code: error.code, message: error.message } };

  const byCategory = {};
  for (const i of (items ?? [])) {
    if (!byCategory[i.category]) byCategory[i.category] = { name: i.category, items: 0, value: 0 };
    byCategory[i.category].items += 1;
    byCategory[i.category].value += Number(i.stock) * Number(i.cost_price);
  }
  return {
    data: {
      categoryReport: Object.values(byCategory).map(c => ({ ...c, color: '#16a34a' })),
      topProducts: [],
      lowStock: (items ?? []).filter(i => Number(i.stock) <= Number(i.threshold)).map(i => ({ name: i.name, sku: i.sku, stock: Number(i.stock), threshold: Number(i.threshold) })),
    },
    error: null,
  };
}

export async function customersReport() {
  if (!supabase) return { data: null, error: { code: 'NOT_CONFIGURED', message: 'Supabase client not configured' } };
  // Fetch all customers + all completed sales in parallel. We then
  // join in JS to compute per-customer totalSpent + totalOrders
  // without an N+1 query per customer. The sales query is filtered
  // to status='completed' so totalSpent reflects realised revenue
  // only — pending sales don't count toward a customer's lifetime
  // spend until they're fulfilled.
  const [custRes, salesRes] = await Promise.all([
    supabase.from('sw_customers')
      .select('id, first_name, last_name, type, status, created_at')
      .is('deleted_at', null),
    supabase.from('sw_sales')
      .select('id, customer_id, total, status, sale_date')
      .eq('status', 'completed')
      .is('deleted_at', null),
  ]);
  if (custRes.error) return { data: null, error: { code: custRes.error.code, message: custRes.error.message } };
  if (salesRes.error) return { data: null, error: { code: salesRes.error.code, message: salesRes.error.message } };

  const customers = custRes.data ?? [];
  const completedSales = salesRes.data ?? [];

  // ── Per-customer aggregates (joined in JS) ────────────────────
  // Each completed sale belongs to exactly one customer (or null
  // for walk-in). We sum totals + count orders per customer_id.
  const statsByCust = {};
  for (const s of completedSales) {
    if (!s.customer_id) continue; // walk-in sales don't count toward any customer
    if (!statsByCust[s.customer_id]) statsByCust[s.customer_id] = { totalSpent: 0, totalOrders: 0 };
    statsByCust[s.customer_id].totalSpent += Number(s.total);
    statsByCust[s.customer_id].totalOrders += 1;
  }

  // ── Customer-type breakdown ───────────────────────────────────
  const byType = {};
  for (const c of customers) {
    if (!byType[c.type]) byType[c.type] = { name: c.type, value: 0 };
    byType[c.type].value += 1;
  }

  // ── Top customers by totalSpent (real, computed) ─────────────
  // Sort by totalSpent desc, take top 5. Each row includes the
  // real type + status from the customer record. The shaped row
  // matches what ReportsPage's CustomerReport expects (name, type,
  // totalSpent, totalOrders) — no mock data.
  const topCustomers = customers
    .map(c => ({
      id: c.id,
      firstName: c.first_name,
      lastName: c.last_name,
      name: `${c.first_name} ${c.last_name}`,
      type: c.type,
      status: c.status,
      totalSpent: statsByCust[c.id]?.totalSpent ?? 0,
      totalOrders: statsByCust[c.id]?.totalOrders ?? 0,
    }))
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 5);

  // ── Customer-acquisition trend (new customers per month) ────
  // Group customers by the month they were created (created_at).
  // Each customer counts exactly once — at the month they joined.
  // Returning customers are not tracked separately today (would
  // require a sales-history join per month — out of scope for the
  // current report; the backend handover §9.3 documents this gap).
  const byMonth = {};
  const now = new Date();
  for (const c of customers) {
    const d = new Date(c.created_at);
    if (d > now) continue; // ignore future-dated records (defensive)
    const key = d.toLocaleDateString('en-US', { month: 'short' });
    if (!byMonth[key]) byMonth[key] = { month: key, newCustomers: 0, returning: 0 };
    byMonth[key].newCustomers += 1;
  }
  const acquisition = Object.values(byMonth).slice(-6);

  return {
    data: {
      acquisition,
      typeBreakdown: Object.values(byType).map(t => ({ ...t, color: '#16a34a' })),
      topCustomers,
    },
    error: null,
  };
}

export async function expensesReport() {
  if (!supabase) return { data: null, error: { code: 'NOT_CONFIGURED', message: 'Supabase client not configured' } };
  const { data: expenses, error } = await supabase
    .from('sw_expenses')
    .select('category, amount, expense_date')
    .is('deleted_at', null)
    .order('expense_date', { ascending: true });
  if (error) return { data: null, error: { code: error.code, message: error.message } };

  const byMonth = {};
  for (const e of (expenses ?? [])) {
    const d = new Date(e.expense_date);
    const key = d.toLocaleDateString('en-US', { month: 'short' });
    if (!byMonth[key]) byMonth[key] = { month: key, amount: 0 };
    byMonth[key].amount += Number(e.amount);
  }
  const trend = Object.values(byMonth).slice(-6);

  const byCategory = {};
  for (const e of (expenses ?? [])) {
    if (!byCategory[e.category]) byCategory[e.category] = { name: e.category, amount: 0 };
    byCategory[e.category].amount += Number(e.amount);
  }
  const total = Object.values(byCategory).reduce((s, c) => s + c.amount, 0);
  const categoryReport = Object.values(byCategory).map(c => ({ ...c, pct: total > 0 ? Math.round((c.amount / total) * 100) : 0 }));

  return { data: { trend, categoryReport }, error: null };
}
