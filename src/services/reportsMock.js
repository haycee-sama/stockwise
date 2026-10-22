// src/services/reportsMock.js
// Mock data-access layer for the Reports page aggregates.
// See docs/BACKEND_HANDOVER.md.

import {
  salesTrendData, paymentBreakdown, topProductsReport,
  inventoryCategoryReport, customerAcquisitionData,
  customerTypeBreakdown, expenseTrend, expenseCategoryReport,
  customersData, inventoryItems,
} from '../data/mockData';

const delay = (ms) => new Promise(r => setTimeout(r, ms));

export async function salesReport() {
  await delay(80);
  const totals = {
    revenue: salesTrendData.reduce((s, m) => s + m.revenue, 0),
    profit:  salesTrendData.reduce((s, m) => s + m.profit, 0),
    orders:  salesTrendData.reduce((s, m) => s + m.orders, 0),
  };
  totals.avgOrder = totals.orders > 0 ? Math.round(totals.revenue / totals.orders) : 0;
  totals.margin   = totals.revenue > 0 ? Math.round((totals.profit / totals.revenue) * 100) : 0;
  const lastTwo = salesTrendData.slice(-2);
  const momGrowth = lastTwo.length === 2 && lastTwo[0].revenue > 0
    ? Number((((lastTwo[1].revenue - lastTwo[0].revenue) / lastTwo[0].revenue) * 100).toFixed(1))
    : 0;
  return {
    data: {
      totals,
      trend: salesTrendData,
      momGrowthPct: momGrowth,
      topProducts: topProductsReport,
      paymentBreakdown,
    },
    error: null,
  };
}

export async function inventoryReport() {
  await delay(70);
  return { data: { categoryReport: inventoryCategoryReport, topProducts: topProductsReport, lowStock: inventoryItems.filter(i => i.stock <= i.threshold) }, error: null };
}

export async function customersReport() {
  await delay(70);
  return { data: { acquisition: customerAcquisitionData, typeBreakdown: customerTypeBreakdown, topCustomers: [...customersData].sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 5) }, error: null };
}

export async function expensesReport() {
  await delay(70);
  return { data: { trend: expenseTrend, categoryReport: expenseCategoryReport }, error: null };
}
