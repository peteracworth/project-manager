import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendBatchCommentEmails } from "@/lib/email";

const VALID_ENTITY_TYPES = ["project", "user", "item", "static_info"] as const;
type EntityType = (typeof VALID_ENTITY_TYPES)[number];

function isValidEntityType(type: string): type is EntityType {
  return VALID_ENTITY_TYPES.includes(type as EntityType);
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const entityType = searchParams.get("entityType");
  const entityId = searchParams.get("entityId");

  if (!entityType || !entityId) {
    return NextResponse.json(
      { error: "Missing entityType or entityId" },
      { status: 400 }
    );
  }

  if (!isValidEntityType(entityType)) {
    return NextResponse.json(
      { error: "Invalid entity type" },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  try {
    // Support both old (project_id) and new (entity_type/entity_id) schema
    let query;
    if (entityType === "project") {
      // For projects, check both old and new columns for backwards compatibility
      query = supabase
        .from("messages")
        .select(`
          *,
          user:users (
            id,
            name,
            email,
            avatar_url
          )
        `)
        .or(`project_id.eq.${entityId},and(entity_type.eq.${entityType},entity_id.eq.${entityId})`)
        .order("created_at", { ascending: true });
    } else {
      query = supabase
        .from("messages")
        .select(`
          *,
          user:users (
            id,
            name,
            email,
            avatar_url
          )
        `)
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("created_at", { ascending: true });
    }

    const { data: messages, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({ messages: messages || [] });
  } catch (error: any) {
    console.error("[GET /api/messages] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { entityType, entityId, content } = body;

  if (!entityType || !entityId || !content) {
    return NextResponse.json(
      { error: "Missing entityType, entityId, or content" },
      { status: 400 }
    );
  }

  if (!isValidEntityType(entityType)) {
    return NextResponse.json(
      { error: "Invalid entity type" },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  try {
    // Get the current authenticated user
    const {
      data: { user: authUser },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !authUser) {
      console.error("[POST messages] Not authenticated:", userError);
      return NextResponse.json(
        {
          error: "Not authenticated",
          debug: { userError: userError?.message },
        },
        { status: 401 }
      );
    }

    // Find the corresponding user in the users table by email
    const { data: dbUser, error: dbUserError } = await supabase
      .from("users")
      .select("id, email, name")
      .eq("email", authUser.email)
      .single();

    if (dbUserError || !dbUser) {
      console.error(
        "[POST messages] User not found in users table:",
        authUser.email
      );
      return NextResponse.json(
        {
          error: "User not found in database. Please contact an administrator.",
          debug: {
            authEmail: authUser.email,
            dbUserError: dbUserError?.message,
          },
        },
        { status: 404 }
      );
    }

    // Insert with both old and new columns for backwards compatibility
    const insertData: any = {
      user_id: dbUser.id,
      content,
      entity_type: entityType,
      entity_id: entityId,
    };

    // For projects, also set project_id for backwards compatibility
    if (entityType === "project") {
      insertData.project_id = entityId;
    }

    const { data: message, error } = await supabase
      .from("messages")
      .insert(insertData)
      .select(`
        *,
        user:users (
          id,
          name,
          email,
          avatar_url
        )
      `)
      .single();

    if (error) {
      console.error("[POST messages] Insert error:", error);
      throw error;
    }

    // Send email notifications to team members for project comments (non-blocking)
    if (entityType === "project") {
      // Get project info and team roster
      const { data: project } = await supabase
        .from("projects")
        .select(`
          title,
          project_assignments (
            user:users (
              id,
              name,
              email
            )
          )
        `)
        .eq("id", entityId)
        .single();

      if (project?.project_assignments && project.project_assignments.length > 0) {
        const teamMembers = project.project_assignments
          .map((a: any) => a.user)
          .filter((u: any) => u && u.email);

        // Send emails in background (don't await to avoid blocking response)
        sendBatchCommentEmails({
          recipients: teamMembers.map((u: any) => ({ email: u.email, name: u.name })),
          projectTitle: project.title,
          projectId: entityId,
          commenterName: dbUser.name,
          commentContent: content,
          excludeEmail: dbUser.email, // Don't notify the commenter
        }).then(result => {
          console.log(`[Messages] Comment notifications: ${result.sent} sent, ${result.failed} failed`);
        }).catch(err => {
          console.error("[Messages] Failed to send comment notifications:", err);
        });
      }
    }

    return NextResponse.json({ message });
  } catch (error: any) {
    console.error("[POST /api/messages] Error:", error);
    return NextResponse.json(
      {
        error: error.message,
        debug: error,
      },
      { status: 500 }
    );
  }
}

