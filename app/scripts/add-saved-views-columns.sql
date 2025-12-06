-- Add new columns to saved_views for column order, widths, and sort config
-- Run this in Supabase SQL Editor

-- Column order (array of field names in display order)
ALTER TABLE saved_views ADD COLUMN IF NOT EXISTS column_order TEXT[] DEFAULT '{}';

-- Column widths (JSON object: field -> width in pixels)
ALTER TABLE saved_views ADD COLUMN IF NOT EXISTS column_widths JSONB DEFAULT '{}';

-- Sort configuration (JSON array of {column, dir} objects)
ALTER TABLE saved_views ADD COLUMN IF NOT EXISTS sort_config JSONB DEFAULT '[]';

-- Verify the changes
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'saved_views'
ORDER BY ordinal_position;

