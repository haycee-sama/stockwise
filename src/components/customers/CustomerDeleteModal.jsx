// src/components/customers/CustomerDeleteModal.jsx
import { UserX, AlertTriangle } from 'lucide-react';
import { useModalBehavior } from '../../utils/useModalBehavior';

export default function CustomerDeleteModal({ isOpen, customer, onClose, onConfirm }) {
  // Modal accessibility: Escape-to-close + backdrop-click-to-close.
  const { onKeyDown, onBackdropClick } = useModalBehavior(isOpen, onClose);

  if (!isOpen || !customer) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="customer-delete-modal-title"
      onKeyDown={onKeyDown}
      onClick={onBackdropClick}
    >
      <div className="bg-white w-full sm:rounded-2xl sm:max-w-sm shadow-2xl rounded-t-2xl animate-fade-up">
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>
        <div className="p-6">
          <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <UserX size={24} className="text-red-500" />
          </div>
          <h3 id="customer-delete-modal-title" className="text-base font-bold text-gray-900 text-center mb-4">
            Remove {customer.firstName} {customer.lastName}?
          </h3>
          {customer.totalOrders > 0 && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 mb-5">
              <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 font-medium">
                This customer has {customer.totalOrders} order{customer.totalOrders > 1 ? 's' : ''} on record. Their order history will be preserved.
              </p>
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all">
              Cancel
            </button>
            <button onClick={() => { onConfirm(customer.id); onClose(); }}
              className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-all active:scale-95">
              Remove
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}