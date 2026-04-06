// src/components/sales/ViewOrderModal.jsx
import {
  X, Printer, CheckCircle, Clock, XCircle,
  Banknote, Building2, CreditCard, User,
  Package, FileText, Calendar, Hash,
} from 'lucide-react';

const naira = (v) => `₦${Number(v).toLocaleString()}`;

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('en-NG', {
    weekday: 'long', day: 'numeric',
    month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

const statusConfig = {
  completed: { label: 'Completed', cls: 'bg-green-50 text-green-700 border-green-200', icon: CheckCircle },
  pending:   { label: 'Pending',   cls: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock       },
  cancelled: { label: 'Cancelled', cls: 'bg-red-50   text-red-600   border-red-200',   icon: XCircle     },
};

const paymentConfig = {
  Cash:     { icon: Banknote,   label: 'Cash',          color: 'text-blue-600'   },
  Transfer: { icon: Building2,  label: 'Bank Transfer',  color: 'text-purple-600' },
  POS:      { icon: CreditCard, label: 'POS Terminal',   color: 'text-orange-600' },
};

export default function ViewOrderModal({ isOpen, order, onClose }) {
  if (!isOpen || !order) return null;

  const status = statusConfig[order.status] ?? statusConfig.completed;
  const StatusIcon = status.icon;
  const pmtCfg = paymentConfig[order.payment] ?? paymentConfig.Cash;
  const PmtIcon = pmtCfg.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full sm:rounded-2xl sm:max-w-md shadow-2xl rounded-t-2xl animate-fade-up"
        style={{ maxHeight: '95vh', display: 'flex', flexDirection: 'column' }}>

        {/* Handle (mobile) */}
        <div className="flex justify-center pt-3 sm:hidden flex-shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
              <FileText size={17} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900" style={{ fontFamily: 'sans-serif' }}>
                Order Receipt
              </h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Hash size={11} className="text-gray-400" />
                <p className="text-[11px] text-gray-400 font-mono">{order.id}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-all">
              <Printer size={13} /> Print
            </button>
            <button onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 transition-all">
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-5 space-y-4">

            {/* Status + payment row */}
            <div className="flex items-center justify-between">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold ${status.cls}`}>
                <StatusIcon size={13} />
                {status.label}
              </span>
              <div className={`flex items-center gap-1.5 text-sm font-semibold ${pmtCfg.color}`}>
                <PmtIcon size={16} />
                {pmtCfg.label}
              </div>
            </div>

            {/* Date */}
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Calendar size={13} className="text-gray-400" />
              {formatDate(order.date)}
            </div>

            {/* Customer */}
            <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3.5 border border-gray-200">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                style={{ background: order.customer.color, color: order.customer.textColor, fontFamily: 'sans-serif' }}>
                {order.customer.initials}
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800">{order.customer.name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <User size={10} className="text-gray-400" />
                  <p className="text-[11px] text-gray-400">Customer</p>
                </div>
              </div>
            </div>

            {/* Receipt-style items */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              {/* Table head */}
              <div className="grid grid-cols-12 gap-2 bg-gray-50 px-4 py-2.5 border-b border-gray-200">
                <p className="col-span-6 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Item</p>
                <p className="col-span-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">Qty</p>
                <p className="col-span-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Price</p>
                <p className="col-span-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Total</p>
              </div>

              {/* Items */}
              <div className="divide-y divide-gray-100">
                {order.items.map((item, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center px-4 py-3">
                    <div className="col-span-6 flex items-center gap-2">
                      <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Package size={12} className="text-gray-500" />
                      </div>
                      <p className="text-xs font-semibold text-gray-800 truncate">{item.name}</p>
                    </div>
                    <p className="col-span-2 text-xs text-gray-500 text-center tabular-nums">{item.qty}</p>
                    <p className="col-span-2 text-xs text-gray-600 text-right tabular-nums">{naira(item.price)}</p>
                    <p className="col-span-2 text-xs font-bold text-gray-900 text-right tabular-nums">
                      {naira(item.price * item.qty)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="flex items-center justify-between bg-green-50 px-4 py-3.5 border-t border-green-100">
                <p className="text-sm font-bold text-gray-700">Total Amount</p>
                <p className="text-xl font-extrabold text-green-600 tabular-nums"
                  style={{ fontFamily: 'sans-serif' }}>
                  {naira(order.total)}
                </p>
              </div>
            </div>

            {/* Note */}
            {order.note && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1">Note</p>
                <p className="text-xs text-amber-800 leading-relaxed">{order.note}</p>
              </div>
            )}

            {/* Close */}
            <button onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-sm font-bold transition-all active:scale-95">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}