// src/components/reports/CustomerReport.jsx
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { customerAcquisitionData, customerTypeBreakdown, customersData } from '../../data/mockData';

const naira = (v) => {
  if (v >= 1000000) return `₦${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000)    return `₦${(v / 1000).toFixed(0)}K`;
  return `₦${v}`;
};

function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 text-white px-4 py-3 rounded-xl shadow-xl text-xs">
      <p className="font-bold mb-2 text-gray-300">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full" style={{ background: p.fill }} />
          <span className="text-gray-400 capitalize">{p.name}:</span>
          <span className="font-bold ml-1">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

function DonutTip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 text-white px-3 py-2 rounded-xl text-xs shadow-xl">
      <strong>{payload[0].name}:</strong> {payload[0].value}%
    </div>
  );
}

export default function CustomerReport() {
  // Sort customers by total spent
  const topCustomers = [...customersData].sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 5);

  const totalRevenue  = customersData.reduce((s, c) => s + c.totalSpent, 0);
  const totalOrders   = customersData.reduce((s, c) => s + c.totalOrders, 0);
  const avgLifetime   = Math.round(totalRevenue / customersData.length);
  const retentionRate = Math.round((customersData.filter(c => c.totalOrders > 1).length / customersData.length) * 100);

  return (
    <div className="space-y-5">

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Customers',   value: customersData.length,     color: 'text-blue-600',   bg: 'bg-blue-50'   },
          { label: 'Total Revenue',     value: naira(totalRevenue),      color: 'text-green-600',  bg: 'bg-green-50'  },
          { label: 'Avg. Lifetime Val', value: naira(avgLifetime),       color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Retention Rate',    value: `${retentionRate}%`,      color: 'text-amber-600',  bg: 'bg-amber-50'  },
        ].map(kpi => (
          <div key={kpi.label} className={`${kpi.bg} rounded-2xl p-4 text-center`}>
            <p className={`text-xl font-extrabold ${kpi.color}`} style={{ fontFamily: 'sans-serif' }}>
              {kpi.value}
            </p>
            <p className="text-xs text-gray-500 font-medium mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-5 gap-5">
        {/* Acquisition trend chart */}
        <div className="col-span-3 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h3 className="text-base font-bold text-gray-900 mb-1" style={{ fontFamily: 'sans-serif' }}>
            Customer Acquisition
          </h3>
          <p className="text-xs text-gray-400 mb-5">New vs returning customers per month</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={customerAcquisitionData} barGap={4} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="month" axisLine={false} tickLine={false}
                tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 500 }} />
              <YAxis axisLine={false} tickLine={false}
                tick={{ fontSize: 10, fill: '#94a3b8' }} width={28} />
              <Tooltip content={<ChartTip />} cursor={{ fill: '#f8fafc', radius: 4 }} />
              <Bar dataKey="newCustomers" fill="#16a34a" radius={[4, 4, 0, 0]} name="newCustomers" />
              <Bar dataKey="returning"    fill="#dcfce7" radius={[4, 4, 0, 0]} name="returning"    />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-5 mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <div className="w-3 h-3 rounded-sm bg-green-600" /> New
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <div className="w-3 h-3 rounded-sm bg-green-100" /> Returning
            </div>
          </div>
        </div>

        {/* Customer type donut */}
        <div className="col-span-2 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h3 className="text-base font-bold text-gray-900 mb-1" style={{ fontFamily: 'sans-serif' }}>
            Customer Types
          </h3>
          <p className="text-xs text-gray-400 mb-2">Breakdown by business type</p>
          <div className="relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height={155}>
              <PieChart>
                <Pie data={customerTypeBreakdown} cx="50%" cy="50%"
                  innerRadius={42} outerRadius={65} paddingAngle={3}
                  dataKey="value" strokeWidth={0}>
                  {customerTypeBreakdown.map(e => <Cell key={e.name} fill={e.color} />)}
                </Pie>
                <Tooltip content={<DonutTip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-1">
            {customerTypeBreakdown.map(item => (
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

      {/* Top Customers Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900" style={{ fontFamily: 'sans-serif' }}>
            Top Customers by Revenue
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">Highest lifetime value customers</p>
        </div>
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-100">
              {['#', 'Customer', 'Type', 'Location', 'Orders', 'Total Spent', 'Status'].map(h => (
                <th key={h} className="text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {topCustomers.map((c, i) => (
              <tr key={c.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3.5">
                  <span className="text-xs font-bold text-gray-300">{i + 1}</span>
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ background: c.color, color: c.textColor }}>
                      {c.initials}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-800">{c.firstName} {c.lastName}</p>
                      <p className="text-[10px] text-gray-400">{c.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <span className="text-xs font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md">{c.type}</span>
                </td>
                <td className="px-4 py-3.5">
                  <span className="text-xs text-gray-500">{c.location}</span>
                </td>
                <td className="px-4 py-3.5">
                  <span className="text-sm font-bold text-gray-700">{c.totalOrders}</span>
                </td>
                <td className="px-4 py-3.5">
                  <span className="text-sm font-extrabold text-green-600">{naira(c.totalSpent)}</span>
                </td>
                <td className="px-4 py-3.5">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-lg capitalize
                    ${c.status === 'active' ? 'bg-green-100 text-green-700'
                    : c.status === 'new'    ? 'bg-blue-100  text-blue-700'
                    : c.status === 'owing'  ? 'bg-amber-100 text-amber-700'
                    :                        'bg-gray-100  text-gray-500'}`}>
                    {c.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}