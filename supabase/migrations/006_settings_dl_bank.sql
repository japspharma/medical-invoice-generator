-- ============================================================
-- 006 — SETTINGS: DRUG LICENSE + BANK DETAILS
-- Run once in the Supabase SQL Editor.
--
-- The Settings page gains a "DL No." field below GST Number, and the
-- invoice print template reads these from settings so they match
-- what you saved (instead of hardcoded defaults).
-- ============================================================

alter table settings add column if not exists drug_license text not null default '';
alter table settings add column if not exists account_name  text not null default '';
alter table settings add column if not exists bank_name     text not null default '';
alter table settings add column if not exists account_number text not null default '';
alter table settings add column if not exists ifsc_code     text not null default '';
alter table settings add column if not exists branch        text not null default '';

-- Seed with the correct company values (per the real invoice format).
update settings set
  drug_license   = coalesce(nullif(drug_license,    ''), 'TN-Z05-20B-00168 / TN-Z05-21B-00168'),
  account_name   = coalesce(nullif(account_name,    ''), 'JAPS HEALTHCARE'),
  bank_name      = coalesce(nullif(bank_name,       ''), 'HDFC BANK LTD'),
  account_number = coalesce(nullif(account_number,  ''), '59209940059095'),
  ifsc_code      = coalesce(nullif(ifsc_code,       ''), 'HDFC0000082'),
  branch         = coalesce(nullif(branch,          ''), 'Nungambakkam Branch, Chennai')
where id = 1;
