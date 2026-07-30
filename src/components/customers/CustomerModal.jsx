// src/components/customers/CustomerModal.jsx
import { useState, useEffect } from 'react';
import { X, Users, Loader2, CheckCircle, Phone, Mail, MapPin, Building2 } from 'lucide-react';
import { customerTypes, avatarColors } from '../../data/mockData';

function Field({ label, required, error, children }) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {error && (
        <p className="mt-1 text-[11px] text-red-500 flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-red-100 text-red-500 text-[8px] font-bold flex items-center justify-center flex-shrink-0">!</span>
          {error}
        </p>
      )}
    </div>
  );
}

function Input({ error, icon: Icon, ...props }) {
  return (
    <div className="relative">
      {Icon && (
        <Icon size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      )}
      <input
        {...props}
        className={`w-full ${Icon ? 'pl-9' : 'pl-3.5'} pr-3.5 py-2.5 rounded-xl border text-sm font-medium outline-none transition-all
          ${error
            ? 'border-red-300 bg-red-50 focus:border-red-400 focus:ring-2 focus:ring-red-100'
            : 'border-gray-200 bg-white focus:border-green-400 focus:ring-2 focus:ring-green-100'
          }`}
      />
    </div>
  );
}

const emptyForm = {
  firstName: '', lastName: '', email: '',
  phone: '', type: '', location: '', note: '',
};

export default function CustomerModal({ isOpen, onClose, onSave, editCustomer }) {
  const [form, setForm]     = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const isEditing = !!editCustomer;

  useEffect(() => {
    if (editCustomer) {
      setForm({
        firstName: editCustomer.firstName ?? '',
        lastName:  editCustomer.lastName  ?? '',
        email:     editCustomer.email     ?? '',
        phone:     editCustomer.phone     ?? '',
        type:      editCustomer.type      ?? '',
        location:  editCustomer.location  ?? '',
        note:      editCustomer.note      ?? '',
      });
    } else {
      setForm(emptyForm);
    }
    setErrors({});
  }, [editCustomer, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
    if (errors[name]) setErrors(p => ({ ...p, [name]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = 'First name is required';
    if (!form.lastName.trim())  e.lastName  = 'Last name is required';
    if (!form.phone.trim())     e.phone     = 'Phone number is required';
    else if (!/^[0-9+\s\-]{7,15}$/.test(form.phone)) e.phone = 'Enter a valid phone number';
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email';
    if (!form.type)             e.type     = 'Please select a customer type';
    if (!form.location.trim())  e.location = 'Location is required';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    await new Promise(r => setTimeout(r, 700));
    const colorPair = avatarColors[Math.floor(Math.random() * avatarColors.length)];
    const initials  = `${form.firstName[0]}${form.lastName[0]}`.toUpperCase();
    onSave({
      ...(editCustomer ?? {}),
      ...form,
      id:          editCustomer?.id          ?? Date.now(),
      initials,
      color:       editCustomer?.color       ?? colorPair.color,
      textColor:   editCustomer?.textColor   ?? colorPair.textColor,
      status:      editCustomer?.status      ?? 'new',
      joinDate:    editCustomer?.joinDate    ?? new Date().toISOString().slice(0, 10),
      totalSpent:  editCustomer?.totalSpent  ?? 0,
      totalOrders: editCustomer?.totalOrders ?? 0,
      lastOrder:   editCustomer?.lastOrder   ?? null,
      orders:      editCustomer?.orders      ?? [],
    });
    setSaving(false);
    onClose();
  };

  const initials = `${form.firstName?.[0] ?? ''}${form.lastName?.[0] ?? ''}`.toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full sm:rounded-2xl sm:max-w-lg shadow-2xl rounded-t-2xl animate-fade-up"
        style={{ maxHeight: '95vh', display: 'flex', flexDirection: 'column' }}>

        {/* Handle */}
        <div className="flex justify-center pt-3 sm:hidden flex-shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
              <Users size={17} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">
                {isEditing ? 'Edit Customer' : 'Add Customer'}
              </h2>
              <p className="text-[11px] text-gray-400">
                {isEditing ? 'Update customer details' : 'Add to your contact list'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 transition-all">
            <X size={17} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-5 space-y-4">

            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="First Name" required error={errors.firstName}>
                <Input name="firstName" value={form.firstName} onChange={handleChange}
                  placeholder="Amaka" error={errors.firstName} />
              </Field>
              <Field label="Last Name" required error={errors.lastName}>
                <Input name="lastName" value={form.lastName} onChange={handleChange}
                  placeholder="Okonkwo" error={errors.lastName} />
              </Field>
            </div>

            {/* Contact row */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Phone" required error={errors.phone}>
                <Input name="phone" type="tel" value={form.phone} onChange={handleChange}
                  placeholder="+234 800 000 0000" error={errors.phone} icon={Phone} />
              </Field>
              <Field label="Email" error={errors.email}>
                <Input name="email" type="email" value={form.email} onChange={handleChange}
                  placeholder="email@example.com" error={errors.email} icon={Mail} />
              </Field>
            </div>

            {/* Type + Location */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Customer Type" required error={errors.type}>
                <select name="type" value={form.type} onChange={handleChange}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium outline-none bg-white transition-all
                    ${errors.type ? 'border-red-300' : 'border-gray-200 focus:border-green-400 focus:ring-2 focus:ring-green-100'}`}>
                  <option value="">Select type...</option>
                  {customerTypes.filter(t => t !== 'All').map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </Field>
              <Field label="Location" required error={errors.location}>
                <Input name="location" value={form.location} onChange={handleChange}
                  placeholder="City, State" error={errors.location} icon={MapPin} />
              </Field>
            </div>

            {/* Note */}
            <Field label="Notes (optional)">
              <textarea name="note" value={form.note} onChange={handleChange}
                placeholder="Special notes about this customer..."
                rows={2}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all resize-none" />
            </Field>

            {/* Preview */}
            {(form.firstName || form.lastName) && (
              <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 border border-gray-200">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{ background: editCustomer?.color ?? '#dcfce7', color: editCustomer?.textColor ?? '#15803d' }}>
                  {initials || '??'}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800">{form.firstName} {form.lastName}</p>
                  <p className="text-[11px] text-gray-400">
                    {form.type || 'Customer'} · {form.location || 'No location set'}
                  </p>
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all">
                Cancel
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-bold transition-all active:scale-95 flex items-center justify-center gap-2">
                {saving
                  ? <><Loader2 size={15} className="animate-spin" /> Saving...</>
                  : isEditing
                    ? <><CheckCircle size={15} /> Save Changes</>
                    : <><Users size={15} /> Add Customer</>
                }
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}