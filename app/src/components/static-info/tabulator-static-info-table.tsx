"use client";

import { useState, useEffect, useMemo } from "react";
import { ColumnDefinition } from "tabulator-tables";
import { StaticInfo } from "@/types/database";
import { useTabulatorTable } from "@/hooks/use-tabulator-table";
import { TableToolbar, GroupableColumn, ImagesEditorDialog } from "@/components/shared";
import { formatImageThumbnails } from "@/utils/image-formatter";

import "tabulator-tables/dist/css/tabulator.min.css";

interface TabulatorStaticInfoTableProps {
  staticInfo: StaticInfo[];
  onUpdate?: (staticInfoId: string, field: string, value: any) => Promise<void>;
}

const GROUPABLE_COLUMNS: GroupableColumn[] = [
  { value: "none", label: "No Grouping" },
  { value: "category", label: "Category" },
];

export function TabulatorStaticInfoTable({ staticInfo, onUpdate }: TabulatorStaticInfoTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [groupByColumn, setGroupByColumn] = useState("none");
  const [editingImages, setEditingImages] = useState<{ id: string; imageUrls: string[] } | null>(null);

  const tableData = useMemo(
    () =>
      staticInfo.map((info) => {
        const imageUrls = info.image_urls || [];
        return {
          id: info.id,
          key: info.key || "",
          value: info.value || "",
          category: info.category || "",
          description: info.description || "",
          image_urls: imageUrls,
          image_count: imageUrls.length,
        };
      }),
    [staticInfo]
  );

  const columns: ColumnDefinition[] = useMemo(
    () => [
      {
        title: "Key",
        field: "key",
        width: 250,
        editor: "input",
        headerFilter: "input",
        frozen: true,
      },
      {
        title: "Value",
        field: "value",
        width: 350,
        editor: "textarea",
        headerFilter: "input",
      },
      {
        title: "Images",
        field: "image_count",
        width: 150,
        headerSort: false,
        formatter: (cell) => {
          const rowData = cell.getRow().getData();
          const imageUrls = rowData.image_urls || [];
          return formatImageThumbnails(imageUrls);
        },
        cellClick: (_e: any, cell: any) => {
          const rowData = cell.getRow().getData();
          setEditingImages({ id: rowData.id, imageUrls: rowData.image_urls || [] });
        },
      },
      {
        title: "Category",
        field: "category",
        width: 180,
        editor: "input",
        headerFilter: "input",
        formatter: (cell) => {
          const value = cell.getValue();
          if (!value) return "";
          return `<span style="background: #e0e7ff; color: #4338ca; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 500;">${value}</span>`;
        },
      },
      {
        title: "Description",
        field: "description",
        width: 400,
        editor: "textarea",
        headerFilter: "input",
      },
    ],
    []
  );

  const { tableRef, setFilter, clearFilter, setGroupBy, refreshData } = useTabulatorTable({
    data: tableData,
    columns,
    onCellEdited: onUpdate,
  });

  // Handle search filter
  useEffect(() => {
    if (searchTerm) {
      setFilter(
        [
          { field: "key", type: "like", value: searchTerm },
          { field: "value", type: "like", value: searchTerm },
          { field: "category", type: "like", value: searchTerm },
          { field: "description", type: "like", value: searchTerm },
        ],
        "or"
      );
    } else {
      clearFilter();
    }
  }, [searchTerm, setFilter, clearFilter]);

  // Handle grouping
  useEffect(() => {
    setGroupBy(groupByColumn !== "none" ? groupByColumn : false);
  }, [groupByColumn, setGroupBy]);

  const handleRefreshImages = async () => {
    if (!editingImages) return;

    try {
      const response = await fetch(`/api/static-info/${editingImages.id}`);
      if (!response.ok) throw new Error("Failed to fetch static info");

      const { staticInfo: fetchedStaticInfo } = await response.json();

      setEditingImages({ id: fetchedStaticInfo.id, imageUrls: fetchedStaticInfo.image_urls || [] });

      // Update table data
      const updatedData = staticInfo.map((si) =>
        si.id === fetchedStaticInfo.id ? { ...si, image_urls: fetchedStaticInfo.image_urls } : si
      );
      const newTableData = updatedData.map((info) => ({
        id: info.id,
        key: info.key || "",
        value: info.value || "",
        category: info.category || "",
        description: info.description || "",
        image_urls: info.image_urls || [],
        image_count: info.image_urls?.length || 0,
      }));
      refreshData(newTableData);
    } catch (error) {
      console.error("Error refreshing static info images:", error);
    }
  };

  return (
    <div className="space-y-4">
      <TableToolbar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search static info..."
        groupByColumn={groupByColumn}
        onGroupByChange={setGroupByColumn}
        groupableColumns={GROUPABLE_COLUMNS}
      />

      <div ref={tableRef} className="border rounded-lg overflow-hidden" />

      <div className="text-sm text-gray-500">{staticInfo.length} record(s) total</div>

      {editingImages && (
        <ImagesEditorDialog
          isOpen={true}
          onClose={() => setEditingImages(null)}
          entityId={editingImages.id}
          entityType="static_info"
          imageUrls={editingImages.imageUrls}
          onUpdate={handleRefreshImages}
        />
      )}
    </div>
  );
}
