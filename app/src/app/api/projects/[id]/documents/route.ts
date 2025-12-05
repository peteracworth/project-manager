import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id: projectId } = await params;

  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No files provided" },
        { status: 400 }
      );
    }

    const uploadedDocuments = [];

    for (const file of files) {
      // Generate unique filename
      const fileExt = file.name.split(".").pop();
      const fileName = `${projectId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("project-documents")
        .upload(fileName, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        return NextResponse.json(
          { error: `Failed to upload ${file.name}: ${uploadError.message}` },
          { status: 500 }
        );
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("project-documents")
        .getPublicUrl(fileName);

      // Create document record in database
      const { data: document, error: dbError } = await supabase
        .from("documents")
        .insert({
          project_id: projectId,
          filename: file.name,
          file_type: file.type || 'application/octet-stream',
          storage_path: fileName,
          storage_url: urlData.publicUrl,
          file_size: file.size,
        })
        .select()
        .single();

      if (dbError) {
        console.error("Database error:", dbError);
        // Try to clean up uploaded file
        await supabase.storage.from("project-documents").remove([fileName]);
        return NextResponse.json(
          { error: `Failed to create document record: ${dbError.message}` },
          { status: 500 }
        );
      }

      uploadedDocuments.push(document);
    }

    return NextResponse.json({ documents: uploadedDocuments }, { status: 201 });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload files" },
      { status: 500 }
    );
  }
}
