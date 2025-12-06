"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { TabulatorStaticInfoTable } from "@/components/static-info/tabulator-static-info-table";
import { TableNavigation } from "@/components/shared";
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
      <div className="p-6">
        {/* Header row */}
        <div className="flex items-center gap-4 mb-6 flex-wrap">
          <TableNavigation />
          
          <div className="ml-auto">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Entry
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500">Loading static info...</p>
          </div>
        ) : (
          <TabulatorStaticInfoTable staticInfo={staticInfo} onUpdate={handleUpdate} />
        )}
      </div>
    </DashboardLayout>
  );
}
