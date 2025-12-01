"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Project, User } from "@/types/database";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, GripVertical, Plus } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, horizontalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface EditableProjectsTableProps {
  projects: Project[];
  onUpdate?: (projectId: string, field: string, value: any) => Promise<void>;
}

interface ColumnDef {
  id: string;
  label: string;
  type: "text" | "select" | "multiselect" | "number" | "date" | "progress";
  options?: string[];
  width: number;
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

function SortableHeader({ column, isResizing, onResize }: { column: ColumnDef; isResizing: boolean; onResize: (e: React.MouseEvent) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: column.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <th
      ref={setNodeRef}
      style={{ ...style, width: column.width }}
      className="relative border-r border-gray-200 bg-gray-50 px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider select-none"
    >
      <div className="flex items-center gap-2">
        <div {...attributes} {...listeners} className="cursor-move">
          <GripVertical className="h-4 w-4 text-gray-400" />
        </div>
        <span className="flex-1">{column.label}</span>
      </div>
      <div
        className="absolute right-0 top-0 h-full w-2 cursor-col-resize hover:bg-blue-500 z-10"
        onMouseDown={(e) => {
          e.stopPropagation();
          onResize(e);
        }}
        style={{ backgroundColor: isResizing ? "#3b82f6" : "transparent" }}
      />
    </th>
  );
}

export function EditableProjectsTable({ projects, onUpdate }: EditableProjectsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [localProjects, setLocalProjects] = useState<Project[]>(projects);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [columnOrder, setColumnOrder] = useState<string[]>([
    "title", "status", "priority", "task_progress", "team_roster", "location", "project_area", "description",
    "tags", "start_date", "due_date", "blocked_by", "blocking", "attachments"
  ]);

  const [columns, setColumns] = useState<Record<string, ColumnDef>>({
    title: { id: "title", label: "Title", type: "text", width: 250 },
    status: { id: "status", label: "Status", type: "select", options: STATUS_OPTIONS, width: 150 },
    priority: { id: "priority", label: "Priority", type: "select", options: PRIORITY_OPTIONS, width: 120 },
    task_progress: { id: "task_progress", label: "Task Progress", type: "select", options: TASK_PROGRESS_OPTIONS, width: 150 },
    team_roster: { id: "team_roster", label: "Team Roster", type: "multiselect", width: 200 },
    location: { id: "location", label: "Location", type: "text", width: 180 },
    project_area: { id: "project_area", label: "Project Area", type: "text", width: 180 },
    description: { id: "description", label: "Details", type: "text", width: 300 },
    tags: { id: "tags", label: "Tags", type: "multiselect", width: 200 },
    start_date: { id: "start_date", label: "Start Date", type: "date", width: 150 },
    due_date: { id: "due_date", label: "Due Date", type: "date", width: 150 },
    blocked_by: { id: "blocked_by", label: "Blocked By", type: "multiselect", width: 180 },
    blocking: { id: "blocking", label: "Blocking", type: "multiselect", width: 180 },
    attachments: { id: "attachments", label: "Attachments", type: "text", width: 180 },
  });

  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const [selectOptions, setSelectOptions] = useState<Record<string, string[]>>({
    status: STATUS_OPTIONS,
    priority: PRIORITY_OPTIONS,
    task_progress: TASK_PROGRESS_OPTIONS,
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    setLocalProjects(projects);
  }, [projects]);

  useEffect(() => {
    // Fetch all users for team roster selection
    async function fetchUsers() {
      try {
        const response = await fetch('/api/users');
        const data = await response.json();
        setAllUsers(data.users || []);
      } catch (error) {
        console.error('Failed to fetch users:', error);
      }
    }
    fetchUsers();
  }, []);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setColumnOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        const newOrder = [...items];
        const [removed] = newOrder.splice(oldIndex, 1);
        newOrder.splice(newIndex, 0, removed);
        return newOrder;
      });
    }
  };

  const handleResize = useCallback((columnId: string, e: React.MouseEvent) => {
    e.preventDefault();
    setResizingColumn(columnId);
    const startX = e.pageX;
    const startWidth = columns[columnId].width;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const diff = moveEvent.pageX - startX;
      const newWidth = Math.max(80, startWidth + diff);
      setColumns(prev => ({
        ...prev,
        [columnId]: { ...prev[columnId], width: newWidth }
      }));
    };

    const handleMouseUp = () => {
      setResizingColumn(null);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [columns]);

  const handleCellUpdate = async (projectId: string, field: string, value: any) => {
    setLocalProjects(prev =>
      prev.map(p => p.id === projectId ? { ...p, [field]: value } : p)
    );

    if (onUpdate) {
      await onUpdate(projectId, field, value);
    }
  };

  const handleAddOption = (field: string, newOption: string) => {
    setSelectOptions(prev => ({
      ...prev,
      [field]: [...(prev[field] || []), newOption],
    }));
  };

  const filteredProjects = localProjects.filter(project =>
    Object.values(project).some(value =>
      String(value).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const renderCell = (project: Project, columnId: string) => {
    const column = columns[columnId];
    const value = project[columnId as keyof Project];

    // Special handling for team_roster - show user names
    if (columnId === "team_roster") {
      const assignedUserIds = project.project_assignments?.map(a => a.user_id) || [];
      const assignedUsers = allUsers.filter(u => assignedUserIds.includes(u.id));

      return (
        <TeamRosterCell
          projectId={project.id}
          assignedUsers={assignedUsers}
          allUsers={allUsers}
          onRefresh={() => {
            // Trigger parent to refetch projects
            window.location.reload();
          }}
        />
      );
    }

    // Special handling for blocked_by and blocking - show project titles
    if (columnId === "blocked_by" || columnId === "blocking") {
      const projectIds = (value as string[]) || [];
      const projectTitles = projectIds.map(id => {
        const p = localProjects.find(proj => proj.id === id);
        return p?.title || id;
      });

      return (
        <ProjectReferenceCell
          projectIds={projectIds}
          projectTitles={projectTitles}
          allProjects={localProjects}
          currentProjectId={project.id}
          onChange={(newIds) => handleCellUpdate(project.id, columnId, newIds)}
        />
      );
    }

    // Special handling for attachments - show document count
    if (columnId === "attachments") {
      const docCount = project.documents?.length || 0;
      return (
        <div className="px-2 py-1 text-sm text-gray-600">
          {docCount > 0 ? `${docCount} file${docCount > 1 ? 's' : ''}` : 'No files'}
        </div>
      );
    }

    switch (column.type) {
      case "select":
        return (
          <SelectCell
            value={value as string}
            options={selectOptions[columnId] || column.options || []}
            onChange={(newValue) => handleCellUpdate(project.id, columnId, newValue)}
            onAddOption={(newOption) => handleAddOption(columnId, newOption)}
            colorMap={columnId === "status" ? statusColors : columnId === "priority" ? priorityColors : undefined}
          />
        );

      case "multiselect":
        return (
          <MultiSelectCell
            value={(value as string[]) || []}
            onChange={(newValue) => handleCellUpdate(project.id, columnId, newValue)}
          />
        );

      case "progress":
        return (
          <ProgressCell
            value={(value as number) || 0}
            onChange={(newValue) => handleCellUpdate(project.id, columnId, newValue)}
          />
        );

      case "date":
        return (
          <DateCell
            value={value as string}
            onChange={(newValue) => handleCellUpdate(project.id, columnId, newValue)}
          />
        );

      default:
        return (
          <TextCell
            value={value as string}
            onChange={(newValue) => handleCellUpdate(project.id, columnId, newValue)}
          />
        );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="rounded-lg border border-gray-200 bg-white overflow-auto">
          <table className="w-full border-collapse">
            <thead>
              <SortableContext items={columnOrder} strategy={horizontalListSortingStrategy}>
                <tr>
                  {columnOrder.map((columnId) => (
                    <SortableHeader
                      key={columnId}
                      column={columns[columnId]}
                      isResizing={resizingColumn === columnId}
                      onResize={(e) => handleResize(columnId, e)}
                    />
                  ))}
                </tr>
              </SortableContext>
            </thead>
          <tbody>
            {filteredProjects.map((project) => (
              <tr key={project.id} className="border-t border-gray-200 hover:bg-gray-50">
                {columnOrder.map((columnId) => (
                  <td
                    key={columnId}
                    className="border-r border-gray-200 px-3 py-2"
                    style={{ width: columns[columnId].width }}
                  >
                    {renderCell(project, columnId)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

        <div className="text-sm text-gray-500">
          {filteredProjects.length} project(s)
        </div>
      </DndContext>
    </div>
  );
}

// Cell components
function TextCell({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || "");

  const handleBlur = () => {
    setIsEditing(false);
    if (editValue !== value) {
      onChange(editValue);
    }
  };

  if (isEditing) {
    return (
      <Input
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={(e) => e.key === "Enter" && handleBlur()}
        autoFocus
        className="h-8 text-sm"
      />
    );
  }

  return (
    <div onClick={() => setIsEditing(true)} className="cursor-pointer min-h-[32px] flex items-center text-sm">
      {value || <span className="text-gray-400">Click to edit</span>}
    </div>
  );
}

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

function ProgressCell({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value?.toString() || "0");

  const handleBlur = () => {
    setIsEditing(false);
    const numValue = Math.min(100, Math.max(0, parseInt(editValue) || 0));
    onChange(numValue);
    setEditValue(numValue.toString());
  };

  if (isEditing) {
    return (
      <Input
        type="number"
        min="0"
        max="100"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={(e) => e.key === "Enter" && handleBlur()}
        className="h-8 w-16 text-sm"
        autoFocus
      />
    );
  }

  return (
    <div onClick={() => setIsEditing(true)} className="cursor-pointer flex items-center gap-2">
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 transition-all"
          style={{ width: `${value || 0}%` }}
        />
      </div>
      <span className="text-xs text-gray-600 min-w-[32px]">{value || 0}%</span>
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

      // Refresh the page to get updated data
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
