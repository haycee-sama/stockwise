// src/components/expenses/ExpenseTrendChart.jsx
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { expenseTrend } from '../../data/mockData';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 text-white px-4 py-3 rounded-xl shadow-xl text-sm">
      <p className="font-bold mb-1 text-gray-300">{label}</p>
      <p className="font-extrabold text-red-400">
        ₦{payload[0].value.toLocaleString()}
      </p>
    </div>
  );
}

export default function ExpenseTrendChart() {
  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-bold text-gray-900">
            Monthly Trend
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">Last 6 months spend</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <div className="w-3 h-3 rounded-sm bg-red-400" />
          Expenses
        </div>
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={expenseTrend} barCategoryGap="35%">
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="month"
            axisLine={false} tickLine={false}
            tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 500 }}
          />
          <YAxis
            axisLine={false} tickLine={false}
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            tickFormatter={v => `₦${(v / 1000).toFixed(0)}K`}
            width={48}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#fef2f2', radius: 6 }} />
          <Bar dataKey="amount" fill="#f87171" radius={[6, 6, 0, 0]} name="Expenses" />
        </BarChart>
      </ResponsiveContainer>

      {/* Trend note */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 text-xs text-gray-400">
        <span>6-month average: <strong className="text-gray-700">
          ₦{(expenseTrend.reduce((s, m) => s + m.amount, 0) / expenseTrend.length / 1000).toFixed(0)}K
        </strong></span>
        <span className="text-red-500 font-semibold">↑ 4.7% vs last month</span>
      </div>
    </div>
  );
}