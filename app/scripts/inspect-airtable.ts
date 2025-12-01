import 'dotenv/config';

const AIRTABLE_PAT = process.env.AIRTABLE_PAT!;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID!;

async function inspectAirtable() {
  try {
    console.log('🔍 Inspecting Airtable base:', AIRTABLE_BASE_ID);
    console.log('');

    // Get base schema
    const schemaResponse = await fetch(
      `https://api.airtable.com/v0/meta/bases/${AIRTABLE_BASE_ID}/tables`,
      {
        headers: {
          Authorization: `Bearer ${AIRTABLE_PAT}`,
        },
      }
    );

    if (!schemaResponse.ok) {
      throw new Error(`Failed to fetch schema: ${schemaResponse.statusText}`);
    }

    const schemaData = await schemaResponse.json();

    console.log(`Found ${schemaData.tables.length} tables:\n`);

    for (const table of schemaData.tables) {
      console.log(`📋 Table: ${table.name} (ID: ${table.id})`);
      console.log(`   Fields (${table.fields.length}):`);

      for (const field of table.fields) {
        console.log(`   - ${field.name}`);
        console.log(`     Type: ${field.type}`);
        if (field.options) {
          console.log(`     Options:`, JSON.stringify(field.options, null, 2).split('\n').join('\n     '));
        }
      }
      console.log('');
    }

    // Get sample records from each table
    console.log('\n📊 Sample Records:\n');

    for (const table of schemaData.tables) {
      const recordsResponse = await fetch(
        `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${table.id}?maxRecords=3`,
        {
          headers: {
            Authorization: `Bearer ${AIRTABLE_PAT}`,
          },
        }
      );

      if (recordsResponse.ok) {
        const recordsData = await recordsResponse.json();
        console.log(`Table: ${table.name} (${recordsData.records.length} sample records)`);
        if (recordsData.records.length > 0) {
          console.log('Sample record fields:', Object.keys(recordsData.records[0].fields));
        }
        console.log('');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

inspectAirtable();
