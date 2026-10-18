# RLS Verification Procedure

> This document defines the manual verification procedure for the
> Row-Level-Security policies in
> `supabase/migrations/0002_rls_policies_and_functions.sql`.
>
> RLS is the primary authorization boundary. Frontend route guards
> (`ProtectedRoute`) are UX only — they cannot enforce security. The
> policies in migration 0002 are what actually prevents one
> business's data from being read or written by another.
>
> These tests CANNOT be automated without:
>   - A configured Supabase project with the migrations applied.
>   - Two test auth users (in two different businesses).
>   - A way to programmatically authenticate as each test user.
>
> The procedure below is the canonical manual verification recipe. It
> should be run by the backend engineer after applying the migrations
> to a dev project, and re-run after any RLS policy change.

## Prerequisites

1. Apply `0001_init_schema.sql` + `0002_rls_policies_and_functions.sql`
   to a dev Supabase project via the SQL Editor.
2. Verify the tables exist:
   ```sql
   select tablename from pg_tables where schemaname='public' and tablename like 'sw_%';
   ```
   Should return: `sw_businesses`, `sw_business_memberships`,
   `sw_customers`, `sw_vendors`, `sw_inventory_items`, `sw_sales`,
   `sw_sale_items`, `sw_stock_movements`, `sw_purchase_orders`,
   `sw_purchase_order_items`, `sw_expenses`, `sw_audit_log`,
   `sw_display_id_counters`.
3. Verify RLS is enabled on each:
   ```sql
   select tablename, rowsecurity from pg_tables
   where schemaname='public' and tablename like 'sw_%';
   ```
   `rowsecurity` should be `true` for every row.
4. Create two test auth users via Supabase Dashboard → Authentication →
   Users → "Add user":
   - `user-a@example.com` — owner of Business A.
   - `user-b@example.com` — owner of Business B.
5. Each user signs in via the Stockwise app → a `sw_businesses` row
   is auto-created for them (via the `sw_create_business` RPC, which
   the frontend calls after signup).

## Test 1 — Read isolation

**Goal**: User A cannot read Business B's data.

1. Sign in as `user-a@example.com` via the app.
2. Open the Supabase SQL Editor.
3. Run as the authenticated role (the editor's "Run as" dropdown
   should default to the anon role; use the `auth.uid()` function
   to switch — for testing, use the SQL below with your session):

   ```sql
   -- Should return ONLY Business A's rows (0 initially, then your
   -- created records).
   select count(*) from sw_customers;
   select count(*) from sw_inventory_items;
   select count(*) from sw_sales;
   select count(*) from sw_expenses;
   ```

4. Now sign in as `user-b@example.com`.
5. Run the same queries. They should return Business B's row counts,
   NOT Business A's. If Business A has 5 customers and Business B
   has 0, user-b should see `0`, not `5`.

**Pass criterion**: User A sees only Business A's records; User B
sees only Business B's records. No cross-business reads.

## Test 2 — Unauthorized INSERT

**Goal**: A user cannot INSERT a row in another business.

1. Sign in as `user-a@example.com`.
2. Look up Business B's UUID (via the SQL editor):
   ```sql
   -- Run with service_role to look up another business's UUID
   -- (this query bypasses RLS — only for testing).
   select id, name from sw_businesses where name = 'Business B';
   ```
3. Switch to authenticated role. Try to insert into Business B:
   ```sql
   insert into sw_customers (business_id, first_name, last_name, phone, type, location)
   values ('<BUSINESS_B_UUID>', 'Intruder', 'Test', '+234 000 000 0000', 'Retailer', 'Lagos');
   ```
4. The INSERT should fail with `new row violates row-level security
   policy for table "sw_customers"`. If it succeeds, RLS is broken —
   file a P0 bug.

**Pass criterion**: INSERT rejected.

## Test 3 — Unauthorized UPDATE

**Goal**: A user cannot UPDATE another business's rows.

1. Sign in as `user-a@example.com`.
2. Find Business B's customer (via service_role):
   ```sql
   select id, first_name from sw_customers where business_id = '<BUSINESS_B_UUID>';
   ```
3. Try to UPDATE that customer:
   ```sql
   update sw_customers set first_name = 'HACKED' where id = '<BUSINESS_B_CUSTOMER_ID>';
   ```
4. The UPDATE should affect 0 rows (RLS hides the row from the USING
   clause). Verify the customer is unchanged:
   ```sql
   select first_name from sw_customers where id = '<BUSINESS_B_CUSTOMER_ID>';
   -- should NOT return 'HACKED'
   ```

**Pass criterion**: UPDATE affects 0 rows; the row is unchanged.

## Test 4 — Unauthorized DELETE on financial records

**Goal**: Even a business OWNER cannot DELETE sales (they must use
soft delete via `deleted_at`).

1. Sign in as `user-a@example.com` (owner of Business A).
2. Find one of Business A's sales:
   ```sql
   select id from sw_sales limit 1;
   ```
3. Try to hard-delete it:
   ```sql
   delete from sw_sales where id = '<SALE_ID>';
   ```
4. Should fail with `violates row-level security policy`. The
   `sw_sales` table has no DELETE policy by design — financial
   records are soft-deleted via `deleted_at`.

**Pass criterion**: DELETE rejected.

## Test 5 — Sale creation is atomic

**Goal**: If any step of sale creation fails, the whole sale rolls
back. No partial state (no orphaned sale header, no decremented
stock without a ledger entry).

1. Sign in as `user-a@example.com`.
2. Note an inventory item's current stock:
   ```sql
   select id, name, stock from sw_inventory_items limit 1;
   -- e.g. id=UUID, name='Ankara Gown', stock=10
   ```
3. Try to create a sale that buys more than the available stock:
   ```sql
   select sw_create_sale(jsonb_build_object(
     'business_id', '<BUSINESS_A_UUID>',
     'payment', 'Cash',
     'status', 'completed',
     'items', jsonb_build_array(
       jsonb_build_object('item_id', '<ITEM_UUID>', 'qty', 999, 'unit_price', 100)
     )
   ));
   ```
4. Should raise an error: `Insufficient stock for item "Ankara
   Gown": have 10, need 999`.
5. Verify the sale header was NOT inserted:
   ```sql
   select count(*) from sw_sales where sale_date > now() - interval '5 minutes';
   -- should be 0
   ```
6. Verify the stock was NOT decremented:
   ```sql
   select stock from sw_inventory_items where id = '<ITEM_UUID>';
   -- should still be 10
   ```
7. Verify no stock_movement was written:
   ```sql
   select count(*) from sw_stock_movements where created_at > now() - interval '5 minutes';
   -- should be 0
   ```

**Pass criterion**: All four — sale header, line items, stock
decrement, stock_movement ledger — either all happen or none happen.

## Test 6 — Successful sale creates the full audit trail

**Goal**: A valid sale creates 4 things atomically:
   1. `sw_sales` row.
   2. `sw_sale_items` rows (one per item).
   3. `sw_inventory_items.stock` decrement.
   4. `sw_stock_movements` ledger entry (one per item).

1. Sign in as `user-a@example.com`.
2. Note the inventory item's stock before: `select stock from
   sw_inventory_items where id = '<ITEM_UUID>';` → e.g. 10.
3. Create a valid sale:
   ```sql
   select sw_create_sale(jsonb_build_object(
     'business_id', '<BUSINESS_A_UUID>',
     'payment', 'Cash',
     'status', 'completed',
     'items', jsonb_build_array(
       jsonb_build_object('item_id', '<ITEM_UUID>', 'qty', 2, 'unit_price', 100)
     )
   ));
   ```
4. Verify the returned `display_id` looks like `ORD-0001`.
5. Verify the 4 effects:
   ```sql
   select * from sw_sales where display_id = 'ORD-0001';
   -- 1 row, total = 200 (server-computed)

   select * from sw_sale_items where sale_id = (select id from sw_sales where display_id='ORD-0001');
   -- 1 row, qty=2, unit_price=100, line_total=200 (computed column)

   select stock from sw_inventory_items where id = '<ITEM_UUID>';
   -- 8 (was 10, decremented by 2)

   select * from sw_stock_movements where sale_id = (select id from sw_sales where display_id='ORD-0001');
   -- 1 row, kind='sale', qty=-2
   ```

**Pass criterion**: All 4 effects present.

## Test 7 — Server-side total computation

**Goal**: The client cannot pass a fake total. The server recomputes
the total from line items.

1. Sign in as `user-a@example.com`.
2. Call `sw_create_sale` with a `total` field in the payload
   (which the function IGNORES — it computes the total itself):
   ```sql
   select sw_create_sale(jsonb_build_object(
     'business_id', '<BUSINESS_A_UUID>',
     'payment', 'Cash',
     'total', 999999, -- client-supplied total, should be IGNORED
     'items', jsonb_build_array(
       jsonb_build_object('item_id', '<ITEM_UUID>', 'qty', 1, 'unit_price', 50)
     )
   ));
   ```
3. The returned `total` should be `50` (1 × 50), NOT `999999`.

**Pass criterion**: Returned total = sum(line items), regardless of
what the client passed.

## Test 8 — Unauthenticated access

**Goal**: An unauthenticated request can read/write nothing.

1. Open a terminal. Use `curl` (or Postman) to query the Supabase
   REST API WITHOUT an `Authorization` header:
   ```bash
   curl -sS -H "apikey: <anon_key>" \
     https://<project>.supabase.co/rest/v1/sw_customers
   ```
2. The response should be an empty array `[]` (RLS filters out all
   rows because `auth.uid()` is NULL → `current_user_sw_business_ids()`
   returns empty set → no rows match).
3. Try an INSERT without auth:
   ```bash
   curl -sS -X POST -H "apikey: <anon_key>" \
     -H "Content-Type: application/json" \
     -H "Prefer: return=representation" \
     -d '{"business_id":"<UUID>","first_name":"Anon","last_name":"Intruder","phone":"+234","type":"Retailer","location":"Lagos"}' \
     https://<project>.supabase.co/rest/v1/sw_customers
   ```
4. Should return `new row violates row-level security policy`.

**Pass criterion**: Unauthenticated requests return nothing and
cannot write.

## Test 9 — `sw_display_id_counters` is private

**Goal**: The counter table is unreadable and unwritable via the
anon/authenticated role. Only the `next_display_id()` SECURITY
DEFINER function can access it.

1. Sign in as `user-a@example.com`.
2. Try to read the counter table:
   ```bash
   curl -sS -H "apikey: <anon_key>" \
     -H "Authorization: Bearer <user_a_access_token>" \
     https://<project>.supabase.co/rest/v1/sw_display_id_counters
   ```
3. Should return an empty array (no RLS policy → no rows visible).
4. Try to insert directly:
   ```bash
   curl -sS -X POST -H "apikey: <anon_key>" \
     -H "Authorization: Bearer <user_a_access_token>" \
     -H "Content-Type: application/json" \
     -d '{"business_id":"<UUID>","entity":"sale","next_value":99999}' \
     https://<project>.supabase.co/rest/v1/sw_display_id_counters
   ```
5. Should fail with `violates row-level security policy`.

**Pass criterion**: Direct API access to the counter is blocked;
only the RPC function can use it.

## Test 10 — `sw_stock_movements` is read-only via the API

**Goal**: A malicious client cannot write a fake stock movement.

1. Sign in as `user-a@example.com`.
2. Try to INSERT a stock movement directly:
   ```bash
   curl -sS -X POST -H "apikey: <anon_key>" \
     -H "Authorization: Bearer <user_a_access_token>" \
     -H "Content-Type: application/json" \
     -d '{"business_id":"<UUID>","item_id":"<ITEM_UUID>","kind":"restock","qty":1000}' \
     https://<project>.supabase.co/rest/v1/sw_stock_movements
   ```
3. Should fail (RLS has no INSERT policy on `sw_stock_movements`).
4. To legitimately create a stock movement, the user must call the
   `sw_adjust_stock` or `sw_create_sale` RPC functions.

**Pass criterion**: Direct INSERT rejected; only RPC functions can
create stock movements.

## Summary table

| Test | Goal | Pass criterion |
|------|------|----------------|
| 1 | Read isolation | Each user sees only their own business's rows |
| 2 | Unauthorized INSERT | INSERT rejected by RLS |
| 3 | Unauthorized UPDATE | UPDATE affects 0 rows |
| 4 | No hard-delete on financials | DELETE rejected even for owners |
| 5 | Atomic sale creation | Partial failure rolls back all 4 effects |
| 6 | Successful sale audit trail | All 4 effects present |
| 7 | Server-side total | Client-supplied total ignored |
| 8 | Unauthenticated access | Empty reads + INSERT rejected |
| 9 | `sw_display_id_counters` private | Direct API access blocked |
| 10 | `sw_stock_movements` read-only | Direct INSERT rejected |

## If a test fails

- **Test 1 fails (cross-business read)**: P0 security exposure.
  Immediately review the affected policy. The likely cause is a
  missing `business_id` filter in the USING clause, or a recursive
  membership check.
- **Test 2/3 fail (cross-business write)**: P0 security exposure.
  Likely cause: missing `WITH CHECK` clause on the INSERT/UPDATE
  policy.
- **Test 4 fails (DELETE on financials allowed)**: P1 data-loss
  risk. Add a DELETE policy that restricts to owner role only, or
  remove the DELETE policy entirely.
- **Test 5 fails (partial sale state)**: P1 data-integrity bug. The
  `sw_create_sale` function must be `LANGUAGE plpgsql` (which is
  implicitly transactional). If it's `LANGUAGE sql`, it's NOT
  atomic — switch to plpgsql.
- **Tests 9/10 fail (privileged tables writable)**: P0 security
  exposure. A malicious client can fake stock movements / audit
  entries. Remove the policy that allows the write.

Do NOT mark RLS as verified until all 10 tests pass.
