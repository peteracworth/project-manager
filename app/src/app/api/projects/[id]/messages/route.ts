import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  try {
    const { data: messages, error } = await supabase
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
      .eq("project_id", id)
      .order("created_at", { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json({ messages: messages || [] });
  } catch (error: any) {
    console.error('[GET /api/projects/[id]/messages] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const supabase = await createClient();

  try {
    // Get the current authenticated user
    const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();

    console.log('[POST messages] Auth user:', authUser);

    if (userError || !authUser) {
      console.error('[POST messages] Not authenticated:', userError);
      return NextResponse.json({
        error: "Not authenticated",
        debug: { userError: userError?.message }
      }, { status: 401 });
    }

    // Find the corresponding user in the users table by email
    const { data: dbUser, error: dbUserError } = await supabase
      .from("users")
      .select("id, email, name")
      .eq("email", authUser.email)
      .single();

    console.log('[POST messages] DB user lookup:', { dbUser, dbUserError });

    if (dbUserError || !dbUser) {
      console.error('[POST messages] User not found in users table:', authUser.email);
      return NextResponse.json({
        error: "User not found in database. Please contact an administrator.",
        debug: {
          authEmail: authUser.email,
          dbUserError: dbUserError?.message
        }
      }, { status: 404 });
    }

    const { data: message, error } = await supabase
      .from("messages")
      .insert({
        project_id: id,
        user_id: dbUser.id,
        content: body.content,
      })
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
      console.error('[POST messages] Insert error:', error);
      throw error;
    }

    return NextResponse.json({ message });
  } catch (error: any) {
    console.error('[POST /api/projects/[id]/messages] Error:', error);
    return NextResponse.json({
      error: error.message,
      debug: error
    }, { status: 500 });
  }
}
