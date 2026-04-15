-- =============================================================================
-- Duplicate detection: hash the uploaded file so we can warn when the exact
-- same bytes are uploaded twice for the same company.
--
-- We deliberately DO NOT make this a unique constraint: some workflows
-- legitimately re-upload the same file (e.g. corrected scan, second invoice
-- with an identical layout), and hard-blocking would be frustrating. The
-- client queries this column and asks for confirmation instead.
-- =============================================================================

alter table public.invoices add column if not exists file_hash text;

create index if not exists invoices_hash_idx
  on public.invoices (company_id, file_hash);
