// src/components/dashboard/RevenueChart.jsx
import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { revenueData } from '../../data/mockData';
import { TrendingUp } from 'lucide-react';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const formatK = (v) => v >= 1000 ? `₦${(v / 1000).toFixed(0)}K` : `₦${v}`;
  return (
    <div className="bg-gray-900 text-white px-4 py-3 rounded-xl shadow-xl text-sm border border-white/10">
      <p className="font-bold text-gray-300 mb-2 text-xs">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.fill }} />
          <span className="text-gray-400 text-xs capitalize">
            {p.name === 'thisWeek' ? 'This week' : 'Last week'}:
          </span>
          <span className="font-bold text-xs ml-1">{formatK(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export default function RevenueChart() {
  const [period, setPeriod] = useState('week');

  const total     = revenueData.reduce((s, d) => s + d.thisWeek, 0);
  const lastTotal = revenueData.reduce((s, d) => s + d.lastWeek, 0);
  const growth    = (((total - lastTotal) / lastTotal) * 100).toFixed(1);

  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100 shadow-sm animate-fade-up delay-200">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <h3 className="text-sm font-bold text-gray-900">
            Revenue Overview
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">Sales performance vs previous period</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Growth tag */}
          <div className="flex items-center gap-1 bg-green-50 text-green-700 text-xs font-bold px-2.5 py-1 rounded-lg">
            <TrendingUp size={11} /> +{growth}%
          </div>
          {/* Period toggle */}
          <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
            {['week', 'month'].map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all capitalize
                  ${period === p
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-400 hover:text-gray-600'
                  }`}>
                {p === 'week' ? 'Week' : 'Month'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={190}>
        <BarChart data={revenueData} barGap={3} barCategoryGap="28%">
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="day" axisLine={false} tickLine={false}
            tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 500 }} />
          <YAxis axisLine={false} tickLine={false}
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            tickFormatter={v => `₦${(v / 1000).toFixed(0)}K`} width={46} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc', radius: 4 }} />
          <Bar dataKey="thisWeek" fill="#16a34a" radius={[5, 5, 0, 0]} name="thisWeek" />
          <Bar dataKey="lastWeek" fill="#dcfce7" radius={[5, 5, 0, 0]} name="lastWeek" />
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <div className="w-3 h-2 rounded-sm bg-green-600" /> This week
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <div className="w-3 h-2 rounded-sm bg-green-100" /> Last week
          </div>
        </div>
        <p className="text-xs font-bold text-gray-700">
          Total: <span className="text-green-600">₦{(total / 1000000).toFixed(1)}M</span>
        </p>
      </div>
    </div>
  );
}