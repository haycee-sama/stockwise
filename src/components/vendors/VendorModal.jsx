// src/components/vendors/VendorModal.jsx
import { useState, useEffect } from 'react';
import { X, Truck, Loader2, Plus, Minus, CheckCircle } from 'lucide-react';
import { vendorCategories, vendorAvatarColors } from '../../data/mockData';

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
  name: '', contactPerson: '', email: '',
  phone: '', category: '', location: '',
  leadTimeDays: '', note: '',
  itemsSupplied: [''],
};

export default function VendorModal({ isOpen, onClose, onSave, editVendor }) {
  const [form, setForm]     = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const isEditing = !!editVendor;

  useEffect(() => {
    if (editVendor) {
      setForm({
        name:          editVendor.name          ?? '',
        contactPerson: editVendor.contactPerson ?? '',
        email:         editVendor.email         ?? '',
        phone:         editVendor.phone         ?? '',
        category:      editVendor.category      ?? '',
        location:      editVendor.location      ?? '',
        leadTimeDays:  editVendor.leadTimeDays  ?? '',
        note:          editVendor.note          ?? '',
        itemsSupplied: editVendor.itemsSupplied?.length
          ? editVendor.itemsSupplied
          : [''],
      });
    } else {
      setForm(emptyForm);
    }
    setErrors({});
  }, [editVendor, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
    if (errors[name]) setErrors(p => ({ ...p, [name]: '' }));
  };

  // Items supplied dynamic list handlers
  const addItem    = () => setForm(p => ({ ...p, itemsSupplied: [...p.itemsSupplied, ''] }));
  const removeItem = (i) => setForm(p => ({ ...p, itemsSupplied: p.itemsSupplied.filter((_, idx) => idx !== i) }));
  const updateItem = (i, val) => setForm(p => ({
    ...p,
    itemsSupplied: p.itemsSupplied.map((item, idx) => idx === i ? val : item),
  }));

  const validate = () => {
    const e = {};
    if (!form.name.trim())          e.name          = 'Vendor name is required';
    if (!form.contactPerson.trim()) e.contactPerson = 'Contact person is required';
    if (!form.phone.trim())         e.phone         = 'Phone number is required';
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email';
    if (!form.category)             e.category      = 'Please select a category';
    if (!form.location.trim())      e.location      = 'Location is required';
    if (!form.leadTimeDays)         e.leadTimeDays  = 'Lead time is required';
    const validItems = form.itemsSupplied.filter(i => i.trim());
    if (!validItems.length)         e.items         = 'Add at least one item supplied';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    await new Promise(r => setTimeout(r, 700));

    const colorPair = vendorAvatarColors[Math.floor(Math.random() * vendorAvatarColors.length)];
    const initials  = form.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

    onSave({
      ...(editVendor ?? {}),
      ...form,
      id:             editVendor?.id          ?? Date.now(),
      initials,
      color:          editVendor?.color       ?? colorPair.color,
      textColor:      editVendor?.textColor   ?? colorPair.textColor,
      status:         editVendor?.status      ?? 'active',
      joinDate:       editVendor?.joinDate    ?? new Date().toISOString().slice(0, 10),
      totalOrders:    editVendor?.totalOrders ?? 0,
      totalPaid:      editVendor?.totalPaid   ?? 0,
      pendingAmount:  editVendor?.pendingAmount ?? 0,
      lastOrder:      editVendor?.lastOrder   ?? null,
      rating:         editVendor?.rating      ?? 4,
      orders:         editVendor?.orders      ?? [],
      leadTimeDays:   Number(form.leadTimeDays),
      itemsSupplied:  form.itemsSupplied.filter(i => i.trim()),
    });

    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
              <Truck size={17} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                {isEditing ? 'Edit Vendor' : 'Add New Vendor'}
              </h2>
              <p className="text-xs text-gray-400">
                {isEditing ? 'Update vendor details' : 'Add a supplier to your network'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 transition-all">
            <X size={17} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {/* Vendor name */}
          <Field label="Vendor / Business Name *" error={errors.name}>
            <Input name="name" value={form.name} onChange={handleChange}
              placeholder="e.g. Lagos Fashion Hub" error={errors.name} />
          </Field>

          {/* Contact person + phone */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Contact Person *" error={errors.contactPerson}>
              <Input name="contactPerson" value={form.contactPerson} onChange={handleChange}
                placeholder="e.g. Mr. Taiwo" error={errors.contactPerson} />
            </Field>
            <Field label="Phone Number *" error={errors.phone}>
              <Input name="phone" type="tel" value={form.phone} onChange={handleChange}
                placeholder="+234 800 000 0000" error={errors.phone} />
            </Field>
          </div>

          {/* Email + Location */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Email Address" error={errors.email}>
              <Input name="email" type="email" value={form.email} onChange={handleChange}
                placeholder="vendor@email.com" error={errors.email} />
            </Field>
            <Field label="Location *" error={errors.location}>
              <Input name="location" value={form.location} onChange={handleChange}
                placeholder="e.g. Yaba, Lagos" error={errors.location} />
            </Field>
          </div>

          {/* Category + Lead time */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Category *" error={errors.category}>
              <select name="category" value={form.category} onChange={handleChange}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium outline-none bg-white transition-all
                  ${errors.category ? 'border-red-300' : 'border-gray-200 focus:border-green-400 focus:ring-2 focus:ring-green-100'}`}>
                <option value="">Select category</option>
                {vendorCategories.filter(c => c !== 'All').map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Lead Time (days) *" error={errors.leadTimeDays}>
              <Input name="leadTimeDays" type="number" min="1" value={form.leadTimeDays}
                onChange={handleChange} placeholder="e.g. 3" error={errors.leadTimeDays} />
            </Field>
          </div>

          {/* Items supplied — dynamic list */}
          <Field label="Items Supplied *" error={errors.items}>
            <div className="space-y-2">
              {form.itemsSupplied.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={item}
                    onChange={e => updateItem(i, e.target.value)}
                    placeholder={`Item ${i + 1} (e.g. Ankara Gown)`}
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all"
                  />
                  {form.itemsSupplied.length > 1 && (
                    <button type="button" onClick={() => removeItem(i)}
                      className="w-9 h-9 flex items-center justify-center rounded-xl border border-red-200 text-red-400 hover:bg-red-50 transition-all flex-shrink-0">
                      <Minus size={14} />
                    </button>
                  )}
                </div>
              ))}
              <button type="button" onClick={addItem}
                className="flex items-center gap-2 text-xs font-semibold text-green-600 hover:text-green-700 transition-colors mt-1">
                <Plus size={13} /> Add another item
              </button>
            </div>
          </Field>

          {/* Note */}
          <Field label="Notes (optional)">
            <textarea name="note" value={form.note} onChange={handleChange}
              placeholder="Any special terms, payment conditions, notes..."
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all resize-none"
            />
          </Field>

          {/* Avatar preview */}
          {form.name && (
            <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold"
                style={{ background: editVendor?.color ?? '#dbeafe', color: editVendor?.textColor ?? '#1d4ed8' }}>
                {form.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800">{form.name}</p>
                <p className="text-xs text-gray-400">
                  {form.category || 'No category'} · {form.location || 'No location'}
                  {form.leadTimeDays ? ` · ${form.leadTimeDays}d lead time` : ''}
                </p>
              </div>
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
                  : <><Plus size={15} /> Add Vendor</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}