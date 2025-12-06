"use client";

import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { TabulatorProjectsTable } from "@/components/projects/tabulator-projects-table";
import { KanbanBoard } from "@/components/projects/kanban-board";
import { TableNavigation } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Plus, Table as TableIcon, LayoutDashboard } from "lucide-react";
import { Project } from "@/types/database";
import { useView } from "@/contexts/view-context";

export default function ProjectsPage() {
  const { currentView, setCurrentView } = useView();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Use view type from context
  const view = (currentView.viewType as "table" | "kanban") || "table";
  
  const setView = useCallback((newView: "table" | "kanban") => {
    setCurrentView({ viewType: newView });
  }, [setCurrentView]);

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
      setProjects((prev) => prev.map((p) => (p.id === projectId ? { ...p, [field]: value } : p)));
    } catch (error) {
      console.error("Failed to update project:", error);
      // Revert on error by refetching
      fetchProjects();
    }
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        {/* Header row: View tabs + Table navigation + New button */}
        <div className="flex items-center gap-4 mb-6 flex-wrap">
          {/* View type tabs */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setView("table")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                view === "table" ? "bg-white shadow text-gray-900" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <TableIcon className="w-4 h-4" />
              Table
            </button>
            <button
              onClick={() => setView("kanban")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                view === "kanban" ? "bg-white shadow text-gray-900" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Kanban
            </button>
          </div>
          
          <div className="h-6 w-px bg-gray-300" />
          
          {/* Table navigation */}
          <TableNavigation />
          
          <div className="ml-auto">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Button>
          </div>
        </div>

        {/* Content based on view */}
        {view === "table" ? (
          loading ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-500">Loading projects...</p>
            </div>
          ) : (
            <TabulatorProjectsTable
              projects={projects}
              onUpdate={handleUpdateProject}
              onTeamRosterUpdate={fetchProjects}
            />
          )
        ) : (
          loading ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-500">Loading projects...</p>
            </div>
          ) : (
            <KanbanBoard projects={projects} />
          )
        )}
      </div>
    </DashboardLayout>
  );
}
