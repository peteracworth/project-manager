"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { ChatPanel } from "./chat-panel";

export interface FieldDefinition {
  name: string;
  label: string;
  type: "text" | "textarea" | "email" | "url" | "number" | "date" | "select" | "tags" | "currency";
  options?: string[]; // For select type
  placeholder?: string;
  width?: "full" | "half";
}

export type EntityType = "project" | "user" | "item" | "static_info";
export type DialogSize = "compact" | "default" | "large" | "full";

interface EntityEditorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  entityType: EntityType;
  entityId?: string;
  data: Record<string, any>;
  fields: FieldDefinition[];
  onUpdate: (entityId: string, field: string, value: any) => Promise<void>;
  showChat?: boolean;
}

export function EntityEditorDialog({
  isOpen,
  onClose,
  title,
  entityType,
  entityId,
  data,
  fields,
  onUpdate,
  showChat = true,
}: EntityEditorDialogProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState<string | null>(null);
  
  // Resizable dialog state
  const [dimensions, setDimensions] = useState({ width: 900, height: 600 });
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<{ startX: number; startY: number; startWidth: number; startHeight: number } | null>(null);

  // Load saved dimensions from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("entityEditorDialogDimensions");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setDimensions(parsed);
      } catch (e) {
        // ignore
      }
    }
  }, []);

  // Save dimensions when they change
  const saveDimensions = useCallback((dims: { width: number; height: number }) => {
    localStorage.setItem("entityEditorDialogDimensions", JSON.stringify(dims));
  }, []);

  // Handle resize start
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    resizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startWidth: dimensions.width,
      startHeight: dimensions.height,
    };
  }, [dimensions]);

  // Handle resize move
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeRef.current) return;
      
      const deltaX = e.clientX - resizeRef.current.startX;
      const deltaY = e.clientY - resizeRef.current.startY;
      
      const newWidth = Math.max(500, Math.min(window.innerWidth - 40, resizeRef.current.startWidth + deltaX));
      const newHeight = Math.max(400, Math.min(window.innerHeight - 40, resizeRef.current.startHeight + deltaY));
      
      setDimensions({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      saveDimensions(dimensions);
      resizeRef.current = null;
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, dimensions, saveDimensions]);

  // Reset form data when dialog opens or data changes
  useEffect(() => {
    setFormData({ ...data });
  }, [data, isOpen]);

  // Calculate chat width based on dialog width
  const chatWidth = Math.max(250, Math.min(400, dimensions.width * 0.35));

  const handleFieldChange = async (fieldName: string, value: any) => {
    // Update local state immediately
    setFormData((prev) => ({ ...prev, [fieldName]: value }));

    // If we have an entityId, save to server
    if (entityId) {
      setSaving(fieldName);
      try {
        await onUpdate(entityId, fieldName, value);
      } catch (error) {
        console.error(`Failed to update ${fieldName}:`, error);
        // Revert on error
        setFormData((prev) => ({ ...prev, [fieldName]: data[fieldName] }));
      } finally {
        setSaving(null);
      }
    }
  };

  const handleAddTag = async (fieldName: string, tag: string) => {
    const currentTags = formData[fieldName] || [];
    if (tag && !currentTags.includes(tag)) {
      const newTags = [...currentTags, tag];
      await handleFieldChange(fieldName, newTags);
    }
  };

  const handleRemoveTag = async (fieldName: string, tag: string) => {
    const currentTags = formData[fieldName] || [];
    const newTags = currentTags.filter((t: string) => t !== tag);
    await handleFieldChange(fieldName, newTags);
  };

  const renderField = (field: FieldDefinition) => {
    const value = formData[field.name];
    const isSaving = saving === field.name;

    switch (field.type) {
      case "textarea":
        return (
          <Textarea
            value={value || ""}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            rows={4}
            className={`resize-none ${isSaving ? "opacity-50" : ""}`}
            disabled={isSaving}
          />
        );

      case "select":
        return (
          <select
            value={value || ""}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${isSaving ? "opacity-50" : ""}`}
            disabled={isSaving}
          >
            <option value="">Select...</option>
            {field.options?.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        );

      case "tags":
        return (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {(value || []).map((tag: string) => (
                <Badge key={tag} variant="outline" className="gap-1">
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(field.name, tag)}
                    disabled={isSaving}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <Input
              placeholder={field.placeholder || "Add tag and press Enter"}
              disabled={isSaving}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const input = e.target as HTMLInputElement;
                  const tag = input.value.trim();
                  if (tag) {
                    handleAddTag(field.name, tag);
                    input.value = "";
                  }
                }
              }}
            />
          </div>
        );

      case "currency":
        return (
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
            <Input
              type="number"
              step="0.01"
              value={value || ""}
              onChange={(e) => handleFieldChange(field.name, e.target.value ? parseFloat(e.target.value) : null)}
              placeholder={field.placeholder}
              className={`pl-7 ${isSaving ? "opacity-50" : ""}`}
              disabled={isSaving}
            />
          </div>
        );

      case "number":
        return (
          <Input
            type="number"
            value={value || ""}
            onChange={(e) => handleFieldChange(field.name, e.target.value ? parseInt(e.target.value) : null)}
            placeholder={field.placeholder}
            className={isSaving ? "opacity-50" : ""}
            disabled={isSaving}
          />
        );

      case "date":
        return (
          <Input
            type="date"
            value={value ? value.split("T")[0] : ""}
            onChange={(e) => handleFieldChange(field.name, e.target.value || null)}
            className={isSaving ? "opacity-50" : ""}
            disabled={isSaving}
          />
        );

      case "url":
        return (
          <Input
            type="url"
            value={value || ""}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={field.placeholder || "https://..."}
            className={isSaving ? "opacity-50" : ""}
            disabled={isSaving}
          />
        );

      case "email":
        return (
          <Input
            type="email"
            value={value || ""}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            className={isSaving ? "opacity-50" : ""}
            disabled={isSaving}
          />
        );

      default:
        return (
          <Input
            type="text"
            value={value || ""}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            className={isSaving ? "opacity-50" : ""}
            disabled={isSaving}
          />
        );
    }
  };

  // Group fields by width for better layout
  const fullWidthFields = fields.filter((f) => f.width !== "half");
  const halfWidthFields = fields.filter((f) => f.width === "half");

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="p-0 overflow-hidden"
        style={{ 
          width: showChat && entityId ? dimensions.width : Math.min(dimensions.width, 672),
          height: dimensions.height,
          maxWidth: "95vw",
          maxHeight: "95vh",
        }}
      >
        <div className="flex h-full relative">
          {/* Main Form Panel */}
          <div className={`flex flex-col ${showChat && entityId ? "flex-1 border-r" : "w-full"}`}>
            <DialogHeader className="p-6 pb-0 shrink-0">
              <DialogTitle>{title}</DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Half-width fields in a grid */}
              {halfWidthFields.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                  {halfWidthFields.map((field) => (
                    <div key={field.name}>
                      <Label className="text-xs text-gray-500 mb-2 block">{field.label}</Label>
                      {renderField(field)}
                    </div>
                  ))}
                </div>
              )}

              {/* Full-width fields */}
              {fullWidthFields.map((field) => (
                <div key={field.name}>
                  <Label className="text-xs text-gray-500 mb-2 block">{field.label}</Label>
                  {renderField(field)}
                </div>
              ))}
            </div>

            <DialogFooter className="p-6 pt-4 border-t">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </DialogFooter>
          </div>

          {/* Chat Panel */}
          {showChat && entityId && (
            <ChatPanel
              entityType={entityType}
              entityId={entityId}
              className="h-full"
              style={{ width: chatWidth }}
            />
          )}

          {/* Resize Handle - Bottom Right Corner */}
          <div
            onMouseDown={handleResizeStart}
            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize z-50"
            style={{
              background: "linear-gradient(135deg, transparent 50%, #cbd5e1 50%)",
            }}
            title="Drag to resize"
          />
          
          {/* Resize Handle - Right Edge */}
          <div
            onMouseDown={handleResizeStart}
            className="absolute top-0 right-0 w-2 h-full cursor-e-resize z-40 hover:bg-blue-200/50"
          />
          
          {/* Resize Handle - Bottom Edge */}
          <div
            onMouseDown={handleResizeStart}
            className="absolute bottom-0 left-0 w-full h-2 cursor-s-resize z-40 hover:bg-blue-200/50"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

