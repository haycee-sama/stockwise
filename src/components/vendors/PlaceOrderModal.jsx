// src/components/vendors/PlaceOrderModal.jsx
import { useState } from 'react';
import { X, ShoppingCart, Loader2, Plus, Minus, Trash2, Package } from 'lucide-react';

const naira = (v) => `₦${Number(v).toLocaleString()}`;

// Module-level counter for PO IDs. Avoids `Math.random` inside
// the component body (react-hooks/purity rule) and is monotonic
// so retrying the same order placement cannot collide with a
// previous successful placement's ID within this session.
let __poCounter = 100;

export default function PlaceOrderModal({ isOpen, onClose, onSave, vendor }) {
  const [orderItems, setOrderItems] = useState([{ name: '', qty: 1, unitPrice: '' }]);
  const [note, setNote]             = useState('');
  const [errors, setErrors]         = useState({});
  const [saving, setSaving]         = useState(false);

  if (!isOpen || !vendor) return null;

  const addRow    = () => setOrderItems(p => [...p, { name: '', qty: 1, unitPrice: '' }]);
  const removeRow = (i) => setOrderItems(p => p.filter((_, idx) => idx !== i));
  const updateRow = (i, field, val) =>
    setOrderItems(p => p.map((row, idx) => idx === i ? { ...row, [field]: val } : row));

  const total = orderItems.reduce((s, row) => {
    const price = Number(row.unitPrice) || 0;
    const qty   = Number(row.qty) || 0;
    return s + price * qty;
  }, 0);

  const validate = () => {
    const e = {};
    const valid = orderItems.filter(r => r.name.trim() && r.qty > 0 && Number(r.unitPrice) > 0);
    if (!valid.length) e.items = 'Add at least one valid item with name, qty, and price';
    return e;
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    await new Promise(r => setTimeout(r, 800));

    // Build the validated line-items array once — used both for the
    // `items` count (display) and the `lineItems` payload (Supabase
    // insert). Without the array, the Supabase-backed placeOrder would
    // receive `items: <number>` and crash on `.filter()` inside the
    // service's line-item mapping step.
    const validItems = orderItems
      .filter(r => r.name.trim() && Number(r.qty) > 0 && Number(r.unitPrice) > 0)
      .map(r => ({
        name: r.name.trim(),
        qty: Number(r.qty),
        unitPrice: Number(r.unitPrice),
      }));

    const newOrder = {
      id:     `PO-${String(__poCounter++)}`,
      date:   new Date().toISOString().slice(0, 10),
      items:  validItems.length,
      lineItems: validItems,
      total,
      status: 'pending',
      note,
    };

    onSave(vendor.id, newOrder, total);
    setOrderItems([{ name: '', qty: 1, unitPrice: '' }]);
    setNote('');
    setErrors({});
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center">
              <ShoppingCart size={17} className="text-green-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                Place Order
              </h2>
              <p className="text-xs text-gray-400">
                Ordering from: <strong className="text-gray-700">{vendor.name}</strong>
                &nbsp;· Est. delivery: {vendor.leadTimeDays} day{vendor.leadTimeDays > 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 transition-all">
            <X size={17} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Vendor quick items (suggested from vendor profile) */}
          {vendor.itemsSupplied?.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                Quick Select (items from this vendor)
              </p>
              <div className="flex flex-wrap gap-2">
                {vendor.itemsSupplied.map(item => (
                  <button key={item} type="button"
                    onClick={() => {
                      // Add item to first empty row or new row
                      const emptyIdx = orderItems.findIndex(r => !r.name.trim());
                      if (emptyIdx >= 0) {
                        updateRow(emptyIdx, 'name', item);
                      } else {
                        setOrderItems(p => [...p, { name: item, qty: 1, unitPrice: '' }]);
                      }
                    }}
                    className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-lg hover:bg-blue-100 transition-all border border-blue-200">
                    + {item}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Order Items Table */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Order Items</p>
            <div className="space-y-2">
              {/* Column headers */}
              <div className="grid grid-cols-12 gap-2 px-1">
                <p className="col-span-5 text-[10px] font-bold text-gray-400 uppercase">Item Name</p>
                <p className="col-span-2 text-[10px] font-bold text-gray-400 uppercase text-center">Qty</p>
                <p className="col-span-3 text-[10px] font-bold text-gray-400 uppercase">Unit Price (₦)</p>
                <p className="col-span-2 text-[10px] font-bold text-gray-400 uppercase text-right">Total</p>
              </div>

              {orderItems.map((row, i) => {
                const rowTotal = (Number(row.qty) || 0) * (Number(row.unitPrice) || 0);
                return (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center bg-gray-50 rounded-xl p-2">
                    {/* Item name */}
                    <input value={row.name} onChange={e => updateRow(i, 'name', e.target.value)}
                      placeholder="Item name..."
                      className="col-span-5 px-2.5 py-2 text-xs rounded-lg border border-gray-200 outline-none focus:border-green-400 transition-all bg-white" />

                    {/* Qty stepper */}
                    <div className="col-span-2 flex items-center justify-center gap-1">
                      <button type="button" onClick={() => updateRow(i, 'qty', Math.max(1, row.qty - 1))}
                        className="w-6 h-6 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-all">
                        <Minus size={9} />
                      </button>
                      <span className="text-xs font-bold w-5 text-center">{row.qty}</span>
                      <button type="button" onClick={() => updateRow(i, 'qty', row.qty + 1)}
                        className="w-6 h-6 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-all">
                        <Plus size={9} />
                      </button>
                    </div>

                    {/* Unit price */}
                    <input value={row.unitPrice} onChange={e => updateRow(i, 'unitPrice', e.target.value)}
                      type="number" min="0" placeholder="0"
                      className="col-span-3 px-2.5 py-2 text-xs rounded-lg border border-gray-200 outline-none focus:border-green-400 transition-all bg-white" />

                    {/* Row total */}
                    <div className="col-span-2 flex items-center justify-end gap-1">
                      <span className="text-xs font-bold text-green-600">
                        {rowTotal > 0 ? naira(rowTotal) : '—'}
                      </span>
                      {orderItems.length > 1 && (
                        <button type="button" onClick={() => removeRow(i)}
                          className="w-5 h-5 flex items-center justify-center text-gray-300 hover:text-red-400 transition-colors ml-1">
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {errors.items && <p className="text-xs text-red-500 mt-2">⚠ {errors.items}</p>}

            <button type="button" onClick={addRow}
              className="flex items-center gap-2 text-xs font-semibold text-green-600 hover:text-green-700 mt-3 transition-colors">
              <Plus size={13} /> Add another item
            </button>
          </div>

          {/* Order Total */}
          <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-5 py-4">
            <span className="text-sm font-bold text-gray-700">Order Total</span>
            <span className="text-xl font-extrabold text-green-600">
              {naira(total)}
            </span>
          </div>

          {/* Note */}
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
              Note to Vendor (optional)
            </label>
            <textarea value={note} onChange={e => setNote(e.target.value)}
              placeholder="Any special delivery instructions..."
              rows={2}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all resize-none"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all">
              Cancel
            </button>
            <button type="button" onClick={handleSubmit} disabled={saving}
              className="flex-[2] py-2.5 rounded-xl bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-bold transition-all flex items-center justify-center gap-2">
              {saving
                ? <><Loader2 size={15} className="animate-spin" /> Placing Order...</>
                : <><Package size={15} /> Place Order · {naira(total)}</>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}