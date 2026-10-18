// src/components/common/ResourceState.jsx
// Shared loading + error + empty states for service-backed page
// components. Reduces duplication across the 7 page migrations.

import { Loader2, AlertCircle, Package } from 'lucide-react';

export function LoadingState({ label = 'Loading…' }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-20 text-gray-500">
      <Loader2 size={28} className="animate-spin text-green-500 mb-3" />
      <p className="text-sm font-semibold">{label}</p>
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-red-100 shadow-sm text-center px-6 animate-fade-up">
      <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mb-4">
        <AlertCircle size={26} className="text-red-500" />
      </div>
      <h3 className="text-base font-bold text-gray-700 mb-2">Something went wrong</h3>
      <p className="text-sm text-gray-500 mb-1 max-w-md">
        {error?.message ?? 'Could not load this data.'}
      </p>
      {error?.code && (
        <p className="text-[11px] text-gray-400 font-mono mb-5 max-w-md break-words">
          code: {error.code}
        </p>
      )}
      {onRetry && (
        <button onClick={onRetry}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-all active:scale-95">
          Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState({ icon: Icon = Package, title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm text-center animate-fade-up">
      <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Icon size={28} className="text-gray-400" />
      </div>
      <h3 className="text-base font-bold text-gray-700 mb-2">{title}</h3>
      <p className="text-sm text-gray-400 mb-6 max-w-xs">{message}</p>
      {action}
    </div>
  );
}
