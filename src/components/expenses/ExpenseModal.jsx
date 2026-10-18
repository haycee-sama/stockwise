// src/components/expenses/ExpenseModal.jsx
import { useState } from 'react';
import {
  X, Receipt, Loader2, Plus, CheckCircle,
  Package, Home, Truck, Zap, Megaphone, Users, MailOpen, Wrench,
  Banknote, Building2, CreditCard,
} from 'lucide-react';
import { expenseCategories, expensePaymentMethods, vendorsData } from '../../data/mockData';

const iconMap = { Package, Home, Truck, Zap, Megaphone, Users, MailOpen, Wrench };
const pmtIcons = { Cash: Banknote, Transfer: Building2, Card: CreditCard };

function Field({ label, error, children }) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
        {label}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">⚠ {error}</p>}
    </div>
  );
}

function Input({ error, ...props }) {
  return (
    <input
      {...props}
      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium outline-none transition-all
        ${error
          ? 'border-red-300 bg-red-50 focus:border-red-400 focus:ring-2 focus:ring-red-100'
          : 'border-gray-200 bg-white focus:border-green-400 focus:ring-2 focus:ring-green-100'
        }`}
    />
  );
}

const emptyForm = {
  name: '', category: '', vendor: '',
  amount: '', date: new Date().toISOString().slice(0, 10),
  payment: 'Cash', note: '',
};

export default function ExpenseModal({ isOpen, onClose, onSave, editExpense }) {
  // Lazy initialiser — derives from `editExpense` if present.
  // Replaces the previous effect-driven form sync (which fired
  // `setState` inside `useEffect` and triggered cascading renders —
  // react-hooks/set-state-in-effect). Combined with a `key` prop on
  // the caller side, the form state is correctly reset on every edit
  // target change.
  const [form, setForm]     = useState(() => editExpense
    ? { name: editExpense.name ?? '', category: editExpense.category ?? '', vendor: editExpense.vendor ?? '', amount: editExpense.amount ?? '', date: editExpense.date ?? new Date().toISOString().slice(0, 10), payment: editExpense.payment ?? 'Cash', note: editExpense.note ?? '' }
    : { ...emptyForm });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const isEditing = !!editExpense;

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
    if (errors[name]) setErrors(p => ({ ...p, [name]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim())  e.name     = 'Expense name is required';
    if (!form.category)     e.category = 'Please select a category';
    if (!form.vendor.trim())e.vendor   = 'Vendor / payee is required';
    if (!form.amount)       e.amount   = 'Amount is required';
    else if (isNaN(Number(form.amount)) || Number(form.amount) <= 0)
                            e.amount   = 'Enter a valid amount greater than 0';
    if (!form.date)         e.date     = 'Date is required';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    await new Promise(r => setTimeout(r, 700));

    onSave({
      ...(editExpense ?? {}),
      ...form,
      id:     editExpense?.id ?? Date.now(),
      amount: Number(form.amount),
    });

    setSaving(false);
    onClose();
  };

  // Get the selected category object for preview
  const selectedCat = expenseCategories.find(c => c.id === form.category);
  const SelectedCatIcon = selectedCat ? (iconMap[selectedCat.icon] ?? Wrench) : null;

  // Vendor suggestions from vendorsData
  const vendorSuggestions = vendorsData.map(v => v.name);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center">
              <Receipt size={17} className="text-red-500" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                {isEditing ? 'Edit Expense' : 'Add New Expense'}
              </h2>
              <p className="text-xs text-gray-400">
                {isEditing ? 'Update expense details' : 'Record a business expense'}
              </p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 transition-all">
            <X size={17} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {/* Expense name */}
          <Field label="Expense Name *" error={errors.name}>
            <Input name="name" value={form.name} onChange={handleChange}
              placeholder="e.g. Monthly Rent, Generator Fuel..." error={errors.name} />
          </Field>

          {/* Category picker — visual grid */}
          <Field label="Category *" error={errors.category}>
            <div className="grid grid-cols-4 gap-2">
              {expenseCategories.map(cat => {
                const Icon = iconMap[cat.icon] ?? Wrench;
                const isActive = form.category === cat.id;
                return (
                  <button key={cat.id} type="button"
                    onClick={() => { setForm(p => ({ ...p, category: cat.id })); if (errors.category) setErrors(p => ({ ...p, category: '' })); }}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all
                      ${isActive
                        ? 'border-green-500 bg-green-50 scale-105'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}>
                    <Icon size={18} className={isActive ? 'text-green-600' : 'text-gray-500'} />
                    <span className={`text-[10px] font-bold text-center leading-tight
                      ${isActive ? 'text-green-700' : 'text-gray-500'}`}>
                      {cat.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </Field>

          {/* Vendor + Amount */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Vendor / Payee *" error={errors.vendor}>
              <div className="relative">
                <Input name="vendor" value={form.vendor} onChange={handleChange}
                  placeholder="e.g. Landlord" error={errors.vendor}
                  list="vendor-suggestions" />
                <datalist id="vendor-suggestions">
                  {vendorSuggestions.map(v => <option key={v} value={v} />)}
                </datalist>
              </div>
            </Field>
            <Field label="Amount (₦) *" error={errors.amount}>
              <Input name="amount" type="number" min="0" step="0.01"
                value={form.amount} onChange={handleChange}
                placeholder="0.00" error={errors.amount} />
            </Field>
          </div>

          {/* Date + Payment Method */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Date *" error={errors.date}>
              <Input name="date" type="date" value={form.date}
                onChange={handleChange} error={errors.date} />
            </Field>
            <Field label="Payment Method">
              <div className="flex gap-2">
                {expensePaymentMethods.map(method => {
                  const Icon = pmtIcons[method] ?? Banknote;
                  const isActive = form.payment === method;
                  return (
                    <button key={method} type="button"
                      onClick={() => setForm(p => ({ ...p, payment: method }))}
                      className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 transition-all
                        ${isActive
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                        }`}>
                      <Icon size={16} className={isActive ? 'text-green-700' : 'text-gray-500'} />
                      <span className={`text-[10px] font-bold ${isActive ? 'text-green-700' : 'text-gray-500'}`}>
                        {method}
                      </span>
                    </button>
                  );
                })}
              </div>
            </Field>
          </div>

          {/* Note */}
          <Field label="Note (optional)">
            <textarea name="note" value={form.note} onChange={handleChange}
              placeholder="Any additional details about this expense..."
              rows={2}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all resize-none"
            />
          </Field>

          {/* Preview card */}
          {form.name && form.amount && selectedCat && (
            <div className="flex items-center gap-3 rounded-xl p-3 border border-gray-200"
              style={{ background: selectedCat.bg }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'white' }}>
                {SelectedCatIcon && <SelectedCatIcon size={18} style={{ color: selectedCat.color }} />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-800">{form.name}</p>
                <p className="text-xs text-gray-500">{selectedCat.label} · {form.vendor || '—'} · {form.payment}</p>
              </div>
              <p className="text-base font-extrabold" style={{ color: selectedCat.color }}>
                ₦{Number(form.amount || 0).toLocaleString()}
              </p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2">
              {saving
                ? <><Loader2 size={15} className="animate-spin" /> Saving...</>
                : isEditing
                  ? <><CheckCircle size={15} /> Save Changes</>
                  : <><Plus size={15} /> Add Expense</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}