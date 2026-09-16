-- ============================================================
-- ATOMIC STOCK RPCs — run once in the Supabase SQL Editor
-- (Dashboard → SQL Editor → New query → paste → Run)
--
-- save_invoice_with_stock: inserts the invoice and decrements
--   medicine stock in ONE transaction (rolls back everything
--   if any item has insufficient stock).
--
-- save_purchase_with_stock: inserts the purchase, adds received
--   qty (+ free qty) to stock, updates batch/expiry/rate/MRP,
--   and creates new medicines automatically — all in ONE
--   transaction.
-- ============================================================

-- ------------------------------------------------------------
-- 1) INVOICE: insert + decrement stock atomically
-- ------------------------------------------------------------
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
begin
  -- Basic sanity: must have items
  if jsonb_array_length(coalesce(p_invoice->'items', '[]'::jsonb)) = 0 then
    raise exception 'Invoice must contain at least one item';
  end if;

  -- Insert the invoice first (so we can return its id)
  insert into invoices (
    invoice_number, customer_name, mobile_number, doctor_name,
    gst_number, address, tax_type, payment_type,
    subtotal, gst_amount, grand_total, items, created_at
  ) values (
    p_invoice->>'invoice_number',
    p_invoice->>'customer_name',
    p_invoice->>'mobile_number',
    p_invoice->>'doctor_name',
    p_invoice->>'gst_number',
    p_invoice->>'address',
    p_invoice->>'tax_type',
    p_invoice->>'payment_type',
    (p_invoice->>'subtotal')::numeric,
    (p_invoice->>'gst_amount')::numeric,
    (p_invoice->>'grand_total')::numeric,
    coalesce(p_invoice->'items', '[]'::jsonb),
    coalesce((p_invoice->>'created_at')::timestamptz, now())
  )
  returning id into v_invoice_id;

  v_invoice_no := p_invoice->>'invoice_number';

  -- Decrement stock for every item. A failed update (insufficient
  -- stock) rolls back the whole transaction, including the invoice.
  for v_item in select * from jsonb_array_elements(coalesce(p_invoice->'items', '[]'::jsonb))
  loop
    v_medicine_id := (v_item->>'medicine_id')::bigint;
    v_qty         := coalesce((v_item->>'qty')::numeric, 0);
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
    -- Transaction is aborted automatically; report a clean error
    raise exception 'Invoice save failed: %', sqlerrm;
end;
$$;

-- ------------------------------------------------------------
-- 2) PURCHASE: insert + add stock atomically
-- ------------------------------------------------------------
create or replace function save_purchase_with_stock(p_purchase jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_line          jsonb;
  v_existing_id   bigint;
  v_qty           numeric;
  v_free          numeric;
  v_add_qty       numeric;
  v_purchase_id   bigint;
  v_supplier      text;
begin
  -- Basic sanity: supplier + at least one valid line
  v_supplier := nullif(trim(coalesce(p_purchase->>'supplier_name', '')), '');
  if v_supplier is null then
    raise exception 'Supplier name is required';
  end if;
  if jsonb_array_length(coalesce(p_purchase->'items', '[]'::jsonb)) = 0 then
    raise exception 'Purchase must contain at least one item';
  end if;

  -- Insert the purchase record
  insert into purchases (
    supplier_name, supplier_gst, supplier_phone, supplier_address,
    invoice_ref, purchase_date,
    subtotal, gst_amount, grand_total, items, created_at
  ) values (
    v_supplier,
    nullif(trim(coalesce(p_purchase->>'supplier_gst', '')), ''),
    nullif(trim(coalesce(p_purchase->>'supplier_phone', '')), ''),
    nullif(trim(coalesce(p_purchase->>'supplier_address', '')), ''),
    nullif(trim(coalesce(p_purchase->>'invoice_ref', '')), ''),
    coalesce(nullif(p_purchase->>'purchase_date', '')::date, current_date),
    (p_purchase->>'subtotal')::numeric,
    (p_purchase->>'gst_amount')::numeric,
    (p_purchase->>'grand_total')::numeric,
    coalesce(p_purchase->'items', '[]'::jsonb),
    coalesce((p_purchase->>'created_at')::timestamptz, now())
  )
  returning id into v_purchase_id;

  v_supplier := p_purchase->>'supplier_name';

  -- Process each line: update existing medicine or insert a new one
  for v_line in select * from jsonb_array_elements(coalesce(p_purchase->'items', '[]'::jsonb))
  loop
    v_qty     := coalesce((v_line->>'qty')::numeric, 0);
    v_free    := coalesce((v_line->>'free')::numeric, 0);
    v_add_qty := v_qty + v_free;  -- free units enter stock too

    if v_qty <= 0 then
      raise exception 'Item % has invalid quantity', v_line->>'medicine_name';
    end if;

    -- Find existing medicine by name (case-insensitive). If the purchase
    -- carries a batch, prefer a row with the same name; keep it simple:
    -- the app historically works on one master row per medicine name.
    select id into v_existing_id
      from medicines
     where lower(medicine_name) = lower(trim(v_line->>'medicine_name'))
     order by id
     limit 1;

    if v_existing_id is not null then
      -- Update stock + master fields (batch/expiry/rate/mrp from this purchase)
      update medicines set
        stock   = stock + v_add_qty,
        batch   = coalesce(nullif(trim(v_line->>'batch'), ''), batch),
        expiry  = coalesce(nullif(trim(v_line->>'expiry'), ''), expiry),
        rate    = coalesce(nullif((v_line->>'rate')::numeric, 0), rate),
        mrp     = coalesce(nullif((v_line->>'mrp')::numeric, 0), mrp),
        gst     = coalesce(nullif((v_line->>'gst')::numeric, 0), gst),
        hsn     = coalesce(nullif(trim(v_line->>'hsn'), ''), hsn)
      where id = v_existing_id;
    else
      -- New medicine: create it with the received batch info
      insert into medicines (
        medicine_name, hsn, batch, expiry, mrp, rate, gst, stock, minimum_stock
      ) values (
        trim(v_line->>'medicine_name'),
        coalesce(v_line->>'hsn', ''),
        coalesce(v_line->>'batch', ''),
        coalesce(v_line->>'expiry', ''),
        coalesce((v_line->>'mrp')::numeric, 0),
        coalesce((v_line->>'rate')::numeric, 0),
        coalesce((v_line->>'gst')::numeric, 0),
        v_add_qty,
        0
      );
    end if;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'purchase_id', v_purchase_id,
    'supplier', v_supplier
  );

exception
  when others then
    raise exception 'Purchase save failed: %', sqlerrm;
end;
$$;

-- ------------------------------------------------------------
-- 3) Allow the anon role (used by the app's publishable key) to
--    execute these functions.
-- ------------------------------------------------------------
grant execute on function save_invoice_with_stock(jsonb) to anon, authenticated;
grant execute on function save_purchase_with_stock(jsonb) to anon, authenticated;
