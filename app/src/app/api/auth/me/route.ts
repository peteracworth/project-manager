import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  try {
    // Get the current authenticated user from Supabase Auth
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError) {
      return NextResponse.json({
        authenticated: false,
        error: authError.message
      });
    }

    if (!authUser) {
      return NextResponse.json({
        authenticated: false,
        error: "No authenticated user"
      });
    }

    // Try to find the user in the users table
    const { data: dbUser, error: dbError } = await supabase
      .from("users")
      .select("*")
      .eq("email", authUser.email)
      .single();

    return NextResponse.json({
      authenticated: true,
      authUser: {
        id: authUser.id,
        email: authUser.email,
        created_at: authUser.created_at
      },
      dbUser: dbUser || null,
      dbError: dbError?.message || null,
      inUsersTable: !!dbUser
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message
    }, { status: 500 });
  }
}
