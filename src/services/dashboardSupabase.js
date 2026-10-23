// src/services/dashboardSupabase.js
// Supabase-backed implementation of the dashboard aggregates.

import { supabase } from '../lib/supabase';
import { fetchAll } from '../utils/fetchAll';
import { chunk } from '../utils/chunk';

const FETCH_PAGE_SIZE = 1000;
const IN_CHUNK_SIZE = 500;

// Fetches summary stats from sw_inventory_items + sw_sales.
//
// totalProfit: computed from (selling_price - cost_price) * qty per
// line item. Sale items whose inventory relationship is missing
// (soft-deleted, RLS-filtered, or FK-broken) are EXCLUDED from the
// profit sum — their cost is unknown, not zero. The count of
// excluded items is returned as `profitExcludedCount` so the UI can
// show a "partial" indicator. If profitExcludedCount > 0, the
// displayed totalProfit is a known partial figure, not a complete
// business total.
//
// salesChange / profitChange: this-month vs last-month completed
// sales. Zero-denominator handled (returns 0 when last month had
// no data).
//
// inventoryChange / lowStockChange: returned as null — there is no
// historical inventory snapshot table on the backend to compute a
// real period-over-period inventory-count delta. The dashboard UI
// shows "—" (unavailable) for these. The backend handover §9.3
// documents this as a backend dependency.
export async function summary() {
  if (!supabase) return { data: null, error: { code: 'NOT_CONFIGURED', message: 'Supabase client not configured' } };

  // Use fetchAll to prevent PostgREST default row limit (1000)
  // from silently truncating the sales dataset.
  const [inv, salesRes] = await Promise.all([
    supabase.from('sw_inventory_items').select('id, stock, threshold').is('deleted_at', null),
    fetchAll(
      supabase.from('sw_sales')
        .select('id, total, status, sale_date', { count: 'exact' })
        .is('deleted_at', null)
        .order('id', { ascending: true }),
      { pageSize: FETCH_PAGE_SIZE }
    ),
  ]);

  if (inv.error) return { data: null, error: { code: inv.error.code, message: inv.error.message } };
  if (salesRes.error) return { data: null, error: { code: salesRes.error.code, message: salesRes.error.message } };

  const items = inv.data ?? [];
  const allSales = salesRes.data ?? [];
  const completedSales = allSales.filter(s => s.status === 'completed');

  const now = new Date();
  const todayStr = now.toDateString();
  const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);

  // ── Period-over-period deltas (this month vs last month) ─────
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  const thisMonthSales = completedSales.filter(s => new Date(s.sale_date) >= thisMonthStart);
  const lastMonthSales = completedSales.filter(s => {
    const d = new Date(s.sale_date);
    return d >= lastMonthStart && d <= lastMonthEnd;
  });

  const thisMonthRevenue = thisMonthSales.reduce((s, o) => s + Number(o.total), 0);
  const lastMonthRevenue = lastMonthSales.reduce((s, o) => s + Number(o.total), 0);
  const salesChange = lastMonthRevenue > 0
    ? Number((((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100).toFixed(1))
    : 0;

  let thisMonthProfit = 0;
  let lastMonthProfit = 0;
  let totalProfit = 0;
  let profitExcludedCount = 0;

  // ── totalProfit: fetch line items + embed cost_price via FK ──
  // Chunk the sale_id list to prevent PostgREST URL-length overflow
  // when there are >500 completed sales.
  if (completedSales.length > 0) {
    const saleIds = completedSales.map(s => s.id);
    const saleDateBySaleId = {};
    for (const s of completedSales) {
      saleDateBySaleId[s.id] = s.sale_date;
    }

    for (const chunkIds of chunk(saleIds, IN_CHUNK_SIZE)) {
      const { data: lineItems, error: liErr } = await supabase
        .from('sw_sale_items')
        .select('sale_id, qty, unit_price, item:item_id(cost_price)')
        .in('sale_id', chunkIds);
      if (liErr) return { data: null, error: { code: liErr.code, message: liErr.message } };

      for (const li of (lineItems ?? [])) {
        // Skip line items whose inventory relationship is missing.
        // The cost is unknown (not zero) — treating it as zero
        // would inflate profit by the full selling price.
        if (!li.item) {
          profitExcludedCount++;
          continue;
        }

        const costPrice = Number(li.item.cost_price ?? 0);
        const sellingPrice = Number(li.unit_price);
        const qty = Number(li.qty);
        const profit = (sellingPrice - costPrice) * qty;
        totalProfit += profit;

        // Bucket by period for the profitChange delta.
        const saleDate = saleDateBySaleId[li.sale_id];
        if (saleDate) {
          const d = new Date(saleDate);
          if (d >= thisMonthStart) thisMonthProfit += profit;
          else if (d >= lastMonthStart && d <= lastMonthEnd) lastMonthProfit += profit;
        }
      }
    }
  }

  const profitChange = lastMonthProfit > 0
    ? Number((((thisMonthProfit - lastMonthProfit) / lastMonthProfit) * 100).toFixed(1))
    : 0;

  const todaySales = completedSales.filter(s => new Date(s.sale_date).toDateString() === todayStr);
  const weekSales = completedSales.filter(s => new Date(s.sale_date) >= weekAgo);

  const outOfStock = items.filter(i => Number(i.stock) === 0).length;
  const lowStock = items.filter(i => Number(i.stock) > 0 && Number(i.stock) <= Number(i.threshold)).length;

  return {
    data: {
      totalSales: completedSales.reduce((s, o) => s + Number(o.total), 0),
      totalProfit,
      profitExcludedCount,
      totalInventory: items.length,
      lowStockCount: lowStock,
      salesChange,
      profitChange,
      // No historical inventory snapshot exists on the backend.
      // These are null (unavailable) — NOT 0 and NOT derived
      // from salesChange. The dashboard shows "—".
      inventoryChange: null,
      lowStockChange: null,
      todayRevenue: todaySales.reduce((s, o) => s + Number(o.total), 0),
      weekRevenue: weekSales.reduce((s, o) => s + Number(o.total), 0),
      outOfStock,
      lowStock,
      pendingOrdersCount: allSales.filter(s => s.status === 'pending').length,
    },
    error: null,
  };
}

// Revenue time-series — group sales by day-of-week.
export async function revenue() {
  if (!supabase) return { data: null, error: { code: 'NOT_CONFIGURED', message: 'Supabase client not configured' } };
  const { data, error } = await supabase
    .from('sw_sales')
    .select('sale_date, total, status')
    .eq('status', 'completed')
    .is('deleted_at', null)
    .order('sale_date', { ascending: true });
  if (error) return { data: null, error: { code: error.code, message: error.message } };

  // Group by day-of-week.
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const thisWeek = days.reduce((acc, d) => { acc[d] = 0; return acc; }, {});
  const lastWeek = days.reduce((acc, d) => { acc[d] = 0; return acc; }, {});
  const now = new Date();
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay() - 6); // last week Monday
  for (const s of (data ?? [])) {
    const d = new Date(s.sale_date);
    const dayName = days[(d.getDay() + 6) % 7]; // Mon=0 ... Sun=6
    if (d >= weekStart && d < now) {
      thisWeek[dayName] += Number(s.total);
    } else {
      lastWeek[dayName] += Number(s.total);
    }
  }
  const revenueData = days.map(d => ({ day: d, thisWeek: thisWeek[d], lastWeek: lastWeek[d] }));
  const total = revenueData.reduce((s, d) => s + d.thisWeek, 0);
  const lastTotal = revenueData.reduce((s, d) => s + d.lastWeek, 0);
  const growthPct = lastTotal > 0 ? Number((((total - lastTotal) / lastTotal) * 100).toFixed(1)) : 0;
  return { data: { data: revenueData, total, lastTotal, growthPct }, error: null };
}

// Stock status donut.
export async function stockStatus() {
  if (!supabase) return { data: null, error: { code: 'NOT_CONFIGURED', message: 'Supabase client not configured' } };
  const { data: items, error } = await supabase
    .from('sw_inventory_items')
    .select('stock, threshold')
    .is('deleted_at', null);
  if (error) return { data: null, error: { code: error.code, message: error.message } };

  const inStock = (items ?? []).filter(i => Number(i.stock) > Number(i.threshold)).length;
  const lowStock = (items ?? []).filter(i => Number(i.stock) > 0 && Number(i.stock) <= Number(i.threshold)).length;
  const outOfStock = (items ?? []).filter(i => Number(i.stock) === 0).length;
  const total = (items ?? []).length;
  return {
    data: { 'In Stock': inStock, 'Low Stock': lowStock, 'Out of Stock': outOfStock, total, inStockPct: total > 0 ? Math.round((inStock / total) * 100) : 0 },
    error: null,
  };
}

export async function topSellersList({ limit = 4 } = {}) {
  if (!supabase) return { data: null, error: { code: 'NOT_CONFIGURED', message: 'Supabase client not configured' } };
  // Aggregate sw_sale_items by item_id.
  const { data, error } = await supabase
    .from('sw_sale_items')
    .select('qty, unit_price, item_id, sale:sale_id(status)')
    .eq('sale.status', 'completed');
  if (error) return { data: null, error: { code: error.code, message: error.message } };

  const byItem = {};
  for (const si of (data ?? [])) {
    const id = si.item_id;
    if (!byItem[id]) byItem[id] = { id, sold: 0, revenue: 0 };
    byItem[id].sold += Number(si.qty);
    byItem[id].revenue += Number(si.qty) * Number(si.unit_price);
  }
  const top = Object.values(byItem).sort((a, b) => b.revenue - a.revenue).slice(0, limit);

  // Enrich with item names.
  const ids = top.map(t => t.id);
  if (ids.length > 0) {
    const { data: items } = await supabase
      .from('sw_inventory_items')
      .select('id, name, sku')
      .in('id', ids);
    const nameMap = (items ?? []).reduce((m, i) => { m[i.id] = { name: i.name, sku: i.sku }; return m; }, {});
    for (const t of top) {
      t.name = nameMap[t.id]?.name ?? 'Unknown';
      t.sku = nameMap[t.id]?.sku ?? 'SKU-?';
      t.icon = 'Package';
      t.bg = '#f0fdf4';
      t.iconColor = '#15803d';
      t.trend = 'up';
    }
  }
  return { data: top, error: null };
}

export async function lowStockList({ limit = 5 } = {}) {
  if (!supabase) return { data: null, error: { code: 'NOT_CONFIGURED', message: 'Supabase client not configured' } };
  const { data: items, error } = await supabase
    .from('sw_inventory_items')
    .select('*')
    .is('deleted_at', null)
    .order('stock', { ascending: true })
    .limit(limit);
  if (error) return { data: null, error: { code: error.code, message: error.message } };
  return { data: (items ?? []).map(i => ({
    id: i.id,
    name: i.name,
    sku: i.sku,
    stock: Number(i.stock),
    threshold: Number(i.threshold),
    status: Number(i.stock) === 0 ? 'critical' : 'low',
    icon: 'Package',
    bg: '#fef3c7',
    iconColor: '#92400e',
  })), error: null };
}

export async function pendingOrdersList({ limit = 5 } = {}) {
  if (!supabase) return { data: null, error: { code: 'NOT_CONFIGURED', message: 'Supabase client not configured' } };
  const { data, error } = await supabase
    .from('sw_sales')
    .select('id, display_id, sale_date, total, customer:customer_id(first_name, last_name)')
    .eq('status', 'pending')
    .is('deleted_at', null)
    .order('sale_date', { ascending: false })
    .limit(limit);
  if (error) return { data: null, error: { code: error.code, message: error.message } };
  return { data: (data ?? []).map(s => ({
    id: s.display_id ?? s.id,
    customer: s.customer ? `${s.customer.first_name} ${s.customer.last_name}` : 'Walk-in',
    amount: Number(s.total),
    items: 0, // would need a join
  })), error: null };
}

export async function recentSalesList({ limit = 4 } = {}) {
  if (!supabase) return { data: null, error: { code: 'NOT_CONFIGURED', message: 'Supabase client not configured' } };
  const { data, error } = await supabase
    .from('sw_sales')
    .select('id, display_id, sale_date, total, status, payment, customer:customer_id(first_name, last_name)')
    .is('deleted_at', null)
    .order('sale_date', { ascending: false })
    .limit(limit);
  if (error) return { data: null, error: { code: error.code, message: error.message } };
  return { data: (data ?? []).map(s => ({
    id: s.display_id ?? s.id,
    customer: {
      name: s.customer ? `${s.customer.first_name} ${s.customer.last_name}` : 'Walk-in',
      initials: s.customer ? `${s.customer.first_name?.[0] ?? ''}${s.customer.last_name?.[0] ?? ''}` : 'WI',
      color: '#dcfce7',
      textColor: '#15803d',
    },
    items: [], // would need a join
    total: Number(s.total),
    payment: s.payment,
    status: s.status,
    date: s.sale_date,
    note: null,
  })), error: null };
}
