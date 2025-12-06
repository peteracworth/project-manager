"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { TabulatorItemsTable } from "@/components/items/tabulator-items-table";
import { TableNavigation } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Plus, Table as TableIcon } from "lucide-react";
import { Item, User, Project } from "@/types/database";

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [itemsResponse, usersResponse, projectsResponse] = await Promise.all([
        fetch("/api/items"),
        fetch("/api/users"),
        fetch("/api/projects"),
      ]);

      const itemsData = await itemsResponse.json();
      const usersData = await usersResponse.json();
      const projectsData = await projectsResponse.json();

      setItems(itemsData.items || []);
      setUsers(usersData.users || []);
      setProjects(projectsData.projects || []);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(itemId: string, field: string, value: any) {
    try {
      const response = await fetch(`/api/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });

      if (!response.ok) {
        throw new Error('Failed to update item');
      }

      // Refresh items data
      await fetchData();
    } catch (error) {
      console.error('Failed to update item:', error);
      alert('Failed to update item. Please try again.');
    }
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        {/* Header row */}
        <div className="flex items-center gap-4 mb-6 flex-wrap">
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-white shadow text-sm font-medium text-gray-900">
              <TableIcon className="w-4 h-4" />
              Table
            </div>
          </div>
          
          <div className="h-6 w-px bg-gray-300" />
          
          <TableNavigation />
          
          <div className="ml-auto">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Item
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500">Loading items...</p>
          </div>
        ) : (
          <TabulatorItemsTable items={items} users={users} projects={projects} onUpdate={handleUpdate} />
        )}
      </div>
    </DashboardLayout>
  );
}
