/**
 * Check project assignments in the database
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

async function checkAssignments() {
  console.log('Fetching all project assignments...\n');

  // Get all assignments
  const { data: assignments, error: assignmentsError } = await supabase
    .from('project_assignments')
    .select('*')
    .order('assigned_at', { ascending: false })
    .limit(10);

  if (assignmentsError) {
    console.error('Error fetching assignments:', assignmentsError);
    return;
  }

  console.log(`Found ${assignments?.length || 0} assignments (showing first 10):`);
  console.log(JSON.stringify(assignments, null, 2));

  console.log('\n\nFetching projects with nested assignments...\n');

  // Get projects with nested data
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select(`
      id,
      title,
      project_assignments (
        id,
        user_id,
        role,
        user:users (
          id,
          name,
          email
        )
      )
    `)
    .limit(5);

  if (projectsError) {
    console.error('Error fetching projects:', projectsError);
    return;
  }

  console.log(`Found ${projects?.length || 0} projects (showing first 5 with assignments):`);
  projects?.forEach(p => {
    console.log(`\nProject: ${p.title}`);
    console.log(`  Assignments: ${p.project_assignments?.length || 0}`);
    if (p.project_assignments && p.project_assignments.length > 0) {
      p.project_assignments.forEach((a: any) => {
        console.log(`    - user_id: ${a.user_id}`);
        console.log(`      user object:`, a.user);
      });
    }
  });
}

checkAssignments()
  .then(() => {
    console.log('\n\nDone!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script error:', error);
    process.exit(1);
  });
