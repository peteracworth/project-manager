import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import * as path from 'path';

// Load .env.local from the app directory
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const AIRTABLE_PAT = process.env.AIRTABLE_PAT!;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID!;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface AirtableRecord {
  id: string;
  createdTime: string;
  fields: Record<string, any>;
}

interface AirtableResponse {
  records: AirtableRecord[];
  offset?: string;
}

// Fetch all records from an Airtable table with pagination
async function fetchAllAirtableRecords(tableName: string): Promise<AirtableRecord[]> {
  const allRecords: AirtableRecord[] = [];
  let offset: string | undefined;

  do {
    const url = new URL(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}`);
    if (offset) url.searchParams.set('offset', offset);

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${AIRTABLE_PAT}` },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${tableName}: ${response.statusText}`);
    }

    const data: AirtableResponse = await response.json();
    allRecords.push(...data.records);
    offset = data.offset;

    console.log(`  Fetched ${data.records.length} records from ${tableName} (total: ${allRecords.length})`);
  } while (offset);

  return allRecords;
}

// Clear all data from database tables before migration
async function clearAllData() {
  console.log('🗑️  Clearing existing data from database...\n');

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

    console.log('\n✅ All existing data cleared successfully!\n');
  } catch (error) {
    console.error('❌ Error clearing data:', error);
    throw error;
  }
}

// Download and upload attachments to Supabase Storage
async function migrateAttachment(url: string, filename: string, projectId: string): Promise<string> {
  try {
    // Download from Airtable
    const response = await fetch(url);
    const blob = await response.blob();

    // Generate unique filename
    const timestamp = Date.now();
    const safeName = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `${projectId}/${timestamp}_${safeName}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('project-documents')
      .upload(storagePath, blob, {
        contentType: blob.type,
        upsert: false,
      });

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('project-documents')
      .getPublicUrl(storagePath);

    return publicUrl;
  } catch (error) {
    console.error(`  ⚠️  Failed to migrate attachment ${filename}:`, error);
    return url; // Fallback to original URL
  }
}

async function migrateContacts() {
  console.log('\n📇 Migrating Contacts → Users...');
  const contacts = await fetchAllAirtableRecords('Contacts');

  const userIdMap = new Map<string, string>(); // Airtable ID → Supabase UUID

  for (const contact of contacts) {
    const { fields } = contact;

    // Generate email if not provided
    const email = fields.Email || `${fields.Name?.replace(/\s+/g, '_').toLowerCase()}@placeholder.com`;

    const userData = {
      email,
      name: fields.Name || 'Unknown',
      phone: fields.Phone || null,
      contact_type: fields.Type || null,
      role: fields.Type === 'Team' ? (fields.Role || 'member') : 'vendor',
      service_type: fields['Service Type'] || null,
    };

    const { data, error } = await supabase
      .from('users')
      .insert(userData)
      .select('id')
      .single();

    if (error) {
      console.error(`  ❌ Failed to insert ${fields.Name}:`, error.message);
    } else {
      userIdMap.set(contact.id, data.id);
      console.log(`  ✅ Migrated: ${fields.Name}`);
    }
  }

  console.log(`\n✅ Migrated ${userIdMap.size}/${contacts.length} contacts`);
  return userIdMap;
}

async function migrateTaskList(userIdMap: Map<string, string>) {
  console.log('\n📋 Migrating Task List → Projects...');
  const tasks = await fetchAllAirtableRecords('Task List');

  const projectIdMap = new Map<string, string>(); // Airtable ID → Supabase UUID

  for (const task of tasks) {
    const { fields } = task;

    const projectData = {
      title: fields.Title || 'Untitled',
      description: fields.Details || null,
      task_progress: fields['Task Progress'] || 'Not Started', // Maps to Airtable "Task Progress"
      priority: fields.Priority || null,
      project_area: fields['Project Area'] || null, // Specific area
      tags: fields.Tags ? [fields.Tags] : [], // Actual Tags field from Airtable
      depends_on: [], // Will be populated after all projects are created
      blocking: fields.Blocking || [], // Airtable IDs - will be converted later
      blocked_by: fields['Blocked By'] || [], // Airtable IDs - will be converted later
      due_date: fields['Due Date'] || null, // Due Date from Airtable
      created_at: task.createdTime,
      updated_at: task.createdTime,
      created_by: 'airtable_migration',
      progress: 0,
    };

    const { data, error } = await supabase
      .from('projects')
      .insert(projectData)
      .select('id')
      .single();

    if (error) {
      console.error(`  ❌ Failed to insert ${fields.Title}:`, error.message);
      continue;
    }

    projectIdMap.set(task.id, data.id);
    console.log(`  ✅ Migrated: ${fields.Title}`);

    // Create project assignments
    if (fields['Team Roster'] && Array.isArray(fields['Team Roster'])) {
      for (const airtableUserId of fields['Team Roster']) {
        const supabaseUserId = userIdMap.get(airtableUserId);
        if (supabaseUserId) {
          await supabase.from('project_assignments').insert({
            project_id: data.id,
            user_id: supabaseUserId,
            role: 'contributor',
          });
        }
      }
    }

    // Migrate attachments
    if (fields.Attachments && Array.isArray(fields.Attachments)) {
      for (const attachment of fields.Attachments) {
        const publicUrl = await migrateAttachment(attachment.url, attachment.filename, data.id);

        await supabase.from('documents').insert({
          project_id: data.id,
          filename: attachment.filename,
          file_type: attachment.type,
          file_size: attachment.size,
          storage_path: publicUrl,
          storage_url: publicUrl,
          thumbnail_url: attachment.thumbnails?.large?.url || null,
          uploaded_by: userIdMap.get(fields['Team Roster']?.[0]) || null,
        });
      }
    }
  }

  console.log(`\n✅ Migrated ${projectIdMap.size}/${tasks.length} tasks`);

  // Second pass: Update blocking/blocked_by relationships with Supabase UUIDs
  console.log('\n🔗 Updating project dependencies...');
  let updatedCount = 0;

  for (const task of tasks) {
    const supabaseProjectId = projectIdMap.get(task.id);
    if (!supabaseProjectId) continue;

    const { fields } = task;
    const updates: any = {};
    let hasUpdates = false;

    // Convert Blocking array from Airtable IDs to Supabase UUIDs
    if (fields.Blocking && Array.isArray(fields.Blocking)) {
      const blockingUuids = fields.Blocking
        .map((airtableId: string) => projectIdMap.get(airtableId))
        .filter((uuid): uuid is string => uuid !== undefined);

      if (blockingUuids.length > 0) {
        updates.blocking = blockingUuids;
        hasUpdates = true;
      }
    }

    // Convert Blocked By array from Airtable IDs to Supabase UUIDs
    if (fields['Blocked By'] && Array.isArray(fields['Blocked By'])) {
      const blockedByUuids = fields['Blocked By']
        .map((airtableId: string) => projectIdMap.get(airtableId))
        .filter((uuid): uuid is string => uuid !== undefined);

      if (blockedByUuids.length > 0) {
        updates.blocked_by = blockedByUuids;
        hasUpdates = true;
      }
    }

    if (hasUpdates) {
      const { error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', supabaseProjectId);

      if (!error) {
        updatedCount++;
      } else {
        console.error(`  ⚠️  Failed to update dependencies for ${fields.Title}: ${error.message}`);
      }
    }
  }

  console.log(`✅ Updated dependencies for ${updatedCount} projects`);

  return projectIdMap;
}

// Download and upload item images to Supabase Storage
async function migrateItemImage(url: string, filename: string, itemId: string): Promise<string> {
  try {
    // Download from Airtable
    const response = await fetch(url);
    const blob = await response.blob();

    // Generate unique filename
    const timestamp = Date.now();
    const safeName = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `${itemId}/${timestamp}_${safeName}`;

    // Upload to Supabase Storage (items bucket)
    const { data, error } = await supabase.storage
      .from('item-images')
      .upload(storagePath, blob, {
        contentType: blob.type,
        upsert: false,
      });

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('item-images')
      .getPublicUrl(storagePath);

    return publicUrl;
  } catch (error) {
    console.error(`  ⚠️  Failed to migrate image ${filename}:`, error);
    return url; // Fallback to original URL
  }
}

async function migrateItemsAndPurchases(userIdMap: Map<string, string>) {
  console.log('\n🛒 Migrating Items & Purchases...');
  const items = await fetchAllAirtableRecords('Items & Purchases');

  for (const item of items) {
    const { fields } = item;

    // Get vendor ID if linked
    const vendorId = fields.Vendor?.[0] ? userIdMap.get(fields.Vendor[0]) : null;

    // Download and migrate images to Supabase Storage
    const imageUrls: string[] = [];
    if (fields.Image && Array.isArray(fields.Image)) {
      console.log(`  📸 Migrating ${fields.Image.length} image(s) for ${fields['Item Name']}...`);
      for (const img of fields.Image) {
        const publicUrl = await migrateItemImage(img.url, img.filename, item.id);
        imageUrls.push(publicUrl);
      }
    }

    const itemData = {
      item_name: fields['Item Name'] || 'Unnamed Item',
      details: fields.Details || null,
      category: fields.Category || null,
      room_space: fields['Room/Space'] || null,
      sheen: fields.Sheen || null,
      estimate: fields['$ Estimate'] || null,
      notes: fields.Notes || null,
      link: fields.Link || null,
      is_suggestion: fields.suggestion || false,
      is_rejected: fields['Rejected Item'] || false,
      vendor_id: vendorId,
      image_urls: imageUrls,
    };

    const { error } = await supabase.from('items').insert(itemData);

    if (error) {
      console.error(`  ❌ Failed to insert ${fields['Item Name']}:`, error.message);
    } else {
      console.log(`  ✅ Migrated: ${fields['Item Name']} (${imageUrls.length} images)`);
    }
  }

  console.log(`\n✅ Migrated ${items.length} items`);
}

// Download and upload static info attachments to Supabase Storage
async function migrateStaticInfoAttachment(url: string, filename: string, staticInfoId: string): Promise<string> {
  try {
    // Download from Airtable
    const response = await fetch(url);
    const blob = await response.blob();

    // Generate unique filename
    const timestamp = Date.now();
    const safeName = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `${staticInfoId}/${timestamp}_${safeName}`;

    // Upload to Supabase Storage (static-info bucket)
    const { data, error } = await supabase.storage
      .from('static-info-files')
      .upload(storagePath, blob, {
        contentType: blob.type,
        upsert: false,
      });

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('static-info-files')
      .getPublicUrl(storagePath);

    return publicUrl;
  } catch (error) {
    console.error(`  ⚠️  Failed to migrate attachment ${filename}:`, error);
    return url; // Fallback to original URL
  }
}

async function migrateStaticInformation() {
  console.log('\n📚 Migrating Static Information...');
  const staticInfo = await fetchAllAirtableRecords('Static Information');

  for (const info of staticInfo) {
    const { fields } = info;

    // Download and migrate attachments to Supabase Storage
    const attachmentUrls: string[] = [];
    if (fields.Attachment && Array.isArray(fields.Attachment)) {
      console.log(`  📎 Migrating ${fields.Attachment.length} attachment(s) for ${fields.Name}...`);
      for (const attachment of fields.Attachment) {
        const publicUrl = await migrateStaticInfoAttachment(attachment.url, attachment.filename, info.id);
        attachmentUrls.push(publicUrl);
      }
    }

    const staticData = {
      key: fields.Name || `static_${info.id}`,
      value: fields.Description || '',
      category: fields.Select || 'General',
      description: fields.Notes || null, // Use Notes field for description, not attachment URLs
      image_urls: attachmentUrls, // Store permanent URLs in image_urls array
    };

    const { error } = await supabase.from('static_info').insert(staticData);

    if (error) {
      console.error(`  ❌ Failed to insert ${fields.Name}:`, error.message);
    } else {
      console.log(`  ✅ Migrated: ${fields.Name || 'Static entry'} (${attachmentUrls.length} attachments)`);
    }
  }

  console.log(`\n✅ Migrated ${staticInfo.length} static information records`);
}

async function main() {
  console.log('🚀 Starting Airtable to Supabase migration...\n');
  console.log(`Airtable Base: ${AIRTABLE_BASE_ID}`);
  console.log(`Supabase URL: ${SUPABASE_URL}\n`);

  try {
    // Step 0: Clear all existing data to avoid duplicates
    await clearAllData();

    // Step 1: Migrate Contacts first (to get user IDs for relationships)
    const userIdMap = await migrateContacts();

    // Step 2: Migrate Task List (creates projects and assignments)
    const projectIdMap = await migrateTaskList(userIdMap);

    // Step 3: Migrate Items & Purchases
    await migrateItemsAndPurchases(userIdMap);

    // Step 4: Migrate Static Information
    await migrateStaticInformation();

    console.log('\n✅ Migration completed successfully!');
    console.log(`\nSummary:`);
    console.log(`  - ${userIdMap.size} users migrated`);
    console.log(`  - ${projectIdMap.size} projects migrated`);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

main();
