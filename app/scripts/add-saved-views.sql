-- Migration: Add saved_views table for storing user views
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS saved_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  table_name TEXT NOT NULL, -- 'projects', 'users', 'items', 'static_info'
  view_type TEXT NOT NULL DEFAULT 'table', -- 'table', 'kanban'
  filters JSONB DEFAULT '[]'::jsonb, -- Array of filter conditions
  group_by TEXT, -- Column to group by, null for no grouping
  search_term TEXT, -- Saved search term
  hidden_columns TEXT[] DEFAULT '{}', -- Array of hidden column field names
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups by table
CREATE INDEX IF NOT EXISTS idx_saved_views_table ON saved_views(table_name);

-- Add RLS policies (allow all authenticated users to read/write)
ALTER TABLE saved_views ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read saved views
CREATE POLICY "Anyone can read saved views" ON saved_views
  FOR SELECT USING (true);

-- Allow anyone to insert saved views
CREATE POLICY "Anyone can create saved views" ON saved_views
  FOR INSERT WITH CHECK (true);

-- Allow anyone to update saved views
CREATE POLICY "Anyone can update saved views" ON saved_views
  FOR UPDATE USING (true);

-- Allow anyone to delete saved views
CREATE POLICY "Anyone can delete saved views" ON saved_views
  FOR DELETE USING (true);

-- Verify the table was created
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'saved_views';

