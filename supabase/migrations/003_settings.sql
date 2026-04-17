create table if not exists settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz default now()
);

create or replace function update_settings_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger settings_updated_at
  before update on settings
  for each row execute function update_settings_updated_at();

-- RLS: public can read (form needs oversight options), only admins can write
alter table settings enable row level security;

create policy "public_read" on settings for select using (true);
create policy "admin_write" on settings for insert with check (auth.role() = 'authenticated');
create policy "admin_update" on settings for update using (auth.role() = 'authenticated');

-- Seed defaults
insert into settings (key, value) values
(
  'oversight_options',
  '["PAUL BAIDOO","ISAAC OFORI AGYEMAN","ISAAC NAKOJA","EMMANUEL AMARTEY","FRANK OPOKU","EDWIN OGOE","DANIEL ADJEI","ISAAC KORANTENG","SOLOMON TAY","BENJAMIN FIADONU","KIKI HEWARD-MILLS","JONATHAN LONGDON","NATHAN KUDOWOR"]'::jsonb
),
(
  'oversight_areas',
  '["AREA 1","AREA 2 (PHILIPPIANS/ GALATIANS/ EPHESIANS, ETC)","AREA 3 (CHOIR, FILM STARS, DANCING STARS, ETC)","AREA 4 (SHEEP SEEKING, AIRPORT STARS, USHERS, ETC)","AREA 5 (OTHER CAMPUSES- KOINONIA, PASSION, ENERGY, ETC)","AREA 6 (ASHESI, MIOTSO)"]'::jsonb
),
(
  'score_threshold',
  '700'::jsonb
),
(
  'admin_phone',
  'null'::jsonb
),
(
  'scoring_weights',
  '{
    "is_born_again": 10,
    "speaks_in_tongues": 10,
    "has_call_to_ministry": 10,
    "prays_regularly": 50,
    "pays_tithes_regularly": 50,
    "has_spiritual_character_problem": -100,
    "has_known_moral_problem": -100,
    "is_known_thief": -100,
    "has_shown_disloyalty": -100,
    "years_of_membership_rate": 3,
    "years_of_membership_cap": 10,
    "volunteer_times_rate": 3,
    "volunteer_times_cap": 10,
    "volunteers_in_church_offices": 10,
    "years_fulltime_worker_rate": 5,
    "years_fulltime_worker_cap": 20,
    "is_fulltime_ministry": 200,
    "is_missionary": 200,
    "is_missionary_wife": 100,
    "is_benmp": 50,
    "preaches_to_20plus": 200,
    "preaches_to_10_or_less": 100,
    "centers_planted_rate": 25,
    "centers_planted_cap": 100,
    "camps_with_prophet_rate": 25,
    "camps_with_prophet_cap": 100,
    "camps_with_bishops_rate": 5,
    "camps_with_bishops_cap": 20,
    "root_camps_attended_rate": 5,
    "root_camps_attended_cap": 20,
    "has_tablet_with_books": 50,
    "has_hard_copies_books": 50,
    "has_tablet_with_bibles": 50,
    "has_hard_copies_bibles": 50,
    "has_audio_library_access": 50,
    "communicates_with_prophet": 100,
    "communicates_with_mothers": 50,
    "communicates_with_bishops": 50,
    "interest_in_church_activities": 30
  }'::jsonb
)
on conflict (key) do nothing;
