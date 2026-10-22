// src/components/dashboard/StatCard.jsx
import { TrendingUp, TrendingDown } from 'lucide-react';

function formatValue(value, type) {
  if (type === 'currency') {
    if (value >= 1000000) return `₦${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000)    return `₦${(value / 1000).toFixed(0)}K`;
    return `₦${value.toLocaleString()}`;
  }
  if (type === 'number') return value.toLocaleString();
  return value;
}

// Mini sparkline bars — decorative trend indicator
function Sparkline({ positive }) {
  const heights = positive
    ? [3, 5, 4, 7, 6, 9, 8, 11, 10, 13]
    : [12, 10, 11, 8, 9, 6, 7, 4, 5, 3];
  return (
    <div className="flex items-end gap-0.5 h-8">
      {heights.map((h, i) => (
        <div
          key={i}
          className={`w-1 rounded-sm transition-all ${positive ? 'bg-green-200' : 'bg-red-200'}`}
          style={{ height: `${h * 2}px`, opacity: 0.6 + (i / heights.length) * 0.4 }}
        />
      ))}
    </div>
  );
}

export default function StatCard({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  value,
  valueType = 'number',
  change,
  changeLabel,
  animDelay = '0s',
}) {
  const isPositive = change >= 0;

  return (
    <div
      className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 animate-fade-up overflow-hidden relative"
      style={{ animationDelay: animDelay }}
    >
      {/* Top row */}
      <div className="flex items-start justify-between mb-3">
        {/* Icon */}
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          {Icon && <Icon size={20} className={iconColor} />}
        </div>

        {/* Change badge */}
        <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg
          ${isPositive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
          {isPositive
            ? <TrendingUp size={11} />
            : <TrendingDown size={11} />
          }
          {isPositive ? '+' : ''}{change}%
        </div>
      </div>

      {/* Value */}
      <div className="mb-1">
        <p className="text-[28px] font-extrabold text-gray-900 leading-none animate-fade-up"
          style={{ fontFamily: 'sans-serif', animationDelay: animDelay }}>
          {formatValue(value, valueType)}
        </p>
      </div>

      {/* Label */}
      <p className="text-xs font-medium text-gray-400 mb-3">{label}</p>

      {/* Sparkline + change label row */}
      <div className="flex items-end justify-between">
        <p className={`text-[11px] font-semibold ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
          {changeLabel}
        </p>
        <Sparkline positive={isPositive} />
      </div>
    </div>
  );
}