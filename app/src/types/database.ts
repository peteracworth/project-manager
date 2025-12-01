export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  contact_type?: string | null;
  role: string;
  service_type?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority?: string | null;
  location?: string | null;
  project_area?: string | null;
  tags?: string[];
  depends_on?: string[];
  blocked_by?: string[];
  blocking?: string[];
  start_date?: string | null;
  end_date?: string | null;
  due_date?: string | null;
  progress: number;
  task_progress?: string | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  project_assignments?: ProjectAssignment[];
  documents?: Document[];
}

export interface ProjectAssignment {
  id: string;
  project_id: string;
  user_id: string;
  role: string;
  assigned_at: string;
  user?: User;
}

export interface Item {
  id: string;
  item_name: string;
  details?: string | null;
  category?: string | null;
  room_space?: string | null;
  sheen?: string | null;
  estimate?: number | null;
  notes?: string | null;
  link?: string | null;
  is_suggestion: boolean;
  is_rejected: boolean;
  vendor_id?: string | null;
  image_urls?: string[];
  created_at: string;
  updated_at: string;
}

export interface StaticInfo {
  id: string;
  key: string;
  value: string;
  category?: string | null;
  description?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  project_id: string;
  filename: string;
  file_type?: string | null;
  file_size?: number | null;
  storage_path: string;
  storage_url: string;
  thumbnail_url?: string | null;
  uploaded_by?: string | null;
  uploaded_at: string;
}

export interface Message {
  id: string;
  project_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user?: User;
}
