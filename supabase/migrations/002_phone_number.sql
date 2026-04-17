alter table candidates
  add column if not exists phone_number text,
  add column if not exists sms_sent_at timestamptz,
  add column if not exists sms_message_id text;

create index if not exists idx_candidates_phone on candidates(phone_number);
