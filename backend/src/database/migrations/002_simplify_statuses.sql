-- Migration 002: Simplify registration statuses
-- Originally a .ts file that was applied locally but never converted to .sql

-- Narrow registrations.status to only the values actually used
ALTER TABLE registrations
  MODIFY COLUMN status ENUM('ASSIGNED', 'REMOVED') NOT NULL DEFAULT 'ASSIGNED';
