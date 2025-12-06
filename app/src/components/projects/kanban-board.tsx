"use client";

import { useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Project } from "@/types/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface KanbanBoardProps {
  projects: Project[];
  onProjectMove?: (projectId: string, newStatus: string) => void;
}

const STATUS_COLUMNS = [
  { id: "Not Started", title: "Not Started", color: "bg-gray-100" },
  { id: "In Progress", title: "In Progress", color: "bg-blue-100" },
  { id: "On Hold", title: "On Hold", color: "bg-yellow-100" },
  { id: "Completed", title: "Completed", color: "bg-green-100" },
];

const priorityColors: Record<string, string> = {
  "P1": "bg-red-100 text-red-800",
  "P2": "bg-orange-100 text-orange-800",
  "P3": "bg-yellow-100 text-yellow-800",
  "P4": "bg-blue-100 text-blue-800",
};

export function KanbanBoard({ projects, onProjectMove }: KanbanBoardProps) {
  const [columns, setColumns] = useState(() => {
    const columnMap = new Map<string, Project[]>();

    STATUS_COLUMNS.forEach(col => {
      columnMap.set(col.id, []);
    });

    projects.forEach(project => {
      const status = project.task_progress || "Not Started";
      const column = columnMap.get(status);
      if (column) {
        column.push(project);
      } else {
        const notStartedColumn = columnMap.get("Not Started");
        if (notStartedColumn) {
          notStartedColumn.push(project);
        }
      }
    });

    return columnMap;
  });

  const handleDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    const newColumns = new Map(columns);
    const sourceColumn = newColumns.get(source.droppableId);
    const destColumn = newColumns.get(destination.droppableId);

    if (!sourceColumn || !destColumn) return;

    const sourceItems = Array.from(sourceColumn);
    const destItems = source.droppableId === destination.droppableId
      ? sourceItems
      : Array.from(destColumn);

    const [movedProject] = sourceItems.splice(source.index, 1);

    if (source.droppableId === destination.droppableId) {
      sourceItems.splice(destination.index, 0, movedProject);
      newColumns.set(source.droppableId, sourceItems);
    } else {
      destItems.splice(destination.index, 0, movedProject);
      newColumns.set(source.droppableId, sourceItems);
      newColumns.set(destination.droppableId, destItems);

      onProjectMove?.(draggableId, destination.droppableId);
    }

    setColumns(newColumns);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {STATUS_COLUMNS.map(column => {
          const columnProjects = columns.get(column.id) || [];

          return (
            <div key={column.id} className="flex flex-col h-[calc(100vh-16rem)]">
              <div className="mb-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-gray-700">
                    {column.title}
                  </h3>
                  <Badge variant="outline" className="text-xs">
                    {columnProjects.length}
                  </Badge>
                </div>
                <div className={`h-1 ${column.color} rounded-full mt-2`} />
              </div>

              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 overflow-hidden rounded-lg ${
                      snapshot.isDraggingOver
                        ? "bg-gray-100"
                        : "bg-gray-50"
                    }`}
                  >
                    <ScrollArea className="h-full p-2">
                      <div className="space-y-2">
                        {columnProjects.map((project, index) => (
                          <Draggable
                            key={project.id}
                            draggableId={project.id}
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <Card
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`cursor-move ${
                                  snapshot.isDragging
                                    ? "shadow-lg opacity-90"
                                    : "shadow-sm"
                                }`}
                              >
                                <CardHeader className="p-4">
                                  <CardTitle className="text-sm font-medium line-clamp-2">
                                    {project.title || "Untitled"}
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="p-4 pt-0 space-y-2">
                                  {project.description && (
                                    <p className="text-xs text-gray-500 line-clamp-2">
                                      {project.description}
                                    </p>
                                  )}

                                  <div className="flex items-center justify-between">
                                    {project.priority && (
                                      <Badge
                                        className={`text-xs ${
                                          priorityColors[project.priority] ||
                                          "bg-gray-100 text-gray-800"
                                        }`}
                                      >
                                        {project.priority}
                                      </Badge>
                                    )}

                                    {project.progress > 0 && (
                                      <span className="text-xs text-gray-500">
                                        {project.progress}%
                                      </span>
                                    )}
                                  </div>

                                  {project.location && (
                                    <div className="text-xs text-gray-500">
                                      {project.location}
                                    </div>
                                  )}

                                  {project.tags && project.tags.length > 0 && (
                                    <div className="flex gap-1 flex-wrap">
                                      {project.tags.slice(0, 2).map((tag, idx) => (
                                        <Badge
                                          key={idx}
                                          variant="outline"
                                          className="text-xs"
                                        >
                                          {tag}
                                        </Badge>
                                      ))}
                                      {project.tags.length > 2 && (
                                        <Badge variant="outline" className="text-xs">
                                          +{project.tags.length - 2}
                                        </Badge>
                                      )}
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
