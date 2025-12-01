import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function addColumns() {
  console.log('🔧 Adding new columns to projects table...\n');

  try {
    // We'll use raw SQL via a direct query
    // First, let's check the current columns
    const { data: existing, error: checkError } = await supabase
      .from('projects')
      .select('*')
      .limit(1);

    if (checkError) {
      console.error('Error checking table:', checkError);
      return;
    }

    console.log('Current columns:', Object.keys(existing?.[0] || {}));

    // Unfortunately, we can't run ALTER TABLE directly through the Supabase client
    // You'll need to run these SQL commands in the Supabase SQL Editor:
    console.log('\n📝 Please run the following SQL in your Supabase SQL Editor:\n');
    console.log('----------------------------------------');
    console.log('ALTER TABLE projects ADD COLUMN IF NOT EXISTS blocked_by TEXT[];');
    console.log('ALTER TABLE projects ADD COLUMN IF NOT EXISTS blocking TEXT[];');
    console.log('ALTER TABLE projects ADD COLUMN IF NOT EXISTS task_progress TEXT;');
    console.log('----------------------------------------\n');

  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

addColumns();
