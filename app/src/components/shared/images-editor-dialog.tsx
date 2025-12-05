'use client';

import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ImagesEditorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  entityId: string;
  entityType: 'item' | 'static_info';
  imageUrls: string[];
  onUpdate: () => void;
}

export function ImagesEditorDialog({
  isOpen,
  onClose,
  entityId,
  entityType,
  imageUrls,
  onUpdate,
}: ImagesEditorDialogProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();

      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }

      const endpoint = entityType === 'item'
        ? `/api/items/${entityId}/images`
        : `/api/static-info/${entityId}/images`;

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(errorData.error || 'Failed to upload files');
      }

      // Refresh the images list
      await onUpdate();

      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      setUploadError(error.message || 'Failed to upload files');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async (imageUrl: string) => {
    if (!confirm('Are you sure you want to delete this image?')) return;

    try {
      const endpoint = entityType === 'item'
        ? `/api/items/${entityId}/images?url=${encodeURIComponent(imageUrl)}`
        : `/api/static-info/${entityId}/images?url=${encodeURIComponent(imageUrl)}`;

      const response = await fetch(endpoint, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete image');
      }

      // Refresh the images list
      await onUpdate();
    } catch (error: any) {
      console.error('Delete error:', error);
      alert('Failed to delete image. Please try again.');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Images</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Upload Section */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              id="image-upload"
            />
            <label
              htmlFor="image-upload"
              className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              {uploading ? 'Uploading...' : 'Choose Images to Upload'}
            </label>
            <p className="text-sm text-gray-500 mt-2">
              Click to select images or drag and drop
            </p>
            {uploadError && (
              <p className="text-sm text-red-600 mt-2">{uploadError}</p>
            )}
          </div>

          {/* Images List */}
          {imageUrls.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No images yet
            </div>
          ) : (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-700">
                Images ({imageUrls.length})
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {imageUrls.map((url, index) => (
                  <div
                    key={index}
                    className="flex flex-col gap-2 p-3 border rounded-lg hover:bg-gray-50"
                  >
                    {/* Image */}
                    <div className="flex-shrink-0">
                      <img
                        src={url}
                        alt={`Image ${index + 1}`}
                        className="w-full h-48 object-cover rounded border"
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 px-3 py-1 text-sm text-center bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                      >
                        View Full Size
                      </a>
                      <button
                        onClick={() => handleDeleteImage(url)}
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
          <Button onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
