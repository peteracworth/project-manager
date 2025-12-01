"use client";

import { useEffect, useRef } from "react";
import Gantt from "frappe-gantt";
import { Project } from "@/types/database";

interface GanttChartProps {
  projects: Project[];
}

export function GanttChart({ projects }: GanttChartProps) {
  const ganttRef = useRef<HTMLDivElement>(null);
  const ganttInstance = useRef<Gantt | null>(null);

  useEffect(() => {
    if (!ganttRef.current || projects.length === 0) return;

    const tasks = projects
      .filter(p => p.start_date || p.created_at)
      .map((project) => {
        const start = project.start_date || project.created_at;
        const end = project.end_date || project.due_date;

        const startDate = new Date(start);
        let endDate = end ? new Date(end) : new Date(startDate);

        if (!end) {
          endDate.setDate(endDate.getDate() + 7);
        }

        return {
          id: project.id,
          name: project.title || "Untitled",
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0],
          progress: project.progress || 0,
          dependencies: project.depends_on?.join(',') || "",
          custom_class: getStatusClass(project.status),
        };
      });

    if (tasks.length === 0) return;

    try {
      if (ganttInstance.current) {
        ganttInstance.current.refresh(tasks);
      } else {
        ganttInstance.current = new Gantt(ganttRef.current, tasks, {
          header_height: 50,
          column_width: 30,
          step: 24,
          view_modes: ["Quarter Day", "Half Day", "Day", "Week", "Month"],
          bar_height: 20,
          bar_corner_radius: 3,
          arrow_curve: 5,
          padding: 18,
          view_mode: "Week",
          date_format: "YYYY-MM-DD",
          language: "en",
          custom_popup_html: function (task) {
            const project = projects.find(p => p.id === task.id);
            return `
              <div class="gantt-popup">
                <h3>${task.name}</h3>
                ${project?.description ? `<p>${project.description}</p>` : ""}
                <p><strong>Status:</strong> ${project?.status || "Not Started"}</p>
                <p><strong>Progress:</strong> ${task.progress}%</p>
                <p><strong>Start:</strong> ${task.start}</p>
                <p><strong>End:</strong> ${task.end}</p>
              </div>
            `;
          },
        });
      }
    } catch (error) {
      console.error("Failed to render Gantt chart:", error);
    }

    return () => {
      ganttInstance.current = null;
    };
  }, [projects]);

  if (projects.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-white rounded-lg border border-gray-200">
        <p className="text-gray-500">No projects to display</p>
      </div>
    );
  }

  const hasScheduledProjects = projects.some(p => p.start_date || p.created_at);

  if (!hasScheduledProjects) {
    return (
      <div className="flex items-center justify-center h-64 bg-white rounded-lg border border-gray-200">
        <p className="text-gray-500">No projects with dates available for Gantt chart</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 overflow-x-auto">
      <div ref={ganttRef} />
    </div>
  );
}

function getStatusClass(status?: string | null): string {
  switch (status) {
    case "Completed":
      return "gantt-bar-completed";
    case "In Progress":
      return "gantt-bar-in-progress";
    case "On Hold":
      return "gantt-bar-on-hold";
    default:
      return "gantt-bar-not-started";
  }
}
