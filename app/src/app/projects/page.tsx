"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { TabulatorProjectsTable } from "@/components/projects/tabulator-projects-table";
import { TableNavigation } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Project } from "@/types/database";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

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
        {/* Header row */}
        <div className="flex items-center gap-4 mb-6 flex-wrap">
          {/* Table navigation */}
          <TableNavigation />
          
          <div className="ml-auto">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500">Loading projects...</p>
          </div>
        ) : (
          <TabulatorProjectsTable
            projects={projects}
            onUpdate={handleUpdateProject}
            onTeamRosterUpdate={fetchProjects}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
