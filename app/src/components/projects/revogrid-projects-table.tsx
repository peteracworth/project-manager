"use client";

import { useState, useEffect, useMemo } from "react";
import { RevoGrid } from "@revolist/react-datagrid";
import type { ColumnDataSchemaModel, DataType, EditorBase } from "@revolist/revogrid";
import { Project, User } from "@/types/database";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

interface RevoGridProjectsTableProps {
  projects: Project[];
  onUpdate?: (projectId: string, field: string, value: any) => Promise<void>;
}

const STATUS_OPTIONS = ["Not Started", "In Progress", "On Hold", "Completed", "Cancelled"];
const PRIORITY_OPTIONS = ["P1", "P2", "P3", "P4"];
const TASK_PROGRESS_OPTIONS = ["Not Started", "In Progress", "Blocked", "On Hold", "Completed", "Cancelled"];

export function RevoGridProjectsTable({ projects, onUpdate }: RevoGridProjectsTableProps) {
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [groupByColumn, setGroupByColumn] = useState<string>("none");

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

  // Transform projects data for RevoGrid
  const rows = useMemo(() => {
    return projects.map(project => ({
      _projectId: project.id,
      _rawProject: project,
      title: project.title || "",
      status: project.status || "",
      priority: project.priority || "",
      task_progress: project.task_progress || "",
      team_roster: (project.project_assignments || []).map(a => {
        const user = allUsers.find(u => u.id === a.user_id);
        return user?.name || "";
      }).join(", "),
      location: project.location || "",
      project_area: project.project_area || "",
      description: project.description || "",
      tags: (project.tags || []).join(", "),
      start_date: project.start_date ? project.start_date.split('T')[0] : "",
      due_date: project.due_date ? project.due_date.split('T')[0] : "",
      blocked_by: (project.blocked_by || []).map(id => {
        const p = projects.find(proj => proj.id === id);
        return p?.title || id;
      }).join(", "),
      blocking: (project.blocking || []).map(id => {
        const p = projects.find(proj => proj.id === id);
        return p?.title || id;
      }).join(", "),
      attachments: (project.documents?.length || 0).toString(),
    }));
  }, [projects, allUsers]);

  // Custom dropdown editor
  const createSelectEditor = (options: string[]): any => {
    return class SelectEditor implements EditorBase {
      element: HTMLSelectElement | null = null;
      private editCell?: (val: any) => void;

      constructor(
        public column: any,
        public save: (value: any, preventFocus?: boolean) => void,
        public close: (preventFocus?: boolean) => void
      ) {}

      async componentDidRender() {
        return true;
      }

      render() {
        this.element = document.createElement('select');
        this.element.className = 'revogrid-select-editor';
        this.element.style.cssText = 'width: 100%; height: 100%; box-sizing: border-box; padding: 4px; border: 1px solid #ccc; border-radius: 4px; background: white;';

        const emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.textContent = '(empty)';
        this.element.appendChild(emptyOption);

        options.forEach(opt => {
          const option = document.createElement('option');
          option.value = opt;
          option.textContent = opt;
          this.element!.appendChild(option);
        });

        this.element.addEventListener('change', () => {
          if (this.element) {
            this.save(this.element.value, false);
            this.close(false);
          }
        });

        this.element.addEventListener('blur', () => {
          this.close(false);
        });

        this.element.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') {
            this.close(false);
          }
        });

        return this.element;
      }

      editCell(val: any, EditCell: any) {
        this.editCell = EditCell;
        if (this.element) {
          this.element.value = val || '';
          setTimeout(() => {
            if (this.element) {
              this.element.focus();
              this.element.click(); // Open dropdown
            }
          }, 10);
        }
      }

      getValue() {
        return this.element?.value || '';
      }

      disconnect() {
        if (this.element) {
          this.element.remove();
          this.element = null;
        }
      }
    };
  };

  // Custom date editor
  const DateEditor: any = class implements EditorBase {
    element: HTMLInputElement | null = null;
    private editCell?: (val: any) => void;

    constructor(
      public column: any,
      public save: (value: any, preventFocus?: boolean) => void,
      public close: (preventFocus?: boolean) => void
    ) {}

    async componentDidRender() {
      return true;
    }

    render() {
      this.element = document.createElement('input');
      this.element.type = 'date';
      this.element.className = 'revogrid-date-editor';
      this.element.style.cssText = 'width: 100%; height: 100%; box-sizing: border-box; padding: 4px; border: 1px solid #ccc; border-radius: 4px;';

      this.element.addEventListener('change', () => {
        if (this.element) {
          this.save(this.element.value, false);
        }
      });

      this.element.addEventListener('blur', () => {
        this.close(false);
      });

      this.element.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          if (this.element) {
            this.save(this.element.value, false);
          }
          this.close(false);
        } else if (e.key === 'Escape') {
          this.close(false);
        }
      });

      return this.element;
    }

    editCell(val: any, EditCell: any) {
      this.editCell = EditCell;
      if (this.element) {
        this.element.value = val || '';
        setTimeout(() => this.element?.focus(), 10);
      }
    }

    getValue() {
      return this.element?.value || '';
    }

    disconnect() {
      if (this.element) {
        this.element.remove();
        this.element = null;
      }
    }
  };

  // Define columns
  const columns = useMemo<ColumnDataSchemaModel[]>(() => [
    {
      prop: "title",
      name: "Title",
      size: 250,
      sortable: true,
      filter: true,
    },
    {
      prop: "status",
      name: "Status",
      size: 150,
      sortable: true,
      filter: true,
      editor: createSelectEditor(STATUS_OPTIONS),
    },
    {
      prop: "priority",
      name: "Priority",
      size: 120,
      sortable: true,
      filter: true,
      editor: createSelectEditor(PRIORITY_OPTIONS),
    },
    {
      prop: "task_progress",
      name: "Task Progress",
      size: 150,
      sortable: true,
      filter: true,
      editor: createSelectEditor(TASK_PROGRESS_OPTIONS),
    },
    {
      prop: "team_roster",
      name: "Team Roster",
      size: 200,
      sortable: true,
      filter: true,
      readonly: true,
    },
    {
      prop: "location",
      name: "Location",
      size: 180,
      sortable: true,
      filter: true,
    },
    {
      prop: "project_area",
      name: "Project Area",
      size: 180,
      sortable: true,
      filter: true,
    },
    {
      prop: "description",
      name: "Details",
      size: 300,
      sortable: true,
      filter: true,
    },
    {
      prop: "tags",
      name: "Tags",
      size: 200,
      sortable: true,
      filter: true,
    },
    {
      prop: "start_date",
      name: "Start Date",
      size: 150,
      sortable: true,
      filter: true,
      editor: DateEditor,
    },
    {
      prop: "due_date",
      name: "Due Date",
      size: 150,
      sortable: true,
      filter: true,
      editor: DateEditor,
    },
    {
      prop: "blocked_by",
      name: "Blocked By",
      size: 180,
      sortable: true,
      filter: true,
      readonly: true,
    },
    {
      prop: "blocking",
      name: "Blocking",
      size: 180,
      sortable: true,
      filter: true,
      readonly: true,
    },
    {
      prop: "attachments",
      name: "Attachments",
      size: 120,
      sortable: true,
      filter: true,
      readonly: true,
    },
  ], []);

  const handleCellEdit = (event: CustomEvent) => {
    const { detail } = event;
    const { prop, model, val } = detail;
    const projectId = model._projectId;

    if (onUpdate && projectId && prop) {
      onUpdate(projectId, prop, val);
    }
  };

  // Group rows by column
  const groupedData = useMemo(() => {
    if (!groupByColumn || groupByColumn === "none") {
      return { "All Projects": rows };
    }

    const groups: Record<string, any[]> = {};
    rows.forEach(row => {
      const groupValue = row[groupByColumn] || '(Empty)';
      if (!groups[groupValue]) {
        groups[groupValue] = [];
      }
      groups[groupValue].push(row);
    });

    return groups;
  }, [rows, groupByColumn]);

  // Filter rows based on search term
  const filteredGroupedData = useMemo(() => {
    if (!searchTerm) return groupedData;

    const lowerSearch = searchTerm.toLowerCase();
    const filtered: Record<string, any[]> = {};

    Object.entries(groupedData).forEach(([groupName, groupRows]) => {
      const filteredRows = groupRows.filter(row =>
        Object.values(row).some(value =>
          String(value).toLowerCase().includes(lowerSearch)
        )
      );
      if (filteredRows.length > 0) {
        filtered[groupName] = filteredRows;
      }
    });

    return filtered;
  }, [groupedData, searchTerm]);

  const groupableColumns = [
    { value: "none", label: "No Grouping" },
    { value: "status", label: "Status" },
    { value: "priority", label: "Priority" },
    { value: "task_progress", label: "Task Progress" },
    { value: "location", label: "Location" },
    { value: "project_area", label: "Project Area" },
  ];

  const totalProjects = Object.values(filteredGroupedData).reduce((sum, group) => sum + group.length, 0);

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

      {Object.entries(filteredGroupedData).map(([groupName, groupRows]) => (
        <div key={groupName} className="space-y-2">
          {groupByColumn !== "none" && (
            <div className="bg-gray-100 px-4 py-2 rounded-md">
              <h3 className="font-semibold text-gray-700">
                {groupName} ({groupRows.length})
              </h3>
            </div>
          )}

          <div style={{ height: '400px', width: '100%' }}>
            <RevoGrid
              source={groupRows as DataType[]}
              columns={columns}
              theme="compact"
              resize={true}
              filter={true}
              canFocus={true}
              range={true}
              readonly={false}
              onAfterEdit={handleCellEdit}
              rowHeaders={true}
            />
          </div>
        </div>
      ))}

      <div className="text-sm text-gray-500">
        {totalProjects} project(s) total
        {groupByColumn !== "none" && ` in ${Object.keys(filteredGroupedData).length} group(s)`}
      </div>
    </div>
  );
}
