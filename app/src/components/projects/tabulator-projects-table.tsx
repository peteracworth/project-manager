"use client";

import { useEffect, useRef, useState } from "react";
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
import { Search } from "lucide-react";

import "tabulator-tables/dist/css/tabulator.min.css";

interface TabulatorProjectsTableProps {
  projects: Project[];
  onUpdate?: (projectId: string, field: string, value: any) => Promise<void>;
}

const STATUS_OPTIONS = ["Not Started", "In Progress", "On Hold", "Completed", "Cancelled"];
const PRIORITY_OPTIONS = ["P1", "P2", "P3", "P4"];
const TASK_PROGRESS_OPTIONS = ["Not Started", "In Progress", "Blocked", "On Hold", "Completed", "Cancelled"];

export function TabulatorProjectsTable({ projects, onUpdate }: TabulatorProjectsTableProps) {
  const tableRef = useRef<HTMLDivElement>(null);
  const tabulatorInstance = useRef<Tabulator | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [groupByColumn, setGroupByColumn] = useState<string>("none");
  const isInitializedRef = useRef(false);
  const [editingTeamRoster, setEditingTeamRoster] = useState<{
    projectId: string;
    currentUserIds: string[];
  } | null>(null);

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

  // Transform projects data for Tabulator
  const transformProjectData = (projectList: Project[]) => {
    return projectList.map(project => ({
      id: project.id,
      title: project.title || "",
      status: project.status || "",
      priority: project.priority || "",
      task_progress: project.task_progress || "",
      team_roster: (project.project_assignments || []).map(a => {
        const user = allUsers.find(u => u.id === a.user_id);
        return user?.name || "";
      }).join(", "),
      team_roster_ids: (project.project_assignments || []).map(a => a.user_id),
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
      blocking: (project.blocking || []).map(id => {
        const p = projectList.find(proj => proj.id === id);
        return p?.title || id;
      }).join(", "),
      attachments: project.documents?.length || 0,
    }));
  };

  const showTeamRosterEditor = (cell: any, projectId: string) => {
    const rowData = cell.getRow().getData();
    const currentUserIds = rowData.team_roster_ids || [];
    setEditingTeamRoster({ projectId, currentUserIds });
  };

  const handleSaveTeamRoster = async (selectedUserIds: string[]) => {
    if (!editingTeamRoster) return;

    try {
      const response = await fetch(`/api/projects/${editingTeamRoster.projectId}/assignments`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_ids: selectedUserIds }),
      });

      if (!response.ok) throw new Error('Failed to update team roster');

      // Close the editor
      setEditingTeamRoster(null);

      // The parent will refetch projects automatically
    } catch (error) {
      console.error('Failed to update team roster:', error);
    }
  };

  // Initialize table only once
  useEffect(() => {
    if (!tableRef.current || isInitializedRef.current || !projects.length) return;

    const tableData = transformProjectData(projects);

    // Initialize Tabulator
    const table = new Tabulator(tableRef.current, {
      data: tableData,
      layout: "fitDataStretch",
      height: "600px",
      movableRows: true,
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
          editor: "input",
          headerFilter: "input",
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
          editor: "input",
          headerFilter: "input",
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
          width: 180,
          headerFilter: "input",
        },
        {
          title: "Blocking",
          field: "blocking",
          width: 180,
          headerFilter: "input",
        },
        {
          title: "Attachments",
          field: "attachments",
          width: 120,
          headerFilter: "input",
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

    tabulatorInstance.current = table;
    isInitializedRef.current = true;

    return () => {
      if (tabulatorInstance.current) {
        tabulatorInstance.current.destroy();
        isInitializedRef.current = false;
      }
    };
  }, []);

  // Update table data when projects change (without recreating the table)
  useEffect(() => {
    if (!tabulatorInstance.current || !isInitializedRef.current) return;

    const tableData = transformProjectData(projects);
    tabulatorInstance.current.setData(tableData);
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
