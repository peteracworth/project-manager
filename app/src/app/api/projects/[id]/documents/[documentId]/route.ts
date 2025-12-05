import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  const supabase = await createClient();
  const { id: projectId, documentId } = await params;

  try {
    // First, get the document to find the storage path
    const { data: document, error: fetchError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .eq("project_id", projectId)
      .single();

    if (fetchError || !document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Extract the file path from the storage URL
    // URL format: https://.../storage/v1/object/public/project-documents/path/to/file.ext
    const urlParts = document.storage_url.split("/project-documents/");
    const filePath = urlParts.length > 1 ? urlParts[1] : null;

    // Delete from storage
    if (filePath) {
      const { error: storageError } = await supabase.storage
        .from("project-documents")
        .remove([filePath]);

      if (storageError) {
        console.error("Storage deletion error:", storageError);
        // Continue anyway to delete database record
      }
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from("documents")
      .delete()
      .eq("id", documentId)
      .eq("project_id", projectId);

    if (deleteError) {
      return NextResponse.json(
        { error: `Failed to delete document: ${deleteError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("Delete error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete document" },
      { status: 500 }
    );
  }
}
