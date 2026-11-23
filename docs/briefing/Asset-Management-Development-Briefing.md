# Asset Management Module — Development Briefing

Nov 20, 2026 · @Annemarie · For Brent (HOD Operations and System Developer)

Build Asset Management as a new tab in the NPO Management System. It runs every piece of Angels equipment from request to disposal: ask, approve, order, receive, prepare with PCZEN, courier to staff, sign, look after, report problems, and give away. This brief gives you the data model, status logic, screens, rules, integrations and tests to build it. The process is already written down and controlled in the QMS-05 document set, and the screens are drawn on the design canvas.

## 1. Purpose and scope

**Why it exists.** It delivers the proposed General Operations KPI: *new-hire equipment and onboarding requests coordinated and processed within agreed timeframes*. Today requests arrive by email, WhatsApp and the PCZEN portal, and nobody can see where a laptop is or who signed for it. In November 2026 your own laptop sat with PCZEN for more than a week and came back without its mouse and without setup. The module is designed to make that visible and measurable.

**Who it is for.** About 50 staff, all working from home, plus Anton (Factotum), Abongile and the other department asset contacts, Annemarie (Operations and Programme Systems Coordinator), line managers, the Bookkeeper, the Head of Finance, the CEO and the Board Treasurer.

### In scope for Release 1

| Area | What it covers | QMS reference |
| --- | --- | --- |
| Requests and approvals | New starter, replacement, additional item and loan requests; line manager, budget holder, Anton's technical check, and pre-approval with budget check by Annemarie and Brent | SOP 4.1–4.2, WF-01, FRM-01 |
| Ordering | Anton gets quotes and creates the Payment Request; Annemarie and Brent pre-approve; Finance Management (Jessica, then Gerald) approves; Anton orders | SOP 4.3 |
| Receiving and register | Invoice upload, asset number, photos, QR label, funding, owner and insurance | SOP 4.4, REG-02 |
| PCZEN preparation | Hand-off list, ticket number, return check, turnaround days | SOP 4.5, FRM-08 A |
| Handover | Anton's pre-handover check, courier, remote Authenticator sign-in, e-signature, locked PDF | SOP 4.6, FRM-08 B–C, FRM-02 |
| Returns and transfers | Exit, loan end, replacement, project end | SOP 4.7, FRM-03 |
| Training and marketing store | Abongile books, Anton prepares, checks out and checks in; calendar with clashes | SOP 4.8, WF-03, FRM-07 |
| Deliveries and collections | Suppliers, ZipPrint, couriers; reminders and late alerts | SOP 4.9 |
| Incidents | Loss, theft, damage; PCZEN lock and wipe; claim pack; write-off | SOP 4.10, WF-02, FRM-04 |
| Donations | In (wipe, register, Section 18A question) and out (consent, approval, wipe, certificate) | SOP 4.11–4.12, WF-04–05, FRM-05–06 |
| Annual check and reporting | February confirmation, monthly report and KPI | SOP 4.13–4.14 |

### Out of scope

- **Accounts, email, software and licences.** These stay with PCZEN and their portal. The module stores only the PCZEN ticket number and dates.
- **Consumables** (paper, toner, stationery).
- **HR data.** No salaries, contracts or ID numbers. HR only logs new-starter requests and triggers exits.
- **Payment approval and release.** That stays in Finance Management under FIN-01.
- **Supplier master data.** There is no RFQ Hub link. Anton attaches the quotes (FIN-03) and the Bookkeeper verifies the supplier and bank details in Finance Management.
- **Staff home addresses.** An address is typed for one courier booking and never saved to the register.

## 2. Where it sits

Asset Management is a new tab in the NPO Management System, beside Finance Management, and it should use the system's existing stack, sign-in, components and database rather than a separate app. It is deliberately not in PERSAL, because PERSAL is HR-only and staff cannot have access to it. Section 8 gives the detail of each connection.

&#91;embedded content: system context · 1 module, 9 connections\]

The tab is renamed from the earlier working name “Asset Requests”; use **Asset Management** everywhere in menus, URLs and table prefixes (for example `am_`).

**Architecture notes for the build**

- One module, one set of tables, with the polymorphic `attachment`, `approval_step`, `notification` and `audit_log` tables shared across processes.
- A scheduler (background job) for reminders, late alerts, escalations, PCZEN day counts and the monthly report draft.
- A small service for working days (weekends, SA public holidays, December closure) used by every timeframe.
- A PDF service that renders FRM-02, FRM-06 and FRM-07 from the stored record, then locks and hashes the file.
- Server-side permission checks on every call (section 3); screens only hide what the server already refuses.

## 3. Roles and access

Access follows the Angels Microsoft (Entra ID) account and the person's role; there are no separate passwords. A person can hold more than one role, and the permissions add up. Staff only ever see their own items, because the register links names to equipment (POPIA).

### Roles

| Role | Person today | Main job in the module |
| --- | --- | --- |
| Staff (everyone) | All staff | Request, track, receive and sign, report problems, return, view the store calendar, confirm items in February |
| HR | Jordan Smith (HR Assistant) | Log new-starter requests through onboarding; exit trigger only |
| Line manager | Each HOD or supervisor | Approve the need |
| Programme budget holder | Programme manager per client | Confirm the budget line on client-funded requests |
| Factotum | Anton | Technical check; quotes and Payment Request; ordering after Finance approval; receiving, register entries, PCZEN hand-off and return, pre-handover check, courier; store bookings; deliveries log; incidents; donations |
| Department asset contact | One per department, with a backup (see below) | Coordinate with Anton on requests, deliveries, collections, returns, store items and the February check. No approval rights |
| Asset Coordinator | Annemarie (Operations and Programme Systems Coordinator) | Pre-approval and budget check with the HOD Operations; oversight, reminders, receipt check for store and marketing items, handover counter-signature, claim packs, reports, lists and settings, annual check |
| HOD Operations | Brent | Pre-approval and budget check with the Asset Coordinator; process owner; escalations and the monthly report |
| Bookkeeper | Jessica (in Finance Management) | Full compliance check of the Payment Request (supplier, bank details, documents) and upload |
| Head of Finance | Gerald (in Finance Management) | Final check before payment; write-offs and donations out; insurance decisions; Section 18A |
| CEO | Lizelle | Final approval above \[R limit\] |
| Board Treasurer | Jim | Approves instead of the CEO when the CEO is the requester |
| Information Officer | Board Chair (POPIA) | Receives alerts when information may be on a lost or stolen device |
| PCZEN | Johan (external) | No login. Works from email or Teams notifications and the PCZEN portal |

### Permission matrix

V = view, C = create, E = edit, A = approve, own = only their own records.

| Area | Staff | Line mgr | Factotum | Dept contact | Asset Coord + HOD Ops | Bookkeeper / HOF | CEO / Treasurer |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Requests | C, V own | V team, A | V all, E tech check | V dept | V all, E | V | V |
| Quotes and Payment Request | none | V team | C, E | none | V, A pre-approval | V (decides in Finance Management) | V above limit |
| Orders | none | none | C, E after Finance approval | none | V | V | none |
| Asset register | V own | V team | V, C, E | V dept | V, E | V, E insurance | V |
| PCZEN hand-off and checks | none | none | C, E | none | V | none | none |
| Handover form FRM-02 | sign own | none | sign issued-by | none | sign last (Asset Coord) | V | none |
| Store calendar and bookings | V | V | V, C, E | V, ask | V, E | V | none |
| Deliveries log | none | none | V, C, E | V dept | V, E | none | none |
| Incidents | C, V own | V team | V, E | V dept | V, E, claim pack | V, A write-off | none |
| Donations in and out | none | none | C, E | C proposal (Operations) | V, E | A | A above limit |
| Reports | none | team view | V | dept view | V, export | V, export | V |
| Lists, contacts, roles, audit log | none | none | none | none | E (Asset Coord); V (HOD Ops) | V | none |

**Rule:** nobody approves their own request. If the requester holds the approving role, the step moves up one level (HOF → CEO; CEO → Board Treasurer).

### Department asset contacts

Each department has one contact and a backup who coordinate with Anton. They do not approve; staff still sign for their own equipment and report their own incidents. Store the list in settings so notifications for a department copy its contact.

| Department | Contact | Backup | Notes |
| --- | --- | --- | --- |
| Operations (programme teams) | Abongile Gotyana | Annemarie Mostert | HR handles new staff through onboarding; after that, broken laptops and other problems go through Abongile |
| Human Resources | Jordan Smith | Dana Dreyer | Logs new-starter requests |
| Marketing / PR | Juliana Semple | Bev Mallows | Heaviest store user |
| Finance | Gerald Erasmus | Jessica Tuna |  |
| Reports (Jim Cairns) | Annemarie Mostert | Brent Proctor |  |
| Executive | Melissa Gilomee | Anton Schoeman | CEO and PA |

## 4. Data model

Twenty-one tables cover the module (the request and asset core, one or two per process, notifications and the audit log), plus nine lists. Table names below are logical; map them to the NPO Management System's existing database conventions. Every table also carries `created_at`, `created_by`, `updated_at` and `updated_by`, and every change writes a row to `audit_log` (section 11).

### Reference numbers

| Record | Format | Example |
| --- | --- | --- |
| Request | AST-REQ-yyyy-nnn | AST-REQ-2026-011 |
| Asset (IT) | ARC-\[LAP/MON/PRN/ACC\]-yyyy-nnn; client-funded items add the project code | ARC-LAP-2026-015 |
| Store item | ARC-TRN-\[short code\] or ARC-MKT-\[short code\]; short codes TB, FB, PB, GZ, SK + nn | ARC-TRN-TB-01 |
| Handover (FRM-02) | AST-HO-yyyy-nnn | AST-HO-2026-016 |
| Incident (FRM-04) | AST-INC-yyyy-nnn | AST-INC-2026-003 |
| Store booking (FRM-07) | BK-yyyy-nnn | BK-2026-014 |
| Deliveries log entry | LOG-nnnn | LOG-0412 |
| Donation received (FRM-05) | DON-IN-yyyy-nnn | DON-IN-2026-002 |
| Donation out (FRM-06) | DON-OUT-yyyy-nnn | DON-OUT-2026-003 |
| Transfer, return to client, sale | TRF-yyyy-nnn | TRF-2026-001 |
| Purchase order (typed by Anton when ordering) | PO-yyyy-nnnn | PO-2026-0457 |
| Payment Request (Finance Management) | PR-yyyy-nnnn | PR-2026-0318 |

Sequences reset each calendar year and are issued by the database, never typed by a user.

### Lists (maintained by the Asset Coordinator)

| List | Values |
| --- | --- |
| `category` | Laptop, Monitor, Printer, Accessory, Training box, Marketing material |
| `laptop_tier` | Management, Standard, Design / Media, n/a; each tier has a spec note and the roles it suits |
| `funding_source` | Angels, each client programme (Scatec E4C, Scatec Y4C, Noblesfontein (NWF) E4C, Seriti Green, …), Donated |
| `insurance_status` | Angels insures, Client insures, Angels with client contribution, Not insured |
| `condition` | New, Good, Fair, Damaged, Written off |
| `asset_status` | In store, Issued, Booked out, On loan, In repair, With PCZEN, Returned, Donated out, Returned to client, Disposed |
| `log_type` | Delivery in, Collection by Angels, Dispatch out, Courier collection |
| `log_status` | Expected, Ready to collect, Booked, Received, Collected, Delivered, Late, Cancelled |
| `settings` | CEO approval limit \[R limit\], PCZEN turnaround \[X\] days, working-day calendar with SA public holidays and the December closure, reminder and escalation offsets |

### Core tables

**`asset_request`** — one row per request (FRM-01).

| Field | Type | Notes |
| --- | --- | --- |
| ref | text, unique | AST-REQ-yyyy-nnn |
| request\_type | enum | New starter, Replacement, Additional item, Loan |
| requested\_by | user | Logged-in user |
| for\_person | user or text | A new starter may not have an account yet: store name, role, start date, line manager |
| line\_manager | user | Defaults from the directory; editable |
| category | list |  |
| item\_description | text |  |
| laptop\_tier | list | Suggested from role; final value set at the technical check |
| main\_use | enum | e.g. Office work, Design and media, Training delivery, Field work |
| travels\_with\_user | yes/no | Drives the insurance note |
| replaces\_asset | asset FK | Auto-filled for replacements |
| replacement\_reason | enum + text | Old or slow, Damaged, Lost, Stolen, Other |
| incident | incident FK | Required when the reason is Damaged, Lost or Stolen |
| business\_reason | text | Required |
| date\_needed | date | New starters: start date |
| funding\_source | list | Angels or a client programme |
| project\_code, budget\_line, client\_po\_ref | text | Required when client-funded |
| owner\_after\_project | enum | Client, Angels, Beneficiary (as the agreement says) |
| delivery\_route | enum | Via Anton then courier (default), Direct to staff (needs approval), Client site |
| status | enum | See section 5 |
| tech\_outcome | enum | Repair, Issue from stock, Buy new |
| old\_laptop\_destination | enum | Return to stock, Loan pool, Repair, Donation, Disposal |
| spec\_notes | text | Anton's notes for procurement |
| late\_request | yes/no | Computed: new starter logged fewer than 10 working days before start |
| handed\_over\_at | datetime | Set when FRM-02 is fully signed |

**`approval_step`** — one row per step per request; also used for write-offs and donations out.

| Field | Type | Notes |
| --- | --- | --- |
| subject\_type, subject\_id | polymorphic FK | Request, incident write-off, donation out |
| step | enum | Line manager, Budget holder, Technical check, Pre-approval (Asset Coordinator with HOD Operations), Client consent, Write-off. The Finance steps (Bookkeeper, HOF, CEO) live in Finance Management and are mirrored here read-only |
| approver | user | Resolved at creation, re-resolved if the approver is the requester |
| decision | enum | Pending, Approved, Declined, On hold |
| reason | text | Required for Declined and On hold |
| due\_at | datetime | Created + 2 working days |
| reminded\_at, escalated\_at | datetime | Set by the scheduler |
| decided\_at | datetime |  |

**`purchase_order`** — one row per order placed by the Factotum after Finance approval.

| Field | Type | Notes |
| --- | --- | --- |
| po\_number | text | Typed by the Factotum when ordering; the field unlocks only after Finance approval |
| request | FK | One request can have several orders |
| supplier\_id | text (from the chosen quote) | Read-only copy of name, B-BBEE level, bank-verified flag |
| quote\_file | attachment |  |
| amount\_excl\_vat, vat, amount\_incl\_vat | money (ZAR) |  |
| expected\_delivery | date | Creates a deliveries log entry |
| delivery\_to | enum | Anton (default), Staff member, Client site |
| payment\_request\_ref | text | PR-yyyy-nnnn returned by Finance Management |
| payment\_status | enum | Draft, Pre-approved, With Finance, Compliance checked, Approved, Paid, Declined |
| paid\_at | date | Written back from Finance Management |

**`asset`** — the register (REG-02); one row per physical item, IT and store alike.

| Field | Type | Notes |
| --- | --- | --- |
| asset\_no | text, unique | Generated at registration |
| category, laptop\_tier | list |  |
| description, make\_model, serial\_no | text | Serial required for IT items |
| accessories | text or child rows | e.g. charger, bag, mouse |
| supplier, invoice\_no, purchase\_date |  | From the order and invoice |
| cost\_excl\_vat | money |  |
| warranty\_ends | date | Warranty status computed |
| funding\_source, project\_code |  | Copied from the request |
| owner | enum | Angels, Client, Beneficiary |
| insurance\_status | list | Default from funding (section 9) |
| on\_broker\_schedule | computed | True only when Angels insures |
| custodian | user or location | Person, Angels storage, PCZEN, Supplier |
| status, condition | list |  |
| storage\_location | text | Store items |
| client\_restriction | text | Client-branded items: only for that client |
| box\_contents | child rows | Training boxes: item, quantity, restock flag |
| request, handover | FK | Latest |
| qr\_code | text | Encodes the asset URL |
| donor, value\_estimate |  | Donated items |

### Supporting tables

| Table | Purpose | Key fields |
| --- | --- | --- |
| `attachment` | Every photo and file | subject\_type, subject\_id, kind (Photo front, Serial label, Accessories, Marks, Delivery note, Waybill, Invoice, Quote, Police report, Wipe certificate, E-waste certificate, Signed PDF), file, taken\_at, taken\_by |
| `custody_event` | Movement history of each asset | asset, from\_custodian, to\_custodian, event (Registered, Sent to PCZEN, Back from PCZEN, Couriered, Handed over, Returned, Booked out, Checked in, Repair, Donated, Disposed), waybill, at, by |
| `pczen_job` | One hand-off to PCZEN (FRM-08 part A) | request, asset, pczen\_ticket, sent\_at, returned\_at, days\_with\_pczen (working days, computed), purpose (Setup, Repair, Wipe, Lock and wipe), outcome |
| `pczen_job_item` | Items sent and checked back | job, item (laptop, charger, mouse, bag…), sent (yes), returned (yes/no), note; a “no” raises a PCZEN query |
| `prehandover_check` | Anton's check (FRM-08 part B) | request, asset, updates\_ok, office\_software\_ok, company\_settings\_ok, files\_moved\_ok, accessories\_ok, result (Pass, Back to PCZEN), checked\_by, checked\_at |
| `handover` | The Equipment Issue and Acknowledgement (FRM-02) | ref AST-HO, request, staff member, assets (child rows), courier waybill, delivered\_at, receipt\_photos, remote\_session\_at, signin\_confirmed, outlook\_teams\_files\_ok, conditions\_accepted (one flag per condition), staff\_signed\_at, issued\_by\_signed\_at (Anton), coordinator\_signed\_at (Annemarie), pdf (locked), emailed\_at |
| `incident` | Loss, theft, damage (FRM-04) | ref AST-INC, asset, reported\_by, type (Damaged, Not working, Lost, Stolen), occurred\_at, place, locked\_away, description, police\_case\_no, police\_station, info\_at\_risk (Yes, No, Not sure), loan\_needed, pczen\_lock\_ticket, assessment (Repair, Replace, Write off and replace), replacement\_request, insurer\_route (Broker, Client, None), claim\_no, claim\_outcome, payout, write\_off\_approval, liability\_review, status |
| `store_booking` | Store booking (FRM-07) | ref BK, asked\_by (department contact), booked\_by (Factotum), purpose (Training, Marketing), programme, venue\_town, out\_date, back\_date, collector, transport (Collected, Courier), status (Requested, Confirmed, Prepared, Checked out, Returned, Returned with issues, Cancelled) |
| `store_booking_item` | Items on a booking | booking, asset, contents\_checked\_out, contents\_checked\_in, condition\_in, restock\_flag, photos |
| `log_entry` | Deliveries and collections log | ref LOG, type, company, tracking\_or\_job\_ref, linked request or booking or order, expected\_date, receiver\_or\_collector, status, days\_late (computed), proof attachment |
| `donation_in` and `donation_in_item` | Donations received (FRM-05) | donor, contact, conditions, offered\_at; per item: description, accepted (yes/no), decline\_route (Back to donor, E-waste), wiped, value\_estimate, asset; Section 18A requested, issued, value; thank-you sent |
| `disposal` and `disposal_item` | Donation out, transfer to beneficiary, return to client, sale to staff, e-waste (FRM-06) | ref DON-OUT or TRF, type, proposer, recipient, reason, client\_consent (file, date), approval steps, wipe certificate, certificate signatures (recipient, HOF, Anton), book\_value, impact note; per item: asset, fit\_to\_give, book\_value |
| `annual_check` | February confirmation and spot-checks | year, person, assets listed, confirmed\_at, differences; spot-check rows: asset, found (yes/no), condition, checked\_by |
| `notification` | Every message sent | recipient, channel (Teams, email), template, subject\_type, subject\_id, sent\_at, read\_at |
| `audit_log` | Append-only change history | at, user, table, record, field, old\_value, new\_value, reason |

## 5. Status models and workflows

Each process has its own status set, and every status change is stored with time and user so the report can measure days per stage. The request lifecycle below is the KPI path; the swimlane diagrams for all five workflows are in QMS-05-WF-01.

&#91;embedded content: request lifecycle · 11 statuses\]

At any approval step a request can also go to **Declined** or **On hold** (always with a reason), and the requester can **Cancel** before ordering. Staff see the plain-word versions in the Staff Guide: Awaiting approval, Tech check, Ordered, With PCZEN, Couriered to you, Handed over.

### Other status sets

| Record | Statuses in order | Ends when |
| --- | --- | --- |
| Approval step | Pending → Approved, Declined or On hold | Decision recorded |
| Purchase order payment | Draft (Anton) → Pre-approved (Annemarie and Brent) → With Finance → Compliance checked (Jessica) → Approved (Gerald) → Paid (or Declined) | Paid date written back |
| PCZEN job | Sent → Returned complete, or Returned incomplete (query open) | All items ticked back |
| Pre-handover check | Not started → Pass, or Back to PCZEN | Pass |
| Handover (FRM-02) | Couriered → Delivered → Staff signed → Issued by signed → Complete (locked) | Asset Coordinator signs |
| Asset | In store, Issued, Booked out, On loan, In repair, With PCZEN, Returned, Donated out, Returned to client, Disposed | Donated out, Returned to client or Disposed are final |
| Incident | Reported → Device locked (lost or stolen) → Assessed → Claim open → Claim closed → Write-off approved → Closed | Closed |
| Store booking | Requested → Confirmed → Prepared → Checked out → Returned, or Returned with issues; Cancelled | Returned, with any incident linked |
| Deliveries log entry | Expected or Booked → Ready to collect → Received, Collected or Delivered; Late is set automatically; Cancelled | Proof photo attached |
| Donation received | Offered → Items decided → Wiped → Registered → Thanked | Thank-you letter sent |
| Donation out or transfer | Proposed → Fit confirmed → Client consent (if client-funded) → Approved → Wiped → Certificate signed → Closed | Certificate locked |

### Workflow references

| Workflow | Process | SOP sections |
| --- | --- | --- |
| WF-01 | Request, approval, order, receive, PCZEN, handover | 4.1–4.7 |
| WF-02 | Loss, theft and damage | 4.10 |
| WF-03 | Training and marketing store | 4.8 |
| WF-04 | Donations received | 4.11 |
| WF-05 | Donation out, transfer, sale and disposal | 4.12 |

## 6. Screens

Nineteen screens are drawn on the [Asset Management design canvas](https://claude.ai/artifact/UnWM2a7MVh2SNWDwzTcfzi); build to those layouts, using the NPO Management System's existing sidebar, header and components. The canvas is clickable and shows sample data, statuses and the green “filled in for you” fields. The screen numbers below match the canvas.

### Navigation

Asset Management sits in the left menu. Its tabs: **Requests**, **My approvals**, **Training and marketing items**, **Deliveries**, **Incidents**, **Donations**, **Asset register**, **Reports**. Each role sees only the tabs its permissions allow (section 3). Staff land on the home page with their own requests and items.

| No. | Screen | Used by | What to build | Notes |
| --- | --- | --- | --- | --- |
| 1 | Asset Management home | Everyone | Tiles to start a request (Laptop, Screen or monitor, Printer, Accessory, Training or marketing item); a Report a problem tile; counters (open, awaiting approval, ready to collect, overdue); Requests table | Counters and table are filtered by role |
| 2 | New request, step 1–2 | Requester | Who it is for; category, request type, replaced asset (auto), reason, laptop tier cards with the suggested tier badge, main use, travels with user | Tier suggested from role; questions show only when relevant |
| 2b | Request step 3 | Requester | Business reason, date needed, who pays (Angels or client: programme, project code, budget line, PO ref, owner after project), insurance note, delivery route and one-off address | Address goes to the courier booking only |
| 2c | Order | Factotum, Asset Coordinator, HOD Ops | Payment Request and order: quotes, supplier, amounts and documents; four approval tiles (pre-approval, Bookkeeper compliance check, HOF final check, payment) mirrored from Finance Management; order number and delivery, unlocked only after Finance approval | Order section locked until Finance approves |
| 3 | Approval and technical check | Approvers, Factotum | Request summary, approval progress, Approve / Hold / Decline with reason; for Anton: outcome (Repair, Stock, Buy), tier confirmation, old laptop destination, spec notes | One screen, actions vary by step |
| 3b | Receive, PCZEN preparation and pre-handover check | Factotum | Four sections: documents (delivery note, invoice), details (green fields pre-filled, Anton adds make, model, serial, warranty, accessories), photos and QR label, PCZEN hand-off and return checklist with day counter, pre-handover checklist; courier and remote session booking | Courier button locked until every pre-handover line passes |
| 3c | Staff member signs on screen | Staff | Receipt photos, items list with photos, remote session confirmation, conditions of use (tick each), old laptop return note, Sign with Angels Microsoft account | Mobile-friendly |
| 4 | Asset register | Factotum, Coordinator, Finance | Filterable table: category, status, custodian, funding, owner, insurance, broker schedule, warranty; asset detail drawer with history and photos; export | Staff see their own items only, under My equipment |
| 5 | Equipment Issue and Acknowledgement (A4, 2 pages) | System output | Locked PDF: page 1 details and signatures, page 2 photos and record | Generated after the last signature |
| 6 | Report a problem | Staff | Item picker, what happened, when and where, locked away, description, police case number (theft), information at risk, loan needed, photos; red warning that PCZEN will be told; who is told panel | Opens incident and alerts at once |
| 7 | Incident case | Factotum, Coordinator, HOF | Timeline, PCZEN lock status, assessment, loan laptop, linked replacement request, claim pack checklist and export, write-off approval, liability review |  |
| 8 | Monthly report and PCZEN turnaround | Coordinator, HOD Ops, HOF | KPI tile, average days, delays by cause, PCZEN days and incomplete returns, incidents by type, store use; month picker and PDF export | Section 10 |
| 9 | Deliveries and collections | Factotum, department contacts (view) | Today view (arriving, to collect, going out), Needs attention (late), full log with filters; add entry; mark Ready to collect, Received, Collected with proof photo |  |
| 10 | Training and marketing store and calendar | Factotum, department contacts, all staff (view) | Item cards with contents and restock flags; week calendar of bookings with clashes highlighted | Staff view only |
| 10b | Store booking: check-out and return | Factotum, department contact, collector | Booking details, items, contents tick list, photos out and in, collector signature, return check, Report damage or loss |  |
| 11 | Donations and transfers | Factotum, Operations contact, Coordinator | Lists of donations in and out; donation received record with items accept or decline, wipe status, value, Section 18A, thank-you |  |
| 11b | Donate or transfer out | Operations contact, HOD, approvers | Type, assets, recipient, reason, fitness check, client consent, approvals, wipe |  |
| 11c | Donation or Transfer Certificate (A4) | System output | Locked PDF with photos and three signatures |  |

### Behaviour common to all screens

- Fields copied from earlier steps show a green label (“from the request”, “from the invoice”) and are editable only by the role that owns them.
- Every list has search, filters and an export for roles that may export.
- Statuses show as coloured badges with plain words (section 5).
- Photos upload from a phone camera; compress on upload and keep the original.
- All dates use South African format (20 Nov 2026), currency is rand (R), and working days skip weekends, public holidays and the December closure.

## 7. Notifications and escalations

Notifications go to Microsoft Teams first (chat or Activity card with a deep link to the record), with email as the fallback and for external parties (PCZEN, suppliers, the broker). A scheduler runs every working morning at 07:30 and again at 12:00 to send reminders, late alerts and escalations. Every message is written to the `notification` table.

### Event messages (sent at once)

| Trigger | Recipients | Message (plain words) |
| --- | --- | --- |
| Request submitted | Requester, line manager, Asset Coordinator, Factotum | “AST-REQ-2026-011 logged: Standard laptop for \[name\], needed by \[date\].” |
| Approval step created | That approver | “Waiting for your approval” + Approve / Hold / Decline buttons in the Teams card |
| Status change | Requester (and the person it is for) | New status + what happens next |
| Declined or On hold | Requester, Asset Coordinator | Status + the approver's reason |
| Finance approved (status back from Finance Management) | Factotum, Asset Coordinator | “Ready to order” |
| Order saved | Factotum, Finance (via the Payment Request) | Supplier, PO, expected date |
| Payment marked Paid | Factotum, Asset Coordinator | PO and payment date |
| Delivery received | Requester, Asset Coordinator | “Arrived at Anton; next is PCZEN preparation” |
| Sent to PCZEN | PCZEN (email), Asset Coordinator | Ticket number, item list, agreed turnaround date |
| PCZEN item missing on return | PCZEN (email), Asset Coordinator, HOD Operations | Item and ticket; handover blocked |
| Couriered | Staff member | Tracking number, remote session date and time, what to have ready (phone with Authenticator) |
| Remote session booked | Staff member, PCZEN (Johan) | Teams meeting invite, 15 minutes |
| Staff signed | Factotum, then Asset Coordinator | “Please counter-sign” |
| Handover complete | Staff member (with PDF), line manager, Asset Coordinator | Locked FRM-02 attached |
| Incident reported | Factotum, Asset Coordinator, line manager | Type, item, loan needed |
| Incident: lost or stolen | PCZEN (urgent email and Teams), as above | “Lock and wipe \[asset, serial\] now” |
| Incident: information at risk = Yes or Not sure | Information Officer | Incident summary for POPIA review |
| Store booking requested | Factotum | Items, dates, clash warning |
| Booking confirmed or alternative offered | Department contact, collector |  |
| Log entry Ready to collect | Collector | Company, job reference, address |
| Donation proposed | Approvers in order; Asset Coordinator for client consent |  |
| Project ending in 30 days with assets | Asset Coordinator, budget holder | List of project assets to return, transfer or keep |

### Reminders and escalations (scheduler)

| Rule | When | Recipients |
| --- | --- | --- |
| Approval reminder | 1 working day before due | Approver |
| Approval overdue | On the due date + 1 working day | Approver, Asset Coordinator, Factotum |
| Escalation | 2 working days after overdue | HOD Operations |
| New starter late request | When logged fewer than 10 working days before start | Asset Coordinator, HR |
| Delivery due | Day before and morning of expected date | Factotum (Asset Coordinator as backup) |
| Delivery late | Daily from the day after expected date | Factotum, Asset Coordinator |
| PCZEN over turnaround | Daily after \[X\] working days | Asset Coordinator, Factotum; HOD Operations after 2 more days |
| Store check-out prep | Day before out\_date | Factotum |
| Store return reminder | Day before back\_date | Collector |
| Store overdue | Daily after back\_date | Collector, department contact, Factotum |
| Handover not signed | 2 working days after delivery | Staff member, Asset Coordinator |
| Incident claim pack incomplete | Weekly on Monday | Asset Coordinator |
| Warranty ending | 30 days before warranty\_ends | Factotum, Asset Coordinator |
| Annual check | 1 February; reminder weekly until confirmed | Every staff member with assets |
| Monthly report | 1st working day of the month | Asset Coordinator (draft ready) |

Let each person mute non-urgent reminders, but never mute approvals, incidents or escalations.

## 8. Integrations

Only two integrations write data across modules: the Payment Request out to Finance Management and its Paid status back. Everything else is read-only, a notification, or a reference number typed in. That keeps Release 1 small and leaves PCZEN and couriers as manual references until they offer an API.

| System | Direction | What passes | How (suggested) | Release |
| --- | --- | --- | --- | --- |
| **Finance Management — Payment Request** | Out, then back | Out (after pre-approval): the Payment Request the Factotum created, with supplier, amount, VAT, quotes, documents, project code, budget line, request ref and pre-approver names. Back: compliance check, final approval or decline with reason, Paid date | Internal service call or shared table inside the NPO Management System; the Bookkeeper's compliance check and the HOF's final check happen in Finance Management under FIN-01 | 1 |
| **RFQ Hub (removed)** | Read | Not used: quotes are attached as files by the Factotum (FIN-03), and suppliers are verified by the Bookkeeper in Finance Management | No integration needed | 1 |
| **Entra ID (Microsoft 365)** | Read | Sign-in (SSO), name, email, job title, department, manager, group membership for roles | OpenID Connect sign-in; Microsoft Graph for profile and manager; Entra security groups map to roles | 1 |
| **Microsoft Teams** | Out | Notifications, Approve / Hold / Decline cards, remote session invites | Graph or an incoming workflow; Adaptive Cards with deep links | 1 |
| **E-signature** | In | Signer identity and time on FRM-02, FRM-06, FRM-07 | Re-authenticate with Entra at the moment of signing; store the token's user ID, timestamp, IP and a hash of the form; lock the PDF | 1 |
| **Document storage** | Out | Photos, invoices, signed PDFs, certificates | The system's file store or a SharePoint document library per year; files linked from `attachment` | 1 |
| **PCZEN** | Out (email) | Hand-off list, ticket request, lock-and-wipe alerts, remote session invites | Email and Teams to Johan; PCZEN ticket number typed in by Anton. No PCZEN login to the module | 1 (manual) |
| **Couriers** | None | Waybill numbers and tracking links | Typed in; tracking link built from the courier's URL pattern | 1 (manual) |
| **PR Briefing Hub** | Reference | Banner briefs that lead to ZipPrint jobs | Factotum links the brief reference on the log entry and the new store item | 1 (reference) |
| **HR exit process** | In (manual) | Name and last working day | HR uses an “exit notice” action that starts the return; no HR data is stored. Later this can come from the HR system if Dana, you and Gerald agree | 1 manual, later automatic |
| **Insurance broker** | Out (file) | Broker schedule export (Angels-insured items only) and claim packs | Export to Excel or PDF; emailed by the HOF | 1 |
| **QR labels** | Out | Label sheet per new asset | Generate a printable label PDF (asset number + QR to the asset page) | 1 |

### The payment link in detail

1. **In Asset Management:** the line manager approves the need; Anton does the technical check (Buy new), gathers the quotes and documents and creates the Payment Request on the request.
2. **In Asset Management:** Annemarie and Brent pre-approve and check the budget. If Annemarie is the requester, Brent pre-approves alone.
3. The Payment Request passes to Finance Management with its PR number shown on the request.
4. **In Finance Management:** Jessica (Bookkeeper) does the full compliance check (supplier, bank details, documents) and uploads; Gerald (HOF) does the final check before payment (CEO above \[R limit\]; Board Treasurer if the CEO is the requester).
5. The decision comes back to the request. On Approved, the order section unlocks and Anton places the order; Anton and Annemarie are told.
6. If Finance declines (for example, bank details changed), the request shows Declined by Finance with the reason; Anton resolves it and resubmits, and it goes back through pre-approval only if the amount rises by more than \[x\]%.
7. When Finance marks it Paid, the payment status and date update on the request.

## 9. Business rules and validation

These rules come from POL-QMS-005 and SOP QMS-05. Enforce them in the back end, not only in the screens, so a rule cannot be skipped through an API call or an import.

### Requests and approvals

| ID | Rule |
| --- | --- |
| R-01 | Business reason and date needed are required. A laptop request also needs tier and main use. |
| R-02 | Replacement: the replaced asset is required and must be in the requester's custody (or the person it is for). Reason Damaged, Lost or Stolen requires a linked incident; Stolen also requires a police case number on that incident. |
| R-03 | New starter: flag `late_request` when logged fewer than 10 working days before the start date. The request still proceeds. |
| R-04 | Client-funded: programme, project code and budget line are required; the budget holder step is added. |
| R-05 | Approval order in Asset Management: line manager → budget holder (client-funded only) → Factotum technical check, quotes and Payment Request → pre-approval and budget check by the Asset Coordinator with the HOD Operations. Then in Finance Management: Bookkeeper compliance check and upload → HOF final check. Steps never run in parallel. |
| R-06 | Final check (in Finance Management): HOF up to \[R limit\]; CEO above it; Board Treasurer when the CEO is the requester. Nobody approves a step on their own request; the step moves up one level. If the Asset Coordinator is the requester, the HOD Operations pre-approves alone. |
| R-07 | Technical check outcome Repair or Issue from stock skips quotes, pre-approval, Finance approval and ordering, and goes straight to receiving or PCZEN. |
| R-08 | Declined and On hold need a reason. On hold returns to the same approver when they release it. |
| R-09 | A request that requires the R50,000 Board rule in Finance follows that rule in the Payment Request; Asset Management shows a note but does not add a Board step. *(Confirm with Gerald.)* |

### Ordering, receiving and register

| ID | Rule |
| --- | --- |
| R-10 | The order section unlocks only when Finance Management has approved the Payment Request: the Bookkeeper's compliance check (supplier, bank details, documents) and the HOF's final check (CEO above \[R limit\]). |
| R-11 | Delivery to a staff member or client site needs the approval flag and a courier tracking number. The address is used for that booking only and is never saved to the register or the request. |
| R-12 | An asset cannot be issued before it is registered with serial number (IT items), at least 2 photos including the serial label, and a QR label. |
| R-13 | Asset number is generated once at registration and never changes, even if the item is transferred or re-funded. |
| R-14 | Insurance default follows funding: Angels → Angels insures; client → Client insures; donated → HOF decides. Changing a client-funded item to Angels cover requires HOF approval and a recorded client contribution. |
| R-15 | Only items with insurance status Angels insures or Angels with client contribution appear on the broker schedule. |

### PCZEN and handover

| ID | Rule |
| --- | --- |
| R-16 | Every PCZEN hand-off records the ticket number and every item sent. On return each item must be ticked; any item not returned raises a PCZEN query and blocks the handover. |
| R-17 | Days with PCZEN are working days from sent\_at to returned\_at and are compared to the agreed turnaround \[X\]. |
| R-18 | The courier booking stays locked until every pre-handover line passes. A failed line sends the item back to PCZEN as a new job on the same ticket. |
| R-19 | FRM-02 is valid only when the staff member, Anton (issued by) and the Asset Coordinator have all signed, in that order. The staff member must tick every condition and confirm the remote sign-in. Then the PDF is locked and cannot be edited; a correction needs a new version with a reason. |
| R-20 | A replacement is not complete until the old asset is returned or has a linked incident; the system tracks the return label and reminds after 5 working days. |

### Store, incidents and donations

| ID | Rule |
| --- | --- |
| R-21 | Store items are booked only for training or marketing. A booking that overlaps another for the same item is refused, and the screen offers free alternatives. |
| R-22 | Client-branded store items (client\_restriction set) can only be booked for that client's programme. |
| R-23 | Store check-out needs the collector's signature and photos; check-in needs a contents count. Missing or damaged contents open an incident linked to the booking. |
| R-24 | Incidents must be reported within 24 hours; reports after that are accepted but flagged late. Lost or stolen always alerts PCZEN; information at risk Yes or Not sure always alerts the Information Officer. |
| R-25 | Write-off needs HOF approval; the claim route follows insurance status (broker for Angels, client for client-insured). |
| R-26 | Every donated device in or out is wiped by PCZEN, with a wipe certificate attached, before registration (in) or release (out). |
| R-27 | A client-funded asset cannot be donated, transferred or sold without the client's written consent on file. |
| R-28 | A donated-out or disposed asset leaves the broker schedule the day the certificate is signed and its status can no longer change. |

### Loan laptops and book value

| ID | Rule |
| --- | --- |
| R-29 | The loan pool holds at most 2 laptops. A loan laptop is issued with FRM-02 like any other item, and must come back within 5 working days of the replacement being handed over. If both loan laptops are out, the screen says so and the Asset Coordinator is told; a third loan needs HOD Operations approval. |
| R-30 | Book value is calculated, never typed: straight-line over 3 years for laptops and other IT equipment (cost ÷ 36 per month in use, from the purchase date), reaching R0 after 36 months. Store items and donated items use the value estimate recorded at registration. *Proposed in line with SARS Interpretation Note 47 (personal computers: 3 years); the Head of Finance to confirm (D-14).* |
| R-31 | The register flags laptops older than 4 years as “replacement due” so replacements can be budgeted before they fail. |

### Segregation of duties

| ID | Rule |
| --- | --- |
| R-32 | Anton chooses, orders and receives, so the money is checked by others: pre-approval by the Asset Coordinator with the HOD Operations, then the Bookkeeper and the HOF in Finance Management. |
| R-33 | Receipt is confirmed by someone other than the Factotum: the staff member (photos and FRM-02) for issued equipment, the Asset Coordinator for store and marketing items. |
| R-34 | Department asset contacts have no approval rights. Notifications for a department copy its contact and backup. |

## 10. Reports and KPI

The monthly report (screen 8) is the KPI evidence: it must reach you as HOD Operations in the first working week of each month, so it should build itself from the data with no manual counting. Every figure below is calculated over requests handed over (or closed) in the selected month.

### KPI: requests processed within agreed timeframes

```latex
\text{KPI \%} = \frac{\text{requests handed over on or before date needed}}{\text{requests handed over in the month}} \times 100
```

- Count new starters, replacements and additional items; show loans separately.
- A request declined or cancelled is excluded from both counts but listed.
- Show the figure for new starters alone as well, because that is the KPI's wording.
- Target: to be agreed (suggest 90%).

### Measures on the report

| Measure | Calculation |
| --- | --- |
| Average days, request to handover | Working days from `created_at` to `handed_over_at` |
| Days per stage | Working days in each status (approval, ordering, supplier delivery, PCZEN, pre-handover, courier, signing), from the status history |
| Delays by cause | For each late request, the stage that ran longest past its timeframe: Late request, Approvals, Supplier, PCZEN, Courier, Staff signing |
| Late requests from HR | New starters with `late_request` = yes |
| PCZEN turnaround | Average and longest days with PCZEN; jobs over \[X\] days; list with ticket numbers |
| PCZEN incomplete returns | Jobs with any item not returned (e.g. the missing mouse) |
| Pre-handover failures | Checks with result Back to PCZEN, by failed line |
| Incidents | Count by type (damage, not working, lost, stolen), reported late, open claims, payouts, write-offs |
| Store use | Bookings by purpose and programme, items overdue, damaged or missing |
| Deliveries | Entries late, average days late, by company |
| Assets | Count and value by category, funding, insurance; warranties ending in 90 days; project assets ending in 30 days |
| Annual check (February) | Staff confirmed, differences found, spot-check results |

### Other outputs

- **Broker schedule**: Angels-insured items with asset number, description, serial, cost, location type (with staff or storage), for the HOF.
- **Claim pack** per incident: incident report, photos, police case, purchase invoice, asset history, PCZEN lock confirmation.
- **Project asset list** per client programme, for return or transfer at project end.
- **Register export** to Excel in the same column order as QMS-05-REG-02, so the controlled spreadsheet and the system match.
- Exports and PDFs carry the QMS footer: “Controlled document. Printed copies are uncontrolled.”

## 11. Security, POPIA, audit and retention

The module holds names linked to equipment, photos, police case numbers and occasionally a note that personal information was on a lost device, so it is treated as personal information under POPIA. The design keeps what is stored to the minimum the process needs.

### Data minimisation

- No staff home addresses stored. The address field on the request and courier booking is transient: it is sent to the courier step and then blanked, and the audit log records only that an address was used.
- No HR data: no ID numbers, salaries, contracts or leave.
- Photos are of equipment only. The upload screen says so, and the Asset Coordinator can remove a photo that shows a person or a home interior.
- Police case numbers are visible only to the Factotum, Asset Coordinator, HOF and the reporter.

### Access and security

- Sign-in only through Entra ID with the organisation's MFA policy; no local accounts.
- Roles come from Entra security groups; role changes are logged.
- Row-level filtering in the back end: staff see only records where they are requester, “for person” or custodian; line managers see their team.
- Signing re-authenticates the user. The signed PDF stores the signer IDs, times and a SHA-256 hash; any change after locking is impossible, and a correction creates a new version.
- Files are served only through authorised links, never public URLs.
- Exports are limited to Asset Coordinator, HOF and HOD Operations, and every export is logged.

### Audit trail

- `audit_log` is append-only: no update or delete permission for any role, including admin.
- It records every create, field change, status change, approval, signature, export, role change and login to the module, with user, time, old and new value and reason where one is required.
- The Asset Coordinator can view and filter it; the HOD Operations and HOF can view it.

### Retention (placeholders until the QMS retention schedule is confirmed)

| Record | Keep for |
| --- | --- |
| Requests, approvals, notifications | \[Per QMS retention schedule\] |
| Asset record, history, signed forms, certificates | Life of asset + \[x\] years |
| Incidents and claim packs | Life of asset + \[x\] years |
| Invoices, quotes, POs | Per financial records rules (in Finance Management) |
| Audit log | \[x\] years |

Build retention as a setting per record type with a yearly job that lists records due for deletion for the Asset Coordinator to approve, rather than deleting automatically.

## 12. Build phases

Build the request-to-handover path first, because it is what the KPI measures and what staff will use most; the store, incidents and donations follow once it is live. No dates are set yet: the order and the gates matter more than the calendar, and you can set dates when you plan the work.

&#91;embedded content: build phases · 4 phases, 4 gates\]

### What each phase delivers

| Phase | Screens | Tables | Done when |
| --- | --- | --- | --- |
| 0 Set up | Lists and settings, roles admin | Lists, `settings`, `asset`, `attachment`, `audit_log` | Current laptops, monitors, printers, training boxes and marketing items are loaded from QMS-05-REG-02 (Excel), labelled, and checked by Anton |
| 1 Request to handover | 1, 2, 2b, 2c, 3, 3b, 3c, 4, 5 | `asset_request`, `approval_step`, `purchase_order`, `custody_event`, `pczen_job`, `pczen_job_item`, `prehandover_check`, `handover`, `notification` | Tests T-01 to T-17 and T-27 to T-29 pass, and three real requests go through end to end |
| 2 Problems and store | 6, 7, 9, 10, 10b | `incident`, `store_booking`, `store_booking_item`, `log_entry` | Tests T-18 to T-23 pass |
| 3 Close the loop | 8, 11, 11b, 11c | `donation_in`, `donation_in_item`, `disposal`, `disposal_item`, `annual_check` | Tests T-24 to T-26 and T-30 pass; Annemarie signs off the first monthly report |

### Later, outside Release 1

- Automatic exit notice from the HR system, if Dana, you and Gerald agree.
- Courier tracking through a courier API.
- A PCZEN integration, if PCZEN offers an API for tickets.
- A phone view for Anton to scan QR labels during the annual check.

### Go-live

- Train each group with the QMS-05-GUI guides and decks before its phase goes live; the decks carry presenter notes for one-on-ones.
- Run paper forms (Word FRM-01 to FRM-08) as the fallback for the first month.
- After go-live, Annemarie updates POL-QMS-005, the SOP and the guides with any screen changes and the decided values from section 14.

## 13. Test scenarios and acceptance

Run each scenario end to end with real people in their real roles (test accounts in a test tenant or test group). Release 1 is accepted when every scenario passes, the rules in section 9 have a passing automated test each, and Annemarie has run the monthly report on test data.

| No. | Scenario | Expected result |
| --- | --- | --- |
| T-01 | HR logs a new starter Standard laptop 15 working days before start; all approve; bought, received, sent to PCZEN, back complete, checked, couriered, signed | Handed over before the start date; KPI counts it on time; FRM-02 PDF locked with three signatures and emailed |
| T-02 | Same as T-01 but logged 6 working days before start | Request flagged late; HR and Asset Coordinator told; report shows cause Late request |
| T-03 | Staff asks for a replacement: laptop old and slow | Current asset filled in; Anton chooses Buy new and old laptop to Loan pool; replacement not complete until old laptop returned |
| T-04 | Anton chooses Issue from stock | Quotes, approvals and ordering skipped; goes to PCZEN |
| T-05 | Line manager declines without a reason | Refused; with a reason, requester told and request closed |
| T-06 | Approver does nothing | Reminder 1 day before; overdue alert; escalation to HOD Operations 2 working days later |
| T-07 | HOF requests a laptop | Final check goes to the CEO; HOF cannot approve it |
| T-08 | CEO requests a laptop | Final check goes to the Board Treasurer |
| T-09 | Request above \[R limit\] | HOF then CEO approve |
| T-10 | Client-funded Scatec E4C laptop | Budget holder step added; asset number carries project; insurance = Client insures; not on broker schedule; flagged 30 days before project end |
| T-11 | Anton tries to place the order before Finance has approved the Payment Request | Refused |
| T-12 | Order saved | Payment Request goes to Finance after pre-approval; Jessica's and Gerald's decisions, then Paid, show on the request; Anton is told to order |
| T-13 | Anton tries to issue an item with no serial photo | Blocked |
| T-14 | PCZEN returns the laptop without the mouse | Item flagged missing; PCZEN query sent; handover blocked; shows on report as incomplete return |
| T-15 | PCZEN keeps a laptop beyond \[X\] days | Daily alert; escalation; report shows days over |
| T-16 | One pre-handover line fails | Courier booking stays locked; new PCZEN job on same ticket |
| T-17 | Staff member signs without ticking all conditions | Sign button disabled |
| T-18 | Laptop stolen from a car, information at risk Not sure | Incident opened; PCZEN urgent alert; Information Officer alerted; loan laptop issued; replacement request linked; claim pack to broker |
| T-19 | Damage reported 3 days late | Accepted, flagged late |
| T-20 | Two bookings for the same gazebo on overlapping dates | Second refused with alternatives |
| T-21 | Seriti Green event tries to book a Scatec-branded banner | Refused |
| T-22 | Training box returns with 1 flip chart pad missing | Restock flag; incident linked to booking |
| T-23 | ZipPrint job marked Ready to collect | Collector told; collected with proof photo; log closed |
| T-24 | Donated laptop accepted | PCZEN wipe certificate required before it gets an asset number |
| T-25 | Donate a client-funded laptop without client consent | Blocked |
| T-26 | Donation out completed | Certificate locked; asset off broker schedule; status Donated out; cannot change again |
| T-27 | Staff member opens the register | Sees only their own items |
| T-28 | Anyone tries to edit or delete an audit row or a locked PDF | Impossible; attempt logged |
| T-29 | Address entered for a courier | Not visible on the request afterwards; audit shows only that an address was used |
| T-30 | Monthly report for a test month | Figures match a hand count of the same test data |

### Non-functional acceptance

- Pages load in under 3 seconds on a home broadband connection; the sign screen works on a phone.
- Works in Edge and Chrome; screens follow the NPO Management System's accessibility conventions.
- Daily backup with tested restore; files backed up with the database.
- Working-day calculations correct across South African public holidays and the December closure.

## 14. Open decisions and references

Build these as settings, not hard-coded values, so the build can start before they are decided.

| No. | Decision | Who decides | Where it is used |
| --- | --- | --- | --- |
| D-01 | CEO approval limit \[R limit\] | HOF, CEO | R-06, approval routing |
| D-02 | PCZEN agreed turnaround \[X\] working days | HOD Operations with PCZEN | R-17, reminders, report |
| D-03 | Whether the R50,000 Board rule applies to asset purchases in Asset Management or only in the Payment Request | HOF | R-09 |
| D-04 | Re-approval threshold if the order amount rises above the approved estimate (\[x\]%) | HOF | Payment link step 6 |
| D-05 | Staff liability wording for negligence | HOF, CEO | Conditions on FRM-02, incident liability review |
| D-06 | Standard insurance clause in client agreements | HOF, CEO | R-14, client-funded requests |
| D-07 | Retention periods | Asset Coordinator with HOF (QMS retention schedule) | Section 11 |
| D-08 | Impact rand values for donations out | HOF | Disposal records, impact reporting |
| D-09 | Timeframes: quotes and Payment Request after the technical check; store booking lead time | HOD Operations, Factotum | Reminders, report |
| D-10 | KPI target percentage | HOD Operations | Section 10 |
| D-11 | QMS-05 number confirmed against the Master Document Register QMS-01-REG-01 | Asset Coordinator | All document references |
| D-12 | Whether sale of assets to staff is allowed | HOF, CEO | Disposal type list |
| D-13 | Where files are stored (system file store or SharePoint library) | HOD Operations | Section 8 |

**D-14 Depreciation method for book value.** Proposed: straight-line over 3 years for IT equipment (R-30), in line with [SARS Interpretation Note 47](https://www.sars.gov.za/lapd-intr-in-2012-47-wear-and-tear-depreciation-allowance). The Head of Finance confirms, as owner of valuation and depreciation under POL-QMS-005. Used for write-offs, donations out and the broker schedule.

**D-15 Department contacts and requests.** Should department asset contacts also log requests on behalf of their department, or only coordinate with Anton? Decides whether the Dept contact column gets C on requests.

**D-16 ISO alignment.** Before audit: add QMS-05 to the internal audit programme and the annual management review, link recurring PCZEN problems to the QMS corrective action register, set the KPI target, agree a written PCZEN turnaround, and confirm laptops are encrypted (BitLocker) and enrolled in PCZEN device management (a possible sixth pre-handover check line).

### Reference documents

| Document | Where |
| --- | --- |
| Design canvas: 19 screens | [Asset Management — NPO Management System](https://claude.ai/artifact/UnWM2a7MVh2SNWDwzTcfzi) |
| Module specification (draft) | [Asset Management Module — Specification](https://claude.ai/artifact/Uqpc4b2AXBKEJ1QLa2ND2z) |
| POL-QMS-005 Asset Management Policy | QMS-05 Asset Management folder (Word) |
| QMS-05 Asset Management SOP | QMS-05 folder |
| QMS-05-WF-01 Workflows WF-01 to WF-05 (swimlanes) | QMS-05 folder |
| QMS-05-FRM-01 to FRM-08 Forms | QMS-05 folder; the system replaces them, Word stays as fallback |
| QMS-05-REG-01 Risk Register; REG-02 Asset Register (Excel) | QMS-05 folder; REG-02 columns = register export |
| QMS-05-GUI-01 to GUI-05 Training guides | QMS-05 folder |
| Training decks with presenter notes | [Staff](https://claude.ai/artifact/UfgtuyUhBqpGjFJaz452aJ), [Anton](https://claude.ai/artifact/Rp6JGw5hBtiA4qqr1vpnPi), [Asset Coordinator](https://claude.ai/artifact/25qCxG7vnYU5QpxZ3dWDzy), [Management](https://claude.ai/artifact/ScTv34Tr8LYGYTNkNTSPD4), [Department Asset Contacts](https://claude.ai/artifact/WFp1ttcT2gcpayJ6MgrH6S) |
| FIN-01 Payment Request Procedure; FIN-03 Procurement Procedure | Finance policies |

**Contact for process questions:** Annemarie Mostert, Operations and Programme Systems Coordinator.
