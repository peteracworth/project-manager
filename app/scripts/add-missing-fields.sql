-- Migration: Add missing fields from Airtable
-- Run this in Supabase SQL Editor

-- =====================================================
-- PROJECTS TABLE - Missing fields
-- =====================================================

-- Additional Progress Notes (multilineText in Airtable)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS additional_notes TEXT;

-- Projects field (singleSelect - e.g., "Franklin House")
ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_name TEXT;

-- Items & Purchases links (will store item IDs)
-- Note: This is handled by adding project_id to items table

-- Who Buys? (links to contacts who are responsible for purchasing)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS who_buys TEXT[];

-- =====================================================
-- USERS (CONTACTS) TABLE - Missing fields
-- =====================================================

-- Notes (multilineText)
ALTER TABLE users ADD COLUMN IF NOT EXISTS notes TEXT;

-- Attachments (will store URLs like other attachment fields)
ALTER TABLE users ADD COLUMN IF NOT EXISTS attachment_urls TEXT[];

-- Website (url)
ALTER TABLE users ADD COLUMN IF NOT EXISTS website TEXT;

-- License # (text)
ALTER TABLE users ADD COLUMN IF NOT EXISTS license_number TEXT;

-- Contact Name (person's name at company)
ALTER TABLE users ADD COLUMN IF NOT EXISTS contact_name TEXT;

-- Product Type (multiSelect)
ALTER TABLE users ADD COLUMN IF NOT EXISTS product_types TEXT[];

-- Item Type (multiSelect)
ALTER TABLE users ADD COLUMN IF NOT EXISTS item_types TEXT[];

-- Location (multilineText)
ALTER TABLE users ADD COLUMN IF NOT EXISTS location TEXT;

-- =====================================================
-- ITEMS TABLE - Missing fields
-- =====================================================

-- Size/Dimensions (richText)
ALTER TABLE items ADD COLUMN IF NOT EXISTS size_dimensions TEXT;

-- Inside Panel Width (text)
ALTER TABLE items ADD COLUMN IF NOT EXISTS inside_panel_width TEXT;

-- Product ID (text)
ALTER TABLE items ADD COLUMN IF NOT EXISTS product_id TEXT;

-- Quantity (number) - already exists in Prisma but may not be in DB
ALTER TABLE items ADD COLUMN IF NOT EXISTS quantity INTEGER;

-- Purchase Price (currency)
ALTER TABLE items ADD COLUMN IF NOT EXISTS purchase_price DECIMAL(10, 2);

-- Purchase Date (date)
ALTER TABLE items ADD COLUMN IF NOT EXISTS purchase_date TIMESTAMP WITH TIME ZONE;

-- Actual Dimensions (richText)
ALTER TABLE items ADD COLUMN IF NOT EXISTS actual_dimensions TEXT;

-- Spec Sheet (attachments)
ALTER TABLE items ADD COLUMN IF NOT EXISTS spec_sheet_urls TEXT[];

-- Status (singleSelect: Received, Installed, Ordered, etc.)
ALTER TABLE items ADD COLUMN IF NOT EXISTS status TEXT;

-- Task/Project link (foreign key to projects)
ALTER TABLE items ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id);

-- =====================================================
-- STATIC_INFO TABLE - Missing fields
-- =====================================================

-- Website/Link (url)
ALTER TABLE static_info ADD COLUMN IF NOT EXISTS website_link TEXT;

-- =====================================================
-- Add comments for documentation
-- =====================================================

COMMENT ON COLUMN projects.additional_notes IS 'Additional Progress Notes from Airtable';
COMMENT ON COLUMN projects.project_name IS 'Project grouping (e.g., Franklin House) from Airtable';
COMMENT ON COLUMN projects.who_buys IS 'Array of user IDs responsible for purchasing';

COMMENT ON COLUMN users.notes IS 'Contact notes from Airtable';
COMMENT ON COLUMN users.attachment_urls IS 'Array of attachment URLs for this contact';
COMMENT ON COLUMN users.website IS 'Contact website URL';
COMMENT ON COLUMN users.license_number IS 'Contractor license number';
COMMENT ON COLUMN users.contact_name IS 'Person name at company';
COMMENT ON COLUMN users.product_types IS 'Array of product types (furniture, etc.)';
COMMENT ON COLUMN users.item_types IS 'Array of item types (Kitchen Appliance, Hardware, etc.)';
COMMENT ON COLUMN users.location IS 'Contact address/location';

COMMENT ON COLUMN items.size_dimensions IS 'Product dimensions from Airtable';
COMMENT ON COLUMN items.inside_panel_width IS 'Inside panel width measurement';
COMMENT ON COLUMN items.product_id IS 'Vendor product ID';
COMMENT ON COLUMN items.quantity IS 'Quantity to order';
COMMENT ON COLUMN items.purchase_price IS 'Actual price paid';
COMMENT ON COLUMN items.purchase_date IS 'Date of purchase';
COMMENT ON COLUMN items.actual_dimensions IS 'Measured dimensions';
COMMENT ON COLUMN items.spec_sheet_urls IS 'Array of spec sheet attachment URLs';
COMMENT ON COLUMN items.status IS 'Item status (Received, Installed, Ordered, etc.)';
COMMENT ON COLUMN items.project_id IS 'Link to associated project/task';

COMMENT ON COLUMN static_info.website_link IS 'Reference URL from Airtable';

-- =====================================================
-- Verify changes
-- =====================================================

SELECT 'projects' as table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'projects' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'users' as table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'items' as table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'items' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'static_info' as table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'static_info' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

