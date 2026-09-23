-- ============================================================
-- 013 — DELETE INVOICE (BILLING HISTORY) RPCs
-- Run once in the Supabase SQL Editor.
-- (Dashboard → SQL Editor → New query → paste → Run)
--
-- Two ways to delete an invoice from History:
--
--   delete_invoice_only(p_id)        → removes the invoice ONLY.
--                                      Stock is left untouched
--                                      (use when only the record
--                                      is wrong or a duplicate).
--
--   delete_invoice_with_stock(p_id)  → removes the invoice AND adds
--                                      the sold qty (+ free) back to
--                                      medicine stock. Use when the
--                                      bill never actually happened.
--
-- Pass p_id = NULL to apply to ALL invoices (the "Clear All" button):
--   select delete_invoice_only(null);         -- wipe history only
--   select delete_invoice_with_stock(null);   -- wipe and restore stock
--
-- Stock restoration matches the save RPC exactly: units = qty + freeQty
-- (+ free for very old rows), restored to the medicine matched by
-- medicine_id (lowest-id name match as fallback for very old rows).
-- If a medicine was deleted from the master, that line is skipped and
-- reported in the result instead of failing the whole delete.
-- ============================================================

-- ------------------------------------------------------------
-- Option A: delete record only (stock untouched)
-- ------------------------------------------------------------
create or replace function public.delete_invoice_only(p_invoice_id bigint default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  -- Lock the target rows so concurrent saves/deletes are safe
  perform 1 from invoices
   where p_invoice_id is null or id = p_invoice_id
   for update;

  delete from invoices
   where p_invoice_id is null or id = p_invoice_id;

  get diagnostics v_count = row_count;

  if v_count = 0 and p_invoice_id is not null then
    raise exception 'Invoice % not found', p_invoice_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'deleted', v_count,
    'stock_restored', false
  );

exception
  when others then
    raise exception 'Invoice delete failed: %', sqlerrm;
end;
$$;

-- ------------------------------------------------------------
-- Option B: delete record + restore sold units to stock
-- ------------------------------------------------------------
create or replace function public.delete_invoice_with_stock(p_invoice_id bigint default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count       int;
  v_units       numeric;
  v_units_total numeric := 0;
  v_med_count   int;
  v_skipped     jsonb := '[]'::jsonb;
  v_name        text;
  v_med_id      bigint;
begin
  -- Lock the invoice rows first (also validates existence for single mode)
  perform 1 from invoices
   where p_invoice_id is null or id = p_invoice_id
   for update;

  if p_invoice_id is not null and not exists (
    select 1 from invoices where id = p_invoice_id
  ) then
    raise exception 'Invoice % not found', p_invoice_id;
  end if;

  -- Aggregate units to restore, per medicine, across all target invoices
  create temp table _inv_restore on commit drop as
  select (item->>'medicine_id')::bigint as mid,
         nullif(trim(coalesce(item->>'product', item->>'medicine_name', '')), '') as mname,
         coalesce((item->>'qty')::numeric, 0)
         + coalesce((item->>'freeQty')::numeric, 0)
         + coalesce((item->>'free')::numeric, 0) as units
    from invoices i
         cross join lateral jsonb_array_elements(coalesce(i.items, '[]'::jsonb)) item
   where p_invoice_id is null or i.id = p_invoice_id;

  -- Restore by medicine_id (the save RPC's matching rule)
  for v_med_id, v_units in
    select mid, sum(units) from _inv_restore where mid is not null group by mid
  loop
    update medicines
       set stock = stock + v_units
     where id = v_med_id;

    get diagnostics v_med_count = row_count;
    if v_med_count = 0 then
      v_skipped := v_skipped || jsonb_build_object('medicine_id', v_med_id, 'units', v_units);
    else
      v_units_total := v_units_total + v_units;
    end if;
  end loop;

  -- Fallback for very old rows saved without medicine_id: match by
  -- product name against the lowest-id medicine (same rule as purchase save)
  for v_name, v_units in
    select mname, sum(units) from _inv_restore
     where mid is null and mname is not null
     group by mname
  loop
    update medicines
       set stock = stock + v_units
     where id = (select min(id) from medicines
                  where lower(medicine_name) = lower(v_name));

    get diagnostics v_med_count = row_count;
    if v_med_count = 0 then
      v_skipped := v_skipped || jsonb_build_object('medicine', v_name, 'units', v_units);
    else
      v_units_total := v_units_total + v_units;
    end if;
  end loop;

  delete from invoices
   where p_invoice_id is null or id = p_invoice_id;

  get diagnostics v_count = row_count;

  return jsonb_build_object(
    'ok', true,
    'deleted', v_count,
    'stock_restored', true,
    'units_restored', v_units_total,
    'skipped', v_skipped
  );

exception
  when others then
    raise exception 'Invoice delete failed: %', sqlerrm;
end;
$$;

-- ------------------------------------------------------------
-- Allow the app's key to execute both
-- ------------------------------------------------------------
grant execute on function public.delete_invoice_only(bigint) to anon, authenticated;
grant execute on function public.delete_invoice_with_stock(bigint) to anon, authenticated;
