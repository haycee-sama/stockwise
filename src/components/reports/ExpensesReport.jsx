// src/components/reports/ExpensesReport.jsx
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { expenseTrend, expenseCategoryReport, expensesData } from '../../data/mockData';

const naira = (v) => {
  if (v >= 1000000) return `₦${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000)    return `₦${(v / 1000).toFixed(0)}K`;
  return `₦${v}`;
};

function AreaTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 text-white px-4 py-3 rounded-xl shadow-xl text-xs">
      <p className="font-bold mb-1 text-gray-300">{label}</p>
      <p className="text-red-400 font-extrabold">₦{payload[0].value.toLocaleString()}</p>
    </div>
  );
}

export default function ExpensesReport() {
  const totalExpenses = expenseCategoryReport.reduce((s, c) => s + c.amount, 0);
  const totalRevenue  = 2400000; // from mockData
  const profitMargin  = (((totalRevenue - totalExpenses) / totalRevenue) * 100).toFixed(1);

  // Biggest individual expenses
  const biggestExpenses = [...expensesData].sort((a, b) => b.amount - a.amount).slice(0, 5);

  return (
    <div className="space-y-5">

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Expenses',  value: naira(totalExpenses), color: 'text-red-500',     bg: 'bg-red-50'     },
          { label: 'This Month',      value: '₦184.7K',            color: 'text-orange-600',  bg: 'bg-orange-50'  },
          { label: 'Profit Margin',   value: `${profitMargin}%`,   color: 'text-green-600',   bg: 'bg-green-50'   },
          { label: 'Transactions',    value: expensesData.length,  color: 'text-purple-600',  bg: 'bg-purple-50'  },
        ].map(kpi => (
          <div key={kpi.label} className={`${kpi.bg} rounded-2xl p-4 text-center`}>
            <p className={`text-xl font-extrabold ${kpi.color}`} style={{ fontFamily: 'sans-serif' }}>
              {kpi.value}
            </p>
            <p className="text-xs text-gray-500 font-medium mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Area Chart */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <h3 className="text-base font-bold text-gray-900 mb-1" style={{ fontFamily: 'sans-serif' }}>
          Monthly Expense Trend
        </h3>
        <p className="text-xs text-gray-400 mb-5">6-month spend overview</p>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={expenseTrend}>
            <defs>
              <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}    />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="month" axisLine={false} tickLine={false}
              tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 500 }} />
            <YAxis axisLine={false} tickLine={false}
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              tickFormatter={v => `₦${(v / 1000).toFixed(0)}K`} width={52} />
            <Tooltip content={<AreaTip />} />
            <Area type="monotone" dataKey="amount" stroke="#ef4444" strokeWidth={2.5}
              fill="url(#expGrad)" dot={{ fill: '#ef4444', r: 4 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-5 gap-5">
        {/* Category breakdown */}
        <div className="col-span-3 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h3 className="text-base font-bold text-gray-900 mb-1" style={{ fontFamily: 'sans-serif' }}>
            Expense by Category
          </h3>
          <p className="text-xs text-gray-400 mb-5">Where your money goes</p>
          <div className="space-y-4">
            {expenseCategoryReport.map(cat => (
              <div key={cat.name}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-semibold text-gray-700">{cat.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-400">{cat.pct}%</span>
                    <span className="text-sm font-extrabold text-gray-900" style={{ fontFamily: 'sans-serif' }}>
                      {naira(cat.amount)}
                    </span>
                  </div>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${cat.pct}%`, background: cat.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Biggest individual expenses */}
        <div className="col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900" style={{ fontFamily: 'sans-serif' }}>
              Largest Expenses
            </h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Top 5 single transactions</p>
          </div>
          <div className="divide-y divide-gray-50">
            {biggestExpenses.map((e, i) => (
              <div key={e.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                <span className="text-xs font-bold text-gray-300 w-4">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 truncate">{e.name}</p>
                  <p className="text-[10px] text-gray-400">{e.vendor}</p>
                </div>
                <p className="text-xs font-extrabold text-red-500 flex-shrink-0">
                  ₦{e.amount.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}