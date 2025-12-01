"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";

export default function SettingsPage() {
  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 mt-2">Manage your application settings</p>
        </div>

        <div className="flex items-center justify-center h-96 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500">Settings coming soon...</p>
        </div>
      </div>
    </DashboardLayout>
  );
}
