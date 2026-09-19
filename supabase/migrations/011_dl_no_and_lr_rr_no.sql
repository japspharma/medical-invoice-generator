-- ============================================================
-- 011 — DL NO (drug licence) + LR/RR NO FIELDS
-- Run once in the Supabase SQL Editor.
--
-- 1) customers.dl_no / suppliers.dl_no  — drug licence numbers
--    kept on the masters so billing & purchase auto-fill them.
-- 2) invoices.dl_no / invoices.lr_rr_no — saved per invoice so
--    the print template shows the real values.
-- 3) purchases.supplier_dl_no           — recorded per purchase.
-- 4) Rebuilds both RPCs: invoice save persists dl_no + lr_rr_no
--    (and auto-saves new customers with their DL No); purchase
--    save persists supplier_dl_no (and refreshes the supplier
--    master's DL No on every purchase).
-- ============================================================

-- ------------------------------------------------------------
-- 1) New columns on the four tables
-- ------------------------------------------------------------
alter table public.customers
  add column if not exists dl_no text;

alter table public.suppliers
  add column if not exists dl_no text;

alter table public.invoices
  add column if not exists dl_no   text,
  add column if not exists lr_rr_no text;

alter table public.purchases
  add column if not exists supplier_dl_no text;

-- ------------------------------------------------------------
-- 2) Rebuild save_invoice_with_stock (010 + dl_no / lr_rr_no)
-- ------------------------------------------------------------
create or replace function public.save_invoice_with_stock(p_invoice jsonb)
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
  v_dl            text;
  v_existing_cust bigint;
begin
  if jsonb_array_length(coalesce(p_invoice->'items', '[]'::jsonb)) = 0 then
    raise exception 'Invoice must contain at least one item';
  end if;

  v_invoice_no    := nullif(trim(coalesce(p_invoice->>'invoice_number', '')), '');
  v_customer_name := nullif(trim(coalesce(p_invoice->>'customer_name', '')), '');
  v_mobile        := nullif(trim(coalesce(p_invoice->>'mobile_number', '')), '');
  v_gst           := nullif(trim(coalesce(p_invoice->>'gst_number', '')), '');
  v_dl            := nullif(trim(coalesce(p_invoice->>'dl_no', '')), '');

  -- Auto-save new customers (from migration 003), now with DL No
  if v_customer_name is not null then
    select id into v_existing_cust
      from customers
     where lower(customer_name) = lower(v_customer_name)
     order by id
     limit 1;

    if v_existing_cust is null then
      insert into customers (customer_name, mobile_number, gst_number, dl_no, address)
      values (v_customer_name, coalesce(v_mobile, ''), coalesce(v_gst, ''),
              coalesce(v_dl, ''),
              coalesce(nullif(trim(p_invoice->>'address'), ''), ''));
    end if;
  end if;

  insert into invoices (
    invoice_number, customer_name, mobile_number, doctor_reg,
    gst_number, dl_no, address, tax_type, payment_type,
    partys_order_no, order_date, dispatched_through, lr_rr_no,
    subtotal, gst_amount, grand_total, items, created_at
  ) values (
    v_invoice_no,
    v_customer_name,
    v_mobile,
    nullif(trim(coalesce(p_invoice->>'doctor_reg', '')), ''),
    v_gst,
    v_dl,
    nullif(trim(coalesce(p_invoice->>'address', '')), ''),
    nullif(trim(coalesce(p_invoice->>'tax_type', '')), ''),
    nullif(trim(coalesce(p_invoice->>'payment_type', '')), ''),
    nullif(trim(coalesce(p_invoice->>'partys_order_no', '')), ''),
    nullif(trim(coalesce(p_invoice->>'order_date', '')), ''),
    nullif(trim(coalesce(p_invoice->>'dispatched_through', '')), ''),
    nullif(trim(coalesce(p_invoice->>'lr_rr_no', '')), ''),
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

-- ------------------------------------------------------------
-- 3) Rebuild save_purchase_with_stock (010 + supplier_dl_no)
-- ------------------------------------------------------------
create or replace function public.save_purchase_with_stock(p_purchase jsonb)
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
  v_existing_supp bigint;
begin
  v_supplier := nullif(trim(coalesce(p_purchase->>'supplier_name', '')), '');
  if v_supplier is null then
    raise exception 'Supplier name is required';
  end if;
  if jsonb_array_length(coalesce(p_purchase->'items', '[]'::jsonb)) = 0 then
    raise exception 'Purchase must contain at least one item';
  end if;

  -- Auto-save the supplier into the master (details refreshed on
  -- every purchase so the dropdown always shows the latest info)
  select id into v_existing_supp
    from suppliers
   where lower(btrim(supplier_name)) = lower(v_supplier)
   order by id
   limit 1;

  if v_existing_supp is not null then
    update suppliers set
      gst_number = coalesce(nullif(trim(coalesce(p_purchase->>'supplier_gst', '')), ''), gst_number),
      dl_no      = coalesce(nullif(trim(coalesce(p_purchase->>'supplier_dl_no', '')), ''), dl_no),
      phone      = coalesce(nullif(trim(coalesce(p_purchase->>'supplier_phone', '')), ''), phone),
      address    = coalesce(nullif(trim(coalesce(p_purchase->>'supplier_address', '')), ''), address)
    where id = v_existing_supp;
  else
    insert into suppliers (supplier_name, gst_number, dl_no, phone, address)
    values (
      v_supplier,
      nullif(trim(coalesce(p_purchase->>'supplier_gst', '')), ''),
      nullif(trim(coalesce(p_purchase->>'supplier_dl_no', '')), ''),
      nullif(trim(coalesce(p_purchase->>'supplier_phone', '')), ''),
      nullif(trim(coalesce(p_purchase->>'supplier_address', '')), '')
    );
  end if;

  insert into purchases (
    supplier_name, supplier_gst, supplier_dl_no, supplier_phone, supplier_address,
    invoice_ref, purchase_date,
    subtotal, gst_amount, grand_total, items, created_at
  ) values (
    v_supplier,
    nullif(trim(coalesce(p_purchase->>'supplier_gst', '')), ''),
    nullif(trim(coalesce(p_purchase->>'supplier_dl_no', '')), ''),
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

  for v_line in select * from jsonb_array_elements(coalesce(p_purchase->'items', '[]'::jsonb))
  loop
    v_qty     := coalesce((v_line->>'qty')::numeric, 0);
    v_free    := coalesce((v_line->>'free')::numeric, 0);
    v_add_qty := v_qty + v_free;

    if v_qty <= 0 then
      raise exception 'Item % has invalid quantity', v_line->>'medicine_name';
    end if;

    begin
      v_expiry := nullif(trim(coalesce(v_line->>'expiry', '')), '')::date;
    exception when others then
      v_expiry := null;
    end;

    select id into v_existing_id
      from medicines
     where lower(medicine_name) = lower(trim(v_line->>'medicine_name'))
     order by id
     limit 1;

    if v_existing_id is not null then
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

grant execute on function public.save_invoice_with_stock(jsonb) to anon, authenticated;
grant execute on function public.save_purchase_with_stock(jsonb) to anon, authenticated;
