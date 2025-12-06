-- Migration: Make messages table support any entity type
-- Run this in Supabase SQL Editor

-- Add entity_type column to support messages on any entity
ALTER TABLE messages ADD COLUMN IF NOT EXISTS entity_type TEXT DEFAULT 'project';

-- Add entity_id column (will hold the UUID of any entity)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS entity_id UUID;

-- Populate entity_id from project_id for existing messages
UPDATE messages SET entity_id = project_id WHERE entity_id IS NULL;

-- Make project_id nullable (for backwards compatibility, but new messages will use entity_type/entity_id)
ALTER TABLE messages ALTER COLUMN project_id DROP NOT NULL;

-- Create index for efficient querying by entity
CREATE INDEX IF NOT EXISTS idx_messages_entity ON messages(entity_type, entity_id);

-- Add comments
COMMENT ON COLUMN messages.entity_type IS 'Type of entity: project, user, item, static_info';
COMMENT ON COLUMN messages.entity_id IS 'UUID of the associated entity';

-- Verify changes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'messages' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

