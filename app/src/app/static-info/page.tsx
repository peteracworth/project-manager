"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function StaticInfoPage() {
  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Static Information</h1>
            <p className="text-gray-500 mt-2">General information and references</p>
          </div>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Entry
          </Button>
        </div>

        <div className="flex items-center justify-center h-96 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500">Static information view coming soon...</p>
        </div>
      </div>
    </DashboardLayout>
  );
}
