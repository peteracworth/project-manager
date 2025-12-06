"use client";

import { useState, useEffect, useMemo, useCallback, useRef, useId } from "react";
import { ColumnDefinition } from "tabulator-tables";
import { Item, User } from "@/types/database";
import { useTabulatorTable } from "@/hooks/use-tabulator-table";
import { TableToolbar, GroupableColumn, ImagesEditorDialog, createSimpleExpandColumn, EntityEditorDialog, FieldDefinition, FilterColumn, FilterCondition, ColumnDef } from "@/components/shared";
import { formatImageThumbnails } from "@/utils/image-formatter";
import { useView } from "@/contexts/view-context";

import "tabulator-tables/dist/css/tabulator.min.css";

interface Project {
  id: string;
  title: string;
}

interface TabulatorItemsTableProps {
  items: Item[];
  users: User[];
  projects?: Project[];
  onUpdate?: (itemId: string, field: string, value: any) => Promise<void>;
}

const CATEGORY_OPTIONS = ["Furniture", "Fixtures", "Materials", "Equipment", "Decor", "Other"];
const SHEEN_OPTIONS = ["Matte", "Eggshell", "Satin", "Semi-Gloss", "Gloss"];

const CATEGORY_OPTIONS_LIST = ["Furniture", "Fixtures", "Materials", "Equipment", "Decor", "Lighting", "Paint", "Appliances", "Textile", "Art", "Other"];
const STATUS_OPTIONS = ["Not started", "Ordered", "Received", "Installed/Completed", "Inspected", "Returned", "Pending Owner Decision", "On hold/Deprioritized"];

const GROUPABLE_COLUMNS: GroupableColumn[] = [
  { value: "none", label: "No Grouping" },
  { value: "category", label: "Category" },
  { value: "room_space", label: "Room/Space" },
  { value: "status", label: "Status" },
  { value: "vendor_name", label: "Vendor" },
  { value: "is_suggestion", label: "Suggestion Status" },
  { value: "is_rejected", label: "Rejected Status" },
];

// All columns for visibility dropdown
const ALL_COLUMNS: ColumnDef[] = [
  { field: "item_name", label: "Item Name" },
  { field: "details", label: "Details" },
  { field: "category", label: "Category" },
  { field: "room_space", label: "Room/Space" },
  { field: "status", label: "Status" },
  { field: "sheen", label: "Sheen" },
  { field: "estimate", label: "Estimate" },
  { field: "purchase_price", label: "Purchase Price" },
  { field: "quantity", label: "Quantity" },
  { field: "purchase_date", label: "Purchase Date" },
  { field: "size_dimensions", label: "Dimensions" },
  { field: "actual_dimensions", label: "Actual Dimensions" },
  { field: "product_id", label: "Product ID" },
  { field: "notes", label: "Notes" },
  { field: "link", label: "Link" },
  { field: "vendor_name", label: "Vendor" },
  { field: "project_name", label: "Project" },
  { field: "image_urls", label: "Images" },
  { field: "is_suggestion", label: "Suggestion" },
  { field: "is_rejected", label: "Rejected" },
];

// Filter columns generated dynamically to include vendor names

// Field definitions for the entity editor dialog
const ITEM_FIELDS: FieldDefinition[] = [
  { name: "item_name", label: "Item Name", type: "text", placeholder: "Name of the item" },
  { name: "category", label: "Category", type: "select", options: CATEGORY_OPTIONS_LIST, width: "half" },
  { name: "room_space", label: "Room/Space", type: "text", placeholder: "Where item goes", width: "half" },
  { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS, width: "half" },
  { name: "sheen", label: "Sheen", type: "select", options: SHEEN_OPTIONS, width: "half" },
  { name: "details", label: "Details", type: "textarea", placeholder: "Description of the item" },
  { name: "estimate", label: "Estimate ($)", type: "currency", placeholder: "Estimated price", width: "half" },
  { name: "purchase_price", label: "Purchase Price ($)", type: "currency", placeholder: "Actual price", width: "half" },
  { name: "quantity", label: "Quantity", type: "number", placeholder: "How many", width: "half" },
  { name: "purchase_date", label: "Purchase Date", type: "date", width: "half" },
  { name: "size_dimensions", label: "Size/Dimensions", type: "text", placeholder: "Product dimensions", width: "half" },
  { name: "actual_dimensions", label: "Actual Dimensions", type: "text", placeholder: "Measured dimensions", width: "half" },
  { name: "product_id", label: "Product ID", type: "text", placeholder: "Vendor product ID", width: "half" },
  { name: "link", label: "Link", type: "url", placeholder: "Product URL" },
  { name: "notes", label: "Notes", type: "textarea", placeholder: "Additional notes..." },
];

export function TabulatorItemsTable({ items, users, projects = [], onUpdate }: TabulatorItemsTableProps) {
  const { currentView, setCurrentView } = useView();
  const [editingImages, setEditingImages] = useState<{ id: string; imageUrls: string[] } | null>(null);
  const [selectedCount, setSelectedCount] = useState(0);
  const [expandedItem, setExpandedItem] = useState<Record<string, any> | null>(null);

  // Local state for view settings - much faster than context
  const [searchTerm, setSearchTerm] = useState("");
  const [groupByColumn, setGroupByColumn] = useState("none");
  const [filters, setFilters] = useState<FilterCondition[]>([]);
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);

  // Track if we're syncing to prevent circular updates
  const isSyncingToContextRef = useRef(false);
  const lastAppliedViewRef = useRef<string>("");

  // Sync table name with context on mount
  useEffect(() => {
    setCurrentView({ tableName: "items" });
  }, [setCurrentView]);

  // When context changes (e.g., user selects a saved view), update local state
  useEffect(() => {
    if (isSyncingToContextRef.current) {
      isSyncingToContextRef.current = false;
      return;
    }
    
    if (currentView.tableName !== "items") return;
    
    const viewKey = JSON.stringify({
      filters: currentView.filters,
      groupBy: currentView.groupBy,
      searchTerm: currentView.searchTerm,
      hiddenColumns: currentView.hiddenColumns,
    });
    
    if (viewKey !== lastAppliedViewRef.current) {
      lastAppliedViewRef.current = viewKey;
      setSearchTerm(currentView.searchTerm || "");
      setGroupByColumn(currentView.groupBy || "none");
      setFilters(currentView.filters || []);
      setHiddenColumns(currentView.hiddenColumns || []);
    }
  }, [currentView]);

  // Sync local state TO context (debounced) for saving views
  useEffect(() => {
    const timeout = setTimeout(() => {
      isSyncingToContextRef.current = true;
      const viewKey = JSON.stringify({
        filters,
        groupBy: groupByColumn === "none" ? null : groupByColumn,
        searchTerm,
        hiddenColumns,
      });
      lastAppliedViewRef.current = viewKey;
      setCurrentView({
        searchTerm,
        groupBy: groupByColumn === "none" ? null : groupByColumn,
        filters,
        hiddenColumns,
      });
    }, 500);
    return () => clearTimeout(timeout);
  }, [searchTerm, groupByColumn, filters, hiddenColumns, setCurrentView]);

  const tableData = useMemo(
    () =>
      items.map((item) => {
        const vendor = users.find((u) => u.id === item.vendor_id);
        const project = projects.find((p) => p.id === (item as any).project_id);
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
          // New fields
          status: (item as any).status || "",
          quantity: (item as any).quantity || null,
          purchase_price: (item as any).purchase_price || null,
          purchase_date: (item as any).purchase_date?.split("T")[0] || "",
          size_dimensions: (item as any).size_dimensions || "",
          actual_dimensions: (item as any).actual_dimensions || "",
          product_id: (item as any).product_id || "",
          project_id: (item as any).project_id || "",
          project_name: project?.title || "",
        };
      }),
    [items, users, projects]
  );

  // Generate filter columns dynamically with vendor and project names
  const filterColumns: FilterColumn[] = useMemo(() => {
    const vendorNames = users.map((u) => u.name).filter(Boolean).sort();
    const projectNames = projects.map((p) => p.title).filter(Boolean).sort();
    const roomSpaces = [...new Set(items.map((i) => i.room_space).filter(Boolean))].sort();
    
    return [
      { field: "item_name", label: "Item Name" },
      { field: "category", label: "Category", options: CATEGORY_OPTIONS_LIST },
      { field: "room_space", label: "Room/Space", options: roomSpaces.length > 0 ? roomSpaces : undefined },
      { field: "status", label: "Status", options: STATUS_OPTIONS },
      { field: "sheen", label: "Sheen", options: SHEEN_OPTIONS },
      { field: "vendor_name", label: "Vendor", options: vendorNames.length > 0 ? vendorNames : undefined },
      { field: "details", label: "Details" },
      { field: "notes", label: "Notes" },
      { field: "project_name", label: "Project", options: projectNames.length > 0 ? projectNames : undefined },
      { field: "product_id", label: "Product ID" },
    ];
  }, [users, projects, items]);

  const columns: ColumnDefinition[] = useMemo(
    () => [
      createSimpleExpandColumn((rowData) => setExpandedItem(rowData)),
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
        title: "Status",
        field: "status",
        width: 160,
        editor: "list",
        editorParams: { values: STATUS_OPTIONS },
        headerFilter: "list",
        headerFilterParams: { values: STATUS_OPTIONS },
        formatter: (cell) => {
          const value = cell.getValue();
          if (!value) return "";
          const colors: Record<string, string> = {
            "Not started": "#6b7280",
            "Ordered": "#3b82f6",
            "Received": "#f59e0b",
            "Installed/Completed": "#22c55e",
            "Inspected": "#06b6d4",
            "Returned": "#ef4444",
            "Pending Owner Decision": "#8b5cf6",
            "On hold/Deprioritized": "#9ca3af",
          };
          const color = colors[value] || "#6b7280";
          return `<span style="background: ${color}20; color: ${color}; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 500;">${value}</span>`;
        },
      },
      {
        title: "Project",
        field: "project_name",
        width: 200,
        headerFilter: "input",
        formatter: (cell) => {
          const value = cell.getValue();
          if (!value) return "";
          return `<span style="background: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 4px; font-size: 12px;">${value}</span>`;
        },
      },
      {
        title: "Quantity",
        field: "quantity",
        width: 100,
        editor: "number",
        headerFilter: "input",
        hozAlign: "center",
      },
      {
        title: "Purchase Price",
        field: "purchase_price",
        width: 140,
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
        title: "Purchase Date",
        field: "purchase_date",
        width: 130,
        editor: "date",
        headerFilter: "input",
      },
      {
        title: "Dimensions",
        field: "size_dimensions",
        width: 180,
        editor: "input",
        headerFilter: "input",
      },
      {
        title: "Actual Dimensions",
        field: "actual_dimensions",
        width: 180,
        editor: "input",
        headerFilter: "input",
      },
      {
        title: "Product ID",
        field: "product_id",
        width: 140,
        editor: "input",
        headerFilter: "input",
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

  const tableId = useId().replace(/:/g, '');
  
  const { tableRef, setFilter, clearFilter, setGroupBy, refreshData, getSelectedRows, deselectAll, getInstance } = useTabulatorTable({
    data: tableData,
    columns,
    onCellEdited: onUpdate,
  });

  // CSS-based column hiding - instant, no Tabulator API calls
  const hiddenColumnsStyle = useMemo(() => {
    if (hiddenColumns.length === 0) return '';
    return hiddenColumns.map(field => 
      `#table-${tableId} [tabulator-field="${field}"] { display: none !important; }`
    ).join('\n');
  }, [hiddenColumns, tableId]);

  // Track row selection changes
  useEffect(() => {
    const instance = getInstance();
    if (!instance) return;

    const updateSelection = () => {
      const selected = getSelectedRows();
      setSelectedCount(selected.length);
    };

    instance.on("rowSelected", updateSelection);
    instance.on("rowDeselected", updateSelection);

    return () => {
      try {
        instance.off("rowSelected", updateSelection);
        instance.off("rowDeselected", updateSelection);
      } catch {
        // Ignore cleanup errors
      }
    };
  }, [getInstance, getSelectedRows]);

  // Handle delete selected items
  const handleDeleteSelected = async () => {
    const selected = getSelectedRows();
    if (selected.length === 0) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selected.length} item(s)? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      const deletePromises = selected.map((row) =>
        fetch(`/api/items/${row.id}`, { method: "DELETE" })
      );

      const results = await Promise.all(deletePromises);
      const failedCount = results.filter((r) => !r.ok).length;

      if (failedCount > 0) {
        alert(`${failedCount} item(s) failed to delete.`);
      }

      deselectAll();
      setSelectedCount(0);
      
      // Trigger page refresh
      window.location.reload();
    } catch (error) {
      console.error("Failed to delete items:", error);
      alert("Failed to delete items. Please try again.");
    }
  };

  // Apply filters (search + custom filters) - optimized single filter function
  useEffect(() => {
    const instance = getInstance();
    if (!instance) return;

    if (!searchTerm && filters.length === 0) {
      instance.clearFilter();
      return;
    }

    instance.setFilter((rowData: any) => {
      // Check search term (OR across fields)
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
          (rowData.item_name || "").toLowerCase().includes(searchLower) ||
          (rowData.details || "").toLowerCase().includes(searchLower) ||
          (rowData.category || "").toLowerCase().includes(searchLower) ||
          (rowData.room_space || "").toLowerCase().includes(searchLower) ||
          (rowData.vendor_name || "").toLowerCase().includes(searchLower) ||
          (rowData.notes || "").toLowerCase().includes(searchLower) ||
          (rowData.status || "").toLowerCase().includes(searchLower) ||
          (rowData.project_name || "").toLowerCase().includes(searchLower) ||
          (rowData.product_id || "").toLowerCase().includes(searchLower);
        
        if (!matchesSearch) return false;
      }

      // Check custom filters (AND between them)
      for (const f of filters) {
        const fieldValue = String(rowData[f.column] || "").toLowerCase();
        const filterValue = f.value.toLowerCase();

        switch (f.operator) {
          case "like": if (!fieldValue.includes(filterValue)) return false; break;
          case "notlike": if (fieldValue.includes(filterValue)) return false; break;
          case "=": if (fieldValue !== filterValue) return false; break;
          case "!=": if (fieldValue === filterValue) return false; break;
          case "empty": if (fieldValue !== "") return false; break;
          case "notempty": if (fieldValue === "") return false; break;
        }
      }
      return true;
    });
  }, [searchTerm, filters, getInstance]);

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
      {/* CSS-based column hiding - instant with no API calls */}
      {hiddenColumnsStyle && <style dangerouslySetInnerHTML={{ __html: hiddenColumnsStyle }} />}
      
      <TableToolbar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search items..."
        groupByColumn={groupByColumn}
        onGroupByChange={setGroupByColumn}
        groupableColumns={GROUPABLE_COLUMNS}
        selectedCount={selectedCount}
        onDeleteSelected={handleDeleteSelected}
        deleteLabel="Delete"
        allColumns={ALL_COLUMNS}
        hiddenColumns={hiddenColumns}
        onHiddenColumnsChange={setHiddenColumns}
        filterColumns={filterColumns}
        filters={filters}
        onFiltersChange={setFilters}
      />

      <div id={`table-${tableId}`} ref={tableRef} className="border rounded-lg" style={{ minWidth: 'max-content' }} />

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

      {/* Entity Editor Dialog */}
      {expandedItem && (
        <EntityEditorDialog
          isOpen={true}
          onClose={() => setExpandedItem(null)}
          title={`Edit Item: ${expandedItem.item_name}`}
          entityType="item"
          entityId={expandedItem.id}
          data={expandedItem}
          fields={ITEM_FIELDS}
          onUpdate={async (itemId, field, value) => {
            if (onUpdate) {
              await onUpdate(itemId, field, value);
            }
            setExpandedItem((prev) => prev ? { ...prev, [field]: value } : null);
          }}
        />
      )}
    </div>
  );
}
