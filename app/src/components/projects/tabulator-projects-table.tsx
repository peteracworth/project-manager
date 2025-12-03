"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { TabulatorFull as Tabulator } from "tabulator-tables";
import { Project, User } from "@/types/database";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ProjectEditorDialog } from "@/components/projects/project-editor-dialog";
import { Search } from "lucide-react";

import "tabulator-tables/dist/css/tabulator.min.css";

interface TabulatorProjectsTableProps {
  projects: Project[];
  onUpdate?: (projectId: string, field: string, value: any) => Promise<void>;
  onTeamRosterUpdate?: () => Promise<void>;
}

const STATUS_OPTIONS = ["Not Started", "In Progress", "On Hold", "Completed", "Cancelled"];
const PRIORITY_OPTIONS = ["P1", "P2", "P3", "P4"];
const TASK_PROGRESS_OPTIONS = ["Not Started", "In Progress", "Blocked", "On Hold", "Completed", "Cancelled"];

export function TabulatorProjectsTable({ projects, onUpdate, onTeamRosterUpdate }: TabulatorProjectsTableProps) {
  const tableRef = useRef<HTMLDivElement>(null);
  const tabulatorInstance = useRef<Tabulator | null>(null);
  const isInitializedRef = useRef(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [groupByColumn, setGroupByColumn] = useState<string>("none");
  const [editingTeamRoster, setEditingTeamRoster] = useState<{
    projectId: string;
    currentUserIds: string[];
  } | null>(null);
  const [editingBlockedBy, setEditingBlockedBy] = useState<{
    projectId: string;
    currentProjectIds: string[];
  } | null>(null);
  const [editingBlocking, setEditingBlocking] = useState<{
    projectId: string;
    currentProjectIds: string[];
  } | null>(null);
  const [editingTags, setEditingTags] = useState<{
    projectId: string;
    currentTags: string[];
  } | null>(null);
  const [editingProjectArea, setEditingProjectArea] = useState<{
    projectId: string;
    currentArea: string;
  } | null>(null);
  const [editingAttachments, setEditingAttachments] = useState<{
    projectId: string;
    currentDocuments: any[];
  } | null>(null);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [allProjectAreas, setAllProjectAreas] = useState<string[]>([]);
  const [expandedProject, setExpandedProject] = useState<Project | null>(null);

  useEffect(() => {
    async function fetchUsers() {
      try {
        const response = await fetch('/api/users');
        const result = await response.json();
        setAllUsers(result.users || []);
      } catch (error) {
        console.error('Failed to fetch users:', error);
      }
    }
    fetchUsers();
  }, []);

  // Extract all unique tags from projects
  useEffect(() => {
    const tagsSet = new Set<string>();
    projects.forEach(project => {
      if (project.tags) {
        project.tags.forEach(tag => tagsSet.add(tag));
      }
    });
    setAllTags(Array.from(tagsSet).sort());
  }, [projects]);

  // Extract all unique project areas from projects
  useEffect(() => {
    const areasSet = new Set<string>();
    projects.forEach(project => {
      if (project.project_area) {
        areasSet.add(project.project_area);
      }
    });
    setAllProjectAreas(Array.from(areasSet).sort());
  }, [projects]);

  // Transform projects data for Tabulator
  const transformProjectData = (projectList: Project[]) => {
    console.log('[Transform] Processing', projectList.length, 'projects');
    console.log('[Transform] allUsers count:', allUsers.length);

    return projectList.map(project => {
      const teamRosterValue = (project.project_assignments || [])
        .filter(a => a.user || a.user_id != null) // Keep if has nested user OR has user_id
        .map(a => {
          // Use nested user data if available, otherwise lookup in allUsers
          if (a.user) {
            return a.user.name;
          }
          const user = allUsers.find(u => u.id === a.user_id);
          if (!user) {
            console.warn(`[Transform] User not found for ID: ${a.user_id}. Available users:`, allUsers.length);
          }
          return user?.name || "";
        })
        .filter(name => name !== "")
        .join(", ");

      if (project.project_assignments && project.project_assignments.length > 0) {
        console.log(`[Transform] Project "${project.title}":`, {
          assignmentsCount: project.project_assignments.length,
          firstAssignment: project.project_assignments[0],
          teamRosterValue: teamRosterValue
        });
      }

      return {
        id: project.id,
        title: project.title || "",
        status: project.status || "",
        priority: project.priority || "",
        task_progress: project.task_progress || "",
        team_roster: teamRosterValue,
      team_roster_ids: (project.project_assignments || [])
        .map(a => a.user_id || a.user?.id) // Get user_id directly or from nested user object
        .filter(id => id != null),
      location: project.location || "",
      project_area: project.project_area || "",
      description: project.description || "",
      tags: (project.tags || []).join(", "),
      start_date: project.start_date ? project.start_date.split('T')[0] : "",
      due_date: project.due_date ? project.due_date.split('T')[0] : "",
      blocked_by: (project.blocked_by || []).map(id => {
        const p = projectList.find(proj => proj.id === id);
        return p?.title || id;
      }).join(", "),
      blocked_by_ids: project.blocked_by || [],
      blocking: (project.blocking || []).map(id => {
        const p = projectList.find(proj => proj.id === id);
        return p?.title || id;
      }).join(", "),
      blocking_ids: project.blocking || [],
      attachments: project.documents?.length || 0,
      documents: project.documents || [],
      message_count: (project as any).message_count || 0,
      };
    });
  };

  const showTeamRosterEditor = (cell: any, projectId: string) => {
    const rowData = cell.getRow().getData();
    const currentUserIds = rowData.team_roster_ids || [];
    console.log('[TeamRoster] Opening editor:', {
      projectId,
      projectTitle: rowData.title,
      team_roster_ids: rowData.team_roster_ids,
      currentUserIds,
      rowData
    });
    setEditingTeamRoster({ projectId, currentUserIds });
  };

  const handleSaveTeamRoster = async (selectedUserIds: string[]) => {
    if (!editingTeamRoster) return;

    const projectId = editingTeamRoster.projectId;

    // Filter out any null/undefined values
    const validUserIds = selectedUserIds.filter(id => id != null && id !== '');

    try {
      const response = await fetch(`/api/projects/${projectId}/assignments`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_ids: validUserIds }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Failed to update team roster:', response.status, errorData);
        throw new Error(`Failed to update team roster: ${errorData.error || response.statusText}`);
      }

      const result = await response.json();
      const updatedProject = result.project;

      // Close the editor
      setEditingTeamRoster(null);

      // Update only the specific row in the table instead of refreshing all data
      if (tabulatorInstance.current && updatedProject) {
        try {
          const row = tabulatorInstance.current.getRow(projectId);
          if (row) {
            // Build the team roster display value
            const teamRosterValue = (updatedProject.project_assignments || [])
              .filter((a: any) => a.user || a.user_id != null)
              .map((a: any) => {
                if (a.user) {
                  return a.user.name;
                }
                const user = allUsers.find(u => u.id === a.user_id);
                return user?.name || "";
              })
              .filter((name: string) => name !== "")
              .join(", ");

            const teamRosterIds = (updatedProject.project_assignments || [])
              .map((a: any) => a.user_id || a.user?.id)
              .filter((id: string) => id != null);

            // Update the row data directly without triggering a full table refresh
            row.update({
              team_roster: teamRosterValue,
              team_roster_ids: teamRosterIds
            });

            console.log('[TeamRoster] Updated row for project:', projectId);
          }
        } catch (error) {
          console.error('Error updating row:', error);
          // Fall back to full refresh if row update fails
          if (onTeamRosterUpdate) {
            await onTeamRosterUpdate();
          }
        }
      }
    } catch (error) {
      console.error('Failed to update team roster:', error);
      alert('Failed to update team roster. Please try again.');
    }
  };

  const showBlockedByEditor = (cell: any, projectId: string) => {
    const rowData = cell.getRow().getData();
    const currentProjectIds = rowData.blocked_by_ids || [];
    setEditingBlockedBy({ projectId, currentProjectIds });
  };

  const handleSaveBlockedBy = async (selectedProjectIds: string[]) => {
    if (!editingBlockedBy) return;

    const projectId = editingBlockedBy.projectId;
    const oldProjectIds = editingBlockedBy.currentProjectIds;

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocked_by: selectedProjectIds }),
      });

      if (!response.ok) {
        throw new Error('Failed to update blocked by');
      }

      setEditingBlockedBy(null);

      // Update the edited row and all affected rows
      if (tabulatorInstance.current) {
        try {
          // Update the current project's row
          const row = tabulatorInstance.current.getRow(projectId);
          if (row) {
            const blockedByValue = selectedProjectIds
              .map(id => {
                const p = projects.find(proj => proj.id === id);
                return p?.title || id;
              })
              .join(", ");

            row.update({
              blocked_by: blockedByValue,
              blocked_by_ids: selectedProjectIds
            });
          }

          // Update all affected projects (those added or removed from blocked_by)
          const removedProjects = oldProjectIds.filter(id => !selectedProjectIds.includes(id));
          const addedProjects = selectedProjectIds.filter(id => !oldProjectIds.includes(id));
          const affectedProjects = [...new Set([...removedProjects, ...addedProjects])];

          // Fetch fresh data for affected projects to get their updated blocking arrays
          for (const affectedProjectId of affectedProjects) {
            try {
              const affectedResponse = await fetch(`/api/projects/${affectedProjectId}`);
              if (affectedResponse.ok) {
                const affectedData = await affectedResponse.json();
                const affectedProject = affectedData.project;

                const affectedRow = tabulatorInstance.current.getRow(affectedProjectId);
                if (affectedRow && affectedProject) {
                  const blockingValue = (affectedProject.blocking || [])
                    .map((id: string) => {
                      const p = projects.find(proj => proj.id === id);
                      return p?.title || id;
                    })
                    .join(", ");

                  affectedRow.update({
                    blocking: blockingValue,
                    blocking_ids: affectedProject.blocking || []
                  });
                }
              }
            } catch (error) {
              console.error(`Error updating affected project ${affectedProjectId}:`, error);
            }
          }
        } catch (error) {
          console.error('Error updating rows:', error);
        }
      }
    } catch (error) {
      console.error('Failed to update blocked by:', error);
      alert('Failed to update blocked by. Please try again.');
    }
  };

  const showBlockingEditor = (cell: any, projectId: string) => {
    const rowData = cell.getRow().getData();
    const currentProjectIds = rowData.blocking_ids || [];
    setEditingBlocking({ projectId, currentProjectIds });
  };

  const handleSaveBlocking = async (selectedProjectIds: string[]) => {
    if (!editingBlocking) return;

    const projectId = editingBlocking.projectId;
    const oldProjectIds = editingBlocking.currentProjectIds;

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocking: selectedProjectIds }),
      });

      if (!response.ok) {
        throw new Error('Failed to update blocking');
      }

      setEditingBlocking(null);

      // Update the edited row and all affected rows
      if (tabulatorInstance.current) {
        try {
          // Update the current project's row
          const row = tabulatorInstance.current.getRow(projectId);
          if (row) {
            const blockingValue = selectedProjectIds
              .map(id => {
                const p = projects.find(proj => proj.id === id);
                return p?.title || id;
              })
              .join(", ");

            row.update({
              blocking: blockingValue,
              blocking_ids: selectedProjectIds
            });
          }

          // Update all affected projects (those added or removed from blocking)
          const removedProjects = oldProjectIds.filter(id => !selectedProjectIds.includes(id));
          const addedProjects = selectedProjectIds.filter(id => !oldProjectIds.includes(id));
          const affectedProjects = [...new Set([...removedProjects, ...addedProjects])];

          // Fetch fresh data for affected projects to get their updated blocked_by arrays
          for (const affectedProjectId of affectedProjects) {
            try {
              const affectedResponse = await fetch(`/api/projects/${affectedProjectId}`);
              if (affectedResponse.ok) {
                const affectedData = await affectedResponse.json();
                const affectedProject = affectedData.project;

                const affectedRow = tabulatorInstance.current.getRow(affectedProjectId);
                if (affectedRow && affectedProject) {
                  const blockedByValue = (affectedProject.blocked_by || [])
                    .map((id: string) => {
                      const p = projects.find(proj => proj.id === id);
                      return p?.title || id;
                    })
                    .join(", ");

                  affectedRow.update({
                    blocked_by: blockedByValue,
                    blocked_by_ids: affectedProject.blocked_by || []
                  });
                }
              }
            } catch (error) {
              console.error(`Error updating affected project ${affectedProjectId}:`, error);
            }
          }
        } catch (error) {
          console.error('Error updating rows:', error);
        }
      }
    } catch (error) {
      console.error('Failed to update blocking:', error);
      alert('Failed to update blocking. Please try again.');
    }
  };

  const showTagsEditor = (cell: any, projectId: string) => {
    const rowData = cell.getRow().getData();
    const currentTags = rowData.tags ? rowData.tags.split(", ").filter((t: string) => t) : [];
    setEditingTags({ projectId, currentTags });
  };

  const handleSaveTags = async (selectedTags: string[]) => {
    if (!editingTags) return;

    const projectId = editingTags.projectId;

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: selectedTags }),
      });

      if (!response.ok) {
        throw new Error('Failed to update tags');
      }

      setEditingTags(null);

      // Update only the specific row
      if (tabulatorInstance.current) {
        try {
          const row = tabulatorInstance.current.getRow(projectId);
          if (row) {
            const tagsValue = selectedTags.join(", ");

            row.update({
              tags: tagsValue
            });
          }
        } catch (error) {
          console.error('Error updating row:', error);
        }
      }
    } catch (error) {
      console.error('Failed to update tags:', error);
      alert('Failed to update tags. Please try again.');
    }
  };

  const showProjectAreaEditor = (cell: any, projectId: string) => {
    const rowData = cell.getRow().getData();
    const currentArea = rowData.project_area || "";
    setEditingProjectArea({ projectId, currentArea });
  };

  const handleSaveProjectArea = async (selectedArea: string) => {
    if (!editingProjectArea) return;

    const projectId = editingProjectArea.projectId;

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_area: selectedArea }),
      });

      if (!response.ok) {
        throw new Error('Failed to update project area');
      }

      setEditingProjectArea(null);

      // Update only the specific row
      if (tabulatorInstance.current) {
        try {
          const row = tabulatorInstance.current.getRow(projectId);
          if (row) {
            row.update({
              project_area: selectedArea
            });
          }
        } catch (error) {
          console.error('Error updating row:', error);
        }
      }
    } catch (error) {
      console.error('Failed to update project area:', error);
      alert('Failed to update project area. Please try again.');
    }
  };

  const showAttachmentsEditor = (cell: any, projectId: string) => {
    const rowData = cell.getRow().getData();
    const currentDocuments = rowData.documents || [];
    setEditingAttachments({ projectId, currentDocuments });
  };

  const handleAttachmentsUpdate = async () => {
    if (!editingAttachments) return;

    const projectId = editingAttachments.projectId;

    // Fetch fresh project data to get updated documents
    try {
      const response = await fetch(`/api/projects/${projectId}`);
      if (response.ok) {
        const data = await response.json();
        const updatedProject = data.project;

        // Update the row
        if (tabulatorInstance.current && updatedProject) {
          const row = tabulatorInstance.current.getRow(projectId);
          if (row) {
            row.update({
              attachments: updatedProject.documents?.length || 0,
              documents: updatedProject.documents || []
            });
          }
        }

        // Update the dialog state with fresh documents
        setEditingAttachments({
          projectId,
          currentDocuments: updatedProject.documents || []
        });
      }
    } catch (error) {
      console.error('Error refreshing attachments:', error);
    }
  };

  // Initialize table only once (when we have both projects and users for the first time)
  // Use useLayoutEffect to ensure this runs before the update effect
  useLayoutEffect(() => {
    // Only initialize once - don't reinitialize if already done
    if (isInitializedRef.current) return;
    // Wait until we have both data sources
    if (!tableRef.current || !projects.length || !allUsers.length) return;

    const tableData = transformProjectData(projects);

    // Initialize Tabulator
    const table = new Tabulator(tableRef.current, {
      data: tableData,
      layout: "fitDataStretch",
      height: "600px",
      movableRows: true,
      movableColumns: true,
      rowHeader: {
        formatter: "rowSelection",
        titleFormatter: "rowSelection",
        headerSort: false,
        resizable: false,
        frozen: true,
        width: 30,
      },
      columns: [
        {
          title: "",
          field: "message_count",
          width: 50,
          headerSort: false,
          frozen: true,
          formatter: (cell: any) => {
            const count = cell.getValue() || 0;
            const hasMessages = count > 0;
            return `<div class="comment-badge-cell ${hasMessages ? 'has-messages' : ''}" style="display: flex; align-items: center; justify-content: center; height: 100%; opacity: ${hasMessages ? '1' : '0'}; transition: opacity 0.15s;">
              <button class="comment-badge" style="background: ${count > 0 ? '#3b82f6' : '#e5e7eb'}; color: ${count > 0 ? '#ffffff' : '#6b7280'}; border: none; padding: 4px 8px; display: flex; align-items: center; gap: 4px; cursor: pointer; border-radius: 6px; transition: all 0.15s; font-size: 11px; font-weight: 600;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <span>${count}</span>
              </button>
            </div>`;
          },
          cellClick: (_e: any, cell: any) => {
            const rowData = cell.getRow().getData();
            const project = projects.find(p => p.id === rowData.id);
            if (project) {
              setExpandedProject(project);
            }
          },
        },
        {
          title: "Title",
          field: "title",
          width: 250,
          editor: "input",
          headerFilter: "input",
          frozen: true,
        },
        {
          title: "Status",
          field: "status",
          width: 150,
          editor: "list",
          editorParams: { values: STATUS_OPTIONS },
          headerFilter: "list",
          headerFilterParams: { values: STATUS_OPTIONS },
          formatter: (cell) => {
            const value = cell.getValue();
            const colors: Record<string, string> = {
              "Not Started": "#6b7280",
              "In Progress": "#3b82f6",
              "On Hold": "#eab308",
              "Completed": "#22c55e",
              "Cancelled": "#ef4444",
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
            const colors: Record<string, string> = {
              "P1": "#ef4444",
              "P2": "#f97316",
              "P3": "#eab308",
              "P4": "#3b82f6",
            };
            const color = colors[value] || "#6b7280";
            return `<span style="background: ${color}20; color: ${color}; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 500;">${value}</span>`;
          },
        },
        {
          title: "Task Progress",
          field: "task_progress",
          width: 150,
          editor: "list",
          editorParams: { values: TASK_PROGRESS_OPTIONS },
          headerFilter: "list",
          headerFilterParams: { values: TASK_PROGRESS_OPTIONS },
        },
        {
          title: "Team Roster",
          field: "team_roster",
          width: 200,
          headerFilter: "input",
          formatter: (cell) => {
            const value = cell.getValue();
            if (!value) return "";
            const names = value.split(", ").filter((n: string) => n);
            return names.map((name: string) =>
              `<span style="background: #e5e7eb; color: #374151; padding: 2px 6px; border-radius: 4px; font-size: 12px; margin-right: 4px; display: inline-block;">${name}</span>`
            ).join("");
          },
          cellClick: (e, cell) => {
            const rowData = cell.getRow().getData();
            showTeamRosterEditor(cell, rowData.id);
          },
        },
        {
          title: "Location",
          field: "location",
          width: 180,
          editor: "input",
          headerFilter: "input",
        },
        {
          title: "Project Area",
          field: "project_area",
          width: 180,
          headerFilter: "input",
          cellClick: (e, cell) => {
            const rowData = cell.getRow().getData();
            showProjectAreaEditor(cell, rowData.id);
          },
        },
        {
          title: "Details",
          field: "description",
          width: 300,
          editor: "textarea",
          headerFilter: "input",
        },
        {
          title: "Tags",
          field: "tags",
          width: 200,
          headerFilter: "input",
          formatter: (cell) => {
            const value = cell.getValue();
            if (!value) return "";
            const tags = value.split(", ").filter((t: string) => t);
            return tags.map((tag: string) =>
              `<span style="background: #e0e7ff; color: #4338ca; padding: 2px 6px; border-radius: 4px; font-size: 12px; margin-right: 4px; display: inline-block;">${tag}</span>`
            ).join("");
          },
          cellClick: (e, cell) => {
            const rowData = cell.getRow().getData();
            showTagsEditor(cell, rowData.id);
          },
        },
        {
          title: "Start Date",
          field: "start_date",
          width: 150,
          editor: "date",
          headerFilter: "input",
        },
        {
          title: "Due Date",
          field: "due_date",
          width: 150,
          editor: "date",
          headerFilter: "input",
        },
        {
          title: "Blocked By",
          field: "blocked_by",
          width: 200,
          headerFilter: "input",
          formatter: (cell) => {
            const value = cell.getValue();
            if (!value) return "";
            const names = value.split(", ").filter((n: string) => n);
            return names.map((name: string) =>
              `<span style="background: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 4px; font-size: 12px; margin-right: 4px; display: inline-block;">${name}</span>`
            ).join("");
          },
          cellClick: (e, cell) => {
            const rowData = cell.getRow().getData();
            showBlockedByEditor(cell, rowData.id);
          },
        },
        {
          title: "Blocking",
          field: "blocking",
          width: 200,
          headerFilter: "input",
          formatter: (cell) => {
            const value = cell.getValue();
            if (!value) return "";
            const names = value.split(", ").filter((n: string) => n);
            return names.map((name: string) =>
              `<span style="background: #dbeafe; color: #1e40af; padding: 2px 6px; border-radius: 4px; font-size: 12px; margin-right: 4px; display: inline-block;">${name}</span>`
            ).join("");
          },
          cellClick: (e, cell) => {
            const rowData = cell.getRow().getData();
            showBlockingEditor(cell, rowData.id);
          },
        },
        {
          title: "Attachments",
          field: "attachments",
          width: 200,
          headerFilter: "input",
          formatter: (cell) => {
            const rowData = cell.getRow().getData();
            const documents = rowData.documents || [];
            const count = documents.length;

            if (count === 0) {
              return `<div style="color: #9ca3af; font-size: 12px;">No attachments</div>`;
            }

            // Filter for image documents
            const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
            const images = documents.filter((doc: any) => {
              const filename = doc.filename?.toLowerCase() || '';
              return imageExtensions.some(ext => filename.endsWith(ext));
            });

            // Debug logging
            if (documents.length > 0) {
              console.log('[Attachments Formatter] Documents:', documents);
              console.log('[Attachments Formatter] Images found:', images.length);
              if (images.length > 0) {
                console.log('[Attachments Formatter] First image URL:', images[0].storage_url);
              }
            }

            // Show thumbnails for images, plus count
            let html = '<div style="display: flex; align-items: center; gap: 4px;">';

            // Show up to 3 thumbnails (images or file type badges)
            const thumbnailsToShow = documents.slice(0, 3);
            thumbnailsToShow.forEach((doc: any) => {
              const filename = doc.filename?.toLowerCase() || '';
              const isImageFile = imageExtensions.some(ext => filename.endsWith(ext));

              if (isImageFile) {
                // Show image thumbnail
                let url = doc.storage_url;
                if (doc.thumbnail_url && !doc.thumbnail_url.includes('airtableusercontent.com')) {
                  url = doc.thumbnail_url;
                }

                if (url) {
                  html += `<img src="${url}" style="width: 24px; height: 24px; object-fit: cover; border-radius: 3px; border: 1px solid #e5e7eb;" onerror="console.error('[Thumbnail] Failed to load:', '${url}')" />`;
                }
              } else {
                // Show file type badge
                const ext = filename.split('.').pop()?.toUpperCase() || 'FILE';
                const colors: Record<string, { bg: string; text: string }> = {
                  PDF: { bg: '#ef4444', text: '#ffffff' },
                  DOC: { bg: '#2563eb', text: '#ffffff' },
                  DOCX: { bg: '#2563eb', text: '#ffffff' },
                  XLS: { bg: '#16a34a', text: '#ffffff' },
                  XLSX: { bg: '#16a34a', text: '#ffffff' },
                  PPT: { bg: '#ea580c', text: '#ffffff' },
                  PPTX: { bg: '#ea580c', text: '#ffffff' },
                  TXT: { bg: '#6b7280', text: '#ffffff' },
                  ZIP: { bg: '#8b5cf6', text: '#ffffff' },
                };
                const color = colors[ext] || { bg: '#6b7280', text: '#ffffff' };
                html += `<div style="width: 24px; height: 24px; background: ${color.bg}; color: ${color.text}; border-radius: 3px; display: flex; align-items: center; justify-content: center; font-size: 7px; font-weight: 700; font-family: monospace; border: 1px solid #e5e7eb;">${ext.substring(0, 4)}</div>`;
              }
            });

            // Show count badge
            html += `<span style="background: #f3f4f6; color: #6b7280; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 500;">${count}</span>`;
            html += '</div>';

            return html;
          },
          cellClick: (_e: any, cell: any) => {
            const rowData = cell.getRow().getData();
            showAttachmentsEditor(cell, rowData.id);
          },
        },
      ],
    });

    // Handle cell edits
    table.on("cellEdited", (cell) => {
      const field = cell.getField();
      const value = cell.getValue();
      const rowData = cell.getRow().getData();

      if (onUpdate && rowData.id) {
        onUpdate(rowData.id, field, value);
      }
    });

    // Handle row drag
    table.on("rowMoved", (row) => {
      console.log("Row moved:", row.getData());
    });

    // Store the instance immediately
    tabulatorInstance.current = table;

    // Wait for table to be fully built before marking as initialized
    table.on("tableBuilt", () => {
      isInitializedRef.current = true;
    });

    return () => {
      // Reset the flag first to prevent other effects from trying to use the table
      isInitializedRef.current = false;
      if (tabulatorInstance.current) {
        try {
          tabulatorInstance.current.destroy();
        } catch (error) {
          console.error('Error destroying table:', error);
        }
        tabulatorInstance.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects.length, allUsers.length]);

  // Update table data when projects change (without recreating the table)
  useEffect(() => {
    // Skip if table hasn't been initialized yet
    if (!isInitializedRef.current) return;

    // Store instance in local variable to prevent race conditions
    const instance = tabulatorInstance.current;
    if (!instance) return;

    // Additional safety checks to prevent race conditions
    try {
      // Check if the table element still exists in the DOM
      if (!tableRef.current) return;

      // Check if instance has the element property and it's still valid
      if (!instance.element || !document.body.contains(instance.element)) return;

      const tableData = transformProjectData(projects);

      // Use the local variable which won't change during execution
      if (typeof instance.setData === 'function') {
        instance.setData(tableData);
      }
    } catch (error) {
      console.error('Error updating table data:', error);
    }
  }, [projects, allUsers]);

  // Handle search filter
  useEffect(() => {
    if (tabulatorInstance.current && searchTerm) {
      tabulatorInstance.current.setFilter([
        { field: "title", type: "like", value: searchTerm },
        { field: "status", type: "like", value: searchTerm },
        { field: "priority", type: "like", value: searchTerm },
        { field: "description", type: "like", value: searchTerm },
      ], { matchType: "or" });
    } else if (tabulatorInstance.current) {
      tabulatorInstance.current.clearFilter();
    }
  }, [searchTerm]);

  // Handle grouping
  useEffect(() => {
    if (tabulatorInstance.current) {
      if (groupByColumn && groupByColumn !== "none") {
        tabulatorInstance.current.setGroupBy(groupByColumn);
      } else {
        tabulatorInstance.current.setGroupBy(false);
      }
    }
  }, [groupByColumn]);

  const groupableColumns = [
    { value: "none", label: "No Grouping" },
    { value: "status", label: "Status" },
    { value: "priority", label: "Priority" },
    { value: "task_progress", label: "Task Progress" },
    { value: "location", label: "Location" },
    { value: "project_area", label: "Project Area" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Group by:</span>
          <Select value={groupByColumn} onValueChange={setGroupByColumn}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="No grouping" />
            </SelectTrigger>
            <SelectContent>
              {groupableColumns.map(col => (
                <SelectItem key={col.value} value={col.value}>
                  {col.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div ref={tableRef} className="border rounded-lg overflow-hidden" />

      <div className="text-sm text-gray-500">
        {projects.length} project(s) total
      </div>

      {/* Team Roster Editor Dialog */}
      <TeamRosterDialog
        open={editingTeamRoster !== null}
        onClose={() => setEditingTeamRoster(null)}
        allUsers={allUsers}
        selectedUserIds={editingTeamRoster?.currentUserIds || []}
        onSave={handleSaveTeamRoster}
      />

      {/* Blocked By Editor Dialog */}
      <ProjectSelectorDialog
        open={editingBlockedBy !== null}
        onClose={() => setEditingBlockedBy(null)}
        title="Edit Blocked By"
        allProjects={projects}
        currentProjectId={editingBlockedBy?.projectId || ""}
        selectedProjectIds={editingBlockedBy?.currentProjectIds || []}
        onSave={handleSaveBlockedBy}
      />

      {/* Blocking Editor Dialog */}
      <ProjectSelectorDialog
        open={editingBlocking !== null}
        onClose={() => setEditingBlocking(null)}
        title="Edit Blocking"
        allProjects={projects}
        currentProjectId={editingBlocking?.projectId || ""}
        selectedProjectIds={editingBlocking?.currentProjectIds || []}
        onSave={handleSaveBlocking}
      />

      {/* Tags Editor Dialog */}
      <TagsEditorDialog
        open={editingTags !== null}
        onClose={() => setEditingTags(null)}
        allTags={allTags}
        selectedTags={editingTags?.currentTags || []}
        onSave={handleSaveTags}
      />

      {/* Project Area Editor Dialog */}
      <ProjectAreaEditorDialog
        isOpen={editingProjectArea !== null}
        onClose={() => setEditingProjectArea(null)}
        projectId={editingProjectArea?.projectId || ""}
        currentArea={editingProjectArea?.currentArea || ""}
        allAreas={allProjectAreas}
        onSave={handleSaveProjectArea}
      />

      {/* Attachments Editor Dialog */}
      <AttachmentsEditorDialog
        isOpen={editingAttachments !== null}
        onClose={() => setEditingAttachments(null)}
        projectId={editingAttachments?.projectId || ""}
        documents={editingAttachments?.currentDocuments || []}
        onUpdate={handleAttachmentsUpdate}
      />

      {/* Project Editor Dialog */}
      {expandedProject && (
        <ProjectEditorDialog
          isOpen={expandedProject !== null}
          onClose={() => setExpandedProject(null)}
          project={expandedProject}
          allUsers={allUsers}
          allProjectAreas={allProjectAreas}
          allTags={allTags}
          allProjects={projects}
          onUpdate={async (projectId: string, field: string, value: any) => {
            // Update the project via API
            const response = await fetch(`/api/projects/${projectId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ [field]: value }),
            });

            if (!response.ok) {
              throw new Error('Failed to update project');
            }

            const result = await response.json();
            const updatedProject = result.project;

            // Update only this specific row in the table
            if (tabulatorInstance.current && updatedProject) {
              const row = tabulatorInstance.current.getRow(projectId);
              if (row) {
                // Transform the updated project data
                const transformedData = transformProjectData([updatedProject])[0];
                row.update(transformedData);
              }
            }
          }}
          onDocumentsChange={async (projectId: string) => {
            // Fetch fresh project data to get updated documents and team roster
            try {
              const response = await fetch(`/api/projects/${projectId}`);
              if (response.ok) {
                const data = await response.json();
                const updatedProject = data.project;

                // Update the row with new documents and team roster
                if (tabulatorInstance.current && updatedProject) {
                  const row = tabulatorInstance.current.getRow(projectId);
                  if (row) {
                    // Build team roster display value
                    const teamRosterValue = (updatedProject.project_assignments || [])
                      .filter((a: any) => a.user || a.user_id != null)
                      .map((a: any) => {
                        if (a.user) {
                          return a.user.name;
                        }
                        const user = allUsers.find(u => u.id === a.user_id);
                        return user?.name || "";
                      })
                      .filter((name: string) => name !== "")
                      .join(", ");

                    const teamRosterIds = (updatedProject.project_assignments || [])
                      .map((a: any) => a.user_id || a.user?.id)
                      .filter((id: string) => id != null);

                    row.update({
                      attachments: updatedProject.documents?.length || 0,
                      documents: updatedProject.documents || [],
                      team_roster: teamRosterValue,
                      team_roster_ids: teamRosterIds
                    });

                    console.log('[onDocumentsChange] Updated row for project:', projectId, {
                      teamRosterValue,
                      teamRosterIds
                    });

                    // Also update expandedProject state so dialog shows current data
                    setExpandedProject(updatedProject);
                  }
                }
              }
            } catch (error) {
              console.error('Error refreshing project data:', error);
            }
          }}
          onSave={async (projectData: any) => {
            if (!expandedProject) return;

            try {
              // Update the project via API
              const response = await fetch(`/api/projects/${expandedProject.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(projectData),
              });

              if (!response.ok) {
                throw new Error('Failed to update project');
              }

              const result = await response.json();
              const updatedProject = result.project;

              // Handle team roster update separately
              if (projectData.team_roster) {
                const rosterResponse = await fetch(`/api/projects/${expandedProject.id}/assignments`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ userIds: projectData.team_roster }),
                });

                if (rosterResponse.ok) {
                  const rosterResult = await rosterResponse.json();
                  if (rosterResult.project) {
                    updatedProject.project_assignments = rosterResult.project.project_assignments;
                  }
                }
              }

              // Update only this specific row in the table
              if (tabulatorInstance.current && updatedProject) {
                const row = tabulatorInstance.current.getRow(expandedProject.id);
                if (row) {
                  // Transform the updated project data
                  const transformedData = transformProjectData([updatedProject])[0];
                  row.update(transformedData);
                }
              }

              setExpandedProject(null);
            } catch (error) {
              console.error('Failed to save project:', error);
              throw error;
            }
          }}
        />
      )}

      {/* CSS for comment badge hover effect */}
      <style jsx global>{`
        /* Always show badges with messages */
        .comment-badge-cell.has-messages {
          opacity: 1 !important;
        }

        /* Show badges without messages only on row hover */
        .tabulator-row:hover .comment-badge-cell {
          opacity: 1 !important;
        }

        .comment-badge:hover {
          transform: scale(1.05);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }
      `}</style>
    </div>
  );
}

// Team Roster Dialog Component
function TeamRosterDialog({
  open,
  onClose,
  allUsers,
  selectedUserIds,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  allUsers: User[];
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

// Project Selector Dialog Component
function ProjectSelectorDialog({
  open,
  onClose,
  title,
  allProjects,
  currentProjectId,
  selectedProjectIds,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  allProjects: Project[];
  currentProjectId: string;
  selectedProjectIds: string[];
  onSave: (projectIds: string[]) => Promise<void>;
}) {
  const [selected, setSelected] = useState<string[]>(selectedProjectIds);

  useEffect(() => {
    setSelected(selectedProjectIds);
  }, [selectedProjectIds]);

  const toggleProject = (projectId: string) => {
    setSelected(prev =>
      prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };

  const handleSave = async () => {
    await onSave(selected);
  };

  // Filter out the current project from the list
  const availableProjects = allProjects.filter(p => p.id !== currentProjectId);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="max-h-96 overflow-y-auto">
          <div className="space-y-2">
            {availableProjects.map((project) => (
              <div
                key={project.id}
                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 cursor-pointer rounded"
                onClick={() => toggleProject(project.id)}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(project.id)}
                  onChange={() => {}}
                  className="h-4 w-4"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium">{project.title}</div>
                  <div className="text-xs text-gray-500">
                    {project.status} {project.priority && `• ${project.priority}`}
                  </div>
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

// Tags Editor Dialog Component
function TagsEditorDialog({
  open,
  onClose,
  allTags,
  selectedTags,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  allTags: string[];
  selectedTags: string[];
  onSave: (tags: string[]) => Promise<void>;
}) {
  const [selected, setSelected] = useState<string[]>(selectedTags);
  const [newTag, setNewTag] = useState("");

  useEffect(() => {
    setSelected(selectedTags);
  }, [selectedTags]);

  const toggleTag = (tag: string) => {
    setSelected(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const addNewTag = () => {
    const trimmedTag = newTag.trim();
    if (trimmedTag && !selected.includes(trimmedTag)) {
      setSelected(prev => [...prev, trimmedTag]);
      setNewTag("");
    }
  };

  const removeTag = (tag: string) => {
    setSelected(prev => prev.filter(t => t !== tag));
  };

  const handleSave = async () => {
    await onSave(selected);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addNewTag();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Tags</DialogTitle>
        </DialogHeader>

        {/* Selected Tags */}
        {selected.length > 0 && (
          <div className="mb-4">
            <div className="text-sm font-medium mb-2">Selected Tags:</div>
            <div className="flex flex-wrap gap-2">
              {selected.map((tag) => (
                <div
                  key={tag}
                  className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm"
                >
                  <span>{tag}</span>
                  <button
                    onClick={() => removeTag(tag)}
                    className="hover:bg-indigo-200 rounded-full w-4 h-4 flex items-center justify-center"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add New Tag */}
        <div className="mb-4">
          <div className="text-sm font-medium mb-2">Add New Tag:</div>
          <div className="flex gap-2">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a new tag..."
              className="flex-1"
            />
            <Button onClick={addNewTag} disabled={!newTag.trim()}>
              Add
            </Button>
          </div>
        </div>

        {/* Existing Tags */}
        {allTags.length > 0 && (
          <div>
            <div className="text-sm font-medium mb-2">Select from existing tags:</div>
            <div className="max-h-48 overflow-y-auto">
              <div className="space-y-2">
                {allTags.map((tag) => (
                  <div
                    key={tag}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 cursor-pointer rounded"
                    onClick={() => toggleTag(tag)}
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(tag)}
                      onChange={() => {}}
                      className="h-4 w-4"
                    />
                    <div className="text-sm">{tag}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

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

function ProjectAreaEditorDialog({
  isOpen,
  onClose,
  projectId,
  currentArea,
  allAreas,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  currentArea: string;
  allAreas: string[];
  onSave: (selectedArea: string) => void;
}) {
  const [selectedArea, setSelectedArea] = useState(currentArea);
  const [newAreaInput, setNewAreaInput] = useState("");

  useEffect(() => {
    if (isOpen) {
      setSelectedArea(currentArea);
      setNewAreaInput("");
    }
  }, [isOpen, currentArea]);

  const handleSave = () => {
    const areaToSave = newAreaInput.trim() || selectedArea;
    if (areaToSave) {
      onSave(areaToSave);
    }
    onClose();
  };

  const handleAreaSelect = (area: string) => {
    setSelectedArea(area);
    setNewAreaInput(""); // Clear new area input when selecting existing area
  };

  const handleNewAreaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewAreaInput(e.target.value);
    setSelectedArea(""); // Clear selected area when typing new area
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Project Area</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current selection display */}
          {(selectedArea || newAreaInput) && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-sm font-medium text-blue-900">
                Current selection: {newAreaInput.trim() || selectedArea}
              </div>
            </div>
          )}

          {/* New area input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Add new area
            </label>
            <Input
              type="text"
              placeholder="Type a new project area..."
              value={newAreaInput}
              onChange={handleNewAreaChange}
              className="w-full"
            />
          </div>

          {/* Existing areas list */}
          {allAreas.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Or select from existing areas
              </label>
              <div className="max-h-48 overflow-y-auto border rounded-lg p-2 space-y-1">
                {allAreas.map((area) => (
                  <div
                    key={area}
                    className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                    onClick={() => handleAreaSelect(area)}
                  >
                    <input
                      type="radio"
                      checked={selectedArea === area && !newAreaInput}
                      onChange={() => handleAreaSelect(area)}
                      className="cursor-pointer"
                    />
                    <span className="text-sm">{area}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
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

function AttachmentsEditorDialog({
  isOpen,
  onClose,
  projectId,
  documents,
  onUpdate,
}: {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  documents: any[];
  onUpdate: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
  const isImage = (filename: string) => {
    const lower = filename.toLowerCase();
    return imageExtensions.some(ext => lower.endsWith(ext));
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('projectId', projectId);

      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }

      const response = await fetch(`/api/projects/${projectId}/documents`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(errorData.error || 'Failed to upload files');
      }

      // Refresh the documents list
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

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this attachment?')) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/documents/${documentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete document');
      }

      // Refresh the documents list
      await onUpdate();
    } catch (error: any) {
      console.error('Delete error:', error);
      alert('Failed to delete attachment. Please try again.');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
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
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              {uploading ? 'Uploading...' : 'Choose Files to Upload'}
            </label>
            <p className="text-sm text-gray-500 mt-2">
              Click to select files or drag and drop
            </p>
            {uploadError && (
              <p className="text-sm text-red-600 mt-2">{uploadError}</p>
            )}
          </div>

          {/* Documents List */}
          {documents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No attachments yet
            </div>
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
                            doc.thumbnail_url && !doc.thumbnail_url.includes('airtableusercontent.com')
                              ? doc.thumbnail_url
                              : doc.storage_url
                          }
                          alt={doc.filename}
                          className="w-16 h-16 object-cover rounded border"
                        />
                      ) : (
                        <div className={`w-16 h-16 rounded border flex items-center justify-center ${
                          doc.filename.toLowerCase().endsWith('.pdf') ? 'bg-red-500' :
                          doc.filename.toLowerCase().endsWith('.doc') || doc.filename.toLowerCase().endsWith('.docx') ? 'bg-blue-600' :
                          doc.filename.toLowerCase().endsWith('.xls') || doc.filename.toLowerCase().endsWith('.xlsx') ? 'bg-green-600' :
                          doc.filename.toLowerCase().endsWith('.ppt') || doc.filename.toLowerCase().endsWith('.pptx') ? 'bg-orange-600' :
                          doc.filename.toLowerCase().endsWith('.txt') ? 'bg-gray-500' :
                          doc.filename.toLowerCase().endsWith('.zip') ? 'bg-purple-600' :
                          'bg-gray-500'
                        }`}>
                          <span className="text-sm font-bold text-white font-mono">
                            {(doc.filename.split('.').pop()?.toUpperCase() || 'FILE').substring(0, 4)}
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
                          : 'Unknown size'}
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
          <Button onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
