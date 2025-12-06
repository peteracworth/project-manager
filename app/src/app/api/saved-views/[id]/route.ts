import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  try {
    const { data: view, error } = await supabase
      .from("saved_views")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ view });
  } catch (error: any) {
    console.error("[GET /api/saved-views/[id]] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const body = await request.json();

  try {
    const { data: view, error } = await supabase
      .from("saved_views")
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ view });
  } catch (error: any) {
    console.error("[PATCH /api/saved-views/[id]] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from("saved_views")
      .delete()
      .eq("id", id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[DELETE /api/saved-views/[id]] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
