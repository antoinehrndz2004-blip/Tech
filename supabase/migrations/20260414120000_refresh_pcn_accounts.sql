-- =============================================================================
-- Refresh the seeded chart of accounts to the real Luxembourg PCN 2011 codes.
-- The initial migration shipped with ad-hoc codes (6100, 5120, …) that did not
-- match the Plan Comptable Normalisé. This migration:
--   1. Replaces `seed_default_coa` with the correct codes.
--   2. Re-seeds every existing company so rows already in the table line up
--      with the new defaults.
-- Transactions reference account codes as free text, so no FK cascade issues.
-- =============================================================================

create or replace function public.seed_default_coa()
returns trigger
language plpgsql
as $$
begin
  insert into public.chart_of_accounts (company_id, code, label, kind) values
    (new.id, '401',  'Fournisseurs',                                   'liability'),
    (new.id, '411',  'Clients',                                        'asset'),
    (new.id, '4421', 'TVA déductible',                                 'asset'),
    (new.id, '4425', 'TVA collectée',                                  'liability'),
    (new.id, '5131', 'Banques — Compte courant',                       'asset'),
    (new.id, '531',  'Caisse',                                         'asset'),
    (new.id, '606',  'Achats non stockés de fournitures',              'expense'),
    (new.id, '6051', 'Eau, gaz, électricité, combustibles',            'expense'),
    (new.id, '6061', 'Logiciels, licences et abonnements',             'expense'),
    (new.id, '611',  'Locations et charges locatives',                 'expense'),
    (new.id, '613',  'Primes et cotisations d''assurance',             'expense'),
    (new.id, '616',  'Rémunérations, commissions et honoraires',       'expense'),
    (new.id, '621',  'Publicité, relations publiques',                 'expense'),
    (new.id, '622',  'Missions, réceptions et frais de représentation','expense'),
    (new.id, '623',  'Voyages et déplacements',                        'expense'),
    (new.id, '648',  'Autres charges d''exploitation',                 'expense'),
    (new.id, '705',  'Prestations de services',                        'revenue'),
    (new.id, '707',  'Ventes de marchandises',                         'revenue');
  return new;
end;
$$;

-- Re-seed every existing company: wipe its accounts and reinsert the PCN list.
delete from public.chart_of_accounts;

insert into public.chart_of_accounts (company_id, code, label, kind)
select c.id, v.code, v.label, v.kind::public.account_kind
from public.companies c
cross join (values
  ('401',  'Fournisseurs',                                   'liability'),
  ('411',  'Clients',                                        'asset'),
  ('4421', 'TVA déductible',                                 'asset'),
  ('4425', 'TVA collectée',                                  'liability'),
  ('5131', 'Banques — Compte courant',                       'asset'),
  ('531',  'Caisse',                                         'asset'),
  ('606',  'Achats non stockés de fournitures',              'expense'),
  ('6051', 'Eau, gaz, électricité, combustibles',            'expense'),
  ('6061', 'Logiciels, licences et abonnements',             'expense'),
  ('611',  'Locations et charges locatives',                 'expense'),
  ('613',  'Primes et cotisations d''assurance',             'expense'),
  ('616',  'Rémunérations, commissions et honoraires',       'expense'),
  ('621',  'Publicité, relations publiques',                 'expense'),
  ('622',  'Missions, réceptions et frais de représentation','expense'),
  ('623',  'Voyages et déplacements',                        'expense'),
  ('648',  'Autres charges d''exploitation',                 'expense'),
  ('705',  'Prestations de services',                        'revenue'),
  ('707',  'Ventes de marchandises',                         'revenue')
) as v(code, label, kind);
