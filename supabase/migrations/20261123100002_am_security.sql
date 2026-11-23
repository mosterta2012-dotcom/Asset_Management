-- =====================================================================
-- Angels Asset Management (QMS-05) – row-level security
-- Who sees and changes what. Staff see their own records; back-office roles
-- see what their step needs; the audit log is read-only (POPIA).
-- =====================================================================
-- ---------------------------------------------------------------------
-- Row level security (who sees and changes what)
-- ---------------------------------------------------------------------
do $$ declare t text; begin
  foreach t in array array['profiles','am_settings','am_departments','am_counters','am_requests','am_approvals','am_payment_requests','am_orders','am_assets','am_files','am_custody','am_pczen_jobs','am_prechecks','am_handovers','am_incidents','am_bookings','am_log','am_donations_in','am_disposals','am_notifications','am_audit'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists am_read on public.%I', t);
    execute format('drop policy if exists am_write on public.%I', t);
    execute format('drop policy if exists am_insert on public.%I', t);
    execute format('drop policy if exists am_update on public.%I', t);
  end loop;
end $$;

-- People: everyone signed in can see names (for pickers); only the Asset Coordinator manages roles.
create policy am_read on public.profiles for select to authenticated using (true);
create policy am_update on public.profiles for update to authenticated
  using (am_has_role('asset_coordinator') or am_has_role('hod_ops') or id = auth.uid())
  with check (am_has_role('asset_coordinator') or am_has_role('hod_ops')
              or (id = auth.uid() and roles = (select p.roles from public.profiles p where p.id = auth.uid())));

create policy am_read on public.am_settings for select to authenticated using (true);
create policy am_write on public.am_settings for all to authenticated
  using (am_has_role('asset_coordinator')) with check (am_has_role('asset_coordinator'));
create policy am_read on public.am_departments for select to authenticated using (true);
create policy am_write on public.am_departments for all to authenticated
  using (am_has_role('asset_coordinator')) with check (am_has_role('asset_coordinator'));

-- Requests: own, for me, my team, my department (contact), or back office.
create policy am_read on public.am_requests for select to authenticated using (
  am_is_back_office() or requested_by = auth.uid() or for_user = auth.uid()
  or line_manager_id = auth.uid() or budget_holder_id = auth.uid()
  or exists (select 1 from am_departments d where d.name = am_requests.department and auth.uid() in (d.contact_id, d.backup_id)));
create policy am_insert on public.am_requests for insert to authenticated with check (requested_by = auth.uid());
create policy am_update on public.am_requests for update to authenticated using (
  am_is_back_office() or line_manager_id = auth.uid() or budget_holder_id = auth.uid() or requested_by = auth.uid());

create policy am_read on public.am_approvals for select to authenticated using (true);
create policy am_insert on public.am_approvals for insert to authenticated with check (true);
create policy am_update on public.am_approvals for update to authenticated using (
  approver_id = auth.uid() or am_has_role('asset_coordinator') or am_has_role('hod_ops') or am_has_role('factotum'));

create policy am_read on public.am_payment_requests for select to authenticated using (
  am_is_back_office() or exists (select 1 from am_requests r where r.id = request_id and auth.uid() in (r.requested_by, r.line_manager_id, r.budget_holder_id)));
create policy am_insert on public.am_payment_requests for insert to authenticated with check (am_has_role('factotum') or am_has_role('asset_coordinator'));
create policy am_update on public.am_payment_requests for update to authenticated using (am_is_back_office());

create policy am_read on public.am_orders for select to authenticated using (true);
create policy am_insert on public.am_orders for insert to authenticated with check (am_has_role('factotum') or am_has_role('asset_coordinator'));
create policy am_update on public.am_orders for update to authenticated using (am_has_role('factotum') or am_has_role('asset_coordinator'));

-- Register: back office sees all; staff see items they hold; contacts see their department's holders.
create policy am_read on public.am_assets for select to authenticated using (
  am_is_back_office() or custodian_id = auth.uid() or category in ('Training box','Marketing material')
  or exists (select 1 from am_departments d join profiles p on p.department = d.name
             where p.id = am_assets.custodian_id and auth.uid() in (d.contact_id, d.backup_id)));
create policy am_insert on public.am_assets for insert to authenticated with check (am_has_role('factotum') or am_has_role('asset_coordinator'));
create policy am_update on public.am_assets for update to authenticated using (am_has_role('factotum') or am_has_role('asset_coordinator') or am_has_role('hof'));

create policy am_read on public.am_files for select to authenticated using (true);
create policy am_insert on public.am_files for insert to authenticated with check (uploaded_by = auth.uid());
create policy am_read on public.am_custody for select to authenticated using (true);
create policy am_insert on public.am_custody for insert to authenticated with check (true);

create policy am_read on public.am_pczen_jobs for select to authenticated using (true);
create policy am_write on public.am_pczen_jobs for all to authenticated using (am_has_role('factotum') or am_has_role('asset_coordinator')) with check (am_has_role('factotum') or am_has_role('asset_coordinator'));
create policy am_read on public.am_prechecks for select to authenticated using (true);
create policy am_write on public.am_prechecks for all to authenticated using (am_has_role('factotum')) with check (am_has_role('factotum'));

create policy am_read on public.am_handovers for select to authenticated using (am_is_back_office() or staff_id = auth.uid());
create policy am_insert on public.am_handovers for insert to authenticated with check (am_has_role('factotum') or am_has_role('asset_coordinator'));
create policy am_update on public.am_handovers for update to authenticated using (am_is_back_office() or staff_id = auth.uid());

-- Incidents: the reporter, back office and the Information Officer.
create policy am_read on public.am_incidents for select to authenticated using (am_is_back_office() or reported_by = auth.uid() or am_has_role('info_officer'));
create policy am_insert on public.am_incidents for insert to authenticated with check (reported_by = auth.uid());
create policy am_update on public.am_incidents for update to authenticated using (am_is_back_office());

-- Store calendar is visible to everyone; Anton books; contacts ask.
create policy am_read on public.am_bookings for select to authenticated using (true);
create policy am_insert on public.am_bookings for insert to authenticated with check (am_is_back_office() or am_has_role('dept_contact'));
create policy am_update on public.am_bookings for update to authenticated using (am_has_role('factotum') or am_has_role('asset_coordinator'));

create policy am_read on public.am_log for select to authenticated using (am_is_back_office() or am_has_role('dept_contact'));
create policy am_write on public.am_log for all to authenticated using (am_has_role('factotum') or am_has_role('asset_coordinator')) with check (am_has_role('factotum') or am_has_role('asset_coordinator'));

create policy am_read on public.am_donations_in for select to authenticated using (am_is_back_office());
create policy am_write on public.am_donations_in for all to authenticated using (am_is_back_office()) with check (am_is_back_office());
create policy am_read on public.am_disposals for select to authenticated using (am_is_back_office() or proposed_by = auth.uid());
create policy am_insert on public.am_disposals for insert to authenticated with check (am_is_back_office() or am_has_role('dept_contact'));
create policy am_update on public.am_disposals for update to authenticated using (am_is_back_office());

create policy am_read on public.am_notifications for select to authenticated using (user_id = auth.uid());
create policy am_insert on public.am_notifications for insert to authenticated with check (true);
create policy am_update on public.am_notifications for update to authenticated using (user_id = auth.uid());

-- Audit log: read-only for the Asset Coordinator, Head of Operations and Systems, Head of Finance. No update or delete for anyone.
create policy am_read on public.am_audit for select to authenticated using (am_has_role('asset_coordinator') or am_has_role('hod_ops') or am_has_role('hof'));
-- am_counters: no policies -> only the security-definer functions use it.

