# Angels Asset Management (QMS-05)

Asset Management module for the Angels Resource Centres NPO Management System: every piece of Angels equipment from
request to disposal — ask, approve, order, receive, prepare with PCZEN, courier, sign, look after, report problems and give away.
Status: **web app v0.1 and controlled documents, November 2026** — demo online; live database ready to connect.
Values in `[square brackets]` are placeholders or open decisions.

> **Private repository only.** Contains internal policies, procedures and registers. Never commit personal information
> (staff lists, ID numbers, asset register or insurance schedule exports with names, police case details, delivery addresses)
> — see `.gitignore` and POPIA.

## Start here

| What | Where |
| --- | --- |
| Development briefing (data model, status logic, screens, rules R-01 to R-32, tests, open decisions) | `docs/briefing/Asset-Management-Development-Briefing.md` (also `.docx` / `.pdf`) |
| Screen designs (19 screens, `.dc.html` canvas source) | `design/screens/` — list in `design/SCREENS.md`; live canvas: https://claude.ai/artifact/UnWM2a7MVh2SNWDwzTcfzi |
| QMS-05 controlled documents (policy, procedure, workflows, forms FRM-01 to 08, registers, five training guides) | `policies/` |
| **Web app** (online Asset Management, demo mode + live Supabase) | `app/` — setup in `docs/WEB-APP-SETUP.md` |
| **Supabase database** (schema, security, rules, file bucket, seed; deploys from GitHub) | `supabase/` — setup steps in `docs/SUPABASE-SETUP.md` |
| Organograms (original layout and by department, with asset contacts) | `docs/papers/` |

## Key design decisions

- One flow for every request: line manager → (budget holder if client-funded) → Anton's technical check (repair, stock or buy).
- Ordering and payment like Travel Hub: Anton gathers quotes and creates the Payment Request; Annemarie with Brent
  pre-approve and check the budget (Asset Management); Jessica does the full compliance check and upload, Gerald the
  final check before payment (Finance Management; CEO above the limit). Anton orders only after approval, then receives
  and registers in Asset Management. The RFQ Hub is not used.
- PCZEN prepares every device; Anton checks it before courier; the staff member signs on screen after a remote sign-in.
- One department asset contact and a backup per department coordinate with Anton (Operations: Abongile; HR: Jordan,
  backup Dana; Marketing: Juliana, backup Bev; Finance: Gerald, backup Jessica; Reports: Annemarie, backup Brent;
  Executive: Melissa, backup Anton). Contacts do not approve.
- Book value: straight-line over 3 years. Loan pool: 2 laptops. Laptops older than 4 years flagged as replacement due.
- Client-funded items carry the project code, are insured by the client and follow the client's ownership rules.

## Open items before go-live

CEO approval limit (setting `ceo_limit`), PCZEN agreed turnaround (`pczen_turnaround_days`), Supabase hosting and
POPIA section 72 sign-off, the link to Finance Management, and Teams notifications. See briefing section 14.

## Document control

QMS convention: Draft 0.x · Approved 1.0 · minor 1.x · major 2.0. Printed copies are uncontrolled.
