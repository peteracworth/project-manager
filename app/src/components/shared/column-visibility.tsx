"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { EyeOff, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export interface ColumnDef {
  field: string;
  label: string;
}

interface ColumnVisibilityProps {
  columns: ColumnDef[];
  hiddenColumns: string[];
  onHiddenColumnsChange: (hiddenColumns: string[]) => void;
}

export function ColumnVisibility({
  columns,
  hiddenColumns,
  onHiddenColumnsChange,
}: ColumnVisibilityProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const filteredColumns = columns.filter((col) =>
    col.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const hiddenCount = hiddenColumns.length;

  const toggleColumn = (field: string) => {
    if (hiddenColumns.includes(field)) {
      onHiddenColumnsChange(hiddenColumns.filter((c) => c !== field));
    } else {
      onHiddenColumnsChange([...hiddenColumns, field]);
    }
  };

  const hideAll = () => {
    onHiddenColumnsChange(columns.map((c) => c.field));
  };

  const showAll = () => {
    onHiddenColumnsChange([]);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <EyeOff className="w-4 h-4" />
          {hiddenCount > 0 ? `${hiddenCount} hidden` : "Hide fields"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        {/* Search */}
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Find a field"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>

        {/* Column list */}
        <div className="max-h-80 overflow-y-auto p-1">
          {filteredColumns.map((col) => {
            const isVisible = !hiddenColumns.includes(col.field);
            return (
              <button
                key={col.field}
                onClick={() => toggleColumn(col.field)}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-gray-100 rounded transition-colors"
              >
                <div
                  className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                    isVisible
                      ? "bg-green-600 border-green-600"
                      : "bg-white border-gray-300"
                  }`}
                >
                  {isVisible && (
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
                <span className="flex-1 text-left text-gray-700">{col.label}</span>
              </button>
            );
          })}
        </div>

        {/* Footer actions */}
        <div className="flex border-t">
          <button
            onClick={hideAll}
            className="flex-1 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Hide all
          </button>
          <div className="w-px bg-gray-200" />
          <button
            onClick={showAll}
            className="flex-1 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Show all
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

