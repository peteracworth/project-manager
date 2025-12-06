import * as dotenv from 'dotenv';
import { Pool } from 'pg';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const DATABASE_URL = process.env.DATABASE_URL!;

// Convert pooler URL to direct connection (port 5432 instead of 6543, remove pgbouncer param)
function getDirectConnectionUrl(url: string): string {
  let directUrl = url
    .replace(':6543/', ':5432/')
    .replace('?pgbouncer=true', '');
  return directUrl;
}

async function runMigration() {
  console.log('🚀 Adding missing fields to database...\n');

  const directUrl = getDirectConnectionUrl(DATABASE_URL);
  console.log('Using direct connection (bypassing pgbouncer for DDL)...\n');

  const pool = new Pool({
    connectionString: directUrl,
    ssl: { rejectUnauthorized: false }
  });

  const alterStatements = [
    // Projects
    { table: 'projects', column: 'additional_notes', sql: 'ALTER TABLE projects ADD COLUMN IF NOT EXISTS additional_notes TEXT' },
    { table: 'projects', column: 'project_name', sql: 'ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_name TEXT' },
    { table: 'projects', column: 'who_buys', sql: 'ALTER TABLE projects ADD COLUMN IF NOT EXISTS who_buys TEXT[]' },
    
    // Users
    { table: 'users', column: 'notes', sql: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS notes TEXT' },
    { table: 'users', column: 'attachment_urls', sql: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS attachment_urls TEXT[]' },
    { table: 'users', column: 'website', sql: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS website TEXT' },
    { table: 'users', column: 'license_number', sql: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS license_number TEXT' },
    { table: 'users', column: 'contact_name', sql: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS contact_name TEXT' },
    { table: 'users', column: 'product_types', sql: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS product_types TEXT[]' },
    { table: 'users', column: 'item_types', sql: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS item_types TEXT[]' },
    { table: 'users', column: 'location', sql: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS location TEXT' },
    
    // Items
    { table: 'items', column: 'size_dimensions', sql: 'ALTER TABLE items ADD COLUMN IF NOT EXISTS size_dimensions TEXT' },
    { table: 'items', column: 'inside_panel_width', sql: 'ALTER TABLE items ADD COLUMN IF NOT EXISTS inside_panel_width TEXT' },
    { table: 'items', column: 'product_id', sql: 'ALTER TABLE items ADD COLUMN IF NOT EXISTS product_id TEXT' },
    { table: 'items', column: 'quantity', sql: 'ALTER TABLE items ADD COLUMN IF NOT EXISTS quantity INTEGER' },
    { table: 'items', column: 'purchase_price', sql: 'ALTER TABLE items ADD COLUMN IF NOT EXISTS purchase_price DECIMAL(10, 2)' },
    { table: 'items', column: 'purchase_date', sql: 'ALTER TABLE items ADD COLUMN IF NOT EXISTS purchase_date TIMESTAMP WITH TIME ZONE' },
    { table: 'items', column: 'actual_dimensions', sql: 'ALTER TABLE items ADD COLUMN IF NOT EXISTS actual_dimensions TEXT' },
    { table: 'items', column: 'spec_sheet_urls', sql: 'ALTER TABLE items ADD COLUMN IF NOT EXISTS spec_sheet_urls TEXT[]' },
    { table: 'items', column: 'status', sql: 'ALTER TABLE items ADD COLUMN IF NOT EXISTS status TEXT' },
    { table: 'items', column: 'project_id', sql: 'ALTER TABLE items ADD COLUMN IF NOT EXISTS project_id UUID' },
    
    // Static Info
    { table: 'static_info', column: 'website_link', sql: 'ALTER TABLE static_info ADD COLUMN IF NOT EXISTS website_link TEXT' },
  ];

  let successCount = 0;
  let errorCount = 0;

  const client = await pool.connect();
  
  try {
    for (const stmt of alterStatements) {
      try {
        await client.query(stmt.sql);
        console.log(`  ✅ ${stmt.table}.${stmt.column}`);
        successCount++;
      } catch (err: any) {
        console.log(`  ❌ ${stmt.table}.${stmt.column}: ${err.message}`);
        errorCount++;
      }
    }

    console.log(`\n📊 Migration Summary:`);
    console.log(`  ✅ Success: ${successCount}`);
    console.log(`  ❌ Errors: ${errorCount}`);
    
    // Verify the changes by listing columns
    console.log('\n📋 Verifying table structures...\n');
    
    for (const table of ['projects', 'users', 'items', 'static_info']) {
      const result = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = $1 
          AND table_schema = 'public'
        ORDER BY ordinal_position
      `, [table]);
      
      console.log(`${table.toUpperCase()} (${result.rows.length} columns):`);
      result.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type}`);
      });
      console.log('');
    }
    
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(console.error);
