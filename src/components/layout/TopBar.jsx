// src/components/layout/TopBar.jsx
import { useState } from 'react';
import { Bell, Search, Menu, X, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/useAuth';

const notifications = []; // No persisted notification system yet

export default function TopBar({ title, subtitle, actions }) {
  const { user } = useAuth();
  const [showNotif,  setShowNotif]  = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [mobileMenuOpen, setMobileMenu] = useState(false);

  const unreadCount = notifications.filter(n => n.unread).length;

  const today = new Date().toLocaleDateString('en-NG', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <>
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100 no-print">
        <div className="flex items-center gap-3 px-4 sm:px-6 lg:px-8 h-16">

          {/* Left: Title */}
          <div className="flex-1 min-w-0">
            {title ? (
              <>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-xs text-gray-500 truncate hidden sm:block">{subtitle}</p>
                )}
              </>
            ) : (
              <>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">
                  {getGreeting()}, {user?.firstName}
                </h1>
                <p className="text-xs text-gray-500 hidden sm:block">{today}</p>
              </>
            )}
          </div>

          {/* Right: Search + Bell + Actions */}
          <div className="flex items-center gap-2">

            {/* Desktop search */}
            <div className="relative hidden md:block">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search (coming soon)" disabled
                className="pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all w-44 lg:w-56"
              />
            </div>

            {/* Mobile search toggle */}
            <button onClick={() => setShowSearch(s => !s)}
              aria-label="Search"
              className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 transition-all">
              <Search size={16} />
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotif(v => !v)}
                aria-label="Notifications"
                className="relative w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-all text-gray-500">
                <Bell size={16} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification dropdown */}
              {showNotif && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotif(false)} />
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-fade-up">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-bold text-gray-900">
                        Notifications
                      </p>
                      <span className="text-xs font-semibold text-green-600 cursor-pointer hover:underline">
                        Mark all read
                      </span>
                    </div>
                    <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
                      {notifications.map(n => (
                        <div key={n.id}
                          className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer
                            ${n.unread ? 'bg-green-50/40' : ''}`}>
                          <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${n.color}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-gray-800">{n.title}</p>
                            <p className="text-xs text-gray-500 truncate">{n.body}</p>
                          </div>
                          <span className="text-[10px] text-gray-400 flex-shrink-0">{n.time}</span>
                        </div>
                      ))}
                    </div>
                    <div className="px-4 py-3 border-t border-gray-100 text-center">
                      <span className="text-xs font-semibold text-green-600 cursor-pointer hover:underline">
                        View all notifications
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Desktop action buttons */}
            {actions && (
              <div className="hidden sm:flex items-center gap-2">
                {actions}
              </div>
            )}

            {/* Mobile: action menu toggle */}
            {actions && (
              <button onClick={() => setMobileMenu(v => !v)}
                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                className="sm:hidden w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 transition-all">
                {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
              </button>
            )}
          </div>
        </div>

        {/* Mobile search bar */}
        {showSearch && (
          <div className="md:hidden px-4 pb-3 animate-fade-up">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input autoFocus type="text" placeholder="Search (coming soon)" disabled
                className="w-full pl-9 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-green-400 transition-all" />
            </div>
          </div>
        )}

        {/* Mobile action buttons dropdown */}
        {mobileMenuOpen && actions && (
          <div className="sm:hidden flex flex-wrap gap-2 px-4 pb-3 animate-fade-up">
            {actions}
          </div>
        )}
      </header>
    </>
  );
}