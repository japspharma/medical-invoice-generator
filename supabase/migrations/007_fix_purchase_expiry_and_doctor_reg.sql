-- ============================================================
-- 007 — FIX PURCHASE SAVE (COALESCE text/date) + DOCTOR_REG RENAME
-- Run once in the Supabase SQL Editor.
--
-- 1) save_purchase_with_stock failed with
--    "COALESCE types text and date cannot be matched" because
--    medicines.expiry is a DATE column but the RPC compared it to
--    text. All expiry/batch values are now cast explicitly.
-- 2) invoices.doctor_name is renamed to doctor_reg (Doctor
--    Registration number) everywhere.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Rebuild save_purchase_with_stock with correct casts
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
  v_expiry        date;
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

    -- Parse the expiry once, as a proper DATE (handles empty strings).
    -- Invalid dates fall back to keeping the existing value.
    begin
      v_expiry := nullif(trim(coalesce(v_line->>'expiry', '')), '')::date;
    exception when others then
      v_expiry := null;
    end;

    -- Find existing medicine by name (case-insensitive)
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
        expiry  = coalesce(v_expiry, expiry),
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
        v_expiry,
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
-- 2) Rename doctor_name -> doctor_reg on invoices (safe to re-run)
-- ------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'invoices'
       and column_name = 'doctor_name'
  ) then
    alter table invoices rename column doctor_name to doctor_reg;
  end if;
end $$;

-- Rebuild save_invoice_with_stock to use the new column (keeps the
-- customer auto-save behaviour from migration 003).
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
    raise exception 'Invoice save failed: %', sqlerrm;
end;
$$;

-- ------------------------------------------------------------
-- 3) Grants
-- ------------------------------------------------------------
grant execute on function save_purchase_with_stock(jsonb) to anon, authenticated;
grant execute on function save_invoice_with_stock(jsonb) to anon, authenticated;
