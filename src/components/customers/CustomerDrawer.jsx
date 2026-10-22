// src/components/customers/CustomerDrawer.jsx
import {
  X, Phone, Mail, MapPin, Calendar, ShoppingBag,
  Edit2, CheckCircle, Clock, XCircle, TrendingUp,
  User, MessageSquare,
} from 'lucide-react';

const naira = (v) => `₦${Number(v).toLocaleString()}`;
const fmtDate = (iso) => iso
  ? new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
  : '—';

const statusConfig = {
  active:   { label: 'Active',   cls: 'bg-green-100 text-green-700' },
  new:      { label: 'New',      cls: 'bg-blue-100  text-blue-700'  },
  owing:    { label: 'Owing',    cls: 'bg-amber-100 text-amber-700' },
  inactive: { label: 'Inactive', cls: 'bg-gray-100  text-gray-500'  },
};

const orderStatusMap = {
  completed: { icon: CheckCircle, cls: 'bg-green-50 text-green-700' },
  pending:   { icon: Clock,       cls: 'bg-amber-50 text-amber-700' },
  cancelled: { icon: XCircle,     cls: 'bg-red-50   text-red-600'   },
};

function OrderStatusBadge({ status }) {
  const cfg  = orderStatusMap[status] ?? orderStatusMap.completed;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold ${cfg.cls}`}>
      <Icon size={10} /> <span className="capitalize">{status}</span>
    </span>
  );
}

export default function CustomerDrawer({ customer, onClose, onEdit }) {
  if (!customer) return null;

  const avgOrder = customer.totalOrders > 0
    ? Math.round(customer.totalSpent / customer.totalOrders)
    : 0;

  const sCfg = statusConfig[customer.status] ?? statusConfig.inactive;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-sm bg-white shadow-2xl flex flex-col animate-slide-right">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-sm font-bold text-gray-900" style={{ fontFamily: 'sans-serif' }}>
            Customer Profile
          </h2>
          <div className="flex items-center gap-2">
            <button onClick={onEdit}
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-all">
              <Edit2 size={12} /> Edit
            </button>
            <button onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 transition-all">
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">

          {/* Hero */}
          <div className="px-5 py-5 border-b border-gray-100">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-extrabold flex-shrink-0"
                style={{ background: customer.color, color: customer.textColor, fontFamily: 'sans-serif' }}>
                {customer.initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="text-base font-extrabold text-gray-900 truncate"
                    style={{ fontFamily: 'sans-serif' }}>
                    {customer.firstName} {customer.lastName}
                  </h3>
                  <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${sCfg.cls}`}>
                    {sCfg.label}
                  </span>
                </div>
                <span className="inline-block bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-md mb-3">
                  {customer.type}
                </span>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Phone size={12} className="text-gray-400 flex-shrink-0" />
                    {customer.phone}
                  </div>
                  {customer.email && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Mail size={12} className="text-gray-400 flex-shrink-0" />
                      <span className="truncate">{customer.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <MapPin size={12} className="text-gray-400 flex-shrink-0" />
                    {customer.location}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Calendar size={12} className="text-gray-400 flex-shrink-0" />
                    Since {fmtDate(customer.joinDate)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 px-5 py-4 border-b border-gray-100">
            {[
              { label: 'Total Spent',  value: naira(customer.totalSpent), color: 'text-green-700',  bg: 'bg-green-50'  },
              { label: 'Orders',       value: customer.totalOrders,        color: 'text-blue-700',   bg: 'bg-blue-50'   },
              { label: 'Avg. Order',   value: naira(avgOrder),             color: 'text-purple-700', bg: 'bg-purple-50' },
            ].map(s => (
              <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center`}>
                <p className={`text-sm font-extrabold ${s.color} tabular-nums`}
                  style={{ fontFamily: 'sans-serif' }}>{s.value}</p>
                <p className="text-[10px] text-gray-500 font-medium mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Note */}
          {customer.note && (
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare size={13} className="text-gray-400" />
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Notes</p>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed bg-amber-50 rounded-xl px-4 py-3 border border-amber-100">
                {customer.note}
              </p>
            </div>
          )}

          {/* Order history */}
          <div className="px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ShoppingBag size={13} className="text-gray-400" />
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Order History ({customer.orders?.length ?? 0})
                </p>
              </div>
              <p className="text-[10px] text-gray-400">Last: {fmtDate(customer.lastOrder)}</p>
            </div>

            {customer.orders?.length > 0 ? (
              <div className="space-y-2">
                {customer.orders.map(order => (
                  <div key={order.id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 hover:bg-gray-100 transition-colors">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0 border border-gray-200">
                      <ShoppingBag size={13} className="text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[11px] font-bold text-green-600">#{order.id}</p>
                        <OrderStatusBadge status={order.status} />
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {fmtDate(order.date)} · {order.items} item{order.items > 1 ? 's' : ''}
                      </p>
                    </div>
                    <p className="text-sm font-extrabold text-gray-900 flex-shrink-0 tabular-nums">
                      {naira(order.total)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <ShoppingBag size={26} className="mx-auto mb-2 opacity-30" />
                <p className="text-xs">No orders yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}