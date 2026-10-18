// src/components/dashboard/TopSellersTable.jsx
import { ArrowRight, TrendingUp, TrendingDown, ShoppingBag } from 'lucide-react';
import { topSellers } from '../../data/mockData';
import { ItemIcon } from '../../utils/inventoryIcons';

function formatNaira(v) {
  if (v >= 1000000) return `₦${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000)    return `₦${(v / 1000).toFixed(0)}K`;
  return `₦${v}`;
}

const rankColors = ['text-amber-500', 'text-gray-400', 'text-orange-400'];

export default function TopSellersTable() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-fade-up delay-300">
      {/* Header */}
      <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center">
            <ShoppingBag size={15} className="text-orange-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">
              Top Sellers
            </h3>
            <p className="text-[11px] text-gray-400">Best performers this month</p>
          </div>
        </div>
        <button className="flex items-center gap-1 text-xs font-semibold text-green-600 hover:text-green-700 transition-colors">
          View all <ArrowRight size={12} />
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[400px]">
          <thead>
            <tr className="border-b border-gray-50">
              <th className="text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 px-5 sm:px-6 py-2.5 w-8">#</th>
              <th className="text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 px-3 py-2.5">Product</th>
              <th className="text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 px-3 py-2.5">Sold</th>
              <th className="text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 px-3 py-2.5">Revenue</th>
              <th className="text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 px-3 py-2.5">Trend</th>
            </tr>
          </thead>
          <tbody>
            {topSellers.map((item, i) => (
              <tr key={item.id}
                className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors group">
                {/* Rank */}
                <td className="px-5 sm:px-6 py-3.5">
                  <span className={`text-xs font-extrabold ${rankColors[i] ?? 'text-gray-300'}`}>
                    {i + 1}
                  </span>
                </td>

                {/* Product */}
                <td className="px-3 py-3.5">
                  <div className="flex items-center gap-2.5">
                    {/* P2-006 fix: topSellers has `icon` (Lucide name string)
                        and `bg`, not `emoji`. Use the shared ItemIcon helper. */}
                    <ItemIcon iconName={item.icon ?? 'Package'} bg={item.bg} size={18} className="w-9 h-9" />
                    <div>
                      <p className="text-xs font-semibold text-gray-800 leading-tight">{item.name}</p>
                      <p className="text-[10px] text-gray-400">{item.sku}</p>
                    </div>
                  </div>
                </td>

                {/* Units sold */}
                <td className="px-3 py-3.5">
                  <span className="text-sm font-bold text-gray-900">{item.sold}</span>
                  <span className="text-[10px] text-gray-400 ml-1">units</span>
                </td>

                {/* Revenue */}
                <td className="px-3 py-3.5">
                  <span className="text-sm font-bold text-green-600">{formatNaira(item.revenue)}</span>
                </td>

                {/* Trend */}
                <td className="px-3 py-3.5">
                  {item.trend === 'up' ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-50 px-2 py-1 rounded-lg">
                      <TrendingUp size={10} /> Up
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded-lg">
                      <TrendingDown size={10} /> Down
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}