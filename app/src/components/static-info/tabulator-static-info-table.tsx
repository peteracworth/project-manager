"use client";

import { useState, useEffect, useMemo, useCallback, useRef, useId } from "react";
import { ColumnDefinition } from "tabulator-tables";
import { StaticInfo } from "@/types/database";
import { useTabulatorTable } from "@/hooks/use-tabulator-table";
import { TableToolbar, GroupableColumn, ImagesEditorDialog, createSimpleExpandColumn, EntityEditorDialog, FieldDefinition, FilterColumn, FilterCondition, ColumnDef } from "@/components/shared";
import { formatImageThumbnails } from "@/utils/image-formatter";
import { useView } from "@/contexts/view-context";

import "tabulator-tables/dist/css/tabulator.min.css";

interface TabulatorStaticInfoTableProps {
  staticInfo: StaticInfo[];
  onUpdate?: (staticInfoId: string, field: string, value: any) => Promise<void>;
}

const CATEGORY_OPTIONS = ["General", "Interior Renderings and moods", "Exterior Paint Colors"];

const GROUPABLE_COLUMNS: GroupableColumn[] = [
  { value: "none", label: "No Grouping" },
  { value: "category", label: "Category" },
];

const FILTER_COLUMNS: FilterColumn[] = [
  { field: "key", label: "Key" },
  { field: "value", label: "Value" },
  { field: "category", label: "Category", options: CATEGORY_OPTIONS },
  { field: "description", label: "Description" },
  { field: "website_link", label: "Website/Link" },
];

// All columns for visibility dropdown
const ALL_COLUMNS: ColumnDef[] = [
  { field: "key", label: "Key" },
  { field: "value", label: "Value" },
  { field: "category", label: "Category" },
  { field: "description", label: "Description" },
  { field: "website_link", label: "Website/Link" },
  { field: "image_urls", label: "Images" },
];

// Field definitions for the entity editor dialog
const STATIC_INFO_FIELDS: FieldDefinition[] = [
  { name: "key", label: "Name/Key", type: "text", placeholder: "Name of the entry" },
  { name: "category", label: "Category", type: "select", options: CATEGORY_OPTIONS, width: "half" },
  { name: "website_link", label: "Website/Link", type: "url", placeholder: "https://...", width: "half" },
  { name: "value", label: "Value/Content", type: "textarea", placeholder: "Main content or value" },
  { name: "description", label: "Description/Notes", type: "textarea", placeholder: "Additional notes..." },
];

export function TabulatorStaticInfoTable({ staticInfo, onUpdate }: TabulatorStaticInfoTableProps) {
  const { currentView, setCurrentView } = useView();
  const [editingImages, setEditingImages] = useState<{ id: string; imageUrls: string[] } | null>(null);
  const [selectedCount, setSelectedCount] = useState(0);
  const [expandedInfo, setExpandedInfo] = useState<Record<string, any> | null>(null);

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
    setCurrentView({ tableName: "static_info" });
  }, [setCurrentView]);

  // When context changes (e.g., user selects a saved view), update local state
  useEffect(() => {
    if (isSyncingToContextRef.current) {
      isSyncingToContextRef.current = false;
      return;
    }
    
    if (currentView.tableName !== "static_info") return;
    
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
      staticInfo.map((info) => {
        const imageUrls = info.image_urls || [];
        return {
          id: info.id,
          key: info.key || "",
          value: info.value || "",
          category: info.category || "",
          description: info.description || "",
          website_link: (info as any).website_link || "",
          image_urls: imageUrls,
          image_count: imageUrls.length,
        };
      }),
    [staticInfo]
  );

  const columns: ColumnDefinition[] = useMemo(
    () => [
      createSimpleExpandColumn((rowData) => setExpandedInfo(rowData)),
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
      {
        title: "Website/Link",
        field: "website_link",
        width: 200,
        editor: "input",
        headerFilter: "input",
        formatter: (cell) => {
          const value = cell.getValue();
          if (!value) return "";
          return `<a href="${value}" target="_blank" rel="noopener noreferrer" style="color: #3b82f6; text-decoration: underline;">View Link</a>`;
        },
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

  // Handle delete selected static info
  const handleDeleteSelected = async () => {
    const selected = getSelectedRows();
    if (selected.length === 0) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selected.length} record(s)? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      const deletePromises = selected.map((row) =>
        fetch(`/api/static-info/${row.id}`, { method: "DELETE" })
      );

      const results = await Promise.all(deletePromises);
      const failedCount = results.filter((r) => !r.ok).length;

      if (failedCount > 0) {
        alert(`${failedCount} record(s) failed to delete.`);
      }

      deselectAll();
      setSelectedCount(0);
      
      // Trigger page refresh
      window.location.reload();
    } catch (error) {
      console.error("Failed to delete records:", error);
      alert("Failed to delete records. Please try again.");
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
          (rowData.key || "").toLowerCase().includes(searchLower) ||
          (rowData.value || "").toLowerCase().includes(searchLower) ||
          (rowData.category || "").toLowerCase().includes(searchLower) ||
          (rowData.description || "").toLowerCase().includes(searchLower) ||
          (rowData.website_link || "").toLowerCase().includes(searchLower);
        
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
      {/* CSS-based column hiding - instant with no API calls */}
      {hiddenColumnsStyle && <style dangerouslySetInnerHTML={{ __html: hiddenColumnsStyle }} />}
      
      <TableToolbar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search static info..."
        groupByColumn={groupByColumn}
        onGroupByChange={setGroupByColumn}
        groupableColumns={GROUPABLE_COLUMNS}
        selectedCount={selectedCount}
        onDeleteSelected={handleDeleteSelected}
        deleteLabel="Delete"
        allColumns={ALL_COLUMNS}
        hiddenColumns={hiddenColumns}
        onHiddenColumnsChange={setHiddenColumns}
        filterColumns={FILTER_COLUMNS}
        filters={filters}
        onFiltersChange={setFilters}
      />

      <div id={`table-${tableId}`} ref={tableRef} className="border rounded-lg" style={{ minWidth: 'max-content' }} />

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

      {/* Entity Editor Dialog */}
      {expandedInfo && (
        <EntityEditorDialog
          isOpen={true}
          onClose={() => setExpandedInfo(null)}
          title={`Edit: ${expandedInfo.key}`}
          entityType="static_info"
          entityId={expandedInfo.id}
          data={expandedInfo}
          fields={STATIC_INFO_FIELDS}
          onUpdate={async (infoId, field, value) => {
            if (onUpdate) {
              await onUpdate(infoId, field, value);
            }
            setExpandedInfo((prev) => prev ? { ...prev, [field]: value } : null);
          }}
        />
      )}
    </div>
  );
}
