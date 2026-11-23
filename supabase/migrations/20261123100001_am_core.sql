-- =====================================================================
-- Angels Asset Management (QMS-05) – core schema (Supabase / PostgreSQL)
-- Tables, reference numbers, roles, business rules and the audit log.
-- Source: Asset Management Module – Development Briefing, sections 7 to 10.
-- Applied by the GitHub Action (supabase db push) or pasted in the SQL Editor.
-- Row-level security is in ..._am_security.sql; the file bucket in ..._am_storage.sql.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- People and roles
-- ---------------------------------------------------------------------
-- Roles: staff, hr, line_manager, budget_holder, factotum, dept_contact,
-- asset_coordinator, hod_ops, bookkeeper, hof, ceo, treasurer, info_officer
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  job_title text,
  department text,
  manager_id uuid references public.profiles(id),
  roles text[] not null default '{staff}',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- New sign-ups get a profile automatically (role: staff).
create or replace function public.am_handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists am_on_auth_user_created on auth.users;
create trigger am_on_auth_user_created after insert on auth.users
for each row execute function public.am_handle_new_user();

create or replace function public.am_has_role(r text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and r = any(p.roles) and p.active);
$$;

-- Back office = may see every record in the module.
create or replace function public.am_is_back_office() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.active
    and p.roles && array['factotum','asset_coordinator','hod_ops','bookkeeper','hof','ceo','treasurer']);
$$;

create or replace function public.am_my_department() returns text
language sql stable security definer set search_path = public as $$
  select department from public.profiles where id = auth.uid();
$$;

-- ---------------------------------------------------------------------
-- Settings, departments (asset contacts) and reference counters
-- ---------------------------------------------------------------------
create table if not exists public.am_settings (
  key text primary key,
  value jsonb not null,
  note text
);

create table if not exists public.am_departments (
  name text primary key,
  contact_id uuid references public.profiles(id),
  backup_id uuid references public.profiles(id),
  notes text
);

create table if not exists public.am_counters (
  prefix text not null,
  yr int not null,
  n int not null default 0,
  primary key (prefix, yr)
);

-- next_ref('AST-REQ') -> AST-REQ-2026-001 ; next_ref('LOG', 4, false) -> LOG-0001
create or replace function public.am_next_ref(p text, width int default 3, with_year boolean default true)
returns text language plpgsql security definer set search_path = public as $$
declare v int; y int := extract(year from now())::int;
begin
  if not with_year then y := 0; end if;
  insert into am_counters(prefix, yr, n) values (p, y, 1)
  on conflict (prefix, yr) do update set n = am_counters.n + 1
  returning n into v;
  if with_year then return p || '-' || y || '-' || lpad(v::text, width, '0'); end if;
  return p || '-' || lpad(v::text, width, '0');
end $$;

-- ---------------------------------------------------------------------
-- Requests and approvals
-- ---------------------------------------------------------------------
create table if not exists public.am_requests (
  id uuid primary key default gen_random_uuid(),
  ref text unique,
  request_type text not null check (request_type in ('New starter','Replacement','Additional item','Loan')),
  requested_by uuid not null references public.profiles(id) default auth.uid(),
  for_user uuid references public.profiles(id),
  for_name text,                       -- new starter without an account yet
  for_role text,
  department text,
  line_manager_id uuid references public.profiles(id),
  category text not null,
  item_description text,
  laptop_tier text,
  main_use text,
  travels_with_user boolean default false,
  replaces_asset uuid,
  replacement_reason text,
  incident_id uuid,
  business_reason text not null,
  date_needed date not null,
  funding_source text not null default 'Angels',
  project_code text,
  budget_line text,
  client_po_ref text,
  owner_after_project text,
  budget_holder_id uuid references public.profiles(id),
  delivery_route text not null default 'Via Anton, then courier',
  status text not null default 'Awaiting line manager',
  tech_outcome text check (tech_outcome in ('Repair','Issue from stock','Buy new')),
  old_laptop_destination text,
  spec_notes text,
  late_request boolean default false,
  handed_over_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.am_approvals (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null default 'request',  -- request | incident | disposal
  subject_id uuid not null,
  step text not null,          -- Line manager | Budget holder | Technical check | Pre-approval | Client consent | Write-off
  approver_id uuid references public.profiles(id),
  decision text not null default 'Pending' check (decision in ('Pending','Approved','Declined','On hold')),
  reason text,
  due_at timestamptz,
  decided_at timestamptz,
  decided_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Payment Request (Asset Management side) and orders
-- ---------------------------------------------------------------------
-- Status: Draft -> Pre-approved -> With Finance -> Compliance checked -> Approved -> Paid ; Declined
create table if not exists public.am_payment_requests (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.am_requests(id) on delete cascade,
  pr_number text unique,
  supplier text not null,
  quotes text,                 -- e.g. "Q-1102 (chosen) · Q-1103 · Q-1104"
  amount_incl_vat numeric(12,2) not null,
  vat numeric(12,2),
  project_code text,
  budget_line text,
  status text not null default 'Draft',
  created_by uuid references public.profiles(id) default auth.uid(),
  preapproved_by uuid references public.profiles(id),
  preapproved_at timestamptz,
  compliance_by uuid references public.profiles(id),
  compliance_at timestamptz,
  final_by uuid references public.profiles(id),
  final_at timestamptz,
  paid_at date,
  decline_reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.am_orders (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.am_requests(id) on delete cascade,
  payment_request_id uuid references public.am_payment_requests(id),
  po_number text not null,
  expected_delivery date,
  deliver_to text default 'Anton',
  courier text,
  tracking text,
  ordered_by uuid references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Assets (register), files, custody history
-- ---------------------------------------------------------------------
create table if not exists public.am_assets (
  id uuid primary key default gen_random_uuid(),
  asset_no text unique,
  category text not null,
  short_code text,             -- store items: TB, FB, PB, GZ, SK
  laptop_tier text,
  description text,
  make_model text,
  serial_no text,
  accessories text,
  supplier text,
  invoice_no text,
  purchase_date date,
  cost_excl_vat numeric(12,2),
  warranty_ends date,
  funding_source text default 'Angels',
  project_code text,
  owner text default 'Angels',
  insurance_status text default 'Angels insures',
  custodian_id uuid references public.profiles(id),
  location text default 'Angels storage',
  status text not null default 'In store',
  condition text not null default 'New',
  storage_location text,
  client_restriction text,
  box_contents jsonb default '[]',
  request_id uuid references public.am_requests(id),
  donor text,
  value_estimate numeric(12,2),
  qr_label_printed boolean default false,
  created_at timestamptz not null default now()
);

create table if not exists public.am_files (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null,
  subject_id uuid not null,
  kind text not null,          -- Photo front, Serial label, Accessories, Marks, Delivery note, Waybill, Invoice, Quote, Police report, Wipe certificate, Signed form, Receipt photo
  path text not null,          -- path in the am-files storage bucket
  file_name text,
  uploaded_by uuid references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.am_custody (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.am_assets(id) on delete cascade,
  event text not null,
  detail text,
  by_user uuid references public.profiles(id) default auth.uid(),
  at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- PCZEN preparation, pre-handover check, handover (FRM-08, FRM-02)
-- ---------------------------------------------------------------------
create table if not exists public.am_pczen_jobs (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.am_requests(id) on delete cascade,
  asset_id uuid references public.am_assets(id),
  purpose text not null default 'Setup',  -- Setup | Repair | Wipe | Lock and wipe
  ticket text,
  sent_at date,
  returned_at date,
  items jsonb not null default '[]',      -- [{"item":"Laptop","returned":true}]
  outcome text,
  created_at timestamptz not null default now()
);

create table if not exists public.am_prechecks (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.am_requests(id) on delete cascade,
  updates_ok boolean default false,
  software_ok boolean default false,
  settings_ok boolean default false,
  files_ok boolean default false,
  accessories_ok boolean default false,
  result text,                 -- Pass | Back to PCZEN
  checked_by uuid references public.profiles(id) default auth.uid(),
  checked_at timestamptz default now()
);

create table if not exists public.am_handovers (
  id uuid primary key default gen_random_uuid(),
  ref text unique,
  request_id uuid not null references public.am_requests(id) on delete cascade,
  staff_id uuid references public.profiles(id),
  asset_ids uuid[] not null default '{}',
  courier text,
  waybill text,
  remote_session_at timestamptz,
  delivered_at timestamptz,
  signin_ok boolean default false,
  apps_ok boolean default false,
  conditions_accepted boolean default false,
  staff_signed_at timestamptz,
  issued_by uuid references public.profiles(id),
  issued_signed_at timestamptz,
  coordinator_id uuid references public.profiles(id),
  coordinator_signed_at timestamptz,
  form_hash text,
  status text not null default 'Couriered',  -- Couriered -> Staff signed -> Issued -> Complete
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Incidents (FRM-04)
-- ---------------------------------------------------------------------
create table if not exists public.am_incidents (
  id uuid primary key default gen_random_uuid(),
  ref text unique,
  asset_id uuid references public.am_assets(id),
  reported_by uuid not null references public.profiles(id) default auth.uid(),
  type text not null check (type in ('Damaged','Not working','Lost','Stolen')),
  occurred_at timestamptz not null,
  place text,
  locked_away text,
  description text,
  police_case_no text,
  police_station text,
  info_at_risk text default 'No',
  loan_needed boolean default false,
  pczen_lock_ticket text,
  assessment text,
  replacement_request_id uuid references public.am_requests(id),
  insurer_route text,
  claim_no text,
  claim_outcome text,
  payout numeric(12,2),
  write_off_approved_by uuid references public.profiles(id),
  liability_review text,
  late_report boolean default false,
  status text not null default 'Reported',
  booking_id uuid,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Store bookings (FRM-07), deliveries log, donations (FRM-05, FRM-06)
-- ---------------------------------------------------------------------
create table if not exists public.am_bookings (
  id uuid primary key default gen_random_uuid(),
  ref text unique,
  asked_by uuid references public.profiles(id) default auth.uid(),
  booked_by uuid references public.profiles(id),
  purpose text not null check (purpose in ('Training','Marketing')),
  programme text not null,
  venue_town text,
  out_date date not null,
  back_date date not null,
  collector text,
  transport text default 'Collected from Angels',
  asset_ids uuid[] not null default '{}',
  checkout jsonb default '{}',   -- {"signed_by":"...","at":"...","notes":"..."}
  checkin jsonb default '{}',
  status text not null default 'Requested',
  created_at timestamptz not null default now(),
  check (back_date >= out_date)
);

create table if not exists public.am_log (
  id uuid primary key default gen_random_uuid(),
  ref text unique,
  type text not null check (type in ('Delivery in','Collection by Angels','Dispatch out','Courier collection')),
  company text not null,
  tracking text,
  linked_to text,
  expected_date date,
  handled_by text,
  status text not null default 'Expected',
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.am_donations_in (
  id uuid primary key default gen_random_uuid(),
  ref text unique,
  donor text not null,
  contact text,
  conditions text,
  items jsonb not null default '[]',  -- [{"description":"","accepted":true,"wiped":false,"value":0,"asset_id":null}]
  s18a text default 'Not decided',
  thank_you_sent boolean default false,
  status text not null default 'Offered',
  created_at timestamptz not null default now()
);

create table if not exists public.am_disposals (
  id uuid primary key default gen_random_uuid(),
  ref text unique,
  type text not null check (type in ('Donation','Transfer to beneficiary','Return to client','Sale to staff','E-waste')),
  proposed_by uuid references public.profiles(id) default auth.uid(),
  recipient text not null,
  programme text,
  reason text,
  asset_ids uuid[] not null default '{}',
  fit_confirmed boolean default false,
  client_consent boolean default false,
  approved_by uuid references public.profiles(id),
  wiped boolean default false,
  certificate_signed_at timestamptz,
  status text not null default 'Proposed',
  created_at timestamptz not null default now()
);

create table if not exists public.am_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.am_audit (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  user_id uuid,
  table_name text not null,
  record_id text,
  action text not null,
  old_row jsonb,
  new_row jsonb
);

-- ---------------------------------------------------------------------
-- Reference numbers (database issues them; never typed by a user)
-- ---------------------------------------------------------------------
create or replace function public.am_set_ref() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- one branch per table, so each branch only reads columns that table has
  if tg_table_name = 'am_requests' then
    if new.ref is null then new.ref := am_next_ref('AST-REQ'); end if;
  elsif tg_table_name = 'am_handovers' then
    if new.ref is null then new.ref := am_next_ref('AST-HO'); end if;
  elsif tg_table_name = 'am_incidents' then
    if new.ref is null then new.ref := am_next_ref('AST-INC'); end if;
  elsif tg_table_name = 'am_bookings' then
    if new.ref is null then new.ref := am_next_ref('BK'); end if;
  elsif tg_table_name = 'am_log' then
    if new.ref is null then new.ref := am_next_ref('LOG', 4, false); end if;
  elsif tg_table_name = 'am_donations_in' then
    if new.ref is null then new.ref := am_next_ref('DON-IN'); end if;
  elsif tg_table_name = 'am_disposals' then
    if new.ref is null then
      new.ref := am_next_ref(case when new.type in ('Donation','E-waste') then 'DON-OUT' else 'TRF' end);
    end if;
  elsif tg_table_name = 'am_payment_requests' then
    if new.pr_number is null then new.pr_number := am_next_ref('PR', 4); end if;
  elsif tg_table_name = 'am_assets' then
    if new.asset_no is null then
      if new.category = 'Training box' then
        new.asset_no := 'ARC-TRN-TB-' || lpad((select count(*) + 1 from am_assets where category = 'Training box')::text, 2, '0');
      elsif new.category = 'Marketing material' then
        new.asset_no := 'ARC-MKT-' || coalesce(new.short_code, 'MK') || '-' || lpad((select count(*) + 1 from am_assets where category = 'Marketing material' and short_code is not distinct from new.short_code)::text, 2, '0');
      else
        new.asset_no := am_next_ref('ARC-' || case new.category when 'Laptop' then 'LAP' when 'Monitor' then 'MON' when 'Printer' then 'PRN' else 'ACC' end)
          || case when new.funding_source is not null and new.funding_source not in ('Angels','Donated') and new.project_code is not null then '-' || new.project_code else '' end;
      end if;
    end if;
  end if;
  return new;
end $$;

do $$ declare t text; begin
  foreach t in array array['am_requests','am_handovers','am_incidents','am_bookings','am_log','am_donations_in','am_disposals','am_payment_requests','am_assets'] loop
    execute format('drop trigger if exists am_ref on public.%I', t);
    execute format('create trigger am_ref before insert on public.%I for each row execute function public.am_set_ref()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Business rules enforced in the database (briefing section 9)
-- ---------------------------------------------------------------------
-- R-03 late new-starter request (fewer than 10 working days before start)
create or replace function public.am_working_days(d1 date, d2 date) returns int
language sql immutable as $$
  select count(*)::int from generate_series(d1 + 1, d2, interval '1 day') g
  where extract(isodow from g) < 6;
$$;

create or replace function public.am_request_rules() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if new.request_type = 'New starter' then
      new.late_request := am_working_days(current_date, new.date_needed) < 10;
    end if;
    if new.funding_source <> 'Angels' and (new.project_code is null or new.budget_line is null) then
      raise exception 'Client-funded requests need a project code and budget line (R-04)';
    end if;
    if new.replacement_reason in ('Damaged','Lost','Stolen') and new.incident_id is null then
      raise exception 'A replacement for a damaged, lost or stolen item needs a linked incident report (R-02)';
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists am_request_rules on public.am_requests;
create trigger am_request_rules before insert or update on public.am_requests
for each row execute function public.am_request_rules();

-- Approvals: only the named approver decides; nobody decides on their own request (R-06, R-08)
create or replace function public.am_approval_rules() returns trigger
language plpgsql security definer set search_path = public as $$
declare req uuid;
begin
  if new.decision <> 'Pending' and (old.decision is distinct from new.decision) then
    if new.decision in ('Declined','On hold') and coalesce(trim(new.reason), '') = '' then
      raise exception 'Declined and On hold need a reason (R-08)';
    end if;
    if new.subject_type = 'request' then
      select requested_by into req from am_requests where id = new.subject_id;
      if req = auth.uid() and new.step <> 'Technical check' then
        raise exception 'Nobody approves their own request (R-06)';
      end if;
    end if;
    if new.approver_id is not null and new.approver_id <> auth.uid()
       and not (new.step = 'Pre-approval' and (am_has_role('asset_coordinator') or am_has_role('hod_ops'))) then
      raise exception 'Only the named approver can decide this step';
    end if;
    new.decided_at := now();
    new.decided_by := auth.uid();
  end if;
  return new;
end $$;
drop trigger if exists am_approval_rules on public.am_approvals;
create trigger am_approval_rules before update on public.am_approvals
for each row execute function public.am_approval_rules();

-- Payment Request status changes by role (R-05, R-06, R-32)
create or replace function public.am_pr_rules() returns trigger
language plpgsql security definer set search_path = public as $$
declare requester uuid; ceo_limit numeric;
begin
  if new.status is distinct from old.status then
    select requested_by into requester from am_requests where id = new.request_id;
    select (value #>> '{}')::numeric into ceo_limit from am_settings where key = 'ceo_limit';
    if new.status = 'Pre-approved' then
      if not (am_has_role('asset_coordinator') or am_has_role('hod_ops')) then
        raise exception 'Only the Asset Coordinator or Head of Operations and Systems can pre-approve';
      end if;
      if requester = auth.uid() and not am_has_role('hod_ops') then
        raise exception 'Your own request: the Head of Operations and Systems pre-approves alone';
      end if;
      new.preapproved_by := auth.uid(); new.preapproved_at := now();
      new.status := 'With Finance';
    elsif new.status = 'Compliance checked' then
      if not am_has_role('bookkeeper') then raise exception 'Only the Bookkeeper does the compliance check'; end if;
      new.compliance_by := auth.uid(); new.compliance_at := now();
    elsif new.status = 'Approved' then
      if old.status <> 'Compliance checked' then raise exception 'The compliance check comes first'; end if;
      if requester = auth.uid() then raise exception 'Nobody approves their own request (R-06)'; end if;
      if ceo_limit is not null and new.amount_incl_vat > ceo_limit and not (am_has_role('ceo') or am_has_role('treasurer')) then
        raise exception 'Above the CEO limit: the CEO (or Board Treasurer) gives the final approval';
      end if;
      if not (am_has_role('hof') or am_has_role('ceo') or am_has_role('treasurer')) then
        raise exception 'Only the Head of Finance (CEO above the limit) gives the final approval';
      end if;
      new.final_by := auth.uid(); new.final_at := now();
    elsif new.status = 'Paid' then
      if not (am_has_role('bookkeeper') or am_has_role('hof')) then raise exception 'Only Finance marks a payment as Paid'; end if;
      new.paid_at := coalesce(new.paid_at, current_date);
    elsif new.status = 'Declined' then
      if coalesce(trim(new.decline_reason), '') = '' then raise exception 'A decline needs a reason'; end if;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists am_pr_rules on public.am_payment_requests;
create trigger am_pr_rules before update on public.am_payment_requests
for each row execute function public.am_pr_rules();

-- Orders only after Finance approval (R-10)
create or replace function public.am_order_rules() returns trigger
language plpgsql security definer set search_path = public as $$
declare st text;
begin
  select status into st from am_payment_requests where id = new.payment_request_id;
  if st is null or st not in ('Approved','Paid') then
    raise exception 'The order unlocks only after Finance approves the Payment Request (R-10)';
  end if;
  return new;
end $$;
drop trigger if exists am_order_rules on public.am_orders;
create trigger am_order_rules before insert on public.am_orders
for each row execute function public.am_order_rules();

-- Handover form: signing order and lock after completion (R-19)
create or replace function public.am_handover_rules() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.status = 'Complete' then raise exception 'This handover form is locked. Create a new version with a reason.'; end if;
  if new.staff_signed_at is not null and old.staff_signed_at is null then
    if new.staff_id <> auth.uid() then raise exception 'Only the staff member signs for their own equipment'; end if;
    if not (new.conditions_accepted and new.signin_ok) then raise exception 'Tick every condition and confirm the remote sign-in first'; end if;
    new.status := 'Staff signed';
  end if;
  if new.issued_signed_at is not null and old.issued_signed_at is null then
    if new.staff_signed_at is null then raise exception 'The staff member signs first'; end if;
    new.issued_by := auth.uid(); new.status := 'Issued';
  end if;
  if new.coordinator_signed_at is not null and old.coordinator_signed_at is null then
    if new.issued_signed_at is null then raise exception 'Anton signs before the Asset Coordinator'; end if;
    if not am_has_role('asset_coordinator') then raise exception 'Only the Asset Coordinator signs last'; end if;
    new.coordinator_id := auth.uid(); new.status := 'Complete';
  end if;
  return new;
end $$;
drop trigger if exists am_handover_rules on public.am_handovers;
create trigger am_handover_rules before update on public.am_handovers
for each row execute function public.am_handover_rules();

-- Store: no double booking of the same item; client-branded items only for that client (R-21, R-22)
create or replace function public.am_booking_rules() returns trigger
language plpgsql security definer set search_path = public as $$
declare clash text; bad text;
begin
  if new.status = 'Cancelled' then return new; end if;
  select a.asset_no into clash from am_bookings b, unnest(b.asset_ids) x(aid), am_assets a
   where a.id = x.aid and x.aid = any(new.asset_ids) and b.id <> new.id
     and b.status not in ('Cancelled','Returned','Returned with issues')
     and daterange(b.out_date, b.back_date, '[]') && daterange(new.out_date, new.back_date, '[]')
   limit 1;
  if clash is not null then raise exception 'Already booked for those dates: % (R-21)', clash; end if;
  select a.asset_no into bad from am_assets a where a.id = any(new.asset_ids)
    and a.client_restriction is not null and a.client_restriction <> '' and new.programme not ilike '%' || a.client_restriction || '%' limit 1;
  if bad is not null then raise exception '% is client-branded and may only be used for that client (R-22)', bad; end if;
  return new;
end $$;
drop trigger if exists am_booking_rules on public.am_bookings;
create trigger am_booking_rules before insert or update on public.am_bookings
for each row execute function public.am_booking_rules();

-- Incidents: flag late reports (R-24)
create or replace function public.am_incident_rules() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    new.late_report := now() - new.occurred_at > interval '24 hours';
    if new.type = 'Stolen' and coalesce(trim(new.police_case_no), '') = '' then
      raise exception 'Theft needs a police case number';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists am_incident_rules on public.am_incidents;
create trigger am_incident_rules before insert on public.am_incidents
for each row execute function public.am_incident_rules();

-- Donated-out / disposed assets cannot change status again (R-28)
create or replace function public.am_asset_rules() returns trigger
language plpgsql as $$
begin
  if old.status in ('Donated out','Returned to client','Disposed') and new.status is distinct from old.status then
    raise exception 'This asset has left Angels; its status is final (R-28)';
  end if;
  return new;
end $$;
drop trigger if exists am_asset_rules on public.am_assets;
create trigger am_asset_rules before update on public.am_assets
for each row execute function public.am_asset_rules();

-- ---------------------------------------------------------------------
-- Audit log: every insert, update and delete (append-only)
-- ---------------------------------------------------------------------
create or replace function public.am_audit_row() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into am_audit(user_id, table_name, record_id, action, old_row, new_row)
  values (auth.uid(), tg_table_name,
          coalesce((case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end)->>'id', ''),
          tg_op,
          case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
          case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end);
  return coalesce(new, old);
end $$;

do $$ declare t text; begin
  foreach t in array array['profiles','am_settings','am_departments','am_requests','am_approvals','am_payment_requests','am_orders','am_assets','am_files','am_pczen_jobs','am_prechecks','am_handovers','am_incidents','am_bookings','am_log','am_donations_in','am_disposals'] loop
    execute format('drop trigger if exists am_audit on public.%I', t);
    execute format('create trigger am_audit after insert or update or delete on public.%I for each row execute function public.am_audit_row()', t);
  end loop;
end $$;

