// src/utils/inventoryIcons.jsx
import {
  Shirt, Footprints, ShoppingBag, HardHat,
  Wind, Crown, Package, Gem, Watch, Glasses,
  Wallet, Scissors, Box, Tag,
} from 'lucide-react';

// Map string name → Lucide component
export const iconMap = {
  Shirt:       Shirt,
  Footprints:  Footprints,
  ShoppingBag: ShoppingBag,
  HardHat:     HardHat,
  Wind:        Wind,
  Crown:       Crown,
  Package:     Package,
  Gem:         Gem,
  Watch:       Watch,
  Glasses:     Glasses,
  Wallet:      Wallet,
  Scissors:    Scissors,
  Box:         Box,
  Tag:         Tag,
};

// Picker options shown in the Add/Edit modal
export const iconOptions = [
  { name: 'Shirt',       label: 'Clothing'    },
  { name: 'Footprints',  label: 'Footwear'    },
  { name: 'ShoppingBag', label: 'Bag'         },
  { name: 'HardHat',     label: 'Hat'         },
  { name: 'Wind',        label: 'Scarf'       },
  { name: 'Crown',       label: 'Cap'         },
  { name: 'Gem',         label: 'Jewellery'   },
  { name: 'Watch',       label: 'Watch'       },
  { name: 'Glasses',     label: 'Eyewear'     },
  { name: 'Wallet',      label: 'Wallet'      },
  { name: 'Scissors',    label: 'Other'       },
  { name: 'Package',     label: 'Generic'     },
];

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