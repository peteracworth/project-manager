"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { TabulatorStaticInfoTable } from "@/components/static-info/tabulator-static-info-table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { StaticInfo } from "@/types/database";

export default function StaticInfoPage() {
  const [staticInfo, setStaticInfo] = useState<StaticInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStaticInfo();
  }, []);

  async function fetchStaticInfo() {
    try {
      const response = await fetch("/api/static-info");
      const data = await response.json();
      setStaticInfo(data.staticInfo || []);
    } catch (error) {
      console.error("Failed to fetch static info:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(staticInfoId: string, field: string, value: any) {
    try {
      const response = await fetch(`/api/static-info/${staticInfoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });

      if (!response.ok) {
        throw new Error('Failed to update static info');
      }

      // Refresh static info data
      await fetchStaticInfo();
    } catch (error) {
      console.error('Failed to update static info:', error);
      alert('Failed to update static info. Please try again.');
    }
  }

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

        {loading ? (
          <div className="flex items-center justify-center h-64 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-500">Loading static info...</p>
          </div>
        ) : (
          <TabulatorStaticInfoTable staticInfo={staticInfo} onUpdate={handleUpdate} />
        )}
      </div>
    </DashboardLayout>
  );
}
