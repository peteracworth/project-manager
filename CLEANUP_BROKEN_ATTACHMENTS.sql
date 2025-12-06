-- Optional: Clean up old broken Airtable attachments
-- Run this in your Supabase SQL Editor if you want to remove broken attachments

-- First, let's see how many broken attachments we have
SELECT COUNT(*) as broken_attachments
FROM documents
WHERE storage_url LIKE '%airtableusercontent.com%';

-- To actually delete them, uncomment and run this:
-- DELETE FROM documents
-- WHERE storage_url LIKE '%airtableusercontent.com%';

-- Verify the cleanup (should return 0)
-- SELECT COUNT(*) as broken_attachments
-- FROM documents
-- WHERE storage_url LIKE '%airtableusercontent.com%';
