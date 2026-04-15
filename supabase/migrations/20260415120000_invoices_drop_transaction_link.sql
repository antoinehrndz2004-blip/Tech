-- =============================================================================
-- A single uploaded file (especially a multi-page PDF) can now produce many
-- transactions, so the 1:1 invoices→transactions back-link is wrong. Drop it;
-- lookups now go via transactions.invoice_id (N:1).
-- =============================================================================

alter table public.invoices drop constraint if exists invoices_transaction_fk;
alter table public.invoices drop column if exists transaction_id;
