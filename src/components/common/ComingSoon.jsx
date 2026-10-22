// src/components/common/ComingSoon.jsx
// Lightweight placeholder page for routes whose feature is not yet
// implemented. Renders a branded card with the feature name and an
// explanatory note. No fake CTAs, no false success states.

import { Construction, ArrowLeft, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * @param {Object} props
 * @param {string} props.title        Feature name (e.g. "Settings")
 * @param {string} [props.description] Optional longer explanation.
 * @param {string} [props.backTo='/dashboard'] Where the back button goes.
 * @param {string} [props.backLabel='Back to Dashboard'] Back-button label.
 */
export default function ComingSoon({
  title,
  description,
  backTo = '/dashboard',
  backLabel = 'Back to Dashboard',
}) {
  const navigate = useNavigate();

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-gray-50 px-6 text-center">
      <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mb-6 animate-fade-up">
        <Construction size={28} className="text-amber-500" />
      </div>
      <p className="text-[11px] font-bold uppercase tracking-widest text-amber-500 mb-2 animate-fade-up">
        Coming soon
      </p>
      <h2 className="text-2xl font-bold text-gray-900 mb-3 animate-fade-up">
        {title}
      </h2>
      <p className="text-sm text-gray-500 mb-7 max-w-md animate-fade-up">
        {description ??
          'This feature is planned but not yet implemented. It will be wired up to the backend in a later phase.'}
      </p>
      <button
        onClick={() => navigate(backTo)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-all active:scale-95 animate-fade-up"
      >
        <ArrowLeft size={15} /> {backLabel}
      </button>
      <p className="text-[11px] text-gray-400 mt-8 max-w-md">
        Need this feature sooner? Reach out to the team. In the meantime,
        other pages are fully functional.{' '}
        <ArrowRight size={11} className="inline -mt-0.5" />
      </p>
    </div>
  );
}
