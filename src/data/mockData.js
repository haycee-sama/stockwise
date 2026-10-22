// src/data/mockData.js
// All item icons now use lucide-react icon names instead of emojis

export const dashboardStats = {
  totalSales: 2400000,
  totalProfit: 680000,
  totalInventory: 1248,
  lowStockCount: 5,
  salesChange: 12.4,
  profitChange: 8.1,
  inventoryChange: -2.3,
  lowStockChange: 2,
};

export const revenueData = [
  { day: 'Mon', thisWeek: 180000, lastWeek: 140000 },
  { day: 'Tue', thisWeek: 220000, lastWeek: 175000 },
  { day: 'Wed', thisWeek: 150000, lastWeek: 190000 },
  { day: 'Thu', thisWeek: 310000, lastWeek: 240000 },
  { day: 'Fri', thisWeek: 260000, lastWeek: 200000 },
  { day: 'Sat', thisWeek: 390000, lastWeek: 280000 },
  { day: 'Sun', thisWeek: 290000, lastWeek: 210000 },
];

export const stockStatusData = [
  { name: 'In Stock',     value: 875, color: '#16a34a' },
  { name: 'Low Stock',    value: 263, color: '#f59e0b' },
  { name: 'Out of Stock', value: 110, color: '#ef4444' },
];

export const topSellers = [
  { id: 1, icon: 'Shirt',       bg: '#fce7f3', iconColor: '#9d174d', name: 'Ankara Gown (M)',       sku: 'SKU-001', sold: 124, revenue: 372000, trend: 'up'   },
  { id: 2, icon: 'Footprints',  bg: '#dbeafe', iconColor: '#1d4ed8', name: 'Block Heels (Size 40)', sku: 'SKU-002', sold: 98,  revenue: 294000, trend: 'up'   },
  { id: 3, icon: 'ShoppingBag', bg: '#fef3c7', iconColor: '#92400e', name: 'Leather Handbag',       sku: 'SKU-003', sold: 76,  revenue: 228000, trend: 'down' },
  { id: 4, icon: 'Shirt',       bg: '#f0fdf4', iconColor: '#15803d', name: 'Bodysuit (Black)',       sku: 'SKU-004', sold: 61,  revenue: 183000, trend: 'up'   },
];

export const lowStockItems = [
  { id: 1, icon: 'HardHat',    bg: '#fee2e2', iconColor: '#b91c1c', name: 'Sun Hat',        sku: 'SKU-044', stock: 3,  threshold: 10, status: 'critical' },
  { id: 2, icon: 'Layers',     bg: '#fef3c7', iconColor: '#92400e', name: 'Silk Scarf',     sku: 'SKU-028', stock: 5,  threshold: 15, status: 'low'      },
  { id: 3, icon: 'Shirt',      bg: '#f0fdf4', iconColor: '#15803d', name: 'Bodysuit (White)',sku: 'SKU-015', stock: 8,  threshold: 20, status: 'low'      },
  { id: 4, icon: 'Footprints', bg: '#ede9fe', iconColor: '#6d28d9', name: 'Stiletto Heels', sku: 'SKU-033', stock: 4,  threshold: 10, status: 'critical' },
];

export const pendingOrders = [
  { id: '#ORD-0342', customer: 'Chidinma Eze', amount: 18500, items: 3 },
  { id: '#ORD-0340', customer: 'Fatima Bello',  amount: 42000, items: 5 },
  { id: '#ORD-0337', customer: 'Tunde A.',       amount: 9500,  items: 1 },
];

// src/data/mockData.js — REPLACE inventoryItems

export const inventoryItems = [
  { id: 1,  iconName: 'Shirt',       bg: '#fce7f3', name: 'Ankara Gown (M)',       sku: 'SKU-001', category: 'Clothing',    supplier: 'Lagos Fashion Hub',  stock: 124, threshold: 20, costPrice: 2500,  sellingPrice: 3000,  lastRestocked: '2026-03-17' },
  { id: 2,  iconName: 'Footprints',  bg: '#dbeafe', name: 'Block Heels (Size 40)', sku: 'SKU-002', category: 'Footwear',    supplier: 'Aba Footwear Co.',   stock: 8,   threshold: 15, costPrice: 4000,  sellingPrice: 6500,  lastRestocked: '2026-03-13' },
  { id: 3,  iconName: 'ShoppingBag', bg: '#fef3c7', name: 'Leather Handbag',       sku: 'SKU-003', category: 'Accessories', supplier: 'Kano Leather Works', stock: 56,  threshold: 10, costPrice: 8000,  sellingPrice: 12000, lastRestocked: '2026-03-06' },
  { id: 4,  iconName: 'HardHat',     bg: '#fee2e2', name: 'Sun Hat',               sku: 'SKU-044', category: 'Accessories', supplier: 'Lagos Fashion Hub',  stock: 0,   threshold: 10, costPrice: 1200,  sellingPrice: 2000,  lastRestocked: '2026-02-28' },
  { id: 5,  iconName: 'Wind',        bg: '#f0fdf4', name: 'Silk Scarf',            sku: 'SKU-028', category: 'Accessories', supplier: 'Lagos Fashion Hub',  stock: 5,   threshold: 15, costPrice: 3500,  sellingPrice: 5500,  lastRestocked: '2026-03-15' },
  { id: 6,  iconName: 'Shirt',       bg: '#ede9fe', name: 'Bodysuit (Black)',       sku: 'SKU-015', category: 'Clothing',    supplier: 'Lagos Fashion Hub',  stock: 34,  threshold: 20, costPrice: 1800,  sellingPrice: 2800,  lastRestocked: '2026-03-10' },
  { id: 7,  iconName: 'Footprints',  bg: '#fef9c3', name: 'Stiletto Heels',        sku: 'SKU-033', category: 'Footwear',    supplier: 'Aba Footwear Co.',   stock: 4,   threshold: 10, costPrice: 6000,  sellingPrice: 9500,  lastRestocked: '2026-03-01' },
  { id: 8,  iconName: 'Crown',       bg: '#ecfdf5', name: 'Cap (Unisex)',           sku: 'SKU-019', category: 'Accessories', supplier: 'Lagos Fashion Hub',  stock: 88,  threshold: 25, costPrice: 800,   sellingPrice: 1500,  lastRestocked: '2026-03-12' },
  { id: 9,  iconName: 'Shirt',       bg: '#fff7ed', name: 'Polo Shirt (L)',         sku: 'SKU-007', category: 'Clothing',    supplier: 'Lagos Fashion Hub',  stock: 0,   threshold: 15, costPrice: 2200,  sellingPrice: 3500,  lastRestocked: '2026-02-20' },
  { id: 10, iconName: 'Footprints',  bg: '#f0f9ff', name: 'Canvas Sneakers',       sku: 'SKU-011', category: 'Footwear',    supplier: 'Aba Footwear Co.',   stock: 42,  threshold: 20, costPrice: 5500,  sellingPrice: 8000,  lastRestocked: '2026-03-08' },
];

export const categories = ['All', 'Clothing', 'Footwear', 'Accessories'];

export const suppliers = [
  'Lagos Fashion Hub',
  'Aba Footwear Co.',
  'Kano Leather Works',
];

export const salesData = [
  {
    id: 'ORD-0342',
    customer: { name: 'Chidinma Eze',   initials: 'CE', color: '#fce7f3', textColor: '#9d174d' },
    items: [
      { name: 'Ankara Gown (M)',    qty: 2, price: 3000  },
      { name: 'Silk Scarf',         qty: 1, price: 5500  },
      { name: 'Leather Handbag',    qty: 1, price: 12000 },
    ],
    total: 23500, payment: 'Transfer', status: 'completed',
    date: '2026-03-21T14:30:00', note: 'Customer requested gift wrapping',
  },
  {
    id: 'ORD-0341',
    customer: { name: 'Tunde Adeyemi', initials: 'TA', color: '#dbeafe', textColor: '#1d4ed8' },
    items: [{ name: 'Block Heels (Size 40)', qty: 1, price: 6500 }],
    total: 6500, payment: 'Cash', status: 'completed',
    date: '2026-03-21T11:15:00', note: '',
  },
  {
    id: 'ORD-0340',
    customer: { name: 'Fatima Bello', initials: 'FB', color: '#fef3c7', textColor: '#92400e' },
    items: [
      { name: 'Bodysuit (Black)', qty: 3, price: 2800 },
      { name: 'Ankara Gown (M)', qty: 2, price: 3000 },
    ],
    total: 14400, payment: 'Card', status: 'pending',
    date: '2026-03-20T16:45:00', note: 'Awaiting delivery confirmation',
  },
  {
    id: 'ORD-0339',
    customer: { name: 'Kemi Olatunji', initials: 'KO', color: '#f0fdf4', textColor: '#15803d' },
    items: [
      { name: 'Canvas Sneakers', qty: 1, price: 8000 },
      { name: 'Cap (Unisex)',    qty: 2, price: 1500 },
    ],
    total: 11000, payment: 'Transfer', status: 'completed',
    date: '2026-03-18T09:20:00', note: '',
  },
  {
    id: 'ORD-0338',
    customer: { name: 'Biodun Afolabi', initials: 'BA', color: '#ede9fe', textColor: '#6d28d9' },
    items: [{ name: 'Stiletto Heels', qty: 1, price: 9500 }],
    total: 9500, payment: 'Cash', status: 'cancelled',
    date: '2026-03-17T13:00:00', note: 'Customer changed mind',
  },
  {
    id: 'ORD-0337',
    customer: { name: 'Ngozi Eze', initials: 'NE', color: '#fff7ed', textColor: '#c2410c' },
    items: [
      { name: 'Leather Handbag', qty: 2, price: 12000 },
      { name: 'Silk Scarf',      qty: 1, price: 5500  },
    ],
    total: 29500, payment: 'Transfer', status: 'completed',
    date: '2026-03-16T10:10:00', note: '',
  },
  {
    id: 'ORD-0336',
    customer: { name: 'Emeka Nwosu', initials: 'EN', color: '#ecfdf5', textColor: '#065f46' },
    items: [
      { name: 'Polo Shirt (L)', qty: 3, price: 3500 },
      { name: 'Cap (Unisex)',   qty: 3, price: 1500 },
    ],
    total: 15000, payment: 'Card', status: 'completed',
    date: '2026-03-15T15:30:00', note: '',
  },
  {
    id: 'ORD-0335',
    customer: { name: 'Aisha Musa', initials: 'AM', color: '#fdf2f8', textColor: '#9d174d' },
    items: [
      { name: 'Ankara Gown (M)',       qty: 1, price: 3000  },
      { name: 'Block Heels (Size 40)', qty: 1, price: 6500  },
      { name: 'Leather Handbag',       qty: 1, price: 12000 },
    ],
    total: 21500, payment: 'Transfer', status: 'pending',
    date: '2026-03-14T11:45:00', note: 'Delivery scheduled for March 22',
  },
];

export const paymentMethods = ['Cash', 'Transfer', 'Card'];

export const customersData = [
  { id: 1, firstName: 'Chidinma', lastName: 'Eze',     initials: 'CE', color: '#fce7f3', textColor: '#9d174d', email: 'chidinma.eze@gmail.com',    phone: '+234 803 456 7890', type: 'Retailer',   location: 'Ikeja, Lagos',           status: 'active',   joinDate: '2025-08-14', totalSpent: 84500,  totalOrders: 12, lastOrder: '2026-03-21', note: 'Prefers Ankara styles. Usually orders in bulk.', orders: [{ id: 'ORD-0342', date: '2026-03-21', total: 23500, status: 'completed', items: 3 }, { id: 'ORD-0318', date: '2026-03-05', total: 18000, status: 'completed', items: 2 }, { id: 'ORD-0290', date: '2026-02-14', total: 43000, status: 'completed', items: 5 }] },
  { id: 2, firstName: 'Tunde',    lastName: 'Adeyemi', initials: 'TA', color: '#dbeafe', textColor: '#1d4ed8', email: 'tunde.a@yahoo.com',          phone: '+234 812 345 6789', type: 'Walk-in',    location: 'Victoria Island, Lagos', status: 'active',   joinDate: '2025-11-02', totalSpent: 32000,  totalOrders: 5,  lastOrder: '2026-03-21', note: '', orders: [{ id: 'ORD-0341', date: '2026-03-21', total: 6500, status: 'completed', items: 1 }, { id: 'ORD-0310', date: '2026-02-28', total: 12000, status: 'completed', items: 2 }] },
  { id: 3, firstName: 'Fatima',   lastName: 'Bello',   initials: 'FB', color: '#fef3c7', textColor: '#92400e', email: 'fatima.bello@outlook.com',   phone: '+234 705 678 9012', type: 'Wholesale',  location: 'Garki, Abuja',           status: 'owing',    joinDate: '2025-06-20', totalSpent: 210000, totalOrders: 28, lastOrder: '2026-03-20', note: 'Bulk buyer. Has outstanding balance of ₦42,000.', orders: [{ id: 'ORD-0340', date: '2026-03-20', total: 14400, status: 'pending', items: 5 }, { id: 'ORD-0325', date: '2026-03-10', total: 38000, status: 'completed', items: 8 }] },
  { id: 4, firstName: 'Kemi',     lastName: 'Olatunji',initials: 'KO', color: '#f0fdf4', textColor: '#15803d', email: 'kemi.olatunji@gmail.com',    phone: '+234 901 234 5678', type: 'Retailer',   location: 'GRA, Port Harcourt',     status: 'active',   joinDate: '2025-09-08', totalSpent: 56000,  totalOrders: 9,  lastOrder: '2026-03-18', note: 'Prefers evening deliveries.', orders: [{ id: 'ORD-0339', date: '2026-03-18', total: 11000, status: 'completed', items: 2 }] },
  { id: 5, firstName: 'Biodun',   lastName: 'Afolabi', initials: 'BA', color: '#ede9fe', textColor: '#6d28d9', email: 'biodun.afolabi@gmail.com',   phone: '+234 818 765 4321', type: 'Walk-in',    location: 'Bodija, Ibadan',         status: 'new',      joinDate: '2026-03-15', totalSpent: 8500,   totalOrders: 1,  lastOrder: '2026-03-15', note: '', orders: [{ id: 'ORD-0338', date: '2026-03-15', total: 8500, status: 'cancelled', items: 1 }] },
  { id: 6, firstName: 'Ngozi',    lastName: 'Eze',     initials: 'NE', color: '#fff7ed', textColor: '#c2410c', email: 'ngozi.eze@business.com',     phone: '+234 803 111 2222', type: 'Wholesale',  location: 'Onitsha, Anambra',       status: 'active',   joinDate: '2025-05-12', totalSpent: 145000, totalOrders: 19, lastOrder: '2026-03-16', note: 'Prefers invoice payments. Long-term client.', orders: [{ id: 'ORD-0337', date: '2026-03-16', total: 29500, status: 'completed', items: 3 }] },
  { id: 7, firstName: 'Emeka',    lastName: 'Nwosu',   initials: 'EN', color: '#ecfdf5', textColor: '#065f46', email: 'emeka.n@hotmail.com',        phone: '+234 706 888 9999', type: 'E-commerce', location: 'Lekki, Lagos',           status: 'active',   joinDate: '2025-10-30', totalSpent: 72000,  totalOrders: 14, lastOrder: '2026-03-15', note: 'Ships to multiple locations.', orders: [{ id: 'ORD-0336', date: '2026-03-15', total: 15000, status: 'completed', items: 6 }] },
  { id: 8, firstName: 'Aisha',    lastName: 'Musa',    initials: 'AM', color: '#fdf2f8', textColor: '#9d174d', email: 'aisha.musa@gmail.com',       phone: '+234 815 333 4444', type: 'Retailer',   location: 'Maiduguri, Borno',       status: 'inactive', joinDate: '2025-07-19', totalSpent: 21500,  totalOrders: 3,  lastOrder: '2026-03-14', note: 'Has not ordered in 2 months.', orders: [{ id: 'ORD-0335', date: '2026-03-14', total: 21500, status: 'pending', items: 3 }] },
];

export const customerTypes    = ['All', 'Retailer', 'Wholesale', 'Walk-in', 'E-commerce'];
export const customerStatuses = ['All', 'Active', 'New', 'Owing', 'Inactive'];
export const avatarColors     = [
  { color: '#fce7f3', textColor: '#9d174d' },
  { color: '#dbeafe', textColor: '#1d4ed8' },
  { color: '#fef3c7', textColor: '#92400e' },
  { color: '#f0fdf4', textColor: '#15803d' },
  { color: '#ede9fe', textColor: '#6d28d9' },
  { color: '#fff7ed', textColor: '#c2410c' },
  { color: '#ecfdf5', textColor: '#065f46' },
];

export const vendorsData = [
  { id: 1, name: 'Lagos Fashion Hub',      initials: 'LF', color: '#dbeafe', textColor: '#1d4ed8', category: 'Clothing & Accessories', contactPerson: 'Mr. Taiwo Adebayo',   email: 'lagfashionhub@gmail.com',  phone: '+234 801 234 5678', location: 'Yaba, Lagos',          status: 'active',   joinDate: '2025-01-15', itemsSupplied: ['Ankara Gown', 'Bodysuit', 'Polo Shirt', 'Silk Scarf', 'Sun Hat', 'Cap'], totalOrders: 24, totalPaid: 680000, pendingAmount: 0,     lastOrder: '2026-03-17', leadTimeDays: 3, rating: 5, note: 'Most reliable supplier. Offers 5% discount on orders above ₦100K.', orders: [{ id: 'PO-024', date: '2026-03-17', items: 4, total: 85000,  status: 'delivered' }, { id: 'PO-021', date: '2026-03-01', items: 6, total: 120000, status: 'delivered' }] },
  { id: 2, name: 'Aba Footwear Co.',        initials: 'AF', color: '#fef3c7', textColor: '#92400e', category: 'Footwear',               contactPerson: 'Mrs. Ngozi Okafor',   email: 'abafootwear@business.ng', phone: '+234 702 345 6789', location: 'Aba, Abia State',      status: 'active',   joinDate: '2025-03-08', itemsSupplied: ['Block Heels', 'Stiletto Heels', 'Canvas Sneakers', 'Sandals'],           totalOrders: 18, totalPaid: 432000, pendingAmount: 45000, lastOrder: '2026-03-13', leadTimeDays: 5, rating: 4, note: 'Good quality footwear. Sometimes delays by 1–2 days.',              orders: [{ id: 'PO-023', date: '2026-03-13', items: 3, total: 72000,  status: 'pending'   }, { id: 'PO-019', date: '2026-02-25', items: 2, total: 48000,  status: 'delivered' }] },
  { id: 3, name: 'Kano Leather Works',      initials: 'KL', color: '#fce7f3', textColor: '#9d174d', category: 'Leather Goods',          contactPerson: 'Alhaji Musa Sani',    email: 'kanoleather@yahoo.com',   phone: '+234 803 456 7890', location: 'Fagge, Kano State',    status: 'active',   joinDate: '2025-05-20', itemsSupplied: ['Leather Handbag', 'Belt', 'Wallet', 'Leather Sandals'],                   totalOrders: 11, totalPaid: 286000, pendingAmount: 0,     lastOrder: '2026-03-06', leadTimeDays: 7, rating: 4, note: 'Excellent leather quality. Requires 50% deposit upfront.',          orders: [{ id: 'PO-022', date: '2026-03-06', items: 2, total: 64000,  status: 'delivered' }] },
  { id: 4, name: 'Delta Textile Mills',     initials: 'DT', color: '#f0fdf4', textColor: '#15803d', category: 'Clothing & Accessories', contactPerson: 'Mr. Chukwuemeka Obi', email: 'deltatextile@mills.ng',   phone: '+234 704 567 8901', location: 'Warri, Delta State',   status: 'inactive', joinDate: '2024-11-10', itemsSupplied: ['Ankara Fabric', 'Plain Cotton', 'Lace Fabric'],                           totalOrders: 6,  totalPaid: 138000, pendingAmount: 22000, lastOrder: '2026-01-15', leadTimeDays: 10,rating: 3, note: 'Quality has declined recently. On hold pending review.',            orders: [{ id: 'PO-014', date: '2026-01-15', items: 2, total: 38000,  status: 'delivered' }] },
  { id: 5, name: 'Onitsha Accessories Hub', initials: 'OA', color: '#ede9fe', textColor: '#6d28d9', category: 'Accessories',            contactPerson: 'Mrs. Adaeze Nwosu',   email: 'onitshaacc@gmail.com',    phone: '+234 806 789 0123', location: 'Onitsha, Anambra State',status: 'active',   joinDate: '2025-07-04', itemsSupplied: ['Hair Accessories', 'Jewellery', 'Sunglasses', 'Watches'],                  totalOrders: 9,  totalPaid: 198000, pendingAmount: 0,     lastOrder: '2026-03-10', leadTimeDays: 4, rating: 5, note: 'Always on time. Great packaging.',                                  orders: [{ id: 'PO-020', date: '2026-03-10', items: 3, total: 52000,  status: 'delivered' }] },
];

export const vendorCategories  = ['All', 'Clothing & Accessories', 'Footwear', 'Leather Goods', 'Accessories'];
export const vendorStatuses    = ['All', 'Active', 'Inactive'];
export const vendorAvatarColors = [
  { color: '#dbeafe', textColor: '#1d4ed8' },
  { color: '#fef3c7', textColor: '#92400e' },
  { color: '#fce7f3', textColor: '#9d174d' },
  { color: '#f0fdf4', textColor: '#15803d' },
  { color: '#ede9fe', textColor: '#6d28d9' },
  { color: '#fff7ed', textColor: '#c2410c' },
];

export const expenseCategories = [
  { id: 'stock',     label: 'Stock Purchase', icon: 'Package',   color: '#16a34a', bg: '#f0fdf4' },
  { id: 'rent',      label: 'Rent',           icon: 'Home',      color: '#3b82f6', bg: '#dbeafe' },
  { id: 'transport', label: 'Transport',      icon: 'Truck',     color: '#f59e0b', bg: '#fef3c7' },
  { id: 'utilities', label: 'Utilities',      icon: 'Zap',       color: '#8b5cf6', bg: '#ede9fe' },
  { id: 'marketing', label: 'Marketing',      icon: 'Megaphone', color: '#ec4899', bg: '#fdf2f8' },
  { id: 'salaries',  label: 'Salaries',       icon: 'Users',     color: '#0ea5e9', bg: '#e0f2fe' },
  { id: 'packaging', label: 'Packaging',      icon: 'MailOpen',  color: '#10b981', bg: '#d1fae5' },
  { id: 'other',     label: 'Other',          icon: 'Wrench',    color: '#6b7280', bg: '#f3f4f6' },
];

export const expensesData = [
  { id: 1,  name: 'Monthly Shop Rent',          category: 'rent',      vendor: 'Landlord',           amount: 30000, date: '2026-03-01', payment: 'Transfer', note: 'March 2026 rent'           },
  { id: 2,  name: 'Stock Restock — Lagos Hub',  category: 'stock',     vendor: 'Lagos Fashion Hub',  amount: 85000, date: '2026-03-10', payment: 'Transfer', note: 'Ankara gowns & bodysuits'  },
  { id: 3,  name: 'GIG Logistics — Abuja',      category: 'transport', vendor: 'GIG Logistics',      amount: 12500, date: '2026-03-15', payment: 'Transfer', note: 'Delivery to Fatima Bello'  },
  { id: 4,  name: 'Instagram Ads — March',      category: 'marketing', vendor: 'Meta Platforms',     amount: 6000,  date: '2026-03-18', payment: 'Card',     note: 'Boosted 3 posts'           },
  { id: 5,  name: 'Generator Fuel',             category: 'utilities', vendor: 'Total Energies',     amount: 8500,  date: '2026-03-05', payment: 'Cash',     note: '50 litres diesel'          },
  { id: 6,  name: 'Staff Salary — Emeka',       category: 'salaries',  vendor: 'Emeka Okafor',       amount: 35000, date: '2026-03-28', payment: 'Transfer', note: 'March 2026 salary'         },
  { id: 7,  name: 'Nylon Bags & Boxes',         category: 'packaging', vendor: 'Packing Pro NG',     amount: 7500,  date: '2026-03-12', payment: 'Cash',     note: '200 nylon bags + 50 boxes' },
  { id: 8,  name: 'Stock Restock — Aba FC',     category: 'stock',     vendor: 'Aba Footwear Co.',   amount: 48000, date: '2026-03-08', payment: 'Transfer', note: 'Block heels restock'       },
  { id: 9,  name: 'NEPA Electricity Bill',      category: 'utilities', vendor: 'Eko Electricity',    amount: 4200,  date: '2026-03-03', payment: 'Transfer', note: 'Feb–Mar bill'              },
  { id: 10, name: 'DHL Courier — Port Harcourt',category: 'transport', vendor: 'DHL Nigeria',        amount: 6000,  date: '2026-03-20', payment: 'Card',     note: 'Order for Kemi Olatunji'  },
  { id: 11, name: 'February Rent',              category: 'rent',      vendor: 'Landlord',           amount: 30000, date: '2026-02-01', payment: 'Transfer', note: 'February 2026 rent'        },
  { id: 12, name: 'Stock — Kano Leather',       category: 'stock',     vendor: 'Kano Leather Works', amount: 64000, date: '2026-02-15', payment: 'Transfer', note: 'Handbags restock'          },
  { id: 13, name: 'Flyer Printing',             category: 'marketing', vendor: 'QuickPrint Lagos',   amount: 3500,  date: '2026-02-10', payment: 'Cash',     note: '500 A5 flyers'             },
  { id: 14, name: 'Staff Salary — Emeka (Feb)', category: 'salaries',  vendor: 'Emeka Okafor',       amount: 35000, date: '2026-02-28', payment: 'Transfer', note: 'February 2026 salary'      },
  { id: 15, name: 'Jumia Ads Boost',            category: 'marketing', vendor: 'Jumia Nigeria',      amount: 4000,  date: '2026-02-20', payment: 'Card',     note: 'Product listing boost'     },
];

export const expensePaymentMethods = ['Cash', 'Transfer', 'Card'];

export const expenseTrend = [
  { month: 'Oct', amount: 142000 },
  { month: 'Nov', amount: 168000 },
  { month: 'Dec', amount: 195000 },
  { month: 'Jan', amount: 158000 },
  { month: 'Feb', amount: 176500 },
  { month: 'Mar', amount: 184700 },
];

export const salesTrendData = [
  { month: 'Oct', revenue: 1420000, profit: 398000, orders: 198 },
  { month: 'Nov', revenue: 1680000, profit: 470000, orders: 224 },
  { month: 'Dec', revenue: 2100000, profit: 588000, orders: 312 },
  { month: 'Jan', revenue: 1580000, profit: 442000, orders: 198 },
  { month: 'Feb', revenue: 1960000, profit: 549000, orders: 278 },
  { month: 'Mar', revenue: 2400000, profit: 672000, orders: 342 },
];

export const paymentBreakdown = [
  { name: 'Bank Transfer', value: 58, color: '#16a34a' },
  { name: 'Cash',          value: 27, color: '#3b82f6' },
  { name: 'Card',          value: 15, color: '#f59e0b' },
];

export const topProductsReport = [
  { name: 'Ankara Gown (M)',       category: 'Clothing',    sold: 124, revenue: 372000, growth: 18  },
  { name: 'Block Heels (Size 40)', category: 'Footwear',    sold: 98,  revenue: 294000, growth: 12  },
  { name: 'Leather Handbag',       category: 'Accessories', sold: 76,  revenue: 228000, growth: -4  },
  { name: 'Bodysuit (Black)',       category: 'Clothing',    sold: 61,  revenue: 183000, growth: 22  },
  { name: 'Canvas Sneakers',       category: 'Footwear',    sold: 54,  revenue: 216000, growth: 9   },
];

export const inventoryCategoryReport = [
  { name: 'Clothing',    items: 456, value: 1824000, color: '#16a34a' },
  { name: 'Footwear',    items: 312, value: 1560000, color: '#3b82f6' },
  { name: 'Accessories', items: 280, value: 840000,  color: '#f59e0b' },
  { name: 'Other',       items: 200, value: 480000,  color: '#8b5cf6' },
];

export const customerAcquisitionData = [
  { month: 'Oct', newCustomers: 8,  returning: 32 },
  { month: 'Nov', newCustomers: 11, returning: 38 },
  { month: 'Dec', newCustomers: 15, returning: 52 },
  { month: 'Jan', newCustomers: 7,  returning: 41 },
  { month: 'Feb', newCustomers: 13, returning: 45 },
  { month: 'Mar', newCustomers: 12, returning: 58 },
];

export const customerTypeBreakdown = [
  { name: 'Retailer',   value: 38, color: '#16a34a' },
  { name: 'Wholesale',  value: 24, color: '#3b82f6' },
  { name: 'Walk-in',    value: 22, color: '#f59e0b' },
  { name: 'E-commerce', value: 16, color: '#8b5cf6' },
];

export const expenseCategoryReport = [
  { name: 'Stock Purchase', amount: 197000, pct: 52, color: '#16a34a' },
  { name: 'Salaries',       amount: 70000,  pct: 18, color: '#3b82f6' },
  { name: 'Rent',           amount: 60000,  pct: 16, color: '#f59e0b' },
  { name: 'Transport',      amount: 18500,  pct: 5,  color: '#8b5cf6' },
  { name: 'Marketing',      amount: 13500,  pct: 4,  color: '#ec4899' },
  { name: 'Utilities',      amount: 12700,  pct: 3,  color: '#0ea5e9' },
  { name: 'Packaging',      amount: 7500,   pct: 2,  color: '#10b981' },
];