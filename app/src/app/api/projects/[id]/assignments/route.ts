import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { user_ids } = body;

  const supabase = await createClient();

  try {
    // First, delete all existing assignments for this project
    const { error: deleteError } = await supabase
      .from("project_assignments")
      .delete()
      .eq("project_id", id);

    if (deleteError) throw deleteError;

    // Then, insert new assignments
    if (user_ids && user_ids.length > 0) {
      const assignments = user_ids.map((user_id: string) => ({
        project_id: id,
        user_id,
        role: "contributor",
      }));

      const { error: insertError } = await supabase
        .from("project_assignments")
        .insert(assignments);

      if (insertError) throw insertError;
    }

    // Fetch updated project with assignments
    const { data: project, error: fetchError } = await supabase
      .from("projects")
      .select(`
        *,
        project_assignments (
          user:users (
            id,
            name,
            email
          )
        )
      `)
      .eq("id", id)
      .single();

    if (fetchError) throw fetchError;

    return NextResponse.json({ project });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update assignments" },
      { status: 500 }
    );
  }
}
