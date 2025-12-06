-- Fix documents table schema
-- Run this in your Supabase SQL Editor

-- Option 1: Make uploaded_by nullable (if you want to allow NULL values)
-- This is safer for cases where the user might not be authenticated
ALTER TABLE documents
ALTER COLUMN uploaded_by DROP NOT NULL;

-- Option 2: If you want to keep uploaded_by as required,
-- you could set a default value instead:
-- ALTER TABLE documents
-- ALTER COLUMN uploaded_by SET DEFAULT auth.uid();

-- Check the current schema
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'documents'
ORDER BY ordinal_position;
