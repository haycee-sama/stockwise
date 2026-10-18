-- supabase/migrations/0003_optional_seed_dev_data.sql
-- ─────────────────────────────────────────────────────────────────────────
-- OPTIONAL seed script for development only. NOT required for the app
-- to function — it just provides some sample data so the dashboard /
-- reports aren't empty when you first sign in.
--
-- ⚠️  Apply ONLY to a dev Supabase project. Do NOT run against prod.
-- ⚠️  This file will fail if the auth users referenced do not exist.
--     Replace the placeholder email with your actual signed-up dev user.
--
-- Run AFTER 0001 + 0002. The script is idempotent — running it twice
-- will not duplicate data (uses ON CONFLICT DO NOTHING).
-- ─────────────────────────────────────────────────────────────────────────

-- This seed script intentionally does NOT create auth users (that requires
-- the Supabase Auth admin API, not SQL). Sign up at /signup first, then
-- replace '<your-dev-user-email>' below with that user's email.

-- ──────────────────────────────────────────────────────────────────────────
-- The frontend signup flow already calls sw_create_business() via the
-- API. So after a normal signup, sw_businesses + sw_business_memberships
-- are populated. This seed script adds CATEGORIES, VENDORS, ITEMS,
-- CUSTOMERS for testing — not auth/business records.
-- ──────────────────────────────────────────────────────────────────────────

-- NOTE: This file is a TEMPLATE. To use it, replace the placeholder
-- below with the actual business_id UUID you created via signup.
-- Find it in the Supabase dashboard → Table Editor → sw_businesses.
-- Or run: select id, name from sw_businesses;

-- Once you have the business_id, uncomment the lines below and run them.

-- DO NOT run as-is — replace :business_id with the real UUID.

-- ──────────────────────────────────────────────────────────────────────────
-- SAMPLE VENDORS (replace :business_id with the real UUID)
-- ──────────────────────────────────────────────────────────────────────────
-- insert into sw_vendors (business_id, name, contact_person, email, phone, category, location, lead_time_days, rating, note)
-- values
--   (:business_id, 'Lagos Fashion Hub', 'Mr. Taiwo Adebayo', 'lagfashionhub@gmail.com', '+234 801 234 5678', 'Clothing & Accessories', 'Yaba, Lagos', 3, 5, 'Most reliable supplier.'),
--   (:business_id, 'Aba Footwear Co.', 'Mrs. Ngozi Okafor', 'abafootwear@business.ng', '+234 702 345 6789', 'Footwear', 'Aba, Abia State', 5, 4, 'Sometimes delays by 1-2 days.'),
--   (:business_id, 'Kano Leather Works', 'Alhaji Musa Sani', 'kanoleather@yahoo.com', '+234 803 456 7890', 'Leather Goods', 'Fagge, Kano State', 7, 4, 'Requires 50% deposit.')
-- on conflict do nothing;

-- ──────────────────────────────────────────────────────────────────────────
-- SAMPLE INVENTORY ITEMS
-- ──────────────────────────────────────────────────────────────────────────
-- insert into sw_inventory_items (business_id, name, sku, category, supplier_id, stock, threshold, cost_price, selling_price)
-- select
--   :business_id, 'Ankara Gown (M)', 'SKU-001', 'Clothing',
--   (select id from sw_vendors where business_id = :business_id and name = 'Lagos Fashion Hub' limit 1),
--   124, 20, 2500, 3000
-- on conflict do nothing;
-- (Add more items here following the same pattern.)
