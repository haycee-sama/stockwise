// src/pages/InventoryPage.jsx
import { useState, useMemo, useCallback } from 'react';
import {
  Search, Upload, Plus, Edit2, Trash2,
  ArrowUpDown, ChevronDown, Download,
  Package, CheckCircle, AlertTriangle,
  XCircle, Gem, LayoutList, LayoutGrid,
  SlidersHorizontal, X,
} from 'lucide-react';
import TopBar     from '../components/layout/TopBar';
import ItemModal  from '../components/inventory/ItemModal';
import DeleteModal from '../components/inventory/DeleteModal';
import { ItemIcon } from '../utils/inventoryIcons';
import { inventoryItems as initialItems, categories } from '../data/mockData';

// ── Helpers ──────────────────────────────────────
const naira = (v) => `₦${Number(v).toLocaleString()}`;

function getStatus(item) {
  if (item.stock === 0)             return 'out';
  if (item.stock <= item.threshold) return 'low';
  return 'ok';
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-NG', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

// ── Status Badge ──────────────────────────────────
function StatusBadge({ status }) {
  const cfg = {
    ok:  { label: 'In Stock',     cls: 'bg-green-50 text-green-700', dot: 'bg-green-500'  },
    low: { label: 'Low Stock',    cls: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500'  },
    out: { label: 'Out of Stock', cls: 'bg-red-50   text-red-600',   dot: 'bg-red-500'    },
  };
  const { label, cls, dot } = cfg[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold ${cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
      {label}
    </span>
  );
}

// ── Margin Badge ──────────────────────────────────
function MarginBadge({ cost, sell }) {
  const margin = sell > 0 ? Math.round(((sell - cost) / sell) * 100) : 0;
  const cls = margin >= 30 ? 'bg-green-50 text-green-700'
            : margin >= 15 ? 'bg-blue-50 text-blue-700'
            :                'bg-gray-100 text-gray-500';
  return (
    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${cls}`}>
      {margin}%
    </span>
  );
}

// ── Mini Stat Card ────────────────────────────────
function MiniStat({ icon: Icon, iconBg, iconColor, label, value, animDelay }) {
  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 animate-fade-up"
      style={{ animationDelay: animDelay }}>
      <div className="flex items-center gap-3 sm:gap-4">
        <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          <Icon size={19} className={iconColor} />
        </div>
        <div className="min-w-0">
          <p className="text-xl sm:text-2xl font-extrabold text-gray-900 leading-none truncate">
            {value}
          </p>
          <p className="text-[11px] text-gray-400 font-medium mt-0.5 truncate">{label}</p>
        </div>
      </div>
    </div>
  );
}

// ── Mobile item card ──────────────────────────────
function ItemCard({ item, onEdit, onDelete, selected, onSelect }) {
  const status = getStatus(item);
  return (
    <div className={`bg-white rounded-2xl border p-4 transition-all animate-fade-up
      ${selected ? 'border-green-400 ring-2 ring-green-100' : 'border-gray-100 shadow-sm'}`}>
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <button onClick={() => onSelect(item.id)}
          className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all
            ${selected ? 'bg-green-600 border-green-600' : 'border-gray-300'}`}>
          {selected && <CheckCircle size={12} className="text-white" />}
        </button>

        {/* Icon */}
        <ItemIcon iconName={item.iconName} bg={item.bg} size={18} className="w-10 h-10" />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">{item.name}</p>
              <p className="text-[11px] text-gray-400 font-mono">{item.sku}</p>
            </div>
            <StatusBadge status={status} />
          </div>

          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
              {item.category}
            </span>
            <MarginBadge cost={item.costPrice} sell={item.sellingPrice} />
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-3">
              <div>
                <p className="text-[10px] text-gray-400">Stock</p>
                <p className={`text-sm font-bold
                  ${status === 'out' ? 'text-red-600' : status === 'low' ? 'text-amber-600' : 'text-gray-900'}`}>
                  {item.stock}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400">Cost</p>
                <p className="text-sm font-bold text-gray-600">{naira(item.costPrice)}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400">Selling</p>
                <p className="text-sm font-bold text-green-600">{naira(item.sellingPrice)}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => onEdit(item)}
                className="w-8 h-8 flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 text-gray-400 transition-all">
                <Edit2 size={13} />
              </button>
              <button onClick={() => onDelete(item)}
                className="w-8 h-8 flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-red-50 hover:border-red-200 hover:text-red-500 text-gray-400 transition-all">
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sortable Table Header ─────────────────────────
function SortTh({ col, label, sortBy, sortDir, onSort }) {
  const active = sortBy === col;
  return (
    <th onClick={() => onSort(col)}
      className="text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 px-4 py-3 cursor-pointer select-none hover:text-gray-600 transition-colors whitespace-nowrap">
      <span className="flex items-center gap-1">
        {label}
        <ArrowUpDown size={10} className={active ? 'text-green-500' : 'text-gray-300'} />
      </span>
    </th>
  );
}

// ── Main Page ─────────────────────────────────────
export default function InventoryPage() {
  const [items, setItems]           = useState(initialItems);
  const [search, setSearch]         = useState('');
  const [activeCategory, setCategory] = useState('All');
  const [statusFilter, setStatus]   = useState('All');
  const [sortBy, setSortBy]         = useState('name');
  const [sortDir, setSortDir]       = useState('asc');
  const [viewMode, setViewMode]     = useState('table'); // 'table' | 'cards'
  const [modalOpen, setModalOpen]   = useState(false);
  const [editItem, setEditItem]     = useState(null);
  const [deleteModal, setDeleteModal] = useState({ open: false, item: null });
  const [selected, setSelected]     = useState(new Set());
  const [showFilters, setShowFilters] = useState(false);

  // ── Stats ─────────────────────────────────────
  const stats = useMemo(() => ({
    inStock:    items.filter(i => getStatus(i) === 'ok').length,
    lowStock:   items.filter(i => getStatus(i) === 'low').length,
    outOfStock: items.filter(i => getStatus(i) === 'out').length,
    totalValue: items.reduce((s, i) => s + i.stock * i.costPrice, 0),
  }), [items]);

  // ── Filtered + sorted items ───────────────────
  const filtered = useMemo(() => {
    let r = [...items];
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(i =>
        i.name.toLowerCase().includes(q) ||
        i.sku.toLowerCase().includes(q)  ||
        i.category.toLowerCase().includes(q)
      );
    }
    if (activeCategory !== 'All') r = r.filter(i => i.category === activeCategory);
    if (statusFilter   !== 'All') r = r.filter(i => getStatus(i) === statusFilter.toLowerCase());
    r.sort((a, b) => {
      let av = a[sortBy], bv = b[sortBy];
      if (typeof av === 'string') { av = av.toLowerCase(); bv = bv.toLowerCase(); }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ?  1 : -1;
      return 0;
    });
    return r;
  }, [items, search, activeCategory, statusFilter, sortBy, sortDir]);

  // ── Handlers ─────────────────────────────────
  const toggleSort = useCallback((col) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
  }, [sortBy]);

  const openAdd  = useCallback(() => { setEditItem(null); setModalOpen(true); }, []);
  const openEdit = useCallback((item) => { setEditItem(item); setModalOpen(true); }, []);
  const openDel  = useCallback((item) => setDeleteModal({ open: true, item }), []);

  const handleSave = useCallback((saved) => {
    setItems(prev =>
      prev.some(i => i.id === saved.id)
        ? prev.map(i => i.id === saved.id ? saved : i)
        : [...prev, saved]
    );
  }, []);

  const handleDelete = useCallback((id) => {
    setItems(prev => prev.filter(i => i.id !== id));
    setSelected(prev => { const s = new Set(prev); s.delete(id); return s; });
  }, []);

  // Select / deselect
  const toggleSelect = useCallback((id) => {
    setSelected(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelected(prev =>
      prev.size === filtered.length
        ? new Set()
        : new Set(filtered.map(i => i.id))
    );
  }, [filtered]);

  // TopBar actions
  const headerActions = (
    <>
      <button className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all">
        <Upload size={14} />
        <span className="hidden sm:inline">Bulk Upload</span>
      </button>
      <button className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all">
        <Download size={14} />
        <span className="hidden sm:inline">Export</span>
      </button>
      <button onClick={openAdd}
        className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-xl hover:bg-green-700 active:scale-95 transition-all shadow-sm">
        <Plus size={14} />
        <span className="hidden sm:inline">Add Item</span>
      </button>
    </>
  );

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-gray-50 overflow-y-auto page-content">
      <TopBar
        title="Inventory"
        subtitle={`${items.length} items · ${categories.length - 1} categories`}
        actions={headerActions}
      />

      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-5">

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
          <MiniStat icon={CheckCircle} iconBg="bg-green-100" iconColor="text-green-600"
            label="In Stock" value={stats.inStock} animDelay="0.05s" />
          <MiniStat icon={AlertTriangle} iconBg="bg-amber-100" iconColor="text-amber-600"
            label="Low Stock" value={stats.lowStock} animDelay="0.10s" />
          <MiniStat icon={XCircle} iconBg="bg-red-100" iconColor="text-red-500"
            label="Out of Stock" value={stats.outOfStock} animDelay="0.15s" />
          <MiniStat icon={Gem} iconBg="bg-blue-100" iconColor="text-blue-600"
            label="Inventory Value"
            value={stats.totalValue >= 1000000
              ? `₦${(stats.totalValue / 1000000).toFixed(1)}M`
              : `₦${(stats.totalValue / 1000).toFixed(0)}K`}
            animDelay="0.20s"
          />
        </div>

        {/* ── Category Tabs ── */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {categories.map(cat => {
            const count = cat === 'All' ? items.length : items.filter(i => i.category === cat).length;
            return (
              <button key={cat} onClick={() => setCategory(cat)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all flex-shrink-0
                  ${activeCategory === cat
                    ? 'bg-green-600 text-white shadow-sm'
                    : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300'
                  }`}>
                {cat}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold
                  ${activeCategory === cat ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Toolbar ── */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, SKU..."
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all" />
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filter toggle (mobile) */}
          <button onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all
              ${showFilters ? 'bg-green-50 border-green-300 text-green-700' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}>
            <SlidersHorizontal size={14} />
            <span className="hidden sm:inline">Filter</span>
          </button>

          {/* Status filter — always visible on desktop */}
          <div className={`${showFilters ? 'flex' : 'hidden sm:flex'} items-center gap-2`}>
            <div className="relative">
              <select value={statusFilter} onChange={e => setStatus(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2.5 text-sm bg-white border border-gray-200 rounded-xl outline-none focus:border-green-400 transition-all font-medium text-gray-600 cursor-pointer">
                <option value="All">All Status</option>
                <option value="ok">In Stock</option>
                <option value="low">Low Stock</option>
                <option value="out">Out of Stock</option>
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Bulk delete */}
          {selected.size > 0 && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2 animate-fade-in">
              <span className="text-xs font-bold text-red-700">{selected.size} selected</span>
              <button onClick={() => setSelected(new Set())}
                className="text-xs font-semibold text-red-600 hover:text-red-800 underline">
                Clear
              </button>
            </div>
          )}

          {/* Count + View toggle */}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-gray-400 font-medium hidden sm:block">
              <strong className="text-gray-700">{filtered.length}</strong> / {items.length}
            </span>
            <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1">
              <button onClick={() => setViewMode('table')}
                className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all
                  ${viewMode === 'table' ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-gray-600'}`}>
                <LayoutList size={14} />
              </button>
              <button onClick={() => setViewMode('cards')}
                className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all
                  ${viewMode === 'cards' ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-gray-600'}`}>
                <LayoutGrid size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Empty State ── */}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm text-center animate-fade-up">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Package size={28} className="text-gray-400" />
            </div>
            <h3 className="text-base font-bold text-gray-700 mb-2">
              No items found
            </h3>
            <p className="text-sm text-gray-400 mb-6 max-w-xs">
              {search
                ? `No results for "${search}". Try a different search term.`
                : 'Add your first inventory item to get started.'}
            </p>
            <button onClick={openAdd}
              className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 active:scale-95 transition-all">
              <Plus size={15} /> Add First Item
            </button>
          </div>
        )}

        {/* ── CARDS VIEW (mobile default) ── */}
        {filtered.length > 0 && viewMode === 'cards' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {filtered.map(item => (
              <ItemCard
                key={item.id}
                item={item}
                onEdit={openEdit}
                onDelete={openDel}
                selected={selected.has(item.id)}
                onSelect={toggleSelect}
              />
            ))}
          </div>
        )}

        {/* ── TABLE VIEW ── */}
        {filtered.length > 0 && viewMode === 'table' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-fade-up">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead className="bg-gray-50/80 border-b border-gray-100 sticky top-0 z-10">
                  <tr>
                    {/* Select all */}
                    <th className="px-4 py-3 w-10">
                      <button onClick={toggleSelectAll}
                        className={`w-4.5 h-4.5 rounded border-2 flex items-center justify-center transition-all
                          ${selected.size === filtered.length && filtered.length > 0
                            ? 'bg-green-600 border-green-600'
                            : 'border-gray-300 hover:border-green-400'}`}>
                        {selected.size === filtered.length && filtered.length > 0 && (
                          <CheckCircle size={10} className="text-white" />
                        )}
                      </button>
                    </th>
                    <SortTh col="name"         label="Product"       sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                    <SortTh col="sku"          label="SKU"           sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                    <SortTh col="category"     label="Category"      sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                    <SortTh col="stock"        label="Stock"         sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                    <SortTh col="costPrice"    label="Cost"          sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                    <SortTh col="sellingPrice" label="Selling"       sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                    <th className="text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 px-4 py-3">Margin</th>
                    <th className="text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 px-4 py-3">Status</th>
                    <th className="text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(item => {
                    const status    = getStatus(item);
                    const isSelected = selected.has(item.id);

                    return (
                      <tr key={item.id}
                        className={`border-b border-gray-50 last:border-0 transition-colors group
                          ${isSelected ? 'bg-green-50/40' : 'hover:bg-gray-50/50'}`}>

                        {/* Checkbox */}
                        <td className="px-4 py-3.5">
                          <button onClick={() => toggleSelect(item.id)}
                            className={`w-4.5 h-4.5 rounded border-2 flex items-center justify-center transition-all
                              ${isSelected ? 'bg-green-600 border-green-600' : 'border-gray-300 hover:border-green-400'}`}>
                            {isSelected && <CheckCircle size={10} className="text-white" />}
                          </button>
                        </td>

                        {/* Product */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <ItemIcon iconName={item.iconName} bg={item.bg} size={17} className="w-9 h-9" />
                            <div>
                              <p className="text-sm font-semibold text-gray-800 leading-tight">{item.name}</p>
                              <p className="text-[11px] text-gray-400">
                                {formatDate(item.lastRestocked)}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* SKU */}
                        <td className="px-4 py-3.5">
                          <span className="text-[11px] font-mono font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">
                            {item.sku}
                          </span>
                        </td>

                        {/* Category */}
                        <td className="px-4 py-3.5">
                          <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
                            {item.category}
                          </span>
                        </td>

                        {/* Stock */}
                        <td className="px-4 py-3.5">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-sm font-bold
                                ${status === 'out' ? 'text-red-600'
                                : status === 'low' ? 'text-amber-600'
                                : 'text-gray-900'}`}>
                                {item.stock}
                              </span>
                              <span className="text-[10px] text-gray-400">/ {item.threshold}</span>
                            </div>
                            <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all
                                  ${status === 'out' ? 'bg-red-400'
                                  : status === 'low' ? 'bg-amber-400'
                                  : 'bg-green-500'}`}
                                style={{ width: `${Math.min((item.stock / (item.threshold * 2)) * 100, 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Cost */}
                        <td className="px-4 py-3.5">
                          <span className="text-sm text-gray-600 font-medium">{naira(item.costPrice)}</span>
                        </td>

                        {/* Selling */}
                        <td className="px-4 py-3.5">
                          <span className="text-sm font-bold text-green-600">{naira(item.sellingPrice)}</span>
                        </td>

                        {/* Margin */}
                        <td className="px-4 py-3.5">
                          <MarginBadge cost={item.costPrice} sell={item.sellingPrice} />
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5">
                          <StatusBadge status={status} />
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5 opacity-50 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openEdit(item)}
                              className="w-7 h-7 flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 text-gray-400 transition-all"
                              title="Edit item">
                              <Edit2 size={12} />
                            </button>
                            <button onClick={() => openDel(item)}
                              className="w-7 h-7 flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-red-50 hover:border-red-200 hover:text-red-500 text-gray-400 transition-all"
                              title="Delete item">
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

        {/* ── Footer ── */}
        {filtered.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400">
            <span>
              Showing <strong className="text-gray-700">{filtered.length}</strong> of {items.length} items
              {activeCategory !== 'All' && ` in ${activeCategory}`}
            </span>
            <span>
              Selected value:{' '}
              <strong className="text-gray-700">
                {naira(filtered
                  .filter(i => selected.has(i.id))
                  .reduce((s, i) => s + i.stock * i.costPrice, 0)
                )}
              </strong>
              {' · '}
              Filtered stock value:{' '}
              <strong className="text-green-600">
                {naira(filtered.reduce((s, i) => s + i.stock * i.costPrice, 0))}
              </strong>
            </span>
          </div>
        )}
      </main>

      {/* ── Modals ── */}
      <ItemModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        editItem={editItem}
      />
      <DeleteModal
        isOpen={deleteModal.open}
        item={deleteModal.item}
        onClose={() => setDeleteModal({ open: false, item: null })}
        onConfirm={handleDelete}
      />
    </div>
  );
}