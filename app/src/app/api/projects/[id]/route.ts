import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("projects")
    .select(`
      *,
      documents (
        id,
        filename,
        file_type,
        storage_path,
        storage_url,
        file_size
      )
    `)
    .eq("id", id)
    .single();

  if (error) {
    console.error('[GET /api/projects/[id]] Error fetching project:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ project: data });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("projects")
    .update(body)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ project: data });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  // Delete related records first (project_assignments, documents, messages)
  // These should cascade due to ON DELETE CASCADE, but let's be explicit
  
  const { error: assignmentsError } = await supabase
    .from("project_assignments")
    .delete()
    .eq("project_id", id);

  if (assignmentsError) {
    console.error('[DELETE /api/projects/[id]] Error deleting assignments:', assignmentsError);
  }

  const { error: documentsError } = await supabase
    .from("documents")
    .delete()
    .eq("project_id", id);

  if (documentsError) {
    console.error('[DELETE /api/projects/[id]] Error deleting documents:', documentsError);
  }

  const { error: messagesError } = await supabase
    .from("messages")
    .delete()
    .eq("project_id", id);

  if (messagesError) {
    console.error('[DELETE /api/projects/[id]] Error deleting messages:', messagesError);
  }

  // Now delete the project
  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", id);

  if (error) {
    console.error('[DELETE /api/projects/[id]] Error deleting project:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
