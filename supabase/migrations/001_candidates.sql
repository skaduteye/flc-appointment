create table if not exists candidates (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  -- Section 1: Identity
  full_name text not null,
  surname text not null default '',
  date_of_birth date,
  gender text check (gender in ('MALE', 'FEMALE')),
  oversight text,
  oversight_area text,

  -- Category A: Strong Christian Status
  is_born_again boolean default false,      -- +10
  speaks_in_tongues boolean default false,  -- +10
  has_call_to_ministry boolean default false, -- +10
  prays_regularly boolean default false,    -- +50
  pays_tithes_regularly boolean default false, -- +50

  -- Category B: Sweet Influences (disqualifiers, each -100)
  has_spiritual_character_problem boolean default false,
  spiritual_character_detail text,
  has_known_moral_problem boolean default false,
  moral_problem_detail text,
  is_known_thief boolean default false,
  has_shown_disloyalty boolean default false,

  -- Category C: Loyalty Status
  years_of_membership integer default 0,       -- 3/yr capped at 10
  volunteer_times integer default 0,           -- 3/time capped at 10
  volunteers_in_church_offices boolean default false, -- +10 flat
  years_fulltime_worker integer default 0,     -- 5/yr capped at 20
  is_fulltime_ministry boolean default false,  -- +200
  is_missionary boolean default false,         -- +200
  is_missionary_wife boolean default false,    -- +100
  is_benmp boolean default false,              -- +50

  -- Category D: Fruitfulness Status
  preaches_to_20plus boolean default false,    -- +200
  preaches_to_10_or_less boolean default false, -- +100
  centers_planted integer default 0,           -- 25/center capped at 100

  -- Category E: Servants Armed and Trained
  camps_with_prophet integer default 0,        -- 25/camp capped at 100
  camps_with_prophet_list text,
  camps_with_bishops integer default 0,        -- 5/camp capped at 20
  root_camps_attended integer default 0,       -- 5/camp capped at 20

  -- Category G: Pineapple Patch
  has_tablet_with_books boolean default false,   -- +50
  has_hard_copies_books boolean default false,   -- +50
  has_tablet_with_bibles boolean default false,  -- +50
  has_hard_copies_bibles boolean default false,  -- +50
  has_audio_library_access boolean default false, -- +50
  communicates_with_prophet boolean default false, -- +100
  communicates_with_mothers boolean default false, -- +50
  communicates_with_bishops boolean default false, -- +50
  interest_in_church_activities boolean default false, -- +30

  -- Computed / admin
  total_score integer default 0,
  is_disqualified boolean default false,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected', 'under_review')),
  admin_notes text,

  -- Google Sheets sync
  sheet_row_id text unique,
  last_synced_at timestamptz
);

create index if not exists idx_candidates_status on candidates(status);
create index if not exists idx_candidates_total_score on candidates(total_score desc);
create index if not exists idx_candidates_is_disqualified on candidates(is_disqualified);
create index if not exists idx_candidates_oversight on candidates(oversight);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger candidates_updated_at
  before update on candidates
  for each row execute function update_updated_at();

-- Row-level security
alter table candidates enable row level security;

create policy "public_insert" on candidates
  for insert with check (true);

create policy "admin_select" on candidates
  for select using (auth.role() = 'authenticated');

create policy "admin_update" on candidates
  for update using (auth.role() = 'authenticated');

create policy "admin_delete" on candidates
  for delete using (auth.role() = 'authenticated');
