-- 008_allow_null_max_entries.sql
-- Allow max_entries_per_team to be NULL to represent unlimited entries for off-stage items

ALTER TABLE competitions
  MODIFY COLUMN max_entries_per_team INT NULL DEFAULT NULL;
