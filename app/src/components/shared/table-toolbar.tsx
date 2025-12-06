"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Trash2 } from "lucide-react";
import { InlineFilterBuilder, FilterColumn, FilterCondition } from "./filter-builder";
import { ColumnVisibility, ColumnDef } from "./column-visibility";

export interface GroupableColumn {
  value: string;
  label: string;
}

interface TableToolbarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  groupByColumn: string;
  onGroupByChange: (value: string) => void;
  groupableColumns: GroupableColumn[];
  selectedCount?: number;
  onDeleteSelected?: () => void;
  deleteLabel?: string;
  // Filter builder props
  filterColumns?: FilterColumn[];
  filters?: FilterCondition[];
  onFiltersChange?: (filters: FilterCondition[]) => void;
  // Column visibility props
  allColumns?: ColumnDef[];
  hiddenColumns?: string[];
  onHiddenColumnsChange?: (hiddenColumns: string[]) => void;
}

export function TableToolbar({
  searchTerm,
  onSearchChange,
  searchPlaceholder = "Search...",
  groupByColumn,
  onGroupByChange,
  groupableColumns,
  selectedCount = 0,
  onDeleteSelected,
  deleteLabel = "Delete",
  filterColumns,
  filters = [],
  onFiltersChange,
  allColumns,
  hiddenColumns = [],
  onHiddenColumnsChange,
}: TableToolbarProps) {
  const operatorLabels: Record<string, string> = {
    like: "contains",
    notlike: "does not contain",
    "=": "is",
    "!=": "is not",
    empty: "is empty",
    notempty: "is not empty",
  };

  return (
    <div className="flex items-center gap-4 flex-wrap">
      <div className="relative w-64">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder={searchPlaceholder}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600 whitespace-nowrap">Group by:</span>
        <Select value={groupByColumn} onValueChange={onGroupByChange}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="No grouping" />
          </SelectTrigger>
          <SelectContent>
            {groupableColumns.map((col) => (
              <SelectItem key={col.value} value={col.value}>
                {col.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Column visibility dropdown */}
      {allColumns && onHiddenColumnsChange && (
        <ColumnVisibility
          columns={allColumns}
          hiddenColumns={hiddenColumns}
          onHiddenColumnsChange={onHiddenColumnsChange}
        />
      )}

      {/* Inline filter builder + active filter pills */}
      {filterColumns && onFiltersChange && (
        <div className="flex items-center gap-2 flex-wrap">
          <InlineFilterBuilder
            columns={filterColumns}
            filters={filters}
            onFiltersChange={onFiltersChange}
          />
          
          {/* Active filter pills - inline after the button */}
          {filters.map((filter) => {
            const columnLabel = filterColumns.find(c => c.field === filter.column)?.label || filter.column;
            return (
              <div
                key={filter.id}
                className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded px-2 py-1 text-xs"
              >
                <span className="font-medium text-blue-700">{columnLabel}</span>
                <span className="text-blue-600">{operatorLabels[filter.operator] || filter.operator}</span>
                {filter.value && <span className="text-blue-800">"{filter.value}"</span>}
                <button
                  onClick={() => onFiltersChange(filters.filter(f => f.id !== filter.id))}
                  className="ml-1 text-blue-400 hover:text-blue-600"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}

      {selectedCount > 0 && onDeleteSelected && (
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-sm text-gray-600">
            {selectedCount} selected
          </span>
          <Button
            variant="destructive"
            size="sm"
            onClick={onDeleteSelected}
            className="flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            {deleteLabel} ({selectedCount})
          </Button>
        </div>
      )}
    </div>
  );
}


