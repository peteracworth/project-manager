import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import * as path from 'path';

// Load .env.local from the app directory
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function inspectDatabase() {
  console.log('🔍 Inspecting Supabase database...\n');

  // Get projects table schema
  const { data: columns, error: schemaError } = await supabase
    .rpc('get_table_columns', { table_name: 'projects' })
    .select('*');

  if (schemaError) {
    // Fallback: query information_schema directly
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Error fetching projects:', error.message);
    } else if (data && data.length > 0) {
      console.log('📋 PROJECTS TABLE - Columns found in data:');
      console.log('=' .repeat(50));
      const cols = Object.keys(data[0]);
      cols.forEach(col => {
        const value = data[0][col];
        const type = value === null ? 'null' : typeof value;
        console.log(`  ${col}: ${type} = ${JSON.stringify(value)?.substring(0, 50)}`);
      });
    }
  }

  // Get sample projects data
  console.log('\n📊 PROJECTS TABLE - Sample Data:');
  console.log('=' .repeat(50));
  
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('*')
    .limit(3);

  if (projectsError) {
    console.error('Error:', projectsError.message);
  } else if (projects) {
    projects.forEach((p, i) => {
      console.log(`\n--- Project ${i + 1}: ${p.title} ---`);
      Object.entries(p).forEach(([key, value]) => {
        if (value !== null && value !== '' && (!Array.isArray(value) || value.length > 0)) {
          const displayValue = typeof value === 'string' && value.length > 60 
            ? value.substring(0, 60) + '...' 
            : JSON.stringify(value);
          console.log(`  ${key}: ${displayValue}`);
        }
      });
    });
  }

  // List all columns with their values to see what exists
  console.log('\n📋 ALL COLUMNS IN PROJECTS TABLE:');
  console.log('=' .repeat(50));
  
  if (projects && projects.length > 0) {
    const allKeys = Object.keys(projects[0]);
    allKeys.sort().forEach(key => {
      const hasData = projects.some(p => p[key] !== null && p[key] !== '' && (!Array.isArray(p[key]) || p[key].length > 0));
      console.log(`  ${key}: ${hasData ? '✅ has data' : '⚪ empty/null'}`);
    });
  }
}

inspectDatabase().catch(console.error);


