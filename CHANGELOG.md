# Changelog

## 2026-11-23 (web app, PERSAL format)
- Web app rebuilt in the same format as the PERSAL web app: plain JavaScript in `app/`, no build step, GitHub Pages workflow,
  `config.js` for the Supabase connection, demo mode with a "View as" switcher, Microsoft and email-link sign-in.
- All working pages: home, new request, requests, my approvals and tasks, Payment Requests, request page with every step
  (technical check, quotes, pre-approval, Finance compliance and final check, order, receive and register, PCZEN, pre-handover
  check, courier, on-screen signing), handover form (print / PDF), asset register and My equipment, report a problem,
  incidents, monthly report and KPI, deliveries, store with calendar and check-out/return, donations and transfers,
  admin (people and roles, department contacts, settings), audit log, notifications, help.
- Menu codes follow the design canvas (1 to 11). All 19 prototype screens are in `app/screens/`; working pages show their
  prototype underneath. Root `index.html` + `.nojekyll` so GitHub Pages opens the app.
- Tested end to end in a browser: full request to handover, refused steps (photos missing, PCZEN item missing,
  self-approval, double booking, client-branded item, theft without case number).

## 2026-11-23 (database)
- Supabase schema split into migrations (core, security, storage) + seed; GitHub Action deploys them.
  21 tables, row-level security per role, database-issued reference numbers, business rules, append-only audit log,
  private file bucket. Rule tests passed on PostgreSQL 16.

## 2026-11-20
- QMS-05 document set brought up to date: department asset contacts, Anton for ordering, store and deliveries (RFQ Hub removed),
  new ordering and payment flow (pre-approval in Asset Management, compliance and final check in Finance Management).
- Development briefing, design canvas, training guides and decks updated to match.
