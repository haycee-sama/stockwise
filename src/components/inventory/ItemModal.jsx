// src/components/inventory/ItemModal.jsx
import { useState } from 'react';
import { X, Package, Loader2, CheckCircle } from 'lucide-react';
import { categories, suppliers } from '../../data/mockData';
import { iconOptions, iconMap } from '../../utils/inventoryIconData';

// ── Reusable Field wrapper ────────────────────────
function Field({ label, required, error, children }) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
      {error && (
        <p className="mt-1 text-[11px] text-red-500 flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-red-100 flex items-center justify-center text-red-500 text-[8px] font-bold flex-shrink-0">!</span>
          {error}
        </p>
      )}
    </div>
  );
}

// ── Styled input ──────────────────────────────────
function Input({ error, className = '', ...props }) {
  return (
    <input
      {...props}
      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium outline-none transition-all
        ${error
          ? 'border-red-300 bg-red-50 focus:border-red-400 focus:ring-2 focus:ring-red-100'
          : 'border-gray-200 bg-white focus:border-green-400 focus:ring-2 focus:ring-green-100'
        } ${className}`}
    />
  );
}

// ── Styled select ─────────────────────────────────
function Select({ error, children, ...props }) {
  return (
    <select
      {...props}
      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium outline-none transition-all bg-white appearance-none
        ${error
          ? 'border-red-300 focus:border-red-400'
          : 'border-gray-200 focus:border-green-400 focus:ring-2 focus:ring-green-100'
        }`}
    >
      {children}
    </select>
  );
}

// ── Margin bar ────────────────────────────────────
function MarginBar({ cost, sell }) {
  const c = Number(cost) || 0;
  const s = Number(sell) || 0;
  if (!c || !s || s < c) return null;
  const profit = s - c;
  const margin = ((profit / s) * 100).toFixed(0);
  const color  = margin >= 30 ? '#16a34a' : margin >= 15 ? '#3b82f6' : '#f59e0b';
  return (
    <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-600">Profit margin</span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-900">₦{profit.toLocaleString()} / unit</span>
          <span className="text-xs font-bold px-2 py-0.5 rounded-md text-white"
            style={{ background: color }}>
            {margin}%
          </span>
        </div>
      </div>
      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(margin, 100)}%`, background: color }} />
      </div>
    </div>
  );
}

const emptyForm = {
  name: '', sku: '', category: '', supplier: '',
  stock: '', threshold: '', costPrice: '', sellingPrice: '',
  iconName: 'Package', bg: '#f0fdf4',
};

// bg options for the icon picker
const bgOptions = [
  '#fce7f3', '#dbeafe', '#fef3c7', '#f0fdf4',
  '#ede9fe', '#fff7ed', '#ecfdf5', '#fef9c3',
  '#fee2e2', '#f0f9ff',
];

export default function ItemModal({ isOpen, onClose, onSave, editItem }) {
  // Lazy initialiser — derives from `editItem` if present.
  // Combined with a `key` prop on the caller side, this replaces
  // the previous effect-driven form sync (which fired `setState`
  // inside `useEffect` and triggered cascading renders —
  // react-hooks/set-state-in-effect).
  const [form, setForm]       = useState(() => editItem
    ? { name: editItem.name ?? '', sku: editItem.sku ?? '', category: editItem.category ?? '', supplier: editItem.supplier ?? '', stock: editItem.stock ?? '', threshold: editItem.threshold ?? '', costPrice: editItem.costPrice ?? '', sellingPrice: editItem.sellingPrice ?? '', iconName: editItem.iconName ?? 'Package', bg: editItem.bg ?? '#f0fdf4' }
    : { ...emptyForm });
  const [errors, setErrors]   = useState({});
  const [saving, setSaving]   = useState(false);
  const [step, setStep]       = useState(1); // 2-step form
  const isEditing = !!editItem;

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
    if (errors[name]) setErrors(p => ({ ...p, [name]: '' }));
  };

  const validateStep1 = () => {
    const e = {};
    if (!form.name.trim())   e.name     = 'Item name is required';
    if (!form.sku.trim())    e.sku      = 'SKU is required';
    if (!form.category)      e.category = 'Please select a category';
    if (!form.supplier)      e.supplier = 'Please select a supplier';
    return e;
  };

  const validateStep2 = () => {
    const e = {};
    if (form.stock === '')     e.stock       = 'Current stock is required';
    if (form.threshold === '') e.threshold   = 'Low stock threshold is required';
    if (form.costPrice === '') e.costPrice   = 'Cost price is required';
    if (form.sellingPrice === '') e.sellingPrice = 'Selling price is required';
    if (Number(form.sellingPrice) < Number(form.costPrice))
      e.sellingPrice = 'Selling price must be ≥ cost price';
    return e;
  };

  const handleNextStep = () => {
    const errs = validateStep1();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validateStep2();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    await new Promise(r => setTimeout(r, 700));

    onSave({
      ...form,
      id:           editItem?.id ?? Date.now(),
      stock:        Number(form.stock),
      threshold:    Number(form.threshold),
      costPrice:    Number(form.costPrice),
      sellingPrice: Number(form.sellingPrice),
      lastRestocked: editItem?.lastRestocked ?? new Date().toISOString().slice(0, 10),
    });

    setSaving(false);
    onClose();
  };

  const SelectedIcon = iconMap[form.iconName] ?? Package;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full sm:rounded-2xl sm:max-w-lg shadow-2xl max-h-[95vh] sm:max-h-[88vh] flex flex-col rounded-t-2xl animate-fade-up">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center">
              <Package size={17} className="text-green-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900" style={{ fontFamily: 'sans-serif' }}>
                {isEditing ? 'Edit Item' : 'Add New Item'}
              </h2>
              <p className="text-[11px] text-gray-400">
                Step {step} of 2 — {step === 1 ? 'Item details' : 'Pricing & stock'}
              </p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 transition-all">
            <X size={17} />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex px-5 py-2.5 gap-2 border-b border-gray-100 flex-shrink-0">
          <div className={`flex-1 h-1 rounded-full transition-all ${step >= 1 ? 'bg-green-500' : 'bg-gray-200'}`} />
          <div className={`flex-1 h-1 rounded-full transition-all ${step >= 2 ? 'bg-green-500' : 'bg-gray-200'}`} />
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit}>

            {/* ── STEP 1: Item Details ── */}
            {step === 1 && (
              <div className="p-5 space-y-4">

                {/* Icon picker */}
                <Field label="Item Icon">
                  <div className="space-y-2">
                    {/* Icon grid */}
                    <div className="grid grid-cols-6 gap-2">
                      {iconOptions.map(opt => {
                        const Icon = iconMap[opt.name];
                        return (
                          <button key={opt.name} type="button"
                            onClick={() => setForm(p => ({ ...p, iconName: opt.name }))}
                            title={opt.label}
                            className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all
                              ${form.iconName === opt.name
                                ? 'border-green-500 bg-green-50 scale-105'
                                : 'border-gray-200 hover:border-gray-300 bg-gray-50'
                              }`}>
                            <Icon size={18} className={form.iconName === opt.name ? 'text-green-600' : 'text-gray-500'} />
                            <span className="text-[9px] font-semibold text-gray-400 truncate w-full text-center">
                              {opt.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Colour picker */}
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                        Background colour
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {bgOptions.map(col => (
                          <button key={col} type="button"
                            onClick={() => setForm(p => ({ ...p, bg: col }))}
                            className={`w-7 h-7 rounded-lg border-2 transition-all hover:scale-110
                              ${form.bg === col ? 'border-green-500 scale-110' : 'border-transparent'}`}
                            style={{ background: col }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Preview */}
                    <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 border border-gray-200">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: form.bg }}>
                        <SelectedIcon size={20} className="text-gray-600" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-700">
                          {form.name || 'Item name preview'}
                        </p>
                        <p className="text-[11px] text-gray-400">
                          {form.sku || 'SKU-XXX'}
                        </p>
                      </div>
                    </div>
                  </div>
                </Field>

                {/* Name + SKU */}
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Item Name" required error={errors.name}>
                    <Input name="name" value={form.name} onChange={handleChange}
                      placeholder="e.g. Ankara Gown" error={errors.name} />
                  </Field>
                  <Field label="SKU" required error={errors.sku}>
                    <Input name="sku" value={form.sku} onChange={handleChange}
                      placeholder="e.g. SKU-001" error={errors.sku} />
                  </Field>
                </div>

                {/* Category + Supplier */}
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Category" required error={errors.category}>
                    <Select name="category" value={form.category} onChange={handleChange} error={errors.category}>
                      <option value="">Select...</option>
                      {categories.filter(c => c !== 'All').map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                      <option value="Other">Other</option>
                    </Select>
                  </Field>
                  <Field label="Supplier" required error={errors.supplier}>
                    <Select name="supplier" value={form.supplier} onChange={handleChange} error={errors.supplier}>
                      <option value="">Select...</option>
                      {suppliers.map(s => <option key={s} value={s}>{s}</option>)}
                    </Select>
                  </Field>
                </div>

                <button type="button" onClick={handleNextStep}
                  className="w-full py-3 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-xl transition-all active:scale-95">
                  Continue to Pricing →
                </button>
              </div>
            )}

            {/* ── STEP 2: Pricing & Stock ── */}
            {step === 2 && (
              <div className="p-5 space-y-4">

                {/* Stock + Threshold */}
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Current Stock" required error={errors.stock}>
                    <Input type="number" min="0" name="stock"
                      value={form.stock} onChange={handleChange}
                      placeholder="0" error={errors.stock} />
                  </Field>
                  <Field label="Low Stock Alert" required error={errors.threshold}>
                    <Input type="number" min="1" name="threshold"
                      value={form.threshold} onChange={handleChange}
                      placeholder="e.g. 10" error={errors.threshold} />
                  </Field>
                </div>

                {/* Stock level preview */}
                {form.stock !== '' && form.threshold !== '' && (
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold
                    ${Number(form.stock) === 0
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : Number(form.stock) <= Number(form.threshold)
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-green-50 text-green-700 border border-green-200'
                    }`}>
                    <div className={`w-2 h-2 rounded-full flex-shrink-0
                      ${Number(form.stock) === 0 ? 'bg-red-500'
                      : Number(form.stock) <= Number(form.threshold) ? 'bg-amber-500'
                      : 'bg-green-500'}`} />
                    {Number(form.stock) === 0 ? 'Out of stock'
                      : Number(form.stock) <= Number(form.threshold) ? 'Low stock — will trigger alert'
                      : 'Stock level is healthy'}
                  </div>
                )}

                {/* Cost + Selling price */}
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Cost Price (₦)" required error={errors.costPrice}>
                    <Input type="number" min="0" name="costPrice"
                      value={form.costPrice} onChange={handleChange}
                      placeholder="0.00" error={errors.costPrice} />
                  </Field>
                  <Field label="Selling Price (₦)" required error={errors.sellingPrice}>
                    <Input type="number" min="0" name="sellingPrice"
                      value={form.sellingPrice} onChange={handleChange}
                      placeholder="0.00" error={errors.sellingPrice} />
                  </Field>
                </div>

                {/* Margin bar */}
                <MarginBar cost={form.costPrice} sell={form.sellingPrice} />

                {/* Buttons */}
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setStep(1)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all">
                    ← Back
                  </button>
                  <button type="submit" disabled={saving}
                    className="flex-[2] py-2.5 rounded-xl bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-bold transition-all active:scale-95 flex items-center justify-center gap-2">
                    {saving
                      ? <><Loader2 size={15} className="animate-spin" /> Saving...</>
                      : isEditing
                        ? <><CheckCircle size={15} /> Save Changes</>
                        : <><Package size={15} /> Add to Inventory</>
                    }
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}