-- 007_competition_entries_refactor.sql
-- Refactor Esperanza competition, participant categories, and entry architecture

-- 1. Add max_entries_per_team to competitions if it doesn't already exist
ALTER TABLE competitions
  ADD COLUMN max_entries_per_team INT NOT NULL DEFAULT 1 AFTER max_participants;

-- 2. Create competition_entries table
CREATE TABLE IF NOT EXISTS competition_entries (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  uuid CHAR(36) NOT NULL UNIQUE,
  competition_id BIGINT UNSIGNED NOT NULL,
  team_id BIGINT UNSIGNED NOT NULL,
  entry_code VARCHAR(50) NOT NULL UNIQUE,
  status ENUM('DRAFT', 'CONFIRMED', 'CHECK_IN', 'LIVE', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'CONFIRMED',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE RESTRICT,
  INDEX idx_entries_comp (competition_id),
  INDEX idx_entries_team (team_id),
  INDEX idx_entries_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Create entry_participants table
CREATE TABLE IF NOT EXISTS entry_participants (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  entry_id BIGINT UNSIGNED NOT NULL,
  participant_id BIGINT UNSIGNED NOT NULL,
  attendance_status ENUM('PENDING', 'PRESENT', 'ABSENT', 'EXCUSED') NOT NULL DEFAULT 'PENDING',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (entry_id) REFERENCES competition_entries(id) ON DELETE CASCADE,
  FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE,
  UNIQUE KEY uq_entry_participant (entry_id, participant_id),
  INDEX idx_entry_part_entry (entry_id),
  INDEX idx_entry_part_participant (participant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Add entry_id to downstream tables for entry-level tracking
ALTER TABLE stage_queue
  ADD COLUMN entry_id BIGINT UNSIGNED NULL AFTER competition_id,
  ADD CONSTRAINT fk_stage_queue_entry FOREIGN KEY (entry_id) REFERENCES competition_entries(id) ON DELETE CASCADE;

ALTER TABLE score_sheets
  ADD COLUMN entry_id BIGINT UNSIGNED NULL AFTER competition_id,
  ADD CONSTRAINT fk_score_sheets_entry FOREIGN KEY (entry_id) REFERENCES competition_entries(id) ON DELETE CASCADE;

ALTER TABLE results
  ADD COLUMN entry_id BIGINT UNSIGNED NULL AFTER competition_id,
  ADD CONSTRAINT fk_results_entry FOREIGN KEY (entry_id) REFERENCES competition_entries(id) ON DELETE CASCADE;
