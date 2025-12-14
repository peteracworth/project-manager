# Airtable → Google Sheets Sync

This script exports all data from your Airtable base and syncs it to a Google Spreadsheet.

## Features

- Syncs all 4 tables: Projects, Contacts, Items, Static Info
- Each table becomes a separate sheet/tab
- Preserves Airtable record IDs for reference
- Handles attachments (exports URLs)
- Formats sheets with frozen headers and auto-sizing
- Can be run manually or on a schedule

## Setup Instructions

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Enable the **Google Sheets API**:
   - Go to "APIs & Services" → "Enable APIs and Services"
   - Search for "Google Sheets API" and enable it

### 2. Create a Service Account

1. In Google Cloud Console, go to "IAM & Admin" → "Service Accounts"
2. Click "Create Service Account"
3. Give it a name like "airtable-sheets-sync"
4. Click "Create and Continue"
5. Skip the optional permissions, click "Done"
6. Click on the service account you just created
7. Go to "Keys" tab → "Add Key" → "Create new key"
8. Select "JSON" and download the file
9. **Important**: Note the `client_email` from the JSON file (looks like `xxx@project.iam.gserviceaccount.com`)

### 3. Create & Share the Google Sheet

1. Create a new Google Sheet (or use existing)
2. Copy the Sheet ID from the URL:
   ```
   https://docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit
   ```
3. **Share the sheet** with the service account email (from step 2.9)
   - Click "Share" → paste the service account email → give "Editor" access

### 4. Set Environment Variables

Add these to your `.env.local`:

```bash
# Airtable (you likely already have these)
AIRTABLE_API_KEY=your_airtable_api_key
AIRTABLE_BASE_ID=your_base_id

# Google Sheets
GOOGLE_SHEETS_ID=your_sheet_id_from_url
GOOGLE_SERVICE_ACCOUNT_EMAIL=xxx@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY_HERE\n-----END PRIVATE KEY-----\n"
```

**Note**: The private key should have `\n` for newlines (copy from the JSON file's `private_key` field).

### 5. Run the Sync

```bash
cd app
npx tsx scripts/sync-airtable-to-sheets.ts
```

## Output

The script creates/updates these sheets:

| Airtable Table | Google Sheet Tab |
|----------------|------------------|
| Task List | Projects |
| Contacts | Contacts |
| Items and Purchases | Items |
| Static Information | Static Info |

Each sheet includes:
- `_airtable_id` - The original Airtable record ID
- `_created_time` - When the record was created
- All other fields from Airtable

## Scheduling (Optional)

To run this automatically:

### Using cron (Linux/Mac)
```bash
# Run every hour
0 * * * * cd /path/to/project-manager/app && npx tsx scripts/sync-airtable-to-sheets.ts >> /var/log/sheets-sync.log 2>&1
```

### Using GitHub Actions
Create `.github/workflows/sync-sheets.yml`:
```yaml
name: Sync Airtable to Sheets
on:
  schedule:
    - cron: '0 * * * *'  # Every hour
  workflow_dispatch:  # Manual trigger

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
        working-directory: ./app
      - run: npx tsx scripts/sync-airtable-to-sheets.ts
        working-directory: ./app
        env:
          AIRTABLE_API_KEY: ${{ secrets.AIRTABLE_API_KEY }}
          AIRTABLE_BASE_ID: ${{ secrets.AIRTABLE_BASE_ID }}
          GOOGLE_SHEETS_ID: ${{ secrets.GOOGLE_SHEETS_ID }}
          GOOGLE_SERVICE_ACCOUNT_EMAIL: ${{ secrets.GOOGLE_SERVICE_ACCOUNT_EMAIL }}
          GOOGLE_PRIVATE_KEY: ${{ secrets.GOOGLE_PRIVATE_KEY }}
```

## Troubleshooting

### "The caller does not have permission"
- Make sure you shared the Google Sheet with the service account email
- The service account needs "Editor" access

### "Google Sheets API has not been enabled"
- Go to Google Cloud Console and enable the Sheets API

### Private key errors
- Make sure the private key in `.env.local` has `\n` for newlines
- Wrap the entire key in quotes

## Two-Way Sync?

This script is **one-way** (Airtable → Sheets). For two-way sync, you'd need:
1. A Google Apps Script trigger to detect changes in Sheets
2. An API endpoint to receive those changes
3. Logic to push changes back to Airtable

Let me know if you want to explore two-way sync!

