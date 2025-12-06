-- Simple Fix for Attachments Upload Issue
-- Run this SQL in your Supabase SQL Editor

-- Step 1: Make uploaded_by nullable (so we don't need a valid user)
ALTER TABLE documents ALTER COLUMN uploaded_by DROP NOT NULL;

-- Step 2: Enable RLS on documents table
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Step 3: Drop any existing policies (to avoid conflicts)
DROP POLICY IF EXISTS "Allow authenticated users to view documents" ON documents;
DROP POLICY IF EXISTS "Allow authenticated users to insert documents" ON documents;
DROP POLICY IF EXISTS "Allow authenticated users to delete documents" ON documents;

-- Step 4: Create new policies that allow authenticated users to do everything
CREATE POLICY "Allow authenticated users to view documents"
ON documents FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert documents"
ON documents FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete documents"
ON documents FOR DELETE TO authenticated USING (true);

-- Verify the changes
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'documents' AND column_name = 'uploaded_by';
