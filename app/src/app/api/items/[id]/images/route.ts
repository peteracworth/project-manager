import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id: itemId } = await params;

  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No files provided" },
        { status: 400 }
      );
    }

    // Get current item to get existing image_urls
    const { data: item, error: fetchError } = await supabase
      .from("items")
      .select("image_urls")
      .eq("id", itemId)
      .single();

    if (fetchError) {
      return NextResponse.json(
        { error: `Failed to fetch item: ${fetchError.message}` },
        { status: 500 }
      );
    }

    const uploadedUrls: string[] = [];

    for (const file of files) {
      // Generate unique filename
      const fileExt = file.name.split(".").pop();
      const fileName = `items/${itemId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

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

      uploadedUrls.push(urlData.publicUrl);
    }

    // Update item with new image URLs
    const existingUrls = item.image_urls || [];
    const updatedUrls = [...existingUrls, ...uploadedUrls];

    const { error: updateError } = await supabase
      .from("items")
      .update({ image_urls: updatedUrls })
      .eq("id", itemId);

    if (updateError) {
      console.error("Database error:", updateError);
      // Try to clean up uploaded files
      for (const url of uploadedUrls) {
        const path = url.split("/project-documents/")[1];
        if (path) {
          await supabase.storage.from("project-documents").remove([path]);
        }
      }
      return NextResponse.json(
        { error: `Failed to update item: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ image_urls: updatedUrls }, { status: 201 });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload files" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id: itemId } = await params;

  try {
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get("url");

    if (!imageUrl) {
      return NextResponse.json(
        { error: "Image URL is required" },
        { status: 400 }
      );
    }

    // Get current item
    const { data: item, error: fetchError } = await supabase
      .from("items")
      .select("image_urls")
      .eq("id", itemId)
      .single();

    if (fetchError || !item) {
      return NextResponse.json(
        { error: "Item not found" },
        { status: 404 }
      );
    }

    // Extract the file path from the storage URL
    const urlParts = imageUrl.split("/project-documents/");
    const filePath = urlParts.length > 1 ? urlParts[1] : null;

    // Delete from storage
    if (filePath) {
      const { error: storageError } = await supabase.storage
        .from("project-documents")
        .remove([filePath]);

      if (storageError) {
        console.error("Storage deletion error:", storageError);
        // Continue anyway to update database
      }
    }

    // Remove URL from array
    const updatedUrls = (item.image_urls || []).filter((url: string) => url !== imageUrl);

    // Update item
    const { error: updateError } = await supabase
      .from("items")
      .update({ image_urls: updatedUrls })
      .eq("id", itemId);

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to update item: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, image_urls: updatedUrls }, { status: 200 });
  } catch (error: any) {
    console.error("Delete error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete image" },
      { status: 500 }
    );
  }
}
