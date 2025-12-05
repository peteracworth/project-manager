-- Add image_urls column to static_info table
-- This column stores an array of permanent Supabase Storage URLs for attachments

ALTER TABLE static_info
ADD COLUMN IF NOT EXISTS image_urls TEXT[];

-- Add a comment explaining the column
COMMENT ON COLUMN static_info.image_urls IS 'Array of permanent Supabase Storage URLs for attachments';
