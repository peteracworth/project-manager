"use client";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

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
}

export function TableToolbar({
  searchTerm,
  onSearchChange,
  searchPlaceholder = "Search...",
  groupByColumn,
  onGroupByChange,
  groupableColumns,
}: TableToolbarProps) {
  return (
    <div className="flex items-center gap-4">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder={searchPlaceholder}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">Group by:</span>
        <Select value={groupByColumn} onValueChange={onGroupByChange}>
          <SelectTrigger className="w-48">
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
    </div>
  );
}


