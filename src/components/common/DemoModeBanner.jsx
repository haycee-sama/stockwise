// src/components/common/DemoModeBanner.jsx
// A small, dismissible banner that appears at the top of protected pages
// when the app is running WITHOUT a configured Supabase backend.
//
// Purpose: be honest with the user — the data they see is mock data, the
// "login" is a demo login, mutations are not persisted, and refresh will
// reset the working state (in demo mode; Supabase mode persists).

import { useState } from 'react';
import { Info, X } from 'lucide-react';

export default function DemoModeBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 mb-4 animate-fade-up">
      <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
        <Info size={14} className="text-blue-600" />
      </div>
      <p className="text-xs text-blue-800 font-medium flex-1 min-w-0">
        <strong>Demo mode.</strong>{' '}
        Using mock data — changes are not persisted and refresh will reset
        the working state. Configure Supabase (see{' '}
        <code className="font-mono bg-blue-100 px-1 py-0.5 rounded text-blue-700">
          .env.local
        </code>) to enable real authentication and persistence.
      </p>
      <button
        onClick={() => setDismissed(true)}
        className="text-blue-400 hover:text-blue-700 transition-colors flex-shrink-0"
        aria-label="Dismiss demo mode banner"
      >
        <X size={14} />
      </button>
    </div>
  );
}
