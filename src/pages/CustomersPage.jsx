// src/pages/CustomersPage.jsx
import { useState, useMemo, useCallback } from 'react';
import {
  Plus, Upload, Search, ChevronDown, Edit2, Trash2,
  Eye, Phone, Mail, MapPin, Users, TrendingUp,
  UserCheck, UserPlus, AlertCircle, X, LayoutGrid,
  List, SlidersHorizontal,
} from 'lucide-react';
import TopBar              from '../components/layout/TopBar';
import CustomerModal       from '../components/customers/CustomerModal';
import CustomerDrawer      from '../components/customers/CustomerDrawer';
import CustomerDeleteModal from '../components/customers/CustomerDeleteModal';
import { customersData, customerTypes, customerStatuses } from '../data/mockData';

const naira = (v) => {
  if (v >= 1000000) return `₦${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000)    return `₦${(v / 1000).toFixed(0)}K`;
  return `₦${v}`;
};

const fmtDate = (iso) => iso
  ? new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
  : '—';

const statusCfg = {
  active:   { cls: 'bg-green-100 text-green-700' },
  new:      { cls: 'bg-blue-100  text-blue-700'  },
  owing:    { cls: 'bg-amber-100 text-amber-700' },
  inactive: { cls: 'bg-gray-100  text-gray-500'  },
};

function StatusBadge({ status }) {
  const cfg = statusCfg[status] ?? statusCfg.inactive;
  return (
    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold capitalize ${cfg.cls}`}>
      {status}
    </span>
  );
}

function StatCard({ icon: Icon, iconBg, iconColor, label, value, sub, delay }) {
  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 animate-fade-up"
      style={{ animationDelay: delay }}>
      <div className="flex items-center gap-3 sm:gap-4">
        <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          <Icon size={19} className={iconColor} />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-0.5 truncate">{label}</p>
          <p className="text-xl sm:text-2xl font-extrabold text-gray-900 leading-none truncate">{value}</p>
          {sub && <p className="text-[11px] text-gray-400 font-medium mt-0.5 truncate">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

function CustomerCard({ customer, onView, onEdit, onDelete }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 p-4 sm:p-5 group animate-fade-up">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-base font-extrabold flex-shrink-0"
            style={{ background: customer.color, color: customer.textColor }}>
            {customer.initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">
              {customer.firstName} {customer.lastName}
            </p>
            <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-md">
              {customer.type}
            </span>
          </div>
        </div>
        <StatusBadge status={customer.status} />
      </div>

      <div className="space-y-1.5 mb-3">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Phone size={11} className="text-gray-400 flex-shrink-0" />
          <span className="truncate">{customer.phone}</span>
        </div>
        {customer.email && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Mail size={11} className="text-gray-400 flex-shrink-0" />
            <span className="truncate">{customer.email}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <MapPin size={11} className="text-gray-400 flex-shrink-0" />
          <span className="truncate">{customer.location}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-gray-50 rounded-xl p-2.5 text-center">
          <p className="text-sm font-extrabold text-gray-900 tabular-nums">
            {naira(customer.totalSpent)}
          </p>
          <p className="text-[10px] text-gray-400 font-medium">Spent</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-2.5 text-center">
          <p className="text-sm font-extrabold text-gray-900">
            {customer.totalOrders}
          </p>
          <p className="text-[10px] text-gray-400 font-medium">Orders</p>
        </div>
      </div>

      <p className="text-[10px] text-gray-400 mb-3">
        Last order: <span className="font-semibold text-gray-600">{fmtDate(customer.lastOrder)}</span>
      </p>

      <div className="flex gap-2 pt-3 border-t border-gray-100">
        <button onClick={() => onView(customer)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-gray-600 bg-gray-50 hover:bg-green-50 hover:text-green-700 rounded-xl transition-all">
          <Eye size={12} /> View
        </button>
        <button onClick={() => onEdit(customer)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-gray-600 bg-gray-50 hover:bg-blue-50 hover:text-blue-700 rounded-xl transition-all">
          <Edit2 size={12} /> Edit
        </button>
        <button onClick={() => onDelete(customer)}
          className="w-8 flex items-center justify-center py-2 text-gray-400 bg-gray-50 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all">
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

export default function CustomersPage() {
  const [customers, setCustomers]   = useState(customersData);
  const [search, setSearch]         = useState('');
  const [typeFilter, setType]       = useState('All');
  const [statusFilter, setStatus]   = useState('All');
  const [viewMode, setViewMode]     = useState('grid');
  const [modalOpen, setModalOpen]   = useState(false);
  const [editCustomer, setEdit]     = useState(null);
  const [drawer, setDrawer]         = useState(null);
  const [deleteModal, setDeleteModal] = useState({ open: false, customer: null });
  const [showFilters, setShowFilters] = useState(false);

  const stats = useMemo(() => {
    const thisMonth = new Date(); thisMonth.setDate(1);
    return {
      total:    customers.length,
      active:   customers.filter(c => c.status === 'active').length,
      newMonth: customers.filter(c => new Date(c.joinDate) >= thisMonth).length,
      revenue:  customers.reduce((s, c) => s + c.totalSpent, 0),
    };
  }, [customers]);

  const filtered = useMemo(() => {
    let r = [...customers];
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(c =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.location.toLowerCase().includes(q)
      );
    }
    if (typeFilter   !== 'All') r = r.filter(c => c.type   === typeFilter);
    if (statusFilter !== 'All') r = r.filter(c => c.status === statusFilter.toLowerCase());
    return r.sort((a, b) => new Date(b.joinDate) - new Date(a.joinDate));
  }, [customers, search, typeFilter, statusFilter]);

  const openAdd   = useCallback(()  => { setEdit(null); setModalOpen(true); }, []);
  const openEdit  = useCallback((c) => { setEdit(c);    setModalOpen(true); setDrawer(null); }, []);
  const openView  = useCallback((c) => setDrawer(c), []);
  const openDel   = useCallback((c) => setDeleteModal({ open: true, customer: c }), []);

  const handleSave = useCallback((saved) => {
    setCustomers(prev =>
      prev.some(c => c.id === saved.id)
        ? prev.map(c => c.id === saved.id ? saved : c)
        : [...prev, saved]
    );
  }, []);

  const handleDelete = useCallback((id) => {
    setCustomers(prev => prev.filter(c => c.id !== id));
    if (drawer?.id === id) setDrawer(null);
  }, [drawer]);

  const headerActions = (
    <>
      <button className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all">
        <Upload size={14} />
        <span className="hidden sm:inline">Import</span>
      </button>
      <button onClick={openAdd}
        className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-xl hover:bg-green-700 active:scale-95 transition-all shadow-sm">
        <Plus size={14} />
        <span className="hidden sm:inline">Add Customer</span>
      </button>
    </>
  );

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-gray-50 overflow-y-auto page-content">
      <TopBar title="Customers"
        subtitle={`${customers.length} customers · ${naira(stats.revenue)} lifetime value`}
        actions={headerActions} />

      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-5">

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
          <StatCard icon={Users}      iconBg="bg-blue-100"   iconColor="text-blue-600"   label="Total"       value={stats.total}          sub={`${filtered.length} shown`} delay="0.05s" />
          <StatCard icon={UserCheck}  iconBg="bg-green-100"  iconColor="text-green-600"  label="Active"      value={stats.active}         sub="Currently active" delay="0.10s" />
          <StatCard icon={UserPlus}   iconBg="bg-purple-100" iconColor="text-purple-600" label="New Month"   value={stats.newMonth}       sub="Joined this month" delay="0.15s" />
          <StatCard icon={TrendingUp} iconBg="bg-amber-100"  iconColor="text-amber-600"  label="Revenue"     value={naira(stats.revenue)} sub="All time" delay="0.20s" />
        </div>

        {customers.some(c => c.status === 'owing') && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 animate-fade-up">
            <div className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <AlertCircle size={14} className="text-amber-600" />
            </div>
            <p className="text-sm text-amber-800 font-medium flex-1">
              <strong>{customers.filter(c => c.status === 'owing').length}</strong> customer{customers.filter(c => c.status === 'owing').length > 1 ? 's have' : ' has'} outstanding balances.
            </p>
            <button onClick={() => setStatus('Owing')}
              className="text-xs font-bold text-amber-700 hover:text-amber-900 transition-colors flex-shrink-0">
              View →
            </button>
          </div>
        )}

        {/* Toolbar */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[180px] max-w-sm">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search customers..."
                className="w-full pl-10 pr-9 py-2.5 text-sm bg-white border border-gray-200 rounded-xl outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all" />
              {search && (
                <button onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                  <X size={14} />
                </button>
              )}
            </div>
            <button onClick={() => setShowFilters(v => !v)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all
                ${showFilters ? 'bg-green-50 border-green-300 text-green-700' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}>
              <SlidersHorizontal size={14} />
              <span className="hidden sm:inline">Filter</span>
            </button>
            <span className="text-sm text-gray-400 font-medium ml-auto">
              <strong className="text-gray-700">{filtered.length}</strong>
              <span className="hidden sm:inline"> customers</span>
            </span>
            <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1">
              <button onClick={() => setViewMode('grid')}
                className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all
                  ${viewMode === 'grid' ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-gray-600'}`}>
                <LayoutGrid size={14} />
              </button>
              <button onClick={() => setViewMode('list')}
                className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all
                  ${viewMode === 'list' ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-gray-600'}`}>
                <List size={14} />
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="flex items-center gap-2 flex-wrap animate-fade-up">
              <div className="relative">
                <select value={typeFilter} onChange={e => setType(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-2 text-sm bg-white border border-gray-200 rounded-xl outline-none font-medium text-gray-600 cursor-pointer focus:border-green-400 transition-all">
                  {customerTypes.map(t => <option key={t} value={t}>{t === 'All' ? 'All Types' : t}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
              <div className="relative">
                <select value={statusFilter} onChange={e => setStatus(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-2 text-sm bg-white border border-gray-200 rounded-xl outline-none font-medium text-gray-600 cursor-pointer focus:border-green-400 transition-all">
                  {customerStatuses.map(s => <option key={s} value={s}>{s === 'All' ? 'All Status' : s}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
              {(typeFilter !== 'All' || statusFilter !== 'All' || search) && (
                <button onClick={() => { setSearch(''); setType('All'); setStatus('All'); }}
                  className="flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:text-red-700 px-2 py-1 transition-colors">
                  <X size={12} /> Clear
                </button>
              )}
            </div>
          )}
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm text-center animate-fade-up">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users size={28} className="text-gray-400" />
            </div>
            <h3 className="text-base font-bold text-gray-700 mb-2">
              No customers found
            </h3>
            <p className="text-sm text-gray-400 mb-6 max-w-xs">
              {search ? `No results for "${search}".` : 'Add your first customer to get started.'}
            </p>
            <button onClick={openAdd}
              className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 active:scale-95 transition-all">
              <Plus size={15} /> Add Customer
            </button>
          </div>
        )}

        {/* Grid view */}
        {filtered.length > 0 && viewMode === 'grid' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
            {filtered.map(c => (
              <CustomerCard key={c.id} customer={c} onView={openView} onEdit={openEdit} onDelete={openDel} />
            ))}
            <button onClick={openAdd}
              className="border-2 border-dashed border-gray-200 rounded-2xl p-5 flex flex-col items-center justify-center gap-3 text-gray-400 hover:border-green-300 hover:text-green-600 hover:bg-green-50/50 transition-all min-h-[180px] group">
              <div className="w-11 h-11 rounded-xl bg-gray-100 group-hover:bg-green-100 flex items-center justify-center transition-all">
                <Plus size={20} />
              </div>
              <p className="text-sm font-bold">Add Customer</p>
            </button>
          </div>
        )}

        {/* List view */}
        {filtered.length > 0 && viewMode === 'list' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-fade-up">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead className="bg-gray-50/80 border-b border-gray-100">
                  <tr>
                    {['Customer', 'Type', 'Contact', 'Location', 'Spent', 'Orders', 'Status', 'Actions'].map(h => (
                      <th key={h} className="text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => (
                    <tr key={c.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors group">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
                            style={{ background: c.color, color: c.textColor }}>
                            {c.initials}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-800">{c.firstName} {c.lastName}</p>
                            <p className="text-[10px] text-gray-400">Since {fmtDate(c.joinDate)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md">{c.type}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-xs font-medium text-gray-700">{c.phone}</p>
                        {c.email && <p className="text-[10px] text-gray-400 truncate max-w-[140px]">{c.email}</p>}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <MapPin size={11} className="text-gray-400" /> {c.location}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-sm font-extrabold text-green-600 tabular-nums">{naira(c.totalSpent)}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-sm font-bold text-gray-800">{c.totalOrders}</span>
                      </td>
                      <td className="px-4 py-3.5"><StatusBadge status={c.status} /></td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 opacity-50 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openView(c)} className="w-7 h-7 flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-green-50 hover:border-green-200 hover:text-green-600 text-gray-400 transition-all"><Eye size={12} /></button>
                          <button onClick={() => openEdit(c)} className="w-7 h-7 flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 text-gray-400 transition-all"><Edit2 size={12} /></button>
                          <button onClick={() => openDel(c)} className="w-7 h-7 flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-red-50 hover:border-red-200 hover:text-red-500 text-gray-400 transition-all"><Trash2 size={12} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {filtered.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400">
            <span>Showing <strong className="text-gray-700">{filtered.length}</strong> of {customers.length} customers</span>
            <span className="hidden sm:block">Combined revenue: <strong className="text-green-600">{naira(filtered.reduce((s, c) => s + c.totalSpent, 0))}</strong></span>
          </div>
        )}
      </main>

      <CustomerModal key={editCustomer?.id ?? 'new'} isOpen={modalOpen} onClose={() => setModalOpen(false)} onSave={handleSave} editCustomer={editCustomer} />
      <CustomerDrawer customer={drawer} onClose={() => setDrawer(null)} onEdit={() => openEdit(drawer)} />
      <CustomerDeleteModal isOpen={deleteModal.open} customer={deleteModal.customer} onClose={() => setDeleteModal({ open: false, customer: null })} onConfirm={handleDelete} />
    </div>
  );
}