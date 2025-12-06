/**
 * Clean up project_assignments with null user_ids
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanNullAssignments() {
  console.log('Finding project_assignments with null user_ids...');

  // Find all assignments with null user_ids
  const { data: nullAssignments, error: fetchError } = await supabase
    .from('project_assignments')
    .select('*')
    .is('user_id', null);

  if (fetchError) {
    console.error('Error fetching null assignments:', fetchError);
    return;
  }

  console.log(`Found ${nullAssignments?.length || 0} assignments with null user_ids`);

  if (nullAssignments && nullAssignments.length > 0) {
    console.log('Deleting null assignments...');

    const { error: deleteError } = await supabase
      .from('project_assignments')
      .delete()
      .is('user_id', null);

    if (deleteError) {
      console.error('Error deleting null assignments:', deleteError);
      return;
    }

    console.log('✓ Successfully deleted null assignments');
  } else {
    console.log('✓ No null assignments found - database is clean');
  }
}

cleanNullAssignments()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script error:', error);
    process.exit(1);
  });
