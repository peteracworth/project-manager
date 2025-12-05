"use client";

import { useState, useEffect, useMemo } from "react";
import { ColumnDefinition } from "tabulator-tables";
import { Item, User } from "@/types/database";
import { useTabulatorTable } from "@/hooks/use-tabulator-table";
import { TableToolbar, GroupableColumn, ImagesEditorDialog } from "@/components/shared";
import { formatImageThumbnails } from "@/utils/image-formatter";

import "tabulator-tables/dist/css/tabulator.min.css";

interface TabulatorItemsTableProps {
  items: Item[];
  users: User[];
  onUpdate?: (itemId: string, field: string, value: any) => Promise<void>;
}

const CATEGORY_OPTIONS = ["Furniture", "Fixtures", "Materials", "Equipment", "Decor", "Other"];
const SHEEN_OPTIONS = ["Matte", "Eggshell", "Satin", "Semi-Gloss", "Gloss"];

const GROUPABLE_COLUMNS: GroupableColumn[] = [
  { value: "none", label: "No Grouping" },
  { value: "category", label: "Category" },
  { value: "room_space", label: "Room/Space" },
  { value: "vendor_name", label: "Vendor" },
  { value: "is_suggestion", label: "Suggestion Status" },
  { value: "is_rejected", label: "Rejected Status" },
];

export function TabulatorItemsTable({ items, users, onUpdate }: TabulatorItemsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [groupByColumn, setGroupByColumn] = useState("none");
  const [editingImages, setEditingImages] = useState<{ id: string; imageUrls: string[] } | null>(null);

  const tableData = useMemo(
    () =>
      items.map((item) => {
        const vendor = users.find((u) => u.id === item.vendor_id);
        return {
          id: item.id,
          item_name: item.item_name || "",
          details: item.details || "",
          category: item.category || "",
          room_space: item.room_space || "",
          sheen: item.sheen || "",
          estimate: item.estimate || 0,
          notes: item.notes || "",
          link: item.link || "",
          is_suggestion: item.is_suggestion,
          is_rejected: item.is_rejected,
          vendor_name: vendor?.name || "",
          vendor_id: item.vendor_id || "",
          image_urls: item.image_urls || [],
          image_count: item.image_urls?.length || 0,
        };
      }),
    [items, users]
  );

  const columns: ColumnDefinition[] = useMemo(
    () => [
      {
        title: "Item Name",
        field: "item_name",
        width: 250,
        editor: "input",
        headerFilter: "input",
        frozen: true,
      },
      {
        title: "Images",
        field: "image_count",
        width: 150,
        headerSort: false,
        formatter: (cell) => {
          const rowData = cell.getRow().getData();
          return formatImageThumbnails(rowData.image_urls || []);
        },
        cellClick: (_e: any, cell: any) => {
          const rowData = cell.getRow().getData();
          setEditingImages({ id: rowData.id, imageUrls: rowData.image_urls || [] });
        },
      },
      {
        title: "Details",
        field: "details",
        width: 300,
        editor: "textarea",
        headerFilter: "input",
      },
      {
        title: "Category",
        field: "category",
        width: 150,
        editor: "list",
        editorParams: { values: CATEGORY_OPTIONS },
        headerFilter: "list",
        headerFilterParams: { values: CATEGORY_OPTIONS },
        formatter: (cell) => {
          const value = cell.getValue();
          if (!value) return "";
          const colors: Record<string, string> = {
            Furniture: "#3b82f6",
            Fixtures: "#8b5cf6",
            Materials: "#22c55e",
            Equipment: "#f59e0b",
            Decor: "#ec4899",
            Other: "#6b7280",
          };
          const color = colors[value] || "#6b7280";
          return `<span style="background: ${color}20; color: ${color}; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 500;">${value}</span>`;
        },
      },
      {
        title: "Room/Space",
        field: "room_space",
        width: 150,
        editor: "input",
        headerFilter: "input",
      },
      {
        title: "Sheen",
        field: "sheen",
        width: 130,
        editor: "list",
        editorParams: { values: SHEEN_OPTIONS },
        headerFilter: "list",
        headerFilterParams: { values: SHEEN_OPTIONS },
      },
      {
        title: "Estimate",
        field: "estimate",
        width: 120,
        editor: "number",
        headerFilter: "input",
        formatter: (cell) => {
          const value = cell.getValue();
          if (!value) return "";
          return `$${Number(value).toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`;
        },
      },
      {
        title: "Vendor",
        field: "vendor_name",
        width: 180,
        headerFilter: "input",
      },
      {
        title: "Notes",
        field: "notes",
        width: 250,
        editor: "textarea",
        headerFilter: "input",
      },
      {
        title: "Link",
        field: "link",
        width: 200,
        editor: "input",
        headerFilter: "input",
        formatter: (cell) => {
          const value = cell.getValue();
          if (!value) return "";
          return `<a href="${value}" target="_blank" rel="noopener noreferrer" style="color: #3b82f6; text-decoration: underline;">View Link</a>`;
        },
      },
      {
        title: "Suggestion",
        field: "is_suggestion",
        width: 120,
        editor: "tickCross",
        headerFilter: "tickCross",
        headerFilterParams: { tristate: true },
        formatter: "tickCross",
        hozAlign: "center",
      },
      {
        title: "Rejected",
        field: "is_rejected",
        width: 120,
        editor: "tickCross",
        headerFilter: "tickCross",
        headerFilterParams: { tristate: true },
        formatter: "tickCross",
        hozAlign: "center",
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
          { field: "item_name", type: "like", value: searchTerm },
          { field: "details", type: "like", value: searchTerm },
          { field: "category", type: "like", value: searchTerm },
          { field: "room_space", type: "like", value: searchTerm },
          { field: "vendor_name", type: "like", value: searchTerm },
          { field: "notes", type: "like", value: searchTerm },
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
      const response = await fetch(`/api/items/${editingImages.id}`);
      if (!response.ok) throw new Error("Failed to fetch item");

      const { item } = await response.json();

      setEditingImages({ id: item.id, imageUrls: item.image_urls || [] });

      // Update table data
      const updatedItems = items.map((i) =>
        i.id === item.id ? { ...i, image_urls: item.image_urls } : i
      );
      const newTableData = updatedItems.map((item) => {
        const vendor = users.find((u) => u.id === item.vendor_id);
        return {
          id: item.id,
          item_name: item.item_name || "",
          details: item.details || "",
          category: item.category || "",
          room_space: item.room_space || "",
          sheen: item.sheen || "",
          estimate: item.estimate || 0,
          notes: item.notes || "",
          link: item.link || "",
          is_suggestion: item.is_suggestion,
          is_rejected: item.is_rejected,
          vendor_name: vendor?.name || "",
          vendor_id: item.vendor_id || "",
          image_urls: item.image_urls || [],
          image_count: item.image_urls?.length || 0,
        };
      });
      refreshData(newTableData);
    } catch (error) {
      console.error("Error refreshing item images:", error);
    }
  };

  return (
    <div className="space-y-4">
      <TableToolbar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search items..."
        groupByColumn={groupByColumn}
        onGroupByChange={setGroupByColumn}
        groupableColumns={GROUPABLE_COLUMNS}
      />

      <div ref={tableRef} className="border rounded-lg overflow-hidden" />

      <div className="text-sm text-gray-500">{items.length} item(s) total</div>

      {editingImages && (
        <ImagesEditorDialog
          isOpen={true}
          onClose={() => setEditingImages(null)}
          entityId={editingImages.id}
          entityType="item"
          imageUrls={editingImages.imageUrls}
          onUpdate={handleRefreshImages}
        />
      )}
    </div>
  );
}
