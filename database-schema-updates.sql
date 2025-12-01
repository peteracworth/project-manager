-- Database Schema Updates for Airtable Migration
-- Run this in Supabase SQL Editor after the initial schema

-- Update users table to include Contact-specific fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS contact_type TEXT; -- 'Team' or 'Vendor'
ALTER TABLE users ADD COLUMN IF NOT EXISTS service_type TEXT; -- For vendors

-- Update items table to match Airtable "Items & Purchases" structure
ALTER TABLE items DROP COLUMN IF EXISTS name;
ALTER TABLE items DROP COLUMN IF EXISTS description;
ALTER TABLE items DROP COLUMN IF EXISTS category;
ALTER TABLE items DROP COLUMN IF EXISTS cost;
ALTER TABLE items DROP COLUMN IF EXISTS quantity;
ALTER TABLE items DROP COLUMN IF EXISTS purchased_date;
ALTER TABLE items DROP COLUMN IF EXISTS vendor;
ALTER TABLE items DROP COLUMN IF EXISTS project_id;

-- Add new columns matching Airtable structure
ALTER TABLE items ADD COLUMN IF NOT EXISTS item_name TEXT NOT NULL DEFAULT '';
ALTER TABLE items ADD COLUMN IF NOT EXISTS details TEXT;
ALTER TABLE items ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE items ADD COLUMN IF NOT EXISTS room_space TEXT;
ALTER TABLE items ADD COLUMN IF NOT EXISTS sheen TEXT;
ALTER TABLE items ADD COLUMN IF NOT EXISTS estimate DECIMAL(10, 2);
ALTER TABLE items ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE items ADD COLUMN IF NOT EXISTS link TEXT;
ALTER TABLE items ADD COLUMN IF NOT EXISTS is_suggestion BOOLEAN DEFAULT false;
ALTER TABLE items ADD COLUMN IF NOT EXISTS is_rejected BOOLEAN DEFAULT false;
ALTER TABLE items ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES users(id);
ALTER TABLE items ADD COLUMN IF NOT EXISTS image_urls TEXT[]; -- Array of image URLs

-- Update projects table for Task List specific fields
ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_area TEXT; -- Different from location
ALTER TABLE projects ADD COLUMN IF NOT EXISTS details TEXT; -- Additional details field

-- Add index for vendor lookups
CREATE INDEX IF NOT EXISTS idx_items_vendor_id ON items(vendor_id);
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);
CREATE INDEX IF NOT EXISTS idx_items_room_space ON items(room_space);

-- Add RLS policies for updated fields
DROP POLICY IF EXISTS "Users can read all items" ON items;
DROP POLICY IF EXISTS "Users can create items" ON items;
DROP POLICY IF EXISTS "Users can update items" ON items;
DROP POLICY IF EXISTS "Users can delete items" ON items;

CREATE POLICY "Users can read all items" ON items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create items" ON items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update items" ON items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Users can delete items" ON items FOR DELETE TO authenticated USING (true);

COMMENT ON COLUMN users.contact_type IS 'Team or Vendor';
COMMENT ON COLUMN items.is_suggestion IS 'Item is a suggestion';
COMMENT ON COLUMN items.is_rejected IS 'Item has been rejected';
COMMENT ON COLUMN projects.project_area IS 'Specific area within a project (e.g., Basement Peters Office)';
