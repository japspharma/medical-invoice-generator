-- ============================================================
-- 009 — FREE QTY AT BILLING REDUCES STOCK TOO
-- Run once in the Supabase SQL Editor.
--
-- The billing grid has a FREE column (goods given at no charge).
-- The invoice RPC previously decremented stock by QTY only, so free
-- units silently leaked. Now the stock deduction and the
-- insufficient-stock check both use QTY + FREE.
-- ============================================================

create or replace function save_invoice_with_stock(p_invoice jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item          jsonb;
  v_medicine_id   bigint;
  v_qty           numeric;
  v_rows_affected int;
  v_invoice_id    bigint;
  v_invoice_no    text;
  v_customer_name text;
  v_mobile        text;
  v_gst           text;
  v_existing_cust bigint;
begin
  if jsonb_array_length(coalesce(p_invoice->'items', '[]'::jsonb)) = 0 then
    raise exception 'Invoice must contain at least one item';
  end if;

  v_invoice_no    := nullif(trim(coalesce(p_invoice->>'invoice_number', '')), '');
  v_customer_name := nullif(trim(coalesce(p_invoice->>'customer_name', '')), '');
  v_mobile        := nullif(trim(coalesce(p_invoice->>'mobile_number', '')), '');
  v_gst           := nullif(trim(coalesce(p_invoice->>'gst_number', '')), '');

  -- Auto-save new customers (from migration 003)
  if v_customer_name is not null then
    select id into v_existing_cust
      from customers
     where lower(customer_name) = lower(v_customer_name)
     order by id
     limit 1;

    if v_existing_cust is null then
      insert into customers (customer_name, mobile_number, gst_number, address)
      values (v_customer_name, coalesce(v_mobile, ''), coalesce(v_gst, ''),
              coalesce(nullif(trim(p_invoice->>'address'), ''), ''));
    end if;
  end if;

  insert into invoices (
    invoice_number, customer_name, mobile_number, doctor_reg,
    gst_number, address, tax_type, payment_type,
    subtotal, gst_amount, grand_total, items, created_at
  ) values (
    v_invoice_no,
    v_customer_name,
    v_mobile,
    nullif(trim(coalesce(p_invoice->>'doctor_reg', '')), ''),
    v_gst,
    nullif(trim(coalesce(p_invoice->>'address', '')), ''),
    nullif(trim(coalesce(p_invoice->>'tax_type', '')), ''),
    nullif(trim(coalesce(p_invoice->>'payment_type', '')), ''),
    (p_invoice->>'subtotal')::numeric,
    (p_invoice->>'gst_amount')::numeric,
    (p_invoice->>'grand_total')::numeric,
    coalesce(p_invoice->'items', '[]'::jsonb),
    coalesce((p_invoice->>'created_at')::timestamptz, now())
  )
  returning id into v_invoice_id;

  v_invoice_no := p_invoice->>'invoice_number';

  -- Deduct QTY + FREE for every item; a shortage rolls back everything
  for v_item in select * from jsonb_array_elements(coalesce(p_invoice->'items', '[]'::jsonb))
  loop
    v_medicine_id := (v_item->>'medicine_id')::bigint;
    v_qty         := coalesce((v_item->>'qty')::numeric, 0)
                   + coalesce((v_item->>'freeQty')::numeric, 0)
                   + coalesce((v_item->>'free')::numeric, 0);
    v_rows_affected := 0;

    if v_medicine_id is null then
      raise exception 'Item % is missing medicine_id', v_item->>'product';
    end if;

    update medicines
       set stock = stock - v_qty
     where id = v_medicine_id
       and stock >= v_qty;

    get diagnostics v_rows_affected = row_count;
    if v_rows_affected = 0 then
      raise exception 'Insufficient stock for % (need %)', v_item->>'product', v_qty;
    end if;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'invoice_id', v_invoice_id,
    'invoice_number', v_invoice_no
  );

exception
  when others then
    raise exception 'Invoice save failed: %', sqlerrm;
end;
$$;

grant execute on function save_invoice_with_stock(jsonb) to anon, authenticated;
