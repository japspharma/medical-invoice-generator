-- ============================================================
-- 008 — FIX TABLE ACCESS FOR LOGGED-IN USERS
-- Run once in the Supabase SQL Editor.
--
-- The purchases table policy covered only the `anon` role. Since the
-- login feature landed, the app queries Supabase as `authenticated`,
-- so every direct SELECT on purchases returned ZERO rows (the
-- security-definer RPCs still worked, which masked the problem).
-- Result: Purchase History page always looked empty.
--
-- This migration widens every table's policy to BOTH anon and
-- authenticated, matching the app's access pattern.
-- ============================================================

do $$
declare
  t text;
begin
  foreach t in array array['purchases', 'invoices', 'medicines', 'customers', 'settings']
  loop
    if exists (select 1 from information_schema.tables
               where table_schema = 'public' and table_name = t) then
      execute format('drop policy if exists "Allow anon full access" on %I', t);
      execute format('create policy "Allow app full access" on %I for all to anon, authenticated using (true) with check (true)', t);
    end if;
  end loop;
end $$;
