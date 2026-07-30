// src/components/expenses/CategoryBreakdown.jsx
import { useMemo } from 'react';
import {
  Package, Home, Truck, Zap,
  Megaphone, Users, MailOpen, Wrench,
} from 'lucide-react';
import { expenseCategories } from '../../data/mockData';

const iconMap = { Package, Home, Truck, Zap, Megaphone, Users, MailOpen, Wrench };

const naira = (v) => {
  if (!v && v !== 0) return '₦0';
  if (v >= 1000000) return `₦${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000)    return `₦${(v / 1000).toFixed(0)}K`;
  return `₦${v}`;
};

export default function CategoryBreakdown({ expenses }) {
  const breakdown = useMemo(() => {
    const totals = {};
    (expenses ?? []).forEach(e => {
      totals[e.category] = (totals[e.category] ?? 0) + (e.amount ?? 0);
    });
    const grandTotal = Object.values(totals).reduce((s, v) => s + v, 0);
    return expenseCategories
      .map(cat => ({
        ...cat,
        total: totals[cat.id] ?? 0,
        pct:   grandTotal > 0 ? ((totals[cat.id] ?? 0) / grandTotal) * 100 : 0,
      }))
      .filter(c => c.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [expenses]);

  const grandTotal = breakdown.reduce((s, c) => s + c.total, 0);

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm h-full">
      <div className="mb-5">
        <h3 className="text-base font-bold text-gray-900">
          Expense Breakdown
        </h3>
        <p className="text-xs text-gray-400 mt-0.5">By category</p>
      </div>

      {breakdown.length === 0 ? (
        <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
          No expenses recorded yet
        </div>
      ) : (
        <div className="space-y-4">
          {breakdown.map((cat, idx) => {
            const Icon = iconMap[cat.icon] ?? Wrench;
            return (
              <div key={cat.id}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: cat.bg }}>
                      <Icon size={14} style={{ color: cat.color }} />
                    </div>
                    <span className="text-sm font-semibold text-gray-700">{cat.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-400">{cat.pct.toFixed(1)}%</span>
                    <span className="text-sm font-extrabold text-gray-900">
                      {naira(cat.total)}
                    </span>
                  </div>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${cat.pct}%`, background: cat.color }}
                  />
                </div>
              </div>
            );
          })}

          {/* Total */}
          <div className="flex items-center justify-between pt-4 mt-2 border-t border-gray-100">
            <span className="text-sm font-bold text-gray-600">Total Recorded</span>
            <span className="text-lg font-extrabold text-gray-900">
              {naira(grandTotal)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}