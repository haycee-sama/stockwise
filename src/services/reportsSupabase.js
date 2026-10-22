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
    .select('sale_date, total, status')
    .eq('status', 'completed')
    .is('deleted_at', null)
    .order('sale_date', { ascending: true });
  if (error) return { data: null, error: { code: error.code, message: error.message } };

  const byMonth = {};
  for (const s of (sales ?? [])) {
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

  return { data: { totals, trend, momGrowthPct: 0, topProducts: [], paymentBreakdown: [] }, error: null };
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
  const { data: customers, error } = await supabase
    .from('sw_customers')
    .select('id, first_name, last_name, type, status, created_at')
    .is('deleted_at', null);
  if (error) return { data: null, error: { code: error.code, message: error.message } };

  const byType = {};
  for (const c of (customers ?? [])) {
    if (!byType[c.type]) byType[c.type] = { name: c.type, value: 0 };
    byType[c.type].value += 1;
  }
  return {
    data: {
      acquisition: [],
      typeBreakdown: Object.values(byType).map(t => ({ ...t, color: '#16a34a' })),
      topCustomers: (customers ?? []).slice(0, 5).map(c => ({
        name: `${c.first_name} ${c.last_name}`,
        type: c.type,
        totalSpent: 0, // would need a join
        totalOrders: 0,
      })),
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
