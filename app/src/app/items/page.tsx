"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function ItemsPage() {
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

        <div className="flex items-center justify-center h-96 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500">Items view coming soon...</p>
        </div>
      </div>
    </DashboardLayout>
  );
}
