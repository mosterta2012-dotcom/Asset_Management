/* Angels Asset Management (QMS-05) – web app (plain JavaScript, no build step).
   Demo mode uses sample data in this browser tab; live mode reads and writes Supabase,
   where row-level security and database rules decide what each signed-in person may see and do. */
(function () {
  'use strict';
  const C = window.AM_CONFIG || { DEMO: true };
  const DEMO = !!C.DEMO;
  const sb = !DEMO && window.supabase ? window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY) : null;
  const $ = (s, root) => (root || document).querySelector(s);
  const $$ = (s, root) => Array.from((root || document).querySelectorAll(s));
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const fmtDate = (d) => d ? new Date(String(d).length === 10 ? d + 'T00:00:00' : d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  const fmtDateTime = (d) => d ? new Date(d).toLocaleString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
  const rand = (n) => (n === null || n === undefined || n === '') ? '—' : 'R ' + Number(n).toLocaleString('en-ZA', { maximumFractionDigits: 2 });
  const today = () => new Date().toISOString().slice(0, 10);
  const nowIso = () => new Date().toISOString();
  const dayIso = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

  // =====================================================================
  // Lists (QMS-05-REG-02 "Lists" tab). Change here and push.
  // =====================================================================
  const L = {
    CATEGORIES: ['Laptop', 'Monitor', 'Printer', 'Accessory', 'Training box', 'Marketing material'],
    IT: ['Laptop', 'Monitor', 'Printer', 'Accessory'],
    REQUEST_TYPES: ['New starter', 'Replacement', 'Additional item', 'Loan'],
    TIERS: [['Management', 'CEO, HODs and HOF. Spec and price band set by Anton.'], ['Standard', 'Office and programme staff. Spec and price band set by Anton.'], ['Design / Media', 'Design and media roles. Spec and price band set by Anton.']],
    MAIN_USES: ['Office work', 'Training delivery', 'Field work', 'Design and media', 'Finance and reporting'],
    REPLACEMENT_REASONS: ['Old or slow', 'Damaged', 'Lost', 'Stolen', 'Other'],
    FUNDING: ['Angels', 'Scatec E4C', 'Scatec Y4C', 'Noblesfontein (NWF) E4C', 'Seriti Green', 'Donated'],
    INSURANCE: ['Angels insures', 'Client insures', 'Angels with client contribution', 'Not insured'],
    CONDITIONS: ['New', 'Good', 'Fair', 'Damaged', 'Written off'],
    ASSET_STATUS: ['In store', 'Issued', 'Booked out', 'On loan', 'In repair', 'With PCZEN', 'Returned', 'Donated out', 'Returned to client', 'Disposed'],
    DELIVERY: ['Via Anton, then courier', 'Direct to staff member (needs approval)', 'Client site'],
    LOG_TYPES: ['Delivery in', 'Collection by Angels', 'Dispatch out', 'Courier collection'],
    LOG_STATUS: ['Expected', 'Ready to collect', 'Booked', 'Received', 'Collected', 'Delivered', 'Late', 'Cancelled'],
    INCIDENT_TYPES: ['Damaged', 'Not working', 'Lost', 'Stolen'],
    DISPOSAL_TYPES: ['Donation', 'Transfer to beneficiary', 'Return to client', 'Sale to staff', 'E-waste'],
    OLD_LAPTOP: ['Return to stock', 'Repair and reuse as a loan laptop', 'Donation', 'Write off (disposal report)'],
    FLOW: ['Awaiting line manager', 'Awaiting budget holder', 'Tech check', 'Quotes', 'Pre-approval', 'With Finance', 'Ready to order', 'Ordered', 'Received', 'With PCZEN', 'Pre-handover check', 'Couriered', 'Handed over'],
    PRECHECK: [['updates_ok', 'Windows updates done'], ['software_ok', 'Office and required software installed'], ['settings_ok', 'Company settings applied'], ['files_ok', 'Files moved from the old device'], ['accessories_ok', 'All accessories present']],
    CONDITIONS_OF_USE: ['I will use it for Angels work.', 'I will keep it safe and never leave it visible in a vehicle.', 'I will not lend it to anyone or install software PCZEN or Operations has not approved.', 'I will report loss, theft or damage within 24 hours.', 'I will protect personal information on it (POPIA).', 'I will return it with all accessories on request, at the end of a loan, or on my last working day.']
  };
  const ROLES = [['staff', 'Staff'], ['hr', 'HR'], ['line_manager', 'Line manager'], ['budget_holder', 'Budget holder'], ['factotum', 'Factotum (Anton)'], ['dept_contact', 'Department asset contact'], ['asset_coordinator', 'Asset Coordinator'], ['hod_ops', 'Head of Operations and Systems'], ['bookkeeper', 'Bookkeeper'], ['hof', 'Head of Finance'], ['ceo', 'CEO'], ['treasurer', 'Board Treasurer'], ['info_officer', 'Information Officer']];
  const isStoreItem = (a) => ['Training box', 'Marketing material'].includes(a.category);
  const FINAL_ASSET = ['Donated out', 'Returned to client', 'Disposed'];

  // ---------- Working days (weekends and public holidays skipped) ----------
  const HOLIDAYS = ['2026-12-16', '2026-12-25', '2026-12-26', '2027-01-01', '2027-03-22', '2027-03-26', '2027-03-29', '2027-04-27', '2027-05-01', '2027-06-16', '2027-08-09', '2027-09-24', '2027-12-16', '2027-12-25', '2027-12-27'];
  function workingDays(from, to) {
    if (!from || !to) return null;
    let n = 0; const d = new Date(from); const end = new Date(to);
    d.setHours(0, 0, 0, 0); end.setHours(0, 0, 0, 0);
    const sign = d <= end ? 1 : -1;
    while ((sign > 0 && d < end) || (sign < 0 && d > end)) {
      d.setDate(d.getDate() + sign);
      if (d.getDay() % 6 !== 0 && !HOLIDAYS.includes(d.toISOString().slice(0, 10))) n += sign;
    }
    return n;
  }
  function addWorkingDays(from, days) {
    const d = new Date(from); let left = days;
    while (left > 0) { d.setDate(d.getDate() + 1); if (d.getDay() % 6 !== 0 && !HOLIDAYS.includes(d.toISOString().slice(0, 10))) left--; }
    return d.toISOString();
  }
  // R-30 straight-line book value
  function bookValue(a, years) {
    if (!a || !a.cost_excl_vat || !a.purchase_date) return a && a.value_estimate != null ? a.value_estimate : null;
    const months = (Date.now() - new Date(a.purchase_date)) / (1000 * 60 * 60 * 24 * 30.44);
    return Math.max(0, Math.round(a.cost_excl_vat * (1 - months / ((years || 3) * 12))));
  }
  const ageYears = (d) => d ? (Date.now() - new Date(d)) / (1000 * 60 * 60 * 24 * 365.25) : 0;
  async function sha256(text) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  function downloadCsv(name, rows, cols) {
    const q = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const csv = [cols.map((c) => q(c[0])).join(',')].concat(rows.map((r) => cols.map((c) => q(typeof c[1] === 'function' ? c[1](r) : r[c[1]])).join(','))).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = name; a.click();
  }
  function tone(s) {
    s = String(s || '');
    if (/declin|stolen|lost|late|overdue|missing|cancel|written off|back to pczen/i.test(s)) return 'p-bad';
    if (/handed over|complete|approved|paid|returned$|received|collected|delivered|pass|in store|issued|closed|good|new$/i.test(s)) return 'p-ok';
    if (/awaiting|pending|pre-approval|with finance|tech check|quotes|hold|requested|expected|ready|reported|draft|waiting/i.test(s)) return 'p-warn';
    if (/ordered|pczen|couriered|booked|confirmed|signing|checked|with /i.test(s)) return 'p-info';
    return 'p-grey';
  }
  const pill = (s) => `<span class="pill ${tone(s)}">${esc(s)}</span>`;
  function ssGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function ssSet(k, v) { try { if (v == null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) { /* private mode */ } }

  // =====================================================================
  // Data: demo (sample data in this browser tab) and live (Supabase)
  // Both offer the same calls: list, get, insert, insertMany, update, upload, fileUrl.
  // =====================================================================
  let me = null;               // the signed-in person (profiles row)
  let people = [];             // all profiles (names, roles)
  let departments = [];        // department asset contacts
  let settings = {};           // am_settings as key → value

  function demoSeed() {
    const id = (n) => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
    const ts = (o) => { const d = new Date(); d.setDate(d.getDate() + o); return d.toISOString(); };
    const P = { annemarie: id(1), anton: id(2), abongile: id(3), brent: id(4), jessica: id(5), gerald: id(6), lizelle: id(7), jordan: id(8), juliana: id(9), bev: id(10), melissa: id(11), dana: id(12), thandi: id(13), warren: id(14) };
    const profiles = [
      [P.annemarie, 'Annemarie Mostert', 'Operations and Programme Systems Coordinator', 'Operations', P.brent, ['staff', 'asset_coordinator', 'dept_contact']],
      [P.anton, 'Anton Schoeman', 'Logistics Factotum', 'Executive', P.melissa, ['staff', 'factotum', 'dept_contact']],
      [P.abongile, 'Abongile Gotyana', 'National Operations Co-ordinator', 'Operations', P.brent, ['staff', 'dept_contact', 'line_manager']],
      [P.brent, 'Brent Proctor', 'Head of Operations and Systems', 'Operations', P.lizelle, ['staff', 'hod_ops', 'line_manager', 'dept_contact']],
      [P.jessica, 'Jessica Tuna', 'Bookkeeper', 'Finance', P.gerald, ['staff', 'bookkeeper', 'dept_contact']],
      [P.gerald, 'Gerald Erasmus', 'Finance HOD', 'Finance', P.lizelle, ['staff', 'hof', 'line_manager', 'dept_contact']],
      [P.lizelle, 'Lizelle Coombs', 'CEO', 'Executive', null, ['staff', 'ceo', 'info_officer']],
      [P.jordan, 'Jordan Smith', 'HR Assistant', 'Human Resources', P.dana, ['staff', 'hr', 'dept_contact']],
      [P.juliana, 'Juliana Semple', 'Marketing HOD', 'Marketing / PR', P.lizelle, ['staff', 'line_manager', 'dept_contact']],
      [P.bev, 'Bev Mallows', 'Graphic & Digital Design', 'Marketing / PR', P.juliana, ['staff', 'dept_contact']],
      [P.melissa, 'Melissa Gilomee', 'PA to CEO', 'Executive', P.lizelle, ['staff', 'dept_contact', 'line_manager']],
      [P.dana, 'Dana Dreyer', 'HOD Human Resources', 'Human Resources', P.lizelle, ['staff', 'line_manager', 'dept_contact']],
      [P.thandi, 'Thandi Nkosi (sample staff)', 'Facilitator', 'Operations', P.abongile, ['staff']],
      [P.warren, 'Warren (sample)', 'Social Performance Practitioner', 'Operations', P.abongile, ['staff']]
    ].map(([pid, full_name, job_title, department, manager_id, roles]) => ({ id: pid, email: full_name.split(' ')[0].toLowerCase() + '@example.org', full_name, job_title, department, manager_id, roles, active: true }));
    const store = [
      ['ARC-TRN-TB-01', 'Training box', 'TB', 'Training box 1', 'Shelf A1', null], ['ARC-TRN-TB-02', 'Training box', 'TB', 'Training box 2', 'Shelf A2', null],
      ['ARC-MKT-FB-01', 'Marketing material', 'FB', 'Feather banner, Angels', 'Rack B', null], ['ARC-MKT-FB-02', 'Marketing material', 'FB', 'Feather banner, Angels', 'Rack B', null],
      ['ARC-MKT-PB-01', 'Marketing material', 'PB', 'Pull-up banner, Angels', 'Rack B', null], ['ARC-MKT-PB-02', 'Marketing material', 'PB', 'Pull-up banner, Scatec E4C', 'Rack B', 'Scatec'],
      ['ARC-MKT-SK-01', 'Marketing material', 'SK', 'Sock flag, Angels', 'Rack C', null], ['ARC-MKT-GZ-01', 'Marketing material', 'GZ', 'Gazebo 3 x 3 m, Angels', 'Floor C', null]
    ].map(([asset_no, category, short_code, description, storage_location, client_restriction], i) => ({
      id: id(100 + i), asset_no, category, short_code, description, storage_location, client_restriction,
      funding_source: client_restriction ? 'Scatec E4C' : 'Angels', owner: client_restriction ? 'Client' : 'Angels',
      insurance_status: client_restriction ? 'Client insures' : 'Not insured', status: 'In store', condition: 'Good',
      box_contents: category === 'Training box' ? [{ item: 'Flip chart stand', qty: 1 }, { item: 'Flip chart pads', qty: 2 }, { item: 'Marker set', qty: 1 }, { item: 'Extension cord', qty: 1 }, { item: 'Attendance folder', qty: 1 }, { item: 'Name tags', qty: 30 }] : [],
      created_at: ts(-200)
    }));
    const laptops = [
      { id: id(200), asset_no: 'ARC-LAP-2021-007', category: 'Laptop', laptop_tier: 'Standard', description: '14-inch laptop', make_model: '[Make and model]', serial_no: 'SN-XXXX-0157', purchase_date: '2021-03-10', cost_excl_vat: 13500, warranty_ends: '2024-03-10', funding_source: 'Angels', owner: 'Angels', insurance_status: 'Angels insures', custodian_id: P.thandi, location: 'With staff member', status: 'Issued', condition: 'Fair', created_at: ts(-1700) },
      { id: id(201), asset_no: 'ARC-LAP-2026-003', category: 'Laptop', laptop_tier: 'Standard', description: '14-inch laptop', make_model: '[Make and model]', serial_no: 'SN-XXXX-2201', purchase_date: dayIso(-40), cost_excl_vat: 15800, warranty_ends: dayIso(690), funding_source: 'Angels', owner: 'Angels', insurance_status: 'Angels insures', custodian_id: null, location: 'Angels storage', status: 'In store', condition: 'Good', created_at: ts(-40) },
      { id: id(202), asset_no: 'ARC-LAP-2026-004-E4C', category: 'Laptop', laptop_tier: 'Standard', description: '14-inch laptop', make_model: '[Make and model]', serial_no: 'SN-XXXX-2202', purchase_date: dayIso(-30), cost_excl_vat: 15800, warranty_ends: dayIso(700), funding_source: 'Scatec E4C', project_code: 'E4C', owner: 'Client', insurance_status: 'Client insures', custodian_id: P.warren, location: 'With staff member', status: 'Issued', condition: 'Good', created_at: ts(-30) }
    ];
    const r1 = { id: id(300), ref: 'AST-REQ-2026-001', request_type: 'Replacement', requested_by: P.thandi, for_user: P.thandi, department: 'Operations', line_manager_id: P.abongile, category: 'Laptop', item_description: 'Replacement laptop', laptop_tier: 'Standard', main_use: 'Training delivery', travels_with_user: true, replaces_asset: id(200), replacement_reason: 'Old or slow', business_reason: 'Laptop takes several minutes to open files and the battery lasts under an hour.', date_needed: dayIso(14), funding_source: 'Angels', delivery_route: 'Via Anton, then courier', status: 'Awaiting line manager', created_at: ts(-1) };
    const r2 = { id: id(301), ref: 'AST-REQ-2026-002', request_type: 'New starter', requested_by: P.jordan, for_name: 'New facilitator (starts soon)', for_role: 'Facilitator', department: 'Operations', line_manager_id: P.abongile, category: 'Laptop', item_description: 'Laptop for new starter', laptop_tier: 'Standard', main_use: 'Training delivery', business_reason: 'New facilitator for the Seriti Green programme.', date_needed: dayIso(18), funding_source: 'Angels', delivery_route: 'Via Anton, then courier', status: 'With Finance', tech_outcome: 'Buy new', spec_notes: 'Standard tier, include bag and mouse.', created_at: ts(-6) };
    return {
      profiles,
      am_departments: [
        { name: 'Operations', contact_id: P.abongile, backup_id: P.annemarie, notes: 'Programme teams after onboarding' },
        { name: 'Human Resources', contact_id: P.jordan, backup_id: P.dana, notes: 'New-starter requests' },
        { name: 'Marketing / PR', contact_id: P.juliana, backup_id: P.bev, notes: '' },
        { name: 'Finance', contact_id: P.gerald, backup_id: P.jessica, notes: '' },
        { name: 'Reports', contact_id: P.annemarie, backup_id: P.brent, notes: 'Jim Cairns' },
        { name: 'Executive', contact_id: P.melissa, backup_id: P.anton, notes: 'CEO and PA' }],
      am_settings: [
        ['ceo_limit', null, 'Rand amount above which the CEO gives the final approval (D-01)'],
        ['pczen_turnaround_days', 5, 'Agreed PCZEN turnaround in working days (D-02, placeholder)'],
        ['new_starter_lead_days', 10, 'Working days before start date for new-starter requests (R-03)'],
        ['approval_days', 2, 'Working days per approval step'],
        ['loan_pool_max', 2, 'Maximum loan laptops (R-29)'],
        ['depreciation_years', 3, 'Straight-line years for IT equipment book value (R-30)'],
        ['replacement_due_years', 4, 'Flag laptops older than this as replacement due (R-31)']].map(([key, value, note]) => ({ key, value, note })),
      am_assets: store.concat(laptops), am_requests: [r1, r2],
      am_approvals: [
        { id: id(400), subject_type: 'request', subject_id: r1.id, step: 'Line manager', approver_id: P.abongile, decision: 'Pending', due_at: ts(1), created_at: ts(-1) },
        { id: id(401), subject_type: 'request', subject_id: r2.id, step: 'Line manager', approver_id: P.abongile, decision: 'Approved', decided_at: ts(-5), decided_by: P.abongile, created_at: ts(-6) },
        { id: id(402), subject_type: 'request', subject_id: r2.id, step: 'Technical check', approver_id: P.anton, decision: 'Approved', decided_at: ts(-4), decided_by: P.anton, created_at: ts(-5) }],
      am_payment_requests: [{ id: id(500), request_id: r2.id, pr_number: 'PR-2026-0001', supplier: '[Supplier A] · IT hardware', quotes: 'Q-1102 (chosen) · Q-1103 · Q-1104', amount_incl_vat: 18170, status: 'With Finance', created_by: P.anton, preapproved_by: P.annemarie, preapproved_at: ts(-2), created_at: ts(-3) }],
      am_orders: [], am_files: [], am_custody: [], am_pczen_jobs: [], am_prechecks: [], am_handovers: [], am_incidents: [],
      am_bookings: [{ id: id(600), ref: 'BK-2026-001', asked_by: P.juliana, booked_by: P.anton, purpose: 'Marketing', programme: 'Angels marketing · expo', venue_town: '[Venue], Cape Town', out_date: dayIso(5), back_date: dayIso(6), collector: 'Bev Mallows', transport: 'Collected from Angels', asset_ids: [id(104), id(107)], status: 'Confirmed', checkout: {}, checkin: {}, created_at: ts(-2) }],
      am_log: [{ id: id(700), ref: 'LOG-0001', type: 'Collection by Angels', company: 'ZipPrint', tracking: '[Job no.]', linked_to: 'Banner reprint · PR Briefing job', expected_date: dayIso(2), handled_by: 'Anton', status: 'Expected', created_at: ts(-1) }],
      am_donations_in: [], am_disposals: [],
      am_notifications: [
        { id: id(800), user_id: P.abongile, title: 'AST-REQ-2026-001 waits for your approval', body: 'Replacement laptop for Thandi Nkosi', link: '#/request/' + r1.id, created_at: ts(-1) },
        { id: id(801), user_id: P.jessica, title: 'PR-2026-0001 waits for your compliance check', body: 'Laptop for new starter · R 18 170', link: '#/payments', created_at: ts(-2) }],
      am_audit: [], counters: { 'AST-REQ|2026': 2, 'PR|2026': 1, 'BK|2026': 1, 'LOG|0': 1 }, files: {}
    };
  }

  const demoDb = (() => {
    const KEY = 'amDemoData';
    let store = null;
    const st = () => {
      if (store) return store;
      try { store = JSON.parse(ssGet(KEY)); } catch (e) { store = null; }
      if (!store) { store = demoSeed(); save(); }
      return store;
    };
    const save = () => ssSet(KEY, JSON.stringify(store));
    const clone = (x) => JSON.parse(JSON.stringify(x));
    const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Math.random().toString(36).slice(2));
    const pad = (n, w) => String(n).padStart(w, '0');
    const keyOf = (t) => (t === 'am_settings' ? 'key' : t === 'am_departments' ? 'name' : 'id');
    function nextRef(prefix, width, withYear) {
      width = width || 3; withYear = withYear !== false;
      const s = st(); const y = new Date().getFullYear(); const k = prefix + '|' + (withYear ? y : 0);
      s.counters[k] = (s.counters[k] || 0) + 1;
      return withYear ? `${prefix}-${y}-${pad(s.counters[k], width)}` : `${prefix}-${pad(s.counters[k], width)}`;
    }
    // Reference numbers, as the database trigger am_set_ref makes them
    function setRef(table, row) {
      const map = { am_requests: ['ref', 'AST-REQ'], am_handovers: ['ref', 'AST-HO'], am_incidents: ['ref', 'AST-INC'], am_bookings: ['ref', 'BK'], am_donations_in: ['ref', 'DON-IN'], am_payment_requests: ['pr_number', 'PR', 4] };
      if (map[table] && !row[map[table][0]]) row[map[table][0]] = nextRef(map[table][1], map[table][2] || 3);
      if (table === 'am_log' && !row.ref) row.ref = nextRef('LOG', 4, false);
      if (table === 'am_disposals' && !row.ref) row.ref = nextRef(['Donation', 'E-waste'].includes(row.type) ? 'DON-OUT' : 'TRF');
      if (table === 'am_assets' && !row.asset_no) {
        const cat = { Laptop: 'LAP', Monitor: 'MON', Printer: 'PRN' }[row.category] || 'ACC';
        if (row.category === 'Training box') row.asset_no = 'ARC-TRN-TB-' + pad(st().am_assets.filter((a) => a.category === 'Training box').length + 1, 2);
        else if (row.category === 'Marketing material') row.asset_no = `ARC-MKT-${row.short_code || 'MK'}-${pad(st().am_assets.filter((a) => a.short_code === row.short_code).length + 1, 2)}`;
        else row.asset_no = nextRef('ARC-' + cat) + (row.funding_source && !['Angels', 'Donated'].includes(row.funding_source) && row.project_code ? '-' + row.project_code : '');
      }
    }
    // The main database rules, so the demo behaves like the live system
    function rules(table, row, before) {
      const s = st();
      if (table === 'am_approvals' && before && row.decision !== before.decision) {
        if (['Declined', 'On hold'].includes(row.decision) && !row.reason) throw new Error('A reason is needed to decline or put on hold.');
        const r = s.am_requests.find((x) => x.id === row.subject_id);
        if (r && r.requested_by === demoUser && row.step !== 'Technical check') throw new Error('Nobody approves their own request (R-06).');
        if (row.approver_id && row.approver_id !== demoUser && !(row.step === 'Pre-approval' && (me.roles || []).some((x) => ['asset_coordinator', 'hod_ops'].includes(x)))) throw new Error('Only the named approver can decide this step.');
      }
      if (table === 'am_requests' && !before) {
        if (['Damaged', 'Lost', 'Stolen'].includes(row.replacement_reason) && !row.incident_id) throw new Error('Report the problem first, then link the incident (R-02).');
        if (row.funding_source && row.funding_source !== 'Angels' && (!row.project_code || !row.budget_line)) throw new Error('Client-funded requests need a project code and budget line (R-13).');
        if (row.request_type === 'New starter' && row.date_needed) row.late_request = workingDays(new Date(), row.date_needed) < (settings.new_starter_lead_days || 10);
      }
      if (table === 'am_payment_requests' && before && row.status !== before.status) {
        const has2 = (...r) => r.some((x) => (me.roles || []).includes(x));
        const path = { 'With Finance': ['Pre-approval'], 'Compliance checked': ['With Finance'], Approved: ['Compliance checked'], Paid: ['Approved'], Declined: ['Pre-approval', 'With Finance', 'Compliance checked'] };
        if (path[row.status] && !path[row.status].includes(before.status)) throw new Error(`A Payment Request cannot go from ${before.status} to ${row.status}.`);
        if (row.status === 'With Finance') {
          if (!has2('asset_coordinator', 'hod_ops')) throw new Error('Only the Asset Coordinator or Head of Operations and Systems can pre-approve.');
          const rq = s.am_requests.find((x) => x.id === row.request_id);
          if (rq && rq.requested_by === demoUser && !has2('hod_ops')) throw new Error('Your own request: the Head of Operations and Systems pre-approves alone.');
        }
        if (row.status === 'Compliance checked' && !has2('bookkeeper')) throw new Error('Only the Bookkeeper does the compliance check.');
        if (row.status === 'Approved') {
          const rq = s.am_requests.find((x) => x.id === row.request_id);
          if (rq && rq.requested_by === demoUser) throw new Error('Nobody approves their own request (R-06).');
          if (!has2('hof', 'ceo', 'treasurer')) throw new Error('Only the Head of Finance (or CEO above the limit) gives the final approval.');
          if (settings.ceo_limit && row.amount_incl_vat > settings.ceo_limit && !has2('ceo', 'treasurer')) throw new Error('Above the CEO limit: the CEO gives the final approval.');
        }
        if (row.status === 'Declined' && !row.decline_reason) throw new Error('A decline needs a reason.');
      }
      if (table === 'am_orders') {
        const pr = s.am_payment_requests.find((p) => p.id === row.payment_request_id);
        if (!pr || !['Approved', 'Paid'].includes(pr.status)) throw new Error('The order unlocks only after Finance approves the Payment Request (R-10).');
      }
      if (table === 'am_handovers' && before) {
        if (before.status === 'Complete') throw new Error('This handover form is locked. Create a new version with a reason.');
        if (row.issued_signed_at && !row.staff_signed_at) throw new Error('The staff member signs first.');
        if (row.coordinator_signed_at && !row.issued_signed_at) throw new Error('Anton signs before the Asset Coordinator.');
      }
      if (table === 'am_bookings' && row.status !== 'Cancelled') {
        for (const b of s.am_bookings) {
          if (b.id === row.id || ['Cancelled', 'Returned', 'Returned with issues'].includes(b.status)) continue;
          const overlap = b.out_date <= row.back_date && row.out_date <= b.back_date;
          const shared = (b.asset_ids || []).find((a) => (row.asset_ids || []).includes(a));
          if (overlap && shared) throw new Error(`Already booked for those dates: ${(s.am_assets.find((a) => a.id === shared) || {}).asset_no} (R-21)`);
        }
        if (!before) {
          for (const aid of row.asset_ids || []) {
            const a = s.am_assets.find((x) => x.id === aid);
            if (a && a.client_restriction && !new RegExp(a.client_restriction, 'i').test(row.programme || '')) throw new Error(`${a.asset_no} is for ${a.client_restriction} programmes only (R-22).`);
          }
        }
      }
      if (table === 'am_incidents' && !before) {
        if (row.type === 'Stolen' && !row.police_case_no) throw new Error('Theft needs a police case number.');
        if (row.occurred_at) row.late_report = (Date.now() - new Date(row.occurred_at)) > 24 * 3600 * 1000;
      }
      if (table === 'am_assets' && before && FINAL_ASSET.includes(before.status) && row.status !== before.status) throw new Error('This item has left Angels; its status is final.');
    }
    function match(r, o) {
      o = o || {};
      for (const k in o.eq || {}) if (r[k] !== o.eq[k]) return false;
      for (const k in o.in || {}) if (!o.in[k].includes(r[k])) return false;
      return true;
    }
    function audit(table, id, action, oldRow, newRow) {
      if (table === 'am_notifications') return;
      const s = st(); s.am_audit.unshift({ id: uid(), at: nowIso(), user_id: demoUser, table_name: table, record_id: id, action, old_row: oldRow, new_row: newRow });
      s.am_audit.length = Math.min(s.am_audit.length, 400);
    }
    const BY = { am_requests: 'requested_by', am_files: 'uploaded_by', am_payment_requests: 'created_by', am_orders: 'ordered_by', am_incidents: 'reported_by', am_bookings: 'asked_by', am_disposals: 'proposed_by', am_prechecks: 'checked_by', am_custody: 'by_user' };
    const api = {
      async list(table, o) {
        o = o || {}; let rows = (st()[table] || []).filter((r) => match(r, o));
        if (o.order) rows = rows.slice().sort((a, b) => ((a[o.order] || '') > (b[o.order] || '') ? 1 : -1) * (o.desc ? -1 : 1));
        if (o.limit) rows = rows.slice(0, o.limit);
        return clone(rows);
      },
      async get(table, id) { const r = (st()[table] || []).find((x) => x[keyOf(table)] === id); return r ? clone(r) : null; },
      async insert(table, row) {
        const s = st(); s[table] = s[table] || [];
        const r = Object.assign({ id: uid(), created_at: nowIso() }, row);
        if (BY[table] && !r[BY[table]]) r[BY[table]] = demoUser;
        if (table === 'am_custody' && !r.at) r.at = r.created_at;
        if (table === 'am_approvals' && !r.decision) r.decision = 'Pending';
        rules(table, r, null); setRef(table, r);
        s[table].push(r); audit(table, r.id, 'INSERT', null, r); save(); return clone(r);
      },
      async insertMany(table, rows) { for (const r of rows) await api.insert(table, r); },
      async update(table, id, patch) {
        const s = st(); const k = keyOf(table); const i = s[table].findIndex((r) => r[k] === id);
        if (i < 0) throw new Error('Record not found.');
        const before = s[table][i]; const after = Object.assign({}, before, patch);
        if (table === 'am_approvals' && patch.decision && patch.decision !== before.decision) { after.decided_at = nowIso(); after.decided_by = demoUser; }
        if (table === 'am_payment_requests' && patch.status && patch.status !== before.status) {
          if (patch.status === 'Pre-approved') Object.assign(after, { status: 'With Finance', preapproved_by: demoUser, preapproved_at: nowIso() });
          if (patch.status === 'Compliance checked') Object.assign(after, { compliance_by: demoUser, compliance_at: nowIso() });
          if (patch.status === 'Approved') Object.assign(after, { final_by: demoUser, final_at: nowIso() });
        }
        if (table === 'am_handovers') {
          if (patch.staff_signed_at && !before.staff_signed_at) after.status = 'Staff signed';
          if (patch.issued_signed_at && !before.issued_signed_at) Object.assign(after, { issued_by: demoUser, status: 'Issued' });
          if (patch.coordinator_signed_at && !before.coordinator_signed_at) Object.assign(after, { coordinator_id: demoUser, status: 'Complete' });
        }
        rules(table, after, before);
        s[table][i] = after; audit(table, id, 'UPDATE', before, after); save(); return clone(after);
      },
      async upload(file, folder) {
        const path = `${folder}/${Date.now()}-${file.name}`;
        if (file.size < 400000) {
          const data = await new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(file); });
          st().files[path] = data; save();
        }
        return path;
      },
      async fileUrl(path) { return st().files[path] || null; },
      reset() { ssSet(KEY, null); store = null; }
    };
    return api;
  })();
  let demoUser = null;

  // Live: Supabase. The database fills in who did what (auth.uid()), reference numbers and dates,
  // and refuses anything the rules do not allow.
  const liveDb = (() => {
    const keyOf = (t) => (t === 'am_settings' ? 'key' : t === 'am_departments' ? 'name' : 'id');
    const check = (res) => { if (res.error) throw new Error(res.error.message); return res.data; };
    function q(query, o) {
      o = o || {};
      for (const k in o.eq || {}) query = query.eq(k, o.eq[k]);
      for (const k in o.in || {}) query = query.in(k, o.in[k]);
      if (o.order) query = query.order(o.order, { ascending: !o.desc });
      if (o.limit) query = query.limit(o.limit);
      return query;
    }
    return {
      async list(table, o) { return check(await q(sb.from(table).select('*'), o)); },
      async get(table, id) { return check(await sb.from(table).select('*').eq(keyOf(table), id).maybeSingle()); },
      async insert(table, row) { return check(await sb.from(table).insert(row).select().single()); },
      // insert without reading the rows back (for rows the sender may not see, e.g. notifications to others)
      async insertMany(table, rows) { check(await sb.from(table).insert(rows)); },
      async update(table, id, patch) { return check(await sb.from(table).update(patch).eq(keyOf(table), id).select().single()); },
      async upload(file, folder) {
        const path = `${folder}/${Date.now()}-${file.name.replace(/[^\w.-]+/g, '_')}`;
        check(await sb.storage.from('am-files').upload(path, file)); return path;
      },
      async fileUrl(path) { const { data } = await sb.storage.from('am-files').createSignedUrl(path, 3600); return data && data.signedUrl; },
      reset() { }
    };
  })();
  const db = DEMO ? demoDb : liveDb;

  // ---------- Who is signed in ----------
  const has = (...r) => !!me && r.some((x) => (me.roles || []).includes(x));
  const backOffice = () => has('factotum', 'asset_coordinator', 'hod_ops', 'bookkeeper', 'hof', 'ceo', 'treasurer');
  const person = (id) => people.find((p) => p.id === id);
  const nameOf = (id) => (person(id) || {}).full_name || '—';
  const withRole = (r) => people.filter((p) => p.active !== false && (p.roles || []).includes(r)).map((p) => p.id);
  async function notify(ids, title, body, link) {
    const list = Array.from(new Set((ids || []).filter(Boolean)));
    if (list.length) await db.insertMany('am_notifications', list.map((user_id) => ({ user_id, title, body: body || '', link: link || '' })));
  }
  async function loadMe() {
    if (DEMO) {
      demoUser = ssGet('amDemoUser') || '00000000-0000-4000-8000-000000000001';
    } else {
      const { data } = await sb.auth.getUser();
      if (!data || !data.user) return false;
      demoUser = data.user.id;
    }
    const [ps, ds, ss] = await Promise.all([db.list('profiles', { order: 'full_name' }), db.list('am_departments'), db.list('am_settings')]);
    people = ps; departments = ds; settings = {}; ss.forEach((s) => (settings[s.key] = s.value));
    me = person(demoUser) || (DEMO ? null : { id: demoUser, full_name: '', roles: [] });
    return true;
  }

  // =====================================================================
  // Page helpers
  // =====================================================================
  let afterFns = [];
  const after = (fn) => { afterFns.push(fn); return ''; };
  const toast = (msg) => { const t = $('#toast'); t.textContent = msg; t.style.display = 'block'; clearTimeout(t._h); t._h = setTimeout(() => (t.style.display = 'none'), 3500); };
  const page = (title, sub, body, right) => `<div class="head"><div><h1>${esc(title)}</h1>${sub ? `<p class="sub">${sub}</p>` : ''}</div>${right ? `<div class="row">${right}</div>` : ''}</div>${body}`;
  const empty = (t, n) => `<tr><td colspan="${n || 9}" class="note">${esc(t)}</td></tr>`;
  const link = (href, txt) => `<a href="${href}">${esc(txt)}</a>`;
  const F = (label, inner, hint) => `<label>${esc(label)}${hint ? ` <span class="note" style="font-weight:600">${hint}</span>` : ''}${inner}</label>`;
  const attr = (o) => Object.keys(o || {}).map((k) => o[k] === true ? ` ${k}` : o[k] === false || o[k] == null ? '' : ` ${k}="${esc(o[k])}"`).join('');
  const inp = (name, value, a) => `<input name="${name}" value="${esc(value == null ? '' : value)}"${attr(a)}>`;
  const area = (name, value, a) => `<textarea name="${name}"${attr(a)}>${esc(value || '')}</textarea>`;
  function sel(name, options, value, placeholder, a) {
    const o = options.map((x) => Array.isArray(x) ? x : [x, x]);
    return `<select name="${name}"${attr(a)}>${placeholder !== undefined ? `<option value="">${esc(placeholder)}</option>` : ''}${o.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(value == null ? '' : value) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  }
  const personSel = (name, value, placeholder, a) => sel(name, people.filter((p) => p.active !== false).map((p) => [p.id, p.full_name]), value, placeholder === undefined ? 'Choose a person' : placeholder, a);
  const chk = (name, label, checked, a) => `<label class="check"><input type="checkbox" name="${name}" ${checked ? 'checked' : ''}${attr(a)}>${label}</label>`;
  const btn = (id, label, cls, a) => `<button type="button" class="btn ${cls || ''}" id="${id}"${attr(a)}>${esc(label)}</button>`;
  const banner = (cls, html) => `<div class="banner ${cls}">${html}</div>`;
  // Read every named field inside a container
  function vals(root) {
    const o = {};
    $$('[name]', typeof root === 'string' ? $(root) : root).forEach((el) => {
      if (el.type === 'checkbox') o[el.name] = el.checked;
      else if (el.type === 'radio') { if (el.checked) o[el.name] = el.value; }
      else if (el.type !== 'file') o[el.name] = el.value;
    });
    return o;
  }
  function showErr(el, msg) {
    const card = el.closest('.card') || $('#main');
    let box = $('.errbox', card);
    if (!box) { box = document.createElement('div'); box.className = 'banner b-err errbox'; const anchor = el.closest('.row') || el; anchor.parentNode.insertBefore(box, anchor); }
    box.textContent = msg; box.style.display = 'block';
  }
  // Bind a button to an action. Errors (including database rules) show in a red box; success re-draws the page.
  function act(id, fn, ok, opts) { after(() => bindAct(document.getElementById(id), fn, ok, opts)); return ''; }
  function bindAct(el, fn, ok, opts) {
    if (!el) return;
    {
      el.addEventListener('click', async (e) => {
        e.preventDefault(); if (el.disabled) return;
        el.disabled = true; const card = el.closest('.card'); const box = card && $('.errbox', card); if (box) box.style.display = 'none';
        try { const r = await fn(el); if (ok) toast(ok); if (!(opts && opts.stay)) { if (typeof r === 'string' && r !== location.hash) location.hash = r; else await route(); } }
        catch (err) { showErr(el, err.message || String(err)); }
        finally { el.disabled = false; }
      });
    }
  }
  const steps = (items) => `<ul class="steps">${items.map((s) => `<li><span class="dot ${s.state || ''}"></span><div><div style="font-weight:${s.state === 'now' ? 800 : 600}">${esc(s.name)}</div>${s.note ? `<div class="note">${esc(s.note)}</div>` : ''}</div></li>`).join('')}</ul>`;
  const kv = (pairs) => `<dl class="kv">${pairs.filter(Boolean).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${v == null || v === '' ? '—' : v}</dd></div>`).join('')}</dl>`;

  // Photos and documents on any record (stored in the private am-files bucket)
  let fileSeq = 0;
  function filesBlock(type, id, kinds, canAdd, title) {
    const bid = 'files' + ++fileSeq;
    after(() => drawFiles(bid, type, id, kinds || ['Photo'], canAdd !== false, title || 'Photos and documents'));
    return `<div id="${bid}" class="files"><p class="note">Loading files…</p></div>`;
  }
  async function drawFiles(bid, type, id, kinds, canAdd, title) {
    const el = document.getElementById(bid); if (!el) return;
    const files = await db.list('am_files', { eq: { subject_type: type, subject_id: id }, order: 'created_at' });
    const urls = {}; for (const f of files) urls[f.id] = await db.fileUrl(f.path);
    el.innerHTML = `<h3>${esc(title)}</h3><div class="thumbs">${files.map((f) => {
      const u = urls[f.id]; const img = u && /^data:image|\.(png|jpe?g|webp|gif)/i.test(u + f.file_name);
      return `<a ${u ? `href="${esc(u)}" target="_blank" rel="noopener"` : ''} title="${esc(f.kind + ' · ' + f.file_name)}">${img ? `<img src="${esc(u)}" alt="${esc(f.kind)}">` : `<span class="ftile">${esc(f.file_name)}</span>`}<span>${esc(f.kind)}</span></a>`;
    }).join('') || '<span class="note">None yet.</span>'}</div>
    ${canAdd ? `<div class="row" style="margin-top:10px">${sel('kind', kinds, kinds[0])}<input type="file" multiple accept="image/*,application/pdf" aria-label="Add photos or documents"></div>` : ''}`;
    const input = $('input[type=file]', el);
    if (input) input.onchange = async () => {
      const kind = $('select[name=kind]', el).value; input.disabled = true;
      try { for (const file of Array.from(input.files)) { const path = await db.upload(file, `${type}/${id}`); await db.insert('am_files', { subject_type: type, subject_id: id, kind, path, file_name: file.name }); } toast('Added'); }
      catch (err) { toast(err.message); }
      drawFiles(bid, type, id, kinds, canAdd, title);
    };
  }
  // Audit trail of one record (Asset Coordinator, HOD Ops, HOF only)
  function auditBlock(table, id) {
    if (!has('asset_coordinator', 'hod_ops', 'hof')) return '';
    const bid = 'aud' + ++fileSeq;
    after(async () => {
      const rows = await db.list('am_audit', { eq: { table_name: table, record_id: id }, order: 'at', desc: true, limit: 20 });
      const el = document.getElementById(bid); if (!el || !rows.length) return;
      el.innerHTML = `<details class="card"><summary style="cursor:pointer;font-weight:800">Audit log (${rows.length})</summary><div class="tblwrap"><table><tbody>${rows.map((r) => `<tr><td class="note">${fmtDateTime(r.at)}</td><td>${esc(nameOf(r.user_id))}</td><td>${esc(r.action)} ${r.new_row && r.new_row.status ? '· ' + esc(r.new_row.status) : ''}</td></tr>`).join('')}</tbody></table></div></details>`;
    });
    return `<div id="${bid}"></div>`;
  }

  // =====================================================================
  // Navigation (codes match the design canvas boards)
  // =====================================================================
  const finRoles = () => has('bookkeeper', 'hof', 'ceo', 'treasurer', 'asset_coordinator', 'hod_ops');
  const NAV = [
    ['Asset Management', [
      ['#/home', 'Home', '1', () => true],
      ['#/new-request', 'New request', '2', () => true],
      ['#/requests', 'Requests', '2', () => true],
      ['#/approvals', 'My approvals and tasks', '3', () => true, 'approvals'],
      ['#/payments', 'Payment Requests', '2c', finRoles],
      ['#/register', 'Asset register', '4', backOffice],
      ['#/register', 'My equipment', '4', () => !backOffice()],
      ['#/report-problem', 'Report a problem', '6', () => true],
      ['#/incidents', 'Incidents', '7', () => backOffice() || has('info_officer')],
      ['#/reports', 'Monthly report & KPI', '8', () => backOffice() || has('line_manager')],
      ['#/deliveries', 'Deliveries', '9', () => backOffice() || has('dept_contact')],
      ['#/store', 'Training & marketing store', '10', () => true],
      ['#/donations', 'Donations & transfers', '11', backOffice]]],
    ['My messages', [['#/notifications', 'Notifications', 'N', () => true, 'unread']]],
    ['Admin', [['#/admin', 'People, contacts, settings', 'A', () => has('asset_coordinator', 'hod_ops')], ['#/audit', 'Audit log', 'A1', () => has('asset_coordinator', 'hod_ops', 'hof')]]],
    ['Design', [['#/designs', 'Prototype screens', 'D', () => true]]],
    ['Help', [['#/help', 'How to use', '?', () => true]]]
  ];
  // Prototype screens (static copies of the design canvas, in app/screens/)
  const DESIGN = {
    'home-design': ['1', 'Asset Management home'], 'request-design': ['2', 'New request (laptop, step 2)'], 'funding-design': ['2b', 'Request step 3: why, when, who pays, delivery'],
    'order-design': ['2c', 'Order: Payment Request, supplier, PO, delivery'], 'approval-design': ['3', 'Approval / tech check'], 'receive-design': ['3b', "Receive, PCZEN prep & Anton's check"],
    'sign-design': ['3c', 'Staff member signs on screen'], 'register-design': ['4', 'Asset register (funding, owner, insurance)'], 'handover-design': ['5', 'Equipment Issue & Acknowledgement, page 1'],
    'handover-photos': ['5', 'Equipment Issue & Acknowledgement, page 2'], 'report-design': ['6', 'Report a problem (staff)'], 'incident-design': ['7', 'Incident case'],
    'reports-design': ['8', 'Monthly report & PCZEN turnaround'], 'deliveries-design': ['9', 'Deliveries and collections'], 'store-design': ['10', 'Training & marketing store + calendar'],
    'booking-design': ['10b', 'Store booking: check-out and return'], 'donations-design': ['11', 'Donations and transfers'], 'donation-out-design': ['11b', 'Donate or transfer out'],
    'donation-cert-design': ['11c', 'Donation or Transfer Certificate (A4)']
  };
  const NAV_OF = { 'home-design': '#/home', 'request-design': '#/new-request', 'funding-design': '#/new-request', 'order-design': '#/payments', 'approval-design': '#/approvals', 'receive-design': '#/requests', 'sign-design': '#/requests', 'register-design': '#/register', 'handover-design': '#/requests', 'handover-photos': '#/requests', 'report-design': '#/report-problem', 'incident-design': '#/incidents', 'reports-design': '#/reports', 'deliveries-design': '#/deliveries', 'store-design': '#/store', 'booking-design': '#/store', 'donations-design': '#/donations', 'donation-out-design': '#/donations', 'donation-cert-design': '#/donations' };
  const PARENT = { request: '#/requests', handover: '#/requests', asset: '#/register', incident: '#/incidents', booking: '#/store', 'new-booking': '#/store', 'donation-in': '#/donations', disposal: '#/donations' };
  function designFrame(slug) {
    return `<iframe class="dframe" src="screens/${slug}.html" title="Prototype screen" loading="lazy" onload="window.__fit && window.__fit(this)"></iframe>`;
  }
  window.__fit = (f) => { try { const h = () => { try { if (f.isConnected && f.contentDocument) f.style.height = f.contentDocument.documentElement.scrollHeight + 'px'; } catch (e) { /* ignore */ } }; h(); setTimeout(h, 600); f.contentWindow.addEventListener('resize', h); } catch (e) { /* ignore */ } };
  function pDesign(slug) {
    const d = DESIGN[slug]; if (!d) return page('Not found', '', '<div class="card">That screen does not exist. <a href="#/designs">All prototype screens</a></div>');
    return banner('b-info', '<strong>Prototype screen.</strong> This is the approved design from the canvas, with placeholder values like [Name] and [00]. The working page is in the menu; this copy shows the full intended layout.') +
      `<div class="head"><div><h1>${esc(d[0])} · ${esc(d[1])}</h1></div><div class="row"><a class="btn sec sm" href="${NAV_OF[slug] || '#/home'}" style="text-decoration:none;display:inline-flex;align-items:center">Open the working page</a></div></div>` + `<div class="card" style="padding:0">${designFrame(slug)}</div>`;
  }
  function pDesigns() {
    return page('Prototype screens', 'The design canvas, screen by screen. Each working page also shows its prototype at the bottom.',
      `<section class="card"><div class="tblwrap"><table><thead><tr><th>Code</th><th>Screen</th><th>Working page</th></tr></thead><tbody>${Object.keys(DESIGN).map((k) => `<tr><td class="m">${esc(DESIGN[k][0])}</td><td><a href="#/d/${k}">${esc(DESIGN[k][1])}</a></td><td><a href="${NAV_OF[k]}">${esc(NAV_OF[k].slice(2))}</a></td></tr>`).join('')}</tbody></table></div></section>`);
  }

  let counts = { approvals: 0, unread: 0 };
  async function loadCounts() {
    if (!me || !me.id) return;
    const [tasks, nt] = await Promise.all([myTasks(), db.list('am_notifications', { eq: { user_id: me.id } })]);
    counts = { approvals: tasks.length, unread: nt.filter((n) => !n.read_at).length };
  }
  function renderNav() {
    const parts = (location.hash || '#/home').split('/');
    let cur = parts[1] === 'd' ? (NAV_OF[parts[2]] || '#/designs') : PARENT[parts[1]] || ('#/' + (parts[1] || 'home'));
    let h = '<div class="brand"><div class="logo">A</div><div><div style="font-weight:800">Asset Management</div><div class="note">Angels NPO Management System · QMS-05</div></div></div>';
    NAV.forEach(([g, items]) => {
      const vis = items.filter((i) => i[3]()); if (!vis.length) return;
      h += `<div class="group">${esc(g)}</div>` + vis.map(([href, label, code, , cnt]) => `<a href="${href}" class="${cur === href ? 'on' : ''}"><span>${esc(label)}</span>${cnt && counts[cnt] ? `<span class="count">${counts[cnt]}</span>` : ''}<span class="code">${esc(code)}</span></a>`).join('');
    });
    $('#nav').innerHTML = h;
    let w = `<span>Signed in as <strong>${esc(me.full_name || me.email || '')}</strong>${me.job_title ? ' · ' + esc(me.job_title) : ''}</span>`;
    if (DEMO) w += `<label style="flex-direction:row;align-items:center;gap:6px">View as <select id="viewAs">${people.map((p) => `<option value="${p.id}" ${p.id === me.id ? 'selected' : ''}>${esc(p.full_name)}</option>`).join('')}</select></label><button class="btn sec sm" id="resetDemo">Reset demo</button>`;
    else w += '<button class="btn sec sm" id="signOut">Sign out</button>';
    $('#who').innerHTML = w;
    if (DEMO) {
      $('#viewAs').onchange = (e) => { ssSet('amDemoUser', e.target.value); loadMe().then(() => { location.hash = '#/home'; route(); }); };
      $('#resetDemo').onclick = () => { db.reset(); ssSet('amDemoUser', null); location.hash = '#/home'; location.reload(); };
    } else $('#signOut').onclick = async () => { await sb.auth.signOut(); location.reload(); };
  }

  // =====================================================================
  // 1 · Home
  // =====================================================================
  async function pHome() {
    const reqs = await db.list('am_requests', { order: 'created_at', desc: true });
    const mine = reqs.filter((r) => backOffice() ? true : [r.requested_by, r.for_user].includes(me.id));
    const open = mine.filter((r) => !['Handed over', 'Declined', 'Cancelled'].includes(r.status));
    const tiles = [['Laptop', 'New, replacement or loan'], ['Monitor', 'Screen or monitor'], ['Printer', 'Printer'], ['Accessory', 'Mouse, bag, docking station']];
    const forName = (r) => r.for_user ? nameOf(r.for_user) : r.for_name || nameOf(r.requested_by);
    return page('Asset Management', esc(C.ORGANISATION || 'Angels Resource Centres') + ' · ask for equipment, follow your request, look after what you hold, and report a problem.',
      (DEMO ? banner('b-warn', '<strong>Demo mode.</strong> Sample data only, kept in this browser tab. Use “View as” at the top to act as each person (Thandi asks, Abongile approves, Anton checks and orders, Annemarie pre-approves, Jessica and Gerald do the Finance steps). Nothing is saved online.') : '') +
      `<section class="card"><h2>What do you need?</h2><div class="grid">${tiles.map(([c, s]) => `<a class="card tile" href="#/new-request/${c}"><div class="l">${esc(c)}</div><div class="s">${esc(s)}</div></a>`).join('')}
        <a class="card tile" href="#/store"><div class="l">Training or marketing item</div><div class="s">Training boxes, banners, gazebos</div></a>
        <a class="card tile" href="#/report-problem" style="border-color:#E8A39C"><div class="l" style="color:var(--bad)">Report a problem</div><div class="s">Damaged, lost or stolen: within 24 hours</div></a></div></section>
      <div class="grid4">${[[open.length, 'Open requests'], [open.filter((r) => /Awaiting|Pre-approval|With Finance|Tech/.test(r.status)).length, 'Waiting for approval'], [open.filter((r) => r.status === 'Couriered').length, 'Couriered, to sign'], [open.filter((r) => r.date_needed && r.date_needed < today()).length, 'Past the date needed']].map(([v, l]) => `<div class="card tile mini"><div class="l">${l}</div><div class="v">${v}</div></div>`).join('')}</div>
      <section class="card"><h2>${backOffice() ? 'All requests' : 'Your requests'}</h2><div class="tblwrap"><table><thead><tr><th>Reference</th><th>Item</th><th>For</th><th>Type</th><th>Status</th><th>Needed by</th></tr></thead><tbody>
      ${mine.slice(0, 15).map((r) => `<tr><td class="m">${link('#/request/' + r.id, r.ref)}</td><td>${esc(r.category)}${r.laptop_tier ? ' · ' + esc(r.laptop_tier) : ''}</td><td>${esc(forName(r))}</td><td>${esc(r.request_type)}</td><td>${pill(r.status)}</td><td>${fmtDate(r.date_needed)}</td></tr>`).join('') || empty('No requests yet.', 6)}
      </tbody></table></div></section>`, `<a class="btn" href="#/new-request" style="text-decoration:none">New request</a>`);
  }

  // =====================================================================
  // 2 · Requests
  // =====================================================================
  async function pRequests() {
    const reqs = await db.list('am_requests', { order: 'created_at', desc: true });
    const rows = (q, st) => reqs.filter((r) => (!st || r.status === st) && (!q || JSON.stringify(r).toLowerCase().includes(q.toLowerCase())));
    const draw = (list) => list.map((r) => `<tr><td class="m">${link('#/request/' + r.id, r.ref)}${r.late_request ? '<div class="note" style="color:var(--bad)">late request</div>' : ''}</td><td>${esc(r.category)}${r.laptop_tier ? ' · ' + esc(r.laptop_tier) : ''}</td><td>${esc(r.for_user ? nameOf(r.for_user) : r.for_name)}</td><td>${esc(r.request_type)}</td><td>${esc(r.funding_source)}</td><td>${pill(r.status)}</td><td>${fmtDate(r.date_needed)}</td></tr>`).join('') || empty('Nothing found.', 7);
    after(() => { const f = () => { $('#reqBody').innerHTML = draw(rows($('#q').value, $('#st').value)); }; $('#q').oninput = f; $('#st').onchange = f; });
    return page('Requests', 'Every request you are allowed to see, newest first.',
      `<section class="card"><div class="row" style="margin-bottom:12px"><input id="q" placeholder="Search" aria-label="Search">${sel('st', L.FLOW.concat(['Declined', 'On hold', 'Cancelled']), '', 'All statuses', { id: 'st', 'aria-label': 'Status' })}</div>
      <div class="tblwrap"><table><thead><tr><th>Reference</th><th>Item</th><th>For</th><th>Type</th><th>Funding</th><th>Status</th><th>Needed by</th></tr></thead><tbody id="reqBody">${draw(reqs)}</tbody></table></div></section>`,
      `<a class="btn" href="#/new-request" style="text-decoration:none">New request</a>`);
  }

  // =====================================================================
  // 2 / 2b · New request (three short steps)
  // =====================================================================
  let nr = null;
  function pNewRequest(arg) {
    const cat = decodeURIComponent(arg || '');
    nr = { request_type: 'Replacement', for_user: me.id, for_name: '', for_role: '', category: L.IT.includes(cat) ? cat : 'Laptop', laptop_tier: '', main_use: '', travels_with_user: false, item_description: '', replaces_asset: '', replacement_reason: '', incident_id: '', business_reason: '', date_needed: '', funding_source: 'Angels', project_code: '', budget_line: '', client_po_ref: '', owner_after_project: 'Client', budget_holder_id: '', delivery_route: L.DELIVERY[0], delivery_address: '', line_manager_id: me.manager_id || '', _held: null, _heldFor: null, _inc: null };
    after(drawNR);
    return page('New request', 'Three short steps. Accounts, email and software are set up by PCZEN: log those on the PCZEN portal.', '<div class="cols"><div id="nrForm"><p class="note">Loading…</p></div><div id="nrSide"></div></div>');
  }
  async function drawNR() {
    const f = nr; const root = $('#nrForm'); if (!root) return;
    if (f._heldFor !== f.for_user) { f._held = f.for_user ? await db.list('am_assets', { eq: { custodian_id: f.for_user } }) : []; f._heldFor = f.for_user; }
    if (!f._inc) f._inc = await db.list('am_incidents', { eq: { reported_by: me.id }, order: 'created_at', desc: true });
    const forPerson = person(f.for_user);
    const clientFunded = f.funding_source !== 'Angels';
    const needsIncident = ['Damaged', 'Lost', 'Stolen'].includes(f.replacement_reason);
    const late = f.request_type === 'New starter' && f.date_needed && workingDays(new Date(), f.date_needed) < (settings.new_starter_lead_days || 10);
    const title = (forPerson && forPerson.job_title) || f.for_role || '';
    const suggested = /CEO|HOD|Head/i.test(title) ? 'Management' : /design|media|graphic/i.test(title) ? 'Design / Media' : 'Standard';
    const tier = f.laptop_tier || suggested;
    root.innerHTML = `
      <section class="card"><h2>1. Who is it for?</h2><div class="grid">
        ${F('Request type', sel('request_type', L.REQUEST_TYPES, f.request_type))}
        ${f.request_type === 'New starter' ? F('New starter’s name', inp('for_name', f.for_name)) + F('Role / job title', inp('for_role', f.for_role)) : F('For', personSel('for_user', f.for_user))}
        ${F('Line manager', personSel('line_manager_id', f.line_manager_id), 'approves the need')}</div></section>
      <section class="card"><h2>2. What is needed?</h2><div class="grid">
        ${F('Category', sel('category', L.IT, f.category))}${F('Item', inp('item_description', f.item_description, { placeholder: 'e.g. 14-inch laptop with bag' }))}</div>
        ${f.request_type === 'Replacement' ? `<div class="grid" style="margin-top:14px">${F('Item being replaced', sel('replaces_asset', f._held.map((a) => [a.id, a.asset_no + ' · ' + a.category]), f.replaces_asset, 'Choose'))}${F('Reason', sel('replacement_reason', L.REPLACEMENT_REASONS, f.replacement_reason, 'Choose'))}
          ${needsIncident ? F('Linked incident report', sel('incident_id', f._inc.map((i) => [i.id, i.ref + ' · ' + i.type]), f.incident_id, 'Choose'), 'None yet? <a href="#/report-problem">Report a problem</a> first.') : ''}</div>` : ''}
        ${f.category === 'Laptop' ? `<h3 style="margin-top:18px">Laptop tier <span class="note">· suggested for this role: ${esc(suggested)}. Anton confirms it.</span></h3>
          <div class="grid">${L.TIERS.map(([n, note]) => `<label class="choice ${tier === n ? 'on' : ''}"><span class="row"><input type="radio" name="laptop_tier" value="${esc(n)}" ${tier === n ? 'checked' : ''}><strong>${esc(n)}</strong></span><span class="note">${esc(note)}</span></label>`).join('')}</div>
          <div class="grid" style="margin-top:14px">${F('Main use', sel('main_use', L.MAIN_USES, f.main_use, 'Choose'))}${chk('travels_with_user', 'It travels with me to venues or field work', f.travels_with_user)}</div>` : ''}</section>
      <section class="card"><h2>3. Why, when and who pays</h2><div class="grid">
        ${F('Business reason', area('business_reason', f.business_reason))}
        ${F('Date needed', inp('date_needed', f.date_needed, { type: 'date' }), f.request_type === 'New starter' ? 'The start date. At least 10 working days ahead.' : '')}
        ${F('Who pays', sel('funding_source', L.FUNDING.filter((x) => x !== 'Donated'), f.funding_source))}</div>
        ${late ? banner('b-warn', 'This new-starter request is less than 10 working days before the start date. It will be flagged as a late request; HR and the Asset Coordinator are told.') : ''}
        ${clientFunded ? `<div class="grid" style="margin-top:14px">${F('Project code', inp('project_code', f.project_code))}${F('Budget line', inp('budget_line', f.budget_line))}${F('Contract / client PO ref.', inp('client_po_ref', f.client_po_ref))}${F('Owner after the project', sel('owner_after_project', ['Client', 'Angels', 'Beneficiary'], f.owner_after_project))}${F('Programme budget holder', personSel('budget_holder_id', f.budget_holder_id))}</div>
          ${banner('b-info', 'Client-funded items are insured by the client, not added to Angels’ insurance. Angels cover needs Head of Finance approval and a client contribution.')}` : ''}
        <div class="grid" style="margin-top:14px">${F('Delivery', sel('delivery_route', L.DELIVERY, f.delivery_route))}${f.delivery_route !== L.DELIVERY[0] ? F('Delivery address', inp('delivery_address', f.delivery_address), 'Used for this courier booking only. Not stored.') : ''}</div></section>
      <div class="card"><div class="row"><button type="button" class="btn" id="nrSubmit">Submit request</button><a class="btn sec" href="#/home" style="text-decoration:none">Cancel</a></div></div>`;
    $('#nrSide').innerHTML = `<section class="card"><h2>Who approves it</h2><ol class="note" style="padding-left:18px;line-height:1.8;font-size:13px"><li>Your line manager</li>${clientFunded ? '<li>Programme budget holder</li>' : ''}<li>Anton · technical check (repair, stock or buy)</li><li>Annemarie and Brent · pre-approval and budget check</li><li>Finance Management · Jessica (compliance), then Gerald (final check; CEO above the limit)</li></ol><p class="note">You get a notification at every step. Annemarie and Anton are kept informed.</p></section>`;
    const LAYOUT = ['request_type', 'category', 'replacement_reason', 'funding_source', 'delivery_route', 'for_user', 'laptop_tier', 'date_needed'];
    $$('[name]', root).forEach((el) => {
      const upd = () => { nr[el.name] = el.type === 'checkbox' ? el.checked : el.value; };
      el.addEventListener('input', upd);
      el.addEventListener('change', () => {
        upd();
        if (el.name === 'request_type') nr.for_user = nr.request_type === 'New starter' ? '' : (nr.for_user || me.id);
        if (el.name === 'for_user') { const p = person(nr.for_user); if (p && p.manager_id) nr.line_manager_id = p.manager_id; }
        if (LAYOUT.includes(el.name)) drawNR();
      });
    });
    bindAct($('#nrSubmit'), async () => {
      if (needsIncident && !f.incident_id) throw new Error('Report the problem first (Report a problem), then link the incident here (R-02).');
      if (f.request_type === 'New starter' && !f.for_name) throw new Error('Give the new starter’s name.');
      if (f.request_type !== 'New starter' && !f.for_user) throw new Error('Choose who it is for.');
      if (!f.line_manager_id) throw new Error('Choose the line manager who approves the need.');
      if (!f.business_reason.trim()) throw new Error('Give the business reason.');
      if (!f.date_needed) throw new Error('Choose the date needed.');
      if (clientFunded && (!f.project_code || !f.budget_line)) throw new Error('Client-funded requests need a project code and budget line (R-13).');
      const row = {
        request_type: f.request_type, requested_by: me.id, for_user: f.for_user || null, for_name: f.for_name || null, for_role: f.for_role || null,
        department: (forPerson && forPerson.department) || me.department, line_manager_id: f.line_manager_id, category: f.category, item_description: f.item_description,
        laptop_tier: f.category === 'Laptop' ? tier : null, main_use: f.main_use || null, travels_with_user: !!f.travels_with_user,
        replaces_asset: f.replaces_asset || null, replacement_reason: f.replacement_reason || null, incident_id: f.incident_id || null,
        business_reason: f.business_reason, date_needed: f.date_needed, funding_source: f.funding_source,
        project_code: clientFunded ? f.project_code : null, budget_line: clientFunded ? f.budget_line : null, client_po_ref: clientFunded ? f.client_po_ref : null,
        owner_after_project: clientFunded ? f.owner_after_project : null, budget_holder_id: clientFunded ? (f.budget_holder_id || null) : null,
        delivery_route: f.delivery_route, status: 'Awaiting line manager'
      };
      const r = await db.insert('am_requests', row);
      await db.insert('am_approvals', { subject_type: 'request', subject_id: r.id, step: 'Line manager', approver_id: f.line_manager_id, decision: 'Pending', due_at: addWorkingDays(new Date(), settings.approval_days || 2) });
      const who = f.for_name || (forPerson && forPerson.full_name) || me.full_name;
      await notify([f.line_manager_id], `${r.ref} waits for your approval`, `${f.category} for ${who}`, '#/request/' + r.id);
      await notify(withRole('asset_coordinator').concat(withRole('factotum')), `${r.ref} logged`, `${f.category}${row.laptop_tier ? ' · ' + row.laptop_tier : ''} for ${who}, needed by ${f.date_needed}${late ? ' (late request)' : ''}`, '#/request/' + r.id);
      if (late) await notify(withRole('hr'), `${r.ref} is a late new-starter request`, 'Logged fewer than 10 working days before the start date.', '#/request/' + r.id);
      return '#/request/' + r.id;
    }, 'Request submitted');
  }

  // =====================================================================
  // 3 · My approvals and tasks
  // =====================================================================
  async function myTasks() {
    const [ap, reqs, prs, hos] = await Promise.all([db.list('am_approvals', { eq: { approver_id: me.id } }), db.list('am_requests'), finRoles() ? db.list('am_payment_requests') : Promise.resolve([]), db.list('am_handovers')]);
    const R = (id) => reqs.find((r) => r.id === id);
    const items = [];
    ap.filter((a) => ['Pending', 'On hold'].includes(a.decision)).forEach((a) => { const r = R(a.subject_id); if (r && !['Declined', 'Cancelled'].includes(r.status)) items.push({ what: a.step, r, due: a.due_at, st: a.decision }); });
    prs.forEach((p) => {
      const r = R(p.request_id); if (!r) return;
      if (p.status === 'Pre-approval' && has('asset_coordinator', 'hod_ops')) items.push({ what: `Pre-approval · ${p.pr_number} · ${rand(p.amount_incl_vat)}`, r, st: p.status });
      if (p.status === 'With Finance' && has('bookkeeper')) items.push({ what: `Compliance check · ${p.pr_number} · ${rand(p.amount_incl_vat)}`, r, st: p.status });
      if (p.status === 'Compliance checked' && has('hof', 'ceo', 'treasurer')) items.push({ what: `Final check · ${p.pr_number} · ${rand(p.amount_incl_vat)}`, r, st: p.status });
    });
    const ANTON = { Quotes: 'Quotes and Payment Request', 'Ready to order': 'Place the order', Ordered: 'Receive and register', Received: 'Send to PCZEN', 'With PCZEN': 'Check the PCZEN return', 'Pre-handover check': 'Pre-handover check and courier' };
    if (has('factotum')) reqs.forEach((r) => { if (ANTON[r.status]) items.push({ what: ANTON[r.status], r, due: r.date_needed, st: r.status }); });
    hos.forEach((h) => {
      const r = R(h.request_id); if (!r) return;
      if (h.staff_id === me.id && !h.staff_signed_at) items.push({ what: `Confirm receipt and sign ${h.ref}`, r, st: 'Couriered' });
      if (has('factotum') && h.staff_signed_at && !h.issued_signed_at) items.push({ what: `Sign ${h.ref} as Issued by`, r, st: 'Signing' });
      if (has('asset_coordinator') && h.issued_signed_at && !h.coordinator_signed_at) items.push({ what: `Sign ${h.ref} last`, r, st: 'Signing' });
    });
    return items;
  }
  async function pApprovals() {
    const items = await myTasks();
    return page('My approvals and tasks', 'Everything waiting for you, in one list.',
      `<section class="card"><div class="tblwrap"><table><thead><tr><th>What</th><th>Request</th><th>For</th><th>Status</th><th>Due / needed</th></tr></thead><tbody>
      ${items.map((x) => `<tr><td><a href="#/request/${x.r.id}"><strong>${esc(x.what)}</strong></a></td><td class="m">${esc(x.r.ref)}</td><td>${esc(x.r.for_user ? nameOf(x.r.for_user) : x.r.for_name)}</td><td>${pill(x.st)}</td><td>${fmtDate(x.due || x.r.date_needed)}</td></tr>`).join('') || empty('Nothing waiting for you.', 5)}
      </tbody></table></div></section>`);
  }

  // =====================================================================
  // 2c · Payment Requests (pre-approval here; Finance steps stand in for Finance Management)
  // =====================================================================
  async function pPayments() {
    const [prs, reqs] = await Promise.all([db.list('am_payment_requests', { order: 'created_at', desc: true }), db.list('am_requests')]);
    const mine = (p) => (p.status === 'Pre-approval' && has('asset_coordinator', 'hod_ops')) || (p.status === 'With Finance' && has('bookkeeper')) || (p.status === 'Compliance checked' && has('hof', 'ceo', 'treasurer')) || (p.status === 'Approved' && has('bookkeeper', 'hof'));
    return page('Payment Requests', 'Asset purchases. Anton creates the Payment Request; Annemarie and Brent pre-approve here; Jessica (compliance) and Gerald (final check) work in Finance Management.',
      `<section class="card"><div class="tblwrap"><table><thead><tr><th>PR</th><th>Request</th><th>Supplier</th><th>Amount</th><th>Status</th><th>Your action</th></tr></thead><tbody>
      ${prs.map((p) => { const r = reqs.find((x) => x.id === p.request_id) || {}; return `<tr><td class="m">${esc(p.pr_number)}</td><td>${link('#/request/' + p.request_id, r.ref || '—')}</td><td>${esc(p.supplier)}</td><td>${rand(p.amount_incl_vat)}</td><td>${pill(p.status)}</td><td>${mine(p) ? `<a href="#/request/${p.request_id}"><strong>Open</strong></a>` : ''}</td></tr>`; }).join('') || empty('No Payment Requests yet.', 6)}
      </tbody></table></div></section>`);
  }

  // =====================================================================
  // Request page: progress, the current step, Payment Request, details
  // =====================================================================
  async function pRequest(id) {
    const r = await db.get('am_requests', id);
    if (!r) return page('Request', '', '<div class="card">Request not found, or you do not have access to it.</div>');
    const [approvals, prs, orders, assets, jobs, handovers] = await Promise.all([
      db.list('am_approvals', { eq: { subject_id: id }, order: 'created_at' }), db.list('am_payment_requests', { eq: { request_id: id }, order: 'created_at' }),
      db.list('am_orders', { eq: { request_id: id } }), db.list('am_assets', { eq: { request_id: id } }),
      db.list('am_pczen_jobs', { eq: { request_id: id }, order: 'created_at' }), db.list('am_handovers', { eq: { request_id: id }, order: 'created_at' })]);
    const replaced = r.replaces_asset ? await db.get('am_assets', r.replaces_asset) : null;
    const d = { r, approvals, pr: prs[prs.length - 1], orders, assets, job: jobs[jobs.length - 1], handover: handovers[handovers.length - 1], replaced };
    const forName = r.for_user ? nameOf(r.for_user) : r.for_name;
    const idx = L.FLOW.indexOf(r.status);
    const prog = L.FLOW.filter((s) => s !== 'Awaiting budget holder' || r.budget_holder_id).map((s) => ({ name: s, state: r.status === 'Handed over' || L.FLOW.indexOf(s) < idx ? 'done' : s === r.status ? 'now' : '' }));
    const o = orders[0]; const h = d.handover;
    return page(`${r.ref} · ${r.category}${r.laptop_tier ? ' · ' + r.laptop_tier : ''}`,
      esc(`${r.request_type} for ${forName} · needed by ${fmtDate(r.date_needed)} · ${r.funding_source}${r.project_code ? ' · ' + r.project_code : ''}`),
      `<div class="cols"><div>
        ${await stepCard(d)}
        ${d.pr ? paymentPanel(d.pr, r) : ''}
        <section class="card"><h2>Request details</h2>${kv([
          ['Requested by', esc(nameOf(r.requested_by)) + ' · ' + fmtDateTime(r.created_at)], ['For', esc(`${forName}${r.for_role ? ' · ' + r.for_role : ''} · ${r.department || ''}`)],
          ['Line manager', esc(nameOf(r.line_manager_id))], ['Item', esc(r.item_description || r.category)],
          r.main_use && ['Main use', esc(r.main_use + (r.travels_with_user ? ' · travels with user' : ''))],
          replaced && ['Replaces', `${link('#/asset/' + replaced.id, replaced.asset_no)} · ${esc(r.replacement_reason)}`],
          ['Reason', esc(r.business_reason)],
          r.funding_source !== 'Angels' && ['Client funding', esc(`${r.funding_source} · ${r.project_code} · ${r.budget_line} · owner after project: ${r.owner_after_project}`)],
          ['Delivery', esc(r.delivery_route)],
          r.tech_outcome && ['Technical check', esc(`${r.tech_outcome}${r.old_laptop_destination ? ' · old laptop: ' + r.old_laptop_destination : ''}${r.spec_notes ? ' · ' + r.spec_notes : ''}`)],
          o && ['Order', esc(`${o.po_number} · expected ${fmtDate(o.expected_delivery)} · to ${o.deliver_to}`)],
          assets.length && ['Asset(s)', assets.map((a) => link('#/asset/' + a.id, a.asset_no)).join(' ')],
          h && ['Handover form', `${link('#/handover/' + h.id, h.ref)} · ${esc(h.status)}`]])}</section>
        <section class="card">${filesBlock('request', r.id, ['Quote', 'Invoice', 'Delivery note', 'Photo front', 'Serial label', 'Accessories', 'Marks', 'Other'], backOffice())}</section>
      </div><div>
        <section class="card"><h2>Progress</h2>${steps(prog)}</section>
        <section class="card"><h2>Approvals</h2>${approvals.map((a) => `<div class="list-row"><strong>${esc(a.step)}</strong> · ${esc(nameOf(a.approver_id))}<br>${pill(a.decision)} ${a.decided_at ? fmtDateTime(a.decided_at) : a.due_at ? 'due ' + fmtDate(a.due_at) : ''}${a.reason ? `<div class="note">“${esc(a.reason)}”</div>` : ''}</div>`).join('')}
          ${d.pr ? `<div class="list-row"><strong>Payment Request</strong> · ${esc(d.pr.pr_number)} ${pill(d.pr.status)}</div>` : ''}</section>
        ${d.job ? `<section class="card"><h2>PCZEN</h2><p class="note">Ticket ${esc(d.job.ticket || '—')} · sent ${fmtDate(d.job.sent_at)}${d.job.returned_at ? ' · back ' + fmtDate(d.job.returned_at) : ''}<br>${workingDays(d.job.sent_at, d.job.returned_at || today())} working days (agreed ${esc(settings.pczen_turnaround_days == null ? '[X]' : settings.pczen_turnaround_days)})</p></section>` : ''}
        ${auditBlock('am_requests', r.id)}
      </div></div>`, `${pill(r.status)}${r.late_request ? pill('Late request') : ''}`);
  }

  async function nextApproval(r, step, approver) {
    await db.insert('am_approvals', { subject_type: 'request', subject_id: r.id, step, approver_id: approver || null, decision: 'Pending', due_at: addWorkingDays(new Date(), settings.approval_days || 2) });
  }
  const stepWrap = (title, body) => `<section class="card step"><h2>${esc(title)}</h2>${body}</section>`;

  async function stepCard(d) {
    const r = d.r;
    const pendingFor = (step) => d.approvals.find((a) => a.step === step && !['Approved', 'Declined'].includes(a.decision));
    if (r.status === 'Awaiting line manager') { const a = pendingFor('Line manager'); if (a && a.approver_id === me.id) return stepDecide(d, a, 'Your step: approve the need'); }
    if (r.status === 'Awaiting budget holder') { const a = pendingFor('Budget holder'); if (a && a.approver_id === me.id) return stepDecide(d, a, 'Your step: confirm the budget line'); }
    if (r.status === 'Tech check' && has('factotum')) return stepTech(d);
    if (r.status === 'Quotes' && has('factotum', 'asset_coordinator')) return stepQuotes(d);
    if (r.status === 'Ready to order' && has('factotum', 'asset_coordinator')) return stepOrder(d);
    if (r.status === 'Ordered' && has('factotum', 'asset_coordinator')) return stepReceive(d);
    if (r.status === 'Received' && has('factotum')) return stepToPczen(d);
    if (r.status === 'With PCZEN' && has('factotum') && d.job) return stepPczenReturn(d);
    if (r.status === 'Pre-handover check' && has('factotum')) return stepPreCheck(d);
    if (r.status === 'Couriered' && d.handover) return stepSign(d);
    const msg = {
      'Awaiting line manager': 'Waiting for the line manager to approve the need.', 'Awaiting budget holder': 'Waiting for the programme budget holder.',
      'Tech check': 'Anton is doing the technical check: repair, stock or buy.', Quotes: 'Anton is getting quotes and creating the Payment Request.',
      'Pre-approval': 'Waiting for pre-approval and the budget check by Annemarie and Brent.', 'With Finance': 'With Finance Management: Jessica’s compliance check, then Gerald’s final check.',
      'Ready to order': 'Finance has approved. Anton places the order.', Ordered: 'Ordered. Anton receives and registers it.', Received: 'Received and registered. Next: PCZEN preparation.',
      'With PCZEN': 'PCZEN is preparing the device.', 'Pre-handover check': 'Anton is doing his check before handover.', 'Handed over': 'Handed over and signed. Request closed.',
      Declined: 'This request was declined. See the reason under Approvals.', Cancelled: 'Cancelled.', 'On hold': 'On hold. See the reason under Approvals.'
    }[r.status];
    return banner('b-info', esc(msg || r.status));
  }

  function stepDecide(d, a, title) {
    const r = d.r;
    const decide = (decision) => async () => {
      const reason = $('#decReason').value.trim();
      if (decision !== 'Approved' && !reason) throw new Error('Give a reason. The requester sees it.');
      if (r.requested_by === me.id) throw new Error('Nobody approves their own request. Ask your own manager to approve it.');
      await db.update('am_approvals', a.id, { decision, reason: reason || null });
      if (decision === 'Declined') { await db.update('am_requests', r.id, { status: 'Declined' }); await notify([r.requested_by, r.for_user], `${r.ref} declined`, reason, '#/request/' + r.id); }
      if (decision === 'On hold') await notify([r.requested_by], `${r.ref} on hold`, reason, '#/request/' + r.id);
      if (decision === 'Approved') {
        if (a.step === 'Line manager' && r.budget_holder_id) {
          await db.update('am_requests', r.id, { status: 'Awaiting budget holder' }); await nextApproval(r, 'Budget holder', r.budget_holder_id);
          await notify([r.budget_holder_id], `${r.ref} needs your budget line confirmation`, '', '#/request/' + r.id);
        } else {
          const anton = withRole('factotum')[0];
          await db.update('am_requests', r.id, { status: 'Tech check' }); await nextApproval(r, 'Technical check', anton);
          await notify([anton], `${r.ref} ready for your technical check`, '', '#/request/' + r.id);
        }
        await notify([r.requested_by], `${r.ref}: ${a.step.toLowerCase()} approved`, '', '#/request/' + r.id);
      }
    };
    return stepWrap(title, `${F('Reason', area('reason', '', { id: 'decReason' }), 'required to decline or put on hold')}
      <div class="row" style="margin-top:10px">${btn('decOk', 'Approve')}${btn('decHold', 'Put on hold', 'sec')}${btn('decNo', 'Decline with reason', 'bad')}</div>`) +
      act('decOk', decide('Approved'), 'Approved') + act('decHold', decide('On hold'), 'Put on hold') + act('decNo', decide('Declined'), 'Declined');
  }

  async function stepTech(d) {
    const r = d.r;
    const stock = await db.list('am_assets', { eq: { category: r.category, status: 'In store' } });
    after(() => { const t = () => { const v = (vals('#techCard').tech_outcome); $('#stockWrap').style.display = v === 'Issue from stock' ? '' : 'none'; $('#techGo').textContent = v === 'Buy new' ? 'Save and get quotes' : 'Save and go to PCZEN preparation'; }; $$('#techCard input[name=tech_outcome]').forEach((x) => (x.onchange = t)); t(); });
    return `<div id="techCard">` + stepWrap('Your step: technical check', `
      <div class="row" style="margin-bottom:12px">${['Repair', 'Issue from stock', 'Buy new'].map((o) => `<label class="check"><input type="radio" name="tech_outcome" value="${o}" ${o === 'Buy new' ? 'checked' : ''}>${o}</label>`).join('')}</div>
      <div class="grid">${r.category === 'Laptop' ? F('Confirm tier', sel('laptop_tier', L.TIERS.map((t) => t[0]), r.laptop_tier)) : ''}
        ${r.replaces_asset ? F('Old laptop goes to', sel('old_laptop_destination', L.OLD_LAPTOP, '', 'Choose')) : ''}
        <div id="stockWrap">${F('Item from stock', sel('stock_asset', stock.map((a) => [a.id, `${a.asset_no} · ${a.laptop_tier || a.description || ''}`]), '', 'Choose'))}</div></div>
      ${F('Spec notes (for your quotes)', area('spec_notes', r.spec_notes))}
      <div class="row" style="margin-top:10px">${btn('techGo', 'Save and get quotes')}</div>
      <p class="note">Repair or stock skips quotes, pre-approval, Finance and ordering (R-07).</p>`) + '</div>' +
      act('techGo', async () => {
        const f = vals('#techCard');
        const a = d.approvals.find((x) => x.step === 'Technical check' && !x.decided_at);
        const patch = { tech_outcome: f.tech_outcome, laptop_tier: f.laptop_tier || r.laptop_tier, old_laptop_destination: f.old_laptop_destination || null, spec_notes: f.spec_notes };
        if (f.tech_outcome !== 'Buy new') {
          const assetId = f.tech_outcome === 'Issue from stock' ? f.stock_asset : r.replaces_asset;
          if (!assetId) throw new Error(f.tech_outcome === 'Issue from stock' ? 'Choose the item from stock.' : 'Repair needs the item being replaced.');
          if (a) await db.update('am_approvals', a.id, { decision: 'Approved' });
          await db.update('am_assets', assetId, { request_id: r.id, status: 'In store' });
          await db.update('am_requests', r.id, Object.assign(patch, { status: 'Received' }));
        } else {
          if (a) await db.update('am_approvals', a.id, { decision: 'Approved' });
          await db.update('am_requests', r.id, Object.assign(patch, { status: 'Quotes' }));
        }
        await notify([r.requested_by], `${r.ref}: technical check done (${f.tech_outcome})`, '', '#/request/' + r.id);
      }, 'Technical check saved');
  }

  function stepQuotes(d) {
    const r = d.r;
    return `<div id="qCard">` + stepWrap('Your step: quotes and Payment Request', `
      <p class="note">Get the quotes FIN-03 requires and attach them under Photos and documents (kind: Quote). Annemarie and Brent then pre-approve before it goes to Finance Management.</p>
      <div class="grid">${F('Supplier (from the chosen quote)', inp('supplier', ''))}${F('Quotes', inp('quotes', ''), 'e.g. Q-1102 (chosen) · Q-1103 · Q-1104')}${F('Amount incl. VAT (R)', inp('amount_incl_vat', '', { type: 'number', step: '0.01' }))}${F('Project code', inp('project_code', r.project_code))}${F('Budget line', inp('budget_line', r.budget_line))}</div>
      <div class="row" style="margin-top:10px">${btn('qGo', 'Create Payment Request and send for pre-approval')}</div>`) + '</div>' +
      act('qGo', async () => {
        const f = vals('#qCard');
        if (!f.supplier || !f.amount_incl_vat || !f.quotes) throw new Error('Supplier, quotes and amount are needed (FIN-03).');
        const pr = await db.insert('am_payment_requests', { request_id: r.id, supplier: f.supplier, quotes: f.quotes, amount_incl_vat: Number(f.amount_incl_vat), project_code: f.project_code || null, budget_line: f.budget_line || null, status: 'Pre-approval', created_by: me.id });
        await db.update('am_requests', r.id, { status: 'Pre-approval' });
        await notify(withRole('asset_coordinator').concat(withRole('hod_ops')), `${pr.pr_number} waits for pre-approval`, `${r.ref} · ${f.supplier} · ${rand(f.amount_incl_vat)}`, '#/request/' + r.id);
      }, 'Payment Request created');
  }

  function stepOrder(d) {
    const r = d.r; const pr = d.pr;
    return `<div id="oCard">` + stepWrap('Your step: place the order', `${banner('b-ok', `Finance has approved ${esc(pr && pr.pr_number)}. The order section is unlocked.`)}
      <div class="grid" style="margin-top:12px">${F('Order / PO number', inp('po_number', ''))}${F('Expected delivery', inp('expected_delivery', '', { type: 'date' }))}${F('Deliver to', sel('deliver_to', ['Anton', 'Staff member (approved)', 'Client site'], 'Anton'))}</div>
      <div class="row" style="margin-top:10px">${btn('oGo', 'Save order (adds it to the deliveries log)')}</div>`) + '</div>' +
      act('oGo', async () => {
        const f = vals('#oCard');
        if (!f.po_number) throw new Error('Type the order or PO number.');
        await db.insert('am_orders', { request_id: r.id, payment_request_id: pr && pr.id, po_number: f.po_number, expected_delivery: f.expected_delivery || null, deliver_to: f.deliver_to, ordered_by: me.id });
        await db.insert('am_log', { type: 'Delivery in', company: (pr && pr.supplier) || 'Supplier', tracking: f.po_number, linked_to: r.ref, expected_date: f.expected_delivery || null, handled_by: 'Anton', status: 'Expected' });
        await db.update('am_requests', r.id, { status: 'Ordered' });
        await notify([r.requested_by].concat(withRole('asset_coordinator')), `${r.ref} ordered`, `Expected ${f.expected_delivery || 'date to follow'}`, '#/request/' + r.id);
      }, 'Order saved');
  }

  function stepReceive(d) {
    const r = d.r; const pr = d.pr;
    return `<div id="rcCard">` + stepWrap('Your step: receive and register', `
      <p class="note">Check the box against the order and sign the delivery note. Upload the delivery note, invoice and 2 to 4 photos (front, serial label, accessories, marks), then fill in the details. The asset number is created for you; stick on the QR label.</p>
      <div style="margin-bottom:14px">${filesBlock('request', r.id, ['Photo front', 'Serial label', 'Accessories', 'Marks', 'Delivery note', 'Invoice'], true, 'Photos and documents on receipt')}</div>
      <div class="grid">${F('Make and model', inp('make_model', ''))}${F('Serial number', inp('serial_no', ''))}${F('Warranty ends', inp('warranty_ends', '', { type: 'date' }))}${F('Accessories', inp('accessories', 'Charger'))}${F('Invoice number', inp('invoice_no', ''))}${F('Cost excl. VAT (R)', inp('cost_excl_vat', pr ? Math.round(pr.amount_incl_vat / 1.15) : '', { type: 'number' }))}</div>
      <div class="row" style="margin-top:10px">${btn('rcGo', 'Register the item')}</div>`) + '</div>' +
      act('rcGo', async () => {
        const f = vals('#rcCard');
        if (!f.serial_no) throw new Error('The serial number is needed before an item can be issued (R-12).');
        const photos = await db.list('am_files', { eq: { subject_type: 'request', subject_id: r.id } });
        if (photos.filter((p) => /Photo|Serial|Accessories|Marks/.test(p.kind)).length < 2) throw new Error('Add at least 2 photos, including the serial label, under Photos and documents (R-12).');
        const a = await db.insert('am_assets', {
          category: r.category, laptop_tier: r.laptop_tier, description: r.item_description, make_model: f.make_model, serial_no: f.serial_no, accessories: f.accessories,
          supplier: pr && pr.supplier, invoice_no: f.invoice_no, purchase_date: today(), cost_excl_vat: f.cost_excl_vat ? Number(f.cost_excl_vat) : null, warranty_ends: f.warranty_ends || null,
          funding_source: r.funding_source, project_code: r.project_code, owner: r.funding_source === 'Angels' || r.owner_after_project === 'Angels' ? 'Angels' : 'Client',
          insurance_status: r.funding_source === 'Angels' ? 'Angels insures' : 'Client insures', status: 'In store', condition: 'New', location: 'Angels storage', request_id: r.id, qr_label_printed: true
        });
        await db.insert('am_custody', { asset_id: a.id, event: 'Registered', detail: `${r.ref} · invoice ${f.invoice_no}` });
        for (const l of await db.list('am_log', { eq: { linked_to: r.ref } })) await db.update('am_log', l.id, { status: 'Received', completed_at: nowIso() });
        await db.update('am_requests', r.id, { status: 'Received' });
        await notify([r.requested_by].concat(withRole('asset_coordinator')), `${r.ref} arrived at Anton`, `Registered as ${a.asset_no}. Next: PCZEN preparation.`, '#/request/' + r.id);
      }, 'Registered');
  }

  function stepToPczen(d) {
    const r = d.r;
    return `<div id="pzCard">` + stepWrap('Your step: send to PCZEN (FRM-08 part A)', `<div class="grid">
      ${F('Asset', sel('asset_id', d.assets.map((a) => [a.id, a.asset_no]), d.assets[0] && d.assets[0].id))}${F('PCZEN ticket number', inp('ticket', ''))}${F('Every item you send', inp('items', 'Laptop, Charger, Bag, Mouse'), 'comma separated')}</div>
      <div class="row" style="margin-top:10px">${btn('pzGo', 'Record hand-off to PCZEN')}</div>`) + '</div>' +
      act('pzGo', async () => {
        const f = vals('#pzCard');
        if (!f.ticket) throw new Error('Log it on the PCZEN portal first and type the ticket number.');
        await db.insert('am_pczen_jobs', { request_id: r.id, asset_id: f.asset_id || null, purpose: 'Setup', ticket: f.ticket, sent_at: today(), items: f.items.split(',').map((s) => ({ item: s.trim(), returned: false })).filter((x) => x.item) });
        if (f.asset_id) { await db.update('am_assets', f.asset_id, { status: 'With PCZEN', location: 'PCZEN' }); await db.insert('am_custody', { asset_id: f.asset_id, event: 'Sent to PCZEN', detail: 'Ticket ' + f.ticket }); }
        await db.update('am_requests', r.id, { status: 'With PCZEN' });
        await notify(withRole('asset_coordinator'), `${r.ref} sent to PCZEN`, `Ticket ${f.ticket}. Agreed turnaround ${settings.pczen_turnaround_days == null ? '[X]' : settings.pczen_turnaround_days} working days.`, '#/request/' + r.id);
      }, 'Sent to PCZEN');
  }

  function stepPczenReturn(d) {
    const r = d.r; const job = d.job; const items = job.items || [];
    return `<div id="prCard">` + stepWrap('Your step: check the return from PCZEN', `
      <p class="note">Ticket ${esc(job.ticket)} · sent ${fmtDate(job.sent_at)} · <strong>${workingDays(job.sent_at, today())} working days</strong> with PCZEN (agreed ${esc(settings.pczen_turnaround_days == null ? '[X]' : settings.pczen_turnaround_days)})</p>
      ${items.map((it, i) => chk('it' + i, esc(it.item) + ' came back', it.returned)).join('')}
      <div class="row" style="margin-top:10px">${btn('prGo', 'Save return check')}</div>`) + '</div>' +
      act('prGo', async () => {
        const f = vals('#prCard'); const now = items.map((it, i) => Object.assign({}, it, { returned: !!f['it' + i] }));
        const missing = now.filter((i) => !i.returned).map((i) => i.item);
        await db.update('am_pczen_jobs', job.id, { items: now, returned_at: today(), outcome: missing.length ? 'Incomplete: ' + missing.join(', ') : 'Complete' });
        if (missing.length) {
          await notify(withRole('asset_coordinator').concat(withRole('hod_ops')), `PCZEN returned ${r.ref} incomplete`, `Missing: ${missing.join(', ')} · ticket ${job.ticket}. Handover blocked until resolved.`, '#/request/' + r.id);
          throw new Error(`Logged against PCZEN: ${missing.join(', ')} missing. Query sent; handover stays blocked. Tick the items when they arrive and save again.`);
        }
        if (job.asset_id) { await db.update('am_assets', job.asset_id, { status: 'In store', location: 'Angels storage' }); await db.insert('am_custody', { asset_id: job.asset_id, event: 'Back from PCZEN', detail: 'Ticket ' + job.ticket }); }
        await db.update('am_requests', r.id, { status: 'Pre-handover check' });
      }, 'Return checked');
  }

  function stepPreCheck(d) {
    const r = d.r;
    const checks = () => L.PRECHECK.reduce((o, [k]) => { o[k] = !!vals('#pcCard')[k]; return o; }, {});
    return `<div id="pcCard">` + stepWrap('Your step: check before handover (FRM-08 part B)', `
      ${L.PRECHECK.map(([k, l]) => chk(k, l, false)).join('')}
      <h3 style="margin-top:14px">Courier and remote handover</h3>
      <div class="grid">${F('Signs for it', personSel('staff_id', r.for_user || ''))}${F('Courier', inp('courier', ''))}${F('Waybill / tracking', inp('waybill', ''))}${F('Remote sign-in with PCZEN (15 min)', inp('remote_session_at', '', { type: 'datetime-local' }))}</div>
      <div class="row" style="margin-top:10px">${btn('pcGo', 'All passed: courier it')}${btn('pcBack', 'A line failed: back to PCZEN', 'bad')}</div>`) + '</div>' +
      act('pcGo', async () => {
        const f = vals('#pcCard'); const c = checks();
        if (!Object.values(c).every(Boolean)) throw new Error('Every line must pass before the courier can be booked (R-18).');
        if (!f.waybill) throw new Error('Book the courier and type the waybill number.');
        if (!f.staff_id) throw new Error('Choose who signs for it (the staff member’s account).');
        await db.insert('am_prechecks', Object.assign({ request_id: r.id, result: 'Pass', checked_by: me.id, checked_at: nowIso() }, c));
        const h = await db.insert('am_handovers', { request_id: r.id, staff_id: f.staff_id, asset_ids: d.assets.map((a) => a.id), courier: f.courier, waybill: f.waybill, remote_session_at: f.remote_session_at ? new Date(f.remote_session_at).toISOString() : null, status: 'Couriered' });
        for (const a of d.assets) await db.insert('am_custody', { asset_id: a.id, event: 'Couriered', detail: `${f.courier} ${f.waybill}` });
        await db.insert('am_log', { type: 'Dispatch out', company: f.courier || 'Courier', tracking: f.waybill, linked_to: r.ref, expected_date: today(), handled_by: 'Anton', status: 'Booked' });
        await db.update('am_requests', r.id, { status: 'Couriered', for_user: f.staff_id });
        await notify([f.staff_id], `Your equipment is on its way (${r.ref})`, `${f.courier} waybill ${f.waybill}. Remote sign-in with PCZEN: ${f.remote_session_at ? fmtDateTime(f.remote_session_at) : 'to be booked'}. Have your phone with Authenticator ready.`, '#/request/' + r.id);
      }, 'Couriered') +
      act('pcBack', async () => {
        await db.insert('am_prechecks', Object.assign({ request_id: r.id, result: 'Back to PCZEN', checked_by: me.id, checked_at: nowIso() }, checks()));
        await db.insert('am_pczen_jobs', { request_id: r.id, asset_id: d.assets[0] && d.assets[0].id, purpose: 'Setup', ticket: (d.job && d.job.ticket) || 'Same ticket', sent_at: today(), items: [{ item: 'Laptop', returned: false }] });
        await db.update('am_requests', r.id, { status: 'With PCZEN' });
      }, 'Sent back to PCZEN');
  }

  function stepSign(d) {
    const r = d.r; const h = d.handover; const isStaff = h.staff_id === me.id;
    let body = `<p class="note">${esc(h.ref)} · ${esc(h.courier)} waybill ${esc(h.waybill)} · remote sign-in ${h.remote_session_at ? fmtDateTime(h.remote_session_at) : 'to be booked'} · ${link('#/handover/' + h.id, 'view form')}</p>
      ${filesBlock('handover', h.id, ['Receipt photo', 'Serial label', 'Accessories'], isStaff && !h.staff_signed_at, '1. Photos of what you received')}`;
    if (isStaff && !h.staff_signed_at) {
      body += `<h3 style="margin-top:14px">2. Remote sign-in with PCZEN</h3>${chk('signin_ok', 'I signed in on the new laptop and approved the sign-in in Authenticator', false)}${chk('apps_ok', 'Outlook, Teams and my files work', false)}
        <h3 style="margin-top:14px">3. Conditions of use</h3>${L.CONDITIONS_OF_USE.map((t, i) => chk('c' + i, esc(t), false)).join('')}
        ${r.replaces_asset ? banner('b-warn', 'Replacing a laptop: courier the old one and its charger back to Anton with the return label in the box.') : ''}
        <div class="row" style="margin-top:10px">${btn('sgStaff', 'Sign with my Angels account')}</div>` +
        act('sgStaff', async () => {
          const f = vals('#sgCard');
          const photos = await db.list('am_files', { eq: { subject_type: 'handover', subject_id: h.id } });
          if (!photos.length) throw new Error('Add at least one photo of what you received.');
          if (!f.signin_ok || !f.apps_ok || !L.CONDITIONS_OF_USE.every((_, i) => f['c' + i])) throw new Error('Tick every condition and confirm the remote sign-in first.');
          const form_hash = await sha256(JSON.stringify({ ref: h.ref, staff: me.id, assets: h.asset_ids, at: nowIso() }));
          await db.update('am_handovers', h.id, { signin_ok: true, apps_ok: true, conditions_accepted: true, delivered_at: nowIso(), staff_signed_at: nowIso(), form_hash });
          await notify(withRole('factotum'), `${h.ref} signed by ${me.full_name}`, 'Please sign as Issued by.', '#/request/' + r.id);
        }, 'Signed');
    }
    if (h.staff_signed_at) body += banner('b-ok', `Signed by ${esc(nameOf(h.staff_id))} · ${fmtDateTime(h.staff_signed_at)}`);
    if (h.staff_signed_at && !h.issued_signed_at && has('factotum')) body += `<div class="row" style="margin-top:10px">${btn('sgAnton', 'Sign as Issued by')}</div>` + act('sgAnton', async () => {
      await db.update('am_handovers', h.id, { issued_signed_at: nowIso() });
      await notify(withRole('asset_coordinator'), `${h.ref} ready for your signature`, '', '#/request/' + r.id);
    }, 'Signed');
    if (h.issued_signed_at) body += banner('b-ok', `Issued by ${esc(nameOf(h.issued_by))} · ${fmtDateTime(h.issued_signed_at)}`);
    if (h.issued_signed_at && !h.coordinator_signed_at && has('asset_coordinator')) body += `<div class="row" style="margin-top:10px">${btn('sgCoord', 'Sign last and lock the form')}</div>` + act('sgCoord', async () => {
      await db.update('am_handovers', h.id, { coordinator_signed_at: nowIso() });
      for (const a of d.assets) { await db.update('am_assets', a.id, { custodian_id: h.staff_id, status: r.request_type === 'Loan' ? 'On loan' : 'Issued', location: 'With staff member' }); await db.insert('am_custody', { asset_id: a.id, event: 'Handed over', detail: h.ref }); }
      await db.update('am_requests', r.id, { status: 'Handed over', handed_over_at: nowIso() });
      if (r.replaces_asset) await db.insert('am_log', { type: 'Courier collection', company: 'Courier', tracking: 'Return label', linked_to: r.ref + ' · old item return', expected_date: today(), handled_by: 'Anton', status: 'Expected' });
      await notify([h.staff_id, r.line_manager_id, r.requested_by], `${r.ref} handed over`, `${h.ref} is signed and locked.`, '#/handover/' + h.id);
    }, 'Handover complete');
    if (!isStaff && !h.staff_signed_at) body += `<p class="note">Waiting for ${esc(nameOf(h.staff_id))} to confirm receipt and sign.</p>`;
    return `<div id="sgCard">` + stepWrap(isStaff ? 'Collect and sign for your equipment' : 'Handover and signatures', body) + '</div>';
  }

  // ---------- Payment Request panel on the request page ----------
  function paymentPanel(pr, r) {
    const aboveLimit = settings.ceo_limit && pr.amount_incl_vat > settings.ceo_limit;
    const ORDER = ['Pre-approval', 'With Finance', 'Compliance checked', 'Approved', 'Paid'];
    const after2 = (s) => ORDER.indexOf(pr.status) > ORDER.indexOf(s);
    const set = async (patch, to, msg) => { await db.update('am_payment_requests', pr.id, patch); if (to) await notify(to, msg, `${r.ref} · ${pr.supplier} · ${rand(pr.amount_incl_vat)}`, '#/request/' + r.id); };
    const reason = () => (($('#prReason') || {}).value || '').trim();
    const decline = async () => {
      if (!reason()) throw new Error('A decline needs a reason.');
      await set({ status: 'Declined', decline_reason: reason() }, withRole('factotum').concat([r.requested_by]), `${pr.pr_number} declined`);
      await db.update('am_requests', r.id, { status: 'Quotes' });
    };
    const tile = (where, what, who, st) => `<div class="card tile mini"><div class="note">${esc(where)}</div><div style="font-weight:800;margin:2px 0">${esc(what)}</div><div class="note">${esc(who)}</div>${st ? `<div style="margin-top:6px">${pill(st)}</div>` : ''}</div>`;
    let action = '';
    const reasonBox = F('Reason (to decline)', inp('reason', '', { id: 'prReason' }));
    if (pr.status === 'Pre-approval' && has('asset_coordinator', 'hod_ops')) action = `<h3>Your step: pre-approval and budget check</h3>${reasonBox}<div class="row" style="margin-top:8px">${btn('prPre', 'Pre-approve and send to Finance')}${btn('prNo', 'Decline', 'bad')}</div>` +
      act('prPre', async () => {
        if (r.requested_by === me.id && !has('hod_ops')) throw new Error('This is your own request: the Head of Operations and Systems pre-approves alone.');
        await set({ status: 'Pre-approved' }, withRole('bookkeeper'), `${pr.pr_number} waits for your compliance check`);
        await db.update('am_requests', r.id, { status: 'With Finance' });
      }, 'Sent to Finance');
    if (pr.status === 'With Finance' && has('bookkeeper')) action = `<h3>Your step: full compliance check</h3><div id="compl">${[['supplier', 'Supplier details checked'], ['bank', 'Bank details verified (call-back if changed)'], ['quotes', 'Quotes meet FIN-03'], ['docs', 'Documents complete and uploaded']].map(([k, l]) => chk(k, l, false)).join('')}</div>${reasonBox}<div class="row" style="margin-top:8px">${btn('prComp', 'Compliance checked')}${btn('prNo', 'Decline', 'bad')}</div>` +
      act('prComp', async () => {
        const c = vals('#compl'); if (!['supplier', 'bank', 'quotes', 'docs'].every((k) => c[k])) throw new Error('Tick every compliance line first.');
        await set({ status: 'Compliance checked' }, aboveLimit ? withRole('ceo') : withRole('hof'), `${pr.pr_number} waits for your final check`);
      }, 'Compliance checked');
    if (pr.status === 'Compliance checked' && has('hof', 'ceo', 'treasurer')) action = `<h3>Your step: final check before payment</h3>${reasonBox}<div class="row" style="margin-top:8px">${btn('prOk', 'Approve')}${btn('prNo', 'Decline', 'bad')}</div>` +
      act('prOk', async () => {
        if (r.requested_by === me.id) throw new Error('Nobody approves their own request (R-06).');
        if (aboveLimit && !has('ceo', 'treasurer')) throw new Error('Above the CEO limit: the CEO (or Board Treasurer) gives the final approval.');
        await set({ status: 'Approved' }, withRole('factotum').concat(withRole('asset_coordinator')), `${pr.pr_number} approved by Finance: place the order`);
        await db.update('am_requests', r.id, { status: 'Ready to order' });
      }, 'Approved');
    if (pr.status === 'Approved' && has('bookkeeper', 'hof')) action = `<div class="row">${btn('prPaid', 'Mark as Paid', 'sec')}</div>` + act('prPaid', () => set({ status: 'Paid', paid_at: today() }, withRole('factotum'), `${pr.pr_number} paid`), 'Marked as Paid');
    if (action.includes('prNo')) action += act('prNo', decline, 'Declined');
    return `<section class="card"><h2>Payment Request ${esc(pr.pr_number)}</h2>
      ${kv([['Supplier', esc(pr.supplier)], ['Quotes', esc(pr.quotes)], ['Amount incl. VAT', rand(pr.amount_incl_vat) + (aboveLimit ? ' · above the CEO limit' : '')], ['Charged to', esc((pr.project_code || r.funding_source) + (pr.budget_line ? ' · ' + pr.budget_line : ''))], ['Created by', esc(nameOf(pr.created_by)) + ' · ' + fmtDate(pr.created_at)]])}
      <div class="grid4" style="margin-top:14px">
        ${tile('Asset Management', 'Pre-approval and budget check', pr.preapproved_by ? `${nameOf(pr.preapproved_by)} · ${fmtDate(pr.preapproved_at)}` : 'Annemarie and Brent', pr.preapproved_by ? 'Pre-approved' : pr.status === 'Pre-approval' ? 'Waiting' : null)}
        ${tile('Finance Management', 'Compliance check and upload', pr.compliance_by ? `${nameOf(pr.compliance_by)} · ${fmtDate(pr.compliance_at)}` : 'Jessica · supplier, bank details, documents', pr.compliance_by ? 'Checked' : pr.status === 'With Finance' ? 'Waiting' : null)}
        ${tile('Finance Management', 'Final check before payment', pr.final_by ? `${nameOf(pr.final_by)} · ${fmtDate(pr.final_at)}` : 'Gerald' + (aboveLimit ? ', then CEO' : ''), pr.final_by ? 'Approved' : pr.status === 'Compliance checked' ? 'Waiting' : null)}
        ${tile('Finance Management', 'Payment', pr.paid_at ? 'Paid ' + fmtDate(pr.paid_at) : 'When Finance marks it Paid', pr.paid_at ? 'Paid' : after2('Compliance checked') ? 'Awaiting payment' : null)}</div>
      ${pr.status === 'Declined' ? banner('b-err', 'Declined: ' + esc(pr.decline_reason)) : ''}
      ${action ? `<div style="margin-top:14px">${action}</div>` : ''}
      <p class="note" style="margin-top:10px">The Finance steps stand in for Finance Management until the two modules are linked. Status changes are checked by the database (roles, order, own-request rule).</p></section>`;
  }

  // ---------- 5 · Equipment Issue and Acknowledgement (QMS-05-FRM-02), print to PDF ----------
  async function pHandover(id) {
    const h = await db.get('am_handovers', id); if (!h) return page('Handover form', '', '<div class="card">Not found, or you do not have access to it.</div>');
    const r = await db.get('am_requests', h.request_id) || {};
    const assets = (await db.list('am_assets')).filter((a) => (h.asset_ids || []).includes(a.id));
    const sig = (label, who, at) => `<div class="sig"><div class="note">${esc(label)}</div><div style="font-weight:800">${esc(who ? nameOf(who) : '—')}</div><div class="note">${at ? 'Signed electronically ' + fmtDateTime(at) : 'Not signed yet'}</div></div>`;
    after(() => { $('#printBtn').onclick = () => window.print(); });
    return `<section class="card print">
      <div class="row noprint" style="justify-content:space-between;margin-bottom:16px">${link('#/request/' + r.id, '← ' + (r.ref || 'Request'))}<button class="btn" id="printBtn">Print / save as PDF</button></div>
      <div class="note">${esc(C.ORGANISATION || 'Angels Resource Centres')} · QMS-05-FRM-02</div>
      <h1 style="margin:4px 0">Equipment Issue and Acknowledgement</h1>
      <p class="note">${esc(h.ref)} · request ${esc(r.ref)} · status <strong>${esc(h.status)}</strong>${h.status === 'Complete' ? ' · locked' : ''}</p>
      <div style="margin:14px 0">${kv([['Issued to', esc(nameOf(h.staff_id))], ['Department', esc(r.department)], ['Courier', esc(`${h.courier || ''} · ${h.waybill || ''}`)], ['Delivered', fmtDateTime(h.delivered_at)], ['Remote sign-in', (h.signin_ok ? 'Confirmed (Authenticator)' : '—') + ' · Outlook, Teams and files ' + (h.apps_ok ? 'working' : '—')]])}</div>
      <div class="tblwrap"><table><thead><tr><th>Asset no.</th><th>Item</th><th>Serial</th><th>Accessories</th><th>Funding / insurance</th></tr></thead><tbody>${assets.map((a) => `<tr><td class="m">${esc(a.asset_no)}</td><td>${esc(a.category)} ${a.laptop_tier ? '· ' + esc(a.laptop_tier) : ''} ${esc(a.make_model || '')}</td><td class="m">${esc(a.serial_no)}</td><td>${esc(a.accessories)}</td><td>${esc(a.funding_source)} · ${esc(a.insurance_status)}</td></tr>`).join('')}</tbody></table></div>
      <h3 style="margin-top:16px">Conditions of use</h3><ul style="font-size:13px">${L.CONDITIONS_OF_USE.map((c) => `<li>${h.conditions_accepted ? '☑' : '☐'} ${esc(c)}</li>`).join('')}</ul>
      <div class="grid" style="margin-top:16px">${sig('Received by (staff member)', h.staff_id, h.staff_signed_at)}${sig('Issued by (Factotum)', h.issued_by, h.issued_signed_at)}${sig('Recorded by (Asset Coordinator)', h.coordinator_id, h.coordinator_signed_at)}</div>
      ${h.form_hash ? `<p class="note" style="word-break:break-all">Integrity code (SHA-256): ${esc(h.form_hash)}</p>` : ''}
      <div style="margin-top:16px">${filesBlock('handover', h.id, null, false, 'Photos on receipt')}</div>
      <p class="note" style="margin-top:20px">Controlled document. Printed copies are uncontrolled. Generated ${fmtDate(today())}.</p></section>`;
  }

  // =====================================================================
  // 4 · Asset register / My equipment
  // =====================================================================
  const onSchedule = (a) => ['Angels insures', 'Angels with client contribution'].includes(a.insurance_status);
  async function pRegister() {
    const assets = await db.list('am_assets', { order: 'asset_no' });
    const years = settings.depreciation_years || 3; const dueYears = settings.replacement_due_years || 4;
    const base = assets.filter((a) => backOffice() || a.custodian_id === me.id);
    const cols = [['Asset no.', 'asset_no'], ['Category', 'category'], ['Item description', 'description'], ['Tier', 'laptop_tier'], ['Make and model', 'make_model'], ['Serial no.', 'serial_no'], ['Supplier', 'supplier'], ['Invoice no.', 'invoice_no'], ['Purchase date', 'purchase_date'], ['Cost excl. VAT (R)', 'cost_excl_vat'], ['Book value (R)', (a) => bookValue(a, years)], ['Warranty ends', 'warranty_ends'], ['Funding', 'funding_source'], ['Client project code', 'project_code'], ['Owner', 'owner'], ['Insurance', 'insurance_status'], ['On broker schedule', (a) => onSchedule(a) ? 'Yes' : 'No'], ['With (person / location)', (a) => a.custodian_id ? nameOf(a.custodian_id) : a.location], ['Status', 'status'], ['Condition', 'condition']];
    const filt = () => { const f = vals('#regFilter'); return base.filter((a) => (!f.category || a.category === f.category) && (!f.status || a.status === f.status) && (!f.funding || a.funding_source === f.funding) && (!f.insurance || a.insurance_status === f.insurance) && (!f.q || JSON.stringify(a).toLowerCase().includes(f.q.toLowerCase()))); };
    const draw = (rows) => rows.map((a) => `<tr><td class="m">${link('#/asset/' + a.id, a.asset_no)}${a.category === 'Laptop' && ageYears(a.purchase_date) > dueYears && !FINAL_ASSET.includes(a.status) ? '<div class="note" style="color:var(--warn)">replacement due</div>' : ''}</td><td>${esc(a.category)}${a.laptop_tier ? ' · ' + esc(a.laptop_tier) : ''}<div class="note">${esc(a.description)}</div></td><td>${esc(a.custodian_id ? nameOf(a.custodian_id) : a.location || a.storage_location)}</td><td>${esc(a.funding_source)} · ${esc(a.owner)}</td><td>${esc(a.insurance_status)}</td><td>${rand(bookValue(a, years))}</td><td>${pill(a.status)}</td></tr>`).join('') || empty('No items.', 7);
    after(() => {
      const f = $('#regFilter'); if (f) $$('[name]', f).forEach((el) => el.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', () => { $('#regBody').innerHTML = draw(filt()); }));
      const x = $('#csvReg'); if (x) x.onclick = () => downloadCsv('asset-register.csv', filt(), cols);
      const y = $('#csvBroker'); if (y) y.onclick = () => downloadCsv('broker-schedule.csv', filt().filter((a) => onSchedule(a) && !FINAL_ASSET.includes(a.status)), cols);
    });
    return page(backOffice() ? 'Asset register' : 'My equipment', backOffice() ? 'QMS-05-REG-02. Every item, who has it, who paid, who owns and who insures it.' : 'The items signed out to you. Something wrong? <a href="#/report-problem">Report a problem</a>.',
      (backOffice() ? `<section class="card" id="regFilter"><div class="row">${inp('q', '', { placeholder: 'Search', 'aria-label': 'Search' })}${sel('category', L.CATEGORIES, '', 'All categories')}${sel('status', L.ASSET_STATUS, '', 'All statuses')}${sel('funding', L.FUNDING, '', 'All funding')}${sel('insurance', L.INSURANCE, '', 'All insurance')}</div></section>` : '') +
      `<section class="card"><div class="tblwrap"><table><thead><tr><th>Asset no.</th><th>Item</th><th>With</th><th>Funding / owner</th><th>Insurance</th><th>Book value</th><th>Status</th></tr></thead><tbody id="regBody">${draw(base)}</tbody></table></div></section>`,
      (backOffice() ? '<button class="btn sec sm" id="csvReg">Export to Excel (CSV)</button><button class="btn sec sm" id="csvBroker">Insurance schedule for broker</button>' : '') + (has('factotum', 'asset_coordinator') ? '<a class="btn sm" href="#/asset/new" style="text-decoration:none;display:inline-flex;align-items:center">Add item</a>' : ''));
  }

  async function pAsset(id) {
    const isNew = id === 'new';
    const a = isNew ? { category: 'Laptop', status: 'In store', condition: 'Good', funding_source: 'Angels', owner: 'Angels', insurance_status: 'Angels insures', location: 'Angels storage' } : await db.get('am_assets', id);
    if (!a) return page('Asset', '', '<div class="card">Not found, or you do not have access to it.</div>');
    const hist = isNew ? [] : await db.list('am_custody', { eq: { asset_id: id }, order: 'at', desc: true });
    const edit = has('factotum', 'asset_coordinator') || (has('hof') && !isNew);
    const dis = { disabled: !edit };
    const store = isStoreItem(a);
    const years = settings.depreciation_years || 3;
    if (isNew) after(() => { const c = $('#assetForm select[name=category]'); c.onchange = () => { $$('.storeOnly').forEach((x) => (x.style.display = ['Training box', 'Marketing material'].includes(c.value) ? '' : 'none')); }; c.onchange(); });
    return page(isNew ? 'Add item to the register' : `${a.asset_no} · ${a.category}`, isNew ? 'The asset number is created when you save.' : esc(`${a.description || ''} ${a.make_model ? '· ' + a.make_model : ''}`),
      `<div class="cols"><div><section class="card" id="assetForm"><div class="grid">
        ${F('Category', sel('category', L.CATEGORIES, a.category, undefined, { disabled: !isNew }))}
        <div class="storeOnly" ${store || isNew ? '' : 'style="display:none"'}>${F('Short code', inp('short_code', a.short_code, { disabled: !isNew }), 'TB, FB, PB, GZ, SK')}</div>
        ${a.category === 'Laptop' || isNew ? F('Tier', sel('laptop_tier', L.TIERS.map((t) => t[0]), a.laptop_tier, '—', dis)) : ''}
        ${F('Description', inp('description', a.description, dis))}${F('Make and model', inp('make_model', a.make_model, dis))}${F('Serial no.', inp('serial_no', a.serial_no, dis))}
        ${F('Accessories', inp('accessories', a.accessories, dis))}${F('Supplier', inp('supplier', a.supplier, dis))}${F('Invoice no.', inp('invoice_no', a.invoice_no, dis))}
        ${F('Purchase date', inp('purchase_date', a.purchase_date, Object.assign({ type: 'date' }, dis)))}${F('Cost excl. VAT (R)', inp('cost_excl_vat', a.cost_excl_vat, Object.assign({ type: 'number' }, dis)))}${F('Warranty ends', inp('warranty_ends', a.warranty_ends, Object.assign({ type: 'date' }, dis)))}
        ${F('Funding', sel('funding_source', L.FUNDING, a.funding_source, undefined, dis))}${F('Client project code', inp('project_code', a.project_code, dis))}${F('Owner', sel('owner', ['Angels', 'Client', 'Beneficiary'], a.owner, undefined, dis))}
        ${F('Insurance', sel('insurance_status', L.INSURANCE, a.insurance_status, undefined, dis))}${F('With person', personSel('custodian_id', a.custodian_id, '— (in storage)', dis))}${F('Location', inp('location', a.location, dis))}
        ${F('Status', sel('status', L.ASSET_STATUS, a.status, undefined, dis))}${F('Condition', sel('condition', L.CONDITIONS, a.condition, undefined, dis))}
        <div class="storeOnly" ${store || isNew ? '' : 'style="display:none"'}>${F('Client restriction', inp('client_restriction', a.client_restriction, dis), 'e.g. Scatec: only for that client')}</div>
        <div class="storeOnly" ${store || isNew ? '' : 'style="display:none"'}>${F('Storage location', inp('storage_location', a.storage_location, dis))}</div></div>
        ${edit ? `<div class="row" style="margin-top:12px">${btn('assetSave', isNew ? 'Add to register' : 'Save changes')}</div>` : ''}</section></div>
      ${isNew ? '' : `<div>
        <section class="card"><h2>Values</h2>${kv([['Book value', `${rand(bookValue(a, years))} <span class="note">(straight-line, ${years} years)</span>`], ['On broker schedule', onSchedule(a) ? 'Yes' : 'No'], ['Warranty', a.warranty_ends ? (a.warranty_ends < today() ? 'Expired ' : 'Until ') + fmtDate(a.warranty_ends) : '—'], ['Age', a.purchase_date ? ageYears(a.purchase_date).toFixed(1) + ' years' : '—']])}
          ${Array.isArray(a.box_contents) && a.box_contents.length ? `<h3 style="margin-top:12px">Contents</h3><ul style="font-size:13px">${a.box_contents.map((c) => `<li>${esc(c.qty)} × ${esc(c.item)}</li>`).join('')}</ul>` : ''}</section>
        <section class="card">${filesBlock('asset', a.id, ['Photo front', 'Serial label', 'Accessories', 'Marks', 'Invoice', 'Wipe certificate'], backOffice())}</section>
        <section class="card"><h2>History</h2>${hist.map((h) => `<div class="list-row"><strong>${esc(h.event)}</strong> · ${fmtDateTime(h.at)} · ${esc(nameOf(h.by_user))}<div class="note">${esc(h.detail)}</div></div>`).join('') || '<p class="note">No history yet.</p>'}</section>
        ${auditBlock('am_assets', a.id)}</div>`}</div>`, isNew ? '' : pill(a.status)) +
      act('assetSave', async () => {
        const v = vals('#assetForm'); const row = {};
        Object.keys(v).forEach((k) => { row[k] = v[k] === '' ? null : v[k]; });
        if (row.cost_excl_vat != null) row.cost_excl_vat = Number(row.cost_excl_vat);
        if (!isNew) { delete row.category; delete row.short_code; }
        const cat = isNew ? row.category : a.category;
        if (['Laptop', 'Monitor', 'Printer'].includes(cat) && !row.serial_no) throw new Error('IT items need a serial number (R-12).');
        if (row.funding_source !== 'Angels' && row.funding_source !== 'Donated' && row.insurance_status === 'Angels insures' && !has('hof')) throw new Error('Angels cover for a client-funded item needs Head of Finance approval and a client contribution (R-14).');
        if (isNew) { const n = await db.insert('am_assets', row); await db.insert('am_custody', { asset_id: n.id, event: 'Registered', detail: 'Added to the register' }); return '#/asset/' + n.id; }
        await db.update('am_assets', id, row);
      }, 'Saved');
  }

  // =====================================================================
  // 6 · Report a problem   7 · Incidents
  // =====================================================================
  async function pReportProblem() {
    const mine = await db.list('am_assets', { eq: { custodian_id: me.id } });
    after(() => { const t = $('#rpForm select[name=type]'); const f = () => { const v = t.value; $('#rpStolen').style.display = v === 'Stolen' ? '' : 'none'; $('#rpLost').style.display = ['Lost', 'Stolen'].includes(v) ? '' : 'none'; }; t.onchange = f; f(); });
    return page('Report a problem', 'Report loss, theft or damage within 24 hours. Software or sign-in problems go to the PCZEN portal instead.',
      `<div class="cols"><div><section class="card" id="rpForm"><div class="grid">
        ${F('Which item', sel('asset_id', mine.map((a) => [a.id, a.asset_no + ' · ' + a.category]), '', 'Choose'))}${F('What happened', sel('type', L.INCIDENT_TYPES, 'Damaged'))}
        ${F('When', inp('occurred_at', '', { type: 'datetime-local' }))}${F('Where', inp('place', '', { placeholder: 'e.g. in a vehicle at a venue' }))}
        ${F('Was it locked away, out of sight?', sel('locked_away', ['Yes', 'No', 'Not applicable'], 'Yes'))}
        ${F('Was Angels or personal information on it?', sel('info_at_risk', ['No', 'Yes', 'Not sure'], 'No'))}</div>
        <div class="grid" id="rpStolen" style="margin-top:14px">${F('Police case number', inp('police_case_no', ''))}${F('Police station', inp('police_station', ''))}</div>
        <div style="margin-top:14px">${F('What happened (details)', area('description', ''))}</div>
        ${chk('loan_needed', 'I need a loan laptop to keep working', false)}
        <div id="rpLost">${banner('b-err', 'PCZEN will be asked at once to lock and wipe the device and reset your access.')}</div>
        <div class="row" style="margin-top:10px">${btn('rpGo', 'Report now')}</div><p class="note">Add photos on the next screen.</p></section></div>
      <div><section class="card"><h2>Who is told</h2><ul style="font-size:13px"><li>Anton (Factotum)</li><li>Annemarie (Asset Coordinator)</li><li>Your line manager</li><li>PCZEN, for lost or stolen devices</li><li>The Information Officer, if information may be at risk</li></ul></section></div></div>`) +
      act('rpGo', async () => {
        const f = vals('#rpForm');
        if (!f.occurred_at) throw new Error('Say when it happened.');
        if (f.type === 'Stolen' && !f.police_case_no) throw new Error('Report the theft to the police first and add the case number.');
        const i = await db.insert('am_incidents', Object.assign({}, f, { asset_id: f.asset_id || null, occurred_at: new Date(f.occurred_at).toISOString(), reported_by: me.id, status: 'Reported', police_case_no: f.police_case_no || null, police_station: f.police_station || null }));
        const asset = mine.find((a) => a.id === f.asset_id);
        const what = `${f.type}: ${(asset && asset.asset_no) || 'item'} · ${me.full_name}`;
        await notify(withRole('factotum').concat(withRole('asset_coordinator'), [me.manager_id]), `${i.ref} reported`, what + (f.loan_needed ? ' · loan laptop needed' : ''), '#/incident/' + i.id);
        if (['Lost', 'Stolen'].includes(f.type)) await notify(withRole('asset_coordinator'), `URGENT: ask PCZEN to lock and wipe ${(asset && asset.asset_no) || ''}`, `Serial ${(asset && asset.serial_no) || '—'}. Open the incident and press Email PCZEN.`, '#/incident/' + i.id);
        if (f.info_at_risk !== 'No') await notify(withRole('info_officer'), `${i.ref}: personal information may be at risk`, what, '#/incident/' + i.id);
        return '#/incident/' + i.id;
      }, 'Reported');
  }

  async function pIncidents() {
    const rows = await db.list('am_incidents', { order: 'created_at', desc: true });
    return page('Incidents', 'Loss, theft and damage (FRM-04).',
      `<section class="card"><div class="tblwrap"><table><thead><tr><th>Ref</th><th>Type</th><th>Reported by</th><th>When</th><th>Status</th></tr></thead><tbody>
      ${rows.map((i) => `<tr><td class="m">${link('#/incident/' + i.id, i.ref)}${i.late_report ? '<div class="note" style="color:var(--bad)">reported late</div>' : ''}</td><td>${pill(i.type)}</td><td>${esc(nameOf(i.reported_by))}</td><td>${fmtDate(i.occurred_at)}</td><td>${pill(i.status)}</td></tr>`).join('') || empty('No incidents.', 5)}
      </tbody></table></div></section>`, '<a class="btn" href="#/report-problem" style="text-decoration:none">Report a problem</a>');
  }

  async function pIncident(id) {
    const i = await db.get('am_incidents', id); if (!i) return page('Incident', '', '<div class="card">Not found, or you do not have access to it.</div>');
    const asset = i.asset_id ? await db.get('am_assets', i.asset_id) : null;
    const lost = ['Lost', 'Stolen'].includes(i.type);
    const mail = `mailto:${encodeURIComponent(C.PCZEN_EMAIL || '')}?subject=${encodeURIComponent(`URGENT lock and wipe: ${(asset && asset.asset_no) || ''} (${i.ref})`)}&body=${encodeURIComponent(`Please lock and wipe this device and reset access now.\nAsset: ${asset && asset.asset_no}\nSerial: ${asset && asset.serial_no}\nUser: ${nameOf(i.reported_by)}\nIncident: ${i.ref} (${i.type})`)}`;
    const tick = (ok) => (ok ? '✓' : '✗');
    let mgmt = '';
    if (backOffice()) {
      mgmt = `<section class="card" id="incForm"><h2>Assessment and claim</h2><div class="grid">
        ${F('PCZEN lock ticket', inp('pczen_lock_ticket', i.pczen_lock_ticket))}${F('Assessment', sel('assessment', ['Repair', 'Replace', 'Write off and replace', 'No action'], i.assessment, 'Choose'))}
        ${F('Claim goes to', sel('insurer_route', ['Broker (Angels-insured)', 'Client (client-insured)', 'None'], i.insurer_route, 'Choose'))}${F('Claim number', inp('claim_no', i.claim_no))}
        ${F('Claim outcome', inp('claim_outcome', i.claim_outcome))}${F('Payout (R)', inp('payout', i.payout, { type: 'number' }))}
        ${F('Status', sel('status', ['Reported', 'Device locked', 'Assessed', 'Claim open', 'Claim closed', 'Write-off approved', 'Closed'], i.status))}</div>
        <div style="margin-top:12px">${F('Liability review (management)', area('liability_review', i.liability_review))}</div>
        <div class="row" style="margin-top:10px">${btn('incSave', 'Save')}
          ${!i.replacement_request_id && i.asset_id ? btn('incRepl', 'Create linked replacement request', 'sec') : ''}
          ${i.replacement_request_id ? `<a class="btn sec" style="text-decoration:none" href="#/request/${i.replacement_request_id}">Open replacement request</a>` : ''}
          ${has('hof') && !i.write_off_approved_by && i.assessment === 'Write off and replace' ? btn('incWo', 'Approve write-off (HOF)', 'sec') : ''}</div>
        ${i.write_off_approved_by ? banner('b-ok', 'Write-off approved by ' + esc(nameOf(i.write_off_approved_by))) : ''}
        <h3 style="margin-top:16px">Claim pack</h3><ul style="font-size:13px">
          <li>${tick(i.police_case_no || i.type !== 'Stolen')} Police case number (theft)</li><li>${tick(asset && asset.invoice_no)} Purchase invoice on the asset record</li>
          <li>✓ Incident report ${esc(i.ref)}</li><li>${tick(i.pczen_lock_ticket || !lost)} PCZEN lock confirmation</li><li>See photos and the signed handover form on the asset record</li></ul></section>` +
        act('incSave', async () => { const v = vals('#incForm'); v.payout = v.payout ? Number(v.payout) : null; ['assessment', 'insurer_route'].forEach((k) => { if (!v[k]) v[k] = null; }); await db.update('am_incidents', id, v); }, 'Saved') +
        act('incRepl', async () => {
          const rep = person(i.reported_by) || {};
          const r = await db.insert('am_requests', { request_type: 'Replacement', requested_by: me.id, for_user: i.reported_by, department: rep.department, line_manager_id: rep.manager_id || me.id, category: (asset && asset.category) || 'Laptop', laptop_tier: asset && asset.laptop_tier, replaces_asset: i.asset_id, replacement_reason: i.type === 'Not working' ? 'Other' : i.type, incident_id: i.id, business_reason: `Replacement after ${i.ref} (${i.type})`, date_needed: dayIso(7), funding_source: !asset || ['Angels', 'Donated'].includes(asset.funding_source) ? 'Angels' : asset.funding_source, project_code: (asset && asset.project_code) || null, budget_line: asset && !['Angels', 'Donated'].includes(asset.funding_source) ? 'Equipment' : null, delivery_route: L.DELIVERY[0], status: 'Awaiting line manager' });
          await db.insert('am_approvals', { subject_type: 'request', subject_id: r.id, step: 'Line manager', approver_id: r.line_manager_id, decision: 'Pending', due_at: addWorkingDays(new Date(), settings.approval_days || 2) });
          await db.update('am_incidents', id, { replacement_request_id: r.id, status: 'Assessed' });
          await notify([r.line_manager_id], `${r.ref} waits for your approval`, `Replacement after ${i.ref}`, '#/request/' + r.id);
          return '#/request/' + r.id;
        }, 'Replacement request created') +
        act('incWo', async () => { await db.update('am_incidents', id, { write_off_approved_by: me.id, status: 'Write-off approved' }); if (asset) await db.update('am_assets', asset.id, { condition: 'Written off', status: 'Disposed', insurance_status: 'Not insured' }); }, 'Write-off approved');
    }
    return page(`${i.ref} · ${i.type}`, esc(`${nameOf(i.reported_by)} · ${fmtDateTime(i.occurred_at)} · ${i.place || ''}`),
      `<div class="cols"><div><section class="card">${kv([['Item', asset ? link('#/asset/' + asset.id, asset.asset_no) + (asset.serial_no ? ' · ' + esc(asset.serial_no) : '') : '—'], ['Locked away', esc(i.locked_away)], ['Details', esc(i.description)], i.police_case_no && ['Police case', esc(i.police_case_no + ' · ' + (i.police_station || ''))], ['Information at risk', esc(i.info_at_risk)], ['Loan laptop needed', i.loan_needed ? 'Yes' : 'No'], ['Insurance', esc((asset && asset.insurance_status) || '—')]])}
        ${lost && backOffice() ? `<div style="margin-top:12px">${banner('b-err', `Lost or stolen: PCZEN must lock and wipe the device now. <a class="btn sm" style="text-decoration:none;margin-left:8px" href="${mail}">Email PCZEN</a>`)}</div>` : ''}</section>${mgmt}</div>
      <div><section class="card">${filesBlock('incident', i.id, ['Photo', 'Police report', 'Quote for repair', 'Other'], i.reported_by === me.id || backOffice())}</section>${auditBlock('am_incidents', i.id)}</div></div>`,
      pill(i.status) + (i.late_report ? pill('Reported late') : ''));
  }

  // =====================================================================
  // 10 · Training and marketing store
  // =====================================================================
  const ACTIVE_BK = (b) => !['Cancelled', 'Returned', 'Returned with issues'].includes(b.status);
  async function pStore() {
    const [assets, bookings] = await Promise.all([db.list('am_assets', { order: 'asset_no' }), db.list('am_bookings', { order: 'out_date' })]);
    const items = assets.filter(isStoreItem);
    const days = Array.from({ length: 14 }, (_, i) => dayIso(i));
    const active = bookings.filter(ACTIVE_BK);
    const at = (a, day) => active.find((b) => (b.asset_ids || []).includes(a.id) && b.out_date <= day && day <= b.back_date);
    const canBook = backOffice() || has('dept_contact');
    return page('Training and marketing store', 'Booked out for training or marketing only. Department asset contacts ask; Anton books and issues.',
      `<section class="card"><h2>Availability · next 14 days</h2><div class="cal" style="grid-template-columns:220px repeat(14,minmax(46px,1fr))">
        <div class="h">Item</div>${days.map((x) => `<div class="h">${new Date(x + 'T00:00:00').toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric' })}</div>`).join('')}
        ${items.map((a) => `<div><strong class="m">${esc(a.asset_no)}</strong><div class="note">${esc(a.description)}${a.client_restriction ? ' · ' + esc(a.client_restriction) + ' only' : ''}</div></div>` + days.map((x) => { const b = at(a, x); return b ? `<div class="${b.status === 'Requested' ? 'r' : 'b'}" title="${esc(b.ref + ' · ' + b.programme)}" onclick="location.hash='#/booking/${b.id}'">${esc(b.ref.slice(-3))}</div>` : '<div></div>'; }).join('')).join('')}
      </div><p class="note">Green: booked. Amber: requested, waiting for Anton.</p></section>
      <section class="card"><h2>Bookings</h2><div class="tblwrap"><table><thead><tr><th>Booking</th><th>Programme / purpose</th><th>Items</th><th>Out</th><th>Back</th><th>Asked by</th><th>Status</th></tr></thead><tbody>
        ${bookings.slice().reverse().map((b) => `<tr><td class="m">${link('#/booking/' + b.id, b.ref)}</td><td>${esc(b.programme)} · ${esc(b.purpose)}</td><td class="m">${esc((b.asset_ids || []).map((x) => (items.find((a) => a.id === x) || {}).asset_no).join(', '))}</td><td>${fmtDate(b.out_date)}</td><td>${fmtDate(b.back_date)}</td><td>${esc(nameOf(b.asked_by))}</td><td>${pill(b.status)}</td></tr>`).join('') || empty('No bookings yet.', 7)}
      </tbody></table></div></section>
      <section class="card"><h2>Items</h2><div class="grid">${items.map((a) => `<a class="card tile" href="#/asset/${a.id}"><div class="l m">${esc(a.asset_no)}</div><div style="font-weight:700;margin:4px 0">${esc(a.description)}</div>${Array.isArray(a.box_contents) && a.box_contents.length ? `<div class="s">${esc(a.box_contents.map((c) => c.qty + ' ' + c.item).join(' · '))}</div>` : ''}<div style="margin-top:6px">${pill(a.status)}</div></a>`).join('')}</div></section>`,
      canBook ? `<a class="btn" href="#/new-booking" style="text-decoration:none">${has('factotum') ? 'Book items' : 'Ask Anton to book items'}</a>` : '');
  }

  async function pNewBooking() {
    const items = (await db.list('am_assets', { order: 'asset_no' })).filter(isStoreItem);
    const anton = has('factotum');
    return page(anton ? 'Book store items' : 'Ask Anton to book store items', 'FRM-07 part A. Training or marketing use only.',
      `<section class="card" id="bkForm"><div class="grid">
        ${F('Purpose', sel('purpose', ['Training', 'Marketing'], 'Training'))}${F('Programme or event', inp('programme', '', { placeholder: 'e.g. Seriti Green · market day' }))}${F('Venue and town', inp('venue_town', ''))}
        ${F('Date out', inp('out_date', '', { type: 'date' }))}${F('Date back', inp('back_date', '', { type: 'date' }))}${F('Who collects', inp('collector', ''))}${F('Transport', sel('transport', ['Collected from Angels', 'Courier to venue'], 'Collected from Angels'))}</div>
        <h3 style="margin-top:14px">Items</h3>${items.map((a) => chk('a_' + a.id, `<span class="m">${esc(a.asset_no)}</span> · ${esc(a.description)}${a.client_restriction ? ` <span class="note">· ${esc(a.client_restriction)} programmes only</span>` : ''}`, false)).join('')}
        <div class="row" style="margin-top:10px">${btn('bkGo', anton ? 'Book' : 'Send to Anton')}</div></section>`) +
      act('bkGo', async () => {
        const f = vals('#bkForm'); const ids = Object.keys(f).filter((k) => k.startsWith('a_') && f[k]).map((k) => k.slice(2));
        if (!ids.length) throw new Error('Choose at least one item.');
        if (!f.programme || !f.out_date || !f.back_date) throw new Error('Give the programme or event and both dates.');
        if (f.back_date < f.out_date) throw new Error('The date back is before the date out.');
        const b = await db.insert('am_bookings', { purpose: f.purpose, programme: f.programme, venue_town: f.venue_town, out_date: f.out_date, back_date: f.back_date, collector: f.collector, transport: f.transport, asset_ids: ids, asked_by: me.id, booked_by: anton ? me.id : null, status: anton ? 'Confirmed' : 'Requested', checkout: {}, checkin: {} });
        if (!anton) await notify(withRole('factotum'), `${b.ref}: store items requested`, `${f.programme} · ${f.out_date} to ${f.back_date}`, '#/booking/' + b.id);
        return '#/booking/' + b.id;
      }, 'Booking saved');
  }

  async function pBooking(id) {
    const b = await db.get('am_bookings', id); if (!b) return page('Booking', '', '<div class="card">Not found.</div>');
    const items = (await db.list('am_assets')).filter((a) => (b.asset_ids || []).includes(a.id));
    const anton = has('factotum', 'asset_coordinator');
    const lines = [];
    items.forEach((a) => { if (Array.isArray(a.box_contents) && a.box_contents.length) a.box_contents.forEach((c, i) => lines.push({ key: 'l' + lines.length, label: `${a.asset_no}: ${c.qty} × ${c.item}` })); else lines.push({ key: 'l' + lines.length, label: `${a.asset_no}: ${a.description}` }); });
    let body = `<h2>Items</h2><ul style="font-size:13px">${items.map((a) => `<li>${link('#/asset/' + a.id, a.asset_no)} · ${esc(a.description)}</li>`).join('')}</ul>`;
    if (b.status === 'Requested' && anton) body += `<div class="row">${btn('bkOk', 'Confirm booking')}${btn('bkCancel', 'Cancel', 'bad')}</div>` +
      act('bkOk', async () => { await db.update('am_bookings', id, { status: 'Confirmed', booked_by: me.id }); await notify([b.asked_by], `${b.ref} confirmed`, '', '#/booking/' + id); }, 'Confirmed') +
      act('bkCancel', () => db.update('am_bookings', id, { status: 'Cancelled' }), 'Cancelled');
    if (b.status === 'Confirmed' && anton) body += `<h3>Check-out (FRM-07 part B)</h3>${lines.map((l) => chk(l.key, esc(l.label), false)).join('')}
      <div class="grid" style="margin-top:10px">${F('Collector signs (full name)', inp('collector_sign', ''))}${F('Notes (restock needed?)', inp('notes', ''))}</div><div class="row" style="margin-top:8px">${btn('bkOut', 'Check out')}</div>` +
      act('bkOut', async () => {
        const f = vals('#bkCard');
        if (!f.collector_sign) throw new Error('The collector signs by typing their full name.');
        if (!lines.every((l) => f[l.key])) throw new Error('Tick every item and content line out.');
        await db.update('am_bookings', id, { status: 'Checked out', checkout: { signed_by: f.collector_sign, at: nowIso(), notes: f.notes } });
        for (const a of items) { await db.update('am_assets', a.id, { status: 'Booked out' }); await db.insert('am_custody', { asset_id: a.id, event: 'Booked out', detail: `${b.ref} · ${f.collector_sign}` }); }
      }, 'Checked out');
    if (b.status === 'Checked out' && anton) body += `<h3>Return check (FRM-07 part C)</h3><p class="note">Checked out to ${esc(b.checkout && b.checkout.signed_by)} · ${fmtDateTime(b.checkout && b.checkout.at)}</p>${lines.map((l) => chk(l.key, esc(l.label) + ' back, in good condition', false)).join('')}
      <div style="margin-top:10px">${F('Notes', inp('notes', ''))}</div><div class="row" style="margin-top:8px">${btn('bkIn', 'Check in (anything unticked opens an incident)')}</div>` +
      act('bkIn', async () => {
        const f = vals('#bkCard'); const missing = lines.filter((l) => !f[l.key]).map((l) => l.label);
        await db.update('am_bookings', id, { status: missing.length ? 'Returned with issues' : 'Returned', checkin: { by: me.id, at: nowIso(), missing, notes: f.notes } });
        for (const a of items) { await db.update('am_assets', a.id, { status: 'In store' }); await db.insert('am_custody', { asset_id: a.id, event: 'Checked in', detail: b.ref }); }
        if (missing.length) {
          const inc = await db.insert('am_incidents', { type: 'Damaged', occurred_at: nowIso(), reported_by: me.id, description: `Store return ${b.ref}: missing or damaged ${missing.join('; ')}. ${f.notes || ''}`, asset_id: items[0] && items[0].id, booking_id: b.id, status: 'Reported' });
          await notify(withRole('asset_coordinator').concat([b.asked_by]), `${b.ref} returned with issues`, `Incident ${inc.ref} opened`, '#/incident/' + inc.id);
        }
      }, 'Checked in');
    if (b.checkin && b.checkin.at) body += banner(b.checkin.missing && b.checkin.missing.length ? 'b-err' : 'b-ok', `Checked in ${fmtDateTime(b.checkin.at)}${b.checkin.missing && b.checkin.missing.length ? ' · missing or damaged: ' + esc(b.checkin.missing.join('; ')) : ''}`);
    return page(`${b.ref} · ${b.programme}`, esc(`${b.purpose} · ${b.venue_town || ''} · out ${fmtDate(b.out_date)}, back ${fmtDate(b.back_date)} · asked by ${nameOf(b.asked_by)}`),
      `<div class="cols"><div><section class="card" id="bkCard">${body}</section></div><div><section class="card">${filesBlock('booking', b.id, ['Photo at check-out', 'Photo on return'], anton)}</section></div></div>`, pill(b.status));
  }

  // =====================================================================
  // 9 · Deliveries and collections
  // =====================================================================
  async function pDeliveries() {
    const rows = await db.list('am_log', { order: 'expected_date' });
    const edit = has('factotum', 'asset_coordinator'); const t = today();
    const done = ['Received', 'Collected', 'Delivered', 'Cancelled'];
    const live = rows.filter((r) => !done.includes(r.status));
    const late = live.filter((r) => r.expected_date && r.expected_date < t);
    after(() => {
      const add = $('#logAddBtn'); if (add) add.onclick = () => { const f = $('#logAdd'); f.style.display = f.style.display === 'none' ? '' : 'none'; };
      $$('tr.logrow').forEach((tr) => tr.onclick = () => { const x = document.getElementById('d_' + tr.dataset.id); x.style.display = x.style.display === 'none' ? '' : 'none'; });
      $$('button[data-log]').forEach((b) => bindAct(b, () => db.update('am_log', b.dataset.log, { status: b.dataset.st, completed_at: ['Received', 'Collected', 'Delivered'].includes(b.dataset.st) ? nowIso() : null }), 'Updated'));
    });
    return page('Deliveries and collections', 'Supplier deliveries, ZipPrint jobs, courier collections and dispatches. Anton keeps this log.',
      (edit ? `<section class="card" id="logAdd" style="display:none"><div class="grid">
        ${F('Type', sel('type', L.LOG_TYPES, 'Collection by Angels'))}${F('Company', inp('company', '', { placeholder: 'e.g. ZipPrint' }))}${F('Reference / waybill / job no.', inp('tracking', ''))}
        ${F('What it is for', inp('linked_to', '', { placeholder: 'Request, booking or PR Briefing job' }))}${F('Expected date', inp('expected_date', '', { type: 'date' }))}${F('Who receives or collects', inp('handled_by', 'Anton'))}</div>
        <div class="row" style="margin-top:10px">${btn('logGo', 'Add to log')}</div></section>` + act('logGo', async () => { const f = vals('#logAdd'); if (!f.company) throw new Error('Give the company.'); await db.insert('am_log', Object.assign(f, { status: 'Expected', expected_date: f.expected_date || null })); }, 'Added') : '') +
      `<div class="grid4">${[[live.filter((r) => r.expected_date === t).length, 'Due today'], [live.filter((r) => r.status === 'Ready to collect').length, 'Ready to collect'], [live.filter((r) => r.type === 'Dispatch out').length, 'Going out'], [late.length, 'Late: needs attention']].map(([v, l], i) => `<div class="card tile mini" ${i === 3 && v ? 'style="border-color:#E8A39C"' : ''}><div class="l">${l}</div><div class="v">${v}</div></div>`).join('')}</div>
      <section class="card"><div class="tblwrap"><table><thead><tr><th>Ref</th><th>Type</th><th>Company</th><th>Reference</th><th>For</th><th>Expected</th><th>Who</th><th>Status</th></tr></thead><tbody>
      ${rows.map((r) => `<tr class="click logrow" data-id="${r.id}"><td class="m">${esc(r.ref)}</td><td>${esc(r.type)}</td><td>${esc(r.company)}</td><td>${esc(r.tracking)}</td><td>${esc(r.linked_to)}</td><td>${fmtDate(r.expected_date)}${r.expected_date && r.expected_date < t && live.includes(r) ? `<div class="note" style="color:var(--bad)">${workingDays(r.expected_date, t)} working days late</div>` : ''}</td><td>${esc(r.handled_by)}</td><td>${pill(r.status)}</td></tr>
        <tr id="d_${r.id}" style="display:none"><td colspan="8" style="background:#F7FAF9">${edit ? `<div class="row" style="margin-bottom:10px">${L.LOG_STATUS.map((s) => `<button type="button" class="btn sec sm" data-log="${r.id}" data-st="${esc(s)}" ${r.status === s ? 'disabled' : ''}>${esc(s)}</button>`).join('')}</div>` : ''}${filesBlock('log', r.id, ['Delivery note', 'Waybill'], edit, 'Proof: delivery note or waybill')}</td></tr>`).join('') || empty('Nothing logged.', 8)}
      </tbody></table></div></section>`, edit ? '<button class="btn" id="logAddBtn">Log a delivery or collection</button>' : '');
  }

  // =====================================================================
  // 11 · Donations and transfers
  // =====================================================================
  async function pDonations() {
    const [ins, outs, assets] = await Promise.all([db.list('am_donations_in', { order: 'created_at', desc: true }), db.list('am_disposals', { order: 'created_at', desc: true }), db.list('am_assets', { order: 'asset_no' })]);
    const years = settings.depreciation_years || 3;
    const available = assets.filter((a) => !FINAL_ASSET.includes(a.status));
    after(() => { $('#dinBtn').onclick = () => { const x = $('#dinForm'); x.style.display = x.style.display === 'none' ? '' : 'none'; }; $('#doutBtn').onclick = () => { const x = $('#doutForm'); x.style.display = x.style.display === 'none' ? '' : 'none'; }; });
    return page('Donations and transfers', 'Donations received (FRM-05) and donations, transfers, returns to clients and disposals out (FRM-06).',
      `<section class="card" id="dinForm" style="display:none"><h2>Donation received</h2><div class="grid">${F('Donor', inp('donor', ''))}${F('Contact', inp('contact', ''))}${F('Donor conditions', inp('conditions', ''))}</div>
        <div style="margin-top:12px">${F('Items offered', area('items', ''), 'one per line')}</div><div class="row" style="margin-top:8px">${btn('dinGo', 'Log offer')}</div></section>
      <section class="card" id="doutForm" style="display:none"><h2>Donate or transfer out</h2><div class="grid">${F('Type', sel('type', L.DISPOSAL_TYPES, 'Donation'))}${F('Recipient', inp('recipient', ''))}${F('Linked programme', inp('programme', ''))}</div>
        <div style="margin-top:12px">${F('Reason', area('reason', ''))}</div><h3>Items</h3><div style="max-height:240px;overflow:auto">${available.map((a) => chk('a_' + a.id, `<span class="m">${esc(a.asset_no)}</span> · ${esc(a.category)} · ${esc(a.funding_source)} · book value ${rand(bookValue(a, years))}`, false)).join('')}</div>
        <div class="row" style="margin-top:8px">${btn('doutGo', 'Propose')}</div></section>
      <section class="card"><h2>Out</h2><div class="tblwrap"><table><thead><tr><th>Ref</th><th>Type</th><th>Recipient</th><th>Items</th><th>Proposed by</th><th>Status</th></tr></thead><tbody>
        ${outs.map((x) => `<tr><td class="m">${link('#/disposal/' + x.id, x.ref)}</td><td>${esc(x.type)}</td><td>${esc(x.recipient)}</td><td class="m">${esc((x.asset_ids || []).map((i) => (assets.find((a) => a.id === i) || {}).asset_no).join(', '))}</td><td>${esc(nameOf(x.proposed_by))}</td><td>${pill(x.status)}</td></tr>`).join('') || empty('None yet.', 6)}</tbody></table></div></section>
      <section class="card"><h2>In</h2><div class="tblwrap"><table><thead><tr><th>Ref</th><th>Donor</th><th>Items</th><th>Status</th></tr></thead><tbody>
        ${ins.map((x) => `<tr><td class="m">${link('#/donation-in/' + x.id, x.ref)}</td><td>${esc(x.donor)}</td><td>${(x.items || []).length}</td><td>${pill(x.status)}</td></tr>`).join('') || empty('None yet.', 4)}</tbody></table></div></section>`,
      '<button class="btn sec" id="dinBtn">Log a donation received</button><button class="btn" id="doutBtn">Donate or transfer out</button>') +
      act('dinGo', async () => {
        const f = vals('#dinForm'); if (!f.donor) throw new Error('Give the donor.');
        const x = await db.insert('am_donations_in', { donor: f.donor, contact: f.contact, conditions: f.conditions, items: f.items.split('\n').map((s) => s.trim()).filter(Boolean).map((s) => ({ description: s, category: 'Laptop', accepted: null, wiped: false, value: 0, asset_id: null })), status: 'Offered' });
        return '#/donation-in/' + x.id;
      }, 'Logged') +
      act('doutGo', async () => {
        const f = vals('#doutForm'); const ids = Object.keys(f).filter((k) => k.startsWith('a_') && f[k]).map((k) => k.slice(2));
        if (!ids.length) throw new Error('Choose the items.'); if (!f.recipient) throw new Error('Give the recipient.');
        const x = await db.insert('am_disposals', { type: f.type, recipient: f.recipient, programme: f.programme, reason: f.reason, asset_ids: ids, status: 'Proposed', proposed_by: me.id });
        return '#/disposal/' + x.id;
      }, 'Proposed');
  }

  async function pDonationIn(id) {
    const x = await db.get('am_donations_in', id); if (!x) return page('Donation', '', '<div class="card">Not found.</div>');
    const items = x.items || [];
    const save = async (list, extra) => { await db.update('am_donations_in', id, Object.assign({ items: list, status: list.every((it) => it.accepted !== null) && x.status === 'Offered' ? 'Items decided' : x.status }, extra || {})); };
    after(() => {
      $$('[data-acc]').forEach((b) => bindAct(b, () => save(items.map((it, j) => j === +b.dataset.i ? Object.assign({}, it, { accepted: b.dataset.acc === '1' }) : it)), 'Saved'));
      $$('[data-wipe]').forEach((c) => c.onchange = async () => { await save(items.map((it, j) => j === +c.dataset.wipe ? Object.assign({}, it, { wiped: c.checked }) : it)); route(); });
      $$('[data-cat]').forEach((c) => c.onchange = async () => { await save(items.map((it, j) => j === +c.dataset.cat ? Object.assign({}, it, { category: c.value }) : it)); });
      $$('[data-val]').forEach((c) => c.onchange = async () => { await save(items.map((it, j) => j === +c.dataset.val ? Object.assign({}, it, { value: Number(c.value) || 0 }) : it)); });
      $$('[data-reg]').forEach((b) => bindAct(b, async () => {
        const i = +b.dataset.reg; const it = items[i];
        if (!it.wiped) throw new Error('PCZEN must wipe and reinstall it first, with a certificate (R-26).');
        const a = await db.insert('am_assets', { category: it.category || 'Laptop', description: it.description, serial_no: it.serial_no || 'To add', funding_source: 'Donated', owner: 'Angels', insurance_status: 'Not insured', status: 'In store', condition: 'Good', donor: x.donor, value_estimate: Number(it.value) || null, location: 'Angels storage' });
        await db.insert('am_custody', { asset_id: a.id, event: 'Registered', detail: `Donation ${x.ref} from ${x.donor}` });
        const list = items.map((t, j) => j === i ? Object.assign({}, t, { asset_id: a.id }) : t);
        await db.update('am_donations_in', id, { items: list, status: list.filter((t) => t.accepted).every((t) => t.asset_id) ? 'Registered' : x.status });
      }, 'Registered'));
      const s = $('#s18a'); if (s) s.onchange = async () => { await db.update('am_donations_in', id, { s18a: s.value }); toast('Saved'); };
      const ty = $('#thanks'); if (ty) ty.onchange = async () => { await db.update('am_donations_in', id, { thank_you_sent: ty.checked, status: ty.checked ? 'Thanked' : x.status }); route(); };
    });
    return page(`${x.ref} · ${x.donor}`, esc(`${x.contact || ''} ${x.conditions ? '· conditions: ' + x.conditions : ''}`),
      `<div class="cols"><div><section class="card"><div class="tblwrap"><table><thead><tr><th>Item</th><th>Category</th><th>Decision</th><th>PCZEN wipe</th><th>Value (R)</th><th>Register</th></tr></thead><tbody>
      ${items.map((it, i) => `<tr><td>${esc(it.description)}</td><td>${sel('cat' + i, L.CATEGORIES, it.category, undefined, { 'data-cat': i })}</td>
        <td>${it.accepted === null ? `<div class="row"><button type="button" class="btn sm" data-acc="1" data-i="${i}">Accept</button><button type="button" class="btn sec sm" data-acc="0" data-i="${i}">Decline</button></div>` : it.accepted ? 'Accepted' : 'Declined (back to donor or e-waste)'}</td>
        <td>${it.accepted ? `<label class="check"><input type="checkbox" data-wipe="${i}" ${it.wiped ? 'checked' : ''}>Wiped, certificate on file</label>` : ''}</td>
        <td>${it.accepted ? `<input type="number" data-val="${i}" value="${esc(it.value)}" style="width:110px">` : ''}</td>
        <td>${it.accepted ? (it.asset_id ? link('#/asset/' + it.asset_id, 'Registered') : `<button type="button" class="btn sm" data-reg="${i}">Register</button>`) : ''}</td></tr>`).join('')}
      </tbody></table></div>
      <div class="grid" style="margin-top:14px">${F('Section 18A receipt (Finance)', sel('s18a', ['Not decided', 'Issued', 'Not applicable'], x.s18a || 'Not decided', undefined, { id: 's18a', disabled: !has('hof', 'bookkeeper') }))}
        <label class="check"><input type="checkbox" id="thanks" ${x.thank_you_sent ? 'checked' : ''} ${has('asset_coordinator') ? '' : 'disabled'}>Thank-you letter sent (Asset Coordinator)</label></div></section></div>
      <div><section class="card">${filesBlock('donation_in', x.id, ['Photo', 'Wipe certificate', 'Thank-you letter'], backOffice())}</section></div></div>`, pill(x.status));
  }

  async function pDisposal(id) {
    const x = await db.get('am_disposals', id); if (!x) return page('Donation or transfer', '', '<div class="card">Not found.</div>');
    const assets = (await db.list('am_assets')).filter((a) => (x.asset_ids || []).includes(a.id));
    const years = settings.depreciation_years || 3;
    const client = assets.some((a) => a.funding_source && !['Angels', 'Donated'].includes(a.funding_source));
    const closed = x.status === 'Closed';
    const row = (done, label, button) => `<div class="row list-row"><span style="width:22px">${done ? '✓' : '○'}</span><span style="flex:1">${label}</span>${!done && button ? button : ''}</div>`;
    const upd = (patch) => () => db.update('am_disposals', id, patch);
    return page(`${x.ref} · ${x.type}`, esc(`To ${x.recipient}${x.programme ? ' · ' + x.programme : ''} · proposed by ${nameOf(x.proposed_by)}`),
      `<div class="cols"><div><section class="card" id="dpCard"><h2>Items</h2><ul style="font-size:13px">${assets.map((a) => `<li>${link('#/asset/' + a.id, a.asset_no)} · ${esc(a.category)} · ${esc(a.funding_source)} · book value ${rand(bookValue(a, years))}</li>`).join('')}</ul>
        <h2 style="margin-top:16px">Before it leaves Angels</h2>
        ${row(x.fit_confirmed, 'Anton confirms it is fit to give away and not needed as a loan laptop', has('factotum') ? btn('dpFit', 'Confirm', 'sec sm') : '')}
        ${client ? row(x.client_consent, 'Client’s written consent on file (client-funded)', has('asset_coordinator') ? btn('dpConsent', 'Consent on file', 'sec sm') : '') : ''}
        ${row(!!x.approved_by, `Head of Finance approves the write-off${settings.ceo_limit ? ' (CEO above the limit)' : ''}`, has('hof', 'ceo') && x.proposed_by !== me.id ? btn('dpApprove', 'Approve', 'sec sm') : '')}
        ${row(x.wiped, 'PCZEN wipe certificate; removed from Angels Microsoft 365 and device management', has('factotum') ? btn('dpWiped', 'Wipe done', 'sec sm') : '')}
        ${!closed && has('factotum', 'asset_coordinator') ? `<div style="margin-top:12px">${F('Recipient signs the certificate (full name)', inp('recipient_sign', ''))}<div class="row" style="margin-top:8px">${btn('dpClose', 'Sign certificate and close')}</div></div>` : ''}
        ${closed ? banner('b-ok', `Certificate signed ${fmtDateTime(x.certificate_signed_at)}. Items are off the insurance schedule and their status is final.`) : ''}</section></div>
      <div><section class="card">${filesBlock('disposal', x.id, ['Photo', 'Wipe certificate', 'Client consent', 'E-waste certificate', 'Signed certificate'], backOffice())}</section></div></div>`, pill(x.status)) +
      act('dpFit', upd({ fit_confirmed: true }), 'Confirmed') + act('dpConsent', upd({ client_consent: true }), 'Saved') + act('dpApprove', upd({ approved_by: me.id, status: 'Approved' }), 'Approved') + act('dpWiped', upd({ wiped: true, status: 'Wiped' }), 'Saved') +
      act('dpClose', async () => {
        const sign = vals('#dpCard').recipient_sign;
        if (!x.fit_confirmed || !x.approved_by || !x.wiped || (client && !x.client_consent)) throw new Error('Every check above must be done first.');
        if (!sign) throw new Error('The recipient signs by typing their full name.');
        const status = x.type === 'Return to client' ? 'Returned to client' : x.type === 'E-waste' ? 'Disposed' : 'Donated out';
        for (const a of assets) { await db.update('am_assets', a.id, { status, insurance_status: 'Not insured', custodian_id: null, location: x.recipient }); await db.insert('am_custody', { asset_id: a.id, event: status, detail: `${x.ref} · ${x.recipient}` }); }
        await db.update('am_disposals', id, { certificate_signed_at: nowIso(), status: 'Closed', reason: (x.reason || '') + ' · Received by ' + sign });
        await notify(withRole('hof').concat(withRole('asset_coordinator')), `${x.ref} closed`, 'Record the write-off at book value.', '#/disposal/' + id);
      }, 'Closed');
  }

  // =====================================================================
  // 8 · Monthly report and KPI
  // =====================================================================
  async function pReports(arg) {
    const month = /^\d{4}-\d{2}$/.test(arg || '') ? arg : today().slice(0, 7);
    const [reqs, jobs, incs, books, logs] = await Promise.all(['am_requests', 'am_pczen_jobs', 'am_incidents', 'am_bookings', 'am_log'].map((t) => db.list(t)));
    const inMonth = (x) => x && String(x).slice(0, 7) === month;
    const onTime = (r) => r.handed_over_at.slice(0, 10) <= r.date_needed;
    const done = reqs.filter((r) => r.status === 'Handed over' && inMonth(r.handed_over_at));
    const ns = done.filter((r) => r.request_type === 'New starter');
    const kpi = done.length ? Math.round(100 * done.filter(onTime).length / done.length) : null;
    const avg = done.length ? (done.reduce((s, r) => s + workingDays(r.created_at, r.handed_over_at), 0) / done.length).toFixed(1) : '—';
    const turnaround = settings.pczen_turnaround_days || 5;
    const mJobs = jobs.filter((j) => inMonth(j.sent_at) || inMonth(j.returned_at));
    const jobDays = mJobs.map((j) => workingDays(j.sent_at, j.returned_at || today()));
    const incomplete = mJobs.filter((j) => j.returned_at && (j.items || []).some((i) => !i.returned));
    const mInc = incs.filter((i) => inMonth(i.created_at));
    const lateLogs = logs.filter((l) => l.expected_date && inMonth(l.expected_date) && l.completed_at && l.completed_at.slice(0, 10) > l.expected_date);
    const T = (v, l, warn) => `<div class="card tile mini" ${warn ? 'style="border-color:#E8A39C"' : ''}><div class="l">${esc(l)}</div><div class="v">${esc(v)}</div></div>`;
    after(() => {
      $('#month').onchange = (e) => { location.hash = '#/reports/' + e.target.value; };
      $('#repCsv').onclick = () => downloadCsv(`asset-report-${month}.csv`, done, [['Ref', 'ref'], ['Type', 'request_type'], ['Category', 'category'], ['Requested', (r) => fmtDate(r.created_at)], ['Needed by', 'date_needed'], ['Handed over', (r) => fmtDate(r.handed_over_at)], ['On time', (r) => onTime(r) ? 'Yes' : 'No'], ['Working days', (r) => workingDays(r.created_at, r.handed_over_at)], ['Late request', (r) => r.late_request ? 'Yes' : 'No']]);
      $('#repPrint').onclick = () => window.print();
    });
    return page('Monthly report and KPI', 'KPI: new-hire equipment and onboarding requests coordinated and processed within agreed timeframes.',
      `<div class="grid4">${T(kpi === null ? '—' : kpi + '%', `KPI: handed over by the date needed (${done.filter(onTime).length} of ${done.length})`, kpi !== null && kpi < 90)}${T(ns.length ? Math.round(100 * ns.filter(onTime).length / ns.length) + '%' : '—', `New starters on time (${ns.filter(onTime).length} of ${ns.length})`)}${T(avg, 'Average working days, request to handover')}${T(done.filter((r) => r.late_request).length, 'Late requests from HR')}</div>
      <div class="cols"><div><section class="card"><h2>PCZEN turnaround</h2><div class="grid4">${T(mJobs.length, 'Jobs this month')}${T(jobDays.length ? (jobDays.reduce((a, b) => a + b, 0) / jobDays.length).toFixed(1) : '—', `Average working days (agreed ${turnaround})`)}${T(jobDays.filter((x) => x > turnaround).length, 'Over the agreed turnaround', jobDays.some((x) => x > turnaround))}${T(incomplete.length, 'Returned incomplete', incomplete.length > 0)}</div>
        <div class="tblwrap" style="margin-top:12px"><table><thead><tr><th>Ticket</th><th>Sent</th><th>Back</th><th>Days</th><th>Outcome</th></tr></thead><tbody>${mJobs.map((j, i) => `<tr><td class="m">${esc(j.ticket)}</td><td>${fmtDate(j.sent_at)}</td><td>${fmtDate(j.returned_at)}</td><td>${jobDays[i]}</td><td>${esc(j.outcome || 'With PCZEN')}</td></tr>`).join('') || empty('No PCZEN jobs this month.', 5)}</tbody></table></div></section></div>
      <div><section class="card"><h2>Incidents</h2><table><tbody>${L.INCIDENT_TYPES.map((t) => `<tr><td>${t}</td><td>${mInc.filter((i) => i.type === t).length}</td></tr>`).join('')}<tr><td>Reported late</td><td>${mInc.filter((i) => i.late_report).length}</td></tr></tbody></table>
        <h2 style="margin-top:16px">Store and deliveries</h2><table><tbody><tr><td>Store bookings</td><td>${books.filter((b) => inMonth(b.out_date)).length}</td></tr><tr><td>Returned with issues</td><td>${books.filter((b) => inMonth(b.out_date) && b.status === 'Returned with issues').length}</td></tr><tr><td>Deliveries late</td><td>${lateLogs.length}</td></tr></tbody></table></section></div></div>`,
      `<input type="month" id="month" value="${month}" aria-label="Month"><button class="btn sec sm" id="repCsv">Export (CSV)</button><button class="btn sec sm" id="repPrint">Print / PDF</button>`);
  }

  // =====================================================================
  // Admin: people and roles, department asset contacts, settings
  // =====================================================================
  async function pAdmin(tab) {
    tab = ['people', 'contacts', 'settings'].includes(tab) ? tab : 'people';
    const canEdit = has('asset_coordinator');
    const save = async (table, id, patch) => { try { await db.update(table, id, patch); await loadMe(); toast('Saved'); } catch (err) { toast(err.message); } };
    const tabs = `<div class="row">${[['people', 'People and roles'], ['contacts', 'Department contacts'], ['settings', 'Settings']].map(([k, l]) => `<a class="btn ${tab === k ? '' : 'sec'} sm" style="text-decoration:none;display:inline-flex;align-items:center" href="#/admin/${k}">${l}</a>`).join('')}</div>`;
    let body = '';
    if (tab === 'people') {
      body = `<section class="card"><p class="note">People appear here after they sign in for the first time. Tick their roles; access follows the role.</p><div class="tblwrap"><table><thead><tr><th>Name</th><th>Department</th><th>Line manager</th><th>Roles</th></tr></thead><tbody>
        ${people.map((p) => `<tr data-p="${p.id}"><td>${inp('full_name', p.full_name, { disabled: !canEdit, 'aria-label': 'Name' })}<div class="note">${esc(p.email)}</div>${inp('job_title', p.job_title, { placeholder: 'Job title', disabled: !canEdit, 'aria-label': 'Job title' })}</td>
          <td>${sel('department', departments.map((d) => d.name), p.department, '—', { disabled: !canEdit })}</td><td>${personSel('manager_id', p.manager_id, '—', { disabled: !canEdit })}</td>
          <td style="min-width:380px">${ROLES.map(([k, l]) => `<label class="check" style="display:inline-flex;margin:2px 10px 2px 0"><input type="checkbox" data-role="${k}" ${(p.roles || []).includes(k) ? 'checked' : ''} ${canEdit ? '' : 'disabled'}>${esc(l)}</label>`).join('')}</td></tr>`).join('')}</tbody></table></div></section>`;
      after(() => $$('tr[data-p]').forEach((tr) => {
        const id = tr.dataset.p; const p = person(id);
        $$('[name]', tr).forEach((el) => el.onchange = () => save('profiles', id, { [el.name]: el.value || null }));
        $$('[data-role]', tr).forEach((c) => c.onchange = () => { const roles = $$('[data-role]', tr).filter((x) => x.checked).map((x) => x.dataset.role); save('profiles', id, { roles }); p.roles = roles; });
      }));
    }
    if (tab === 'contacts') {
      body = `<section class="card"><p class="note">One contact and a backup per department. They coordinate asset matters with Anton; they do not approve.</p><div class="tblwrap"><table><thead><tr><th>Department</th><th>Contact</th><th>Backup</th><th>Notes</th></tr></thead><tbody>
        ${departments.map((d) => `<tr data-d="${esc(d.name)}"><td><strong>${esc(d.name)}</strong></td><td>${personSel('contact_id', d.contact_id, '—', { disabled: !canEdit })}</td><td>${personSel('backup_id', d.backup_id, '—', { disabled: !canEdit })}</td><td class="note">${esc(d.notes)}</td></tr>`).join('')}</tbody></table></div></section>`;
      after(() => $$('tr[data-d]').forEach((tr) => $$('[name]', tr).forEach((el) => el.onchange = () => save('am_departments', tr.dataset.d, { [el.name]: el.value || null }))));
    }
    if (tab === 'settings') {
      const rows = await db.list('am_settings');
      body = `<section class="card"><div class="tblwrap"><table><thead><tr><th>Setting</th><th>Value</th><th>What it is</th></tr></thead><tbody>
        ${rows.map((s) => `<tr><td class="m">${esc(s.key)}</td><td><input data-key="${esc(s.key)}" value="${esc(s.value == null ? '' : s.value)}" ${canEdit ? '' : 'disabled'} aria-label="${esc(s.key)}"></td><td class="note">${esc(s.note)}</td></tr>`).join('')}</tbody></table></div><p class="note">Empty means not decided yet (for example the CEO limit).</p></section>`;
      after(() => $$('[data-key]').forEach((el) => el.onchange = () => { const v = el.value.trim(); save('am_settings', el.dataset.key, { value: v === '' ? null : isNaN(v) ? v : Number(v) }); }));
    }
    return page('Admin', 'People and roles, department asset contacts and settings. Only the Asset Coordinator changes these.', tabs + body);
  }

  async function pAudit() {
    const list = await db.list('am_audit', { order: 'at', desc: true, limit: 200 });
    return page('Audit log', 'Every change is recorded by the database and can never be edited or deleted.',
      `<section class="card"><div class="tblwrap"><table><thead><tr><th>When</th><th>Who</th><th>Table</th><th>Action</th><th>Change</th></tr></thead><tbody>
      ${list.map((a) => `<tr><td>${fmtDateTime(a.at)}</td><td>${esc(nameOf(a.user_id))}</td><td class="m">${esc(a.table_name)}</td><td>${esc(a.action)}</td><td class="note">${esc((a.new_row && (a.new_row.ref || a.new_row.asset_no || a.new_row.pr_number)) || '')} ${a.new_row && a.new_row.status ? '→ ' + esc(a.new_row.status) : ''}</td></tr>`).join('') || empty('Nothing recorded yet.', 5)}
      </tbody></table></div></section>`);
  }

  async function pNotifications() {
    const rows = await db.list('am_notifications', { eq: { user_id: me.id }, order: 'created_at', desc: true, limit: 100 });
    after(() => {
      $('#markAll').onclick = async () => { for (const n of rows.filter((x) => !x.read_at)) await db.update('am_notifications', n.id, { read_at: nowIso() }); route(); };
      $$('a[data-n]').forEach((a) => a.addEventListener('click', () => { const n = rows.find((x) => x.id === a.dataset.n); if (n && !n.read_at) db.update('am_notifications', n.id, { read_at: nowIso() }); }));
    });
    return page('Notifications', 'Every message Asset Management sent you. Teams and email messages can be added later (see the setup guide).',
      `<section class="card">${rows.map((n) => `<div class="list-row" style="font-weight:${n.read_at ? 500 : 800}">${n.link ? `<a href="${esc(n.link)}" data-n="${n.id}">${esc(n.title)}</a>` : esc(n.title)}${n.body ? `<div class="note" style="font-weight:500">${esc(n.body)}</div>` : ''}<div class="note" style="font-weight:500">${fmtDateTime(n.created_at)}</div></div>`).join('') || '<p class="note">No notifications yet.</p>'}</section>`,
      '<button class="btn sec sm" id="markAll">Mark all as read</button>');
  }

  function pHelp() {
    return page('How to use Asset Management', 'QMS-05 Asset Management. The full steps are in the Staff Guide and the SOP.', `<div class="grid2">
      <section class="card"><h2>Staff</h2><ol style="font-size:14px;line-height:1.7"><li>Open <a href="#/new-request">New request</a>, choose what you need and who pays.</li><li>Your line manager approves; Anton checks whether to repair, use stock or buy.</li><li>Follow every step on the request page; you get a notification each time.</li><li>When it is couriered, sign in with PCZEN, take photos and sign on screen.</li><li>Lost, stolen or damaged? <a href="#/report-problem">Report a problem</a> within 24 hours.</li></ol></section>
      <section class="card"><h2>Ordering and payment</h2><ol style="font-size:14px;line-height:1.7"><li>Anton gets the quotes and creates the Payment Request.</li><li>Annemarie and Brent pre-approve and check the budget (Asset Management).</li><li>Jessica does the full compliance check and upload; Gerald does the final check (Finance Management; CEO above the limit).</li><li>Anton places the order only after Finance approves, then receives and registers it here.</li></ol></section>
      <section class="card"><h2>Department asset contacts</h2><p style="font-size:14px">One contact and a backup per department coordinate with Anton: store bookings, deliveries and questions. HR logs new-starter requests at onboarding; after that, the department contact helps with broken laptops and similar. Contacts do not approve.</p></section>
      <section class="card"><h2>Privacy (POPIA)</h2><p style="font-size:14px">Staff see only their own requests and equipment. Back-office roles see what their step needs. Delivery addresses are not stored. Every change is in the audit log. Questions about your information: the Information Officer.</p></section></div>`);
  }

  // =====================================================================
  // Sign-in (live mode)
  // =====================================================================
  function loginPage() {
    $('#nav').innerHTML = ''; $('#who').innerHTML = '';
    $('#main').innerHTML = `<div class="card login"><div class="brand"><div class="logo">A</div><div><div style="font-weight:800">Asset Management</div><div class="note">${esc(C.ORGANISATION || 'Angels Resource Centres')}</div></div></div>
      ${C.SIGN_IN_WITH_MICROSOFT ? '<button class="btn" id="ms" style="width:100%">Sign in with Microsoft</button>' : ''}
      ${C.SIGN_IN_WITH_MICROSOFT && C.SIGN_IN_WITH_EMAIL_LINK !== false ? '<p class="note" style="text-align:center">or</p>' : ''}
      ${C.SIGN_IN_WITH_EMAIL_LINK !== false ? '<form id="mail"><label>Work email<input type="email" name="email" required placeholder="name@your-organisation"></label><button class="btn sec" type="submit">Email me a sign-in link</button></form>' : ''}</div>`;
    const ms = $('#ms'); if (ms) ms.onclick = () => sb.auth.signInWithOAuth({ provider: 'azure', options: { scopes: 'email', redirectTo: location.href.split('#')[0] } });
    const mail = $('#mail'); if (mail) mail.onsubmit = async (e) => { e.preventDefault(); const { error } = await sb.auth.signInWithOtp({ email: e.target.email.value.trim(), options: { emailRedirectTo: location.href.split('#')[0] } }); toast(error ? error.message : 'Check your email for the sign-in link.'); };
  }

  // =====================================================================
  // Router
  // =====================================================================
  const ROUTES = {
    home: pHome, requests: pRequests, 'new-request': pNewRequest, request: pRequest, approvals: pApprovals, payments: pPayments, handover: pHandover,
    register: pRegister, asset: pAsset, 'report-problem': pReportProblem, incidents: pIncidents, incident: pIncident,
    store: pStore, 'new-booking': pNewBooking, booking: pBooking, deliveries: pDeliveries, donations: pDonations, 'donation-in': pDonationIn, disposal: pDisposal,
    reports: pReports, admin: pAdmin, audit: pAudit, notifications: pNotifications, help: pHelp, designs: pDesigns, d: pDesign
  };
  const ALLOW = {
    payments: finRoles, incidents: () => backOffice() || has('info_officer'), reports: () => backOffice() || has('line_manager'),
    deliveries: () => backOffice() || has('dept_contact'), donations: backOffice, 'donation-in': backOffice, disposal: backOffice,
    admin: () => has('asset_coordinator', 'hod_ops'), audit: () => has('asset_coordinator', 'hod_ops', 'hof'), 'new-booking': () => backOffice() || has('dept_contact')
  };
  // Working pages that also show their approved prototype screen at the bottom
  const EXTRA = { home: 'home-design', 'new-request': 'request-design', approvals: 'approval-design', payments: 'order-design', register: 'register-design', 'report-problem': 'report-design', incident: 'incident-design', reports: 'reports-design', deliveries: 'deliveries-design', store: 'store-design', booking: 'booking-design', donations: 'donations-design', disposal: 'donation-out-design', handover: 'handover-design' };
  let routing = 0;
  async function route() {
    const n = ++routing;
    const [, name, arg] = (location.hash || '#/home').split('/');
    const fn = ROUTES[name] || pHome;
    await loadCounts().catch(() => {});
    if (n !== routing) return;
    renderNav(); $('#nav').classList.remove('open');
    if (ALLOW[name] && !ALLOW[name]()) { $('#main').innerHTML = page('No access', '', '<div class="card">This page is not part of your role. <a href="#/home">Back to home</a></div>'); return; }
    afterFns = [];
    try {
      let html = await fn(arg ? decodeURIComponent(arg) : arg);
      if (n !== routing) return;
      const x = EXTRA[name];
      if (x && DESIGN[x]) html += `<details class="card proto"><summary>Prototype screen ${esc(DESIGN[x][0])} · ${esc(DESIGN[x][1])} <span class="note">· placeholder values</span></summary>${designFrame(x)}</details>`;
      const fns = afterFns; afterFns = [];
      $('#main').innerHTML = html; $('#main').focus();
      for (const f of fns) await f();
      $$('#main details.proto').forEach((d) => d.addEventListener('toggle', () => { const f = d.querySelector('iframe'); if (d.open && f) window.__fit(f); }));
    } catch (err) {
      $('#main').innerHTML = page('Something went wrong', '', `<div class="card">${esc(err.message || err)}<p class="note">If this keeps happening, tell the Asset Coordinator. You may not have access to this page.</p></div>`);
    }
  }

  async function start() {
    $('#menuBtn').onclick = () => $('#nav').classList.toggle('open');
    if (!DEMO && !sb) { $('#main').innerHTML = '<div class="card">Supabase could not load. Check config.js and your internet connection.</div>'; return; }
    if (!DEMO) sb.auth.onAuthStateChange((ev) => { if (ev === 'SIGNED_OUT' || (ev === 'SIGNED_IN' && !me)) location.reload(); });
    if (!(await loadMe())) { loginPage(); return; }
    if (!me || (!DEMO && !me.full_name && !(me.roles || []).length)) {
      $('#main').innerHTML = '<div class="card login"><h2>Almost there</h2><p>Your profile is being set up. Refresh in a moment, or ask the Asset Coordinator to check your access.</p></div>'; return;
    }
    window.addEventListener('hashchange', route);
    route();
  }
  start();
})();
