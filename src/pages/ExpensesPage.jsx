// src/pages/ExpensesPage.jsx
import { useState, useMemo, useCallback } from 'react';
import {
  Plus, Search, ChevronDown, Download, Edit2, Trash2,
  Receipt, TrendingDown, Calendar, Tag, CreditCard,
  Banknote, Building2, X, SlidersHorizontal, AlertTriangle,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, AreaChart, Area,
} from 'recharts';
import TopBar             from '../components/layout/TopBar';
import ExpenseModal       from '../components/expenses/ExpenseModal';
import ExpenseDeleteModal from '../components/expenses/ExpenseDeleteModal';
import {
  expensesData, expenseCategories, expensePaymentMethods, expenseTrend,
} from '../data/mockData';

const naira = (v) => {
  if (v >= 1000000) return `₦${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000)    return `₦${(v / 1000).toFixed(0)}K`;
  return `₦${v}`;
};

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });

// Payment icon map
const pmtIcons = { Cash: Banknote, Transfer: Building2, Card: CreditCard };
const pmtColors = {
  Cash:     'bg-blue-50 text-blue-700',
  Transfer: 'bg-purple-50 text-purple-700',
  Card:     'bg-orange-50 text-orange-700',
};

function PaymentBadge({ method }) {
  const Icon = pmtIcons[method] ?? Banknote;
  const cls  = pmtColors[method] ?? 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold ${cls}`}>
      <Icon size={11} /> {method}
    </span>
  );
}

function StatCard({ icon: Icon, iconBg, iconColor, label, value, sub, subColor, delay }) {
  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 animate-fade-up"
      style={{ animationDelay: delay }}>
      <div className="flex items-center gap-3 sm:gap-4">
        <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          <Icon size={19} className={iconColor} />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-0.5 truncate">{label}</p>
          <p className="text-xl sm:text-2xl font-extrabold text-gray-900 leading-none truncate"
            style={{ fontFamily: 'sans-serif' }}>{value}</p>
          {sub && <p className={`text-[11px] font-semibold mt-0.5 ${subColor ?? 'text-gray-400'}`}>{sub}</p>}
        </div>
      </div>
    </div>
  );
}

function AreaTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 text-white px-4 py-3 rounded-xl shadow-xl text-xs border border-white/10">
      <p className="font-bold text-gray-300 mb-1">{label}</p>
      <p className="text-red-400 font-extrabold">₦{payload[0].value.toLocaleString()}</p>
    </div>
  );
}

function CategoryBreakdown({ expenses }) {
  const breakdown = useMemo(() => {
    const totals = {};
    expenses.forEach(e => { totals[e.category] = (totals[e.category] ?? 0) + e.amount; });
    const grand = Object.values(totals).reduce((s, v) => s + v, 0);
    return expenseCategories
      .map(cat => ({ ...cat, total: totals[cat.id] ?? 0, pct: grand > 0 ? ((totals[cat.id] ?? 0) / grand) * 100 : 0 }))
      .filter(c => c.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [expenses]);
  const grand = breakdown.reduce((s, c) => s + c.total, 0);
  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100 shadow-sm h-full">
      <h3 className="text-sm font-bold text-gray-900 mb-1" style={{ fontFamily: 'sans-serif' }}>
        Breakdown by Category
      </h3>
      <p className="text-xs text-gray-400 mb-5">Where your money goes</p>
      {breakdown.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No expenses yet</p>
      ) : (
        <div className="space-y-4">
          {breakdown.map(cat => {
            const Icon = cat.Icon;
            return (
              <div key={cat.id}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: cat.bg }}>
                      {Icon && <Icon size={14} style={{ color: cat.color }} />}
                    </div>
                    <span className="text-xs font-semibold text-gray-700">{cat.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-gray-400">{cat.pct.toFixed(0)}%</span>
                    <span className="text-xs font-extrabold text-gray-900 tabular-nums" style={{ fontFamily: 'sans-serif' }}>{naira(cat.total)}</span>
                  </div>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${cat.pct}%`, background: cat.color }} />
                </div>
              </div>
            );
          })}
          <div className="flex items-center justify-between pt-3 mt-1 border-t border-gray-100">
            <span className="text-xs font-bold text-gray-600">Total</span>
            <span className="text-sm font-extrabold text-gray-900 tabular-nums" style={{ fontFamily: 'sans-serif' }}>{naira(grand)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ExpensesPage() {
  const [expenses, setExpenses]     = useState(expensesData);
  const [search, setSearch]         = useState('');
  const [categoryFilter, setCategory] = useState('all');
  const [paymentFilter, setPayment] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const [modalOpen, setModalOpen]   = useState(false);
  const [editExpense, setEdit]      = useState(null);
  const [deleteModal, setDeleteModal] = useState({ open: false, expense: null });

  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = expenses.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const thisWeek = expenses.filter(e => (now - new Date(e.date)) / (1000 * 60 * 60 * 24) <= 7);
    const catTotals = {};
    thisMonth.forEach(e => { catTotals[e.category] = (catTotals[e.category] ?? 0) + e.amount; });
    const topId  = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0]?.[0];
    const topCat = expenseCategories.find(c => c.id === topId);
    return {
      thisMonth:  thisMonth.reduce((s, e) => s + e.amount, 0),
      thisWeek:   thisWeek.reduce((s, e) => s + e.amount, 0),
      total:      expenses.reduce((s, e) => s + e.amount, 0),
      topCat,
      topCatTotal: catTotals[topId] ?? 0,
    };
  }, [expenses]);

  const filtered = useMemo(() => {
    let r = [...expenses];
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(e => e.name.toLowerCase().includes(q) || e.vendor.toLowerCase().includes(q) || e.note?.toLowerCase().includes(q));
    }
    if (categoryFilter !== 'all') r = r.filter(e => e.category === categoryFilter);
    if (paymentFilter  !== 'All') r = r.filter(e => e.payment  === paymentFilter);
    return r.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [expenses, search, categoryFilter, paymentFilter]);

  const openAdd  = useCallback(()  => { setEdit(null); setModalOpen(true); }, []);
  const openEdit = useCallback((e) => { setEdit(e);    setModalOpen(true); }, []);
  const openDel  = useCallback((e) => setDeleteModal({ open: true, expense: e }), []);

  const handleSave = useCallback((saved) => {
    setExpenses(prev =>
      prev.some(e => e.id === saved.id)
        ? prev.map(e => e.id === saved.id ? saved : e)
        : [saved, ...prev]
    );
  }, []);

  const handleDelete = useCallback((id) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
  }, []);

  const hasFilters = search || categoryFilter !== 'all' || paymentFilter !== 'All';

  const headerActions = (
    <>
      <button className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all">
        <Download size={14} /><span className="hidden sm:inline">Export</span>
      </button>
      <button onClick={openAdd}
        className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-xl hover:bg-green-700 active:scale-95 transition-all shadow-sm">
        <Plus size={14} /><span className="hidden sm:inline">Add Expense</span>
      </button>
    </>
  );

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-gray-50 overflow-y-auto page-content">
      <TopBar title="Expenses" subtitle="Track your business spending" actions={headerActions} />

      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-5">

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
          <StatCard icon={Receipt}     iconBg="bg-red-100"    iconColor="text-red-500"    label="This Month"    value={naira(stats.thisMonth)}    sub="Current month"     subColor="text-red-500"    delay="0.05s" />
          <StatCard icon={Calendar}    iconBg="bg-amber-100"  iconColor="text-amber-600"  label="This Week"     value={naira(stats.thisWeek)}     sub="Last 7 days"       subColor="text-amber-600"  delay="0.10s" />
          <StatCard icon={Tag}         iconBg="bg-blue-100"   iconColor="text-blue-600"   label="Top Category"  value={stats.topCat?.label ?? '—'} sub={stats.topCat ? naira(stats.topCatTotal) + ' this month' : 'No data'} subColor="text-blue-600" delay="0.15s" />
          <StatCard icon={TrendingDown} iconBg="bg-purple-100" iconColor="text-purple-600" label="Total All Time" value={naira(stats.total)}        sub={`${expenses.length} transactions`} subColor="text-purple-600" delay="0.20s" />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-5">
          <div className="lg:col-span-3 bg-white rounded-2xl p-5 sm:p-6 border border-gray-100 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-1" style={{ fontFamily: 'sans-serif' }}>Monthly Trend</h3>
            <p className="text-xs text-gray-400 mb-5">6-month spend overview</p>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={expenseTrend}>
                <defs>
                  <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 500 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => `₦${(v/1000).toFixed(0)}K`} width={48} />
                <Tooltip content={<AreaTip />} />
                <Area type="monotone" dataKey="amount" stroke="#ef4444" strokeWidth={2.5} fill="url(#expGrad)" dot={{ fill: '#ef4444', r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="lg:col-span-2">
            <CategoryBreakdown expenses={expenses} />
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button onClick={() => setCategory('all')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all flex-shrink-0
              ${categoryFilter === 'all' ? 'bg-green-600 text-white shadow-sm' : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300'}`}>
            All
            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold
              ${categoryFilter === 'all' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
              {expenses.length}
            </span>
          </button>
          {expenseCategories.filter(cat => expenses.some(e => e.category === cat.id)).map(cat => {
            const Icon  = cat.Icon;
            const count = expenses.filter(e => e.category === cat.id).length;
            const isActive = categoryFilter === cat.id;
            return (
              <button key={cat.id} onClick={() => setCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all flex-shrink-0
                  ${isActive ? 'bg-green-600 text-white shadow-sm' : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300'}`}>
                {Icon && <Icon size={12} />}
                {cat.label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold
                  ${isActive ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Toolbar */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[180px] max-w-sm">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, vendor..."
                className="w-full pl-10 pr-9 py-2.5 text-sm bg-white border border-gray-200 rounded-xl outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all" />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"><X size={14} /></button>
              )}
            </div>
            <button onClick={() => setShowFilters(v => !v)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all
                ${showFilters || hasFilters ? 'bg-green-50 border-green-300 text-green-700' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}>
              <SlidersHorizontal size={14} /><span className="hidden sm:inline">Filter</span>
            </button>
            <span className="text-sm text-gray-400 font-medium ml-auto">
              <strong className="text-gray-700">{filtered.length}</strong><span className="hidden sm:inline"> expenses</span>
              {filtered.length > 0 && <span className="text-red-500 ml-1 font-bold">· {naira(filtered.reduce((s,e) => s + e.amount, 0))}</span>}
            </span>
          </div>
          {showFilters && (
            <div className="flex items-center gap-2 flex-wrap animate-fade-up">
              <div className="relative">
                <select value={paymentFilter} onChange={e => setPayment(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-2 text-sm bg-white border border-gray-200 rounded-xl outline-none font-medium text-gray-600 cursor-pointer focus:border-green-400 transition-all">
                  <option value="All">All Payments</option>
                  {expensePaymentMethods.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
              {hasFilters && (
                <button onClick={() => { setSearch(''); setCategory('all'); setPayment('All'); }}
                  className="flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:text-red-700 px-2 py-1 transition-colors">
                  <X size={12} /> Clear
                </button>
              )}
            </div>
          )}
        </div>

        {/* Expenses table */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm text-center animate-fade-up">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Receipt size={28} className="text-gray-400" />
            </div>
            <h3 className="text-base font-bold text-gray-700 mb-2" style={{ fontFamily: 'sans-serif' }}>No expenses found</h3>
            <p className="text-sm text-gray-400 mb-6 max-w-xs">
              {search ? `No results for "${search}".` : 'Start recording your business expenses.'}
            </p>
            <button onClick={openAdd}
              className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 active:scale-95 transition-all">
              <Plus size={15} /> Add Expense
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-fade-up">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead className="bg-gray-50/80 border-b border-gray-100">
                  <tr>
                    {['Expense', 'Category', 'Vendor', 'Amount', 'Payment', 'Date', 'Actions'].map(h => (
                      <th key={h} className="text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(expense => {
                    const cat  = expenseCategories.find(c => c.id === expense.category);
                    const Icon = cat?.Icon;
                    return (
                      <tr key={expense.id} className="border-b border-gray-50 last:border-0 hover:bg-red-50/10 transition-colors group">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                              style={{ background: cat?.bg ?? '#f3f4f6' }}>
                              {Icon && <Icon size={16} style={{ color: cat?.color ?? '#6b7280' }} />}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-800">{expense.name}</p>
                              {expense.note && (
                                <p className="text-[11px] text-gray-400 truncate max-w-[180px]">{expense.note}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg"
                            style={{ background: cat?.bg ?? '#f3f4f6', color: cat?.color ?? '#6b7280' }}>
                            {cat?.label ?? 'Other'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="text-sm text-gray-600 font-medium">{expense.vendor}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="text-sm font-extrabold text-red-500 tabular-nums">
                            ₦{expense.amount.toLocaleString()}
                          </p>
                        </td>
                        <td className="px-4 py-3.5">
                          <PaymentBadge method={expense.payment} />
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="text-xs text-gray-500 font-medium whitespace-nowrap">{fmtDate(expense.date)}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5 opacity-50 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openEdit(expense)}
                              className="w-7 h-7 flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 text-gray-400 transition-all" title="Edit">
                              <Edit2 size={12} />
                            </button>
                            <button onClick={() => openDel(expense)}
                              className="w-7 h-7 flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-red-50 hover:border-red-200 hover:text-red-500 text-gray-400 transition-all" title="Delete">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {filtered.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400">
            <span>Showing <strong className="text-gray-700">{filtered.length}</strong> of {expenses.length} expenses</span>
            <span className="hidden sm:block">Filtered total: <strong className="text-red-500">₦{filtered.reduce((s,e) => s + e.amount, 0).toLocaleString()}</strong></span>
          </div>
        )}
      </main>

      <ExpenseModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onSave={handleSave} editExpense={editExpense} />
      <ExpenseDeleteModal isOpen={deleteModal.open} expense={deleteModal.expense} onClose={() => setDeleteModal({ open: false, expense: null })} onConfirm={handleDelete} />
    </div>
  );
}