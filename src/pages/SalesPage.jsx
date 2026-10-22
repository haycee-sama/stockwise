// src/pages/SalesPage.jsx
import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Plus, Download, Search, ChevronDown, Eye,
  Printer, CheckCircle, Clock, XCircle,
  TrendingUp, ShoppingBag, Calendar, CreditCard,
  Banknote, Building2, ArrowRight, X,
  SlidersHorizontal, AlertCircle,
} from 'lucide-react';
import TopBar        from '../components/layout/TopBar';
import NewSaleModal  from '../components/sales/NewSaleModal';
import ViewOrderModal from '../components/sales/ViewOrderModal';
import { salesService } from '../services';
import { useBusiness } from '../context/useBusiness';
import { LoadingState, ErrorState } from '../components/common/ResourceState';


// ── Helpers ──────────────────────────────────────
const naira = (v) => {
  if (v >= 1000000) return `₦${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000)    return `₦${(v / 1000).toFixed(0)}K`;
  return `₦${v}`;
};

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('en-NG', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

const formatDateShort = (iso) =>
  new Date(iso).toLocaleDateString('en-NG', {
    day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  });

// ── Status config ─────────────────────────────────
const statusConfig = {
  completed: {
    label: 'Completed',
    cls:   'bg-green-50 text-green-700',
    icon:  CheckCircle,
  },
  pending: {
    label: 'Pending',
    cls:   'bg-amber-50 text-amber-700',
    icon:  Clock,
  },
  cancelled: {
    label: 'Cancelled',
    cls:   'bg-red-50 text-red-600',
    icon:  XCircle,
  },
};

// ── Payment config ────────────────────────────────
const paymentConfig = {
  Cash:     { icon: Banknote,   cls: 'bg-blue-50 text-blue-700'     },
  Transfer: { icon: Building2,  cls: 'bg-purple-50 text-purple-700' },
  Card:     { icon: CreditCard, cls: 'bg-orange-50 text-orange-700' },
};

// ── Status Badge ──────────────────────────────────
function StatusBadge({ status }) {
  const cfg  = statusConfig[status] ?? statusConfig.completed;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold ${cfg.cls}`}>
      <Icon size={11} /> {cfg.label}
    </span>
  );
}

// ── Payment Badge ─────────────────────────────────
function PaymentBadge({ method }) {
  const cfg  = paymentConfig[method] ?? { icon: Banknote, cls: 'bg-gray-100 text-gray-600' };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold ${cfg.cls}`}>
      <Icon size={11} /> {method}
    </span>
  );
}

// ── Summary Card ──────────────────────────────────
function SummaryCard({ icon: Icon, iconBg, iconColor, label, value, sub, subColor, animDelay }) {
  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 animate-fade-up"
      style={{ animationDelay: animDelay }}>
      <div className="flex items-center gap-3 sm:gap-4">
        <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          <Icon size={19} className={iconColor} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5 truncate">{label}</p>
          <p className="text-xl sm:text-2xl font-extrabold text-gray-900 leading-none truncate tabular-nums">
            {value}
          </p>
          {sub && (
            <p className={`text-[11px] font-semibold mt-0.5 ${subColor ?? 'text-gray-400'}`}>{sub}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Mobile Sale Card ──────────────────────────────
function SaleCard({ order, onView }) {
  const StatusIcon = statusConfig[order.status]?.icon ?? CheckCircle;
  const pmtCfg     = paymentConfig[order.payment] ?? paymentConfig.Cash;
  const PmtIcon    = pmtCfg.icon;

  return (
    <button onClick={() => onView(order)}
      className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-left hover:shadow-md hover:-translate-y-0.5 transition-all animate-fade-up active:scale-[0.98]">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: order.customer.color, color: order.customer.textColor }}>
            {order.customer.initials}
          </div>
          <div>
            <p className="text-sm font-bold text-gray-800">{order.customer.name}</p>
            <p className="text-[11px] text-gray-400 font-mono">#{order.id}</p>
          </div>
        </div>
        <p className="text-base font-extrabold text-gray-900 tabular-nums">
          {naira(order.total)}
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={order.status} />
          <PaymentBadge method={order.payment} />
        </div>
        <p className="text-[11px] text-gray-400">{formatDateShort(order.date)}</p>
      </div>

      {order.items.length > 0 && (
        <p className="text-[11px] text-gray-400 mt-2 truncate">
          {order.items.map(i => i.name).join(' · ')}
        </p>
      )}

      {/* Tap indicator */}
      <div className="flex items-center justify-end mt-2 text-[10px] text-gray-300 font-semibold gap-1">
        Tap to view <ArrowRight size={10} />
      </div>
    </button>
  );
}

// ── Main Page ─────────────────────────────────────
export default function SalesPage() {
  const { activeBusinessId, isDemoMode } = useBusiness();
  const [sales, setSales]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatus]   = useState('All');
  const [paymentFilter, setPayment] = useState('All');
  const [newSaleOpen, setNewSale]   = useState(false);
  const [viewOrder, setViewOrder]   = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  const fetchSales = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: svcErr } = await salesService.list({
        businessId: activeBusinessId,
      });
      if (svcErr) {
        setError(svcErr);
        setSales([]);
      } else {
        setSales(data ?? []);
      }
    } catch (e) {
      setError({ code: 'CAUGHT', message: e?.message ?? 'Unknown error' });
      setSales([]);
    } finally {
      setLoading(false);
    }
  }, [activeBusinessId]);

  useEffect(() => { fetchSales(); }, [fetchSales]);

  // ── Stats ─────────────────────────────────────
  const stats = useMemo(() => {
    const now      = new Date();
    const today    = now.toDateString();
    const weekAgo  = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
    const completed = sales.filter(s => s.status === 'completed');

    return {
      today:       sales.filter(s => new Date(s.date).toDateString() === today && s.status === 'completed')
                       .reduce((sum, o) => sum + o.total, 0),
      week:        completed.filter(s => new Date(s.date) >= weekAgo)
                       .reduce((sum, o) => sum + o.total, 0),
      month:       completed.reduce((sum, o) => sum + o.total, 0),
      totalOrders: sales.length,
      pending:     sales.filter(s => s.status === 'pending').length,
    };
  }, [sales]);

  // ── Filtered sales ────────────────────────────
  const filtered = useMemo(() => {
    let r = [...sales];
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(s =>
        s.id.toLowerCase().includes(q) ||
        s.customer.name.toLowerCase().includes(q) ||
        s.items.some(i => i.name.toLowerCase().includes(q))
      );
    }
    if (statusFilter  !== 'All') r = r.filter(s => s.status  === statusFilter.toLowerCase());
    if (paymentFilter !== 'All') r = r.filter(s => s.payment === paymentFilter);
    return r.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [sales, search, statusFilter, paymentFilter]);

  // ── Handlers ─────────────────────────────────
  const handleNewSale = useCallback(async (order) => {
    // The NewSaleModal's payload shape is the legacy mock format
    // (customer: {name, initials, color, textColor}, items: [{name, qty, price}]).
    // The Supabase-backed salesService.create() translates this to the
    // RPC payload shape expected by sw_create_sale (business_id,
    // customer_id, items: [{item_id, qty, unit_price}]).
    //
    // NOTE: the current NewSaleModal passes a free-text customer name
    // (not a customer_id). The salesService.create() in Supabase mode
    // currently passes customer_id: null — the sale is created with no
    // linked customer. A future refactor of NewSaleModal to use a
    // customer-picker would set customer_id from the selected customer.
    //
    // The sw_create_sale RPC validates:
    //   - business_id (RLS-checked)
    //   - each item_id exists in the active business
    //   - each qty > 0 AND qty <= item.stock (cannot oversell)
    //   - each unit_price >= 0
    //   - status in ('completed', 'pending', 'cancelled')
    // The RPC computes the total server-side (client-supplied totals
    // are IGNORED). If any check fails, the WHOLE sale rolls back —
    // no partial state (no orphaned sale header, no decremented stock,
    // no ledger entry).
    //
    // The NewSaleModal currently passes items as [{name, qty, price}]
    // — these are item NAMES, not item_ids. The Supabase-backed
    // service needs item_ids. For Phase 3B v1, we map by name lookup
    // via the inventory service. If an item name doesn't match, the
    // sale is rejected.
    const payload = {
      businessId: activeBusinessId,
      customerName: order.customer?.name,
      customerId: order.customerId ?? null,
      items: order.items.map(i => ({
        itemId:    i.itemId,
        name:      i.name,
        qty:       i.qty,
        unitPrice: i.unitPrice,
      })),
      payment: order.payment,
      status: order.status ?? 'completed',
      note: order.note,
    };
    const { data: persisted, error: svcErr } = await salesService.create(payload);
    if (svcErr) {
      console.error('[SalesPage] create sale failed:', svcErr);
      // Do NOT update local state — the server didn't persist.
      // The modal stays open + the user can fix the issue.
      return { success: false, message: svcErr.message };
    }
    if (persisted) {
      setSales(prev => [persisted, ...prev]);
    }
    return { success: true };
  }, [activeBusinessId]);

  const openView = useCallback((order) => setViewOrder(order), []);

  // TopBar actions
  const headerActions = (
    <>
      <button disabled title="Coming soon" className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-semibold text-gray-400 bg-gray-50 border border-gray-200 rounded-xl cursor-not-allowed">
        <Download size={14} />
        <span className="hidden sm:inline">Export</span>
      </button>
      <button onClick={() => setNewSale(true)}
        className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-xl hover:bg-green-700 active:scale-95 transition-all shadow-sm">
        <Plus size={14} />
        <span className="hidden sm:inline">New Sale</span>
      </button>
    </>
  );

  const hasActiveFilters = search || statusFilter !== 'All' || paymentFilter !== 'All';

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-gray-50 overflow-y-auto page-content">
      <TopBar
        title="Sales"
        subtitle="Track and manage your transactions"
        actions={headerActions}
      />

      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-5">
        {isDemoMode && (
          <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 text-xs text-blue-800">
            Demo mode — sales are in-memory only. Configure Supabase to persist via the atomic sw_create_sale RPC.
          </div>
        )}

        {loading && <LoadingState label="Loading sales…" />}

        {!loading && error && (
          <ErrorState error={error} onRetry={fetchSales} />
        )}

        {!loading && !error && (
          <>
        {/* ── Summary Cards ── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
          <SummaryCard icon={TrendingUp} iconBg="bg-green-100" iconColor="text-green-600"
            label="Today's Sales" value={naira(stats.today)}
            sub="Current day" subColor="text-green-600" animDelay="0.05s" />
          <SummaryCard icon={Calendar} iconBg="bg-blue-100" iconColor="text-blue-600"
            label="This Week" value={naira(stats.week)}
            sub="Last 7 days" subColor="text-blue-600" animDelay="0.10s" />
          <SummaryCard icon={ShoppingBag} iconBg="bg-purple-100" iconColor="text-purple-600"
            label="This Month" value={naira(stats.month)}
            sub="Completed only" subColor="text-purple-600" animDelay="0.15s" />
          <SummaryCard icon={CreditCard} iconBg="bg-amber-100" iconColor="text-amber-600"
            label="Total Orders" value={stats.totalOrders}
            sub={`${stats.pending} pending`} subColor="text-amber-600" animDelay="0.20s" />
        </div>

        {/* ── Pending Alert ── */}
        {stats.pending > 0 && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 animate-fade-up">
            <div className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <AlertCircle size={14} className="text-amber-600" />
            </div>
            <p className="text-sm text-amber-800 font-medium flex-1">
              <strong>{stats.pending}</strong> pending order{stats.pending > 1 ? 's' : ''} need attention.
            </p>
            <button onClick={() => setStatus('Pending')}
              className="flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-900 transition-colors flex-shrink-0">
              View <ArrowRight size={12} />
            </button>
          </div>
        )}

        {/* ── Toolbar ── */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-[180px] max-w-sm">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search order, customer, item..."
                className="w-full pl-10 pr-9 py-2.5 text-sm bg-white border border-gray-200 rounded-xl outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all" />
              {search && (
                <button onClick={() => setSearch('')}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filter toggle */}
            <button onClick={() => setShowFilters(v => !v)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all
                ${showFilters || hasActiveFilters
                  ? 'bg-green-50 border-green-300 text-green-700'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                }`}>
              <SlidersHorizontal size={14} />
              <span className="hidden sm:inline">Filters</span>
              {hasActiveFilters && !showFilters && (
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
              )}
            </button>

            {/* Count */}
            <span className="text-sm text-gray-400 font-medium ml-auto">
              <strong className="text-gray-700">{filtered.length}</strong>
              <span className="hidden sm:inline"> of {sales.length} orders</span>
            </span>
          </div>

          {/* Expandable filters */}
          {showFilters && (
            <div className="flex items-center gap-2 flex-wrap animate-fade-up">
              {/* Status */}
              <div className="relative">
                <select value={statusFilter} onChange={e => setStatus(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-2 text-sm bg-white border border-gray-200 rounded-xl outline-none focus:border-green-400 transition-all font-medium text-gray-600 cursor-pointer">
                  <option value="All">All Status</option>
                  <option value="Completed">Completed</option>
                  <option value="Pending">Pending</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>

              {/* Payment */}
              <div className="relative">
                <select value={paymentFilter} onChange={e => setPayment(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-2 text-sm bg-white border border-gray-200 rounded-xl outline-none focus:border-green-400 transition-all font-medium text-gray-600 cursor-pointer">
                  <option value="All">All Payments</option>
                  <option value="Cash">Cash</option>
                  <option value="Transfer">Transfer</option>
                  <option value="Card">Card / POS</option>
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>

              {/* Clear filters */}
              {hasActiveFilters && (
                <button onClick={() => { setSearch(''); setStatus('All'); setPayment('All'); }}
                  className="flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:text-red-700 transition-colors px-2 py-1">
                  <X size={12} /> Clear filters
                </button>
              )}

              {/* Filtered total */}
              <div className="ml-auto text-xs font-semibold text-gray-500 hidden sm:block">
                Filtered total:{' '}
                <strong className="text-green-600">
                  {naira(filtered.filter(s => s.status === 'completed').reduce((s, o) => s + o.total, 0))}
                </strong>
              </div>
            </div>
          )}
        </div>

        {/* ── Empty State ── */}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm text-center animate-fade-up">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ShoppingBag size={28} className="text-gray-400" />
            </div>
            <h3 className="text-base font-bold text-gray-700 mb-2">
              No orders found
            </h3>
            <p className="text-sm text-gray-400 mb-6 max-w-xs">
              {search
                ? `No results for "${search}".`
                : 'No sales recorded yet. Create your first sale!'}
            </p>
            <button onClick={() => setNewSale(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 active:scale-95 transition-all">
              <Plus size={15} /> New Sale
            </button>
          </div>
        )}

        {/* ── Mobile Cards View ── */}
        {filtered.length > 0 && (
          <>
            {/* Mobile: cards */}
            <div className="lg:hidden space-y-3">
              {filtered.map(order => (
                <SaleCard key={order.id} order={order} onView={openView} />
              ))}
            </div>

            {/* Desktop: table */}
            <div className="hidden lg:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-fade-up">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead className="bg-gray-50/80 border-b border-gray-100">
                    <tr>
                      {['Order ID', 'Customer', 'Items', 'Total', 'Payment', 'Date', 'Status', 'Actions'].map(h => (
                        <th scope="col" key={h} className="text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 px-4 py-3 whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(order => (
                      <tr key={order.id}
                        className="border-b border-gray-50 last:border-0 hover:bg-green-50/20 transition-colors group">

                        {/* Order ID */}
                        <td className="px-4 py-3.5">
                          <span className="text-sm font-bold text-green-600 font-mono">
                            #{order.id}
                          </span>
                        </td>

                        {/* Customer */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
                              style={{ background: order.customer.color, color: order.customer.textColor }}>
                              {order.customer.initials}
                            </div>
                            <span className="text-sm font-semibold text-gray-800 truncate max-w-[120px]">
                              {order.customer.name}
                            </span>
                          </div>
                        </td>

                        {/* Items */}
                        <td className="px-4 py-3.5">
                          <p className="text-sm font-semibold text-gray-700">
                            {order.items.length} item{order.items.length > 1 ? 's' : ''}
                          </p>
                          <p className="text-[11px] text-gray-400 truncate max-w-[140px]">
                            {order.items.map(i => i.name).join(', ')}
                          </p>
                        </td>

                        {/* Total */}
                        <td className="px-4 py-3.5">
                          <span className="text-sm font-extrabold text-gray-900 tabular-nums">
                            {naira(order.total)}
                          </span>
                        </td>

                        {/* Payment */}
                        <td className="px-4 py-3.5">
                          <PaymentBadge method={order.payment} />
                        </td>

                        {/* Date */}
                        <td className="px-4 py-3.5">
                          <span className="text-xs text-gray-500 font-medium whitespace-nowrap">
                            {formatDate(order.date)}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5">
                          <StatusBadge status={order.status} />
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5 opacity-50 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openView(order)}
                              className="w-7 h-7 flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 text-gray-400 transition-all"
                              aria-label="View order"
                              title="View order">
                              <Eye size={13} />
                            </button>
                            <button
                              className="w-7 h-7 flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-gray-100 text-gray-400 transition-all"
                              aria-label="Print receipt"
                              title="Print receipt">
                              <Printer size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ── Footer ── */}
        {filtered.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400">
            <span>Showing <strong className="text-gray-700">{filtered.length}</strong> of {sales.length} orders</span>
            <span className="hidden sm:block">
              Completed revenue:{' '}
              <strong className="text-green-600">
                {naira(filtered.filter(s => s.status === 'completed').reduce((s, o) => s + o.total, 0))}
              </strong>
            </span>
          </div>
        )}
                </>
        )}
      </main>

      {/* ── Modals ── */}
      <NewSaleModal
        isOpen={newSaleOpen}
        onClose={() => setNewSale(false)}
        onSave={handleNewSale}
      />
      <ViewOrderModal
        isOpen={!!viewOrder}
        order={viewOrder}
        onClose={() => setViewOrder(null)}
      />
    </div>
  );
}