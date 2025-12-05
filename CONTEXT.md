# Project Manager - Development Context

*Last updated: December 5, 2025*

## Overview

A Next.js application for managing projects, contacts, items, and static information. Data is imported from Airtable and stored in Supabase (PostgreSQL). The UI uses Tabulator.js for interactive, editable tables.

## Tech Stack

- **Frontend**: Next.js 14+ (App Router), React, TypeScript
- **Tables**: Tabulator.js (interactive/editable grids)
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage (for attachments/documents)
- **ORM**: Prisma
- **Styling**: Tailwind CSS + shadcn/ui components

## Architecture

### Directory Structure
```
app/
├── prisma/schema.prisma       # Database schema
├── scripts/                   # Migration & utility scripts
├── src/
│   ├── app/
│   │   ├── api/              # API routes (Next.js route handlers)
│   │   ├── projects/         # Projects page
│   │   ├── users/            # Users/Contacts page
│   │   ├── items/            # Items page
│   │   └── static-info/      # Static Info page
│   ├── components/
│   │   ├── projects/         # Project-specific components
│   │   ├── users/            # User-specific components
│   │   ├── items/            # Item-specific components
│   │   ├── static-info/      # Static info components
│   │   └── shared/           # Reusable components
│   ├── hooks/                # Custom React hooks
│   ├── types/                # TypeScript type definitions
│   └── utils/                # Utility functions
```

### Key Patterns

1. **Shared Table Hook**: `useTabulatorTable` encapsulates common Tabulator logic (initialization, filtering, grouping, data updates)

2. **Shared Dialog Components**:
   - `MultiSelectDialog` - For selecting multiple items (team members, tags, etc.)
   - `SingleSelectDialog` - For selecting single item (project area, etc.)
   - `DocumentsEditorDialog` - For managing file attachments
   - `ImagesEditorDialog` - For managing image attachments
   - `TableToolbar` - Search and grouping controls

3. **API Pattern**: Each entity has CRUD routes at `/api/[entity]/` and `/api/[entity]/[id]/`

## Database Schema (Current)

### projects
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| title | text | Required |
| description | text | Nullable |
| task_progress | text | "Not Started", "In Progress", "Done", etc. |
| priority | text | "P1", "P2", "P3" |
| project_area | text | Location/area in the house |
| tags | text[] | Array of tags |
| depends_on | text[] | Array of project IDs |
| blocked_by | text[] | Array of project IDs |
| blocking | text[] | Array of project IDs |
| due_date | timestamp | Nullable |
| progress | int | 0-100 |
| created_at | timestamp | Auto |
| updated_at | timestamp | Auto |
| created_by | text | User ID or "airtable_migration" |

### users (Contacts)
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| name | text | Required |
| email | text | Nullable |
| phone | text | Nullable |
| role | text | Nullable |
| contact_type | text | "Team", "Vendor", "Contractor", etc. |
| service_type | text | Nullable |
| created_at | timestamp | Auto |
| updated_at | timestamp | Auto |

### items
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| item_name | text | Required |
| category | text | "Furniture", "Lighting", etc. |
| room_space | text | Where item goes |
| details | text | Description |
| link | text | URL to product |
| vendor_id | uuid | FK to users |
| image_urls | text[] | Array of image URLs |
| notes | text | Additional notes |
| estimate | decimal | Price estimate |
| sheen | text | For paint items |
| is_suggestion | boolean | Default false |
| is_rejected | boolean | Default false |
| created_at | timestamp | Auto |
| updated_at | timestamp | Auto |

### static_info
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| key | text | Name/title |
| value | text | Description |
| category | text | "General", "Interior Renderings", etc. |
| image_urls | text[] | Array of attachment URLs |
| created_at | timestamp | Auto |
| updated_at | timestamp | Auto |

### project_assignments (Junction table)
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| project_id | uuid | FK to projects |
| user_id | uuid | FK to users |
| role | text | Role on project |
| created_at | timestamp | Auto |

### documents
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| project_id | uuid | FK to projects |
| name | text | File name |
| url | text | Supabase storage URL |
| type | text | MIME type |
| size | int | File size in bytes |
| created_at | timestamp | Auto |

## Airtable Mapping

### Task List → projects
| Airtable | Database | Status |
|----------|----------|--------|
| Title | title | ✅ |
| Priority | priority | ✅ |
| Task Progress | task_progress | ✅ |
| Details | description | ✅ |
| Additional Progress Notes | — | ❌ NOT IMPORTED |
| Attachments | documents | ✅ |
| Project Area | project_area | ✅ |
| Team Roster | project_assignments | ✅ |
| Tags | tags | ✅ (may be empty) |
| Due Date | due_date | ✅ |
| Blocking | blocking | ✅ (may be empty) |
| Blocked By | blocked_by | ✅ (may be empty) |
| Projects | — | ❌ NOT IMPORTED |
| Items & Purchases | — | ❌ NOT IMPORTED |
| Who Buys? | — | ❌ NOT IMPORTED |

### Contacts → users
| Airtable | Database | Status |
|----------|----------|--------|
| Name | name | ✅ |
| Type | contact_type | ✅ |
| Role | role | ✅ |
| Email | email | ✅ |
| Phone | phone | ✅ |
| Service Type | service_type | ✅ |
| Notes | — | ❌ NOT IMPORTED |
| Attachments | — | ❌ NOT IMPORTED |
| Website | — | ❌ NOT IMPORTED |
| License # | — | ❌ NOT IMPORTED |
| Contact Name | — | ❌ NOT IMPORTED |
| Product Type | — | ❌ NOT IMPORTED |
| Item Type | — | ❌ NOT IMPORTED |
| Location | — | ❌ NOT IMPORTED |

### Items & Purchases → items
| Airtable | Database | Status |
|----------|----------|--------|
| Item Name | item_name | ✅ |
| Room/Space | room_space | ✅ |
| Category | category | ✅ |
| Details | details | ✅ |
| Link | link | ✅ |
| Vendor | vendor_id | ✅ |
| Image | image_urls | ✅ |
| Notes | notes | ✅ |
| $ Estimate | estimate | ✅ |
| Sheen | sheen | ✅ |
| suggestion | is_suggestion | ✅ |
| Rejected Item | is_rejected | ✅ |
| Size/Dimensions | — | ❌ NOT IMPORTED |
| Inside Panel Width | — | ❌ NOT IMPORTED |
| Product ID | — | ❌ NOT IMPORTED |
| Quantity | — | ❌ NOT IMPORTED |
| Purchase Price | — | ❌ NOT IMPORTED |
| Purchase Date | — | ❌ NOT IMPORTED |
| Actual Dimensions | — | ❌ NOT IMPORTED |
| Spec Sheet | — | ❌ NOT IMPORTED |
| Status | — | ❌ NOT IMPORTED |
| Task | — | ❌ NOT IMPORTED |

### Static Information → static_info
| Airtable | Database | Status |
|----------|----------|--------|
| Name | key | ✅ |
| Select | category | ✅ |
| Description | value | ✅ |
| Attachment | image_urls | ✅ |
| Website/Link | — | ❌ NOT IMPORTED |

## Recent Changes (Dec 5, 2025)

### Completed Refactoring
1. **Removed dead code**: Deleted 6 unused table implementations (AG Grid, RevoGrid, DnD, etc.)
2. **Extracted shared hook**: Created `useTabulatorTable` for common table logic
3. **Created shared components**: Multi-select dialog, single-select dialog, documents editor, images editor, table toolbar
4. **Reduced code duplication**: Projects table reduced from 1,757 lines to ~450 lines (74% reduction)

### Schema Changes Applied
1. Renamed `status` → `task_progress` in projects table
2. Removed `start_date`, `end_date`, `location` columns from projects
3. Added `blocked_by`, `blocking`, `project_area` columns to projects

## Pending Work

### Missing Relationships
- [ ] Items should link to Projects (Items.Task → projects)
- [ ] Projects should track "Who Buys?" contacts

### Missing Fields to Consider Adding
- [ ] Projects: Additional Progress Notes, Projects (name like "Franklin House")
- [ ] Users: Notes, Attachments, Website, License #, Location
- [ ] Items: Dimensions, Product ID, Quantity, Purchase Price/Date, Status, Spec Sheet

### Empty Data Investigation
- Tags, Blocking, Blocked By arrays may be empty - need to verify Airtable import is working correctly

## Environment Setup

```bash
cd app
cp .env.local.example .env.local
# Fill in:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - AIRTABLE_PAT
# - AIRTABLE_BASE_ID

npm install
npm run dev
```

## Useful Scripts

```bash
# Inspect Airtable schema
npx tsx scripts/inspect-airtable.ts

# Inspect database schema
npx tsx scripts/inspect-db.ts

# Migrate data from Airtable
npx tsx scripts/migrate-airtable.ts

# Clear all data (careful!)
npx tsx scripts/clear-data.ts
```

## Notes for Future Development

1. **Tabulator Pattern**: When adding new table views, follow the pattern in `tabulator-projects-table.tsx` - use the shared hook and toolbar

2. **Dialog Pattern**: Use the shared dialogs for any multi-select or single-select fields

3. **API Pattern**: Each entity needs routes for list, create, update, delete, plus any special operations (like image upload)

4. **Type Safety**: Keep `types/database.ts` in sync with `prisma/schema.prisma`

