import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendTeamAddedEmail } from "@/lib/email";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { user_ids } = body;

  const supabase = await createClient();

  try {
    // Get current user who is making this change
    const { data: { user: authUser } } = await supabase.auth.getUser();
    let addedByName: string | undefined;
    
    if (authUser?.email) {
      const { data: currentUser } = await supabase
        .from("users")
        .select("name")
        .eq("email", authUser.email)
        .single();
      addedByName = currentUser?.name;
    }

    // Get project info for the email
    const { data: project } = await supabase
      .from("projects")
      .select("title")
      .eq("id", id)
      .single();

    // Get existing assignments to determine who is newly added
    const { data: existingAssignments } = await supabase
      .from("project_assignments")
      .select("user_id")
      .eq("project_id", id);

    const existingUserIds = new Set(existingAssignments?.map(a => a.user_id) || []);
    const newUserIds = (user_ids || []).filter((uid: string) => !existingUserIds.has(uid));

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

    // Send email notifications to newly added users (non-blocking)
    if (newUserIds.length > 0 && project?.title) {
      // Fetch info for newly added users
      const { data: newUsers } = await supabase
        .from("users")
        .select("id, name, email")
        .in("id", newUserIds);

      if (newUsers && newUsers.length > 0) {
        // Send emails in background (don't await to avoid blocking response)
        Promise.all(
          newUsers.map(user =>
            sendTeamAddedEmail({
              recipientEmail: user.email,
              recipientName: user.name,
              projectTitle: project.title,
              projectId: id,
              addedByName,
            }).catch(err => console.error(`Failed to send email to ${user.email}:`, err))
          )
        ).then(results => {
          console.log(`[Assignments] Sent ${results.length} team added notifications`);
        });
      }
    }

    // Fetch updated project with assignments
    const { data: updatedProject, error: fetchError } = await supabase
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

    return NextResponse.json({ project: updatedProject });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update assignments" },
      { status: 500 }
    );
  }
}
