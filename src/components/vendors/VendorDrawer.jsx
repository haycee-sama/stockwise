// src/components/vendors/VendorDrawer.jsx
import { X, Phone, Mail, MapPin, Calendar, Package, Edit2, Star, Clock, CheckCircle, AlertCircle } from 'lucide-react';

const naira = (v) => `₦${Number(v).toLocaleString()}`;
const formatDate = (iso) => iso
  ? new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
  : '—';

function StarRating({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} size={13}
          className={s <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'} />
      ))}
      <span className="text-xs text-gray-500 ml-1">({rating}/5)</span>
    </div>
  );
}

function OrderStatusBadge({ status }) {
  const map = {
    delivered: { cls: 'bg-green-50 text-green-700', icon: <CheckCircle size={11} />, label: 'Delivered' },
    pending:   { cls: 'bg-amber-50 text-amber-700', icon: <Clock       size={11} />, label: 'Pending'   },
    cancelled: { cls: 'bg-red-50   text-red-600',   icon: <AlertCircle size={11} />, label: 'Cancelled' },
  };
  const { cls, icon, label } = map[status] ?? map.delivered;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold ${cls}`}>
      {icon} {label}
    </span>
  );
}

export default function VendorDrawer({ vendor, onClose, onEdit, onPlaceOrder }) {
  if (!vendor) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col"
        style={{ animation: 'slideIn .25s ease' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-base font-bold text-gray-900">
            Vendor Profile
          </h2>
          <div className="flex items-center gap-2">
            <button onClick={onPlaceOrder}
              className="flex items-center gap-1.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-lg transition-all">
              <Package size={13} /> Place Order
            </button>
            <button onClick={onEdit}
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-all">
              <Edit2 size={12} /> Edit
            </button>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 transition-all">
              <X size={17} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">

          {/* Profile Hero */}
          <div className="px-6 py-6 border-b border-gray-100">
            <div className="flex items-start gap-4">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-extrabold flex-shrink-0"
                style={{ background: vendor.color, color: vendor.textColor }}>
                {vendor.initials}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="text-lg font-extrabold text-gray-900">
                    {vendor.name}
                  </h3>
                  <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold capitalize
                    ${vendor.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {vendor.status}
                  </span>
                </div>

                <span className="inline-block bg-blue-50 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-lg mb-3">
                  {vendor.category}
                </span>

                <StarRating rating={vendor.rating} />

                <div className="space-y-1.5 mt-3">
                  <p className="text-xs text-gray-500 flex items-center gap-2">
                    <span className="font-semibold text-gray-700">Contact:</span> {vendor.contactPerson}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Phone size={12} className="text-gray-400" /> {vendor.phone}
                  </div>
                  {vendor.email && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Mail size={12} className="text-gray-400" /> {vendor.email}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <MapPin size={12} className="text-gray-400" /> {vendor.location}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Clock size={12} className="text-gray-400" />
                    Lead time: <strong className="text-gray-700">{vendor.leadTimeDays} day{vendor.leadTimeDays > 1 ? 's' : ''}</strong>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Calendar size={12} className="text-gray-400" />
                    Partner since {formatDate(vendor.joinDate)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 px-6 py-4 border-b border-gray-100">
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <p className="text-base font-extrabold text-green-700">
                {naira(vendor.totalPaid)}
              </p>
              <p className="text-[10px] text-green-600 font-semibold mt-0.5">Total Paid</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <p className="text-base font-extrabold text-blue-700">
                {vendor.totalOrders}
              </p>
              <p className="text-[10px] text-blue-600 font-semibold mt-0.5">Orders</p>
            </div>
            <div className={`${vendor.pendingAmount > 0 ? 'bg-amber-50' : 'bg-gray-50'} rounded-xl p-3 text-center`}>
              <p className={`text-base font-extrabold ${vendor.pendingAmount > 0 ? 'text-amber-700' : 'text-gray-500'}`}>
                {vendor.pendingAmount > 0 ? naira(vendor.pendingAmount) : '₦0'}
              </p>
              <p className={`text-[10px] font-semibold mt-0.5 ${vendor.pendingAmount > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                Pending
              </p>
            </div>
          </div>

          {/* Items Supplied */}
          <div className="px-6 py-4 border-b border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Items Supplied</p>
            <div className="flex flex-wrap gap-2">
              {vendor.itemsSupplied?.map(item => (
                <span key={item} className="flex items-center gap-1.5 bg-gray-100 text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-lg">
                  <Package size={11} className="text-gray-500" /> {item}
                </span>
              ))}
            </div>
          </div>

          {/* Note */}
          {vendor.note && (
            <div className="px-6 py-4 border-b border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Notes</p>
              <p className="text-sm text-gray-600 leading-relaxed bg-amber-50 rounded-xl px-4 py-3 border border-amber-100">
                {vendor.note}
              </p>
            </div>
          )}

          {/* Purchase Order History */}
          <div className="px-6 py-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Purchase Orders ({vendor.orders?.length ?? 0})
              </p>
              <p className="text-xs text-gray-400">Last: {formatDate(vendor.lastOrder)}</p>
            </div>

            {vendor.orders?.length > 0 ? (
              <div className="space-y-2">
                {vendor.orders.map(order => (
                  <div key={order.id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 hover:bg-gray-100 transition-colors">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0 border border-gray-200">
                      <Package size={14} className="text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-blue-600">#{order.id}</p>
                        <OrderStatusBadge status={order.status} />
                      </div>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {formatDate(order.date)} · {order.items} item{order.items > 1 ? 's' : ''}
                      </p>
                    </div>
                    <p className="text-sm font-extrabold text-gray-900 flex-shrink-0">
                      {naira(order.total)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <Package size={28} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No orders yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </>
  );
}