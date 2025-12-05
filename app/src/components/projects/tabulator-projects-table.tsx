"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { ColumnDefinition } from "tabulator-tables";
import { Project, User, Document } from "@/types/database";
import { useTabulatorTable } from "@/hooks/use-tabulator-table";
import {
  TableToolbar,
  GroupableColumn,
  MultiSelectDialog,
  SingleSelectDialog,
  DocumentsEditorDialog,
  SelectOption,
} from "@/components/shared";
import { ProjectEditorDialog } from "@/components/projects/project-editor-dialog";
import { formatDocumentThumbnails } from "@/utils/image-formatter";

import "tabulator-tables/dist/css/tabulator.min.css";

interface TabulatorProjectsTableProps {
  projects: Project[];
  onUpdate?: (projectId: string, field: string, value: any) => Promise<void>;
  onTeamRosterUpdate?: () => Promise<void>;
}

const PRIORITY_OPTIONS = ["P1", "P2", "P3", "P4"];
const TASK_PROGRESS_OPTIONS = ["Not Started", "In Progress", "Blocked", "On Hold", "Completed", "Cancelled"];

const GROUPABLE_COLUMNS: GroupableColumn[] = [
  { value: "none", label: "No Grouping" },
  { value: "task_progress", label: "Task Progress" },
  { value: "priority", label: "Priority" },
  { value: "project_area", label: "Project Area" },
];

// Editor state types
type EditorState =
  | { type: "teamRoster"; projectId: string; currentUserIds: string[] }
  | { type: "blockedBy"; projectId: string; currentProjectIds: string[] }
  | { type: "blocking"; projectId: string; currentProjectIds: string[] }
  | { type: "tags"; projectId: string; currentTags: string[] }
  | { type: "projectArea"; projectId: string; currentArea: string }
  | { type: "attachments"; projectId: string; currentDocuments: Document[] };

type EditorType = EditorState | null;

export function TabulatorProjectsTable({
  projects,
  onUpdate,
  onTeamRosterUpdate,
}: TabulatorProjectsTableProps) {
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [groupByColumn, setGroupByColumn] = useState("none");
  const [activeEditor, setActiveEditor] = useState<EditorType>(null);
  const [expandedProject, setExpandedProject] = useState<Project | null>(null);

  // Fetch users on mount
  useEffect(() => {
    fetch("/api/users")
      .then((res) => res.json())
      .then((data) => setAllUsers(data.users || []))
      .catch(() => {});
  }, []);

  // Extract unique tags and project areas
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    projects.forEach((p) => p.tags?.forEach((t) => tags.add(t)));
    return Array.from(tags).sort();
  }, [projects]);

  const allProjectAreas = useMemo(() => {
    const areas = new Set<string>();
    projects.forEach((p) => p.project_area && areas.add(p.project_area));
    return Array.from(areas).sort();
  }, [projects]);

  // Transform projects for table
  const tableData = useMemo(() => {
    return projects.map((project) => {
      const teamRosterValue = (project.project_assignments || [])
        .filter((a) => a.user || a.user_id != null)
        .map((a) => {
          if (a.user) return a.user.name;
          const user = allUsers.find((u) => u.id === a.user_id);
          return user?.name || "";
        })
        .filter((name) => name !== "")
        .join(", ");

      const teamRosterIds = (project.project_assignments || [])
        .map((a) => a.user_id || a.user?.id)
        .filter((id): id is string => id != null);

      return {
        id: project.id,
        title: project.title || "",
        task_progress: project.task_progress || "",
        priority: project.priority || "",
        team_roster: teamRosterValue,
        team_roster_ids: teamRosterIds,
      project_area: project.project_area || "",
      description: project.description || "",
      tags: (project.tags || []).join(", "),
        tags_array: project.tags || [],
        due_date: project.due_date?.split("T")[0] || "",
        blocked_by: (project.blocked_by || [])
          .map((id) => projects.find((p) => p.id === id)?.title || id)
          .join(", "),
      blocked_by_ids: project.blocked_by || [],
        blocking: (project.blocking || [])
          .map((id) => projects.find((p) => p.id === id)?.title || id)
          .join(", "),
      blocking_ids: project.blocking || [],
      documents: project.documents || [],
      message_count: (project as any).message_count || 0,
      };
    });
  }, [projects, allUsers]);

  // Column definitions
  const columns: ColumnDefinition[] = useMemo(() => {
    const openEditor = (type: EditorState["type"], cell: any) => {
    const rowData = cell.getRow().getData();
      switch (type) {
        case "teamRoster":
          setActiveEditor({ type, projectId: rowData.id, currentUserIds: rowData.team_roster_ids || [] });
          break;
        case "blockedBy":
          setActiveEditor({ type, projectId: rowData.id, currentProjectIds: rowData.blocked_by_ids || [] });
          break;
        case "blocking":
          setActiveEditor({ type, projectId: rowData.id, currentProjectIds: rowData.blocking_ids || [] });
          break;
        case "tags":
          setActiveEditor({ type, projectId: rowData.id, currentTags: rowData.tags_array || [] });
          break;
        case "projectArea":
          setActiveEditor({ type, projectId: rowData.id, currentArea: rowData.project_area || "" });
          break;
        case "attachments":
          setActiveEditor({ type, projectId: rowData.id, currentDocuments: rowData.documents || [] });
          break;
      }
    };

    return [
        {
          title: "",
          field: "message_count",
          width: 50,
          headerSort: false,
          frozen: true,
          formatter: (cell: any) => {
            const count = cell.getValue() || 0;
            const hasMessages = count > 0;
          return `<div class="flex items-center justify-center h-full ${hasMessages ? "opacity-100" : "opacity-0 group-hover:opacity-100"}">
            <button class="bg-${count > 0 ? "blue-500" : "gray-200"} text-${count > 0 ? "white" : "gray-600"} px-2 py-1 rounded text-xs flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
              ${count}
              </button>
            </div>`;
          },
          cellClick: (_e: any, cell: any) => {
          const project = projects.find((p) => p.id === cell.getRow().getData().id);
          if (project) setExpandedProject(project);
        },
      },
      { title: "Title", field: "title", width: 250, editor: "input", headerFilter: "input", frozen: true },
      {
        title: "Task Progress",
        field: "task_progress",
          width: 150,
          editor: "list",
        editorParams: { values: TASK_PROGRESS_OPTIONS },
          headerFilter: "list",
        headerFilterParams: { values: TASK_PROGRESS_OPTIONS },
          formatter: (cell) => {
            const value = cell.getValue();
            const colors: Record<string, string> = {
              "Not Started": "#6b7280",
              "In Progress": "#3b82f6",
            "Blocked": "#ef4444",
              "On Hold": "#eab308",
              "Completed": "#22c55e",
            "Cancelled": "#9ca3af",
            };
            const color = colors[value] || "#6b7280";
            return `<span style="background: ${color}20; color: ${color}; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 500;">${value}</span>`;
          },
        },
        {
          title: "Priority",
          field: "priority",
          width: 120,
          editor: "list",
          editorParams: { values: PRIORITY_OPTIONS },
          headerFilter: "list",
          headerFilterParams: { values: PRIORITY_OPTIONS },
          formatter: (cell) => {
            const value = cell.getValue();
          const colors: Record<string, string> = { P1: "#ef4444", P2: "#f97316", P3: "#eab308", P4: "#3b82f6" };
            const color = colors[value] || "#6b7280";
            return `<span style="background: ${color}20; color: ${color}; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 500;">${value}</span>`;
          },
        },
        {
          title: "Team Roster",
          field: "team_roster",
          width: 200,
          headerFilter: "input",
          formatter: (cell) => {
            const value = cell.getValue();
            if (!value) return "";
          return value
            .split(", ")
            .filter((n: string) => n)
            .map((name: string) => `<span style="background: #e5e7eb; color: #374151; padding: 2px 6px; border-radius: 4px; font-size: 12px; margin-right: 4px;">${name}</span>`)
            .join("");
        },
        cellClick: (e, cell) => openEditor("teamRoster", cell),
        },
        {
          title: "Project Area",
          field: "project_area",
          width: 180,
          headerFilter: "input",
        cellClick: (e, cell) => openEditor("projectArea", cell),
      },
      { title: "Details", field: "description", width: 300, editor: "textarea", headerFilter: "input" },
        {
          title: "Tags",
          field: "tags",
          width: 200,
          headerFilter: "input",
          formatter: (cell) => {
            const value = cell.getValue();
            if (!value) return "";
          return value
            .split(", ")
            .filter((t: string) => t)
            .map((tag: string) => `<span style="background: #e0e7ff; color: #4338ca; padding: 2px 6px; border-radius: 4px; font-size: 12px; margin-right: 4px;">${tag}</span>`)
            .join("");
        },
        cellClick: (e, cell) => openEditor("tags", cell),
      },
      { title: "Due Date", field: "due_date", width: 150, editor: "date", headerFilter: "input" },
        {
          title: "Blocked By",
          field: "blocked_by",
          width: 200,
          headerFilter: "input",
          formatter: (cell) => {
            const value = cell.getValue();
            if (!value) return "";
          return value
            .split(", ")
            .filter((n: string) => n)
            .map((name: string) => `<span style="background: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 4px; font-size: 12px; margin-right: 4px;">${name}</span>`)
            .join("");
        },
        cellClick: (e, cell) => openEditor("blockedBy", cell),
        },
        {
          title: "Blocking",
          field: "blocking",
          width: 200,
          headerFilter: "input",
          formatter: (cell) => {
            const value = cell.getValue();
            if (!value) return "";
          return value
            .split(", ")
            .filter((n: string) => n)
            .map((name: string) => `<span style="background: #dbeafe; color: #1e40af; padding: 2px 6px; border-radius: 4px; font-size: 12px; margin-right: 4px;">${name}</span>`)
            .join("");
        },
        cellClick: (e, cell) => openEditor("blocking", cell),
        },
        {
          title: "Attachments",
          field: "documents",
          width: 200,
          headerFilter: "input",
        formatter: (cell) => formatDocumentThumbnails(cell.getRow().getData().documents || []),
        cellClick: (_e: any, cell: any) => openEditor("attachments", cell),
      },
    ];
  }, [projects]);

  const { tableRef, setFilter, clearFilter, setGroupBy, updateRowData, refreshData } = useTabulatorTable({
    data: tableData,
    columns,
    onCellEdited: onUpdate,
  });

  // Search filter
  useEffect(() => {
    if (searchTerm) {
      setFilter(
        [
        { field: "title", type: "like", value: searchTerm },
          { field: "task_progress", type: "like", value: searchTerm },
        { field: "priority", type: "like", value: searchTerm },
        { field: "description", type: "like", value: searchTerm },
        ],
        "or"
      );
    } else {
      clearFilter();
    }
  }, [searchTerm, setFilter, clearFilter]);

  // Grouping
  useEffect(() => {
    setGroupBy(groupByColumn !== "none" ? groupByColumn : false);
  }, [groupByColumn, setGroupBy]);

  // User options for team roster dialog
  const userOptions: SelectOption[] = useMemo(
    () => allUsers.map((u) => ({ id: u.id, label: u.name, sublabel: u.email })),
    [allUsers]
  );

  // Project options for blocked by/blocking dialogs
  const projectOptions: SelectOption[] = useMemo(
    () =>
      projects.map((p) => ({
        id: p.id,
        label: p.title,
        sublabel: `${p.task_progress}${p.priority ? ` • ${p.priority}` : ""}`,
      })),
    [projects]
  );

  // Tag options
  const tagOptions: SelectOption[] = useMemo(() => allTags.map((t) => ({ id: t, label: t })), [allTags]);

  // Save handlers
  const handleSaveTeamRoster = useCallback(
    async (selectedUserIds: string[]) => {
      if (activeEditor?.type !== "teamRoster") return;
      const { projectId } = activeEditor;

      const response = await fetch(`/api/projects/${projectId}/assignments`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_ids: selectedUserIds.filter((id) => id) }),
      });

      if (!response.ok) throw new Error("Failed to update team roster");

      const { project: updatedProject } = await response.json();
      setActiveEditor(null);

      // Update row
                    const teamRosterValue = (updatedProject.project_assignments || [])
        .filter((a: any) => a.user || a.user_id)
        .map((a: any) => a.user?.name || allUsers.find((u) => u.id === a.user_id)?.name || "")
        .filter((n: string) => n)
                      .join(", ");

      updateRowData(projectId, {
                      team_roster: teamRosterValue,
        team_roster_ids: (updatedProject.project_assignments || []).map((a: any) => a.user_id || a.user?.id).filter(Boolean),
      });
    },
    [activeEditor, allUsers, updateRowData]
  );

  const handleSaveBlockedBy = useCallback(
    async (selectedProjectIds: string[]) => {
      if (activeEditor?.type !== "blockedBy") return;
      const { projectId } = activeEditor;

      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocked_by: selectedProjectIds }),
      });

      if (!response.ok) throw new Error("Failed to update blocked by");
      setActiveEditor(null);

      updateRowData(projectId, {
        blocked_by: selectedProjectIds.map((id) => projects.find((p) => p.id === id)?.title || id).join(", "),
        blocked_by_ids: selectedProjectIds,
      });
    },
    [activeEditor, projects, updateRowData]
  );

  const handleSaveBlocking = useCallback(
    async (selectedProjectIds: string[]) => {
      if (activeEditor?.type !== "blocking") return;
      const { projectId } = activeEditor;

      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocking: selectedProjectIds }),
      });

      if (!response.ok) throw new Error("Failed to update blocking");
      setActiveEditor(null);

      updateRowData(projectId, {
        blocking: selectedProjectIds.map((id) => projects.find((p) => p.id === id)?.title || id).join(", "),
        blocking_ids: selectedProjectIds,
      });
    },
    [activeEditor, projects, updateRowData]
  );

  const handleSaveTags = useCallback(
    async (selectedTags: string[]) => {
      if (activeEditor?.type !== "tags") return;
      const { projectId } = activeEditor;

      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: selectedTags }),
      });

      if (!response.ok) throw new Error("Failed to update tags");
      setActiveEditor(null);

      updateRowData(projectId, {
        tags: selectedTags.join(", "),
        tags_array: selectedTags,
      });
    },
    [activeEditor, updateRowData]
  );

  const handleSaveProjectArea = useCallback(
    async (selectedArea: string) => {
      if (activeEditor?.type !== "projectArea") return;
      const { projectId } = activeEditor;

      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_area: selectedArea }),
      });

      if (!response.ok) throw new Error("Failed to update project area");
      setActiveEditor(null);

      updateRowData(projectId, { project_area: selectedArea });
    },
    [activeEditor, updateRowData]
  );

  const handleUploadDocuments = useCallback(
    async (files: FileList) => {
      if (activeEditor?.type !== "attachments") return;
      const { projectId } = activeEditor;

      const formData = new FormData();
      formData.append("projectId", projectId);
      for (let i = 0; i < files.length; i++) {
        formData.append("files", files[i]);
      }

      const response = await fetch(`/api/projects/${projectId}/documents`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(errorData.error || "Failed to upload files");
      }
    },
    [activeEditor]
  );

  const handleDeleteDocument = useCallback(
    async (documentId: string) => {
      if (activeEditor?.type !== "attachments") return;
      const { projectId } = activeEditor;

      const response = await fetch(`/api/projects/${projectId}/documents/${documentId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete document");
    },
    [activeEditor]
  );

  const handleRefreshDocuments = useCallback(async () => {
    if (activeEditor?.type !== "attachments") return;
    const { projectId } = activeEditor;

    const response = await fetch(`/api/projects/${projectId}`);
    if (!response.ok) return;

    const { project: updatedProject } = await response.json();
    setActiveEditor({
      type: "attachments",
  projectId,
      currentDocuments: updatedProject.documents || [],
    });

    updateRowData(projectId, { documents: updatedProject.documents || [] });
  }, [activeEditor, updateRowData]);

  return (
        <div className="space-y-4">
      <TableToolbar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search projects..."
        groupByColumn={groupByColumn}
        onGroupByChange={setGroupByColumn}
        groupableColumns={GROUPABLE_COLUMNS}
      />

      <div ref={tableRef} className="border rounded-lg overflow-hidden" />

      <div className="text-sm text-gray-500">{projects.length} project(s) total</div>

      {/* Team Roster Dialog */}
      <MultiSelectDialog
        open={activeEditor?.type === "teamRoster"}
        onClose={() => setActiveEditor(null)}
        title="Edit Team Roster"
        options={userOptions}
        selectedIds={activeEditor?.type === "teamRoster" ? activeEditor.currentUserIds : []}
        onSave={handleSaveTeamRoster}
      />

      {/* Blocked By Dialog */}
      <MultiSelectDialog
        open={activeEditor?.type === "blockedBy"}
        onClose={() => setActiveEditor(null)}
        title="Edit Blocked By"
        options={projectOptions}
        selectedIds={activeEditor?.type === "blockedBy" ? activeEditor.currentProjectIds : []}
        onSave={handleSaveBlockedBy}
        excludeIds={activeEditor?.type === "blockedBy" ? [activeEditor.projectId] : []}
      />

      {/* Blocking Dialog */}
      <MultiSelectDialog
        open={activeEditor?.type === "blocking"}
        onClose={() => setActiveEditor(null)}
        title="Edit Blocking"
        options={projectOptions}
        selectedIds={activeEditor?.type === "blocking" ? activeEditor.currentProjectIds : []}
        onSave={handleSaveBlocking}
        excludeIds={activeEditor?.type === "blocking" ? [activeEditor.projectId] : []}
      />

      {/* Tags Dialog */}
      <MultiSelectDialog
        open={activeEditor?.type === "tags"}
        onClose={() => setActiveEditor(null)}
        title="Edit Tags"
        options={tagOptions}
        selectedIds={activeEditor?.type === "tags" ? activeEditor.currentTags : []}
        onSave={handleSaveTags}
        allowCreate
        createPlaceholder="Type a new tag..."
      />

      {/* Project Area Dialog */}
      <SingleSelectDialog
        open={activeEditor?.type === "projectArea"}
        onClose={() => setActiveEditor(null)}
        title="Edit Project Area"
        options={allProjectAreas}
        selectedValue={activeEditor?.type === "projectArea" ? activeEditor.currentArea : ""}
        onSave={handleSaveProjectArea}
        createPlaceholder="Type a new project area..."
      />

      {/* Attachments Dialog */}
      <DocumentsEditorDialog
        open={activeEditor?.type === "attachments"}
        onClose={() => setActiveEditor(null)}
        entityId={activeEditor?.type === "attachments" ? activeEditor.projectId : ""}
        documents={activeEditor?.type === "attachments" ? activeEditor.currentDocuments : []}
        onUpload={handleUploadDocuments}
        onDelete={handleDeleteDocument}
        onRefresh={handleRefreshDocuments}
      />

      {/* Project Editor Dialog */}
      {expandedProject && (
        <ProjectEditorDialog
          isOpen={true}
          onClose={() => setExpandedProject(null)}
          project={expandedProject}
          allUsers={allUsers}
          allProjectAreas={allProjectAreas}
          allTags={allTags}
          allProjects={projects}
          onUpdate={async (projectId: string, field: string, value: any) => {
            const response = await fetch(`/api/projects/${projectId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ [field]: value }),
            });
            if (!response.ok) throw new Error("Failed to update project");
          }}
          onDocumentsChange={async (projectId: string) => {
            const response = await fetch(`/api/projects/${projectId}`);
            if (response.ok) {
              const { project: updated } = await response.json();
              setExpandedProject(updated);
            }
          }}
          onSave={async () => setExpandedProject(null)}
        />
            )}
          </div>
  );
}
