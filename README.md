# LedgerAI — Smart Accounting

AI-powered accounting for Luxembourg businesses. Scan an invoice, the app runs
OCR + an LLM, classifies the spend, produces the double-entry booking, and
files it into the company ledger.

This repo holds the Vite + React + TypeScript frontend and the Supabase schema.

## Stack

| Layer     | Tech                                                              |
| --------- | ----------------------------------------------------------------- |
| Frontend  | React 18, TypeScript, Vite                                        |
| Styling   | Inline style tokens (`src/theme.ts`) — no runtime CSS framework   |
| 3D        | three.js (decorative scene headers on dashboard/upload/reports)   |
| Charts    | Pure SVG (`src/components/charts/*`)                              |
| Database  | Supabase (Postgres + Auth + Storage + RLS)                        |

## Getting started

```bash
npm install
cp .env.example .env.local      # optional — fill in Supabase creds
npm run dev
```

Without env vars the app boots with mock data from `src/lib/mockData.ts`, so
you can preview the UI immediately.

## Project layout

```
src/
├── App.tsx                    Top-level shell (sidebar + header + page switch)
├── main.tsx                   ReactDOM entry
├── index.css                  Globals, fonts, keyframes
├── theme.ts                   Design tokens (colors, categories)
├── types.ts                   Shared domain types
├── lib/
│   ├── format.ts              Currency formatters
│   ├── mockData.ts            Fake transactions / monthly stats
│   ├── supabase.ts            Supabase client (null when unconfigured)
│   └── database.types.ts      Typed DB schema
├── components/
│   ├── GlassCard.tsx          Frosted-glass surface
│   ├── Badge.tsx              Colored pill
│   ├── Sidebar.tsx            Collapsible nav
│   ├── Header.tsx             Page title + primary CTA
│   ├── Background.tsx         Ambient blur blobs
│   ├── Toast.tsx              Floating success banner
│   ├── ThreeScene.tsx         4 WebGL variants (dashboard/upload/reports/settings)
│   └── charts/
│       ├── AreaChart.tsx      Revenue vs expenses
│       ├── BarChart.tsx       Monthly profit bars
│       └── PieChart.tsx       Expense donut
├── pages/
│   ├── Dashboard.tsx          KPIs, charts, recent transactions
│   ├── Transactions.tsx       Filterable data grid
│   ├── Upload.tsx             Invoice scan flow (simulated OCR → AI → entry)
│   ├── Reports.tsx            P&L statement + VAT summary
│   └── Settings.tsx           Company, integrations, chart of accounts
└── hooks/
    ├── useToast.ts            Auto-dismissing toast
    └── useTransactions.ts     Supabase-backed + mock fallback

supabase/
└── migrations/
    └── 20260414000000_initial_schema.sql   Full LU accounting schema
```

## Database

`supabase/migrations/20260414000000_initial_schema.sql` creates:

- `companies` — one row per business, owned by an `auth.users` row
- `chart_of_accounts` — PCN Luxembourg-style codes, seeded automatically per company
- `transactions` — double-entry bookings with debit/credit account, VAT, status
- `invoices` — uploaded files + AI-extracted JSON + confidence score
- `integrations` — per-provider config (OpenAI, Google Vision, FIDUNAV, banking)

All tables are protected by row-level security so users can only see data for
companies they own (`public.is_company_owner(uuid)` helper).

To apply the migration against a local Supabase project:

```bash
supabase db push
```

Or copy the SQL into the Supabase Studio SQL editor.

## Scripts

```bash
npm run dev         # Vite dev server on :5173
npm run build       # Typecheck + production build
npm run typecheck   # tsc --noEmit
npm run preview     # Serve the production build locally
```

## Notes

- The upload flow currently simulates OCR/AI with random data. Wire it to
  OpenAI Vision + a parsing prompt (or Google Vision + Claude) inside
  `src/pages/Upload.tsx`'s `simulate()` callback.
- Auth isn't wired yet — plug `@supabase/supabase-js`'s auth UI onto the shell
  when you're ready to gate the dashboard.
