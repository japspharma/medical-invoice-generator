-- ============================================================
-- 012 — PACK FIELD ON MEDICINES
-- Run once in the Supabase SQL Editor.
--
-- The invoice format has a PACK column (e.g. "10x10") that the
-- billing grid was missing. Pack is master data like batch/HSN:
-- set it once on the Items page and it prefills at billing and
-- prints on the invoice.
-- ============================================================

alter table public.medicines
  add column if not exists pack text;
