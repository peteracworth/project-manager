# Attachments Feature Setup Checklist

Follow these steps to fix the broken thumbnails and RLS errors:

## Step 1: Create Storage Bucket ✅

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Storage** → **"New bucket"**
4. Configuration:
   - Name: `project-documents`
   - **✅ Check "Public bucket"** (IMPORTANT!)
   - File size limit: 50MB (or as needed)
5. Click **Create bucket**

## Step 2: Set Storage Policies ✅

In the Storage section, click on `project-documents` bucket → **Policies** tab:

### Quick Method (via UI):
Create 4 policies:

1. **Allow authenticated uploads** (INSERT)
   ```sql
   (bucket_id = 'project-documents'::text) AND (auth.role() = 'authenticated'::text)
   ```

2. **Allow authenticated updates** (UPDATE)
   ```sql
   (bucket_id = 'project-documents'::text) AND (auth.role() = 'authenticated'::text)
   ```

3. **Allow authenticated deletes** (DELETE)
   ```sql
   (bucket_id = 'project-documents'::text) AND (auth.role() = 'authenticated'::text)
   ```

4. **Allow public reads** (SELECT)
   ```sql
   bucket_id = 'project-documents'::text
   ```

### Alternative: SQL Editor Method
Navigate to **SQL Editor** and run:

```sql
-- Allow authenticated users to upload
CREATE POLICY "Allow authenticated uploads" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'project-documents');

-- Allow authenticated users to update
CREATE POLICY "Allow authenticated updates" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'project-documents');

-- Allow authenticated users to delete
CREATE POLICY "Allow authenticated deletes" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'project-documents');

-- Allow anyone to view (for public bucket)
CREATE POLICY "Allow public reads" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'project-documents');
```

## Step 3: Set Documents Table RLS Policies ✅

Navigate to **SQL Editor** and run the contents of `DOCUMENTS_RLS_SETUP.sql`:

```sql
-- Enable RLS on documents table
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view all documents
CREATE POLICY "Allow authenticated users to view documents"
ON documents FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to insert documents
CREATE POLICY "Allow authenticated users to insert documents"
ON documents FOR INSERT TO authenticated WITH CHECK (true);

-- Allow authenticated users to delete documents
CREATE POLICY "Allow authenticated users to delete documents"
ON documents FOR DELETE TO authenticated USING (true);
```

## Step 4: Verify Setup ✅

1. Refresh your application
2. Try uploading an image file
3. Check that:
   - Upload succeeds without errors
   - Thumbnail appears in the attachments column
   - You can click to view the full attachment
   - You can delete attachments

## Troubleshooting

### If you still get "new row violates row-level security policy":
- Make sure you ran the SQL in Step 3
- Check that RLS is enabled on the `documents` table
- Verify you're logged in as an authenticated user

### If thumbnails are still broken:
- Verify the bucket is marked as **Public**
- Check that the "Allow public reads" policy exists
- Try clearing your browser cache

### If uploads fail at the storage level:
- Double-check the bucket name is exactly `project-documents`
- Ensure storage policies from Step 2 are created
- Check the browser console for detailed error messages

## Common Errors and Fixes

| Error | Fix |
|-------|-----|
| "new row violates row-level security policy" | Run Step 3 SQL (documents table RLS) |
| "Bucket not found" | Create bucket in Step 1 |
| Broken image thumbnails | Mark bucket as Public in Step 1 |
| "Permission denied" on upload | Create storage policies in Step 2 |

## After Setup

Once everything is working:
1. Thumbnails will show automatically for image files (.jpg, .png, .gif, .webp, .svg)
2. Non-image files will show a file type badge
3. You can upload multiple files at once
4. Files are organized by project ID in the storage bucket
