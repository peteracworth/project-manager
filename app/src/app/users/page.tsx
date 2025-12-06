"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { TabulatorUsersTable } from "@/components/users/tabulator-users-table";
import { TableNavigation } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Plus, Table as TableIcon } from "lucide-react";
import { User } from "@/types/database";

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      const response = await fetch("/api/users");
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(userId: string, field: string, value: any) {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });

      if (!response.ok) {
        throw new Error('Failed to update user');
      }

      // Refresh users data
      await fetchUsers();
    } catch (error) {
      console.error('Failed to update user:', error);
      alert('Failed to update user. Please try again.');
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
              New Contact
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500">Loading users...</p>
          </div>
        ) : (
          <TabulatorUsersTable users={users} onUpdate={handleUpdate} />
        )}
      </div>
    </DashboardLayout>
  );
}
