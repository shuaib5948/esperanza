ALTER TABLE team_points ADD COLUMN is_published BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX idx_teampoints_published ON team_points (is_published);

-- Publish existing team points so all currently published competition results remain visible
UPDATE team_points SET is_published = TRUE;

CREATE TABLE IF NOT EXISTS festival_settings (
  setting_key VARCHAR(100) PRIMARY KEY,
  setting_value TEXT NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO festival_settings (setting_key, setting_value)
VALUES ('LEADERBOARD_LAST_PUBLISHED_AT', NOW())
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);
