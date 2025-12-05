import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function fixMigration() {
  console.log('🔧 Fixing projects table migration...\n');

  // Step 1: Fetch all projects with their status
  console.log('Step 1: Fetching all projects...');
  const { data: projects, error: fetchError } = await supabase
    .from('projects')
    .select('id, status, task_progress');

  if (fetchError) {
    console.error('Error fetching projects:', fetchError.message);
    return;
  }

  console.log(`  Found ${projects?.length || 0} projects\n`);

  // Step 2: Fix each project - copy status to task_progress
  console.log('Step 2: Copying status → task_progress for each project...');
  let updatedCount = 0;
  let errorCount = 0;

  for (const project of projects || []) {
    // Only update if status has a valid value
    if (project.status && typeof project.status === 'string' && project.status.length < 100) {
      const { error } = await supabase
        .from('projects')
        .update({ task_progress: project.status })
        .eq('id', project.id);
      
      if (!error) {
        updatedCount++;
        console.log(`  ✅ ${project.id.substring(0, 8)}... → "${project.status}"`);
      } else {
        errorCount++;
        console.error(`  ❌ ${project.id.substring(0, 8)}...: ${error.message}`);
      }
    }
  }
  
  console.log(`\n  Updated: ${updatedCount}, Errors: ${errorCount}\n`);

  // Step 3: Verify the fix
  console.log('Step 3: Verifying data...');
  const { data: verify } = await supabase
    .from('projects')
    .select('title, status, task_progress')
    .limit(5);

  if (verify) {
    console.log('\nSample data after fix:');
    verify.forEach(p => {
      console.log(`  "${p.title?.substring(0, 30)}": status="${p.status}" → task_progress="${p.task_progress}"`);
    });
  }

  console.log('\n✅ Migration fix complete!');
  console.log('\nNow run this SQL in Supabase SQL Editor to drop old columns:');
  console.log('─'.repeat(60));
  console.log(`
ALTER TABLE projects DROP COLUMN IF EXISTS status;
ALTER TABLE projects DROP COLUMN IF EXISTS start_date;
ALTER TABLE projects DROP COLUMN IF EXISTS end_date;
ALTER TABLE projects DROP COLUMN IF EXISTS location;
ALTER TABLE projects DROP COLUMN IF EXISTS details;
`);
}

fixMigration().catch(console.error);


