// src/components/dashboard/LowStockTable.jsx
import { ArrowRight, AlertTriangle, ShoppingCart, Package } from 'lucide-react';
import { lowStockItems } from '../../data/mockData';

export default function LowStockTable() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-fade-up delay-350">
      {/* Header */}
      <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
            <AlertTriangle size={15} className="text-amber-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">
              Low Stock Alerts
            </h3>
            <p className="text-[11px] text-gray-400">Items needing restocking</p>
          </div>
        </div>
        <button className="flex items-center gap-1 text-xs font-semibold text-green-600 hover:text-green-700 transition-colors">
          Reorder all <ArrowRight size={12} />
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[380px]">
          <thead>
            <tr className="border-b border-gray-50">
              <th className="text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 px-5 sm:px-6 py-2.5">Product</th>
              <th className="text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 px-3 py-2.5">Stock</th>
              <th className="text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 px-3 py-2.5">Status</th>
              <th className="text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 px-3 py-2.5">Action</th>
            </tr>
          </thead>
          <tbody>
            {lowStockItems.map(item => {
              const pct        = Math.min((item.stock / item.threshold) * 100, 100);
              const isCritical = item.status === 'critical';

              return (
                <tr key={item.id}
                  className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors group">

                  {/* Product */}
                  <td className="px-5 sm:px-6 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: item.bg }}>
                        <Package size={16} className={isCritical ? 'text-red-400' : 'text-amber-500'} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-800 leading-tight">{item.name}</p>
                        <p className="text-[10px] text-gray-400">{item.sku}</p>
                      </div>
                    </div>
                  </td>

                  {/* Stock + mini bar */}
                  <td className="px-3 py-3.5">
                    <div className="flex flex-col gap-1">
                      <span className={`text-sm font-bold ${isCritical ? 'text-red-600' : 'text-amber-600'}`}>
                        {item.stock}
                        <span className="text-[10px] text-gray-400 font-normal ml-1">
                          / {item.threshold}
                        </span>
                      </span>
                      <div className="w-14 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${isCritical ? 'bg-red-400' : 'bg-amber-400'}`}
                          style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-3 py-3.5">
                    {isCritical ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-1 rounded-lg">
                        <AlertTriangle size={9} /> Critical
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
                        Low
                      </span>
                    )}
                  </td>

                  {/* Reorder */}
                  <td className="px-3 py-3.5">
                    <button className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-600 bg-gray-100 hover:bg-green-50 hover:text-green-700 px-2.5 py-1.5 rounded-lg transition-all">
                      <ShoppingCart size={10} /> Reorder
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}