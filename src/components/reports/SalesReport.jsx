// src/components/reports/SalesReport.jsx
import { useMemo } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import {
  salesTrendData, paymentBreakdown, topProductsReport,
} from '../../data/mockData';
import { TrendingUp, TrendingDown } from 'lucide-react';

const naira = (v) => {
  if (v >= 1000000) return `₦${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000)    return `₦${(v / 1000).toFixed(0)}K`;
  return `₦${v}`;
};

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 text-white px-4 py-3 rounded-xl shadow-xl text-xs">
      <p className="font-bold mb-2 text-gray-300">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-400 capitalize">{p.name}:</span>
          <span className="font-bold ml-1">
            {p.name === 'orders' ? p.value : naira(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

function DonutTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 text-white px-3 py-2 rounded-xl text-xs shadow-xl">
      <span className="font-bold">{payload[0].name}: </span>
      <span>{payload[0].value}%</span>
    </div>
  );
}

export default function SalesReport() {
  const totals = useMemo(() => ({
    revenue:    salesTrendData.reduce((s, m) => s + m.revenue, 0),
    profit:     salesTrendData.reduce((s, m) => s + m.profit, 0),
    orders:     salesTrendData.reduce((s, m) => s + m.orders, 0),
    avgOrder:   Math.round(salesTrendData.reduce((s, m) => s + m.revenue, 0) /
                           salesTrendData.reduce((s, m) => s + m.orders, 0)),
    margin:     Math.round((salesTrendData.reduce((s, m) => s + m.profit, 0) /
                            salesTrendData.reduce((s, m) => s + m.revenue, 0)) * 100),
  }), []);

  // Month-over-month growth
  const lastTwo  = salesTrendData.slice(-2);
  const momGrowth = lastTwo.length === 2
    ? (((lastTwo[1].revenue - lastTwo[0].revenue) / lastTwo[0].revenue) * 100).toFixed(1)
    : 0;

  return (
    <div className="space-y-5">

      {/* KPI row */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: 'Total Revenue',  value: naira(totals.revenue), color: 'text-green-600', bg: 'bg-green-50'  },
          { label: 'Total Profit',   value: naira(totals.profit),  color: 'text-blue-600',  bg: 'bg-blue-50'   },
          { label: 'Total Orders',   value: totals.orders,          color: 'text-purple-600',bg: 'bg-purple-50' },
          { label: 'Avg. Order',     value: naira(totals.avgOrder), color: 'text-amber-600', bg: 'bg-amber-50'  },
          { label: 'Profit Margin',  value: `${totals.margin}%`,   color: 'text-emerald-600',bg: 'bg-emerald-50'},
        ].map(kpi => (
          <div key={kpi.label} className={`${kpi.bg} rounded-2xl p-4 text-center border border-white`}>
            <p className={`text-xl font-extrabold ${kpi.color}`} style={{ fontFamily: 'sans-serif' }}>
              {kpi.value}
            </p>
            <p className="text-xs text-gray-500 font-medium mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Revenue + Profit Line Chart */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-bold text-gray-900" style={{ fontFamily: 'sans-serif' }}>
              Revenue & Profit Trend
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">6-month performance overview</p>
          </div>
          <div className={`flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-xl
            ${Number(momGrowth) >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
            {Number(momGrowth) >= 0
              ? <TrendingUp size={14} />
              : <TrendingDown size={14} />
            }
            {momGrowth}% MoM
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={salesTrendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="month" axisLine={false} tickLine={false}
              tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 500 }} />
            <YAxis axisLine={false} tickLine={false}
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              tickFormatter={v => `₦${(v / 1000).toFixed(0)}K`} width={52} />
            <Tooltip content={<ChartTooltip />} />
            <Line type="monotone" dataKey="revenue" stroke="#16a34a" strokeWidth={2.5}
              dot={{ fill: '#16a34a', r: 4 }} name="revenue" />
            <Line type="monotone" dataKey="profit"  stroke="#3b82f6" strokeWidth={2.5}
              dot={{ fill: '#3b82f6', r: 4 }} strokeDasharray="5 3" name="profit" />
          </LineChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-5 mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <div className="w-6 h-0.5 bg-green-500 rounded" /> Revenue
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <div className="w-6 h-0.5 bg-blue-500 rounded border-dashed" style={{ borderTop: '2px dashed #3b82f6' }} /> Profit
          </div>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-5">
        {/* Top Products Table */}
        <div className="col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-base font-bold text-gray-900" style={{ fontFamily: 'sans-serif' }}>
              Top Selling Products
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">By revenue this period</p>
          </div>
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100">
                {['#', 'Product', 'Sold', 'Revenue', 'Growth'].map(h => (
                  <th key={h} className="text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topProductsReport.map((p, i) => (
                <tr key={p.name} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="text-xs font-bold text-gray-300">{i + 1}</span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-semibold text-gray-800">{p.name}</p>
                    <p className="text-[11px] text-gray-400">{p.category}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-bold text-gray-700">{p.sold}</span>
                    <span className="text-[11px] text-gray-400 ml-1">units</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-bold text-green-600">{naira(p.revenue)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`flex items-center gap-1 text-xs font-bold w-fit px-2 py-0.5 rounded-lg
                      ${p.growth >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                      {p.growth >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                      {p.growth >= 0 ? '+' : ''}{p.growth}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Payment Breakdown Donut */}
        <div className="col-span-2 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h3 className="text-base font-bold text-gray-900 mb-1" style={{ fontFamily: 'sans-serif' }}>
            Payment Methods
          </h3>
          <p className="text-xs text-gray-400 mb-4">Breakdown by method</p>
          <div className="relative flex items-center justify-center mb-4">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={paymentBreakdown} cx="50%" cy="50%"
                  innerRadius={45} outerRadius={70} paddingAngle={3}
                  dataKey="value" strokeWidth={0}>
                  {paymentBreakdown.map(e => <Cell key={e.name} fill={e.color} />)}
                </Pie>
                <Tooltip content={<DonutTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2.5">
            {paymentBreakdown.map(item => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                  <span className="text-xs text-gray-600 font-medium">{item.name}</span>
                </div>
                <span className="text-xs font-bold text-gray-900">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}