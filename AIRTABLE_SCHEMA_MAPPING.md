# Airtable to Supabase Schema Mapping

## Overview
Based on inspection of Airtable base `appNQQcwVNTqAaG8r`

---

## Table 1: Task List → projects

### Airtable Fields (Task List):
- **Title** (text) → `title`
- **Project Area** (text) → `location`
- **Projects** (text/select) → `tags` (as array)
- **Priority** (select: P1, P2, etc.) → `priority`
- **Task Progress** (select: Not Started, In Progress, On Hold, etc.) → `status`
- **Details** (long text) → `description`
- **Team Roster** (linked records) → `project_assignments` table
- **Blocking** (linked records to other tasks) → `depends_on` (array of IDs)
- **Blocked By** (linked records) → Related field (reverse of Blocking)
- **Attachments** (attachments) → `documents` table
- **createdTime** (datetime) → `created_at`

### Mapping Strategy:
```typescript
{
  title: fields.Title,
  description: fields.Details,
  status: fields["Task Progress"] || "Not Started",
  priority: fields.Priority,
  location: fields["Project Area"],
  tags: [fields.Projects].filter(Boolean), // Convert to array
  depends_on: fields.Blocking || [], // Array of blocking task IDs
  created_at: record.createdTime,
  updated_at: record.createdTime,
  created_by: "migrated", // Or map from Team Roster if available
}
```

---

## Table 2: Contacts → users

### Airtable Fields (Contacts):
- **Name** (text) → `name`
- **Email** (email) → `email`
- **Phone** (phone) → Store in `users` table (need to add phone field)
- **Type** (select: Team, Vendor) → `role` or separate field
- **Role** (text: Interiors, etc.) → Can be combined with type
- **Service Type** (text: for vendors) → Additional field needed
- **Task List** (linked records) → `project_assignments` table
- **Purchases** (linked records) → Link to items if needed

### Mapping Strategy:
```typescript
{
  name: fields.Name,
  email: fields.Email || `${fields.Name.replace(/\s+/g, '_').toLowerCase()}@placeholder.com`,
  role: fields.Type === "Team" ? fields.Role || "member" : "vendor",
  // Additional fields to add:
  phone: fields.Phone,
  contact_type: fields.Type,
  service_type: fields["Service Type"],
}
```

**Note:** Need to update `users` table schema to include:
- `phone` (TEXT)
- `contact_type` (TEXT)
- `service_type` (TEXT)

---

## Table 3: Items and Purchases → items

**Status:** Access denied - need to add this table to the Personal Access Token permissions.

### Expected Fields (based on table name):
- Item name
- Description
- Cost
- Vendor (linked to Contacts)
- Project (linked to Task List)
- Purchase date
- Quantity
- Category

**Action Required:** Update Airtable PAT to include access to "Items and Purchases" table.

---

## Table 4: Static Information → static_info

### Airtable Fields:
- **Name** (text) → `key`
- **Description** (text) → `value`
- **Attachment** (attachments) → Store URLs in `documents` or separate field
- **Select** (select: General, Interior Renderings and moods) → `category`

### Mapping Strategy:
```typescript
{
  key: fields.Name,
  value: fields.Description || "",
  category: fields.Select,
  // Attachments can be stored separately or as JSON in description
}
```

---

## Special Handling Required

### 1. Linked Records (Relationships)
- **Team Roster** (Task List → Contacts): Create entries in `project_assignments`
- **Blocking/Blocked By** (Task List → Task List): Store as `depends_on` array

### 2. Attachments
All attachments need to be:
1. Downloaded from Airtable URLs
2. Uploaded to Supabase Storage
3. Create records in `documents` table with new URLs

### 3. User Creation
Since contacts include both team members and vendors:
- Team members → users with `role = "member"`
- Vendors → users with `role = "vendor"`
- Generate placeholder emails for users without email addresses

### 4. Date Fields
Need to verify which date fields exist in Task List:
- Due date
- Start date
- End date
- Created date (available as `createdTime`)

---

## Database Schema Updates Needed

### Update `users` table:
```sql
ALTER TABLE users ADD COLUMN phone TEXT;
ALTER TABLE users ADD COLUMN contact_type TEXT;
ALTER TABLE users ADD COLUMN service_type TEXT;
```

### Update `projects` table (if needed):
- Verify all fields match Task List fields
- May need to add project_area separately from location

---

## Migration Steps

1. **Fetch all Contacts** → Create users
2. **Fetch all Task List** → Create projects
3. **Create project_assignments** based on Team Roster links
4. **Download and upload attachments** → Create documents records
5. **Fetch Static Information** → Create static_info records
6. **Fetch Items and Purchases** (once access granted) → Create items records

---

## Next Actions

1. ✅ Update Airtable PAT to include "Items and Purchases" table
2. Update database schema for users table (add phone, contact_type, service_type)
3. Create migration script
4. Test with small subset of data
5. Run full migration
