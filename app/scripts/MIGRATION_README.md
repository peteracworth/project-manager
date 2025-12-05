# Airtable to Supabase Migration Guide

This guide explains how to migrate your data from Airtable to Supabase, including images and attachments.

## Prerequisites

1. **Environment Variables** - Ensure these are set in your `.env.local`:
   ```
   AIRTABLE_PAT=your_airtable_personal_access_token
   AIRTABLE_BASE_ID=your_base_id
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

2. **Airtable Personal Access Token**:
   - Go to https://airtable.com/create/tokens
   - Create a token with `data.records:read` scope
   - Add access to your specific base

## Migration Process

### Step 1: Set Up Storage Buckets

First, create the required storage buckets in Supabase:

```bash
cd app
npx tsx scripts/setup-storage-buckets.ts
```

This creates three public buckets:
- `project-documents` - For project attachments
- `item-images` - For item images
- `static-info-files` - For static information attachments

### Step 2: Run the Migration

```bash
npx tsx scripts/migrate-airtable.ts
```

This will:
1. ✅ Migrate Contacts → Users
2. ✅ Migrate Task List → Projects (with assignments and documents)
3. ✅ Migrate Items & Purchases (with images downloaded to Supabase Storage)
4. ✅ Migrate Static Information (with attachments downloaded to Supabase Storage)

## What Gets Migrated

### Contacts → Users
- Name, Email, Phone
- Contact Type, Role, Service Type

### Task List → Projects
- Title, Description, Status, Priority
- Location, Project Area, Tags
- Start Date, Due Date, Task Progress
- Team Roster (via project_assignments)
- **Attachments**: Downloaded from Airtable and uploaded to Supabase Storage

### Items & Purchases → Items
- Item Name, Details, Category
- Room/Space, Sheen, Estimate
- Notes, Link, Vendor
- Suggestion/Rejected flags
- **Images**: Downloaded from Airtable and uploaded to Supabase Storage
  - Stored in `image_urls` array field with permanent Supabase URLs

### Static Information → Static Info
- Key (from Name field)
- Value (from Description field)
- Category (from Select field)
- Description (from Notes field)
- **Attachments**: Downloaded from Airtable and uploaded to Supabase Storage
  - Stored in `image_urls` array field with permanent Supabase URLs

## Important Notes

### Image/Attachment URLs
- ❌ **Old approach**: Stored temporary Airtable URLs that expire
- ✅ **New approach**: Downloads files and stores permanent Supabase Storage URLs
- All images/attachments are downloaded during migration and re-uploaded to Supabase
- This ensures images remain accessible indefinitely

### Re-running the Migration
If you need to re-run the migration:

1. **Clear existing data** (optional):
   ```sql
   -- In Supabase SQL Editor
   DELETE FROM project_assignments;
   DELETE FROM documents;
   DELETE FROM messages;
   DELETE FROM projects;
   DELETE FROM items;
   DELETE FROM static_info;
   DELETE FROM users;
   ```

2. **Clear storage buckets** (optional):
   - Go to Supabase Dashboard → Storage
   - Empty each bucket or delete and recreate

3. **Run migration again**:
   ```bash
   npx tsx scripts/setup-storage-buckets.ts
   npx tsx scripts/migrate-airtable.ts
   ```

## Troubleshooting

### "Failed to migrate image/attachment"
- Check that the Airtable URLs are still valid
- Verify Supabase storage buckets exist and are public
- Check service role key has storage permissions

### "Bucket already exists"
- This is normal if re-running setup
- The script will skip existing buckets

### Migration takes too long
- Large images/attachments take time to download/upload
- Each file is processed individually for reliability
- Progress is logged in the console

## Storage Structure

### project-documents/
```
{project_id}/
  ├── {timestamp}_{filename1}.pdf
  ├── {timestamp}_{filename2}.jpg
  └── ...
```

### item-images/
```
{item_airtable_id}/
  ├── {timestamp}_{image1}.jpg
  ├── {timestamp}_{image2}.png
  └── ...
```

### static-info-files/
```
{static_info_airtable_id}/
  ├── {timestamp}_{file1}.pdf
  ├── {timestamp}_{file2}.jpg
  └── ...
```

## Database Schema Updates

The migration expects these fields to exist:

**items table:**
```sql
image_urls TEXT[] -- Array of permanent Supabase Storage URLs
```

**static_info table:**
```sql
image_urls TEXT[] -- Array of permanent Supabase Storage URLs
```

These should already be set up in your database schema.
