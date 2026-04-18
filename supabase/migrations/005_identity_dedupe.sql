alter table candidates
  add column if not exists dedup_identity_key text;

-- Backfill identity key from full name + surname for existing records.
update candidates
set dedup_identity_key = nullif(
  trim(
    regexp_replace(
      lower(coalesce(full_name, '') || '|' || coalesce(surname, '')),
      '[^a-z0-9|]+',
      ' ',
      'g'
    )
  ),
  ''
);

create index if not exists idx_candidates_dedup_identity_key on candidates(dedup_identity_key);
