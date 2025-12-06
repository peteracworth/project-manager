# Supabase Storage Setup for Attachments

Follow these steps to set up the storage bucket for project attachments:

## 1. Create Storage Bucket

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **Storage** in the left sidebar
4. Click **"New bucket"**
5. Configure the bucket:
   - **Name**: `project-documents`
   - **Public bucket**: ✅ **Check this box** (important!)
   - **File size limit**: Set as needed (e.g., 50MB)
   - **Allowed MIME types**: Leave empty or specify (e.g., `image/*,application/pdf`)
6. Click **Create bucket**

## 2. Set Up Storage Policies

After creating the bucket, you need to add policies to allow authenticated users to upload and delete files:

### Go to Policies Tab
1. In the Storage section, click on your `project-documents` bucket
2. Click on **Policies** tab
3. Click **"New Policy"**

### Policy 1: Allow Authenticated Uploads
- **Policy name**: `Allow authenticated uploads`
- **Allowed operation**: `INSERT`
- **Policy definition**:
```sql
(bucket_id = 'project-documents'::text) AND (auth.role() = 'authenticated'::text)
```

### Policy 2: Allow Authenticated Updates
- **Policy name**: `Allow authenticated updates`
- **Allowed operation**: `UPDATE`
- **Policy definition**:
```sql
(bucket_id = 'project-documents'::text) AND (auth.role() = 'authenticated'::text)
```

### Policy 3: Allow Authenticated Deletes
- **Policy name**: `Allow authenticated deletes`
- **Allowed operation**: `DELETE`
- **Policy definition**:
```sql
(bucket_id = 'project-documents'::text) AND (auth.role() = 'authenticated'::text)
```

### Policy 4: Allow Public Reads (for viewing images)
- **Policy name**: `Allow public reads`
- **Allowed operation**: `SELECT`
- **Policy definition**:
```sql
bucket_id = 'project-documents'::text
```

## 3. Alternative: Quick Setup via SQL

You can also run this SQL in the Supabase SQL Editor to set up everything at once:

```sql
-- Note: The bucket must be created via the UI first (see step 1 above)

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

-- Allow anyone to view/download (since bucket is public)
CREATE POLICY "Allow public reads" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'project-documents');
```

## 4. Verify Setup

After setup, test by:
1. Uploading a file through the application
2. Checking that the thumbnail displays correctly
3. Trying to delete a file

## Troubleshooting

### If uploads still fail:
- Make sure you're authenticated in the application
- Check browser console for specific error messages
- Verify the bucket name is exactly `project-documents`

### If thumbnails don't show:
- Make sure the bucket is marked as **Public**
- Check that the "Allow public reads" policy is enabled
- Verify files are actually in the bucket (check Storage > project-documents)

### If you get "bucket does not exist":
- The bucket name in the code must match exactly: `project-documents`
- Recreate the bucket following step 1
