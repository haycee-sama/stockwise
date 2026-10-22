// src/utils/inventoryIcons.jsx
// Renders an inventory item icon by looking up a string name in
// `iconMap`. Only exports the `ItemIcon` component (data lives in
// ./inventoryIconData) — this keeps react-refresh/only-export-components
// happy.
import { Package } from 'lucide-react';
import { iconMap } from './inventoryIconData';

// Render an inventory item icon
export function ItemIcon({ iconName, bg, size = 18, className = '' }) {
  const Icon = iconMap[iconName] ?? Package;
  return (
    <div
      className={`flex items-center justify-center rounded-xl flex-shrink-0 ${className}`}
      style={{ background: bg }}
    >
      <Icon size={size} className="text-gray-600" />
    </div>
  );
}

