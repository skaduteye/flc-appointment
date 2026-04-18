alter table candidates
  add column if not exists phone_number_normalized text,
  add column if not exists is_duplicate boolean default false,
  add column if not exists is_invalid boolean default false,
  add column if not exists duplicate_of_id uuid references candidates(id) on delete set null;

-- Backfill normalized phone for existing records to improve duplicate detection.
update candidates
set phone_number_normalized = regexp_replace(coalesce(phone_number, ''), '\\D', '', 'g')
where phone_number is not null;

update candidates
set phone_number_normalized = '0' || substring(phone_number_normalized from 4)
where phone_number_normalized ~ '^233[0-9]{9}$';

update candidates
set phone_number_normalized = null
where phone_number_normalized is not null
  and phone_number_normalized !~ '^0[235][0-9]{8}$';

create index if not exists idx_candidates_phone_number_normalized on candidates(phone_number_normalized);
create index if not exists idx_candidates_is_invalid on candidates(is_invalid);
