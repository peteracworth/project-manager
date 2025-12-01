-- Project Management System Database Schema
-- Run this in Supabase SQL Editor

-- Users table (from Airtable "Contacts")
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT DEFAULT 'member' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Projects table (from Airtable "Task List")
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL,
  priority TEXT,
  location TEXT,
  tags TEXT[],
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  progress INTEGER DEFAULT 0 NOT NULL,
  depends_on TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by TEXT NOT NULL
);

-- Items table (from Airtable "Items and Purchases")
CREATE TABLE IF NOT EXISTS items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  cost DECIMAL(10, 2),
  quantity INTEGER,
  purchased_date TIMESTAMPTZ,
  vendor TEXT,
  project_id UUID REFERENCES projects(id),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Static Info table (from Airtable "Static Information")
CREATE TABLE IF NOT EXISTS static_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  category TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Project Assignments (Join Table)
CREATE TABLE IF NOT EXISTS project_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT,
  assigned_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(project_id, user_id)
);

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  storage_url TEXT NOT NULL,
  thumbnail_url TEXT,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Messages table (Chat)
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE static_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies: All authenticated users can read all data
CREATE POLICY "Users can read all users" ON users FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can read all projects" ON projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create projects" ON projects FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update projects" ON projects FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Users can delete projects" ON projects FOR DELETE TO authenticated USING (true);

CREATE POLICY "Users can read all items" ON items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create items" ON items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update items" ON items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Users can delete items" ON items FOR DELETE TO authenticated USING (true);

CREATE POLICY "Users can read all static_info" ON static_info FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create static_info" ON static_info FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update static_info" ON static_info FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Users can delete static_info" ON static_info FOR DELETE TO authenticated USING (true);

CREATE POLICY "Users can read all assignments" ON project_assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create assignments" ON project_assignments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can delete assignments" ON project_assignments FOR DELETE TO authenticated USING (true);

CREATE POLICY "Users can read all documents" ON documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create documents" ON documents FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can delete documents" ON documents FOR DELETE TO authenticated USING (true);

CREATE POLICY "Users can read all messages" ON messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create messages" ON messages FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update own messages" ON messages FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own messages" ON messages FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_assignments_project_id ON project_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_project_assignments_user_id ON project_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents(project_id);
CREATE INDEX IF NOT EXISTS idx_messages_project_id ON messages(project_id);
CREATE INDEX IF NOT EXISTS idx_items_project_id ON items(project_id);
