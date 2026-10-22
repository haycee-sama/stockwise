// src/utils/inventoryIconData.js
// Pure-data module: maps string names (stored in mock data) to Lucide
// icon components, plus the picker options shown in the Add/Edit modal.
// Split out of inventoryIcons.jsx so that inventoryIcons.jsx only
// exports the `ItemIcon` React component (satisfies the
// react-refresh/only-export-components lint rule).
import {
  Shirt, Footprints, ShoppingBag, HardHat,
  Wind, Crown, Package, Gem, Watch, Glasses,
  Wallet, Scissors, Box, Tag,
} from 'lucide-react';

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
