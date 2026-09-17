-- ============================================================
-- 004 — DELETE PURCHASE (reverses stock atomically)
-- Run once in the Supabase SQL Editor
-- (Dashboard → SQL Editor → New query → paste → Run)
--
-- delete_purchase_with_stock: removes the purchase and subtracts
--   the received qty (+ free qty) from medicine stock in ONE
--   transaction. If any medicine cannot be reversed (e.g. stock
--   already sold below the purchased qty), EVERYTHING rolls back
--   and an error explains which item is the problem.
-- ============================================================

create or replace function delete_purchase_with_stock(p_purchase_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_purchase     purchases%rowtype;
  v_line         jsonb;
  v_med          medicines%rowtype;
  v_add_qty      numeric;
  v_med_count    int;
begin
  -- Lock the purchase row so concurrent deletes/saves are safe
  select * into v_purchase
    from purchases
   where id = p_purchase_id
   for update;

  if v_purchase.id is null then
    raise exception 'Purchase % not found', p_purchase_id;
  end if;

  -- Reverse every line's stock effect
  for v_line in select * from jsonb_array_elements(coalesce(v_purchase.items, '[]'::jsonb))
  loop
    v_add_qty := coalesce((v_line->>'qty')::numeric, 0)
               + coalesce((v_line->>'free')::numeric, 0);

    if v_add_qty > 0 then
      -- Same matching rule as save_purchase_with_stock: by name,
      -- case-insensitive, lowest id first.
      select * into v_med
        from medicines
       where lower(medicine_name) = lower(trim(v_line->>'medicine_name'))
       order by id
       limit 1;

      get diagnostics v_med_count = row_count;

      if v_med_count = 0 then
        raise exception 'Cannot reverse: medicine % not found (was it renamed?)',
          v_line->>'medicine_name';
      end if;

      -- Refuse to go negative: if units were already sold, stock may be
      -- lower than what this purchase added. Roll back everything instead.
      if v_med.stock < v_add_qty then
        raise exception 'Cannot delete: stock of % (%) is less than purchased qty % — units were already sold',
          v_med.medicine_name, v_med.stock, v_add_qty;
      end if;

      update medicines
         set stock = stock - v_add_qty
       where id = v_med.id;
    end if;
  end loop;

  delete from purchases where id = p_purchase_id;

  return jsonb_build_object('ok', true, 'deleted_id', p_purchase_id);

exception
  when others then
    raise exception 'Purchase delete failed: %', sqlerrm;
end;
$$;

grant execute on function delete_purchase_with_stock(bigint) to anon, authenticated;
