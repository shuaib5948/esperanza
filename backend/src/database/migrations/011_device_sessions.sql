-- 011_device_sessions.sql
-- Tracking connected devices, active portals, and remote logout

CREATE TABLE IF NOT EXISTS device_sessions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  device_id VARCHAR(100) NOT NULL UNIQUE,
  user_id BIGINT UNSIGNED NULL,
  device_name VARCHAR(150) NOT NULL,
  browser VARCHAR(100) NULL,
  portal VARCHAR(100) NOT NULL,
  current_path VARCHAR(255) NULL,
  ip_address VARCHAR(50) NULL,
  status ENUM('ACTIVE', 'TERMINATED') NOT NULL DEFAULT 'ACTIVE',
  last_active_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_device_status (status),
  INDEX idx_device_last_active (last_active_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
