-- Add hidden_columns column to saved_views table
-- Run this in the Supabase SQL Editor

ALTER TABLE saved_views ADD COLUMN IF NOT EXISTS hidden_columns TEXT[] DEFAULT '{}';

