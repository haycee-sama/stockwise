// src/components/vendors/VendorDeleteModal.jsx
import { Truck, X } from 'lucide-react';

export default function VendorDeleteModal({ isOpen, vendor, onClose, onConfirm }) {
  if (!isOpen || !vendor) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Truck size={26} className="text-red-500" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 text-center mb-2">
          Remove Vendor?
        </h3>
        <p className="text-sm text-gray-500 text-center mb-1 leading-relaxed">
          Are you sure you want to remove
        </p>
        <p className="text-sm font-bold text-gray-800 text-center mb-5">
          {vendor.name}?
        </p>
        {vendor.pendingAmount > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5">
            <p className="text-xs text-amber-700 text-center font-medium">
              This vendor has a pending balance of ₦{vendor.pendingAmount.toLocaleString()}.
              Make sure all payments are settled first.
            </p>
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all">
            Cancel
          </button>
          <button onClick={() => { onConfirm(vendor.id); onClose(); }}
            className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-all">
            Yes, Remove
          </button>
        </div>
      </div>
    </div>
  );
}