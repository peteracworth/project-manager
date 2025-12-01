"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { FastProjectsTable } from "@/components/projects/fast-projects-table";
import { AGGridProjectsTable } from "@/components/projects/ag-grid-projects-table";
import { RevoGridProjectsTable } from "@/components/projects/revogrid-projects-table";
import { TabulatorProjectsTable } from "@/components/projects/tabulator-projects-table";
import { DndProjectsTable } from "@/components/projects/dnd-projects-table";
import { KanbanBoard } from "@/components/projects/kanban-board";
import { GanttChart } from "@/components/projects/gantt-chart";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Table as TableIcon, LayoutDashboard, Calendar } from "lucide-react";
import { Project } from "@/types/database";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"table" | "kanban" | "gantt">("table");

  useEffect(() => {
    fetchProjects();
  }, []);

  async function fetchProjects() {
    try {
      const response = await fetch("/api/projects");
      const data = await response.json();
      setProjects(data.projects || []);
    } catch (error) {
      console.error("Failed to fetch projects:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateProject(projectId: string, field: string, value: any) {
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });

      if (!response.ok) {
        throw new Error("Failed to update project");
      }

      // Update local state
      setProjects(prev =>
        prev.map(p => p.id === projectId ? { ...p, [field]: value } : p)
      );
    } catch (error) {
      console.error("Failed to update project:", error);
      // Revert on error by refetching
      fetchProjects();
    }
  }

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
            <p className="text-gray-500 mt-2">Manage and track all your projects</p>
          </div>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </div>

        <Tabs value={view} onValueChange={(v) => setView(v as typeof view)} className="space-y-4">
          <TabsList>
            <TabsTrigger value="table" className="gap-2">
              <TableIcon className="w-4 h-4" />
              Table View
            </TabsTrigger>
            <TabsTrigger value="kanban" className="gap-2">
              <LayoutDashboard className="w-4 h-4" />
              Kanban Board
            </TabsTrigger>
            <TabsTrigger value="gantt" className="gap-2">
              <Calendar className="w-4 h-4" />
              Gantt Chart
            </TabsTrigger>
          </TabsList>

          <TabsContent value="table" className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <p className="text-gray-500">Loading projects...</p>
              </div>
            ) : (
              <TabulatorProjectsTable projects={projects} onUpdate={handleUpdateProject} />
            )}
          </TabsContent>

          <TabsContent value="kanban" className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <p className="text-gray-500">Loading projects...</p>
              </div>
            ) : (
              <KanbanBoard projects={projects} />
            )}
          </TabsContent>

          <TabsContent value="gantt" className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <p className="text-gray-500">Loading projects...</p>
              </div>
            ) : (
              <GanttChart projects={projects} />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
