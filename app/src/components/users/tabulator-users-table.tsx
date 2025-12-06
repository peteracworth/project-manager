"use client";

import { useState, useEffect, useMemo, useCallback, useRef, useId } from "react";
import { ColumnDefinition } from "tabulator-tables";
import { User } from "@/types/database";
import { useTabulatorTable } from "@/hooks/use-tabulator-table";
import { TableToolbar, GroupableColumn, createSimpleExpandColumn, EntityEditorDialog, FieldDefinition, FilterColumn, FilterCondition, ColumnDef } from "@/components/shared";
import { useView } from "@/contexts/view-context";

import "tabulator-tables/dist/css/tabulator.min.css";

interface TabulatorUsersTableProps {
  users: User[];
  onUpdate?: (userId: string, field: string, value: any) => Promise<void>;
}

const ROLE_OPTIONS = ["Builder", "Designer", "Interiors", "Owner", "Permits", "member", "project manager", "vendor"];
const CONTACT_TYPE_OPTIONS = ["Team", "Vendor", "Contractor", "Subcontractor", "Other"];

const GROUPABLE_COLUMNS: GroupableColumn[] = [
  { value: "none", label: "No Grouping" },
  { value: "role", label: "Role" },
  { value: "contact_type", label: "Contact Type" },
  { value: "service_type", label: "Service Type" },
  { value: "location", label: "Location" },
];

const FILTER_COLUMNS: FilterColumn[] = [
  { field: "name", label: "Name" },
  { field: "contact_name", label: "Contact Name" },
  { field: "email", label: "Email" },
  { field: "phone", label: "Phone" },
  { field: "contact_type", label: "Contact Type", options: CONTACT_TYPE_OPTIONS },
  { field: "role", label: "Role", options: ROLE_OPTIONS },
  { field: "service_type", label: "Service Type" },
  { field: "location", label: "Location" },
  { field: "notes", label: "Notes" },
];

// All columns for visibility dropdown
const ALL_COLUMNS: ColumnDef[] = [
  { field: "name", label: "Name" },
  { field: "contact_name", label: "Contact Name" },
  { field: "email", label: "Email" },
  { field: "phone", label: "Phone" },
  { field: "contact_type", label: "Contact Type" },
  { field: "role", label: "Role" },
  { field: "service_type", label: "Service Type" },
  { field: "website", label: "Website" },
  { field: "license_number", label: "License #" },
  { field: "location", label: "Location" },
  { field: "product_types", label: "Product Types" },
  { field: "item_types", label: "Item Types" },
  { field: "notes", label: "Notes" },
];

// Field definitions for the entity editor dialog
const USER_FIELDS: FieldDefinition[] = [
  { name: "name", label: "Name", type: "text", placeholder: "Contact/Company name" },
  { name: "contact_name", label: "Contact Person", type: "text", placeholder: "Person's name at company", width: "half" },
  { name: "email", label: "Email", type: "email", placeholder: "email@example.com", width: "half" },
  { name: "phone", label: "Phone", type: "text", placeholder: "Phone number", width: "half" },
  { name: "contact_type", label: "Contact Type", type: "select", options: CONTACT_TYPE_OPTIONS, width: "half" },
  { name: "role", label: "Role", type: "select", options: ROLE_OPTIONS, width: "half" },
  { name: "service_type", label: "Service Type", type: "text", placeholder: "Type of service provided", width: "half" },
  { name: "website", label: "Website", type: "url", placeholder: "https://..." },
  { name: "license_number", label: "License #", type: "text", placeholder: "Contractor license number", width: "half" },
  { name: "location", label: "Location", type: "text", placeholder: "Address or location", width: "half" },
  { name: "product_types", label: "Product Types", type: "tags", placeholder: "Add product type and press Enter" },
  { name: "item_types", label: "Item Types", type: "tags", placeholder: "Add item type and press Enter" },
  { name: "notes", label: "Notes", type: "textarea", placeholder: "Additional notes..." },
];

export function TabulatorUsersTable({ users, onUpdate }: TabulatorUsersTableProps) {
  const { currentView, setCurrentView } = useView();
  const [selectedCount, setSelectedCount] = useState(0);
  const [expandedUser, setExpandedUser] = useState<Record<string, any> | null>(null);

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
    setCurrentView({ tableName: "users" });
  }, [setCurrentView]);

  // When context changes (e.g., user selects a saved view), update local state
  useEffect(() => {
    if (isSyncingToContextRef.current) {
      isSyncingToContextRef.current = false;
      return;
    }
    
    if (currentView.tableName !== "users") return;
    
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
      users.map((user) => ({
        id: user.id,
        name: user.name || "",
        contact_name: (user as any).contact_name || "",
        email: user.email || "",
        phone: user.phone || "",
        contact_type: user.contact_type || "",
        role: user.role || "",
        service_type: user.service_type || "",
        website: (user as any).website || "",
        license_number: (user as any).license_number || "",
        location: (user as any).location || "",
        product_types: (user as any).product_types || [],
        item_types: (user as any).item_types || [],
        notes: (user as any).notes || "",
      })),
    [users]
  );

  // Column definitions with expand column
  const columns: ColumnDefinition[] = useMemo(() => [
    createSimpleExpandColumn((rowData) => setExpandedUser(rowData)),
    {
      title: "Name",
      field: "name",
      width: 200,
      editor: "input",
      headerFilter: "input",
      frozen: true,
    },
    { title: "Contact Name", field: "contact_name", width: 180, editor: "input", headerFilter: "input" },
    { title: "Email", field: "email", width: 250, editor: "input", headerFilter: "input" },
    { title: "Phone", field: "phone", width: 150, editor: "input", headerFilter: "input" },
    {
      title: "Contact Type",
      field: "contact_type",
      width: 150,
      editor: "list",
      editorParams: { values: CONTACT_TYPE_OPTIONS },
      headerFilter: "list",
      headerFilterParams: { values: CONTACT_TYPE_OPTIONS },
    },
    {
      title: "Role",
      field: "role",
      width: 120,
      editor: "list",
      editorParams: { values: ROLE_OPTIONS },
      headerFilter: "list",
      headerFilterParams: { values: ROLE_OPTIONS },
      formatter: (cell) => {
        const value = cell.getValue();
        const colors: Record<string, string> = { admin: "#9333ea", member: "#3b82f6", vendor: "#22c55e" };
        const color = colors[value] || "#6b7280";
        return `<span style="background: ${color}20; color: ${color}; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 500;">${value}</span>`;
      },
    },
    { title: "Service Type", field: "service_type", width: 180, editor: "input", headerFilter: "input" },
    {
      title: "Website",
      field: "website",
      width: 180,
      editor: "input",
      headerFilter: "input",
      formatter: (cell) => {
        const value = cell.getValue();
        if (!value) return "";
        return `<a href="${value}" target="_blank" rel="noopener noreferrer" style="color: #3b82f6; text-decoration: underline;">View Site</a>`;
      },
    },
    { title: "License #", field: "license_number", width: 150, editor: "input", headerFilter: "input" },
    { title: "Location", field: "location", width: 200, editor: "input", headerFilter: "input" },
    {
      title: "Product Types",
      field: "product_types",
      width: 200,
      headerFilter: "input",
      formatter: (cell) => {
        const value = cell.getValue();
        if (!value || value.length === 0) return "";
        return value.map((type: string) => `<span style="background: #e0e7ff; color: #4338ca; padding: 2px 6px; border-radius: 4px; font-size: 11px; margin-right: 4px;">${type}</span>`).join("");
      },
    },
    {
      title: "Item Types",
      field: "item_types",
      width: 200,
      headerFilter: "input",
      formatter: (cell) => {
        const value = cell.getValue();
        if (!value || value.length === 0) return "";
        return value.map((type: string) => `<span style="background: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 4px; font-size: 11px; margin-right: 4px;">${type}</span>`).join("");
      },
    },
    { title: "Notes", field: "notes", width: 300, editor: "textarea", headerFilter: "input" },
  ], []);

  const tableId = useId().replace(/:/g, '');
  
  const { tableRef, setFilter, clearFilter, setGroupBy, getSelectedRows, deselectAll, getInstance } = useTabulatorTable({
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

  // Handle delete selected users
  const handleDeleteSelected = async () => {
    const selected = getSelectedRows();
    if (selected.length === 0) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selected.length} contact(s)? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      const deletePromises = selected.map((row) =>
        fetch(`/api/users/${row.id}`, { method: "DELETE" })
      );

      const results = await Promise.all(deletePromises);
      const failedCount = results.filter((r) => !r.ok).length;

      if (failedCount > 0) {
        alert(`${failedCount} contact(s) failed to delete.`);
      }

      deselectAll();
      setSelectedCount(0);
      
      // Trigger page refresh
      window.location.reload();
    } catch (error) {
      console.error("Failed to delete contacts:", error);
      alert("Failed to delete contacts. Please try again.");
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
          (rowData.name || "").toLowerCase().includes(searchLower) ||
          (rowData.contact_name || "").toLowerCase().includes(searchLower) ||
          (rowData.email || "").toLowerCase().includes(searchLower) ||
          (rowData.phone || "").toLowerCase().includes(searchLower) ||
          (rowData.contact_type || "").toLowerCase().includes(searchLower) ||
          (rowData.role || "").toLowerCase().includes(searchLower) ||
          (rowData.service_type || "").toLowerCase().includes(searchLower) ||
          (rowData.location || "").toLowerCase().includes(searchLower) ||
          (rowData.notes || "").toLowerCase().includes(searchLower);
        
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

  // Handle update from editor dialog
  const handleEditorUpdate = async (userId: string, field: string, value: any) => {
    if (onUpdate) {
      await onUpdate(userId, field, value);
    }
    // Update local expanded user data
    if (expandedUser && expandedUser.id === userId) {
      setExpandedUser((prev) => prev ? { ...prev, [field]: value } : null);
    }
  };

  return (
    <div className="space-y-4">
      {/* CSS-based column hiding - instant with no API calls */}
      {hiddenColumnsStyle && <style dangerouslySetInnerHTML={{ __html: hiddenColumnsStyle }} />}
      
      <TableToolbar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search users..."
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

      <div className="text-sm text-gray-500">{users.length} user(s) total</div>

      {/* Entity Editor Dialog */}
      {expandedUser && (
        <EntityEditorDialog
          isOpen={true}
          onClose={() => setExpandedUser(null)}
          title={`Edit Contact: ${expandedUser.name}`}
          entityType="user"
          entityId={expandedUser.id}
          data={expandedUser}
          fields={USER_FIELDS}
          onUpdate={handleEditorUpdate}
        />
      )}
    </div>
  );
}
