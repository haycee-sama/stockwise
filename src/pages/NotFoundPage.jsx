// src/pages/NotFoundPage.jsx
// Proper 404 page — replaces the silent catch-all redirect to /dashboard
// (P3-008 fix). Shows a friendly message and offers a way back.

import { useNavigate } from 'react-router-dom';
import { Compass, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-gray-50 px-6 text-center">
      <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mb-6 animate-fade-up">
        <Compass size={28} className="text-amber-500" />
      </div>
      <p className="text-5xl font-extrabold text-gray-900 mb-2 animate-fade-up">404</p>
      <h2 className="text-xl font-bold text-gray-900 mb-2 animate-fade-up">Page not found</h2>
      <p className="text-sm text-gray-500 mb-7 max-w-md animate-fade-up">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
        Head back to the dashboard to continue.
      </p>
      <button
        onClick={() => navigate('/dashboard')}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-all active:scale-95 animate-fade-up"
      >
        <ArrowLeft size={15} /> Back to Dashboard
      </button>
    </div>
  );
}
