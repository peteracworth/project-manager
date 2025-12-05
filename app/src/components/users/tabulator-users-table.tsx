"use client";

import { useState, useEffect, useMemo } from "react";
import { ColumnDefinition } from "tabulator-tables";
import { User } from "@/types/database";
import { useTabulatorTable } from "@/hooks/use-tabulator-table";
import { TableToolbar, GroupableColumn } from "@/components/shared";

import "tabulator-tables/dist/css/tabulator.min.css";

interface TabulatorUsersTableProps {
  users: User[];
  onUpdate?: (userId: string, field: string, value: any) => Promise<void>;
}

const ROLE_OPTIONS = ["admin", "member", "vendor"];
const CONTACT_TYPE_OPTIONS = ["Employee", "Contractor", "Vendor", "Client", "Other"];

const GROUPABLE_COLUMNS: GroupableColumn[] = [
  { value: "none", label: "No Grouping" },
  { value: "role", label: "Role" },
  { value: "contact_type", label: "Contact Type" },
  { value: "service_type", label: "Service Type" },
];

const COLUMNS: ColumnDefinition[] = [
  {
    title: "Name",
    field: "name",
    width: 200,
    editor: "input",
    headerFilter: "input",
    frozen: true,
  },
  {
    title: "Email",
    field: "email",
    width: 250,
    editor: "input",
    headerFilter: "input",
  },
  {
    title: "Phone",
    field: "phone",
    width: 150,
    editor: "input",
    headerFilter: "input",
  },
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
      const colors: Record<string, string> = {
        admin: "#9333ea",
        member: "#3b82f6",
        vendor: "#22c55e",
      };
      const color = colors[value] || "#6b7280";
      return `<span style="background: ${color}20; color: ${color}; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 500;">${value}</span>`;
    },
  },
  {
    title: "Service Type",
    field: "service_type",
    width: 180,
    editor: "input",
    headerFilter: "input",
  },
];

export function TabulatorUsersTable({ users, onUpdate }: TabulatorUsersTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [groupByColumn, setGroupByColumn] = useState("none");

  const tableData = useMemo(
    () =>
      users.map((user) => ({
        id: user.id,
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        contact_type: user.contact_type || "",
        role: user.role || "",
        service_type: user.service_type || "",
      })),
    [users]
  );

  const { tableRef, setFilter, clearFilter, setGroupBy } = useTabulatorTable({
    data: tableData,
    columns: COLUMNS,
    onCellEdited: onUpdate,
  });

  // Handle search filter
  useEffect(() => {
    if (searchTerm) {
      setFilter(
        [
          { field: "name", type: "like", value: searchTerm },
          { field: "email", type: "like", value: searchTerm },
          { field: "phone", type: "like", value: searchTerm },
          { field: "contact_type", type: "like", value: searchTerm },
          { field: "role", type: "like", value: searchTerm },
          { field: "service_type", type: "like", value: searchTerm },
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

  return (
    <div className="space-y-4">
      <TableToolbar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search users..."
        groupByColumn={groupByColumn}
        onGroupByChange={setGroupByColumn}
        groupableColumns={GROUPABLE_COLUMNS}
      />

      <div ref={tableRef} className="border rounded-lg overflow-hidden" />

      <div className="text-sm text-gray-500">{users.length} user(s) total</div>
    </div>
  );
}
