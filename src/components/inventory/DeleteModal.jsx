// src/components/inventory/DeleteModal.jsx
import { Trash2, X, AlertTriangle } from 'lucide-react';
import { ItemIcon } from '../../utils/inventoryIcons';

export default function DeleteModal({ isOpen, item, onClose, onConfirm }) {
  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full sm:rounded-2xl sm:max-w-sm shadow-2xl rounded-t-2xl animate-fade-up">

        {/* Handle bar (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        <div className="p-6">
          {/* Icon */}
          <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Trash2 size={24} className="text-red-500" />
          </div>

          <h3 className="text-base font-bold text-gray-900 text-center mb-2">
            Delete Item?
          </h3>

          {/* Item preview card */}
          <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 mb-4">
            <ItemIcon iconName={item.iconName} bg={item.bg} size={18}
              className="w-10 h-10" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-800 truncate">{item.name}</p>
              <p className="text-[11px] text-gray-400">{item.sku} · {item.category}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-bold text-gray-900">{item.stock}</p>
              <p className="text-[10px] text-gray-400">in stock</p>
            </div>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 mb-5">
            <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 font-medium">
              This action cannot be undone. All stock data for this item will be permanently removed.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all">
              Cancel
            </button>
            <button onClick={() => { onConfirm(item.id); onClose(); }}
              className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-all active:scale-95 flex items-center justify-center gap-2">
              <Trash2 size={14} /> Delete Item
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}