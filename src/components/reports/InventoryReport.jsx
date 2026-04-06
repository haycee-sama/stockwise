// src/components/reports/InventoryReport.jsx
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { inventoryCategoryReport, topProductsReport } from '../../data/mockData';
import { TrendingUp, TrendingDown } from 'lucide-react';

const naira = (v) => {
  if (v >= 1000000) return `₦${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000)    return `₦${(v / 1000).toFixed(0)}K`;
  return `₦${v}`;
};

const stockHealth = [
  { name: 'In Stock',     value: 875, color: '#16a34a' },
  { name: 'Low Stock',    value: 263, color: '#f59e0b' },
  { name: 'Out of Stock', value: 110, color: '#ef4444' },
];

const slowMovers = [
  { name: 'Sun Hat',        sku: 'SKU-044', stock: 0,  lastSold: '2026-01-12', daysStale: 67 },
  { name: 'Polo Shirt (L)', sku: 'SKU-007', stock: 0,  lastSold: '2026-01-28', daysStale: 51 },
  { name: 'Stiletto Heels', sku: 'SKU-033', stock: 4,  lastSold: '2026-02-10', daysStale: 39 },
];

function DonutTip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 text-white px-3 py-2 rounded-xl text-xs shadow-xl">
      <strong>{payload[0].name}:</strong> {payload[0].value} items
    </div>
  );
}

export default function InventoryReport() {
  const totalItems = inventoryCategoryReport.reduce((s, c) => s + c.items, 0);
  const totalValue = inventoryCategoryReport.reduce((s, c) => s + c.value, 0);

  return (
    <div className="space-y-5">

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Items',      value: totalItems.toLocaleString(), color: 'text-blue-600',   bg: 'bg-blue-50'   },
          { label: 'Inventory Value',  value: naira(totalValue),           color: 'text-green-600',  bg: 'bg-green-50'  },
          { label: 'In Stock',         value: '875',                        color: 'text-emerald-600',bg: 'bg-emerald-50'},
          { label: 'Out of Stock',     value: '110',                        color: 'text-red-500',    bg: 'bg-red-50'    },
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
        {/* Category Breakdown Bars */}
        <div className="col-span-3 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h3 className="text-base font-bold text-gray-900 mb-1" style={{ fontFamily: 'sans-serif' }}>
            Inventory by Category
          </h3>
          <p className="text-xs text-gray-400 mb-5">Stock distribution & value per category</p>
          <div className="space-y-5">
            {inventoryCategoryReport.map(cat => {
              const pct = (cat.items / totalItems) * 100;
              return (
                <div key={cat.name}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ background: cat.color }} />
                      <span className="text-sm font-semibold text-gray-700">{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-gray-400">{cat.items} items</span>
                      <span className="text-sm font-bold text-gray-900">{naira(cat.value)}</span>
                    </div>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, background: cat.color }} />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">{pct.toFixed(1)}% of total inventory</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Stock Health Donut */}
        <div className="col-span-2 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h3 className="text-base font-bold text-gray-900 mb-1" style={{ fontFamily: 'sans-serif' }}>
            Stock Health
          </h3>
          <p className="text-xs text-gray-400 mb-2">Current inventory status</p>
          <div className="relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={stockHealth} cx="50%" cy="50%"
                  innerRadius={45} outerRadius={70} paddingAngle={3}
                  dataKey="value" strokeWidth={0}>
                  {stockHealth.map(e => <Cell key={e.name} fill={e.color} />)}
                </Pie>
                <Tooltip content={<DonutTip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute text-center pointer-events-none">
              <p className="text-lg font-extrabold text-gray-900" style={{ fontFamily: 'sans-serif' }}>
                1,248
              </p>
              <p className="text-[10px] text-gray-400">total</p>
            </div>
          </div>
          <div className="space-y-2.5 mt-2">
            {stockHealth.map(item => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                  <span className="text-xs text-gray-600 font-medium">{item.name}</span>
                </div>
                <span className="text-xs font-bold text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Fast vs Slow Movers */}
      <div className="grid grid-cols-2 gap-5">
        {/* Fast movers */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <span className="text-lg">🔥</span>
            <div>
              <h3 className="text-sm font-bold text-gray-900" style={{ fontFamily: 'sans-serif' }}>Fast Movers</h3>
              <p className="text-[11px] text-gray-400">Highest selling this period</p>
            </div>
          </div>
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100">
                {['Product', 'Sold', 'Growth'].map(h => (
                  <th key={h} className="text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 px-4 py-2.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topProductsReport.slice(0, 4).map(p => (
                <tr key={p.name} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <p className="text-xs font-semibold text-gray-800">{p.name}</p>
                    <p className="text-[10px] text-gray-400">{p.category}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-bold text-gray-700">{p.sold} units</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`flex items-center gap-1 text-[10px] font-bold w-fit px-1.5 py-0.5 rounded-md
                      ${p.growth >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-500'}`}>
                      {p.growth >= 0 ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                      {p.growth >= 0 ? '+' : ''}{p.growth}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Slow movers */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <span className="text-lg">🐢</span>
            <div>
              <h3 className="text-sm font-bold text-gray-900" style={{ fontFamily: 'sans-serif' }}>Slow / Dead Stock</h3>
              <p className="text-[11px] text-gray-400">Items with no recent sales</p>
            </div>
          </div>
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100">
                {['Product', 'Stock', 'Days Stale'].map(h => (
                  <th key={h} className="text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 px-4 py-2.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slowMovers.map(p => (
                <tr key={p.name} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <p className="text-xs font-semibold text-gray-800">{p.name}</p>
                    <p className="text-[10px] text-gray-400">{p.sku}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold ${p.stock === 0 ? 'text-red-500' : 'text-amber-600'}`}>
                      {p.stock === 0 ? 'Out' : p.stock}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-md
                      ${p.daysStale > 60 ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700'}`}>
                      {p.daysStale}d
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}