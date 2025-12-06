"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { X, Upload, Trash2, Eye } from "lucide-react";
import { Project } from "@/types/database";
import { ChatPanel } from "@/components/shared";

interface ProjectEditorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  project?: Project | null;
  allUsers: any[];
  allProjectAreas: string[];
  allTags: string[];
  allProjects: Project[];
  onSave: (projectData: Partial<Project>) => Promise<void>;
  onUpdate?: (projectId: string, field: string, value: any) => Promise<void>;
  onDocumentsChange?: (projectId: string) => Promise<void>;
}

const PRIORITIES = ["P1", "P2", "P3", "P4"];
const TASK_PROGRESS_OPTIONS = ["Not Started", "In Progress", "Blocked", "On Hold", "Completed", "Cancelled"];

export function ProjectEditorDialog({
  isOpen,
  onClose,
  project,
  allUsers,
  allProjectAreas,
  allTags,
  allProjects,
  onSave,
  onUpdate,
  onDocumentsChange,
}: ProjectEditorDialogProps) {
  const [formData, setFormData] = useState<Partial<Project>>({
    title: "",
    priority: "P2",
    task_progress: "Not Started",
    description: "",
    project_area: "",
    tags: [],
    due_date: "",
    blocking: [],
    blocked_by: [],
  });

  const [teamRoster, setTeamRoster] = useState<string[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [showTeamRosterDialog, setShowTeamRosterDialog] = useState(false);

  // Resizable dialog state
  const [dimensions, setDimensions] = useState({ width: 1100, height: 700 });
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<{ startX: number; startY: number; startWidth: number; startHeight: number } | null>(null);

  // Load saved dimensions from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("projectEditorDialogDimensions");
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
    localStorage.setItem("projectEditorDialogDimensions", JSON.stringify(dims));
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
      
      const newWidth = Math.max(600, Math.min(window.innerWidth - 40, resizeRef.current.startWidth + deltaX));
      const newHeight = Math.max(500, Math.min(window.innerHeight - 40, resizeRef.current.startHeight + deltaY));
      
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

  // Calculate chat width based on dialog width
  const chatWidth = Math.max(280, Math.min(400, dimensions.width * 0.3));

  // Helper function to update a field in real-time
  const updateField = async (field: string, value: any) => {
    // Update local state
    setFormData({ ...formData, [field]: value });

    // If editing an existing project, update via API immediately
    if (project?.id && onUpdate) {
      try {
        await onUpdate(project.id, field, value);
      } catch (error) {
        console.error(`Failed to update ${field}:`, error);
        // Revert on error - reload the original value
        if (project) {
          setFormData(prev => ({ ...prev, [field]: project[field as keyof Project] }));
        }
      }
    }
  };

  useEffect(() => {
    if (project) {
      console.log('[ProjectEditorDialog] Project updated:', {
        projectId: project.id,
        project_assignments: (project as any).project_assignments
      });

      setFormData({
        title: project.title || "",
        priority: project.priority || "P2",
        task_progress: project.task_progress || "Not Started",
        description: project.description || "",
        project_area: project.project_area || "",
        tags: project.tags || [],
        due_date: project.due_date || "",
        blocking: project.blocking || [],
        blocked_by: project.blocked_by || [],
      });

      // Extract team roster IDs (same logic as table)
      const rosterIds = (project as any).project_assignments
        ?.map((a: any) => a.user_id || a.user?.id)
        .filter((id: string) => id != null) || [];

      console.log('[ProjectEditorDialog] Setting team roster:', rosterIds);
      setTeamRoster(rosterIds);

      // Set documents
      setDocuments((project as any).documents || []);
    } else {
      // Reset for new project
      setFormData({
        title: "",
        priority: "P2",
        task_progress: "Not Started",
        description: "",
        project_area: "",
        tags: [],
        due_date: "",
        blocking: [],
        blocked_by: [],
      });
      setTeamRoster([]);
      setDocuments([]);
    }
  }, [project]);

  const handleSave = async () => {
    try {
      // Clean up the data: convert empty strings to null for date and optional fields only
      const cleanedData = { ...formData };

      // Date fields - convert empty strings to null
      if (cleanedData.due_date === "") cleanedData.due_date = null;

      // Optional text fields - convert empty strings to null (but NOT title, which is required)
      const optionalFields = [
        'description', 'project_area', 'blocking', 'blocked_by'
      ];

      optionalFields.forEach((field) => {
        if (cleanedData[field as keyof typeof cleanedData] === "") {
          cleanedData[field as keyof typeof cleanedData] = null as any;
        }
      });

      // Note: team_roster is handled separately via the "Edit Team Roster" dialog
      // and should not be sent here to avoid overwriting changes
      await onSave(cleanedData);
      onClose();
    } catch (error) {
      console.error("Failed to save project:", error);
      alert("Failed to save project. Please try again.");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!project?.id || !e.target.files?.length) return;

    setUploadingFiles(true);
    try {
      const formData = new FormData();
      for (let i = 0; i < e.target.files.length; i++) {
        formData.append("files", e.target.files[i]);
      }

      const response = await fetch(`/api/projects/${project.id}/documents`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");

      const data = await response.json();

      // Fetch fresh project data to get the complete updated documents list
      const projectResponse = await fetch(`/api/projects/${project.id}`);
      if (projectResponse.ok) {
        const projectData = await projectResponse.json();
        setDocuments(projectData.project.documents || []);
      } else {
        // Fallback to adding the new documents
        setDocuments([...documents, ...data.documents]);
      }

      // Notify table to update attachments
      if (onDocumentsChange) {
        await onDocumentsChange(project.id);
      }
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Failed to upload files");
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!project?.id || !confirm("Delete this attachment?")) return;

    try {
      const response = await fetch(`/api/projects/${project.id}/documents/${docId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Delete failed");

      // Fetch fresh project data to get the complete updated documents list
      const projectResponse = await fetch(`/api/projects/${project.id}`);
      if (projectResponse.ok) {
        const projectData = await projectResponse.json();
        setDocuments(projectData.project.documents || []);
      } else {
        // Fallback to filtering out the deleted document
        setDocuments(documents.filter((d) => d.id !== docId));
      }

      // Notify table to update attachments
      if (onDocumentsChange) {
        await onDocumentsChange(project.id);
      }
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Failed to delete attachment");
    }
  };

  const handleSaveTeamRoster = async (selectedUserIds: string[]) => {
    if (!project?.id) return;

    // Filter out any null/undefined values
    const validUserIds = selectedUserIds.filter(id => id != null && id !== '');

    console.log('[ProjectEditorDialog] Saving team roster:', {
      projectId: project.id,
      selectedUserIds: validUserIds
    });

    try {
      const response = await fetch(`/api/projects/${project.id}/assignments`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_ids: validUserIds }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('[ProjectEditorDialog] Failed to update team roster:', response.status, errorData);
        throw new Error(`Failed to update team roster: ${errorData.error || response.statusText}`);
      }

      const result = await response.json();
      const updatedProject = result.project;

      console.log('[ProjectEditorDialog] API returned updated project:', {
        projectId: updatedProject.id,
        project_assignments: updatedProject.project_assignments
      });

      // Update local state (same logic as table)
      const updatedTeamRosterIds = (updatedProject.project_assignments || [])
        .map((a: any) => a.user_id || a.user?.id)
        .filter((id: string) => id != null);

      console.log('[ProjectEditorDialog] Updating local team roster:', updatedTeamRosterIds);
      setTeamRoster(updatedTeamRosterIds);

      // Close the dialog
      setShowTeamRosterDialog(false);

      // Refresh project data in parent component
      console.log('[ProjectEditorDialog] Calling onDocumentsChange to refresh parent');
      if (onDocumentsChange) {
        await onDocumentsChange(project.id);
      }
    } catch (error) {
      console.error('[ProjectEditorDialog] Failed to update team roster:', error);
      alert('Failed to update team roster. Please try again.');
    }
  };

  const addTag = async (tag: string) => {
    if (tag && !formData.tags?.includes(tag)) {
      const newTags = [...(formData.tags || []), tag];
      await updateField('tags', newTags);
    }
  };

  const removeTag = async (tag: string) => {
    const newTags = formData.tags?.filter((t) => t !== tag) || [];
    await updateField('tags', newTags);
  };

  const isImage = (filename: string) => {
    const ext = filename.toLowerCase();
    return [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"].some((e) => ext.endsWith(e));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="p-0 overflow-hidden"
        style={{ 
          width: dimensions.width,
          height: dimensions.height,
          maxWidth: "95vw",
          maxHeight: "95vh",
        }}
      >
        <div className="flex h-full relative">
          {/* Left side - Project Form */}
          <div className="flex-1 overflow-y-auto p-6">
            <DialogHeader>
              <DialogTitle>{project ? "Edit Project" : "New Project"}</DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-4">
          {/* Title */}
          <div>
            <Label className="text-xs text-gray-500 mb-2 block">Title</Label>
            <Input
              value={formData.title}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="Project title"
              className="text-base"
            />
          </div>

          {/* Priority */}
          <div>
            <Label className="text-xs text-gray-500 mb-2 block">Priority</Label>
            <div className="flex gap-2">
              {PRIORITIES.map((p) => (
                <Button
                  key={p}
                  type="button"
                  variant={formData.priority === p ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateField('priority', p)}
                  className={formData.priority === p ? (
                    p === "P1" ? "bg-red-500 hover:bg-red-600" :
                    p === "P2" ? "bg-orange-500 hover:bg-orange-600" :
                    p === "P3" ? "bg-yellow-500 hover:bg-yellow-600" :
                    "bg-blue-500 hover:bg-blue-600"
                  ) : ""}
                >
                  {p}
                </Button>
              ))}
            </div>
          </div>

          {/* Task Progress */}
          <div>
            <Label className="text-xs text-gray-500 mb-2 block">Task Progress</Label>
            <div className="flex flex-wrap gap-2">
              {TASK_PROGRESS_OPTIONS.map((tp) => (
                <Button
                  key={tp}
                  type="button"
                  variant={formData.task_progress === tp ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateField('task_progress', tp)}
                  className={formData.task_progress === tp ? (
                    tp === "Not Started" ? "bg-gray-600 hover:bg-gray-700" :
                    tp === "In Progress" ? "bg-blue-600 hover:bg-blue-700" :
                    tp === "Blocked" ? "bg-red-600 hover:bg-red-700" :
                    tp === "On Hold" ? "bg-yellow-600 hover:bg-yellow-700" :
                    tp === "Completed" ? "bg-green-600 hover:bg-green-700" :
                    "bg-gray-500 hover:bg-gray-600"
                  ) : ""}
                >
                  {tp}
                </Button>
              ))}
            </div>
          </div>

          {/* Details */}
          <div>
            <Label className="text-xs text-gray-500 mb-2 block">Details</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Project details and description"
              rows={4}
              className="resize-none"
            />
          </div>


          {/* Attachments */}
          <div>
            <Label className="text-xs text-gray-500 mb-2 block">Attachments</Label>
            <div className="space-y-2">
              {project?.id && (
                <div>
                  <input
                    type="file"
                    id="file-upload"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById("file-upload")?.click()}
                    disabled={uploadingFiles}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploadingFiles ? "Uploading..." : "Attach file"}
                  </Button>
                </div>
              )}

              {documents.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                  {documents.map((doc) => (
                    <div key={doc.id} className="border rounded overflow-hidden">
                      {isImage(doc.filename) ? (
                        <div className="w-full aspect-video bg-gray-100">
                          <img
                            src={
                              doc.thumbnail_url && !doc.thumbnail_url.includes("airtableusercontent.com")
                                ? doc.thumbnail_url
                                : doc.storage_url
                            }
                            alt={doc.filename}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      ) : (
                        <div className="w-full aspect-video bg-gray-200 flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-4xl font-bold text-gray-500">
                              {doc.filename.split(".").pop()?.toUpperCase() || "FILE"}
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="p-3 space-y-2">
                        <p className="text-sm font-medium truncate">{doc.filename}</p>
                        <p className="text-xs text-gray-500">
                          {doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB` : ""}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => window.open(doc.storage_url, "_blank")}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDeleteDocument(doc.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!project?.id && (
                <p className="text-sm text-gray-500 italic">Save project first to attach files</p>
              )}
            </div>
          </div>

          {/* Project Area */}
          <div>
            <Label className="text-xs text-gray-500 mb-2 block">Project Area</Label>
            <Input
              value={formData.project_area}
              onChange={(e) => updateField('project_area', e.target.value)}
              list="project-areas"
              placeholder="Select or type project area"
            />
            <datalist id="project-areas">
              {allProjectAreas.map((area) => (
                <option key={area} value={area} />
              ))}
            </datalist>
          </div>

          {/* Team Roster */}
          <div>
            <Label className="text-xs text-gray-500 mb-2 block">Team Roster</Label>
            {project?.id ? (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {teamRoster.map((userId) => {
                    const user = allUsers.find((u) => u.id === userId);
                    if (!user) return null;

                    return (
                      <span
                        key={userId}
                        className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-1 rounded text-sm"
                      >
                        {user.name}
                      </span>
                    );
                  })}
                  {teamRoster.length === 0 && (
                    <span className="text-sm text-gray-500">No team members assigned</span>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTeamRosterDialog(true)}
                >
                  Edit Team Roster
                </Button>
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">Save project first to assign team members</p>
            )}
          </div>

          {/* Tags */}
          <div>
            <Label className="text-xs text-gray-500 mb-2 block">Tags</Label>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {formData.tags?.map((tag) => (
                  <Badge key={tag} variant="outline" className="gap-1">
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <Input
                list="all-tags"
                placeholder="Add tag"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const value = (e.target as HTMLInputElement).value.trim();
                    if (value) {
                      addTag(value);
                      (e.target as HTMLInputElement).value = "";
                    }
                  }
                }}
              />
              <datalist id="all-tags">
                {allTags.map((tag) => (
                  <option key={tag} value={tag} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Due Date */}
          <div>
            <Label className="text-xs text-gray-500 mb-2 block">Due Date</Label>
            <Input
              type="date"
              value={formData.due_date || ""}
              onChange={(e) => updateField('due_date', e.target.value)}
              placeholder="yyyy-mm-dd"
            />
          </div>

        </div>

            {/* Footer Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              {project ? (
                // Editing existing project - all fields update in real-time
                <Button type="button" variant="outline" onClick={onClose}>
                  Close
                </Button>
              ) : (
                // Creating new project - need save button
                <>
                  <Button type="button" variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button type="button" onClick={handleSave}>
                    Create Project
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Right side - Chat Panel */}
          {project?.id && (
            <ChatPanel
              entityType="project"
              entityId={project.id}
              className="border-l"
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

      {/* Team Roster Editor Dialog */}
      <TeamRosterDialog
        open={showTeamRosterDialog}
        onClose={() => setShowTeamRosterDialog(false)}
        allUsers={allUsers}
        selectedUserIds={teamRoster}
        onSave={handleSaveTeamRoster}
      />
    </Dialog>
  );
}

// Team Roster Dialog Component (same as used in tabulator table)
function TeamRosterDialog({
  open,
  onClose,
  allUsers,
  selectedUserIds,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  allUsers: any[];
  selectedUserIds: string[];
  onSave: (userIds: string[]) => Promise<void>;
}) {
  const [selected, setSelected] = useState<string[]>(selectedUserIds);

  useEffect(() => {
    setSelected(selectedUserIds);
  }, [selectedUserIds]);

  const toggleUser = (userId: string) => {
    setSelected(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSave = async () => {
    await onSave(selected);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Team Roster</DialogTitle>
        </DialogHeader>
        <div className="max-h-96 overflow-y-auto">
          <div className="space-y-2">
            {allUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 cursor-pointer rounded"
                onClick={() => toggleUser(user.id)}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(user.id)}
                  onChange={() => {}}
                  className="h-4 w-4"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium">{user.name}</div>
                  <div className="text-xs text-gray-500">{user.email}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
