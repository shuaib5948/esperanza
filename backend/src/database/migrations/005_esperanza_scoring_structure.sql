ALTER TABLE results 
  ADD COLUMN raw_marks DECIMAL(10,2) NULL AFTER competition_id,
  ADD COLUMN grade ENUM('A+', 'A', 'B', 'C', 'NG') NULL AFTER raw_marks,
  ADD COLUMN grade_marks DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER grade,
  ADD COLUMN position_points DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER position;
