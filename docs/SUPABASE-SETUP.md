# Setting up the Asset Management database on Supabase

The `supabase/` folder holds the Asset Management database built from the development briefing:
21 tables, row-level security for every role, reference numbers issued by the database, the business rules
(R-03 to R-32), an append-only audit log, a private file bucket, and starting settings, department contacts and
store items (no personal data). It was tested on PostgreSQL 16 before upload.

> **Decision first.** The briefing leaves the stack and hosting to Brent and Gerald. Agree that Supabase is the
> platform before loading any real staff or asset data. Asset Management can share the Supabase project with PERSAL
> (all its tables start with `am_`) or have its own.

## 1. POPIA before you start
- Supabase has no South African region. Choose an EU region (for example Frankfurt `eu-central-1`) and record the
  cross-border transfer under POPIA section 72 (adequate protection / agreement) with the Information Officer.
- Use a paid plan with daily backups, and turn on MFA for every Supabase dashboard user.
- Load **test data only** until the Information Officer signs off. Never commit staff data or register exports to GitHub.
- Delivery addresses are not stored. Police case numbers and photos are kept only on incidents, visible to the
  reporter, the back office and the Information Officer.

## 2. Create the project
1. Sign in at supabase.com with the Angels account → New project → name `angels-asset-management`, EU region, strong database password.
2. Note the **Project ID** (Settings → General) and the **database password**.
3. Create an access token: Account → Access Tokens → Generate.

## 3. Connect GitHub (deploys automatically)
In the GitHub repository → Settings → Secrets and variables → Actions → add:
`SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_ID`.
Then Actions → "Deploy database to Supabase" → Run workflow. It applies `supabase/migrations/` and the seed.
Every later change in `supabase/migrations/` deploys on push to `main`.

Alternatively, from a laptop with the Supabase CLI:
```
supabase link --project-ref <project-id>
supabase db push --include-seed
```
Or paste the three migration files, in order, and then `seed.sql` into the SQL Editor.

| File | What it does |
| --- | --- |
| `migrations/20261123100001_am_core.sql` | Tables, roles helpers, reference numbers, business rules, audit triggers, profile on first sign-in |
| `migrations/20261123100002_am_security.sql` | Row-level security: who sees and changes what |
| `migrations/20261123100003_am_storage.sql` | Private `am-files` bucket for photos, quotes, invoices and certificates |
| `seed.sql` | Settings (CEO limit empty = not decided), six department contacts (names in notes), eight store items |

## 4. Sign-in with Microsoft (Entra ID)
Authentication → Providers → Azure: register an app in Entra, paste the client ID and secret, tenant URL as in `config.toml`.
Email-link sign-in works without Entra (Authentication → Providers → Email).

## 5. The first Asset Coordinator, then roles
Everyone gets a profile with the role `staff` on first sign-in. Make the first Asset Coordinator once (SQL Editor):
```sql
update public.profiles set roles = array['staff','asset_coordinator','dept_contact']
where email = 'name@your-organisation';
```
After that, the Asset Coordinator gives roles in the app: **Admin → People and roles**, and sets department contacts
in **Admin → Department contacts**.

| Role in `profiles.roles` | Who |
| --- | --- |
| `staff` | Everyone |
| `line_manager`, `budget_holder` | Approve the need; confirm the client budget line |
| `hr` | Logs new-starter requests at onboarding |
| `dept_contact` | Department asset contact (and backup): asks for store items, sees deliveries |
| `factotum` | Anton: technical check, quotes, Payment Request, order, receive, PCZEN, courier, store |
| `asset_coordinator` | Annemarie: pre-approval and budget check, signs handovers last, admin |
| `hod_ops` | Brent: pre-approval and budget check |
| `bookkeeper` | Jessica: compliance check and upload |
| `hof` | Gerald: final check before payment, write-offs |
| `ceo`, `treasurer` | Final approval above the CEO limit |
| `info_officer` | Incidents where personal information may be at risk |

## What the database enforces (tested)
- Reference numbers: AST-REQ, PR, AST-HO, AST-INC, BK, LOG, DON-IN, DON-OUT/TRF and asset numbers (ARC-LAP-2026-001,
  client-funded with the project code, ARC-TRN-TB-nn, ARC-MKT-xx-nn) are issued by the database, never typed.
- Nobody approves their own request; only the named approver decides a step; declines and holds need a reason.
- Payment Request order: pre-approval (Asset Coordinator or HOD Ops) → compliance (Bookkeeper) → final check
  (HOF; CEO above the limit) → Paid. The order can only be saved after Finance approval (R-10).
- Handover form: the staff member signs first, then Anton, then the Asset Coordinator; locked once complete.
- Store: no double booking of the same item; client-branded items only for that client's programmes.
- Theft needs a police case number; reports after 24 hours are flagged late; late new-starter requests are flagged.
- Donated-out, returned-to-client and disposed items cannot change status again.
- `am_audit` is append-only and readable only by the Asset Coordinator, HOD Ops and HOF.
- Staff see only their own requests, equipment and incidents; nothing is visible to anonymous users.
