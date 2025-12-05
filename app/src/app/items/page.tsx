"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { TabulatorItemsTable } from "@/components/items/tabulator-items-table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Item, User } from "@/types/database";

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [itemsResponse, usersResponse] = await Promise.all([
        fetch("/api/items"),
        fetch("/api/users"),
      ]);

      const itemsData = await itemsResponse.json();
      const usersData = await usersResponse.json();

      setItems(itemsData.items || []);
      setUsers(usersData.users || []);
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
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Items & Purchases</h1>
            <p className="text-gray-500 mt-2">Track items, purchases, and materials</p>
          </div>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Item
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-500">Loading items...</p>
          </div>
        ) : (
          <TabulatorItemsTable items={items} users={users} onUpdate={handleUpdate} />
        )}
      </div>
    </DashboardLayout>
  );
}
