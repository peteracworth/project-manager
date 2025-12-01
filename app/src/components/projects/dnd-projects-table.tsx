"use client";

import { useMemo, useState, useEffect, useCallback, memo, useRef } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
  ColumnResizeMode,
} from "@tanstack/react-table";
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Project, User } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Plus, GripVertical } from "lucide-react";

// Constants for select options
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

interface DndProjectsTableProps {
  projects: Project[];
  onUpdate?: (projectId: string, field: string, value: any) => Promise<void>;
}

export function DndProjectsTable({ projects, onUpdate }: DndProjectsTableProps) {
  const [data, setData] = useState<Project[]>(projects);
  const dataRef = useRef<Project[]>(data);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [globalFilter, setGlobalFilter] = useState("");
  const [groupByColumn, setGroupByColumn] = useState<string>("none");
  const [columnResizeMode] = useState<ColumnResizeMode>("onEnd");
  const [isDragging, setIsDragging] = useState(false);
  const [selectOptions, setSelectOptions] = useState<Record<string, string[]>>({
    status: STATUS_OPTIONS,
    priority: PRIORITY_OPTIONS,
    task_progress: TASK_PROGRESS_OPTIONS,
  });

  useEffect(() => {
    setData(projects);
    dataRef.current = projects;
  }, [projects]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setGlobalFilter(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

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

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleAddOption = (field: string, newOption: string) => {
    setSelectOptions(prev => ({
      ...prev,
      [field]: [...(prev[field] || []), newOption],
    }));
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setIsDragging(false);
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const activeProject = data.find(p => p.id === active.id);
    const overProject = data.find(p => p.id === over.id);

    if (!activeProject || !overProject) return;

    // If we're grouping and dragging between groups, update the grouping field
    if (groupByColumn !== "none") {
      const activeGroup = (activeProject as any)[groupByColumn];
      const overGroup = (overProject as any)[groupByColumn];

      if (activeGroup !== overGroup) {
        // Optimistically update local state first
        setData((items) => items.map(p =>
          p.id === activeProject.id ? { ...p, [groupByColumn]: overGroup } : p
        ));

        // Then update the database in background
        onUpdate?.(activeProject.id, groupByColumn, overGroup);
      }
    }

    // Reorder the data
    setData((items) => {
      const oldIndex = items.findIndex(p => p.id === active.id);
      const newIndex = items.findIndex(p => p.id === over.id);
      return arrayMove(items, oldIndex, newIndex);
    });
  }, [data, groupByColumn, onUpdate]);

  // Optimistic update handler
  const handleOptimisticUpdate = useCallback((projectId: string, field: string, value: any) => {
    // Update local state immediately
    setData((items) => {
      const updated = items.map(p =>
        p.id === projectId ? { ...p, [field]: value } : p
      );
      dataRef.current = updated;
      return updated;
    });

    // Update database in background
    onUpdate?.(projectId, field, value);
  }, [onUpdate]);

  const columns = useMemo<ColumnDef<Project>[]>(
    () => [
      {
        accessorKey: "title",
        header: "Title",
        size: 250,
        cell: ({ getValue, row }) => (
          <EditableCell
            value={getValue() as string}
            onChange={(newValue) => handleOptimisticUpdate(row.original.id, "title", newValue)}
          />
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        size: 150,
        cell: ({ getValue, row }) => (
          <SelectCell
            value={getValue() as string}
            options={selectOptions.status}
            onChange={(newValue) => handleOptimisticUpdate(row.original.id, "status", newValue)}
            onAddOption={(newOption) => handleAddOption("status", newOption)}
            colorMap={statusColors}
          />
        ),
      },
      {
        accessorKey: "priority",
        header: "Priority",
        size: 120,
        cell: ({ getValue, row }) => (
          <SelectCell
            value={getValue() as string}
            options={selectOptions.priority}
            onChange={(newValue) => handleOptimisticUpdate(row.original.id, "priority", newValue)}
            onAddOption={(newOption) => handleAddOption("priority", newOption)}
            colorMap={priorityColors}
          />
        ),
      },
      {
        accessorKey: "task_progress",
        header: "Task Progress",
        size: 150,
        cell: ({ getValue, row }) => (
          <SelectCell
            value={getValue() as string}
            options={selectOptions.task_progress}
            onChange={(newValue) => handleOptimisticUpdate(row.original.id, "task_progress", newValue)}
            onAddOption={(newOption) => handleAddOption("task_progress", newOption)}
            colorMap={statusColors}
          />
        ),
      },
      {
        id: "team_roster",
        header: "Team Roster",
        size: 200,
        cell: ({ row }) => {
          const assignments = row.original.project_assignments || [];
          const assignedUsers = allUsers.filter(u =>
            assignments.some(a => a.user_id === u.id)
          );
          return (
            <TeamRosterCell
              projectId={row.original.id}
              assignedUsers={assignedUsers}
              allUsers={allUsers}
              onRefresh={handleRefresh}
            />
          );
        },
      },
      {
        accessorKey: "location",
        header: "Location",
        size: 180,
        cell: ({ getValue, row }) => (
          <EditableCell
            value={getValue() as string}
            onChange={(newValue) => handleOptimisticUpdate(row.original.id, "location", newValue)}
          />
        ),
      },
      {
        accessorKey: "project_area",
        header: "Project Area",
        size: 180,
        cell: ({ getValue, row }) => (
          <EditableCell
            value={getValue() as string}
            onChange={(newValue) => handleOptimisticUpdate(row.original.id, "project_area", newValue)}
          />
        ),
      },
      {
        accessorKey: "description",
        header: "Details",
        size: 300,
        cell: ({ getValue, row }) => (
          <EditableCell
            value={getValue() as string}
            onChange={(newValue) => handleOptimisticUpdate(row.original.id, "description", newValue)}
          />
        ),
      },
      {
        accessorKey: "tags",
        header: "Tags",
        size: 200,
        cell: ({ getValue, row }) => (
          <MultiSelectCell
            value={(getValue() as string[]) || []}
            onChange={(newValue) => handleOptimisticUpdate(row.original.id, "tags", newValue)}
          />
        ),
      },
      {
        accessorKey: "start_date",
        header: "Start Date",
        size: 150,
        cell: ({ getValue, row }) => (
          <DateCell
            value={getValue() as string}
            onChange={(newValue) => handleOptimisticUpdate(row.original.id, "start_date", newValue)}
          />
        ),
      },
      {
        accessorKey: "due_date",
        header: "Due Date",
        size: 150,
        cell: ({ getValue, row }) => (
          <DateCell
            value={getValue() as string}
            onChange={(newValue) => handleOptimisticUpdate(row.original.id, "due_date", newValue)}
          />
        ),
      },
      {
        accessorKey: "blocked_by",
        header: "Blocked By",
        size: 180,
        cell: ({ getValue, row }) => {
          const projectIds = (getValue() as string[]) || [];
          const projectTitles = projectIds.map(id => {
            const p = dataRef.current.find(proj => proj.id === id);
            return p?.title || id;
          });
          return (
            <ProjectReferenceCell
              projectIds={projectIds}
              projectTitles={projectTitles}
              allProjects={dataRef.current}
              currentProjectId={row.original.id}
              onChange={(newIds) => handleOptimisticUpdate(row.original.id, "blocked_by", newIds)}
            />
          );
        },
      },
      {
        accessorKey: "blocking",
        header: "Blocking",
        size: 180,
        cell: ({ getValue, row }) => {
          const projectIds = (getValue() as string[]) || [];
          const projectTitles = projectIds.map(id => {
            const p = dataRef.current.find(proj => proj.id === id);
            return p?.title || id;
          });
          return (
            <ProjectReferenceCell
              projectIds={projectIds}
              projectTitles={projectTitles}
              allProjects={dataRef.current}
              currentProjectId={row.original.id}
              onChange={(newIds) => handleOptimisticUpdate(row.original.id, "blocking", newIds)}
            />
          );
        },
      },
      {
        id: "attachments",
        header: "Attachments",
        size: 120,
        cell: ({ row }) => {
          const count = row.original.documents?.length || 0;
          return (
            <span className="text-sm text-gray-600">
              {count > 0 ? `${count} file${count > 1 ? 's' : ''}` : '-'}
            </span>
          );
        },
      },
    ],
    [allUsers, handleOptimisticUpdate, selectOptions, handleRefresh]
  );

  // Filter data for display (apply global filter manually for better performance)
  const filteredData = useMemo(() => {
    if (!globalFilter) return data;

    const lowerFilter = globalFilter.toLowerCase();
    return data.filter(project =>
      project.title?.toLowerCase().includes(lowerFilter) ||
      project.status?.toLowerCase().includes(lowerFilter) ||
      project.priority?.toLowerCase().includes(lowerFilter) ||
      project.description?.toLowerCase().includes(lowerFilter) ||
      project.location?.toLowerCase().includes(lowerFilter) ||
      project.project_area?.toLowerCase().includes(lowerFilter)
    );
  }, [data, globalFilter]);

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    columnResizeMode,
    enableColumnResizing: true,
  });

  const isAnyColumnResizing = table.getState().columnSizingInfo.isResizingColumn;

  // Group data if grouping is enabled
  const groupedData = useMemo(() => {
    if (groupByColumn === "none") {
      return { "All Projects": filteredData };
    }

    const groups: Record<string, Project[]> = {};
    filteredData.forEach(project => {
      const groupValue = (project as any)[groupByColumn] || "(Empty)";
      if (!groups[groupValue]) {
        groups[groupValue] = [];
      }
      groups[groupValue].push(project);
    });

    return groups;
  }, [filteredData, groupByColumn]);

  const groupableColumns = [
    { value: "none", label: "No Grouping" },
    { value: "status", label: "Status" },
    { value: "priority", label: "Priority" },
    { value: "task_progress", label: "Task Progress" },
    { value: "location", label: "Location" },
    { value: "project_area", label: "Project Area" },
  ];

  return (
    <div className="space-y-4" style={{ userSelect: isAnyColumnResizing ? 'none' : undefined }}>
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search projects..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
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

      {Object.entries(groupedData).map(([groupName, groupProjects]) => (
        <VirtualizedTable
          key={groupName}
          groupName={groupName}
          groupProjects={groupProjects}
          showGroupHeader={groupByColumn !== "none"}
          table={table}
          sensors={sensors}
          handleDragStart={handleDragStart}
          handleDragEnd={handleDragEnd}
        />
      ))}

      <div className="text-sm text-gray-500">
        {data.length} project(s) total
        {groupByColumn !== "none" && ` in ${Object.keys(groupedData).length} group(s)`}
      </div>
    </div>
  );
}

// Virtualized table component with virtual scrolling
const VirtualizedTable = memo(function VirtualizedTable({
  groupName,
  groupProjects,
  showGroupHeader,
  table,
  sensors,
  handleDragStart,
  handleDragEnd,
}: {
  groupName: string;
  groupProjects: Project[];
  showGroupHeader: boolean;
  table: any;
  sensors: any;
  handleDragStart: () => void;
  handleDragEnd: (event: DragEndEvent) => void;
}) {
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: groupProjects.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 48, // Estimate row height in pixels
    overscan: 5, // Render 5 extra rows above and below viewport
  });

  return (
    <div className="space-y-2">
      {showGroupHeader && (
        <div className="bg-gray-100 px-4 py-2 rounded-md">
          <h3 className="font-semibold text-gray-700">
            {groupName} ({groupProjects.length})
          </h3>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div
          ref={tableContainerRef}
          className="rounded-lg border border-gray-200 bg-white overflow-auto"
          style={{ height: '600px' }}
        >
          <table className="w-full border-collapse" style={{ width: table.getTotalSize() }}>
            <thead className="bg-gray-50 sticky top-0 z-10">
              {table.getHeaderGroups().map((headerGroup: any) => (
                <tr key={headerGroup.id}>
                  <th className="w-10 border-r border-b border-gray-200 px-2 py-3 bg-gray-50">
                    <GripVertical className="h-4 w-4 text-gray-400" />
                  </th>
                  {headerGroup.headers.map((header: any) => (
                    <th
                      key={header.id}
                      className="relative border-r border-b border-gray-200 px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider bg-gray-50"
                      style={{ width: header.getSize() }}
                    >
                      <div className="flex items-center gap-2">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </div>
                      <div
                        onMouseDown={header.getResizeHandler()}
                        onTouchStart={header.getResizeHandler()}
                        className={`absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none transition-colors ${
                          header.column.getIsResizing() ? 'bg-blue-500 w-0.5' : 'hover:bg-gray-400'
                        }`}
                        style={{
                          transform: header.column.getIsResizing() ? 'scaleX(2)' : undefined,
                        }}
                      />
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
              <SortableContext
                items={groupProjects.map(p => p.id)}
                strategy={verticalListSortingStrategy}
              >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const project = groupProjects[virtualRow.index];
                  return (
                    <DraggableRow
                      key={project.id}
                      project={project}
                      table={table}
                      virtualRow={virtualRow}
                    />
                  );
                })}
              </SortableContext>
            </tbody>
          </table>
        </div>
      </DndContext>
    </div>
  );
});

// Draggable row component - memoized for performance
const DraggableRow = memo(function DraggableRow({
  project,
  table,
  virtualRow,
}: {
  project: Project;
  table: any;
  virtualRow?: any;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id });

  const row = table.getRowModel().rows.find((r: any) => r.original.id === project.id);

  if (!row) return null;

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    ...(virtualRow && {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      transform: `translateY(${virtualRow.start}px)`,
    }),
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className="border-b border-gray-200 hover:bg-gray-50"
    >
      <td className="border-r border-gray-200 px-2 py-2">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="h-4 w-4 text-gray-400" />
        </div>
      </td>
      {row.getVisibleCells().map((cell: any) => (
        <td
          key={cell.id}
          className="border-r border-gray-200 px-3 py-2"
          style={{ width: cell.column.getSize() }}
        >
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </td>
      ))}
    </tr>
  );
});

// Cell components (reused from FastProjectsTable) - Memoized for performance
const EditableCell = memo(function EditableCell({
  value,
  onChange
}: {
  value: string;
  onChange: (value: string) => void
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || "");

  const handleSave = useCallback(() => {
    setIsEditing(false);
    if (editValue !== value) {
      onChange(editValue);
    }
  }, [editValue, value, onChange]);

  if (isEditing) {
    return (
      <Input
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => e.key === "Enter" && handleSave()}
        className="h-8 text-sm"
        autoFocus
      />
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className="cursor-pointer min-h-[32px] flex items-center text-sm"
    >
      {value || <span className="text-gray-400">Click to edit</span>}
    </div>
  );
});

function SelectCell({
  value,
  options,
  onChange,
  onAddOption,
  colorMap,
}: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  onAddOption: (value: string) => void;
  colorMap?: Record<string, string>;
}) {
  const [showAddOption, setShowAddOption] = useState(false);
  const [newOption, setNewOption] = useState("");

  const handleAddNewOption = () => {
    if (newOption.trim()) {
      onAddOption(newOption.trim());
      onChange(newOption.trim());
      setNewOption("");
      setShowAddOption(false);
    }
  };

  return (
    <Select value={value || ""} onValueChange={onChange}>
      <SelectTrigger className="h-8 text-sm border-none shadow-none">
        <SelectValue>
          {value && colorMap ? (
            <Badge className={colorMap[value] || "bg-gray-100 text-gray-800"}>
              {value}
            </Badge>
          ) : (
            value || "Select..."
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {colorMap ? (
              <Badge className={colorMap[option] || "bg-gray-100 text-gray-800"}>
                {option}
              </Badge>
            ) : (
              option
            )}
          </SelectItem>
        ))}
        <div className="border-t mt-1 pt-1">
          {!showAddOption ? (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-xs"
              onClick={() => setShowAddOption(true)}
            >
              <Plus className="h-3 w-3 mr-1" />
              Add option
            </Button>
          ) : (
            <div className="flex gap-1 p-1">
              <Input
                value={newOption}
                onChange={(e) => setNewOption(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddNewOption()}
                placeholder="New option"
                className="h-7 text-xs"
                autoFocus
              />
              <Button size="sm" onClick={handleAddNewOption} className="h-7 px-2">
                Add
              </Button>
            </div>
          )}
        </div>
      </SelectContent>
    </Select>
  );
}

function MultiSelectCell({ value, onChange }: { value: string[]; onChange: (value: string[]) => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [newTag, setNewTag] = useState("");

  const addTag = () => {
    if (newTag.trim() && !value.includes(newTag.trim())) {
      onChange([...value, newTag.trim()]);
      setNewTag("");
    }
  };

  const removeTag = (tag: string) => {
    onChange(value.filter(t => t !== tag));
  };

  return (
    <div className="flex flex-wrap gap-1 items-center min-h-[32px]">
      {value?.map((tag, idx) => (
        <Badge key={idx} variant="outline" className="text-xs">
          {tag}
          <button
            onClick={() => removeTag(tag)}
            className="ml-1 hover:text-red-600"
          >
            ×
          </button>
        </Badge>
      ))}
      {isEditing ? (
        <Input
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onBlur={() => { addTag(); setIsEditing(false); }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              addTag();
              setIsEditing(false);
            }
          }}
          placeholder="Add tag"
          className="h-6 w-24 text-xs"
          autoFocus
        />
      ) : (
        <button
          onClick={() => setIsEditing(true)}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          + Add
        </button>
      )}
    </div>
  );
}

function DateCell({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value ? value.split('T')[0] : "");

  const handleBlur = () => {
    setIsEditing(false);
    if (editValue !== value) {
      onChange(editValue);
    }
  };

  const displayValue = value ? new Date(value).toLocaleDateString() : "";

  if (isEditing) {
    return (
      <Input
        type="date"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={(e) => e.key === "Enter" && handleBlur()}
        className="h-8 text-sm"
        autoFocus
      />
    );
  }

  return (
    <div onClick={() => setIsEditing(true)} className="cursor-pointer min-h-[32px] flex items-center text-sm">
      {displayValue || <span className="text-gray-400">Set date</span>}
    </div>
  );
}

function TeamRosterCell({
  projectId,
  assignedUsers,
  allUsers,
  onRefresh,
}: {
  projectId: string;
  assignedUsers: User[];
  allUsers: User[];
  onRefresh: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>(assignedUsers.map(u => u.id));

  const handleToggleUser = (userId: string) => {
    const newIds = selectedIds.includes(userId)
      ? selectedIds.filter(id => id !== userId)
      : [...selectedIds, userId];

    setSelectedIds(newIds);
  };

  const handleSave = async () => {
    setIsEditing(false);

    try {
      const response = await fetch(`/api/projects/${projectId}/assignments`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_ids: selectedIds }),
      });

      if (!response.ok) throw new Error('Failed to update team roster');

      onRefresh();
    } catch (error) {
      console.error('Failed to update team roster:', error);
    }
  };

  if (isEditing) {
    return (
      <div className="relative">
        <div className="absolute top-0 left-0 z-10 bg-white border border-gray-300 rounded shadow-lg p-2 max-h-60 overflow-y-auto min-w-[200px]">
          {allUsers.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-2 px-2 py-1 hover:bg-gray-100 cursor-pointer rounded"
              onClick={() => handleToggleUser(user.id)}
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(user.id)}
                onChange={() => {}}
                className="h-4 w-4"
              />
              <span className="text-sm">{user.name}</span>
            </div>
          ))}
          <div className="border-t mt-2 pt-2 flex gap-2">
            <Button size="sm" onClick={handleSave}>Save</Button>
            <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div onClick={() => setIsEditing(true)} className="cursor-pointer min-h-[32px] flex items-center gap-1 flex-wrap">
      {assignedUsers.length > 0 ? (
        assignedUsers.map((user) => (
          <Badge key={user.id} variant="secondary" className="text-xs">
            {user.name}
          </Badge>
        ))
      ) : (
        <span className="text-gray-400 text-sm">Assign users</span>
      )}
    </div>
  );
}

function ProjectReferenceCell({
  projectIds,
  projectTitles,
  allProjects,
  currentProjectId,
  onChange,
}: {
  projectIds: string[];
  projectTitles: string[];
  allProjects: Project[];
  currentProjectId: string;
  onChange: (value: string[]) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>(projectIds);

  const availableProjects = allProjects.filter(p => p.id !== currentProjectId);

  const handleToggleProject = (projectId: string) => {
    const newIds = selectedIds.includes(projectId)
      ? selectedIds.filter(id => id !== projectId)
      : [...selectedIds, projectId];

    setSelectedIds(newIds);
  };

  const handleSave = () => {
    setIsEditing(false);
    onChange(selectedIds);
  };

  if (isEditing) {
    return (
      <div className="relative">
        <div className="absolute top-0 left-0 z-10 bg-white border border-gray-300 rounded shadow-lg p-2 max-h-60 overflow-y-auto min-w-[200px]">
          {availableProjects.map((project) => (
            <div
              key={project.id}
              className="flex items-center gap-2 px-2 py-1 hover:bg-gray-100 cursor-pointer rounded"
              onClick={() => handleToggleProject(project.id)}
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(project.id)}
                onChange={() => {}}
                className="h-4 w-4"
              />
              <span className="text-sm">{project.title}</span>
            </div>
          ))}
          <div className="border-t mt-2 pt-2 flex gap-2">
            <Button size="sm" onClick={handleSave}>Save</Button>
            <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div onClick={() => setIsEditing(true)} className="cursor-pointer min-h-[32px] flex items-center gap-1 flex-wrap">
      {projectTitles.length > 0 ? (
        projectTitles.map((title, idx) => (
          <Badge key={idx} variant="secondary" className="text-xs">
            {title}
          </Badge>
        ))
      ) : (
        <span className="text-gray-400 text-sm">Select projects</span>
      )}
    </div>
  );
}
