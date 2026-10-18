// src/services/dashboardSupabase.js
// Supabase-backed implementation of the dashboard aggregates.

import { supabase } from '../lib/supabase';


// Fetches summary stats from sw_inventory_items + sw_sales.
// Note: `*ChangePct` deltas require historical data — for v1 we
// return 0 and let the frontend show "vs last month" placeholder text
// until the backend has a materialised view for these.
export async function summary() {
  if (!supabase) return { data: null, error: { code: 'NOT_CONFIGURED', message: 'Supabase client not configured' } };

  const [inv, sales] = await Promise.all([
    supabase.from('sw_inventory_items').select('id, stock, threshold').is('deleted_at', null),
    supabase.from('sw_sales').select('id, total, status, sale_date').is('deleted_at', null),
  ]);

  if (inv.error) return { data: null, error: { code: inv.error.code, message: inv.error.message } };
  if (sales.error) return { data: null, error: { code: sales.error.code, message: sales.error.message } };

  const items = inv.data ?? [];
  const allSales = sales.data ?? [];
  const completedSales = allSales.filter(s => s.status === 'completed');

  const now = new Date();
  const todayStr = now.toDateString();
  const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);

  const todaySales = completedSales.filter(s => new Date(s.sale_date).toDateString() === todayStr);
  const weekSales = completedSales.filter(s => new Date(s.sale_date) >= weekAgo);

  const outOfStock = items.filter(i => Number(i.stock) === 0).length;
  const lowStock = items.filter(i => Number(i.stock) > 0 && Number(i.stock) <= Number(i.threshold)).length;

  return {
    data: {
      totalSales: completedSales.reduce((s, o) => s + Number(o.total), 0),
      totalProfit: 0, // requires cost data — TODO: aggregate from sw_sale_items × sw_inventory_items.cost_price
      totalInventory: items.length,
      lowStockCount: lowStock,
      salesChange: 0,
      profitChange: 0,
      inventoryChange: 0,
      lowStockChange: 0,
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
