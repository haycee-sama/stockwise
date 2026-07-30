// src/pages/ReportsPage.jsx
import { useState } from 'react';
import {
  Download, TrendingUp, TrendingDown, ShoppingBag,
  Package, Users, Receipt, DollarSign, Target,
  BarChart2, AlertTriangle,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import TopBar from '../components/layout/TopBar';
import {
  salesTrendData, paymentBreakdown, topProductsReport,
  inventoryCategoryReport, customerAcquisitionData,
  customerTypeBreakdown, expenseTrend, expenseCategoryReport,
  customersData, inventoryItems,
} from '../data/mockData';

// ── Helpers ──────────────────────────────────────
const naira = (v) => {
  if (v >= 1000000) return `₦${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000)    return `₦${(v / 1000).toFixed(0)}K`;
  return `₦${v}`;
};

// ── Shared tooltip ────────────────────────────────
function ChartTip({ active, payload, label, isCurrency }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 text-white px-4 py-3 rounded-xl shadow-xl text-xs border border-white/10">
      <p className="font-bold text-gray-300 mb-2">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color || p.fill }} />
          <span className="text-gray-400 capitalize">{p.name}:</span>
          <span className="font-bold ml-1">
            {isCurrency ? naira(p.value) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function DonutTip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 text-white px-3 py-2 rounded-xl text-xs shadow-xl">
      <strong>{payload[0].name}:</strong> {payload[0].value}{typeof payload[0].value === 'number' && payload[0].value <= 100 ? '%' : ''}
    </div>
  );
}

// ── Tab config ────────────────────────────────────
const tabs = [
  { id: 'sales',     label: 'Sales',     icon: ShoppingBag, activeBg: 'bg-green-600'  },
  { id: 'inventory', label: 'Inventory', icon: Package,     activeBg: 'bg-blue-600'   },
  { id: 'customers', label: 'Customers', icon: Users,       activeBg: 'bg-purple-600' },
  { id: 'expenses',  label: 'Expenses',  icon: Receipt,     activeBg: 'bg-red-500'    },
];

const periods = [
  { id: 'month',   label: 'This Month'  },
  { id: 'last',    label: 'Last Month'  },
  { id: 'quarter', label: 'Quarter'     },
  { id: 'year',    label: 'This Year'   },
];

// ── Section card ──────────────────────────────────
function ReportCard({ title, subtitle, children }) {
  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100 shadow-sm">
      <h3 className="text-sm font-bold text-gray-900 mb-0.5">{title}</h3>
      {subtitle && <p className="text-xs text-gray-400 mb-5">{subtitle}</p>}
      {children}
    </div>
  );
}

// ── KPI pill ──────────────────────────────────────
function KpiPill({ value, label, color, bg }) {
  return (
    <div className={`${bg} rounded-xl p-3 sm:p-4 text-center`}>
      <p className={`text-lg sm:text-xl font-extrabold ${color} tabular-nums`}>{value}</p>
      <p className="text-[10px] text-gray-500 font-medium mt-0.5 truncate">{label}</p>
    </div>
  );
}

// ── Health Banner ─────────────────────────────────
function HealthBanner() {
  const totalRevenue  = salesTrendData.reduce((s, m) => s + m.revenue, 0);
  const totalProfit   = salesTrendData.reduce((s, m) => s + m.profit, 0);
  const totalExpenses = expenseTrend.reduce((s, m) => s + m.amount, 0);
  const totalOrders   = salesTrendData.reduce((s, m) => s + m.orders, 0);
  const profitMargin  = ((totalProfit / totalRevenue) * 100).toFixed(1);
  const avgOrderVal   = Math.round(totalRevenue / totalOrders);
  const avgLTV        = Math.round(customersData.reduce((s, c) => s + c.totalSpent, 0) / customersData.length);
  const outOfStock    = inventoryItems.filter(i => i.stock === 0).length;

  const kpis = [
    { icon: DollarSign, label: 'Revenue',       value: naira(totalRevenue),  change: '+12.4%', up: true  },
    { icon: TrendingUp, label: 'Net Profit',     value: naira(totalProfit),   change: '+8.1%',  up: true  },
    { icon: Target,     label: 'Profit Margin',  value: `${profitMargin}%`,   change: '+1.2%',  up: true  },
    { icon: Receipt,    label: 'Expenses',        value: naira(totalExpenses), change: '+4.7%',  up: false },
    { icon: BarChart2,  label: 'Avg. Order',      value: naira(avgOrderVal),   change: '+3.2%',  up: true  },
    { icon: Users,      label: 'Avg. LTV',        value: naira(avgLTV),        change: '+6.8%',  up: true  },
  ];

  return (
    <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl p-5 sm:p-6 mb-5 border border-white/5 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-64 h-64 bg-green-500/5 rounded-full -translate-x-32 -translate-y-32 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-48 h-48 bg-blue-500/5 rounded-full translate-x-16 translate-y-16 pointer-events-none" />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div>
            <h2 className="text-white text-base font-bold">
              Business Health Overview
            </h2>
            <p className="text-gray-400 text-xs mt-0.5">6-month cumulative performance</p>
          </div>
          <div className="flex items-center gap-2 bg-green-500/20 border border-green-500/30 px-3 py-1.5 rounded-xl">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-green-400 text-xs font-bold">Healthy</span>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2 sm:gap-3">
          {kpis.map(kpi => {
            const Icon = kpi.icon;
            return (
              <div key={kpi.label} className="bg-white/5 border border-white/10 rounded-xl p-3 hover:bg-white/8 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <Icon size={14} className="text-white/60" />
                  <span className={`flex items-center gap-0.5 text-[10px] font-bold
                    ${kpi.up ? 'text-green-400' : 'text-red-400'}`}>
                    {kpi.up ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                    {kpi.change}
                  </span>
                </div>
                <p className="text-white font-extrabold text-sm leading-none tabular-nums">{kpi.value}</p>
                <p className="text-gray-400 text-[10px] font-medium mt-1">{kpi.label}</p>
              </div>
            );
          })}
        </div>
        {outOfStock > 0 && (
          <div className="flex items-center gap-2 mt-4 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2.5">
            <AlertTriangle size={13} className="text-amber-400 flex-shrink-0" />
            <p className="text-amber-300 text-xs font-medium">
              <strong>{outOfStock} items</strong> are out of stock — restock to avoid lost sales.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sales Report ──────────────────────────────────
function SalesReport() {
  const totals = {
    revenue: salesTrendData.reduce((s, m) => s + m.revenue, 0),
    profit:  salesTrendData.reduce((s, m) => s + m.profit, 0),
    orders:  salesTrendData.reduce((s, m) => s + m.orders, 0),
  };
  totals.avgOrder = Math.round(totals.revenue / totals.orders);
  totals.margin   = Math.round((totals.profit / totals.revenue) * 100);

  const lastTwo  = salesTrendData.slice(-2);
  const momGrowth = lastTwo.length === 2
    ? (((lastTwo[1].revenue - lastTwo[0].revenue) / lastTwo[0].revenue) * 100).toFixed(1)
    : 0;

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <KpiPill value={naira(totals.revenue)} label="Total Revenue"  color="text-green-600"   bg="bg-green-50"   />
        <KpiPill value={naira(totals.profit)}  label="Total Profit"   color="text-blue-600"    bg="bg-blue-50"    />
        <KpiPill value={totals.orders}          label="Total Orders"   color="text-purple-600"  bg="bg-purple-50"  />
        <KpiPill value={naira(totals.avgOrder)} label="Avg. Order"     color="text-amber-600"   bg="bg-amber-50"   />
        <KpiPill value={`${totals.margin}%`}   label="Profit Margin"  color="text-emerald-600" bg="bg-emerald-50" />
      </div>
      <ReportCard title="Revenue & Profit Trend" subtitle="6-month performance">
        <div className="flex items-center justify-end mb-3">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-lg flex items-center gap-1
            ${Number(momGrowth) >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
            {Number(momGrowth) >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {momGrowth}% MoM
          </span>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={salesTrendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 500 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => `₦${(v/1000).toFixed(0)}K`} width={52} />
            <Tooltip content={<ChartTip isCurrency />} />
            <Line type="monotone" dataKey="revenue" stroke="#16a34a" strokeWidth={2.5} dot={{ fill: '#16a34a', r: 4 }} name="revenue" />
            <Line type="monotone" dataKey="profit"  stroke="#3b82f6" strokeWidth={2.5} dot={{ fill: '#3b82f6', r: 4 }} strokeDasharray="5 3" name="profit" />
          </LineChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-5 mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-1.5 text-xs text-gray-500"><div className="w-5 h-0.5 bg-green-500 rounded" /> Revenue</div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500"><div className="w-5 h-0.5 bg-blue-500 rounded" style={{ borderTop: '2px dashed #3b82f6', height: 0 }} /> Profit</div>
        </div>
      </ReportCard>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-5">
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900">Top Selling Products</h3>
            <p className="text-xs text-gray-400 mt-0.5">By revenue this period</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[380px]">
              <thead><tr className="bg-gray-50/80 border-b border-gray-100">
                {['#','Product','Sold','Revenue','Growth'].map(h => (
                  <th key={h} className="text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 px-4 py-2.5">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {topProductsReport.map((p, i) => (
                  <tr key={p.name} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3"><span className="text-xs font-bold text-gray-300">{i+1}</span></td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-semibold text-gray-800">{p.name}</p>
                      <p className="text-[10px] text-gray-400">{p.category}</p>
                    </td>
                    <td className="px-4 py-3"><span className="text-xs font-bold text-gray-700">{p.sold} <span className="text-gray-400 font-normal">units</span></span></td>
                    <td className="px-4 py-3"><span className="text-xs font-bold text-green-600 tabular-nums">{naira(p.revenue)}</span></td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md
                        ${p.growth >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                        {p.growth >= 0 ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                        {p.growth >= 0 ? '+' : ''}{p.growth}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="lg:col-span-2">
          <ReportCard title="Payment Methods" subtitle="By transaction method">
            <div className="relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={paymentBreakdown} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value" strokeWidth={0}>
                    {paymentBreakdown.map(e => <Cell key={e.name} fill={e.color} />)}
                  </Pie>
                  <Tooltip content={<DonutTip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 mt-2">
              {paymentBreakdown.map(item => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                    <span className="text-xs text-gray-600 font-medium">{item.name}</span>
                  </div>
                  <span className="text-xs font-bold text-gray-900">{item.value}%</span>
                </div>
              ))}
            </div>
          </ReportCard>
        </div>
      </div>
    </div>
  );
}

// ── Inventory Report ──────────────────────────────
function InventoryReport() {
  const totalItems = inventoryCategoryReport.reduce((s, c) => s + c.items, 0);
  const totalValue = inventoryCategoryReport.reduce((s, c) => s + c.value, 0);
  const stockHealth = [
    { name: 'In Stock',     value: 875, color: '#16a34a' },
    { name: 'Low Stock',    value: 263, color: '#f59e0b' },
    { name: 'Out of Stock', value: 110, color: '#ef4444' },
  ];
  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiPill value={totalItems.toLocaleString()} label="Total Items"     color="text-blue-600"   bg="bg-blue-50"   />
        <KpiPill value={naira(totalValue)}           label="Inventory Value" color="text-green-600"  bg="bg-green-50"  />
        <KpiPill value="875"                         label="In Stock"        color="text-emerald-600" bg="bg-emerald-50" />
        <KpiPill value="110"                         label="Out of Stock"    color="text-red-500"    bg="bg-red-50"    />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-5">
        <ReportCard title="Inventory by Category" subtitle="Stock distribution & value" >
          <div className="lg:col-span-3 space-y-5">
            {inventoryCategoryReport.map(cat => {
              const pct = (cat.items / totalItems) * 100;
              return (
                <div key={cat.name}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ background: cat.color }} />
                      <span className="text-sm font-semibold text-gray-700">{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400">{cat.items} items</span>
                      <span className="text-sm font-bold text-gray-900 tabular-nums">{naira(cat.value)}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: cat.color }} />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">{pct.toFixed(1)}% of total</p>
                </div>
              );
            })}
          </div>
        </ReportCard>
        <ReportCard title="Stock Health" subtitle="Current inventory status">
          <div className="relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={stockHealth} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value" strokeWidth={0}>
                  {stockHealth.map(e => <Cell key={e.name} fill={e.color} />)}
                </Pie>
                <Tooltip content={<DonutTip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute text-center pointer-events-none">
              <p className="text-xl font-extrabold text-gray-900">1,248</p>
              <p className="text-[10px] text-gray-400">total</p>
            </div>
          </div>
          <div className="space-y-2 mt-2">
            {stockHealth.map(item => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} /><span className="text-xs text-gray-600 font-medium">{item.name}</span></div>
                <span className="text-xs font-bold text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>
        </ReportCard>
      </div>
    </div>
  );
}

// ── Customer Report ───────────────────────────────
function CustomerReport() {
  const topCustomers = [...customersData].sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 5);
  const totalRevenue = customersData.reduce((s, c) => s + c.totalSpent, 0);
  const avgLTV       = Math.round(totalRevenue / customersData.length);
  const retention    = Math.round((customersData.filter(c => c.totalOrders > 1).length / customersData.length) * 100);
  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiPill value={customersData.length} label="Total Customers"  color="text-blue-600"   bg="bg-blue-50"   />
        <KpiPill value={naira(totalRevenue)}  label="Total Revenue"    color="text-green-600"  bg="bg-green-50"  />
        <KpiPill value={naira(avgLTV)}        label="Avg. Lifetime Val" color="text-purple-600" bg="bg-purple-50" />
        <KpiPill value={`${retention}%`}     label="Retention Rate"   color="text-amber-600"  bg="bg-amber-50"  />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-5">
        <ReportCard title="Customer Acquisition" subtitle="New vs returning per month">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={customerAcquisitionData} barGap={4} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 500 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} width={24} />
              <Tooltip content={<ChartTip />} cursor={{ fill: '#f8fafc', radius: 4 }} />
              <Bar dataKey="newCustomers" fill="#16a34a" radius={[4,4,0,0]} name="newCustomers" />
              <Bar dataKey="returning"    fill="#dcfce7" radius={[4,4,0,0]} name="returning"    />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-1.5 text-xs text-gray-500"><div className="w-3 h-2 rounded-sm bg-green-600" /> New</div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500"><div className="w-3 h-2 rounded-sm bg-green-100" /> Returning</div>
          </div>
        </ReportCard>
        <ReportCard title="Customer Types" subtitle="By business type">
          <div className="relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height={155}>
              <PieChart>
                <Pie data={customerTypeBreakdown} cx="50%" cy="50%" innerRadius={42} outerRadius={65} paddingAngle={3} dataKey="value" strokeWidth={0}>
                  {customerTypeBreakdown.map(e => <Cell key={e.name} fill={e.color} />)}
                </Pie>
                <Tooltip content={<DonutTip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-1">
            {customerTypeBreakdown.map(item => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} /><span className="text-xs text-gray-600 font-medium">{item.name}</span></div>
                <span className="text-xs font-bold text-gray-900">{item.value}%</span>
              </div>
            ))}
          </div>
        </ReportCard>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-900">Top Customers by Revenue</h3>
          <p className="text-xs text-gray-400 mt-0.5">Highest lifetime value</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px]">
            <thead><tr className="bg-gray-50/80 border-b border-gray-100">
              {['#','Customer','Type','Orders','Spent','Status'].map(h => (
                <th key={h} className="text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 px-4 py-2.5">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {topCustomers.map((c, i) => (
                <tr key={c.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3"><span className="text-xs font-bold text-gray-300">{i+1}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: c.color, color: c.textColor }}>{c.initials}</div>
                      <div>
                        <p className="text-xs font-bold text-gray-800">{c.firstName} {c.lastName}</p>
                        <p className="text-[10px] text-gray-400 truncate max-w-[120px]">{c.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md">{c.type}</span></td>
                  <td className="px-4 py-3"><span className="text-sm font-bold text-gray-700">{c.totalOrders}</span></td>
                  <td className="px-4 py-3"><span className="text-sm font-extrabold text-green-600 tabular-nums">{naira(c.totalSpent)}</span></td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg capitalize
                      ${c.status === 'active' ? 'bg-green-100 text-green-700'
                      : c.status === 'new'    ? 'bg-blue-100  text-blue-700'
                      : c.status === 'owing'  ? 'bg-amber-100 text-amber-700'
                      :                        'bg-gray-100  text-gray-500'}`}>
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Expenses Report ───────────────────────────────
function ExpensesReport() {
  const total       = expenseCategoryReport.reduce((s, c) => s + c.amount, 0);
  const profitMargin = (((2400000 - total) / 2400000) * 100).toFixed(1);
  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiPill value={naira(total)} label="Total Expenses" color="text-red-500"    bg="bg-red-50"    />
        <KpiPill value="₦184.7K"     label="This Month"     color="text-orange-600" bg="bg-orange-50" />
        <KpiPill value={`${profitMargin}%`} label="Profit Margin" color="text-green-600" bg="bg-green-50" />
        <KpiPill value="15"          label="Transactions"   color="text-purple-600" bg="bg-purple-50" />
      </div>
      <ReportCard title="Monthly Expense Trend" subtitle="6-month spend overview">
        <ResponsiveContainer width="100%" height={190}>
          <AreaChart data={expenseTrend}>
            <defs>
              <linearGradient id="rExpGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}    />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 500 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => `₦${(v/1000).toFixed(0)}K`} width={52} />
            <Tooltip content={<ChartTip isCurrency />} />
            <Area type="monotone" dataKey="amount" stroke="#ef4444" strokeWidth={2.5} fill="url(#rExpGrad)" dot={{ fill: '#ef4444', r: 4 }} name="amount" />
          </AreaChart>
        </ResponsiveContainer>
      </ReportCard>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-5">
        <ReportCard title="Expense by Category" subtitle="Where your money goes">
          <div className="space-y-4">
            {expenseCategoryReport.map(cat => (
              <div key={cat.name}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-semibold text-gray-700">{cat.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-400">{cat.pct}%</span>
                    <span className="text-sm font-extrabold text-gray-900 tabular-nums">{naira(cat.amount)}</span>
                  </div>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${cat.pct}%`, background: cat.color }} />
                </div>
              </div>
            ))}
          </div>
        </ReportCard>
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900">Largest Expenses</h3>
            <p className="text-xs text-gray-400 mt-0.5">Top 5 by amount</p>
          </div>
          <div className="divide-y divide-gray-50">
            {[...expenseCategoryReport].sort((a, b) => b.amount - a.amount).slice(0, 5).map((e, i) => (
              <div key={e.name} className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                <span className="text-xs font-bold text-gray-300 w-4">{i+1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 truncate">{e.name}</p>
                  <p className="text-[10px] text-gray-400">{e.pct}% of total</p>
                </div>
                <p className="text-xs font-extrabold text-red-500 flex-shrink-0 tabular-nums">
                  {naira(e.amount)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────
export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('sales');
  const [period, setPeriod]       = useState('month');

  const headerActions = (
    <>
      <div className="hidden sm:flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1">
        {periods.map(p => (
          <button key={p.id} onClick={() => setPeriod(p.id)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all
              ${period === p.id ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {p.label}
          </button>
        ))}
      </div>
      <button className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-xl hover:bg-green-700 active:scale-95 transition-all shadow-sm">
        <Download size={14} /><span className="hidden sm:inline">Export PDF</span>
      </button>
    </>
  );

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-gray-50 overflow-y-auto page-content">
      <TopBar title="Reports" subtitle="Detailed business performance insights" actions={headerActions} />

      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-5 sm:py-6">
        <HealthBanner />

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-5 sm:mb-6 overflow-x-auto pb-1">
          {tabs.map(tab => {
            const Icon    = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex-shrink-0
                  ${isActive
                    ? `${tab.activeBg} text-white shadow-md shadow-black/10`
                    : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300 hover:text-gray-700'
                  }`}>
                <Icon size={15} />
                {tab.label}
              </button>
            );
          })}
          <div className="ml-auto flex items-center gap-2 text-xs text-gray-400 bg-white border border-gray-200 rounded-xl px-3 py-2 flex-shrink-0">
            <div size={12} />
            <span className="font-medium hidden sm:block">{periods.find(p => p.id === period)?.label}</span>
          </div>
        </div>

        {activeTab === 'sales'     && <SalesReport     />}
        {activeTab === 'inventory' && <InventoryReport />}
        {activeTab === 'customers' && <CustomerReport  />}
        {activeTab === 'expenses'  && <ExpensesReport  />}
      </main>
    </div>
  );
}