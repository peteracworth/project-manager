import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  // Users
  const { data: users } = await supabase.from('users').select('role, contact_type, service_type');
  console.log('=== USERS ===');
  console.log('role:', [...new Set(users?.map(u => u.role).filter(Boolean))].sort());
  console.log('contact_type:', [...new Set(users?.map(u => u.contact_type).filter(Boolean))].sort());
  console.log('service_type:', [...new Set(users?.map(u => u.service_type).filter(Boolean))].sort());
  
  // Projects  
  const { data: projects } = await supabase.from('projects').select('task_progress, priority, project_area, project_name, tags');
  console.log('\n=== PROJECTS ===');
  console.log('task_progress:', [...new Set(projects?.map(p => p.task_progress).filter(Boolean))].sort());
  console.log('priority:', [...new Set(projects?.map(p => p.priority).filter(Boolean))].sort());
  console.log('project_area:', [...new Set(projects?.map(p => p.project_area).filter(Boolean))].sort());
  console.log('project_name:', [...new Set(projects?.map(p => p.project_name).filter(Boolean))].sort());
  const allTags = projects?.flatMap(p => p.tags || []).filter(Boolean) || [];
  console.log('tags:', [...new Set(allTags)].sort());
  
  // Items
  const { data: items } = await supabase.from('items').select('category, room_space, status');
  console.log('\n=== ITEMS ===');
  console.log('category:', [...new Set(items?.map(i => i.category).filter(Boolean))].sort());
  console.log('room_space:', [...new Set(items?.map(i => i.room_space).filter(Boolean))].sort());
  console.log('status:', [...new Set(items?.map(i => i.status).filter(Boolean))].sort());
  
  // Static info
  const { data: staticInfo } = await supabase.from('static_info').select('category');
  console.log('\n=== STATIC INFO ===');
  console.log('category:', [...new Set(staticInfo?.map(s => s.category).filter(Boolean))].sort());
  
  // Project assignments
  const { data: assignments } = await supabase.from('project_assignments').select('role');
  console.log('\n=== PROJECT ASSIGNMENTS ===');
  console.log('role:', [...new Set(assignments?.map(a => a.role).filter(Boolean))].sort());
}

main();

