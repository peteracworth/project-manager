import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function dropOldColumns() {
  console.log('🗑️  Dropping old columns from projects table...\n');

  // We need to use raw SQL for ALTER TABLE, which requires the postgres connection
  // The JS client doesn't support DDL operations, so we'll verify the data is correct
  // and the user will need to run the ALTER TABLE in SQL Editor

  // First verify the data
  const { data: projects } = await supabase
    .from('projects')
    .select('id, status, task_progress')
    .limit(5);

  console.log('Current data verification:');
  projects?.forEach(p => {
    console.log(`  status="${p.status}" | task_progress="${p.task_progress}"`);
  });

  // Check if any task_progress is still empty
  const { data: empty } = await supabase
    .from('projects')
    .select('id')
    .or('task_progress.is.null,task_progress.eq.');

  if (empty && empty.length > 0) {
    console.log(`\n⚠️  Warning: ${empty.length} projects have empty task_progress`);
  } else {
    console.log('\n✅ All projects have task_progress populated');
  }

  console.log('\n' + '─'.repeat(60));
  console.log('The Supabase JS client cannot run ALTER TABLE commands.');
  console.log('Please run this SQL in your Supabase SQL Editor:');
  console.log('─'.repeat(60));
  console.log(`
ALTER TABLE projects DROP COLUMN IF EXISTS status;
ALTER TABLE projects DROP COLUMN IF EXISTS start_date;
ALTER TABLE projects DROP COLUMN IF EXISTS end_date;
ALTER TABLE projects DROP COLUMN IF EXISTS location;
ALTER TABLE projects DROP COLUMN IF EXISTS details;

-- Verify the result:
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'projects' ORDER BY ordinal_position;
`);
}

dropOldColumns().catch(console.error);


