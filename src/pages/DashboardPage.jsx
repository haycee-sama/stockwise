// src/pages/DashboardPage.jsx
import { useState, useMemo, useCallback } from 'react';
import {
  DollarSign, TrendingUp, Package, AlertCircle,
  Plus, Download, Clock, CheckCircle, ArrowRight,
  AlertTriangle, ShoppingCart, RefreshCw,
  SlidersHorizontal, X, BarChart2,
} from 'lucide-react';
import TopBar          from '../components/layout/TopBar';
import StatCard        from '../components/dashboard/StatCard';
import RevenueChart    from '../components/dashboard/RevenueChart';
import StockDonut      from '../components/dashboard/StockDonut';
import TopSellersTable from '../components/dashboard/TopSellersTable';
import LowStockTable   from '../components/dashboard/LowStockTable';
import { dashboardStats, pendingOrders, salesData, inventoryItems } from '../data/mockData';

// ── Helpers ──────────────────────────────────────
const naira = (v) => {
  if (v >= 1000000) return `₦${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000)    return `₦${(v / 1000).toFixed(0)}K`;
  return `₦${v}`;
};

const formatDateShort = (iso) =>
  new Date(iso).toLocaleDateString('en-NG', {
    day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  });

// ── Recent Sale Card (mobile) ─────────────────────
function RecentSaleCard({ order }) {
  return (
    <div className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-3.5 hover:shadow-md transition-all animate-fade-up">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
        style={{ background: order.customer.color, color: order.customer.textColor }}>
        {order.customer.initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">{order.customer.name}</p>
        <p className="text-[11px] text-gray-400">
          {order.items.length} item{order.items.length > 1 ? 's' : ''} · {formatDateShort(order.date)}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-extrabold text-gray-900 tabular-nums">
          {naira(order.total)}
        </p>
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md
          ${order.status === 'completed' ? 'bg-green-50 text-green-700'
          : order.status === 'pending'   ? 'bg-amber-50 text-amber-700'
          :                                'bg-red-50   text-red-600'}`}>
          {order.status}
        </span>
      </div>
    </div>
  );
}

// ── Pending Order Row ─────────────────────────────
function PendingOrderRow({ order, onFulfil }) {
  return (
    <div className="flex items-center gap-3 sm:gap-4 px-5 sm:px-6 py-3.5 hover:bg-gray-50/60 transition-colors">
      <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center flex-shrink-0">
        <Clock size={15} className="text-orange-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">{order.customer}</p>
        <p className="text-[11px] text-gray-400">
          {order.id} · {order.items} item{order.items > 1 ? 's' : ''}
        </p>
      </div>
      <p className="text-sm font-extrabold text-gray-900 flex-shrink-0 tabular-nums">
        {naira(order.amount)}
      </p>
      <button onClick={() => onFulfil(order.id)}
        className="flex items-center gap-1.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 active:scale-95 px-3 py-1.5 rounded-lg transition-all flex-shrink-0">
        <CheckCircle size={12} />
        <span className="hidden sm:inline">Fulfil</span>
      </button>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────
export default function DashboardPage() {
  const [orders, setOrders]       = useState(pendingOrders);
  const [showFilters, setFilters] = useState(false);
  const [period, setPeriod]       = useState('today');

  // ── Computed quick stats from live data ──────
  const liveStats = useMemo(() => {
    const now       = new Date();
    const todayStr  = now.toDateString();
    const weekAgo   = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);

    const completed  = salesData.filter(s => s.status === 'completed');
    const todaySales = completed.filter(s => new Date(s.date).toDateString() === todayStr);
    const weekSales  = completed.filter(s => new Date(s.date) >= weekAgo);
    const outOfStock = inventoryItems.filter(i => i.stock === 0).length;
    const lowStock   = inventoryItems.filter(i => i.stock > 0 && i.stock <= i.threshold).length;

    return {
      todayRevenue: todaySales.reduce((s, o) => s + o.total, 0),
      weekRevenue:  weekSales.reduce((s, o)  => s + o.total, 0),
      outOfStock,
      lowStock,
    };
  }, []);

  // Recent sales for the activity feed (latest 4)
  const recentSales = useMemo(() =>
    [...salesData].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 4),
  []);

  // ── Handlers ─────────────────────────────────
  const handleFulfil = useCallback((id) => {
    setOrders(prev => prev.filter(o => o.id !== id));
  }, []);

  const handleAddItem   = useCallback(() => {
    window.location.href = '/inventory';
  }, []);

  const handleNewSale   = useCallback(() => {
    window.location.href = '/sales';
  }, []);

  const handleExport    = useCallback(() => {
    console.log('Export dashboard data');
  }, []);

  const handleRefresh   = useCallback(() => {
    window.location.reload();
  }, []);

  // ── TopBar action buttons ─────────────────────
  const headerActions = (
    <>
      <button onClick={handleExport}
        className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all">
        <Download size={14} />
        <span className="hidden sm:inline">Export</span>
      </button>
      <button onClick={handleNewSale}
        className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all">
        <ShoppingCart size={14} />
        <span className="hidden sm:inline">New Sale</span>
      </button>
      <button onClick={handleAddItem}
        className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-xl hover:bg-green-700 active:scale-95 transition-all shadow-sm">
        <Plus size={14} />
        <span className="hidden sm:inline">Add Item</span>
      </button>
    </>
  );

  const hasAlerts = liveStats.outOfStock > 0 || liveStats.lowStock > 0;

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-gray-50 overflow-y-auto page-content">

      {/* Top Bar */}
      <TopBar actions={headerActions} />

      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-5">

        {/* ── Alert Banner ── */}
        {hasAlerts && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 animate-fade-up">
            <div className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={14} className="text-amber-600" />
            </div>
            <p className="text-sm text-amber-800 font-medium flex-1 min-w-0">
              {liveStats.outOfStock > 0 && (
                <span><strong>{liveStats.outOfStock} item{liveStats.outOfStock > 1 ? 's' : ''}</strong> out of stock. </span>
              )}
              {liveStats.lowStock > 0 && (
                <span><strong>{liveStats.lowStock} item{liveStats.lowStock > 1 ? 's' : ''}</strong> running low.</span>
              )}
            </p>
            <a href="/inventory"
              className="flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-900 transition-colors flex-shrink-0">
              View <ArrowRight size={12} />
            </a>
          </div>
        )}

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            icon={DollarSign}
            iconBg="bg-green-100" iconColor="text-green-600"
            label="Total Gross Sales"
            value={dashboardStats.totalSales}
            valueType="currency"
            change={dashboardStats.salesChange}
            changeLabel="vs last month"
            animDelay="0.05s"
          />
          <StatCard
            icon={TrendingUp}
            iconBg="bg-blue-100" iconColor="text-blue-600"
            label="Net Profit"
            value={dashboardStats.totalProfit}
            valueType="currency"
            change={dashboardStats.profitChange}
            changeLabel="vs last month"
            animDelay="0.10s"
          />
          <StatCard
            icon={Package}
            iconBg="bg-purple-100" iconColor="text-purple-600"
            label="Inventory Items"
            value={dashboardStats.totalInventory}
            valueType="number"
            change={dashboardStats.inventoryChange}
            changeLabel="vs last month"
            animDelay="0.15s"
          />
          <StatCard
            icon={AlertCircle}
            iconBg="bg-red-100" iconColor="text-red-500"
            label="Low Stock Alerts"
            value={dashboardStats.lowStockCount}
            valueType="number"
            change={dashboardStats.lowStockChange}
            changeLabel="new this week"
            animDelay="0.20s"
          />
        </div>

        {/* ── Quick Stats Strip ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {[
            { label: "Today's Revenue",  value: naira(liveStats.todayRevenue),  color: 'text-green-600',  bg: 'bg-green-50'   },
            { label: "This Week",        value: naira(liveStats.weekRevenue),   color: 'text-blue-600',   bg: 'bg-blue-50'    },
            { label: "Out of Stock",     value: liveStats.outOfStock,           color: 'text-red-600',    bg: 'bg-red-50'     },
            { label: "Pending Orders",   value: orders.length,                  color: 'text-amber-600',  bg: 'bg-amber-50'   },
          ].map((s, i) => (
            <div key={s.label}
              className={`${s.bg} rounded-2xl p-4 text-center animate-fade-up`}
              style={{ animationDelay: `${0.05 + i * 0.05}s` }}>
              <p className={`text-xl sm:text-2xl font-extrabold ${s.color} tabular-nums`}>
                {s.value}
              </p>
              <p className="text-[11px] text-gray-500 font-medium mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── Toolbar ── */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Period filter */}
            <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1">
              {[
                { id: 'today', label: 'Today'   },
                { id: 'week',  label: 'Week'    },
                { id: 'month', label: 'Month'   },
              ].map(p => (
                <button key={p.id} onClick={() => setPeriod(p.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                    ${period === p.id
                      ? 'bg-green-600 text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                    }`}>
                  {p.label}
                </button>
              ))}
            </div>

            {/* Filter toggle */}
            <button onClick={() => setFilters(v => !v)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-semibold transition-all
                ${showFilters
                  ? 'bg-green-50 border-green-300 text-green-700'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                }`}>
              <SlidersHorizontal size={14} />
              <span className="hidden sm:inline">Filters</span>
            </button>

            {/* Refresh */}
            <button onClick={handleRefresh}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all">
              <RefreshCw size={14} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {/* Count */}
            <span className="text-sm text-gray-400 font-medium ml-auto">
              <strong className="text-gray-700">{recentSales.length}</strong>
              <span className="hidden sm:inline"> recent transactions</span>
            </span>
          </div>

          {/* Expanded filters */}
          {showFilters && (
            <div className="flex items-center gap-2 flex-wrap animate-fade-up">
              <span className="text-xs text-gray-500 font-medium">Quick filters:</span>
              {['Low Stock', 'Pending Orders', 'Out of Stock'].map(f => (
                <button key={f}
                  className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:border-green-300 hover:bg-green-50 hover:text-green-700 transition-all">
                  {f}
                </button>
              ))}
              <button onClick={() => setFilters(false)}
                className="flex items-center gap-1 text-xs font-semibold text-red-400 hover:text-red-600 px-2 py-1 transition-colors">
                <X size={12} /> Close
              </button>
            </div>
          )}
        </div>

        {/* ── Charts Row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
          <div className="lg:col-span-2">
            <RevenueChart />
          </div>
          <div className="lg:col-span-1">
            <StockDonut />
          </div>
        </div>

        {/* ── Tables Row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
          <TopSellersTable />
          <LowStockTable   />
        </div>

        {/* ── Recent Activity + Pending Orders ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">

          {/* Recent Sales */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-fade-up">
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
                  <BarChart2 size={15} className="text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    Recent Sales
                  </h3>
                  <p className="text-[11px] text-gray-400">Latest transactions</p>
                </div>
              </div>
              <a href="/sales"
                className="flex items-center gap-1 text-xs font-semibold text-green-600 hover:text-green-700 transition-colors">
                View all <ArrowRight size={12} />
              </a>
            </div>

            {/* Mobile: cards */}
            <div className="lg:hidden divide-y divide-gray-50">
              {recentSales.map(order => (
                <div key={order.id} className="px-5 py-1">
                  <RecentSaleCard order={order} />
                </div>
              ))}
            </div>

            {/* Desktop: table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full min-w-[380px]">
                <thead className="bg-gray-50/80 border-b border-gray-100">
                  <tr>
                    {['Customer', 'Items', 'Total', 'Status'].map(h => (
                      <th key={h} className="text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 px-4 py-2.5">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentSales.map(order => (
                    <tr key={order.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-xl flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                            style={{ background: order.customer.color, color: order.customer.textColor }}>
                            {order.customer.initials}
                          </div>
                          <span className="text-xs font-semibold text-gray-800 truncate max-w-[100px]">
                            {order.customer.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-600">{order.items.length} item{order.items.length > 1 ? 's' : ''}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-bold text-gray-900 tabular-nums">{naira(order.total)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md capitalize
                          ${order.status === 'completed' ? 'bg-green-50 text-green-700'
                          : order.status === 'pending'   ? 'bg-amber-50 text-amber-700'
                          :                                'bg-red-50   text-red-600'}`}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pending Orders */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-fade-up">
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center">
                  <Clock size={15} className="text-orange-500" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    Pending Orders
                  </h3>
                  <p className="text-[11px] text-gray-400">
                    {orders.length} awaiting fulfilment
                  </p>
                </div>
              </div>
              <a href="/sales"
                className="flex items-center gap-1 text-xs font-semibold text-green-600 hover:text-green-700 transition-colors">
                View all <ArrowRight size={12} />
              </a>
            </div>

            {orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <CheckCircle size={22} className="text-gray-400" />
                </div>
                <p className="text-sm font-bold text-gray-700 mb-1">
                  All caught up!
                </p>
                <p className="text-xs text-gray-400">No pending orders right now.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {orders.map(order => (
                  <PendingOrderRow
                    key={order.id}
                    order={order}
                    onFulfil={handleFulfil}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400">
          <span>
            Showing data for <strong className="text-gray-700">
              {period === 'today' ? 'today' : period === 'week' ? 'this week' : 'this month'}
            </strong>
          </span>
          <span className="hidden sm:block">
            Total sales revenue:{' '}
            <strong className="text-green-600">
              {naira(salesData.filter(s => s.status === 'completed').reduce((s, o) => s + o.total, 0))}
            </strong>
          </span>
        </div>

      </main>
    </div>
  );
}