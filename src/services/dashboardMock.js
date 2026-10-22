// src/services/dashboardMock.js
// Mock data-access layer for dashboard aggregates. See docs/BACKEND_HANDOVER.md.

import {
  dashboardStats, revenueData, stockStatusData,
  topSellers, lowStockItems, pendingOrders, salesData, inventoryItems,
} from '../data/mockData';

const delay = (ms) => new Promise(r => setTimeout(r, ms));

export async function summary() {
  await delay(80);
  const now = new Date();
  const todayStr = now.toDateString();
  const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
  const completed = salesData.filter(s => s.status === 'completed');
  return {
    data: {
      ...dashboardStats,
      todayRevenue: completed
        .filter(s => new Date(s.date).toDateString() === todayStr)
        .reduce((s, o) => s + o.total, 0),
      weekRevenue: completed
        .filter(s => new Date(s.date) >= weekAgo)
        .reduce((s, o) => s + o.total, 0),
      outOfStock: inventoryItems.filter(i => i.stock === 0).length,
      lowStock: inventoryItems.filter(i => i.stock > 0 && i.stock <= i.threshold).length,
      pendingOrdersCount: pendingOrders.length,
    },
    error: null,
  };
}

export async function revenue() {
  await delay(60);
  const total = revenueData.reduce((s, d) => s + d.thisWeek, 0);
  const lastTotal = revenueData.reduce((s, d) => s + d.lastWeek, 0);
  const growthPct = lastTotal > 0
    ? Number((((total - lastTotal) / lastTotal) * 100).toFixed(1))
    : 0;
  return { data: { data: revenueData, total, lastTotal, growthPct }, error: null };
}

export async function stockStatus() {
  await delay(60);
  const total = stockStatusData.reduce((s, d) => s + d.value, 0);
  return { data: { ...Object.fromEntries(stockStatusData.map(d => [d.name, d.value])), total }, error: null };
}

export async function topSellersList({ limit = 4 } = {}) {
  await delay(50);
  return { data: topSellers.slice(0, limit), error: null };
}

export async function lowStockList({ limit = 5 } = {}) {
  await delay(50);
  return { data: lowStockItems.slice(0, limit), error: null };
}

export async function pendingOrdersList({ limit = 5 } = {}) {
  await delay(50);
  return { data: pendingOrders.slice(0, limit), error: null };
}

export async function recentSalesList({ limit = 4 } = {}) {
  await delay(50);
  const sorted = [...salesData].sort((a, b) => new Date(b.date) - new Date(a.date));
  return { data: sorted.slice(0, limit), error: null };
}
