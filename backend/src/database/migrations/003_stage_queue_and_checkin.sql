-- Migration 003: Stage queue check-in columns + CHECK_IN schedule status
-- Originally a .ts file that was applied locally but never converted to .sql
-- This is the ROOT CAUSE of check-in failing on Railway production

-- 1. Add CHECK_IN to schedules status ENUM
ALTER TABLE schedules
  MODIFY COLUMN status ENUM('SCHEDULED', 'CHECK_IN', 'LIVE', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'SCHEDULED';

-- 2. Add code_letter column (used for lot assignment during check-in)
ALTER TABLE stage_queue ADD COLUMN code_letter VARCHAR(10) NULL AFTER participant_id;

-- 3. Add check_in_status column (tracks whether participant reported backstage)
ALTER TABLE stage_queue ADD COLUMN check_in_status ENUM('PENDING', 'REPORTED', 'ABSENT') NOT NULL DEFAULT 'PENDING' AFTER stage_status;

-- 4. Add call_count column (tracks how many times participant was called)
ALTER TABLE stage_queue ADD COLUMN call_count INT NOT NULL DEFAULT 0 AFTER check_in_status;
