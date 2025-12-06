"use client";

import { useState, useEffect, useMemo, useCallback, useRef, useId } from "react";
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
  createExpandColumn,
  FilterColumn,
  FilterCondition,
  ColumnDef,
} from "@/components/shared";
import { ProjectEditorDialog } from "@/components/projects/project-editor-dialog";
import { formatDocumentThumbnails } from "@/utils/image-formatter";
import { useView } from "@/contexts/view-context";

import "tabulator-tables/dist/css/tabulator.min.css";

interface TabulatorProjectsTableProps {
  projects: Project[];
  onUpdate?: (projectId: string, field: string, value: any) => Promise<void>;
  onTeamRosterUpdate?: () => Promise<void>;
}

const PRIORITY_OPTIONS = ["P1", "P2", "P3", "P4"];
const TASK_PROGRESS_OPTIONS = ["Not Started", "In Progress", "Done", "On Hold", "Abandoned"];

const GROUPABLE_COLUMNS: GroupableColumn[] = [
  { value: "none", label: "No Grouping" },
  { value: "task_progress", label: "Task Progress" },
  { value: "priority", label: "Priority" },
  { value: "project_area", label: "Project Area" },
  { value: "project_name", label: "Project Name" },
  { value: "team_roster", label: "Team Roster" },
];

// All columns for visibility dropdown
const ALL_COLUMNS: ColumnDef[] = [
  { field: "title", label: "Title" },
  { field: "task_progress", label: "Task Progress" },
  { field: "priority", label: "Priority" },
  { field: "team_roster", label: "Team Roster" },
  { field: "project_area", label: "Project Area" },
  { field: "project_name", label: "Project" },
  { field: "description", label: "Details" },
  { field: "additional_notes", label: "Progress Notes" },
  { field: "tags", label: "Tags" },
  { field: "due_date", label: "Due Date" },
  { field: "blocked_by", label: "Blocked By" },
  { field: "blocking", label: "Blocking" },
  { field: "who_buys", label: "Who Buys" },
  { field: "documents", label: "Attachments" },
];

// Filter columns are generated dynamically to include user names

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
  const { currentView, setCurrentView } = useView();
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [activeEditor, setActiveEditor] = useState<EditorType>(null);
  const [expandedProject, setExpandedProject] = useState<Project | null>(null);

  // Local state for view settings - much faster than context
  const [searchTerm, setSearchTerm] = useState("");
  const [groupByColumn, setGroupByColumn] = useState("none");
  const [filters, setFilters] = useState<FilterCondition[]>([]);
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);

  // Track if we're syncing to prevent circular updates
  const isSyncingToContextRef = useRef(false);
  const lastAppliedViewRef = useRef<string>("");

  // Sync table name with context on mount
  useEffect(() => {
    setCurrentView({ tableName: "projects" });
  }, [setCurrentView]);

  // When context changes (e.g., user selects a saved view), update local state
  // Skip if we just synced local state to context
  useEffect(() => {
    if (isSyncingToContextRef.current) {
      isSyncingToContextRef.current = false;
      return;
    }
    
    if (currentView.tableName !== "projects") return;
    
    // Create a key to detect actual view changes
    const viewKey = JSON.stringify({
      filters: currentView.filters,
      groupBy: currentView.groupBy,
      searchTerm: currentView.searchTerm,
      hiddenColumns: currentView.hiddenColumns,
    });
    
    if (viewKey !== lastAppliedViewRef.current) {
      lastAppliedViewRef.current = viewKey;
      setSearchTerm(currentView.searchTerm || "");
      setGroupByColumn(currentView.groupBy || "none");
      setFilters(currentView.filters || []);
      setHiddenColumns(currentView.hiddenColumns || []);
    }
  }, [currentView]);

  // Sync local state TO context (debounced) for saving views
  useEffect(() => {
    const timeout = setTimeout(() => {
      // Mark that we're syncing to prevent the reverse sync
      isSyncingToContextRef.current = true;
      
      // Update the ref so we don't re-apply our own changes
      const viewKey = JSON.stringify({
        filters,
        groupBy: groupByColumn === "none" ? null : groupByColumn,
        searchTerm,
        hiddenColumns,
      });
      lastAppliedViewRef.current = viewKey;
      
      setCurrentView({
        searchTerm,
        groupBy: groupByColumn === "none" ? null : groupByColumn,
        filters,
        hiddenColumns,
      });
    }, 500);
    return () => clearTimeout(timeout);
  }, [searchTerm, groupByColumn, filters, hiddenColumns, setCurrentView]);

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

  // Generate filter columns dynamically with user names for team roster
  const filterColumns: FilterColumn[] = useMemo(() => {
    const userNames = allUsers.map((u) => u.name).filter(Boolean).sort();
    return [
      { field: "title", label: "Title" },
      { field: "task_progress", label: "Task Progress", options: TASK_PROGRESS_OPTIONS },
      { field: "priority", label: "Priority", options: PRIORITY_OPTIONS },
      { field: "project_area", label: "Project Area", options: allProjectAreas.length > 0 ? allProjectAreas : undefined },
      { field: "project_name", label: "Project Name" },
      { field: "description", label: "Details" },
      { field: "additional_notes", label: "Progress Notes" },
      { field: "tags", label: "Tags" },
      { field: "team_roster", label: "Team Roster", options: userNames.length > 0 ? userNames : undefined },
      { field: "who_buys", label: "Who Buys", options: userNames.length > 0 ? userNames : undefined },
    ];
  }, [allUsers, allProjectAreas]);

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

      // Get "Who Buys" user names
      const whoBuysValue = ((project as any).who_buys || [])
        .map((id: string) => allUsers.find((u) => u.id === id)?.name || "")
        .filter((name: string) => name !== "")
        .join(", ");

      return {
        id: project.id,
        title: project.title || "",
        task_progress: project.task_progress || "",
        priority: project.priority || "",
        team_roster: teamRosterValue,
        team_roster_ids: teamRosterIds,
        project_area: project.project_area || "",
        project_name: (project as any).project_name || "",
        description: project.description || "",
        additional_notes: (project as any).additional_notes || "",
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
        who_buys: whoBuysValue,
        who_buys_ids: (project as any).who_buys || [],
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
        createExpandColumn({
          field: "message_count",
          countField: "message_count",
          onClick: (rowData) => {
            const project = projects.find((p) => p.id === rowData.id);
            if (project) setExpandedProject(project);
          },
        }),
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
              "In Progress": "#f97316",
              "Done": "#22c55e",
              "On Hold": "#3b82f6",
              "Abandoned": "#9ca3af",
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
      { title: "Project", field: "project_name", width: 150, headerFilter: "input",
        formatter: (cell) => {
          const value = cell.getValue();
          if (!value) return "";
          return `<span style="background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 500;">${value}</span>`;
        },
      },
      { 
        title: "Details", 
        field: "description", 
        width: 300, 
        editor: "input",
        headerFilter: "input",
        formatter: (cell) => {
          const value = cell.getValue();
          if (!value) return "";
          // Truncate long text with ellipsis
          return `<div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${value.replace(/"/g, '&quot;')}">${value}</div>`;
        },
      },
      { 
        title: "Progress Notes", 
        field: "additional_notes", 
        width: 250, 
        editor: "input",
        headerFilter: "input",
        formatter: (cell) => {
          const value = cell.getValue();
          if (!value) return "";
          return `<div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${value.replace(/"/g, '&quot;')}">${value}</div>`;
        },
      },
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
          title: "Who Buys",
          field: "who_buys",
          width: 180,
          headerFilter: "input",
          formatter: (cell) => {
            const value = cell.getValue();
            if (!value) return "";
            return value
              .split(", ")
              .filter((n: string) => n)
              .map((name: string) => `<span style="background: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 4px; font-size: 12px; margin-right: 4px;">${name}</span>`)
              .join("");
          },
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

  const [selectedCount, setSelectedCount] = useState(0);
  const tableId = useId().replace(/:/g, '');

  const { tableRef, setFilter, clearFilter, setGroupBy, updateRowData, refreshData, getSelectedRows, deselectAll, getInstance } = useTabulatorTable({
    data: tableData,
    columns,
    onCellEdited: onUpdate,
  });

  // CSS-based column hiding - instant, no Tabulator API calls
  const hiddenColumnsStyle = useMemo(() => {
    if (hiddenColumns.length === 0) return '';
    return hiddenColumns.map(field => 
      `#table-${tableId} [tabulator-field="${field}"] { display: none !important; }`
    ).join('\n');
  }, [hiddenColumns, tableId]);

  // Track row selection changes
  useEffect(() => {
    const instance = getInstance();
    if (!instance) return;

    const updateSelection = () => {
      const selected = getSelectedRows();
      setSelectedCount(selected.length);
    };

    instance.on("rowSelected", updateSelection);
    instance.on("rowDeselected", updateSelection);

    return () => {
      try {
        instance.off("rowSelected", updateSelection);
        instance.off("rowDeselected", updateSelection);
      } catch {
        // Ignore cleanup errors
      }
    };
  }, [getInstance, getSelectedRows]);

  // Handle delete selected projects
  const handleDeleteSelected = useCallback(async () => {
    const selected = getSelectedRows();
    if (selected.length === 0) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selected.length} project(s)? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      // Delete each selected project
      const deletePromises = selected.map((row) =>
        fetch(`/api/projects/${row.id}`, { method: "DELETE" })
      );

      const results = await Promise.all(deletePromises);
      const failedCount = results.filter((r) => !r.ok).length;

      if (failedCount > 0) {
        alert(`${failedCount} project(s) failed to delete.`);
      }

      // Refresh the data
      deselectAll();
      setSelectedCount(0);
      
      // Trigger parent refresh if available
      if (onTeamRosterUpdate) {
        await onTeamRosterUpdate();
      }
    } catch (error) {
      console.error("Failed to delete projects:", error);
      alert("Failed to delete projects. Please try again.");
    }
  }, [getSelectedRows, deselectAll, onTeamRosterUpdate]);

  // Apply filters (search + custom filters) - optimized to run only when needed
  useEffect(() => {
    const instance = getInstance();
    if (!instance) return;

    // Build a single custom filter function that handles everything
    if (!searchTerm && filters.length === 0) {
      instance.clearFilter();
      return;
    }

    // Use a single filter function for better performance
    instance.setFilter((rowData: any) => {
      // Check search term (OR across fields)
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
          (rowData.title || "").toLowerCase().includes(searchLower) ||
          (rowData.task_progress || "").toLowerCase().includes(searchLower) ||
          (rowData.priority || "").toLowerCase().includes(searchLower) ||
          (rowData.description || "").toLowerCase().includes(searchLower) ||
          (rowData.team_roster || "").toLowerCase().includes(searchLower) ||
          (rowData.tags || "").toLowerCase().includes(searchLower);
        
        if (!matchesSearch) return false;
      }

      // Check custom filters (AND between them)
      for (const f of filters) {
        const fieldValue = String(rowData[f.column] || "").toLowerCase();
        const filterValue = f.value.toLowerCase();

        switch (f.operator) {
          case "like":
            if (!fieldValue.includes(filterValue)) return false;
            break;
          case "notlike":
            if (fieldValue.includes(filterValue)) return false;
            break;
          case "=":
            if (fieldValue !== filterValue) return false;
            break;
          case "!=":
            if (fieldValue === filterValue) return false;
            break;
          case "empty":
            if (fieldValue !== "") return false;
            break;
          case "notempty":
            if (fieldValue === "") return false;
            break;
        }
      }

      return true;
    });
  }, [searchTerm, filters, getInstance]);

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
      {/* CSS-based column hiding - instant with no API calls */}
      {hiddenColumnsStyle && <style dangerouslySetInnerHTML={{ __html: hiddenColumnsStyle }} />}
      
      <TableToolbar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search projects..."
        groupByColumn={groupByColumn}
        onGroupByChange={setGroupByColumn}
        groupableColumns={GROUPABLE_COLUMNS}
        selectedCount={selectedCount}
        onDeleteSelected={handleDeleteSelected}
        deleteLabel="Delete"
        allColumns={ALL_COLUMNS}
        hiddenColumns={hiddenColumns}
        onHiddenColumnsChange={setHiddenColumns}
        filterColumns={filterColumns}
        filters={filters}
        onFiltersChange={setFilters}
      />

      <div id={`table-${tableId}`} ref={tableRef} className="border rounded-lg" style={{ minWidth: 'max-content' }} />

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
