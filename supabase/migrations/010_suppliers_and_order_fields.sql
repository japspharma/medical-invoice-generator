-- ============================================================
-- 010 — SUPPLIERS MASTER + ORDER/DISPATCH FIELDS ON INVOICES
-- Run once in the Supabase SQL Editor.
--
-- 1) suppliers table: saved so purchase entry can pick them from
--    a dropdown instead of retyping.
-- 2) invoices: partys_order_no / order_date / dispatched_through
--    columns so the print template can show real values (default
--    '--' when left empty).
-- 3) Rebuilds both RPCs: invoice save persists the 3 new fields;
--    purchase save auto-saves the supplier into the master.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Suppliers master
-- ------------------------------------------------------------
create table if not exists public.suppliers (
  id          bigint generated always as identity primary key,
  supplier_name text not null,
  gst_number    text default '',
  phone         text default '',
  address       text default '',
  created_at    timestamptz default now()
);

-- One master row per name (case-insensitive)
create unique index if not exists suppliers_name_lower_uq
  on public.suppliers (lower(btrim(supplier_name)));

alter table public.suppliers enable row level security;

drop policy if exists "Allow app full access" on public.suppliers;
create policy "Allow app full access" on public.suppliers
  for all to anon, authenticated using (true) with check (true);

-- ------------------------------------------------------------
-- 2) Invoice order/dispatch columns
-- ------------------------------------------------------------
alter table public.invoices
  add column if not exists partys_order_no      text,
  add column if not exists order_date           text,
  add column if not exists dispatched_through   text;

-- ------------------------------------------------------------
-- 3) Seed suppliers from past purchases (one row per name)
-- ------------------------------------------------------------
insert into public.suppliers (supplier_name, gst_number, phone, address)
select p.supplier_name,
       max(coalesce(p.supplier_gst, '')),
       max(coalesce(p.supplier_phone, '')),
       max(coalesce(p.supplier_address, ''))
  from public.purchases p
 where not exists (
    select 1 from public.suppliers s
     where lower(btrim(s.supplier_name)) = lower(btrim(p.supplier_name))
 )
 group by p.supplier_name;

-- ------------------------------------------------------------
-- 4) Rebuild save_invoice_with_stock with the 3 new fields
--    (identical to 009 + order fields; keeps customer auto-save)
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
    partys_order_no, order_date, dispatched_through,
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
    nullif(trim(coalesce(p_invoice->>'partys_order_no', '')), ''),
    nullif(trim(coalesce(p_invoice->>'order_date', '')), ''),
    nullif(trim(coalesce(p_invoice->>'dispatched_through', '')), ''),
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
-- 5) Rebuild save_purchase_with_stock: also auto-save supplier
--    to the suppliers master (update details if it exists)
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
      phone      = coalesce(nullif(trim(coalesce(p_purchase->>'supplier_phone', '')), ''), phone),
      address    = coalesce(nullif(trim(coalesce(p_purchase->>'supplier_address', '')), ''), address)
    where id = v_existing_supp;
  else
    insert into suppliers (supplier_name, gst_number, phone, address)
    values (
      v_supplier,
      nullif(trim(coalesce(p_purchase->>'supplier_gst', '')), ''),
      nullif(trim(coalesce(p_purchase->>'supplier_phone', '')), ''),
      nullif(trim(coalesce(p_purchase->>'supplier_address', '')), '')
    );
  end if;

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
