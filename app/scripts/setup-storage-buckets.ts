import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import * as path from 'path';

// Load .env.local from the app directory
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function setupStorageBuckets() {
  console.log('🗄️  Setting up Supabase Storage buckets...\n');

  const buckets = [
    { name: 'project-documents', public: true },
    { name: 'item-images', public: true },
    { name: 'static-info-files', public: true },
  ];

  for (const bucket of buckets) {
    console.log(`Creating bucket: ${bucket.name}...`);

    // Check if bucket exists
    const { data: existingBuckets } = await supabase.storage.listBuckets();
    const bucketExists = existingBuckets?.some(b => b.name === bucket.name);

    if (bucketExists) {
      console.log(`  ✅ Bucket '${bucket.name}' already exists`);
      continue;
    }

    // Create bucket
    const { data, error } = await supabase.storage.createBucket(bucket.name, {
      public: bucket.public,
      fileSizeLimit: 52428800, // 50MB
      allowedMimeTypes: [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/svg+xml',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
        'application/zip',
      ],
    });

    if (error) {
      console.error(`  ❌ Failed to create bucket '${bucket.name}':`, error.message);
    } else {
      console.log(`  ✅ Created bucket '${bucket.name}'`);
    }
  }

  console.log('\n✅ Storage bucket setup completed!');
}

setupStorageBuckets().catch(error => {
  console.error('❌ Setup failed:', error);
  process.exit(1);
});
