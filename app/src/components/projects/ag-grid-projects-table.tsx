"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { AgGridReact } from "ag-grid-react";
import { ColDef, ICellRendererParams, ICellEditorParams, ModuleRegistry, AllCommunityModule } from "ag-grid-community";
import { AllEnterpriseModule } from "ag-grid-enterprise";
import { Project, User } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule, AllEnterpriseModule]);

// Note: AG Grid Enterprise requires a license key for production use
// Without a license, you can still evaluate all features but will see console warnings
// To get a trial license key, visit: https://www.ag-grid.com/license-pricing/
// Then set it with: LicenseManager.setLicenseKey("YOUR_LICENSE_KEY");

interface AGGridProjectsTableProps {
  projects: Project[];
  onUpdate?: (projectId: string, field: string, value: any) => Promise<void>;
}

const STATUS_OPTIONS = ["Not Started", "In Progress", "On Hold", "Completed", "Cancelled"];
const PRIORITY_OPTIONS = ["P1", "P2", "P3", "P4"];
const TASK_PROGRESS_OPTIONS = ["Not Started", "In Progress", "Blocked", "On Hold", "Completed", "Cancelled"];

const statusColors: Record<string, string> = {
  "Not Started": "bg-gray-100 text-gray-800",
  "In Progress": "bg-blue-100 text-blue-800",
  "On Hold": "bg-yellow-100 text-yellow-800",
  "Completed": "bg-green-100 text-green-800",
  "Cancelled": "bg-red-100 text-red-800",
};

const priorityColors: Record<string, string> = {
  "P1": "bg-red-100 text-red-800",
  "P2": "bg-orange-100 text-orange-800",
  "P3": "bg-yellow-100 text-yellow-800",
  "P4": "bg-blue-100 text-blue-800",
};

// Badge Cell Renderer for status/priority
const BadgeCellRenderer = (props: ICellRendererParams) => {
  const { value, colDef } = props;
  const colorMap = colDef.cellRendererParams?.colorMap;

  if (!value) return <span className="text-gray-400">-</span>;

  const colorClass = colorMap?.[value] || "bg-gray-100 text-gray-800";

  return (
    <Badge className={colorClass}>
      {value}
    </Badge>
  );
};

// Multi-select cell renderer for tags
const TagsCellRenderer = (props: ICellRendererParams) => {
  const tags = props.value || [];

  return (
    <div className="flex gap-1 flex-wrap">
      {tags.map((tag: string, idx: number) => (
        <Badge key={idx} variant="outline" className="text-xs">
          {tag}
        </Badge>
      ))}
    </div>
  );
};

// Team roster cell renderer
const TeamRosterCellRenderer = (props: ICellRendererParams) => {
  const assignments = props.data.project_assignments || [];
  const allUsers = props.colDef.cellRendererParams?.allUsers || [];
  const assignedUsers = allUsers.filter((u: User) =>
    assignments.some((a: any) => a.user_id === u.id)
  );

  return (
    <div className="flex gap-1 flex-wrap">
      {assignedUsers.map((user: User) => (
        <Badge key={user.id} variant="secondary" className="text-xs">
          {user.name}
        </Badge>
      ))}
    </div>
  );
};

// Project reference cell renderer
const ProjectReferenceCellRenderer = (props: ICellRendererParams) => {
  const projectIds = props.value || [];
  const allProjects = props.colDef.cellRendererParams?.allProjects || [];
  const projectTitles = projectIds.map((id: string) => {
    const p = allProjects.find((proj: Project) => proj.id === id);
    return p?.title || id;
  });

  return (
    <div className="flex gap-1 flex-wrap">
      {projectTitles.map((title: string, idx: number) => (
        <Badge key={idx} variant="secondary" className="text-xs">
          {title}
        </Badge>
      ))}
    </div>
  );
};

// Date cell renderer
const DateCellRenderer = (props: ICellRendererParams) => {
  const { value } = props;
  if (!value) return <span className="text-gray-400">-</span>;
  return <span>{new Date(value).toLocaleDateString()}</span>;
};

// Attachments cell renderer
const AttachmentsCellRenderer = (props: ICellRendererParams) => {
  const count = props.data.documents?.length || 0;
  return (
    <span className="text-sm text-gray-600">
      {count > 0 ? `${count} file${count > 1 ? 's' : ''}` : '-'}
    </span>
  );
};

export function AGGridProjectsTable({ projects, onUpdate }: AGGridProjectsTableProps) {
  const [rowData, setRowData] = useState<Project[]>(projects);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [quickFilter, setQuickFilter] = useState("");

  useEffect(() => {
    setRowData(projects);
  }, [projects]);

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

  const onCellValueChanged = useCallback((event: any) => {
    const { data, colDef, newValue } = event;
    const field = colDef.field;

    if (onUpdate && field) {
      onUpdate(data.id, field, newValue);
    }
  }, [onUpdate]);

  const onRowDragEnd = useCallback((event: any) => {
    // This will be called when a row is dropped after dragging
    console.log('Row drag ended', event);
  }, []);

  const columnDefs = useMemo<ColDef[]>(() => [
    {
      field: "title",
      headerName: "Title",
      width: 250,
      editable: true,
      resizable: true,
      sortable: true,
      filter: true,
      rowDrag: true,
    },
    {
      field: "status",
      headerName: "Status",
      width: 150,
      editable: true,
      resizable: true,
      sortable: true,
      filter: true,
      enableRowGroup: true,
      cellRenderer: BadgeCellRenderer,
      cellRendererParams: { colorMap: statusColors },
      cellEditor: "agSelectCellEditor",
      cellEditorParams: {
        values: STATUS_OPTIONS,
      },
    },
    {
      field: "priority",
      headerName: "Priority",
      width: 120,
      editable: true,
      resizable: true,
      sortable: true,
      filter: true,
      enableRowGroup: true,
      cellRenderer: BadgeCellRenderer,
      cellRendererParams: { colorMap: priorityColors },
      cellEditor: "agSelectCellEditor",
      cellEditorParams: {
        values: PRIORITY_OPTIONS,
      },
    },
    {
      field: "task_progress",
      headerName: "Task Progress",
      width: 150,
      editable: true,
      resizable: true,
      sortable: true,
      filter: true,
      enableRowGroup: true,
      cellRenderer: BadgeCellRenderer,
      cellRendererParams: { colorMap: statusColors },
      cellEditor: "agSelectCellEditor",
      cellEditorParams: {
        values: TASK_PROGRESS_OPTIONS,
      },
    },
    {
      field: "team_roster",
      headerName: "Team Roster",
      width: 200,
      resizable: true,
      cellRenderer: TeamRosterCellRenderer,
      cellRendererParams: { allUsers },
      editable: false, // We'll make this editable with a custom editor later
    },
    {
      field: "location",
      headerName: "Location",
      width: 180,
      editable: true,
      resizable: true,
      sortable: true,
      filter: true,
      enableRowGroup: true,
    },
    {
      field: "project_area",
      headerName: "Project Area",
      width: 180,
      editable: true,
      resizable: true,
      sortable: true,
      filter: true,
      enableRowGroup: true,
    },
    {
      field: "description",
      headerName: "Details",
      width: 300,
      editable: true,
      resizable: true,
      sortable: true,
      filter: true,
      cellEditor: "agLargeTextCellEditor",
      cellEditorParams: {
        maxLength: 1000,
        rows: 5,
        cols: 50,
      },
    },
    {
      field: "tags",
      headerName: "Tags",
      width: 200,
      resizable: true,
      cellRenderer: TagsCellRenderer,
      editable: false, // Custom editor needed for multi-select
    },
    {
      field: "start_date",
      headerName: "Start Date",
      width: 150,
      editable: true,
      resizable: true,
      sortable: true,
      filter: "agDateColumnFilter",
      cellRenderer: DateCellRenderer,
      cellEditor: "agDateStringCellEditor",
    },
    {
      field: "due_date",
      headerName: "Due Date",
      width: 150,
      editable: true,
      resizable: true,
      sortable: true,
      filter: "agDateColumnFilter",
      cellRenderer: DateCellRenderer,
      cellEditor: "agDateStringCellEditor",
    },
    {
      field: "blocked_by",
      headerName: "Blocked By",
      width: 180,
      resizable: true,
      cellRenderer: ProjectReferenceCellRenderer,
      cellRendererParams: { allProjects: rowData },
      editable: false, // Custom editor needed
    },
    {
      field: "blocking",
      headerName: "Blocking",
      width: 180,
      resizable: true,
      cellRenderer: ProjectReferenceCellRenderer,
      cellRendererParams: { allProjects: rowData },
      editable: false, // Custom editor needed
    },
    {
      field: "attachments",
      headerName: "Attachments",
      width: 120,
      resizable: true,
      cellRenderer: AttachmentsCellRenderer,
      editable: false,
    },
  ], [rowData, allUsers]);

  const defaultColDef = useMemo<ColDef>(() => ({
    sortable: true,
    filter: true,
    resizable: true,
    editable: false,
  }), []);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search projects..."
            value={quickFilter}
            onChange={(e) => setQuickFilter(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="ag-theme-alpine" style={{ height: 600, width: '100%' }}>
        <AgGridReact
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          quickFilterText={quickFilter}
          onCellValueChanged={onCellValueChanged}
          animateRows={true}
          rowSelection="multiple"
          suppressRowClickSelection={true}
          enableCellTextSelection={true}
          ensureDomOrder={true}
          theme="legacy"
          // Enterprise features
          rowGroupPanelShow="always"
          groupDisplayType="singleColumn"
          rowDragManaged={true}
          onRowDragEnd={onRowDragEnd}
        />
      </div>

      <div className="text-sm text-gray-500">
        {rowData.length} project(s)
      </div>
    </div>
  );
}
