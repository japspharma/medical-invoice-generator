-- ============================================================
-- 003 — REAL INVOICE NUMBERING + CUSTOMER AUTO-SAVE
-- Run once in the Supabase SQL Editor.
--
-- 1) settings.invoice_prefix  : editable prefix, e.g. "JAPS"
--    -> invoices become  JAPS-000001, JAPS-000002, ...
-- 2) invoice_number_seq       : server-side sequence (gap-safe, concurrency-safe)
-- 3) get_next_invoice_number(): RPC the app calls for each new invoice
-- 4) save_invoice_with_stock  : now also auto-saves brand-new customers
--    (name+mobile+gst+address) into the customers table so the
--    billing typeahead learns every new customer automatically.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Prefix column on settings (id=1 row)
-- ------------------------------------------------------------
alter table settings add column if not exists invoice_prefix text not null default 'INV';

update settings set invoice_prefix = 'INV' where invoice_prefix is null or invoice_prefix = '';

-- ------------------------------------------------------------
-- 2) Server-side sequence for the numeric part
-- ------------------------------------------------------------
create sequence if not exists invoice_number_seq start 1;

-- ------------------------------------------------------------
-- 3) RPC: next invoice number as <prefix>-<6 digits>
--    Reads the prefix from settings (id=1) and advances the sequence
--    atomically inside this function call.
-- ------------------------------------------------------------
create or replace function get_next_invoice_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prefix text;
  v_next   bigint;
begin
  select coalesce(nullif(trim(invoice_prefix), ''), 'INV')
    into v_prefix
    from settings
   where id = 1
   limit 1;

  if v_prefix is null then
    v_prefix := 'INV';  -- settings row missing; sensible default
  end if;

  v_next := nextval('invoice_number_seq');

  return v_prefix || '-' || lpad(v_next::text, 6, '0');
end;
$$;

-- ------------------------------------------------------------
-- 4) Upgrade save_invoice_with_stock: auto-save new customers
--    (same atomic behaviour as before, plus customer upsert)
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

  -- ----------------------------------------------------------
  -- Auto-save customer: only when a name exists AND no customer
  -- with the same name is already saved. Address is stored too.
  -- ----------------------------------------------------------
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

  -- ----------------------------------------------------------
  -- Insert the invoice
  -- ----------------------------------------------------------
  insert into invoices (
    invoice_number, customer_name, mobile_number, doctor_name,
    gst_number, address, tax_type, payment_type,
    subtotal, gst_amount, grand_total, items, created_at
  ) values (
    v_invoice_no,
    v_customer_name,
    v_mobile,
    nullif(trim(coalesce(p_invoice->>'doctor_name', '')), ''),
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

  -- ----------------------------------------------------------
  -- Decrement stock (whole transaction rolls back on shortage)
  -- ----------------------------------------------------------
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
-- 5) Permissions: allow the app's anon key to use the new RPC
-- ------------------------------------------------------------
grant execute on function get_next_invoice_number() to anon, authenticated;
grant execute on function save_invoice_with_stock(jsonb) to anon, authenticated;
