// src/pages/VendorsPage.jsx
import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Plus, Upload, Search, ChevronDown, Edit2, Trash2,
  Eye, Phone, MapPin, Truck, Package, TrendingUp,
  Clock, AlertCircle, X, SlidersHorizontal,
  ShoppingCart, Star, AlertTriangle,
} from 'lucide-react';
import TopBar            from '../components/layout/TopBar';
import VendorModal       from '../components/vendors/VendorModal';
import VendorDrawer      from '../components/vendors/VendorDrawer';
import VendorDeleteModal from '../components/vendors/VendorDeleteModal';
import PlaceOrderModal   from '../components/vendors/PlaceOrderModal';
import { vendorsService } from '../services';
import { useBusiness } from '../context/useBusiness';
import { LoadingState, ErrorState } from '../components/common/ResourceState';
import { vendorCategories as staticCategories, vendorStatuses as staticStatuses } from '../data/mockData';

const naira = (v) => {
  if (v >= 1000000) return `₦${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000)    return `₦${(v / 1000).toFixed(0)}K`;
  return `₦${v}`;
};

function MiniStars({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(s => (
        <Star key={s} size={11}
          className={s <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'} />
      ))}
    </div>
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
          {sub && <p className="text-[11px] text-gray-400 font-medium mt-0.5">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

function VendorCard({ vendor, onView, onEdit, onDelete, onPlaceOrder }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 p-4 sm:p-5 group animate-fade-up">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-base font-extrabold flex-shrink-0"
            style={{ background: vendor.color, color: vendor.textColor }}>
            {vendor.initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate leading-tight">{vendor.name}</p>
            <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-md">
              {vendor.category}
            </span>
          </div>
        </div>
        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold capitalize flex-shrink-0
          ${vendor.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          {vendor.status}
        </span>
      </div>

      <MiniStars rating={vendor.rating} />

      <div className="space-y-1.5 mt-3 mb-3">
        <p className="text-xs text-gray-600 font-medium">{vendor.contactPerson}</p>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Phone size={11} className="text-gray-400 flex-shrink-0" /> {vendor.phone}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <MapPin size={11} className="text-gray-400 flex-shrink-0" /> {vendor.location}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Clock size={11} className="text-gray-400 flex-shrink-0" />
          Lead time: <strong className="text-gray-700">{vendor.leadTimeDays}d</strong>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {vendor.itemsSupplied?.slice(0, 3).map(item => (
          <span key={item} className="bg-gray-100 text-gray-600 text-[10px] font-semibold px-2 py-1 rounded-md flex items-center gap-1">
            <Package size={9} /> {item}
          </span>
        ))}
        {vendor.itemsSupplied?.length > 3 && (
          <span className="bg-gray-100 text-gray-400 text-[10px] font-semibold px-2 py-1 rounded-md">
            +{vendor.itemsSupplied.length - 3}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-gray-50 rounded-xl p-2.5 text-center">
          <p className="text-sm font-extrabold text-gray-900 tabular-nums">{naira(vendor.totalPaid)}</p>
          <p className="text-[10px] text-gray-400 font-medium">Total Paid</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-2.5 text-center">
          <p className="text-sm font-extrabold text-gray-900">{vendor.totalOrders}</p>
          <p className="text-[10px] text-gray-400 font-medium">Orders</p>
        </div>
      </div>

      {vendor.pendingAmount > 0 && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-3">
          <AlertCircle size={12} className="text-amber-500 flex-shrink-0" />
          <span className="text-xs text-amber-700 font-semibold">{naira(vendor.pendingAmount)} pending</span>
        </div>
      )}

      <div className="flex gap-2 pt-3 border-t border-gray-100">
        <button onClick={() => onPlaceOrder(vendor)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-xl transition-all active:scale-95">
          <ShoppingCart size={12} /> Order
        </button>
        <button onClick={() => onView(vendor)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-gray-600 bg-gray-50 hover:bg-blue-50 hover:text-blue-700 rounded-xl transition-all">
          <Eye size={12} /> View
        </button>
        <button onClick={() => onEdit(vendor)}
          className="w-8 flex items-center justify-center py-2 text-gray-400 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all">
          <Edit2 size={12} />
        </button>
        <button onClick={() => onDelete(vendor)}
          className="w-8 flex items-center justify-center py-2 text-gray-400 bg-gray-50 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all">
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

export default function VendorsPage() {
  const { activeBusinessId, isDemoMode } = useBusiness();
  const [vendors, setVendors]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [search, setSearch]         = useState('');
  const [categoryFilter, setCategory] = useState('All');
  const [statusFilter, setStatus]   = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const [modalOpen, setModalOpen]   = useState(false);
  const [editVendor, setEdit]       = useState(null);
  const [drawer, setDrawer]         = useState(null);
  const [deleteModal, setDeleteModal] = useState({ open: false, vendor: null });
  const [orderModal, setOrderModal] = useState({ open: false, vendor: null });

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: svcErr } = await vendorsService.list({
        businessId: activeBusinessId,
      });
      if (svcErr) {
        setError(svcErr);
        setVendors([]);
      } else {
        setVendors(data ?? []);
      }
    } catch (e) {
      setError({ code: 'CAUGHT', message: e?.message ?? 'Unknown error' });
      setVendors([]);
    } finally {
      setLoading(false);
    }
  }, [activeBusinessId]);

  useEffect(() => { fetchVendors(); }, [fetchVendors]);

  const stats = useMemo(() => ({
    total:     vendors.length,
    active:    vendors.filter(v => v.status === 'active').length,
    totalPaid: vendors.reduce((s, v) => s + v.totalPaid, 0),
    pending:   vendors.filter(v => v.orders?.some(o => o.status === 'pending')).length,
  }), [vendors]);

  const filtered = useMemo(() => {
    let r = [...vendors];
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(v =>
        v.name.toLowerCase().includes(q) ||
        v.contactPerson.toLowerCase().includes(q) ||
        v.location.toLowerCase().includes(q) ||
        v.itemsSupplied?.some(i => i.toLowerCase().includes(q))
      );
    }
    if (categoryFilter !== 'All') r = r.filter(v => v.category === categoryFilter);
    if (statusFilter   !== 'All') r = r.filter(v => v.status   === statusFilter.toLowerCase());
    return r.sort((a, b) => b.totalPaid - a.totalPaid);
  }, [vendors, search, categoryFilter, statusFilter]);

  const openAdd      = useCallback(()  => { setEdit(null); setModalOpen(true); }, []);
  const openEdit     = useCallback((v) => { setEdit(v);    setModalOpen(true); setDrawer(null); }, []);
  const openView     = useCallback((v) => setDrawer(v), []);
  const openDel      = useCallback((v) => setDeleteModal({ open: true, vendor: v }), []);
  const openOrder    = useCallback((v) => { setOrderModal({ open: true, vendor: v }); setDrawer(null); }, []);

  const handleSave = useCallback(async (saved) => {
    const isExisting = vendors.some(v => String(v.id) === String(saved.id));
    const payload = { ...saved, businessId: activeBusinessId };
    const { data: persisted, error: svcErr } = isExisting
      ? await vendorsService.update(saved.id, payload)
      : await vendorsService.create(payload);
    if (svcErr) {
      console.error('[VendorsPage] save failed:', svcErr);
      return;
    }
    setVendors(prev =>
      prev.some(v => String(v.id) === String(persisted.id))
        ? prev.map(v => String(v.id) === String(persisted.id) ? persisted : v)
        : [persisted, ...prev]
    );
  }, [vendors, activeBusinessId]);

  const handleDelete = useCallback(async (id) => {
    const { error: svcErr } = await vendorsService.remove(id);
    if (svcErr) {
      console.error('[VendorsPage] delete failed:', svcErr);
      return;
    }
    setVendors(prev => prev.filter(v => String(v.id) !== String(id)));
    if (drawer?.id === id) setDrawer(null);
  }, [drawer]);

  const handlePlaceOrder = useCallback(async (vendorId, newOrder, total) => {
    const { error: svcErr } = await vendorsService.placeOrder(vendorId, newOrder, total);
    if (svcErr) {
      console.error('[VendorsPage] placeOrder failed:', svcErr);
      // Do NOT update local state — the server didn't persist.
      return;
    }
    setVendors(prev => prev.map(v => {
      if (String(v.id) !== String(vendorId)) return v;
      return { ...v, totalOrders: v.totalOrders + 1, pendingAmount: v.pendingAmount + total, lastOrder: newOrder.date, orders: [newOrder, ...(v.orders ?? [])] };
    }));
  }, []);

  // Receive a purchase order — calls vendorsService.receivePurchaseOrder.
  // In demo mode: mock service marks the PO as delivered.
  // In Supabase mode: calls the sw_receive_purchase_order RPC (see
  // docs/BACKEND_HANDOVER.md).
  // On success, updates the vendor's orders in local state.
  const handleReceive = useCallback(async (poId) => {
    const { error: svcErr } = await vendorsService.receivePurchaseOrder(poId);
    if (svcErr) {
      console.error('[VendorsPage] receive PO failed:', svcErr);
      alert(`Could not receive purchase order: ${svcErr.message}`);
      return;
    }
    // Update the vendor's orders in local state.
    setVendors(prev => prev.map(v => {
      const poIdx = (v.orders ?? []).findIndex(o => o.id === poId);
      if (poIdx < 0) return v;
      const newOrders = [...v.orders];
      newOrders[poIdx] = { ...newOrders[poIdx], status: 'delivered' };
      return { ...v, orders: newOrders, totalPaid: v.totalPaid + newOrders[poIdx].total, pendingAmount: Math.max(0, v.pendingAmount - newOrders[poIdx].total) };
    }));
    // Also refresh the full vendor list to get updated PO statuses.
    fetchVendors();
  }, [fetchVendors]);

  const headerActions = (
    <>
      <button disabled title="Coming soon" className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-semibold text-gray-400 bg-gray-50 border border-gray-200 rounded-xl cursor-not-allowed">
        <Upload size={14} /><span className="hidden sm:inline">Import</span>
      </button>
      <button onClick={openAdd}
        className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-xl hover:bg-green-700 active:scale-95 transition-all shadow-sm">
        <Plus size={14} /><span className="hidden sm:inline">Add Vendor</span>
      </button>
    </>
  );

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-gray-50 overflow-y-auto page-content">
      <TopBar title="Vendors" subtitle={`${vendors.length} suppliers · ${naira(stats.totalPaid)} total purchases`} actions={headerActions} />

      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-5">
        {isDemoMode && (
          <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 text-xs text-blue-800">
            Demo mode — changes are in-memory only. Configure Supabase to persist.
          </div>
        )}

        {loading && <LoadingState label="Loading vendors…" />}

        {!loading && error && (
          <ErrorState error={error} onRetry={fetchVendors} />
        )}

        {!loading && !error && (
          <>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
          <StatCard icon={Truck}      iconBg="bg-blue-100"   iconColor="text-blue-600"   label="Total Vendors"    value={stats.total}            sub={`${stats.active} active`} delay="0.05s" />
          <StatCard icon={Package}    iconBg="bg-green-100"  iconColor="text-green-600"  label="Active Suppliers" value={stats.active}           sub="Currently active" delay="0.10s" />
          <StatCard icon={TrendingUp} iconBg="bg-purple-100" iconColor="text-purple-600" label="Total Purchases"  value={naira(stats.totalPaid)} sub="All time spend" delay="0.15s" />
          <StatCard icon={Clock}      iconBg="bg-amber-100"  iconColor="text-amber-600"  label="Pending Orders"   value={stats.pending}          sub="Awaiting delivery" delay="0.20s" />
        </div>

        {vendors.some(v => v.pendingAmount > 0) && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 animate-fade-up">
            <div className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={14} className="text-amber-600" />
            </div>
            <p className="text-sm text-amber-800 font-medium flex-1">
              <strong>{vendors.filter(v => v.pendingAmount > 0).length} vendor{vendors.filter(v => v.pendingAmount > 0).length > 1 ? 's' : ''}</strong> have outstanding payment balances. Total: <strong>{naira(vendors.reduce((s, v) => s + v.pendingAmount, 0))}</strong>
            </p>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[180px] max-w-sm">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search vendor, items, location..."
                className="w-full pl-10 pr-9 py-2.5 text-sm bg-white border border-gray-200 rounded-xl outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all" />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"><X size={14} /></button>
              )}
            </div>
            <button onClick={() => setShowFilters(v => !v)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all
                ${showFilters ? 'bg-green-50 border-green-300 text-green-700' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}>
              <SlidersHorizontal size={14} /><span className="hidden sm:inline">Filter</span>
            </button>
            <span className="text-sm text-gray-400 font-medium ml-auto">
              <strong className="text-gray-700">{filtered.length}</strong><span className="hidden sm:inline"> vendors</span>
            </span>
          </div>
          {showFilters && (
            <div className="flex items-center gap-2 flex-wrap animate-fade-up">
              <div className="relative">
                <select value={categoryFilter} onChange={e => setCategory(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-2 text-sm bg-white border border-gray-200 rounded-xl outline-none font-medium text-gray-600 cursor-pointer focus:border-green-400 transition-all">
                  {staticCategories.map(c => <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
              <div className="relative">
                <select value={statusFilter} onChange={e => setStatus(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-2 text-sm bg-white border border-gray-200 rounded-xl outline-none font-medium text-gray-600 cursor-pointer focus:border-green-400 transition-all">
                  {staticStatuses.map(s => <option key={s} value={s}>{s === 'All' ? 'All Status' : s}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
              {(categoryFilter !== 'All' || statusFilter !== 'All' || search) && (
                <button onClick={() => { setSearch(''); setCategory('All'); setStatus('All'); }}
                  className="flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:text-red-700 px-2 py-1 transition-colors">
                  <X size={12} /> Clear
                </button>
              )}
            </div>
          )}
        </div>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm text-center animate-fade-up">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Truck size={28} className="text-gray-400" />
            </div>
            <h3 className="text-base font-bold text-gray-700 mb-2">No vendors found</h3>
            <p className="text-sm text-gray-400 mb-6 max-w-xs">
              {search ? `No results for "${search}".` : 'Add your first supplier to get started.'}
            </p>
            <button onClick={openAdd}
              className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 active:scale-95 transition-all">
              <Plus size={15} /> Add Vendor
            </button>
          </div>
        )}

        {filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
            {filtered.map(v => (
              <VendorCard key={v.id} vendor={v} onView={openView} onEdit={openEdit} onDelete={openDel} onPlaceOrder={openOrder} />
            ))}
            <button onClick={openAdd}
              className="border-2 border-dashed border-gray-200 rounded-2xl p-5 flex flex-col items-center justify-center gap-3 text-gray-400 hover:border-green-300 hover:text-green-600 hover:bg-green-50/50 transition-all min-h-[200px] group">
              <div className="w-11 h-11 rounded-xl bg-gray-100 group-hover:bg-green-100 flex items-center justify-center transition-all">
                <Plus size={20} />
              </div>
              <p className="text-sm font-bold">Add Vendor</p>
            </button>
          </div>
        )}

        {filtered.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400">
            <span>Showing <strong className="text-gray-700">{filtered.length}</strong> of {vendors.length} vendors</span>
            <span className="hidden sm:block">Combined spend: <strong className="text-green-600">{naira(filtered.reduce((s, v) => s + v.totalPaid, 0))}</strong></span>
          </div>
        )}
                </>
        )}
      </main>

      <VendorModal key={editVendor?.id ?? 'new'} isOpen={modalOpen} onClose={() => setModalOpen(false)} onSave={handleSave} editVendor={editVendor} />
      <VendorDrawer vendor={drawer} onClose={() => setDrawer(null)} onEdit={() => openEdit(drawer)} onPlaceOrder={() => openOrder(drawer)} onReceive={handleReceive} />
      <VendorDeleteModal isOpen={deleteModal.open} vendor={deleteModal.vendor} onClose={() => setDeleteModal({ open: false, vendor: null })} onConfirm={handleDelete} />
      <PlaceOrderModal isOpen={orderModal.open} vendor={orderModal.vendor} onClose={() => setOrderModal({ open: false, vendor: null })} onSave={handlePlaceOrder} />
    </div>
  );
}