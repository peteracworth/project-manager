import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import * as path from 'path';

// Load .env.local from the app directory
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function clearAllData() {
  console.log('🗑️  Clearing all data from database...\n');

  try {
    // Delete in correct order to respect foreign key constraints
    console.log('Deleting project_assignments...');
    const { error: assignments } = await supabase
      .from('project_assignments')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    if (assignments) console.error('Error:', assignments.message);
    else console.log('✅ Cleared project_assignments');

    console.log('Deleting documents...');
    const { error: documents } = await supabase
      .from('documents')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (documents) console.error('Error:', documents.message);
    else console.log('✅ Cleared documents');

    console.log('Deleting messages...');
    const { error: messages } = await supabase
      .from('messages')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (messages) console.error('Error:', messages.message);
    else console.log('✅ Cleared messages');

    console.log('Deleting projects...');
    const { error: projects } = await supabase
      .from('projects')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (projects) console.error('Error:', projects.message);
    else console.log('✅ Cleared projects');

    console.log('Deleting items...');
    const { error: items } = await supabase
      .from('items')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (items) console.error('Error:', items.message);
    else console.log('✅ Cleared items');

    console.log('Deleting static_info...');
    const { error: staticInfo } = await supabase
      .from('static_info')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (staticInfo) console.error('Error:', staticInfo.message);
    else console.log('✅ Cleared static_info');

    console.log('Deleting users...');
    const { error: users } = await supabase
      .from('users')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (users) console.error('Error:', users.message);
    else console.log('✅ Cleared users');

    console.log('\n✅ All data cleared successfully!');
    console.log('\nNote: Storage buckets and files have NOT been cleared.');
    console.log('If you want to clear storage files as well, do it manually in Supabase Dashboard.');
  } catch (error) {
    console.error('❌ Error clearing data:', error);
    process.exit(1);
  }
}

clearAllData();
