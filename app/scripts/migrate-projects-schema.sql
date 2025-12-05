-- Migration: Clean up projects table schema
-- This migration handles the case where both 'status' and 'task_progress' columns may exist

-- Step 1: If task_progress already exists but is empty, copy data from status
UPDATE projects 
SET task_progress = status 
WHERE task_progress IS NULL OR task_progress = '';

-- Step 2: Drop the old status column if it exists
ALTER TABLE projects DROP COLUMN IF EXISTS status;

-- Step 3: Drop unused columns
ALTER TABLE projects DROP COLUMN IF EXISTS start_date;
ALTER TABLE projects DROP COLUMN IF EXISTS end_date;
ALTER TABLE projects DROP COLUMN IF EXISTS location;

-- Step 4: Add blocked_by and blocking if they don't exist
ALTER TABLE projects ADD COLUMN IF NOT EXISTS blocked_by TEXT[];
ALTER TABLE projects ADD COLUMN IF NOT EXISTS blocking TEXT[];

-- Step 5: Add project_area if it doesn't exist
ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_area TEXT;

-- Step 6: Make sure task_progress has a default for any remaining nulls
UPDATE projects SET task_progress = 'Not Started' WHERE task_progress IS NULL OR task_progress = '';

-- Verify the changes
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'projects' 
ORDER BY ordinal_position;
