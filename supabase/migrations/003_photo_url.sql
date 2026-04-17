-- Add passport photo URL column to candidates
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS photo_url TEXT DEFAULT NULL;
