import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const { data: projects, error } = await supabase
    .from("projects")
    .select(`
      *,
      project_assignments (
        user:users (
          id,
          name,
          email
        )
      ),
      documents (
        id,
        filename,
        file_type,
        file_size,
        storage_url,
        thumbnail_url,
        storage_path
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch message counts for each project
  if (projects && projects.length > 0) {
    const projectIds = projects.map(p => p.id);

    const { data: messageCounts } = await supabase
      .from("messages")
      .select("project_id")
      .in("project_id", projectIds);

    // Count messages per project
    const countMap = new Map<string, number>();
    messageCounts?.forEach(msg => {
      countMap.set(msg.project_id, (countMap.get(msg.project_id) || 0) + 1);
    });

    // Add message_count to each project
    projects.forEach(project => {
      (project as any).message_count = countMap.get(project.id) || 0;
    });
  }

  return NextResponse.json({ projects });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  try {
    const body = await request.json();

    // Remove team_roster from the project data (it's handled separately)
    const { team_roster, ...projectData } = body;

    // Get the current user to set as created_by
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Add created_by field
    projectData.created_by = user.id;

    const { data: project, error } = await supabase
      .from("projects")
      .insert(projectData)
      .select()
      .single();

    if (error) {
      console.error('[POST /api/projects] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ project });
  } catch (error: any) {
    console.error('[POST /api/projects] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
