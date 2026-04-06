// src/components/layout/Sidebar.jsx
import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Package, ShoppingCart, Users,
  Truck, Receipt, BarChart3, FolderOpen,
  Settings, LogOut, ChevronLeft, ChevronRight,
  Bell, Gem,
} from 'lucide-react';

const navSections = [
  {
    label: 'Main',
    items: [
      { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard'  },
      { to: '/inventory',  icon: Package,          label: 'Inventory'  },
      { to: '/sales',      icon: ShoppingCart,     label: 'Sales', badge: 3 },
    ],
  },
  {
    label: 'Management',
    items: [
      { to: '/customers', icon: Users,   label: 'Customers' },
      { to: '/vendors',   icon: Truck,   label: 'Vendors'   },
      { to: '/expenses',  icon: Receipt, label: 'Expenses'  },
    ],
  },
  {
    label: 'Insights',
    items: [
      { to: '/reports',   icon: BarChart3,  label: 'Reports'   },
      { to: '/documents', icon: FolderOpen, label: 'Documents' },
    ],
  },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()
    : 'U';

  return (
    <aside
      className={`desktop-sidebar flex-shrink-0 bg-gray-900 flex flex-col min-h-screen border-r border-white/5 transition-all duration-300 ${
        collapsed ? 'w-[68px]' : 'w-60'
      }`}
    >
      {/* Logo + collapse toggle */}
      <div className={`flex items-center border-b border-white/5 h-16 px-4 ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Package size={16} className="text-white" />
            </div>
            <span className="text-white font-bold text-lg tracking-tight"
              style={{ fontFamily: 'sans-serif' }}>
              Stockwise
            </span>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
            <Package size={16} className="text-white" />
          </div>
        )}
        <button
          onClick={() => setCollapsed(c => !c)}
          className={`text-white/30 hover:text-white/70 transition-colors hidden lg:flex items-center justify-center w-7 h-7 rounded-lg hover:bg-white/5 ${collapsed ? 'mt-0 mx-auto' : ''}`}
        >
          {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 overflow-y-auto overflow-x-hidden space-y-5">
        {navSections.map(section => (
          <div key={section.label}>
            {!collapsed && (
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/25 px-3 mb-2">
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map(({ to, icon: Icon, label, badge }) => (
                <NavLink
                  key={to}
                  to={to}
                  title={collapsed ? label : undefined}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group relative
                    ${collapsed ? 'justify-center' : ''}
                    ${isActive
                      ? 'bg-green-600/20 text-green-400'
                      : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                    }`
                  }
                >
                  <Icon size={18} className="flex-shrink-0" />
                  {!collapsed && <span className="flex-1 truncate">{label}</span>}
                  {!collapsed && badge && (
                    <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                      {badge}
                    </span>
                  )}
                  {/* Tooltip when collapsed */}
                  {collapsed && (
                    <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-gray-800 text-white text-xs font-semibold rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-xl">
                      {label}
                      {badge && (
                        <span className="ml-1.5 bg-red-500 text-white text-[9px] font-bold px-1 py-0.5 rounded-full">
                          {badge}
                        </span>
                      )}
                    </div>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className={`px-2 pb-4 pt-3 border-t border-white/5 space-y-0.5`}>
        <NavLink to="/settings"
          title={collapsed ? 'Settings' : undefined}
          className={({ isActive }) =>
            `flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative group
            ${collapsed ? 'justify-center' : ''}
            ${isActive ? 'bg-green-600/20 text-green-400' : 'text-white/50 hover:text-white/80 hover:bg-white/5'}`
          }>
          <Settings size={18} className="flex-shrink-0" />
          {!collapsed && <span>Settings</span>}
          {collapsed && (
            <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-gray-800 text-white text-xs font-semibold rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-xl">
              Settings
            </div>
          )}
        </NavLink>

        {/* User pill */}
        <div className={`flex items-center gap-3 px-3 py-3 rounded-xl bg-white/5 mt-2 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
            style={{ fontFamily: 'sans-serif' }}>
            {initials}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-white/40 text-[10px] truncate">
                {user?.businessName ?? 'My Business'}
              </p>
            </div>
          )}
          {!collapsed && (
            <button onClick={handleLogout}
              className="text-white/30 hover:text-red-400 transition-colors ml-auto"
              title="Sign out">
              <LogOut size={15} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}