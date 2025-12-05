"use client";

import React, { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Document } from "@/types/database";

interface DocumentsEditorDialogProps {
  open: boolean;
  onClose: () => void;
  entityId: string;
  documents: Document[];
  onUpload: (files: FileList) => Promise<void>;
  onDelete: (documentId: string) => Promise<void>;
  onRefresh: () => Promise<void>;
}

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"];

const FILE_TYPE_COLORS: Record<string, string> = {
  pdf: "bg-red-500",
  doc: "bg-blue-600",
  docx: "bg-blue-600",
  xls: "bg-green-600",
  xlsx: "bg-green-600",
  ppt: "bg-orange-600",
  pptx: "bg-orange-600",
  txt: "bg-gray-500",
  zip: "bg-purple-600",
};

function isImage(filename: string): boolean {
  const lower = filename.toLowerCase();
  return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function getFileTypeColor(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  return FILE_TYPE_COLORS[ext] || "bg-gray-500";
}

export function DocumentsEditorDialog({
  open,
  onClose,
  entityId,
  documents,
  onUpload,
  onDelete,
  onRefresh,
}: DocumentsEditorDialogProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadError(null);

    try {
      await onUpload(files);
      await onRefresh();

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error: any) {
      setUploadError(error.message || "Failed to upload files");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm("Are you sure you want to delete this attachment?")) return;

    try {
      await onDelete(documentId);
      await onRefresh();
    } catch (error: any) {
      alert("Failed to delete attachment. Please try again.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Attachments</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Upload Section */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              id={`file-upload-${entityId}`}
            />
            <label
              htmlFor={`file-upload-${entityId}`}
              className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              {uploading ? "Uploading..." : "Choose Files to Upload"}
            </label>
            <p className="text-sm text-gray-500 mt-2">
              Click to select files or drag and drop
            </p>
            {uploadError && <p className="text-sm text-red-600 mt-2">{uploadError}</p>}
          </div>

          {/* Documents List */}
          {documents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No attachments yet</div>
          ) : (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-700">
                Attachments ({documents.length})
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50"
                  >
                    {/* Thumbnail or Icon */}
                    <div className="flex-shrink-0">
                      {isImage(doc.filename) ? (
                        <img
                          src={
                            doc.thumbnail_url &&
                            !doc.thumbnail_url.includes("airtableusercontent.com")
                              ? doc.thumbnail_url
                              : doc.storage_url
                          }
                          alt={doc.filename}
                          className="w-16 h-16 object-cover rounded border"
                        />
                      ) : (
                        <div
                          className={`w-16 h-16 rounded border flex items-center justify-center ${getFileTypeColor(
                            doc.filename
                          )}`}
                        >
                          <span className="text-sm font-bold text-white font-mono">
                            {(doc.filename.split(".").pop()?.toUpperCase() || "FILE").substring(
                              0,
                              4
                            )}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {doc.filename}
                      </div>
                      <div className="text-xs text-gray-500">
                        {doc.file_size
                          ? `${(doc.file_size / 1024).toFixed(1)} KB`
                          : "Unknown size"}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <a
                        href={doc.storage_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                      >
                        View
                      </a>
                      <button
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


