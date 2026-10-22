// src/components/sales/NewSaleModal.jsx
import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  X, Plus, Minus, Trash2, ShoppingCart,
  Loader2, Search, User, Banknote,
  Building2, CreditCard, ChevronRight,
  Package, CheckCircle, ArrowLeft,
} from 'lucide-react';
import { inventoryService } from '../../services';
import { customersService } from '../../services';
import { useBusiness } from '../../context/useBusiness';
import { ItemIcon } from '../../utils/inventoryIcons';

const naira = (v) => `₦${Number(v).toLocaleString()}`;

// ── Payment method config ─────────────────────────
const paymentConfig = {
  Cash:     { icon: Banknote,   color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-300'   },
  Transfer: { icon: Building2,  color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-300' },
  Card:     { icon: CreditCard, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-300' },
};

// ── Cart item row ─────────────────────────────────
function CartItem({ item, onUpdateQty, onRemove }) {
  return (
    <div className="flex items-center gap-2.5 bg-gray-50 rounded-xl p-3 group">
      <ItemIcon iconName={item.iconName ?? 'Package'} bg={item.bg ?? '#f0fdf4'}
        size={15} className="w-8 h-8 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-800 truncate leading-tight">{item.name}</p>
        <p className="text-[10px] text-green-600 font-bold">{naira(item.sellingPrice)}</p>
      </div>
      {/* Qty stepper */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button onClick={() => onUpdateQty(item.id, item.qty - 1)}
          className="w-6 h-6 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100 active:scale-90 transition-all">
          <Minus size={10} />
        </button>
        <span className="text-xs font-bold w-6 text-center tabular-nums">{item.qty}</span>
        <button onClick={() => onUpdateQty(item.id, item.qty + 1)}
          className="w-6 h-6 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100 active:scale-90 transition-all">
          <Plus size={10} />
        </button>
      </div>
      <p className="text-xs font-bold text-gray-800 w-14 text-right flex-shrink-0 tabular-nums">
        {naira(item.sellingPrice * item.qty)}
      </p>
      <button onClick={() => onRemove(item.id)}
        className="text-gray-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0">
        <Trash2 size={13} />
      </button>
    </div>
  );
}

export default function NewSaleModal({ isOpen, onClose, onSave }) {
  // ── All hooks called unconditionally at the top (Rules of Hooks) ──
  const { activeBusinessId } = useBusiness();
  const [cart, setCart]         = useState([]);
  const [search, setSearch]     = useState('');
  const [customer, setCustomer] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [customerList, setCustomerList] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [payment, setPayment]   = useState('Cash');
  const [note, setNote]         = useState('');
  const [errors, setErrors]     = useState({});
  const [saving, setSaving]     = useState(false);
  const [step, setStep]         = useState(1); // 1=items, 2=payment

  // Fetch inventory items via the service layer (replaces mockData import).
  const [inventoryItems, setInventoryItems] = useState([]);
  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await inventoryService.list({ businessId: activeBusinessId ?? undefined });
      if (active && data) setInventoryItems(data);
    })();
    return () => { active = false; };
  }, [activeBusinessId]);

  // Fetch customers for the customer picker.
  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await customersService.list({ businessId: activeBusinessId ?? undefined });
      if (active && data) setCustomerList(data);
    })();
    return () => { active = false; };
  }, [activeBusinessId]);

  // Filtered customers for the dropdown.
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customerList.slice(0, 5);
    const q = customerSearch.toLowerCase();
    return customerList.filter(c =>
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
      (c.phone ?? '').includes(q) ||
      (c.email ?? '').toLowerCase().includes(q)
    ).slice(0, 5);
  }, [customerSearch, customerList]);

  // Handle selecting a customer from the dropdown.
  const selectCustomer = useCallback((c) => {
    setCustomer(`${c.firstName} ${c.lastName}`);
    setSelectedCustomerId(c.id);
    setShowCustomerDropdown(false);
    setCustomerSearch('');
    if (errors.customer) setErrors(p => ({ ...p, customer: '' }));
  }, [errors.customer]);

  // Handle clearing the customer selection (revert to walk-in / free-text).
  const clearCustomerSelection = useCallback(() => {
    setSelectedCustomerId(null);
  }, []);

  const filteredInventory = useMemo(() => {
    const q = search.toLowerCase();
    return inventoryItems.filter(i =>
      i.stock > 0 && (
        i.name.toLowerCase().includes(q) ||
        i.sku.toLowerCase().includes(q)
      )
    );
  }, [search, inventoryItems]);

  const clearCartState = useCallback(() => {
    setCart([]); setCustomer(''); setSelectedCustomerId(null);
    setCustomerSearch(''); setShowCustomerDropdown(false);
    setPayment('Cash'); setNote(''); setStep(1); setSearch(''); setErrors({});
  }, []);

  const removeFromCart = useCallback((id) => {
    setCart(prev => prev.filter(c => c.id !== id));
  }, []);

  const addToCart = useCallback((item) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id);
      if (existing) {
        return prev.map(c =>
          c.id === item.id && c.qty < item.stock
            ? { ...c, qty: c.qty + 1 }
            : c
        );
      }
      return [...prev, { ...item, qty: 1 }];
    });
    if (errors.cart) setErrors(p => ({ ...p, cart: '' }));
  }, [errors.cart]);

  const updateQty = useCallback((id, qty) => {
    if (qty < 1) { removeFromCart(id); return; }
    const item = inventoryItems.find(i => i.id === id);
    if (!item) return;
    setCart(prev =>
      prev.map(c => c.id === id ? { ...c, qty: Math.min(qty, item.stock) } : c)
    );
  }, [removeFromCart, inventoryItems]);

  const subtotal = cart.reduce((s, c) => s + c.sellingPrice * c.qty, 0);
  const totalItems = cart.reduce((s, c) => s + c.qty, 0);

  const handleNext = () => {
    const e = {};
    if (cart.length === 0)   e.cart     = 'Add at least one item';
    if (!customer.trim())    e.customer = 'Customer name is required';
    if (Object.keys(e).length) { setErrors(e); return; }
    setStep(2);
  };

  const handleSubmit = async () => {
    if (cart.length === 0) {
      setErrors({ cart: 'Add at least one item' });
      setStep(1);
      return;
    }
    if (!customer.trim()) {
      setErrors({ customer: 'Customer name is required' });
      setStep(1);
      return;
    }
    setSaving(true);
    try {
      // Pass the order payload to onSave. In Supabase mode, the parent's
      // handleNewSale calls the atomic sw_create_sale RPC. The parent
      // returns { success: boolean, message?: string } so the modal
      // knows whether to close or show an error.
      const payload = {
        // Note: the parent now ignores the locally-generated `id` and
        // `date` — the server generates the real display_id (ORD-XXXX)
        // and sale_date atomically via the sw_create_sale RPC.
        id: `ORD-${String(Math.floor(Math.random() * 9000) + 1000)}`,
        customer: {
          name:      customer,
          initials:  customer.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
          color:     '#f0fdf4',
          textColor: '#15803d',
        },
        customerId: selectedCustomerId, // UUID for a known customer, null for walk-in
        items: cart.map(c => ({
          itemId:     c.id,
          name:       c.name,
          qty:        c.qty,
          unitPrice:  c.sellingPrice,
        })),
        total:   subtotal,
        payment,
        status:  'completed',
        date:    new Date().toISOString(),
        note,
      };
      // onSave may be sync (legacy) or async (Phase 3B). Use Promise.resolve
      // to handle both shapes.
      const result = await Promise.resolve(onSave(payload));
      if (result && result.success === false) {
        // Server rejected — show the error in the modal + stay open.
        setErrors(prev => ({ ...prev, submit: result.message ?? 'Could not create sale.' }));
        return;
      }
      clearCartState();
    } catch (e) {
      setErrors(prev => ({ ...prev, submit: e?.message ?? 'Network error.' }));
      return;
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    clearCartState();
    onClose();
  };

  // Early return AFTER all hooks have been called.
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
      {/* Modal panel */}
      <div className="bg-white w-full sm:rounded-2xl sm:max-w-2xl shadow-2xl flex flex-col rounded-t-2xl"
        style={{ maxHeight: '95vh' }}>

        {/* Handle (mobile) */}
        <div className="flex justify-center pt-3 sm:hidden flex-shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center">
              <ShoppingCart size={17} className="text-green-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">
                New Sale
              </h2>
              <p className="text-[11px] text-gray-400">
                Step {step} of 2 — {step === 1 ? 'Select items & customer' : 'Payment & confirm'}
              </p>
            </div>
          </div>
          <button onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 transition-all">
            <X size={17} />
          </button>
        </div>

        {/* Step bar */}
        <div className="flex px-5 py-2 gap-2 border-b border-gray-100 flex-shrink-0">
          <div className={`flex-1 h-1 rounded-full transition-all duration-300 ${step >= 1 ? 'bg-green-500' : 'bg-gray-200'}`} />
          <div className={`flex-1 h-1 rounded-full transition-all duration-300 ${step >= 2 ? 'bg-green-500' : 'bg-gray-200'}`} />
        </div>

        {/* ── STEP 1: Items + Customer ── */}
        {step === 1 && (
          <div className="flex flex-col sm:flex-row flex-1 overflow-hidden">

            {/* Left — Inventory picker */}
            <div className="sm:w-1/2 border-b sm:border-b-0 sm:border-r border-gray-100 flex flex-col"
              style={{ maxHeight: '260px', minHeight: 0 }}
              // On desktop this is full height; on mobile it's capped
            >
              <div className="p-3 border-b border-gray-100 flex-shrink-0">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Select Items <span className="text-gray-300 font-normal">({filteredInventory.length} available)</span>
                </p>
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search inventory..."
                    className="w-full pl-8 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-green-400 transition-all" />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {filteredInventory.map(item => {
                  const inCart = cart.find(c => c.id === item.id);
                  return (
                    <button key={item.id} onClick={() => addToCart(item)}
                      className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl text-left transition-all
                        ${inCart
                          ? 'bg-green-50 border border-green-200'
                          : 'hover:bg-gray-50 border border-transparent'
                        }`}>
                      <ItemIcon iconName={item.iconName ?? 'Package'} bg={item.bg ?? '#f0fdf4'}
                        size={14} className="w-8 h-8 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800 truncate leading-tight">{item.name}</p>
                        <p className="text-[10px] text-gray-400">{item.stock} left · {item.sku}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-bold text-green-600">{naira(item.sellingPrice)}</p>
                        {inCart && (
                          <p className="text-[10px] text-green-500 font-semibold">+{inCart.qty} added</p>
                        )}
                      </div>
                    </button>
                  );
                })}
                {filteredInventory.length === 0 && (
                  <div className="flex flex-col items-center py-8 text-gray-400">
                    <Package size={24} className="mb-2 opacity-40" />
                    <p className="text-xs">No items found</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right — Cart + Customer */}
            <div className="sm:w-1/2 flex flex-col overflow-hidden">
              {/* Cart */}
              <div className="flex-1 overflow-y-auto p-3 min-h-0">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Cart
                  </p>
                  {cart.length > 0 && (
                    <button onClick={() => setCart([])}
                      className="text-[10px] font-semibold text-red-400 hover:text-red-600 transition-colors">
                      Clear all
                    </button>
                  )}
                </div>

                {cart.length === 0 ? (
                  <div className="flex flex-col items-center py-8 text-gray-400">
                    <ShoppingCart size={24} className="mb-2 opacity-40" />
                    <p className="text-xs text-center">Tap items on the left to add them</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {cart.map(c => (
                      <CartItem key={c.id} item={c}
                        onUpdateQty={updateQty}
                        onRemove={removeFromCart}
                      />
                    ))}
                  </div>
                )}
                {errors.cart && (
                  <p className="text-[11px] text-red-500 mt-2 flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-red-100 flex items-center justify-center text-[8px] font-bold">!</span>
                    {errors.cart}
                  </p>
                )}
              </div>

              {/* Customer + total + action */}
              <div className="p-3 border-t border-gray-100 space-y-3 flex-shrink-0">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                    Customer {selectedCustomerId && <span className="text-green-500 normal-case">✓ linked</span>}
                    {!selectedCustomerId && <span className="text-red-400">*</span>}
                  </label>
                  <div className="relative">
                    <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                      value={customer}
                      onChange={(e) => {
                        setCustomer(e.target.value);
                        if (selectedCustomerId) clearCustomerSelection();
                        setCustomerSearch(e.target.value);
                        setShowCustomerDropdown(true);
                        if (errors.customer) setErrors(p => ({ ...p, customer: '' }));
                      }}
                      onFocus={() => setShowCustomerDropdown(true)}
                      onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 150)}
                      placeholder="Search customer or type walk-in name…"
                      className={`w-full pl-8 pr-3 py-2.5 text-sm rounded-xl border outline-none transition-all
                        ${errors.customer
                          ? 'border-red-300 bg-red-50'
                          : selectedCustomerId
                            ? 'border-green-300 bg-green-50'
                            : 'border-gray-200 focus:border-green-400 focus:ring-2 focus:ring-green-100'
                        }`}
                    />
                    {/* Customer suggestions dropdown */}
                    {showCustomerDropdown && filteredCustomers.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 max-h-48 overflow-y-auto">
                        {filteredCustomers.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); selectCustomer(c); }}
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-green-50 transition-colors text-left"
                          >
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                              style={{ background: c.color, color: c.textColor }}>
                              {c.initials}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-gray-800 truncate">
                                {c.firstName} {c.lastName}
                              </p>
                              <p className="text-[10px] text-gray-400 truncate">{c.phone}</p>
                            </div>
                            <span className="text-[9px] font-bold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">
                              {c.type}
                            </span>
                          </button>
                        ))}
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setShowCustomerDropdown(false);
                            setSelectedCustomerId(null);
                          }}
                          className="w-full text-center py-2 text-[10px] font-semibold text-gray-400 hover:bg-gray-50 border-t border-gray-100"
                        >
                          Use as walk-in customer (no link)
                        </button>
                      </div>
                    )}
                  </div>
                  {selectedCustomerId && (
                    <p className="text-[10px] text-green-600 mt-1 flex items-center gap-1">
                      <CheckCircle size={10} /> Customer linked — sale will be recorded against this customer.
                    </p>
                  )}
                  {errors.customer && (
                    <p className="text-[11px] text-red-500 mt-1">⚠ {errors.customer}</p>
                  )}
                </div>

                {/* Subtotal strip */}
                <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-2.5">
                  <div>
                    <p className="text-[10px] text-green-600 font-semibold">
                      {totalItems} item{totalItems !== 1 ? 's' : ''} in cart
                    </p>
                    <p className="text-xs text-green-700 font-bold">Subtotal</p>
                  </div>
                  <p className="text-lg font-extrabold text-green-600 tabular-nums">
                    {naira(subtotal)}
                  </p>
                </div>

                <button onClick={handleNext}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-600 hover:bg-green-700 active:scale-95 text-white text-sm font-bold rounded-xl transition-all">
                  Continue to Payment <ChevronRight size={15} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: Payment ── */}
        {step === 2 && (
          <div className="flex-1 overflow-y-auto">
            <div className="p-5 space-y-5">

              {/* Order summary */}
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Order Summary</p>
                <div className="space-y-2 mb-3">
                  {cart.map(c => (
                    <div key={c.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 truncate flex-1 min-w-0 mr-2">
                        {c.name}
                        <span className="text-gray-400 ml-1 text-xs">× {c.qty}</span>
                      </span>
                      <span className="font-bold text-gray-800 flex-shrink-0 tabular-nums">
                        {naira(c.sellingPrice * c.qty)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-gray-200 pt-3 flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-700">Total</span>
                  <span className="text-xl font-extrabold text-green-600 tabular-nums">
                    {naira(subtotal)}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100">
                  <User size={12} className="text-gray-400" />
                  <p className="text-xs text-gray-500">
                    Customer: <strong className="text-gray-700">{customer}</strong>
                  </p>
                </div>
              </div>

              {/* Payment method */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">
                  Payment Method
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {Object.entries(paymentConfig).map(([method, cfg]) => {
                    const Icon = cfg.icon;
                    const isActive = payment === method;
                    return (
                      <button key={method} type="button" onClick={() => setPayment(method)}
                        className={`flex flex-col items-center gap-2.5 p-4 rounded-xl border-2 transition-all active:scale-95
                          ${isActive
                            ? `${cfg.border} ${cfg.bg}`
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                          }`}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center
                          ${isActive ? cfg.bg : 'bg-gray-100'}`}>
                          <Icon size={20} className={isActive ? cfg.color : 'text-gray-400'} />
                        </div>
                        <span className={`text-xs font-bold ${isActive ? cfg.color : 'text-gray-500'}`}>
                          {method}
                        </span>
                        {isActive && (
                          <CheckCircle size={14} className={cfg.color} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                  Note (optional)
                </label>
                <textarea value={note} onChange={e => setNote(e.target.value)}
                  placeholder="Any special instructions or notes for this sale..."
                  rows={2}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all resize-none"
                />
              </div>

              {/* Action buttons */}
              {errors.submit && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-red-700 text-xs">
                  <span className="w-3 h-3 rounded-full bg-red-100 flex items-center justify-center text-[8px] font-bold flex-shrink-0 mt-0.5">!</span>
                  <span className="flex-1 break-words">{errors.submit}</span>
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={() => setStep(1)}
                  className="flex items-center gap-2 flex-1 justify-center py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all">
                  <ArrowLeft size={14} /> Back
                </button>
                <button onClick={handleSubmit} disabled={saving}
                  className="flex-[2] py-2.5 rounded-xl bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-bold transition-all active:scale-95 flex items-center justify-center gap-2">
                  {saving
                    ? <><Loader2 size={15} className="animate-spin" /> Processing...</>
                    : <><CheckCircle size={15} /> Confirm · {naira(subtotal)}</>
                  }
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}