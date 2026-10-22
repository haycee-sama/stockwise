// src/components/dashboard/StockDonut.jsx
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { dashboardService } from '../../services';
import { useBusiness } from '../../context/useBusiness';
import { useState, useEffect } from 'react';
import { Package } from 'lucide-react';
import { LoadingState, ErrorState } from '../common/ResourceState';

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 text-white px-3 py-2 rounded-xl text-xs shadow-xl border border-white/10">
      <span className="font-bold">{payload[0].name}: </span>
      <span>{payload[0].value.toLocaleString()} items</span>
    </div>
  );
}

export default function StockDonut() {
  const { activeBusinessId } = useBusiness();
  const [stockData, setStockData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true); setError(null);
      const { data: svcData, error: svcError } = await dashboardService.stockStatus({ businessId: activeBusinessId });
      if (!active) return;
      if (svcError) { setError(svcError); setStockData(null); }
      else if (svcData) {
        // Map the service's { In Stock, Low Stock, Out of Stock, total } shape
        // to the chart's [{ name, value, color }] shape.
        const colors = { 'In Stock': '#16a34a', 'Low Stock': '#f59e0b', 'Out of Stock': '#ef4444' };
        setStockData(Object.entries(svcData).filter(([k]) => colors[k]).map(([name, value]) => ({ name, value, color: colors[name] })));
      }
    })();
    return () => { active = false; };
  }, [activeBusinessId]);

  const total = (stockData ?? []).reduce((s, d) => s + d.value, 0);
  const inStockPct = total > 0 ? Math.round(((stockData ?? [])[0]?.value ?? 0) / total * 100) : 0;

  if (loading) return <LoadingState label="Loading stock status…" />;
  if (error) return <ErrorState error={error} />;
  if (!stockData || stockData.length === 0) return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100 shadow-sm animate-fade-up delay-250">
      <h3 className="text-sm font-bold text-gray-900">Stock Status</h3>
      <p className="text-xs text-gray-400 mt-4">No stock data yet.</p>
    </div>
  );
  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100 shadow-sm animate-fade-up delay-250">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-gray-900">
            Stock Status
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">{inStockPct}% availability</p>
        </div>
        <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
          <Package size={15} className="text-blue-600" />
        </div>
      </div>

      {/* Donut */}
      <div className="relative flex items-center justify-center">
        <ResponsiveContainer width="100%" height={170}>
          <PieChart>
            <Pie
              data={stockData ?? []}
              cx="50%" cy="50%"
              innerRadius={52} outerRadius={76}
              paddingAngle={3} dataKey="value" strokeWidth={0}
            >
              {(stockData ?? []).map(e => <Cell key={e.name} fill={e.color} />)}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Center label */}
        <div className="absolute text-center pointer-events-none">
          <p className="text-2xl font-extrabold text-gray-900 leading-none">
            {total.toLocaleString()}
          </p>
          <p className="text-[10px] text-gray-400 font-medium mt-0.5">total items</p>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 space-y-2">
        {(stockData ?? []).map(item => {
          const pct = ((item.value / total) * 100).toFixed(0);
          return (
            <div key={item.name} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
              <span className="text-xs text-gray-500 flex-1">{item.name}</span>
              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full"
                    style={{ width: `${pct}%`, background: item.color }} />
                </div>
                <span className="text-xs font-bold text-gray-700 w-8 text-right">{item.value}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}