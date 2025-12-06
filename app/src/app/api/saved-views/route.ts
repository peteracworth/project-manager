import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const searchParams = request.nextUrl.searchParams;
  const tableName = searchParams.get("table");

  try {
    let query = supabase
      .from("saved_views")
      .select("*")
      .order("created_at", { ascending: false });

    if (tableName) {
      query = query.eq("table_name", tableName);
    }

    const { data: views, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({ views: views || [] });
  } catch (error: any) {
    console.error("[GET /api/saved-views] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();

  const { name, table_name, view_type, filters, group_by, search_term, hidden_columns } = body;

  if (!name || !table_name) {
    return NextResponse.json(
      { error: "Name and table_name are required" },
      { status: 400 }
    );
  }

  try {
    const { data: view, error } = await supabase
      .from("saved_views")
      .insert({
        name,
        table_name,
        view_type: view_type || "table",
        filters: filters || [],
        group_by: group_by || null,
        search_term: search_term || null,
        hidden_columns: hidden_columns || [],
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ view });
  } catch (error: any) {
    console.error("[POST /api/saved-views] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

