# Putting the Asset Management web app online

The web app is in `app/`: plain HTML, CSS and JavaScript, no build step (the same set-up as the PERSAL web app).
GitHub Pages hosts it; Supabase holds the data.

## Step 1 – See it online in demo mode (5 minutes)
1. Upload the repository to GitHub (keep it **Private** if your plan allows Pages on private repos; otherwise make a
   separate public repo that contains only the `app/` folder and `.github/workflows/pages.yml` — never the documents).
2. GitHub → Settings → Pages → Source: **GitHub Actions**.
3. Actions → "Publish the Asset Management web app" → Run workflow.
4. Open the address it shows (for example `https://<your-account>.github.io/angels-asset-management/`).

Demo mode shows sample people and items only, kept in the browser tab. Use **View as** at the top to act as each person
and walk a request end to end: Thandi (staff) asks → Abongile (line manager) approves → Anton does the technical check,
quotes and the Payment Request → Annemarie or Brent pre-approve → Jessica (compliance) → Gerald (final check) →
Anton orders, receives, sends to PCZEN, checks and couriers → Thandi signs → Anton signs → Annemarie signs last.
**Reset demo** starts again. Nothing is saved online.

## Step 2 – Connect the real database
1. Set up Supabase first: `docs/SUPABASE-SETUP.md` (POPIA hosting note included).
2. Supabase → Project Settings → API: copy the **Project URL** and the **anon public** key.
3. In `app/config.js` set `DEMO: false` and paste both values. Commit: the site republishes automatically.
4. Supabase → Authentication → URL Configuration: add your GitHub Pages address as the Site URL and a Redirect URL.
5. Sign in with Microsoft (Azure provider) or the emailed link. A profile is created on first sign-in with the role
   `staff`. The Asset Coordinator then gives roles, department and line manager in **Admin → People and roles**
   (the very first Asset Coordinator is set once in the SQL Editor — see `docs/SUPABASE-SETUP.md`).
6. Optional: set `PCZEN_EMAIL` in `config.js` so "Email PCZEN" on a lost or stolen device opens a ready email.

The anon key is meant to be public: the database's row-level security and rules decide what each person sees and does.
Never put the `service_role` key in the app.

## What is in this version
| Code | Page | Who |
| --- | --- | --- |
| 1 | Home: what do you need, open requests | Everyone |
| 2 / 2b | New request (who, what, why/when/who pays, delivery) and Requests | Everyone |
| 3 | My approvals and tasks (one list per person) | Everyone |
| 2c | Payment Requests: pre-approval (Asset Management), compliance and final check (stand-in for Finance Management) | Asset Coordinator, HOD Ops, Bookkeeper, HOF, CEO |
| 3b / 3c | Request page: technical check, quotes, order, receive and register (photos, serial), PCZEN hand-off and return, pre-handover check, courier, staff signs on screen, Anton and Annemarie sign | By step |
| 5 | Equipment Issue and Acknowledgement (FRM-02), print / PDF, SHA-256 integrity code | Everyone involved |
| 4 | Asset register with filters, book value, broker schedule and CSV export; My equipment for staff | Back office / staff |
| 6 / 7 | Report a problem; incident case, claim pack, linked replacement, write-off | Staff / back office |
| 8 | Monthly report and KPI, PCZEN turnaround | Back office, line managers |
| 9 | Deliveries and collections log | Anton, Asset Coordinator, department contacts |
| 10 / 10b | Training and marketing store: 14-day calendar, booking, check-out and return | Everyone sees; contacts ask; Anton books |
| 11 / 11b / 11c | Donations in and out, transfers, returns to clients, certificate | Back office |
| A | Admin: people and roles, department asset contacts, settings; audit log | Asset Coordinator (HOD Ops, HOF read) |
| D | Prototype screens: all 19 canvas screens; each working page also shows its prototype underneath | Everyone |

Pages refuse roles that may not use them; the database refuses the data as well.

## Still to build (briefing sections 8 and 12)
- Link to Finance Management: the Payment Request steps for Jessica and Gerald then happen there, and the status
  comes back to Asset Management.
- Teams and email notifications (Supabase Edge Function); daily reminders for overdue approvals and late deliveries.
- Insurance schedule upload to the broker; QR label printing; scheduled monthly report email.
