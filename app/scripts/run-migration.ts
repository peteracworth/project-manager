import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function runMigration() {
  console.log('🚀 Running projects table migration...\n');

  // Step 1: Copy data from status to task_progress
  console.log('Step 1: Copying status → task_progress...');
  const { error: updateError } = await supabase
    .from('projects')
    .update({ task_progress: supabase.rpc('get_status_value') })
    .is('task_progress', null);

  // Since we can't do UPDATE with column reference easily via JS client,
  // let's do it row by row
  const { data: projects, error: fetchError } = await supabase
    .from('projects')
    .select('id, status, task_progress');

  if (fetchError) {
    console.error('Error fetching projects:', fetchError.message);
    return;
  }

  let updatedCount = 0;
  for (const project of projects || []) {
    if (project.status && (!project.task_progress || project.task_progress === '')) {
      const { error } = await supabase
        .from('projects')
        .update({ task_progress: project.status })
        .eq('id', project.id);
      
      if (!error) {
        updatedCount++;
      } else {
        console.error(`  Error updating ${project.id}:`, error.message);
      }
    }
  }
  console.log(`  ✅ Updated ${updatedCount} projects\n`);

  // Step 2: Verify the copy
  console.log('Step 2: Verifying data copy...');
  const { data: verify, error: verifyError } = await supabase
    .from('projects')
    .select('title, status, task_progress')
    .limit(5);

  if (verify) {
    verify.forEach(p => {
      console.log(`  "${p.title?.substring(0, 30)}": status="${p.status}" → task_progress="${p.task_progress}"`);
    });
  }

  // Step 3: Check if all data was copied
  const { data: check } = await supabase
    .from('projects')
    .select('id')
    .or('task_progress.is.null,task_progress.eq.');

  if (check && check.length > 0) {
    console.log(`\n⚠️  Warning: ${check.length} projects still have empty task_progress`);
  } else {
    console.log('\n✅ All projects have task_progress set');
  }

  console.log('\n📋 Migration data copy complete!');
  console.log('\nNow run this SQL in Supabase to drop the old columns:');
  console.log('─'.repeat(50));
  console.log(`
ALTER TABLE projects DROP COLUMN IF EXISTS status;
ALTER TABLE projects DROP COLUMN IF EXISTS start_date;
ALTER TABLE projects DROP COLUMN IF EXISTS end_date;
ALTER TABLE projects DROP COLUMN IF EXISTS location;
ALTER TABLE projects DROP COLUMN IF EXISTS details;
  `);
}

runMigration().catch(console.error);


