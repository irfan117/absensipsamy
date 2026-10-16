-- Fix 5: Add penalty_start_date to attendance_settings
ALTER TABLE attendance_settings 
ADD COLUMN IF NOT EXISTS penalty_start_date DATE DEFAULT '2026-10-01' 
COMMENT 'Start date for absent penalty calculation';

-- Update existing row if exists
UPDATE attendance_settings 
SET penalty_start_date = '2026-10-01' 
WHERE id = 'global' AND penalty_start_date IS NULL;
