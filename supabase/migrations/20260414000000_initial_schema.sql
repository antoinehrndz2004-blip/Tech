-- =============================================================================
-- LedgerAI initial schema
-- Luxembourg-style accounting: companies, chart of accounts (PCN), transactions,
-- invoices and third-party integrations. All rows are scoped per-company and
-- protected by RLS so a user only sees data for companies they own.
-- =============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Companies
-- ---------------------------------------------------------------------------
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  vat_number text,
  address text,
  currency text not null default 'EUR',
  created_at timestamptz not null default now()
);
create index if not exists companies_owner_idx on public.companies (owner_id);

-- ---------------------------------------------------------------------------
-- Chart of accounts (PCN Luxembourg defaults)
-- ---------------------------------------------------------------------------
create type public.account_kind as enum (
  'asset', 'liability', 'equity', 'revenue', 'expense'
);

create table if not exists public.chart_of_accounts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  code text not null,
  label text not null,
  kind public.account_kind not null,
  unique (company_id, code)
);
create index if not exists coa_company_idx on public.chart_of_accounts (company_id);

-- ---------------------------------------------------------------------------
-- Invoices (uploaded files + AI-extracted data)
-- ---------------------------------------------------------------------------
create type public.invoice_status as enum (
  'uploaded', 'processing', 'extracted', 'confirmed', 'failed'
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  file_url text,
  status public.invoice_status not null default 'uploaded',
  extracted jsonb,
  confidence numeric(5, 2),
  transaction_id uuid,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null
);
create index if not exists invoices_company_idx on public.invoices (company_id);
create index if not exists invoices_status_idx on public.invoices (status);

-- ---------------------------------------------------------------------------
-- Transactions (double-entry bookings)
-- ---------------------------------------------------------------------------
create type public.tx_type as enum ('expense', 'revenue');
create type public.tx_status as enum ('verified', 'pending');

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  counterparty text not null,
  date date not null,
  total numeric(14, 2) not null,
  vat numeric(14, 2) not null default 0,
  category text not null,
  type public.tx_type not null,
  status public.tx_status not null default 'pending',
  debit_account text not null,
  credit_account text not null,
  invoice_id uuid references public.invoices (id) on delete set null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null
);
create index if not exists tx_company_idx on public.transactions (company_id);
create index if not exists tx_date_idx on public.transactions (date desc);
create index if not exists tx_category_idx on public.transactions (category);

alter table public.invoices
  add constraint invoices_transaction_fk
  foreign key (transaction_id) references public.transactions (id) on delete set null;

-- ---------------------------------------------------------------------------
-- Third-party integrations (OpenAI, Google Vision, Banking, FIDUNAV, …)
-- ---------------------------------------------------------------------------
create type public.integration_status as enum ('connected', 'setup', 'error');

create table if not exists public.integrations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  provider text not null,
  status public.integration_status not null default 'setup',
  config jsonb,
  updated_at timestamptz not null default now(),
  unique (company_id, provider)
);

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
alter table public.companies enable row level security;
alter table public.chart_of_accounts enable row level security;
alter table public.invoices enable row level security;
alter table public.transactions enable row level security;
alter table public.integrations enable row level security;

-- Helper: does the current user own this company?
create or replace function public.is_company_owner(c uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.companies
    where id = c and owner_id = auth.uid()
  );
$$;

create policy "companies: owner read"
  on public.companies for select
  using (owner_id = auth.uid());

create policy "companies: owner write"
  on public.companies for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "coa: by owner"
  on public.chart_of_accounts for all
  using (public.is_company_owner(company_id))
  with check (public.is_company_owner(company_id));

create policy "invoices: by owner"
  on public.invoices for all
  using (public.is_company_owner(company_id))
  with check (public.is_company_owner(company_id));

create policy "transactions: by owner"
  on public.transactions for all
  using (public.is_company_owner(company_id))
  with check (public.is_company_owner(company_id));

create policy "integrations: by owner"
  on public.integrations for all
  using (public.is_company_owner(company_id))
  with check (public.is_company_owner(company_id));

-- ---------------------------------------------------------------------------
-- Seed default PCN Luxembourg accounts whenever a new company is created
-- ---------------------------------------------------------------------------
create or replace function public.seed_default_coa()
returns trigger
language plpgsql
as $$
begin
  insert into public.chart_of_accounts (company_id, code, label, kind) values
    (new.id, '1200', 'Accounts Receivable',   'asset'),
    (new.id, '4456', 'VAT Deductible',        'asset'),
    (new.id, '4457', 'VAT Collected',         'liability'),
    (new.id, '5120', 'Bank Account',          'asset'),
    (new.id, '6100', 'General Expenses',      'expense'),
    (new.id, '6110', 'Software',              'expense'),
    (new.id, '6120', 'Rent',                  'expense'),
    (new.id, '6130', 'Transport',             'expense'),
    (new.id, '6140', 'Office Supplies',       'expense'),
    (new.id, '6150', 'Marketing',             'expense'),
    (new.id, '6160', 'Utilities',             'expense'),
    (new.id, '6170', 'Insurance',             'expense'),
    (new.id, '6180', 'Professional Services', 'expense'),
    (new.id, '6190', 'Food & Dining',         'expense'),
    (new.id, '7000', 'Sales Revenue',         'revenue');
  return new;
end;
$$;

drop trigger if exists on_company_created on public.companies;
create trigger on_company_created
  after insert on public.companies
  for each row
  execute function public.seed_default_coa();
