/**
 * Airtable to Google Sheets Sync Script (with permanent attachments)
 * 
 * This script exports all data from Airtable and syncs it to Google Sheets.
 * Attachments are downloaded to Google Drive for permanent storage.
 * 
 * Run with: npx tsx scripts/sync-airtable-to-sheets.ts
 */

// Load environment variables from .env.local
import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

import { google, sheets_v4, drive_v3 } from "googleapis";
import { Readable } from "stream";

// Configuration
const AIRTABLE_PAT = process.env.AIRTABLE_PAT;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const GOOGLE_SHEETS_ID = process.env.GOOGLE_SHEETS_ID;
const GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID; // Folder for attachments
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

// Airtable table names to sync
const AIRTABLE_TABLES = [
  { name: "Task List", sheetName: "Projects" },
  { name: "Contacts", sheetName: "Contacts" },
  { name: "Items & Purchases", sheetName: "Items" },
  { name: "Static Information", sheetName: "Static Info" },
];

interface AirtableRecord {
  id: string;
  fields: Record<string, any>;
  createdTime: string;
}

interface AirtableResponse {
  records: AirtableRecord[];
  offset?: string;
}

interface AttachmentInfo {
  url: string;
  filename: string;
  type: string;
  driveUrl?: string;
  driveFileId?: string;
}

// Cache for uploaded files (to avoid re-uploading)
const uploadedFilesCache = new Map<string, { driveUrl: string; driveFileId: string }>();

// ============================================
// Google Auth & Clients
// ============================================

let sheetsClient: sheets_v4.Sheets;
let driveClient: drive_v3.Drive;
let attachmentsFolderId: string;

async function initGoogleClients(): Promise<void> {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: GOOGLE_PRIVATE_KEY,
    },
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive",
    ],
  });

  sheetsClient = google.sheets({ version: "v4", auth });
  driveClient = google.drive({ version: "v3", auth });
}

// ============================================
// Google Drive Functions
// ============================================

function getAttachmentsFolderId(): string {
  if (!GOOGLE_DRIVE_FOLDER_ID) {
    throw new Error("Missing GOOGLE_DRIVE_FOLDER_ID environment variable. Set it to the ID of the folder where attachments should be stored.");
  }
  return GOOGLE_DRIVE_FOLDER_ID;
}

async function verifyFolderAccess(): Promise<void> {
  console.log(`  Verifying access to folder ${attachmentsFolderId}...`);
  try {
    const response = await driveClient.files.get({
      fileId: attachmentsFolderId,
      fields: "id, name, mimeType",
      supportsAllDrives: true, // Required for Shared Drives
    });
    console.log(`  ✅ Can access folder: "${response.data.name}"`);
  } catch (error: any) {
    console.error(`  ❌ Cannot access folder!`);
    console.error(`  Error: ${error.message}`);
    console.error(`\n  Troubleshooting:`);
    console.error(`  1. Make sure the folder ID is correct`);
    console.error(`  2. Share the folder with: ${GOOGLE_SERVICE_ACCOUNT_EMAIL}`);
    console.error(`  3. Give the service account "Editor" access`);
    console.error(`  4. If it's in a Shared Drive, add the service account as a member of the Shared Drive`);
    throw new Error("Cannot access the attachments folder. See troubleshooting steps above.");
  }
}

async function createTableSubfolder(tableName: string): Promise<string> {
  const folderName = tableName.replace(/[^a-zA-Z0-9]/g, "_");

  // Check if subfolder already exists
  const searchResponse = await driveClient.files.list({
    q: `name='${folderName}' and '${attachmentsFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id, name)",
    supportsAllDrives: true, // Required for Shared Drives
    includeItemsFromAllDrives: true, // Required for Shared Drives
  });

  if (searchResponse.data.files && searchResponse.data.files.length > 0) {
    return searchResponse.data.files[0].id!;
  }

  // Create new subfolder
  const createResponse = await driveClient.files.create({
    requestBody: {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [attachmentsFolderId],
    },
    fields: "id",
    supportsAllDrives: true, // Required for Shared Drives
  });

  return createResponse.data.id!;
}

async function downloadAndUploadFile(
  airtableUrl: string,
  filename: string,
  folderId: string,
  recordId: string
): Promise<{ driveUrl: string; driveFileId: string }> {
  // Check cache first (using airtable URL as key since filename might not be unique)
  const cacheKey = `${recordId}_${filename}`;
  if (uploadedFilesCache.has(cacheKey)) {
    return uploadedFilesCache.get(cacheKey)!;
  }

  // Check if file already exists in Drive
  const safeFilename = `${recordId.slice(-6)}_${filename}`.replace(/[^a-zA-Z0-9._-]/g, "_");
  const searchResponse = await driveClient.files.list({
    q: `name='${safeFilename}' and '${folderId}' in parents and trashed=false`,
    fields: "files(id, name, webViewLink, webContentLink)",
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  if (searchResponse.data.files && searchResponse.data.files.length > 0) {
    const existingFile = searchResponse.data.files[0];
    const result = {
      driveUrl: existingFile.webViewLink || `https://drive.google.com/file/d/${existingFile.id}/view`,
      driveFileId: existingFile.id!,
    };
    uploadedFilesCache.set(cacheKey, result);
    return result;
  }

  // Download from Airtable
  const response = await fetch(airtableUrl);
  if (!response.ok) {
    throw new Error(`Failed to download: ${response.statusText}`);
  }

  const buffer = await response.arrayBuffer();
  const contentType = response.headers.get("content-type") || "application/octet-stream";

  // Upload to Google Drive
  const uploadResponse = await driveClient.files.create({
    requestBody: {
      name: safeFilename,
      parents: [folderId],
    },
    media: {
      mimeType: contentType,
      body: Readable.from(Buffer.from(buffer)),
    },
    fields: "id, webViewLink, webContentLink",
    supportsAllDrives: true,
  });

  // Make file publicly viewable (needed for IMAGE formula)
  // Note: In Shared Drives, permissions are inherited from the drive settings
  try {
    await driveClient.permissions.create({
      fileId: uploadResponse.data.id!,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
      supportsAllDrives: true,
    });
  } catch (e: any) {
    // Permission might fail in Shared Drives if already public or restricted - this is fine
  }

  const result = {
    driveUrl: uploadResponse.data.webViewLink || `https://drive.google.com/file/d/${uploadResponse.data.id}/view`,
    driveFileId: uploadResponse.data.id!,
  };

  uploadedFilesCache.set(cacheKey, result);
  return result;
}

// Get direct image URL for Google Sheets IMAGE() function
function getDriveImageUrl(fileId: string): string {
  return `https://drive.google.com/uc?export=view&id=${fileId}`;
}

// ============================================
// Airtable Functions
// ============================================

interface AirtableFieldInfo {
  name: string;
  type: string;
  options?: {
    choices?: Array<{ name: string; color?: string; id?: string }>;
    linkedTableId?: string;
    prefersSingleRecordLink?: boolean;
  };
}

interface AirtableTableSchema {
  fields: AirtableFieldInfo[];
}

interface LinkedFieldInfo {
  fieldName: string;
  linkedTableId: string;
  linkedTableName: string;
  linkedSheetName: string;
  isSelfLink: boolean;
}

// Cache for field schemas and table info
const fieldSchemaCache = new Map<string, AirtableFieldInfo[]>();
const tableIdToNameCache = new Map<string, { tableName: string; sheetName: string }>();
let allTablesMetadata: any[] = [];

async function fetchAllTablesMetadata(): Promise<void> {
  if (allTablesMetadata.length > 0) return;

  const url = `https://api.airtable.com/v0/meta/bases/${AIRTABLE_BASE_ID}/tables`;
  
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${AIRTABLE_PAT}`,
    },
  });

  if (!response.ok) {
    console.log(`    Note: Could not fetch tables metadata (${response.status})`);
    return;
  }

  const data = await response.json();
  allTablesMetadata = data.tables || [];
  
  // Build table ID to name mapping
  for (const table of allTablesMetadata) {
    const sheetConfig = AIRTABLE_TABLES.find(t => t.name === table.name);
    tableIdToNameCache.set(table.id, {
      tableName: table.name,
      sheetName: sheetConfig?.sheetName || table.name,
    });
  }
}

async function fetchAirtableSchema(tableName: string): Promise<AirtableFieldInfo[]> {
  if (fieldSchemaCache.has(tableName)) {
    return fieldSchemaCache.get(tableName)!;
  }

  await fetchAllTablesMetadata();
  
  const table = allTablesMetadata.find((t: any) => t.name === tableName);
  
  if (table?.fields) {
    fieldSchemaCache.set(tableName, table.fields);
    return table.fields;
  }
  
  return [];
}

interface ChoiceWithColor {
  name: string;
  color?: string;
}

function getSelectFields(fields: AirtableFieldInfo[]): Map<string, ChoiceWithColor[]> {
  const selectFields = new Map<string, ChoiceWithColor[]>();
  
  for (const field of fields) {
    if ((field.type === 'singleSelect' || field.type === 'multipleSelects') && field.options?.choices) {
      const choices = field.options.choices.map(c => ({
        name: c.name,
        color: c.color,
      }));
      selectFields.set(field.name, choices);
    }
  }
  
  return selectFields;
}

// Map Airtable color names to RGB values
function airtableColorToRgb(colorName?: string): { bg: { red: number; green: number; blue: number }; text: { red: number; green: number; blue: number } } {
  const colors: Record<string, { bg: { red: number; green: number; blue: number }; text: { red: number; green: number; blue: number } }> = {
    // Light colors
    blueLight: { bg: { red: 0.82, green: 0.88, blue: 0.98 }, text: { red: 0.1, green: 0.3, blue: 0.6 } },
    cyanLight: { bg: { red: 0.8, green: 0.95, blue: 0.95 }, text: { red: 0.1, green: 0.5, blue: 0.5 } },
    tealLight: { bg: { red: 0.8, green: 0.93, blue: 0.9 }, text: { red: 0.1, green: 0.45, blue: 0.4 } },
    greenLight: { bg: { red: 0.85, green: 0.93, blue: 0.85 }, text: { red: 0.2, green: 0.5, blue: 0.2 } },
    yellowLight: { bg: { red: 1.0, green: 0.98, blue: 0.8 }, text: { red: 0.55, green: 0.5, blue: 0.1 } },
    orangeLight: { bg: { red: 1.0, green: 0.9, blue: 0.8 }, text: { red: 0.7, green: 0.4, blue: 0.1 } },
    redLight: { bg: { red: 1.0, green: 0.85, blue: 0.85 }, text: { red: 0.7, green: 0.2, blue: 0.2 } },
    pinkLight: { bg: { red: 1.0, green: 0.88, blue: 0.93 }, text: { red: 0.7, green: 0.2, blue: 0.4 } },
    purpleLight: { bg: { red: 0.92, green: 0.87, blue: 0.98 }, text: { red: 0.45, green: 0.2, blue: 0.6 } },
    grayLight: { bg: { red: 0.93, green: 0.93, blue: 0.93 }, text: { red: 0.35, green: 0.35, blue: 0.35 } },
    // Dark/bright colors
    blueDark: { bg: { red: 0.2, green: 0.4, blue: 0.7 }, text: { red: 1, green: 1, blue: 1 } },
    cyanDark: { bg: { red: 0.15, green: 0.55, blue: 0.6 }, text: { red: 1, green: 1, blue: 1 } },
    tealDark: { bg: { red: 0.15, green: 0.5, blue: 0.45 }, text: { red: 1, green: 1, blue: 1 } },
    greenDark: { bg: { red: 0.2, green: 0.55, blue: 0.25 }, text: { red: 1, green: 1, blue: 1 } },
    yellowDark: { bg: { red: 0.85, green: 0.75, blue: 0.1 }, text: { red: 0.3, green: 0.25, blue: 0 } },
    orangeDark: { bg: { red: 0.85, green: 0.5, blue: 0.2 }, text: { red: 1, green: 1, blue: 1 } },
    redDark: { bg: { red: 0.75, green: 0.22, blue: 0.22 }, text: { red: 1, green: 1, blue: 1 } },
    pinkDark: { bg: { red: 0.8, green: 0.3, blue: 0.5 }, text: { red: 1, green: 1, blue: 1 } },
    purpleDark: { bg: { red: 0.5, green: 0.3, blue: 0.7 }, text: { red: 1, green: 1, blue: 1 } },
    grayDark: { bg: { red: 0.4, green: 0.4, blue: 0.4 }, text: { red: 1, green: 1, blue: 1 } },
    // Bright variants
    blueBright: { bg: { red: 0.15, green: 0.5, blue: 0.85 }, text: { red: 1, green: 1, blue: 1 } },
    cyanBright: { bg: { red: 0.1, green: 0.7, blue: 0.75 }, text: { red: 1, green: 1, blue: 1 } },
    tealBright: { bg: { red: 0.1, green: 0.6, blue: 0.55 }, text: { red: 1, green: 1, blue: 1 } },
    greenBright: { bg: { red: 0.15, green: 0.65, blue: 0.3 }, text: { red: 1, green: 1, blue: 1 } },
    yellowBright: { bg: { red: 0.95, green: 0.85, blue: 0.15 }, text: { red: 0.3, green: 0.25, blue: 0 } },
    orangeBright: { bg: { red: 0.95, green: 0.55, blue: 0.15 }, text: { red: 1, green: 1, blue: 1 } },
    redBright: { bg: { red: 0.9, green: 0.25, blue: 0.25 }, text: { red: 1, green: 1, blue: 1 } },
    pinkBright: { bg: { red: 0.9, green: 0.35, blue: 0.55 }, text: { red: 1, green: 1, blue: 1 } },
    purpleBright: { bg: { red: 0.6, green: 0.35, blue: 0.85 }, text: { red: 1, green: 1, blue: 1 } },
    grayBright: { bg: { red: 0.55, green: 0.55, blue: 0.55 }, text: { red: 1, green: 1, blue: 1 } },
  };
  
  return colors[colorName || ''] || colors.grayLight;
}

function getLinkedRecordFields(fields: AirtableFieldInfo[], currentTableName: string): LinkedFieldInfo[] {
  const linkedFields: LinkedFieldInfo[] = [];
  
  for (const field of fields) {
    if (field.type === 'multipleRecordLinks' && field.options?.linkedTableId) {
      const linkedInfo = tableIdToNameCache.get(field.options.linkedTableId);
      if (linkedInfo) {
        linkedFields.push({
          fieldName: field.name,
          linkedTableId: field.options.linkedTableId,
          linkedTableName: linkedInfo.tableName,
          linkedSheetName: linkedInfo.sheetName,
          isSelfLink: linkedInfo.tableName === currentTableName,
        });
      }
    }
  }
  
  return linkedFields;
}

// Cache for primary field values (name lookups)
const recordNameCache = new Map<string, string>();

async function fetchRecordNames(tableId: string, recordIds: string[]): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  const uncachedIds = recordIds.filter(id => !recordNameCache.has(id));
  
  // Return cached values for already-fetched records
  for (const id of recordIds) {
    if (recordNameCache.has(id)) {
      results.set(id, recordNameCache.get(id)!);
    }
  }
  
  if (uncachedIds.length === 0) return results;
  
  // Fetch uncached records - we need to find the table name from the ID
  const tableInfo = tableIdToNameCache.get(tableId);
  if (!tableInfo) return results;
  
  // Fetch records in batches
  for (let i = 0; i < uncachedIds.length; i += 10) {
    const batch = uncachedIds.slice(i, i + 10);
    const formula = `OR(${batch.map(id => `RECORD_ID()='${id}'`).join(',')})`;
    
    const url = new URL(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(tableInfo.tableName)}`
    );
    url.searchParams.set('filterByFormula', formula);
    
    try {
      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${AIRTABLE_PAT}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        for (const record of data.records) {
          // Get the first non-null field value as the "name" (primary field is usually first)
          const fields = record.fields;
          const primaryValue = Object.values(fields)[0];
          const name = typeof primaryValue === 'string' ? primaryValue : String(primaryValue || record.id);
          recordNameCache.set(record.id, name);
          results.set(record.id, name);
        }
      }
    } catch (e) {
      // Silently fail - will use record ID as fallback
    }
  }
  
  return results;
}

async function fetchAirtableTable(tableName: string): Promise<AirtableRecord[]> {
  const allRecords: AirtableRecord[] = [];
  let offset: string | undefined;

  console.log(`  Fetching table: ${tableName}...`);

  do {
    const url = new URL(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}`
    );
    if (offset) {
      url.searchParams.set("offset", offset);
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${AIRTABLE_PAT}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${tableName}: ${response.statusText}`);
    }

    const data: AirtableResponse = await response.json();
    allRecords.push(...data.records);
    offset = data.offset;
  } while (offset);

  console.log(`    → Fetched ${allRecords.length} records`);
  return allRecords;
}

// Check if a URL/filename points to an image
function isImageFile(filename: string): boolean {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
  const lower = filename.toLowerCase();
  return imageExtensions.some(ext => lower.endsWith(ext));
}

interface ImageAttachment {
  driveUrl: string;       // Full Google Drive URL (clickable in Sheets)
  imageFormula: string;   // IMAGE() formula that extracts ID from URL column
}

interface AttachmentResult {
  images: ImageAttachment[];  // Up to 3 images with URL and thumbnail
  otherLinks: string;         // Links to other attachments (non-images or beyond 3)
}

const MAX_IMAGE_COLUMNS = 3;

async function processAttachments(
  attachments: any[],
  recordId: string,
  folderId: string
): Promise<AttachmentResult> {
  const uploadedFiles: { filename: string; driveUrl: string; driveFileId: string; isImage: boolean }[] = [];

  // Upload all attachments
  for (const att of attachments) {
    try {
      const { driveUrl, driveFileId } = await downloadAndUploadFile(
        att.url,
        att.filename,
        folderId,
        recordId
      );
      uploadedFiles.push({
        filename: att.filename,
        driveUrl,
        driveFileId,
        isImage: isImageFile(att.filename),
      });
    } catch (error) {
      console.error(`      Failed to upload ${att.filename}:`, error);
    }
  }

  // Separate images from other files
  const imageFiles = uploadedFiles.filter(f => f.isImage);
  const nonImageFiles = uploadedFiles.filter(f => !f.isImage);
  
  // Take up to MAX_IMAGE_COLUMNS images
  const imagesToShow = imageFiles.slice(0, MAX_IMAGE_COLUMNS);
  const remainingImages = imageFiles.slice(MAX_IMAGE_COLUMNS);
  
  // Build image attachment results
  // User pastes full URL (which is clickable in Sheets), formula extracts ID for thumbnail
  const images: ImageAttachment[] = imagesToShow.map(img => ({
    driveUrl: img.driveUrl,
    // Formula extracts file ID from URL and displays image
    // Uses INDIRECT(ADDRESS(ROW(),COLUMN()-1,4)) to reference the URL column to the left
    // This is column-insert-safe - will always look at the cell directly to its left
    imageFormula: `=IF(INDIRECT(ADDRESS(ROW(),COLUMN()-1,4))<>"",IMAGE("https://drive.google.com/uc?export=view&id="&REGEXEXTRACT(INDIRECT(ADDRESS(ROW(),COLUMN()-1,4)),"/d/([^/]+)")),"")`,
  }));
  
  // Collect remaining files as links (remaining images + non-image files)
  const otherFiles = [...remainingImages, ...nonImageFiles];
  const otherLinks = otherFiles
    .map(f => f.driveUrl)
    .join("\n");

  return { images, otherLinks };
}

async function flattenRecordWithAttachments(
  record: AirtableRecord,
  folderId: string,
  linkedFields: LinkedFieldInfo[]
): Promise<Record<string, string>> {
  const flat: Record<string, string> = {
    _airtable_id: record.id,
    _created_time: record.createdTime,
  };

  // Build a map of linked field names for quick lookup
  const linkedFieldMap = new Map(linkedFields.map(f => [f.fieldName, f]));

  for (const [key, value] of Object.entries(record.fields)) {
    if (value === null || value === undefined) {
      flat[key] = "";
    } else if (Array.isArray(value)) {
      // Handle arrays (linked records, attachments, multi-select)
      if (value.length > 0 && typeof value[0] === "object" && value[0].url) {
        // Attachments - upload to Drive
        const result = await processAttachments(value, record.id, folderId);
        
        // Create columns for up to 3 images: URL (clickable) and Thumbnail for each
        if (result.images.length > 0) {
          for (let i = 0; i < result.images.length; i++) {
            const img = result.images[i];
            const suffix = result.images.length === 1 ? "" : ` ${i + 1}`; // No number if only 1 image
            flat[key + suffix + " URL"] = img.driveUrl;      // Full Google Drive URL (clickable, user can paste new URLs)
            flat[key + suffix] = img.imageFormula;           // IMAGE() formula (extracts ID from URL)
          }
        }
        
        // Handle other attachments (non-images or beyond 3 images)
        if (result.otherLinks) {
          flat[key + " (more)"] = result.otherLinks;
        } else if (result.images.length === 0 && value.length > 0) {
          // No images at all, just put links
          flat[key] = "";
        }
      } else if (linkedFieldMap.has(key)) {
        // Linked records - use cached names, restrict to first item
        const linkedInfo = linkedFieldMap.get(key)!;
        const recordIds = value.filter((v: any) => typeof v === 'string');
        
        if (recordIds.length > 0) {
          // Get names from cache (should be pre-populated)
          const names = recordIds
            .slice(0, 1) // Restrict to first item only
            .map((id: string) => recordNameCache.get(id) || id);
          flat[key] = names.join(", ");
        } else {
          flat[key] = "";
        }
      } else {
        // Other arrays (multi-select)
        flat[key] = value.join(", ");
      }
    } else if (typeof value === "object") {
      // Handle objects (collaborators, etc.)
      flat[key] = JSON.stringify(value);
    } else {
      flat[key] = String(value);
    }
  }

  return flat;
}

// Pre-fetch all linked record names for a batch of records
async function prefetchLinkedRecordNames(
  records: AirtableRecord[],
  linkedFields: LinkedFieldInfo[]
): Promise<void> {
  // Collect all record IDs per linked table
  const idsByTable = new Map<string, Set<string>>();
  
  for (const field of linkedFields) {
    idsByTable.set(field.linkedTableId, new Set());
  }
  
  for (const record of records) {
    for (const field of linkedFields) {
      const value = record.fields[field.fieldName];
      if (Array.isArray(value)) {
        const ids = value.filter((v: any) => typeof v === 'string');
        const tableIds = idsByTable.get(field.linkedTableId)!;
        // Only take first ID since we're restricting to 1 item
        if (ids.length > 0) {
          tableIds.add(ids[0]);
        }
      }
    }
  }
  
  // Fetch names for each table
  for (const [tableId, ids] of idsByTable) {
    if (ids.size === 0) continue;
    await fetchRecordNames(tableId, [...ids]);
  }
}

function getColumnLetter(index: number): string {
  let letter = '';
  while (index >= 0) {
    letter = String.fromCharCode((index % 26) + 65) + letter;
    index = Math.floor(index / 26) - 1;
  }
  return letter;
}

function recordsToRows(records: Record<string, string>[]): { headers: string[]; rows: string[][] } {
  if (records.length === 0) {
    return { headers: ["_airtable_id", "_created_time"], rows: [] };
  }

  // Collect all unique field names
  const fieldSet = new Set<string>(["_airtable_id", "_created_time"]);
  for (const record of records) {
    for (const key of Object.keys(record)) {
      fieldSet.add(key);
    }
  }

  // Sort headers to ensure URL columns come before their thumbnail columns
  // Order: "{Field} URL", "{Field}" (or numbered: "{Field} 1 URL", "{Field} 1", etc.)
  const headers = Array.from(fieldSet).sort((a, b) => {
    // Extract base name and number for comparison
    // Pattern: "FieldName", "FieldName URL", "FieldName 1", "FieldName 1 URL", etc.
    const parseHeader = (s: string) => {
      const match = s.match(/^(.+?)( \d+)?( URL| \(more\))?$/);
      if (!match) return { base: s, num: 0, suffix: '' };
      return {
        base: match[1],
        num: match[2] ? parseInt(match[2].trim()) : 0,
        suffix: match[3] || ''
      };
    };
    
    const parsedA = parseHeader(a);
    const parsedB = parseHeader(b);
    
    // First sort by base name
    if (parsedA.base !== parsedB.base) return parsedA.base.localeCompare(parsedB.base);
    
    // Then by number (0, 1, 2, 3)
    if (parsedA.num !== parsedB.num) return parsedA.num - parsedB.num;
    
    // Then by suffix order: URL, (none/thumbnail), (more)
    const suffixOrder = (suffix: string) => {
      if (suffix === ' URL') return 0;
      if (suffix === '') return 1;
      if (suffix === ' (more)') return 2;
      return 3;
    };
    return suffixOrder(parsedA.suffix) - suffixOrder(parsedB.suffix);
  });

  // Create rows - formulas now use relative references so no replacement needed
  const rows = records.map((record) => {
    return headers.map((header) => record[header] || "");
  });

  return { headers, rows };
}

// ============================================
// Google Sheets Functions
// ============================================

async function getExistingSheets(): Promise<Map<string, number>> {
  const response = await sheetsClient.spreadsheets.get({
    spreadsheetId: GOOGLE_SHEETS_ID,
  });

  const sheetMap = new Map<string, number>();
  for (const sheet of response.data.sheets || []) {
    if (sheet.properties?.title && sheet.properties?.sheetId !== undefined) {
      sheetMap.set(sheet.properties.title, sheet.properties.sheetId);
    }
  }
  return sheetMap;
}

async function createOrClearSheet(
  existingSheets: Map<string, number>,
  sheetName: string
): Promise<number> {
  // Delete existing sheet if it exists (to remove legacy columns)
  if (existingSheets.has(sheetName)) {
    const oldSheetId = existingSheets.get(sheetName)!;
    try {
      await sheetsClient.spreadsheets.batchUpdate({
        spreadsheetId: GOOGLE_SHEETS_ID,
        requestBody: {
          requests: [
            {
              deleteSheet: {
                sheetId: oldSheetId,
              },
            },
          ],
        },
      });
      console.log(`    Deleted existing sheet: ${sheetName}`);
    } catch (e) {
      // If delete fails (e.g., it's the only sheet), just clear it
      await sheetsClient.spreadsheets.values.clear({
        spreadsheetId: GOOGLE_SHEETS_ID,
        range: `'${sheetName}'`, // Quote sheet name for spaces
      });
      console.log(`    Cleared existing sheet: ${sheetName}`);
      return oldSheetId;
    }
  }

  // Create new sheet
  const response = await sheetsClient.spreadsheets.batchUpdate({
    spreadsheetId: GOOGLE_SHEETS_ID,
    requestBody: {
      requests: [
        {
          addSheet: {
            properties: {
              title: sheetName,
            },
          },
        },
      ],
    },
  });
  const newSheetId = response.data.replies?.[0]?.addSheet?.properties?.sheetId;
  console.log(`    Created new sheet: ${sheetName}`);
  return newSheetId || 0;
}

async function writeToSheet(
  sheetName: string,
  headers: string[],
  rows: string[][]
): Promise<void> {
  const allData = [headers, ...rows];

  await sheetsClient.spreadsheets.values.update({
    spreadsheetId: GOOGLE_SHEETS_ID,
    range: `'${sheetName}'!A1`, // Quote sheet name for spaces
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: allData,
    },
  });

  console.log(`    Wrote ${rows.length} rows to ${sheetName}`);
}

async function formatSheet(
  sheetId: number, 
  headerCount: number, 
  rowCount: number,
  headers: string[],
  selectFields: Map<string, ChoiceWithColor[]>,
  linkedFields: LinkedFieldInfo[]
): Promise<void> {
  const requests: any[] = [
    // Freeze header row
    {
      updateSheetProperties: {
        properties: {
          sheetId,
          gridProperties: {
            frozenRowCount: 1,
          },
        },
        fields: "gridProperties.frozenRowCount",
      },
    },
    // Bold header row with background color
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 0,
          endColumnIndex: headerCount,
        },
        cell: {
          userEnteredFormat: {
            textFormat: {
              bold: true,
            },
            backgroundColor: {
              red: 0.2,
              green: 0.4,
              blue: 0.6,
            },
            textFormat: {
              bold: true,
              foregroundColor: {
                red: 1,
                green: 1,
                blue: 1,
              },
            },
          },
        },
        fields: "userEnteredFormat(textFormat,backgroundColor)",
      },
    },
    // Set row height for images
    {
      updateDimensionProperties: {
        range: {
          sheetId,
          dimension: "ROWS",
          startIndex: 1,
          endIndex: Math.max(rowCount + 1, 1000),
        },
        properties: {
          pixelSize: 100,
        },
        fields: "pixelSize",
      },
    },
    // Add basic filter to allow sorting
    {
      setBasicFilter: {
        filter: {
          range: {
            sheetId,
            startRowIndex: 0,
            endRowIndex: rowCount + 1,
            startColumnIndex: 0,
            endColumnIndex: headerCount,
          },
        },
      },
    },
  ];

  // Add data validation with dropdown chips for select fields
  // Using the newer dropdown chip format with per-option colors
  for (const [fieldName, choices] of selectFields) {
    const colIndex = headers.indexOf(fieldName);
    if (colIndex === -1) continue;

    // Build dropdown options with colors
    const dropdownValues = choices.slice(0, 500).map(choice => {
      const colors = airtableColorToRgb(choice.color);
      return {
        userEnteredValue: choice.name,
      };
    });

    requests.push({
      setDataValidation: {
        range: {
          sheetId,
          startRowIndex: 1, // Skip header
          endRowIndex: rowCount + 1,
          startColumnIndex: colIndex,
          endColumnIndex: colIndex + 1,
        },
        rule: {
          condition: {
            type: "ONE_OF_LIST",
            values: dropdownValues,
          },
          showCustomUi: true, // Enable dropdown chip UI
          strict: false, // Allow other values
        },
      },
    });

    // Add conditional formatting for colors (chips will pick up these colors)
    for (const choice of choices) {
      const colors = airtableColorToRgb(choice.color);
      
      requests.push({
        addConditionalFormatRule: {
          rule: {
            ranges: [{
              sheetId,
              startRowIndex: 1,
              endRowIndex: rowCount + 1,
              startColumnIndex: colIndex,
              endColumnIndex: colIndex + 1,
            }],
            booleanRule: {
              condition: {
                type: "TEXT_EQ",
                values: [{ userEnteredValue: choice.name }],
              },
              format: {
                backgroundColor: colors.bg,
                textFormat: { foregroundColor: colors.text },
              },
            },
          },
          index: 0,
        },
      });
    }
  }

  await sheetsClient.spreadsheets.batchUpdate({
    spreadsheetId: GOOGLE_SHEETS_ID,
    requestBody: { requests },
  });

  // Add data validation for linked record fields (references to other sheets)
  // This needs to be done separately because it uses sheet references
  // We need to find the actual column letter of the name/title field in each linked sheet
  for (const linkedField of linkedFields) {
    const colIndex = headers.indexOf(linkedField.fieldName);
    if (colIndex === -1) continue;

    const linkedSheetName = linkedField.linkedSheetName;
    
    try {
      // Get the headers from the linked sheet to find the name column
      const linkedHeadersResponse = await sheetsClient.spreadsheets.values.get({
        spreadsheetId: GOOGLE_SHEETS_ID,
        range: `'${linkedSheetName}'!1:1`,
      });
      
      const linkedHeaders = linkedHeadersResponse.data.values?.[0] || [];
      
      // Find the primary name column - look for common name fields
      const nameFields = ['Title', 'Name', 'Item Name', 'Contact Name'];
      let nameColIndex = -1;
      for (const nameField of nameFields) {
        nameColIndex = linkedHeaders.indexOf(nameField);
        if (nameColIndex !== -1) break;
      }
      
      // If no name field found, skip this linked field
      if (nameColIndex === -1) {
        console.log(`    Note: Could not find name column in ${linkedSheetName} for ${linkedField.fieldName}`);
        continue;
      }
      
      const nameColLetter = getColumnLetter(nameColIndex);
      
      await sheetsClient.spreadsheets.batchUpdate({
        spreadsheetId: GOOGLE_SHEETS_ID,
        requestBody: {
          requests: [{
            setDataValidation: {
              range: {
                sheetId,
                startRowIndex: 1,
                endRowIndex: rowCount + 1,
                startColumnIndex: colIndex,
                endColumnIndex: colIndex + 1,
              },
              rule: {
                condition: {
                  type: "ONE_OF_RANGE",
                  values: [{
                    userEnteredValue: `='${linkedSheetName}'!$${nameColLetter}$2:$${nameColLetter}$1000`,
                  }],
                },
                showCustomUi: true,
                strict: false,
              },
            },
          }],
        },
      });
    } catch (e) {
      // Silently fail if the linked sheet doesn't exist yet
    }
  }

}

// Lookup field patterns for cross-sheet references
const LOOKUP_FIELD_PATTERNS = [
  { pattern: /\(from Team Roster\)$/i, linkedSheet: 'Contacts', nameColumn: 'Name' },
  { pattern: /\(from Vendor\)$/i, linkedSheet: 'Contacts', nameColumn: 'Name' },
  { pattern: /\(from Task\)$/i, linkedSheet: 'Projects', nameColumn: 'Title' },
  { pattern: /\(from Blocking\)$/i, linkedSheet: 'Projects', nameColumn: 'Title' },
  { pattern: /\(from Blocked By\)$/i, linkedSheet: 'Projects', nameColumn: 'Title' },
  { pattern: /\(from Items & Purchases\)$/i, linkedSheet: 'Items', nameColumn: 'Item Name' },
];

// Apply lookup dropdowns AFTER all sheets are created (second pass)
async function applyLookupDropdowns(): Promise<void> {
  console.log("\n📋 Applying cross-sheet lookup dropdowns...");
  
  // Get all sheets
  const sheetsResponse = await sheetsClient.spreadsheets.get({
    spreadsheetId: GOOGLE_SHEETS_ID,
  });
  
  const sheets = sheetsResponse.data.sheets || [];
  
  for (const sheet of sheets) {
    const sheetName = sheet.properties?.title;
    const sheetId = sheet.properties?.sheetId;
    if (!sheetName || sheetId === undefined) continue;
    
    // Get headers for this sheet
    const headersResponse = await sheetsClient.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEETS_ID,
      range: `'${sheetName}'!1:1`,
    });
    
    const headers = headersResponse.data.values?.[0] || [];
    
    // Get row count
    const dataResponse = await sheetsClient.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEETS_ID,
      range: `'${sheetName}'!A:A`,
    });
    const rowCount = dataResponse.data.values?.length || 1;
    
    // Check each header for lookup patterns
    for (const header of headers) {
      for (const { pattern, linkedSheet, nameColumn } of LOOKUP_FIELD_PATTERNS) {
        if (pattern.test(header)) {
          const colIndex = headers.indexOf(header);
          if (colIndex === -1) continue;
          
          try {
            // Get the headers from the linked sheet to find the name column
            const linkedHeadersResponse = await sheetsClient.spreadsheets.values.get({
              spreadsheetId: GOOGLE_SHEETS_ID,
              range: `'${linkedSheet}'!1:1`,
            });
            
            const linkedHeaders = linkedHeadersResponse.data.values?.[0] || [];
            const nameColIndex = linkedHeaders.indexOf(nameColumn);
            
            if (nameColIndex === -1) {
              continue;
            }
            
            const nameColLetter = getColumnLetter(nameColIndex);
            console.log(`  ${sheetName}: "${header}" → ${linkedSheet}.${nameColumn}`);
            
            await sheetsClient.spreadsheets.batchUpdate({
              spreadsheetId: GOOGLE_SHEETS_ID,
              requestBody: {
                requests: [{
                  setDataValidation: {
                    range: {
                      sheetId,
                      startRowIndex: 1,
                      endRowIndex: rowCount,
                      startColumnIndex: colIndex,
                      endColumnIndex: colIndex + 1,
                    },
                    rule: {
                      condition: {
                        type: "ONE_OF_RANGE",
                        values: [{
                          userEnteredValue: `='${linkedSheet}'!$${nameColLetter}$2:$${nameColLetter}$1000`,
                        }],
                      },
                      showCustomUi: true,
                      strict: false,
                    },
                  },
                }],
              },
            });
          } catch (e) {
            // Silently fail if linked sheet doesn't exist
          }
          break;
        }
      }
    }
  }
}

// ============================================
// Main Sync Function
// ============================================

async function syncAirtableToSheets(): Promise<void> {
  console.log("🔄 Starting Airtable → Google Sheets sync (with Drive attachments)...\n");

  // Validate environment
  if (!AIRTABLE_PAT || !AIRTABLE_BASE_ID) {
    throw new Error("Missing Airtable credentials. Set AIRTABLE_PAT and AIRTABLE_BASE_ID");
  }
  if (!GOOGLE_SHEETS_ID || !GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY || !GOOGLE_DRIVE_FOLDER_ID) {
    throw new Error(
      "Missing Google credentials. Set GOOGLE_SHEETS_ID, GOOGLE_DRIVE_FOLDER_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, and GOOGLE_PRIVATE_KEY"
    );
  }

  // Initialize Google clients
  console.log("📊 Connecting to Google...");
  await initGoogleClients();

  // Get attachments folder from environment variable
  console.log("📁 Using attachments folder from GOOGLE_DRIVE_FOLDER_ID...");
  attachmentsFolderId = getAttachmentsFolderId();
  console.log(`  Folder ID: ${attachmentsFolderId}`);
  await verifyFolderAccess();

  const existingSheets = await getExistingSheets();
  console.log(`  Found ${existingSheets.size} existing sheets\n`);

  // Sync each table
  for (const table of AIRTABLE_TABLES) {
    console.log(`\n📋 Syncing: ${table.name} → ${table.sheetName}`);

    try {
      // Create subfolder for this table's attachments
      const tableFolderId = await createTableSubfolder(table.sheetName);

      // Fetch schema to identify select and linked record fields
      console.log(`    Fetching schema...`);
      const schema = await fetchAirtableSchema(table.name);
      const selectFields = getSelectFields(schema);
      const linkedFields = getLinkedRecordFields(schema, table.name);
      
      if (selectFields.size > 0) {
        console.log(`    Found ${selectFields.size} dropdown fields: ${[...selectFields.keys()].join(', ')}`);
      }
      if (linkedFields.length > 0) {
        console.log(`    Found ${linkedFields.length} linked fields: ${linkedFields.map(f => f.fieldName).join(', ')}`);
      }

      // Fetch from Airtable
      const records = await fetchAirtableTable(table.name);

      // Pre-fetch linked record names
      if (linkedFields.length > 0) {
        console.log(`    Resolving linked record names...`);
        await prefetchLinkedRecordNames(records, linkedFields);
      }

      // Process records with attachments
      console.log(`    Processing attachments...`);
      const processedRecords: Record<string, string>[] = [];
      let attachmentCount = 0;

      for (let i = 0; i < records.length; i++) {
        const processed = await flattenRecordWithAttachments(records[i], tableFolderId, linkedFields);
        processedRecords.push(processed);

        // Count attachments
        for (const value of Object.values(records[i].fields)) {
          if (Array.isArray(value) && value.length > 0 && value[0]?.url) {
            attachmentCount += value.length;
          }
        }

        // Progress indicator
        if ((i + 1) % 20 === 0) {
          process.stdout.write(`    Processed ${i + 1}/${records.length} records\r`);
        }
      }
      console.log(`    Processed ${records.length} records with ${attachmentCount} attachments`);

      const { headers, rows } = recordsToRows(processedRecords);

      // Create or clear the sheet
      const sheetId = await createOrClearSheet(existingSheets, table.sheetName);

      // Write data
      await writeToSheet(table.sheetName, headers, rows);

      // Format the sheet with dropdowns and filters
      console.log(`    Applying formatting and filters...`);
      await formatSheet(sheetId, headers.length, rows.length, headers, selectFields, linkedFields);

      console.log(`  ✅ Synced ${rows.length} records`);
    } catch (error) {
      console.error(`  ❌ Error syncing ${table.name}:`, error);
    }
  }

  // Second pass: Apply cross-sheet lookup dropdowns (now that all sheets exist)
  await applyLookupDropdowns();

  console.log("\n\n✅ Sync complete!");
  console.log(`📊 View your sheet: https://docs.google.com/spreadsheets/d/${GOOGLE_SHEETS_ID}`);
  console.log(`📁 Attachments folder: https://drive.google.com/drive/folders/${attachmentsFolderId}`);
}

// ============================================
// Run
// ============================================

syncAirtableToSheets().catch((error) => {
  console.error("❌ Sync failed:", error);
  process.exit(1);
});
