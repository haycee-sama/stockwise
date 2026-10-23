// src/services/reportsSupabase.js
// Supabase-backed implementation of the Reports page aggregates.
//
// These queries use fetchAll() to prevent PostgREST's default row
// limit (1000) from silently truncating the dataset. The .in()
// queries on sw_sale_items use chunk() to prevent URL-length
// overflow when there are >500 completed sales.

import { supabase } from '../lib/supabase';
import { fetchAll } from '../utils/fetchAll';
import { chunk } from '../utils/chunk';

const FETCH_PAGE_SIZE = 1000;
const IN_CHUNK_SIZE = 500;

export async function salesReport() {
  if (!supabase) return { data: null, error: { code: 'NOT_CONFIGURED', message: 'Supabase client not configured' } };

  // Use fetchAll to prevent PostgREST default row limit truncation.
  const salesRes = await fetchAll(
    supabase.from('sw_sales')
      .select('id, sale_date, total, status, payment', { count: 'exact' })
      .eq('status', 'completed')
      .is('deleted_at', null)
      .order('id', { ascending: true }),
    { pageSize: FETCH_PAGE_SIZE }
  );
  if (salesRes.error) return { data: null, error: salesRes.error };

  const completedSales = salesRes.data ?? [];

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

  // ── Lifetime totals (computed from the COMPLETE dataset) ─────
  // Previously `totals` was reduced from `trend.slice(-6)` —
  // understating revenue/orders for businesses with >6 months of
  // sales. Now `totals` reflects ALL completed sales.
  const totals = completedSales.reduce((acc, s) => {
    acc.revenue += Number(s.total);
    acc.orders += 1;
    return acc;
  }, { revenue: 0, profit: 0, orders: 0 });
  totals.avgOrder = totals.orders > 0 ? Math.round(totals.revenue / totals.orders) : 0;
  totals.margin = 0; // set after profit computation below

  // ── Payment-method breakdown (from the same completed sales) ─
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

  // ── Top products + monthly profit (from line items) ─────────
  // Chunk the sale_id list to prevent PostgREST URL-length overflow.
  // Embed item name + cost_price via PostgREST resource embedding.
  let topProducts = [];
  let totalProfit = 0;
  let profitExcludedCount = 0;
  const profitByMonth = {};

  if (completedSales.length > 0) {
    const saleIds = completedSales.map(s => s.id);
    const saleDateBySaleId = {};
    for (const s of completedSales) {
      saleDateBySaleId[s.id] = s.sale_date;
    }

    const byItem = {};

    for (const chunkIds of chunk(saleIds, IN_CHUNK_SIZE)) {
      const { data: lineItems, error: liErr } = await supabase
        .from('sw_sale_items')
        .select('sale_id, item_id, qty, unit_price, item:item_id(name, sku, cost_price)')
        .in('sale_id', chunkIds);
      if (liErr) return { data: null, error: { code: liErr.code, message: liErr.message } };

      for (const li of (lineItems ?? [])) {
        const id = li.item_id;
        if (!byItem[id]) {
          byItem[id] = {
            name: li.item?.name ?? 'Unavailable product',
            sku: li.item?.sku ?? 'SKU-?',
            sold: 0,
            revenue: 0,
            growth: 0,
          };
        }
        byItem[id].sold += Number(li.qty);
        byItem[id].revenue += Number(li.qty) * Number(li.unit_price);

        // Profit per line item: skip items with missing cost data.
        // Track the count of excluded items so the UI can show a
        // "partial" indicator.
        if (!li.item) {
          profitExcludedCount++;
          continue;
        }

        const costPrice = Number(li.item.cost_price ?? 0);
        const sellingPrice = Number(li.unit_price);
        const qty = Number(li.qty);
        const profit = (sellingPrice - costPrice) * qty;
        totalProfit += profit;

        // Bucket profit by month for the trend.
        const saleDate = saleDateBySaleId[li.sale_id];
        if (saleDate) {
          const d = new Date(saleDate);
          const key = d.toLocaleDateString('en-US', { month: 'short' });
          if (!profitByMonth[key]) profitByMonth[key] = 0;
          profitByMonth[key] += profit;
        }
      }
    }

    topProducts = Object.values(byItem)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Update totals.profit + totals.margin with the real profit.
    totals.profit = totalProfit;
    totals.margin = totals.revenue > 0 ? Math.round((totalProfit / totals.revenue) * 100) : 0;

    // Update trend months with real profit.
    for (const m of trend) {
      m.profit = profitByMonth[m.month] ?? 0;
    }
  }

  // ── Month-over-month growth (last two trend points) ──────────
  let momGrowthPct = 0;
  if (trend.length >= 2) {
    const last = trend[trend.length - 2];
    const curr = trend[trend.length - 1];
    momGrowthPct = last.revenue > 0
      ? Number((((curr.revenue - last.revenue) / last.revenue) * 100).toFixed(1))
      : 0;
  }

  return {
    data: {
      totals,
      trend,
      momGrowthPct,
      topProducts,
      paymentBreakdown,
      profitExcludedCount,
    },
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

  // Use fetchAll for both queries to prevent PostgREST truncation.
  const [custRes, salesRes] = await Promise.all([
    fetchAll(
      supabase.from('sw_customers')
        .select('id, first_name, last_name, type, status, created_at')
        .is('deleted_at', null)
        .order('id', { ascending: true }),
      { pageSize: FETCH_PAGE_SIZE }
    ),
    fetchAll(
      supabase.from('sw_sales')
        .select('id, customer_id, total, status, sale_date')
        .eq('status', 'completed')
        .is('deleted_at', null)
        .order('id', { ascending: true }),
      { pageSize: FETCH_PAGE_SIZE }
    ),
  ]);
  if (custRes.error) return { data: null, error: custRes.error };
  if (salesRes.error) return { data: null, error: salesRes.error };

  const customers = custRes.data ?? [];
  const completedSales = salesRes.data ?? [];

  // ── Per-customer aggregates (joined in JS) ────────────────────
  const statsByCust = {};
  for (const s of completedSales) {
    if (!s.customer_id) continue;
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
  const byMonth = {};
  const now = new Date();
  for (const c of customers) {
    const d = new Date(c.created_at);
    if (d > now) continue;
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
