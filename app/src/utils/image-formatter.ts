/**
 * Shared utility for formatting image thumbnails in Tabulator tables
 */

import { Document } from "@/types/database";

export interface ImageFormatterOptions {
  maxThumbnails?: number;
  thumbnailSize?: number;
}

const DEFAULT_OPTIONS: Required<ImageFormatterOptions> = {
  maxThumbnails: 3,
  thumbnailSize: 32,
};

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"];

const FILE_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  PDF: { bg: "#ef4444", text: "#ffffff" },
  DOC: { bg: "#2563eb", text: "#ffffff" },
  DOCX: { bg: "#2563eb", text: "#ffffff" },
  XLS: { bg: "#16a34a", text: "#ffffff" },
  XLSX: { bg: "#16a34a", text: "#ffffff" },
  PPT: { bg: "#ea580c", text: "#ffffff" },
  PPTX: { bg: "#ea580c", text: "#ffffff" },
  TXT: { bg: "#6b7280", text: "#ffffff" },
  ZIP: { bg: "#8b5cf6", text: "#ffffff" },
};

/**
 * Formats an array of image URLs as HTML thumbnails with a count badge
 * Used for items and static_info tables where we have direct image URLs
 */
export function formatImageThumbnails(
  imageUrls: string[],
  options: ImageFormatterOptions = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const count = imageUrls.length;

  if (count === 0) {
    return `<div style="color: #9ca3af; font-size: 12px;">No images</div>`;
  }

  let html = '<div style="display: flex; align-items: center; gap: 4px;">';

  // Show up to maxThumbnails thumbnails
  const thumbnailsToShow = imageUrls.slice(0, opts.maxThumbnails);
  thumbnailsToShow.forEach((url: string) => {
    html += `<img src="${url}" style="width: ${opts.thumbnailSize}px; height: ${opts.thumbnailSize}px; object-fit: cover; border-radius: 3px; border: 1px solid #e5e7eb;" onerror="this.style.display='none'" />`;
  });

  // Show count badge
  html += `<span style="background: #f3f4f6; color: #6b7280; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 500;">${count}</span>`;
  html += "</div>";

  return html;
}

/**
 * Formats an array of documents (which may include images and other file types) as HTML thumbnails with a count badge
 * Used for projects table where we have document objects with filenames and URLs
 */
export function formatDocumentThumbnails(
  documents: Document[],
  options: ImageFormatterOptions = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const count = documents.length;

  if (count === 0) {
    return `<div style="color: #9ca3af; font-size: 12px;">No attachments</div>`;
  }

  let html = '<div style="display: flex; align-items: center; gap: 4px;">';

  // Show up to maxThumbnails thumbnails (images or file type badges)
  const thumbnailsToShow = documents.slice(0, opts.maxThumbnails);
  thumbnailsToShow.forEach((doc: Document) => {
    const filename = doc.filename?.toLowerCase() || "";
    const isImageFile = IMAGE_EXTENSIONS.some((ext) => filename.endsWith(ext));

    if (isImageFile) {
      // Show image thumbnail
      let url = doc.storage_url;
      if (doc.thumbnail_url && !doc.thumbnail_url.includes("airtableusercontent.com")) {
        url = doc.thumbnail_url;
      }

      if (url) {
        html += `<img src="${url}" style="width: 24px; height: 24px; object-fit: cover; border-radius: 3px; border: 1px solid #e5e7eb;" onerror="this.style.display='none'" />`;
      }
    } else {
      // Show file type badge
      const ext = filename.split(".").pop()?.toUpperCase() || "FILE";
      const color = FILE_TYPE_COLORS[ext] || { bg: "#6b7280", text: "#ffffff" };
      html += `<div style="width: 24px; height: 24px; background: ${color.bg}; color: ${color.text}; border-radius: 3px; display: flex; align-items: center; justify-content: center; font-size: 7px; font-weight: 700; font-family: monospace; border: 1px solid #e5e7eb;">${ext.substring(0, 4)}</div>`;
    }
  });

  // Show count badge
  html += `<span style="background: #f3f4f6; color: #6b7280; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 500;">${count}</span>`;
  html += "</div>";

  return html;
}
