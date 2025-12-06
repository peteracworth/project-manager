# Complete Fix Guide for Attachments Feature

## Issue Summary
1. **Broken thumbnails**: Storage bucket not configured
2. **Upload error**: `uploaded_by` column is NOT NULL but we weren't providing a value

## Fix Steps (Do these in order)

### Step 1: Create Storage Bucket ✅

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → Your Project
2. Navigate to **Storage** (left sidebar)
3. Click **"New bucket"**
4. Enter name: `project-documents`
5. **✅ IMPORTANT: Check "Public bucket"**
6. Click **Create bucket**

### Step 2: Set Storage Policies ✅

Click on the `project-documents` bucket → **Policies** tab → **New Policy**

Create these 4 policies:

#### Policy 1: Allow authenticated uploads
- Operation: **INSERT**
- Policy definition:
```sql
(bucket_id = 'project-documents'::text) AND (auth.role() = 'authenticated'::text)
```

#### Policy 2: Allow authenticated updates
- Operation: **UPDATE**
- Policy definition:
```sql
(bucket_id = 'project-documents'::text) AND (auth.role() = 'authenticated'::text)
```

#### Policy 3: Allow authenticated deletes
- Operation: **DELETE**
- Policy definition:
```sql
(bucket_id = 'project-documents'::text) AND (auth.role() = 'authenticated'::text)
```

#### Policy 4: Allow public reads
- Operation: **SELECT**
- Policy definition:
```sql
bucket_id = 'project-documents'::text
```

### Step 3: Fix Documents Table Schema ✅

Go to **SQL Editor** and run:

```sql
-- Make uploaded_by nullable
ALTER TABLE documents
ALTER COLUMN uploaded_by DROP NOT NULL;
```

### Step 4: Set Documents Table RLS Policies ✅

In **SQL Editor**, run the SQL from `DOCUMENTS_RLS_SETUP.sql`:

```sql
-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (to avoid conflicts)
DROP POLICY IF EXISTS "Allow authenticated users to view documents" ON documents;
DROP POLICY IF EXISTS "Allow authenticated users to insert documents" ON documents;
DROP POLICY IF EXISTS "Allow authenticated users to delete documents" ON documents;

-- Create policies
CREATE POLICY "Allow authenticated users to view documents"
ON documents FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert documents"
ON documents FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete documents"
ON documents FOR DELETE TO authenticated USING (true);
```

### Step 5: Verify Setup ✅

1. Refresh your application
2. Try uploading an image
3. Check that:
   - Upload succeeds ✅
   - Thumbnail appears in table ✅
   - You can view and delete attachments ✅

## What I Fixed in the Code

I updated the upload endpoint to include `uploaded_by`:

```typescript
// Get the current user
const { data: { user } } = await supabase.auth.getUser();

// Include uploaded_by in the insert
const { data: document, error: dbError } = await supabase
  .from('documents')
  .insert({
    project_id: projectId,
    filename: file.name,
    file_type: file.type,
    file_size: file.size,
    storage_path: fileName,
    storage_url: urlData.publicUrl,
    uploaded_by: user?.id || null,  // <- Added this
  })
```

## Quick Checklist

- [ ] Step 1: Created `project-documents` bucket (marked as PUBLIC)
- [ ] Step 2: Added 4 storage policies (INSERT, UPDATE, DELETE, SELECT)
- [ ] Step 3: Made `uploaded_by` nullable
- [ ] Step 4: Added documents table RLS policies
- [ ] Step 5: Tested upload and thumbnails work

## After Completing All Steps

You should be able to:
- Upload images → see thumbnails immediately
- Upload PDFs → see file type badge
- View attachments in new tab
- Delete attachments
- No more RLS errors
- No more "uploaded_by" errors
