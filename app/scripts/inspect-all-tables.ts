import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function inspectTable(tableName: string) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`📋 TABLE: ${tableName.toUpperCase()}`);
  console.log('='.repeat(70));

  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .limit(3);

  if (error) {
    console.log(`  ❌ Error: ${error.message}`);
    return;
  }

  if (!data || data.length === 0) {
    console.log('  ⚪ No data found');
    return;
  }

  // Get all columns
  const allColumns = Object.keys(data[0]).sort();
  
  console.log(`\n📊 Columns (${allColumns.length} total):`);
  console.log('-'.repeat(50));
  
  allColumns.forEach(col => {
    const hasData = data.some(row => 
      row[col] !== null && 
      row[col] !== '' && 
      (!Array.isArray(row[col]) || row[col].length > 0)
    );
    const sampleValue = data.find(row => row[col] !== null && row[col] !== '')?.[col];
    const type = sampleValue === null || sampleValue === undefined 
      ? 'unknown' 
      : Array.isArray(sampleValue) 
        ? 'array' 
        : typeof sampleValue;
    
    const status = hasData ? '✅' : '⚪';
    const sample = sampleValue 
      ? ` = ${JSON.stringify(sampleValue).substring(0, 40)}${JSON.stringify(sampleValue).length > 40 ? '...' : ''}`
      : '';
    
    console.log(`  ${status} ${col} (${type})${sample}`);
  });

  // Count total records
  const { count } = await supabase
    .from(tableName)
    .select('*', { count: 'exact', head: true });

  console.log(`\n📈 Total records: ${count || 'unknown'}`);
}

async function inspectAllTables() {
  console.log('🔍 INSPECTING ALL DATABASE TABLES');
  console.log('Generated: ' + new Date().toISOString());

  // Inspect each table
  await inspectTable('users');
  await inspectTable('items');
  await inspectTable('static_info');
  await inspectTable('projects');
  await inspectTable('project_assignments');
  await inspectTable('documents');
  await inspectTable('messages');

  console.log('\n' + '='.repeat(70));
  console.log('✅ Inspection complete');
  console.log('='.repeat(70));
}

inspectAllTables().catch(console.error);


