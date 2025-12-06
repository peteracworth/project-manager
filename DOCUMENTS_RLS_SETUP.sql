-- Documents Table RLS Policies Setup
-- Run this in your Supabase SQL Editor

-- Enable RLS on documents table (if not already enabled)
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow authenticated users to view documents" ON documents;
DROP POLICY IF EXISTS "Allow authenticated users to insert documents" ON documents;
DROP POLICY IF EXISTS "Allow authenticated users to delete documents" ON documents;

-- Policy 1: Allow authenticated users to view all documents
CREATE POLICY "Allow authenticated users to view documents"
ON documents
FOR SELECT
TO authenticated
USING (true);

-- Policy 2: Allow authenticated users to insert documents
CREATE POLICY "Allow authenticated users to insert documents"
ON documents
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy 3: Allow authenticated users to delete documents
CREATE POLICY "Allow authenticated users to delete documents"
ON documents
FOR DELETE
TO authenticated
USING (true);

-- Verify policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'documents';
