-- ============================================================
-- PURCHASES TABLE — run this once in the Supabase SQL Editor
-- (Dashboard → SQL Editor → New query → paste → Run)
-- ============================================================

create table if not exists purchases (
  id              bigint generated always as identity primary key,
  supplier_name   text not null,
  supplier_gst    text,
  supplier_phone  text,
  supplier_address text,
  invoice_ref     text,                -- supplier's own bill number
  purchase_date   date default current_date,
  subtotal        numeric(12,2) default 0,
  gst_amount      numeric(12,2) default 0,
  grand_total     numeric(12,2) default 0,
  items           jsonb default '[]'::jsonb,
  created_at      timestamptz default now()
);

-- Same read/write policy style the other tables use (anon key access)
alter table purchases enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'purchases' and policyname = 'Allow anon full access'
  ) then
    create policy "Allow anon full access"
      on purchases
      for all
      to anon
      using (true)
      with check (true);
  end if;
end $$;

-- Optional: quick lookup of purchases by supplier
create index if not exists purchases_supplier_name_idx
  on purchases (supplier_name);

create index if not exists purchases_purchase_date_idx
  on purchases (purchase_date desc);
