# Project Management System - Implementation Plan

## Overview
Build a self-hosted Airtable replacement for project management with support for multiple users, projects, document uploads, chat, and multiple views (table, Gantt, Kanban).

**Key Requirements:**
- Migrate 4 Airtable tables: Task List, Contacts (users), Items and Purchases, Static Information
- ~50 projects, ~10 users
- All users can see all projects
- **Google OAuth authentication** (via Supabase Auth)
- One-time migration from Airtable
- Deploy to Vercel

## Technology Stack

### Frontend & Backend
- **Next.js 14+** (App Router) with TypeScript
- **React 18+**
- **Tailwind CSS** for styling
- **shadcn/ui** for UI components

### Database & Backend Services
- **Supabase** (PostgreSQL database)
- **Supabase Storage** for file uploads
- **Supabase Realtime** for chat functionality
- **Prisma** ORM for type-safe database access

### Key Libraries
- **@tanstack/react-table** - Advanced table with sorting, filtering, grouping
- **@tanstack/react-query** - Data fetching and caching
- **@hello-pangea/dnd** - Drag-and-drop for Kanban board
- **react-gantt-chart** or **frappe-gantt-react** - Gantt chart visualization
- **react-dropzone** - File upload with drag-and-drop
- **@supabase/ssr** - Supabase auth for Next.js
- **date-fns** or **dayjs** - Date manipulation

### Deployment
- **Vercel** - Next.js frontend hosting
- **Supabase Cloud** - Database, storage, and realtime

---

## Phase 1: Project Setup & Infrastructure

### 1.1 Initialize Next.js Project
```bash
npx create-next-app@latest project-manager --typescript --tailwind --app --src-dir
```

**Configuration:**
- TypeScript: Yes
- App Router: Yes
- Tailwind CSS: Yes
- src directory: Yes
- Import alias: @/*

### 1.2 Install Core Dependencies
```bash
npm install @supabase/supabase-js @supabase/ssr
npm install @tanstack/react-query @tanstack/react-table
npm install prisma @prisma/client
npm install date-fns
npm install zod react-hook-form @hookform/resolvers
```

### 1.3 Install UI Dependencies
```bash
npx shadcn-ui@latest init
npx shadcn-ui@latest add table button input card dialog dropdown-menu select
npm install @hello-pangea/dnd
npm install react-dropzone
npm install frappe-gantt-react
```

### 1.4 Setup Supabase
- Create Supabase project
- Get API keys (anon public key, service role key)
- Configure environment variables:
  ```
  NEXT_PUBLIC_SUPABASE_URL=
  NEXT_PUBLIC_SUPABASE_ANON_KEY=
  SUPABASE_SERVICE_ROLE_KEY=
  DATABASE_URL= (for Prisma)
  ```

### 1.5 Setup Supabase Clients
Create utility files for Supabase client creation:
- `src/lib/supabase/client.ts` - Client component client
- `src/lib/supabase/server.ts` - Server component client
- `src/lib/supabase/middleware.ts` - Auth middleware

---

## Phase 2: Database Schema Design

### 2.1 Core Tables

**Note:** Schema will be updated after inspecting actual Airtable structure. The following represents the initial design based on requirements.

#### Users Table (from Airtable "Contacts")
```prisma
model User {
  id            String      @id @default(uuid())
  email         String      @unique
  name          String
  avatar_url    String?
  role          String      @default("member") // admin, member
  created_at    DateTime    @default(now())
  updated_at    DateTime    @updatedAt

  // Relations
  assigned_projects  ProjectAssignment[]
  uploaded_documents Document[]
  messages          Message[]
}
```

#### Projects Table (from Airtable "Task List")
```prisma
model Project {
  id              String      @id @default(uuid())
  title           String
  description     String?
  status          String      // Will match Airtable status values
  priority        String?
  location        String?
  tags            String[]    // Array of tags
  start_date      DateTime?
  end_date        DateTime?
  due_date        DateTime?
  progress        Int         @default(0) // 0-100

  // Dependencies
  depends_on      String[]    // Array of project IDs

  // Metadata
  created_at      DateTime    @default(now())
  updated_at      DateTime    @updatedAt
  created_by      String

  // Relations
  assignments     ProjectAssignment[]
  documents       Document[]
  messages        Message[]
}
```

#### Items Table (from Airtable "Items and Purchases")
```prisma
model Item {
  id            String      @id @default(uuid())
  name          String
  description   String?
  category      String?
  cost          Decimal?    @db.Decimal(10, 2)
  quantity      Int?
  purchased_date DateTime?
  vendor        String?
  project_id    String?     // Optional link to project

  created_at    DateTime    @default(now())
  updated_at    DateTime    @updatedAt

  // Relations
  project       Project?    @relation(fields: [project_id], references: [id])
}
```

#### StaticInfo Table (from Airtable "Static Information")
```prisma
model StaticInfo {
  id            String      @id @default(uuid())
  key           String      @unique  // e.g., "company_name", "default_location"
  value         String
  category      String?     // For grouping related settings
  description   String?

  created_at    DateTime    @default(now())
  updated_at    DateTime    @updatedAt
}
```

#### ProjectAssignment (Join Table)
```prisma
model ProjectAssignment {
  id          String    @id @default(uuid())
  project_id  String
  user_id     String
  role        String?   // "owner", "contributor", "viewer"
  assigned_at DateTime  @default(now())

  project     Project   @relation(fields: [project_id], references: [id], onDelete: Cascade)
  user        User      @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@unique([project_id, user_id])
}
```

#### Documents Table
```prisma
model Document {
  id            String    @id @default(uuid())
  project_id    String
  filename      String
  file_type     String    // "jpg", "png", "pdf", etc.
  file_size     Int       // bytes
  storage_path  String    // Supabase Storage path
  storage_url   String    // Public URL
  thumbnail_url String?   // For images
  uploaded_by   String
  uploaded_at   DateTime  @default(now())

  project       Project   @relation(fields: [project_id], references: [id], onDelete: Cascade)
  uploader      User      @relation(fields: [uploaded_by], references: [id])
}
```

#### Messages Table (Chat)
```prisma
model Message {
  id          String    @id @default(uuid())
  project_id  String
  user_id     String
  content     String
  created_at  DateTime  @default(now())
  updated_at  DateTime  @updatedAt

  project     Project   @relation(fields: [project_id], references: [id], onDelete: Cascade)
  user        User      @relation(fields: [user_id], references: [id])
}
```

### 2.2 Setup Prisma
```bash
npx prisma init
# Copy schema above to prisma/schema.prisma
npx prisma generate
npx prisma db push
```

### 2.3 Supabase Storage Buckets
Create storage buckets in Supabase dashboard:
- `project-documents` - For all project files
- `user-avatars` - For user profile pictures

Configure bucket policies for authenticated access.

### 2.4 Row Level Security (RLS)
Setup RLS policies in Supabase:
- Users can read all users (all users can see all data)
- Users can only update their own profile
- Users can read all projects (per requirement: all users see all projects)
- Users can create/update projects
- Users can read/create documents for any project
- Users can read/create messages for any project
- Items and StaticInfo tables are readable by all authenticated users

---

## Phase 3: Airtable Data Migration

### 3.1 Airtable API Setup
- Create Personal Access Token in Airtable
- Identify base ID and table IDs
- Document field mappings between Airtable and our schema

### 3.2 Migration Script
Create `scripts/migrate-from-airtable.ts`:
- Fetch all records from Airtable "Contacts" table → Users
- Fetch all records from Airtable "Task List" table → Projects
- Fetch all records from Airtable "Items and Purchases" table → Items
- Fetch all records from Airtable "Static Information" table → StaticInfo
- Map Airtable fields to our database schema
- Handle linked records (user assignments, project-item links)
- Download and re-upload attachments to Supabase Storage
- Insert data into Supabase via Prisma

### 3.3 Data Mapping
```typescript
// Airtable -> Our Schema (will be refined after API inspection)

// Contacts → Users
{
  // Field mappings TBD based on actual Airtable structure
}

// Task List → Projects
{
  // Field mappings TBD based on actual Airtable structure
  // Will include: Name, Status, Priority, Dates, Assigned users, Attachments, etc.
}

// Items and Purchases → Items
{
  // Field mappings TBD based on actual Airtable structure
}

// Static Information → StaticInfo
{
  // Key-value pairs from Airtable
}

// Attachments handling:
// - Download from Airtable URLs
// - Upload to Supabase Storage
// - Create Document records with new URLs
```

### 3.4 Execute Migration
```bash
npm run migrate:airtable
```

---

## Phase 4: Core Application Structure

### 4.1 Project Structure
```
src/
├── app/
│   ├── (auth)/
│   │   └── login/              # Google OAuth login page
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts        # OAuth callback handler
│   ├── (dashboard)/
│   │   ├── contacts/
│   │   │   └── page.tsx          # Contacts/Users table view
│   │   ├── projects/
│   │   │   ├── page.tsx          # Projects table view
│   │   │   ├── kanban/
│   │   │   │   └── page.tsx      # Kanban board
│   │   │   ├── gantt/
│   │   │   │   └── page.tsx      # Gantt chart
│   │   │   └── [id]/
│   │   │       └── page.tsx      # Project detail
│   │   ├── items/
│   │   │   └── page.tsx          # Items and Purchases table
│   │   ├── settings/
│   │   │   └── page.tsx          # Static Information management
│   │   └── layout.tsx            # Dashboard layout with nav
│   ├── api/
│   │   ├── projects/
│   │   ├── users/
│   │   ├── documents/
│   │   └── messages/
│   └── layout.tsx
├── components/
│   ├── ui/                        # shadcn components
│   ├── users/
│   │   └── users-table.tsx
│   ├── projects/
│   │   ├── projects-table.tsx
│   │   ├── kanban-board.tsx
│   │   ├── gantt-chart.tsx
│   │   ├── project-card.tsx
│   │   └── project-detail.tsx
│   ├── documents/
│   │   ├── document-upload.tsx
│   │   └── document-list.tsx
│   └── chat/
│       └── project-chat.tsx
├── lib/
│   ├── supabase/
│   ├── hooks/
│   ├── utils/
│   └── types/
└── prisma/
    └── schema.prisma
```

### 4.2 API Routes (Server Actions)
Create server actions in `src/app/actions/`:
- `users.ts` - CRUD for users/contacts
- `projects.ts` - CRUD for projects
- `items.ts` - CRUD for items and purchases
- `static-info.ts` - CRUD for static information
- `documents.ts` - Upload/delete documents
- `messages.ts` - Create/fetch messages

---

## Phase 5: Feature Implementation

### 5.1 Contacts/Users Management View

**Components:**
- `src/app/(dashboard)/contacts/page.tsx` - Page wrapper
- `src/components/contacts/contacts-table.tsx` - Table with TanStack Table

**Features:**
- Display all contacts/users in table format
- Columns based on Airtable "Contacts" fields (TBD after API inspection)
- Inline editing capabilities
- Add new contact button
- Delete contact with confirmation
- Search and filter

**Implementation:**
```typescript
// Use TanStack Table with:
- Column definitions
- Sorting
- Filtering
- Pagination
- Inline editing cells
```

### 5.2 Projects Table View

**Components:**
- `src/app/(dashboard)/projects/page.tsx`
- `src/components/projects/projects-table.tsx`

**Features:**
- Display all projects in table format
- Columns based on Airtable "Task List" fields (will be determined after API inspection)
- **Grouping by any attribute:** Status, Priority, Location, Tags, or any other field (user-selectable)
- **Sorting by any column**
- Click row to open project detail
- Bulk actions (delete, change status)
- Create new project button
- Column visibility toggle

**Implementation:**
- TanStack Table with grouping enabled
- Dropdown to select grouping attribute
- Custom group headers
- Expandable groups
- Multi-column sorting

### 5.3 Kanban Board View

**Components:**
- `src/app/(dashboard)/projects/kanban/page.tsx`
- `src/components/projects/kanban-board.tsx`

**Features:**
- Columns for each status (Backlog, In Progress, Review, Completed)
- Drag and drop projects between columns
- Card shows: Title, assigned users, due date, priority badge
- Updates project status on drop
- Add new project card

**Implementation:**
```typescript
// Use @hello-pangea/dnd
<DragDropContext onDragEnd={handleDragEnd}>
  {statuses.map(status => (
    <Droppable droppableId={status}>
      {projects.filter(p => p.status === status).map(project => (
        <Draggable draggableId={project.id}>
          <ProjectCard {...project} />
        </Draggable>
      ))}
    </Droppable>
  ))}
</DragDropContext>
```

### 5.4 Gantt Chart View

**Components:**
- `src/app/(dashboard)/projects/gantt/page.tsx`
- `src/components/projects/gantt-chart.tsx`

**Features:**
- Timeline view of all projects
- Show start date, end date, duration
- Display dependencies between projects
- Color-coded by status or priority
- Zoom in/out timeline
- Click project bar to view details

**Implementation:**
```typescript
// Use frappe-gantt-react or react-gantt-chart
const tasks = projects.map(p => ({
  id: p.id,
  name: p.title,
  start: p.start_date,
  end: p.end_date,
  progress: p.progress,
  dependencies: p.depends_on.join(',')
}));

<Gantt tasks={tasks} />
```

### 5.5 Project Detail Page

**Components:**
- `src/app/(dashboard)/projects/[id]/page.tsx`
- `src/components/projects/project-detail.tsx`
- `src/components/documents/document-upload.tsx`
- `src/components/documents/document-list.tsx`
- `src/components/chat/project-chat.tsx`

**Features:**
- Edit all project fields (title, description, status, dates, etc.)
- Assign/unassign users
- Upload documents (drag & drop)
- View all documents with thumbnails
- Download/delete documents
- Real-time chat
- Show project dependencies

**Layout:**
```
┌─────────────────────────────────────┐
│ Project Header (Title, Status, etc) │
├──────────────────┬──────────────────┤
│                  │                  │
│  Project Details │   Team Members   │
│  (editable form) │   (assign/remove)│
│                  │                  │
├──────────────────┴──────────────────┤
│          Documents Section           │
│  [Drag & Drop Area] [File List]     │
├──────────────────────────────────────┤
│          Chat Section                │
│  [Messages] [Input]                  │
└──────────────────────────────────────┘
```

### 5.6 Document Upload & Management

**Implementation:**
```typescript
// react-dropzone for drag-and-drop
const onDrop = async (files: File[]) => {
  for (const file of files) {
    // 1. Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('project-documents')
      .upload(`${projectId}/${file.name}`, file);

    // 2. Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('project-documents')
      .getPublicUrl(data.path);

    // 3. Generate thumbnail for images
    let thumbnailUrl = null;
    if (file.type.startsWith('image/')) {
      thumbnailUrl = `${publicUrl}?width=200&height=200`;
    }

    // 4. Save to database
    await createDocument({
      project_id: projectId,
      filename: file.name,
      file_type: file.type,
      file_size: file.size,
      storage_path: data.path,
      storage_url: publicUrl,
      thumbnail_url: thumbnailUrl
    });
  }
};

<Dropzone onDrop={onDrop} accept={{
  'image/*': ['.jpg', '.jpeg', '.png'],
  'application/pdf': ['.pdf']
}}>
  {/* Upload UI */}
</Dropzone>
```

### 5.7 Real-time Chat

**Implementation:**
```typescript
// Subscribe to new messages
useEffect(() => {
  const channel = supabase
    .channel(`project:${projectId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'Message',
      filter: `project_id=eq.${projectId}`
    }, (payload) => {
      setMessages(prev => [...prev, payload.new]);
    })
    .subscribe();

  return () => supabase.removeChannel(channel);
}, [projectId]);

// Send message
const sendMessage = async (content: string) => {
  await supabase.from('Message').insert({
    project_id: projectId,
    user_id: currentUser.id,
    content
  });
};
```

---

## Phase 6: Authentication & Authorization

### 6.1 Setup Supabase Auth with Google OAuth
**Supabase Dashboard Configuration:**
1. Go to Authentication > Providers in Supabase dashboard
2. Enable Google provider
3. Create OAuth credentials in Google Cloud Console:
   - Go to https://console.cloud.google.com/
   - Create new project (or use existing)
   - Enable Google+ API
   - Create OAuth 2.0 credentials
   - Add authorized redirect URI: `https://<your-project>.supabase.co/auth/v1/callback`
4. Copy Client ID and Client Secret to Supabase
5. Configure redirect URLs in Supabase (for local and production)

**Environment Variables:**
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000 (dev) / https://your-app.vercel.app (prod)
```

### 6.2 Create Auth Pages
- `src/app/(auth)/login/page.tsx` - Single page with "Sign in with Google" button
- No signup page needed (Google handles account creation)
- Auto-create user record in database on first login

**Login Implementation:**
```typescript
// src/app/(auth)/login/page.tsx
const handleGoogleLogin = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      }
    }
  })
}
```

**Auth Callback Handler:**
```typescript
// src/app/auth/callback/route.ts
// Handles OAuth redirect from Google
// Extracts user info and creates/updates User record
// Gets email and name from Google profile
```

### 6.3 Protected Routes
- Middleware to check authentication
- Redirect to login if not authenticated
- Load user session on app load
- On first Google login, create User record with email and name from Google profile

### 5.8 Items and Purchases View

**Components:**
- `src/app/(dashboard)/items/page.tsx`
- `src/components/items/items-table.tsx`

**Features:**
- Display all items in table format
- Columns based on Airtable "Items and Purchases" fields
- Inline editing
- Link items to projects (optional)
- Add/delete items
- Search and filter by category, vendor, etc.
- Sort by cost, date, etc.

### 5.9 Static Information Management

**Components:**
- `src/app/(dashboard)/settings/page.tsx`
- `src/components/settings/static-info-manager.tsx`

**Features:**
- Display static information as key-value pairs
- Grouped by category
- Edit values inline
- Add new settings
- Delete settings with confirmation
- Used for app-wide configuration/reference data

### 6.4 Role-based Access
- All authenticated users can view and edit all data
- Admin role for user management (optional)
- Future: Can add more granular permissions if needed

---

## Phase 7: Polish & Optimization

### 7.1 Loading States
- Skeleton loaders for tables
- Loading spinners for actions
- Optimistic updates for mutations

### 7.2 Error Handling
- Toast notifications for errors
- Form validation with zod
- Error boundaries

### 7.3 Responsive Design
- Mobile-friendly table (horizontal scroll or cards)
- Responsive Kanban board
- Mobile chat interface

### 7.4 Performance
- Use React Query for caching
- Virtualized lists for large datasets
- Image optimization with Next.js Image

### 7.5 Testing
- Unit tests for utilities
- Integration tests for API routes
- E2E tests with Playwright (optional)

---

## Phase 8: Deployment

### 8.1 Environment Setup
- Setup production Supabase project
- Configure production environment variables in Vercel

### 8.2 Deploy to Vercel
```bash
vercel --prod
```

### 8.3 Run Migration
- Execute Airtable migration script against production database

### 8.4 Post-deployment
- Test all features in production
- Monitor errors with Vercel analytics
- Setup database backups in Supabase

---

## Implementation Order

1. **Week 1: Foundation**
   - Project setup
   - Database schema
   - Supabase configuration
   - Basic Next.js structure

2. **Week 2: Data & Auth**
   - Airtable migration script
   - Execute migration
   - Authentication setup
   - Protected routes

3. **Week 3: Core Views**
   - Users table view
   - Projects table view
   - Basic project detail page

4. **Week 4: Advanced Views**
   - Kanban board
   - Gantt chart
   - Document upload/management

5. **Week 5: Real-time & Polish**
   - Chat functionality
   - Real-time updates
   - UI polish
   - Error handling

6. **Week 6: Testing & Deployment**
   - Testing
   - Performance optimization
   - Production deployment
   - Migration to production

---

## Questions Answered ✅

1. ✅ **Tables**: Task List, Contacts, Items and Purchases, Static Information
2. ✅ **Authentication**: Google OAuth (via Supabase Auth) - single sign-on only
3. ✅ **Access Control**: All users see all projects
4. ✅ **Scale**: ~50 projects, ~10 users
5. ✅ **Migration**: One-time migration

## Remaining Questions

1. **Airtable API Access**: Do you have your Airtable Personal Access Token ready? Need base ID and API key to inspect schema.
2. **Next Step**: Should we start with Phase 1 (project setup), or should we first inspect your Airtable to finalize the schema?

---

## Estimated Complexity

- **Total Development Time**: 4-6 weeks (single developer)
- **Lines of Code**: ~8,000-12,000 LOC
- **Number of Components**: ~40-50 components
- **API Endpoints/Actions**: ~20-25 server actions

---

## Success Criteria

✅ Successfully migrate all data from Airtable
✅ Users can manage team members in table view
✅ Users can view/edit projects in table view with grouping
✅ Users can drag projects in Kanban board
✅ Users can visualize project timeline in Gantt chart
✅ Users can upload/view documents on projects
✅ Users can chat in real-time on projects
✅ All views are responsive and performant
✅ System is deployed and accessible on Vercel

---

## Resources & References

**Airtable API:**
- [Creating Personal Access Tokens](https://support.airtable.com/docs/creating-personal-access-tokens)
- [Airtable API Guide](https://zuplo.com/blog/2025/05/29/airtable-api)

**Next.js + Supabase:**
- [Supabase Next.js Quickstart](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- [Next.js + Supabase Best Practices](https://catjam.fi/articles/next-supabase-what-do-differently)

**Libraries:**
- [TanStack Table Documentation](https://tanstack.com/table/latest)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [React DnD (Hello Pangea)](https://github.com/hello-pangea/dnd)
- [Frappe Gantt](https://frappe.io/gantt)
