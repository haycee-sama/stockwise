// src/components/layout/MobileNav.jsx
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Package, ShoppingCart,
  Users, BarChart3,
} from 'lucide-react';

const items = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Home'  },
  { to: '/inventory', icon: Package,          label: 'Stock' },
  { to: '/sales',     icon: ShoppingCart,     label: 'Sales' },
  { to: '/customers', icon: Users,            label: 'People'},
  { to: '/reports',   icon: BarChart3,        label: 'Reports'},
];

export default function MobileNav() {
  return (
    <nav className="mobile-nav">
      {items.map(({ to, icon: Icon, label }) => (
        <NavLink key={to} to={to}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition-all
            ${isActive ? 'text-green-400' : 'text-gray-400 hover:text-white/60'}`
          }
        >
          {({ isActive }) => (
            <>
              <div className={`p-1 rounded-lg transition-all ${isActive ? 'bg-green-500/20' : ''}`}>
                <Icon size={19} />
              </div>
              <span className="text-[10px] font-semibold leading-none">{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}