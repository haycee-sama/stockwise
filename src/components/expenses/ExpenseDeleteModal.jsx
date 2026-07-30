// src/components/expenses/ExpenseDeleteModal.jsx
import { Trash2 } from 'lucide-react';
import { expenseCategories } from '../../data/mockData';

export default function ExpenseDeleteModal({ isOpen, expense, onClose, onConfirm }) {
  if (!isOpen || !expense) return null;

  const cat = expenseCategories.find(c => c.id === expense.category);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Trash2 size={26} className="text-red-500" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 text-center mb-2">
          Delete Expense?
        </h3>
        <p className="text-sm text-gray-500 text-center mb-4 leading-relaxed">
          Are you sure you want to delete
        </p>
        {/* Expense preview */}
        <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 mb-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{ background: cat?.bg ?? '#f3f4f6' }}>
            {cat?.emoji ?? '🔧'}
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-gray-800">{expense.name}</p>
            <p className="text-xs text-gray-400">{cat?.label ?? 'Other'} · {expense.vendor}</p>
          </div>
          <p className="text-sm font-extrabold text-red-500">
            ₦{expense.amount?.toLocaleString()}
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all">
            Cancel
          </button>
          <button onClick={() => { onConfirm(expense.id); onClose(); }}
            className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-all">
            Yes, Delete
          </button>
        </div>
      </div>
    </div>
  );
}