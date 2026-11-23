-- =====================================================================
-- Asset Management · starting data (runs after the migrations; `supabase db push --include-seed` or the SQL Editor)
-- Safe to run more than once.
-- =====================================================================

-- Settings the Asset Coordinator can change later in Admin -> Settings
insert into public.am_settings (key, value, note) values
  ('ceo_limit', 'null', 'Rand amount above which the CEO gives the final approval (D-01). null = not decided yet'),
  ('pczen_turnaround_days', '5', 'Agreed PCZEN turnaround in working days (D-02, placeholder)'),
  ('new_starter_lead_days', '10', 'Working days before start date for new-starter requests (R-03)'),
  ('approval_days', '2', 'Working days per approval step'),
  ('loan_pool_max', '2', 'Maximum loan laptops (R-29)'),
  ('depreciation_years', '3', 'Straight-line years for IT equipment book value (R-30, HOF to confirm)'),
  ('replacement_due_years', '4', 'Flag laptops older than this as replacement due (R-31)')
on conflict (key) do nothing;

-- Department asset contacts (link the people in Admin -> Department contacts once they have signed in)
insert into public.am_departments (name, notes) values
  ('Operations', 'Contact: Abongile Gotyana · Backup: Annemarie Mostert · programme teams after onboarding'),
  ('Human Resources', 'Contact: Jordan Smith · Backup: Dana Dreyer · new-starter requests'),
  ('Marketing / PR', 'Contact: Juliana Semple · Backup: Bev Mallows'),
  ('Finance', 'Contact: Gerald Erasmus · Backup: Jessica Tuna'),
  ('Reports', 'Contact: Annemarie Mostert · Backup: Brent Proctor (Jim Cairns)'),
  ('Executive', 'Contact: Melissa Gilomee · Backup: Anton Schoeman')
on conflict (name) do nothing;

-- Training and marketing store (example items: edit or add your real items in the app)
insert into public.am_assets (asset_no, category, short_code, description, funding_source, owner, insurance_status, status, condition, storage_location, client_restriction, box_contents)
values
  ('ARC-TRN-TB-01', 'Training box', 'TB', 'Training box 1', 'Angels', 'Angels', 'Not insured', 'In store', 'Good', 'Shelf A1', null,
   '[{"item":"Flip chart stand","qty":1},{"item":"Flip chart pads","qty":2},{"item":"Marker set","qty":1},{"item":"Extension cord","qty":1},{"item":"Attendance folder","qty":1},{"item":"Name tags","qty":30}]'),
  ('ARC-TRN-TB-02', 'Training box', 'TB', 'Training box 2', 'Angels', 'Angels', 'Not insured', 'In store', 'Good', 'Shelf A2', null,
   '[{"item":"Flip chart stand","qty":1},{"item":"Flip chart pads","qty":2},{"item":"Marker set","qty":1},{"item":"Extension cord","qty":1},{"item":"Attendance folder","qty":1},{"item":"Name tags","qty":30}]'),
  ('ARC-MKT-FB-01', 'Marketing material', 'FB', 'Feather banner, Angels', 'Angels', 'Angels', 'Not insured', 'In store', 'Good', 'Rack B', null, '[]'),
  ('ARC-MKT-FB-02', 'Marketing material', 'FB', 'Feather banner, Angels', 'Angels', 'Angels', 'Not insured', 'In store', 'Good', 'Rack B', null, '[]'),
  ('ARC-MKT-PB-01', 'Marketing material', 'PB', 'Pull-up banner, Angels', 'Angels', 'Angels', 'Not insured', 'In store', 'Good', 'Rack B', null, '[]'),
  ('ARC-MKT-PB-02', 'Marketing material', 'PB', 'Pull-up banner, Scatec E4C', 'Scatec E4C', 'Client', 'Client insures', 'In store', 'Good', 'Rack B', 'Scatec', '[]'),
  ('ARC-MKT-SK-01', 'Marketing material', 'SK', 'Sock flag, Angels', 'Angels', 'Angels', 'Not insured', 'In store', 'Good', 'Rack C', null, '[]'),
  ('ARC-MKT-GZ-01', 'Marketing material', 'GZ', 'Gazebo 3 x 3 m, Angels', 'Angels', 'Angels', 'Not insured', 'In store', 'Good', 'Floor C', null, '[]')
on conflict (asset_no) do nothing;
