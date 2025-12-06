"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Filter, Plus, X } from "lucide-react";

export interface FilterColumn {
  field: string;
  label: string;
  options?: string[]; // For choice/select fields
}

export interface FilterCondition {
  id: string;
  column: string;
  operator: string;
  value: string;
}

const OPERATORS = [
  { value: "like", label: "contains" },
  { value: "notlike", label: "does not contain" },
  { value: "=", label: "is" },
  { value: "!=", label: "is not" },
  { value: "empty", label: "is empty" },
  { value: "notempty", label: "is not empty" },
];

interface FilterBuilderProps {
  columns: FilterColumn[];
  filters: FilterCondition[];
  onFiltersChange: (filters: FilterCondition[]) => void;
}

export function FilterBuilder({ columns, filters, onFiltersChange }: FilterBuilderProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newFilter, setNewFilter] = useState<Partial<FilterCondition>>({
    column: "",
    operator: "like",
    value: "",
  });

  const handleAddFilter = () => {
    if (!newFilter.column) return;
    
    // For empty/notempty operators, value is not needed
    const needsValue = !["empty", "notempty"].includes(newFilter.operator || "");
    if (needsValue && !newFilter.value) return;

    const filter: FilterCondition = {
      id: `filter-${Date.now()}`,
      column: newFilter.column,
      operator: newFilter.operator || "like",
      value: newFilter.value || "",
    };

    onFiltersChange([...filters, filter]);
    setNewFilter({ column: "", operator: "like", value: "" });
    setIsAdding(false);
  };

  const handleRemoveFilter = (filterId: string) => {
    onFiltersChange(filters.filter((f) => f.id !== filterId));
  };

  const getColumnLabel = (field: string) => {
    return columns.find((c) => c.field === field)?.label || field;
  };

  const getOperatorLabel = (op: string) => {
    return OPERATORS.find((o) => o.value === op)?.label || op;
  };

  const getColumnOptions = (field: string) => {
    return columns.find((c) => c.field === field)?.options;
  };

  const needsValue = !["empty", "notempty"].includes(newFilter.operator || "");
  const selectedColumnOptions = newFilter.column ? getColumnOptions(newFilter.column) : undefined;

  return (
    <div className="space-y-2">
      {/* Active Filters */}
      {filters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <div
              key={filter.id}
              className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5 text-sm"
            >
              <span className="font-medium text-blue-700">{getColumnLabel(filter.column)}</span>
              <span className="text-blue-600">{getOperatorLabel(filter.operator)}</span>
              {filter.value && (
                <span className="text-blue-800 font-medium">"{filter.value}"</span>
              )}
              <button
                onClick={() => handleRemoveFilter(filter.id)}
                className="ml-1 text-blue-400 hover:text-blue-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Filter Form */}
      {isAdding ? (
        <div className="flex items-center gap-2 p-3 bg-gray-50 border rounded-lg">
          <span className="text-sm text-gray-600">Where</span>
          
          {/* Column Select */}
          <Select
            value={newFilter.column}
            onValueChange={(value) => setNewFilter({ ...newFilter, column: value, value: "" })}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select column" />
            </SelectTrigger>
            <SelectContent>
              {columns.map((col) => (
                <SelectItem key={col.field} value={col.field}>
                  {col.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Operator Select */}
          <Select
            value={newFilter.operator}
            onValueChange={(value) => setNewFilter({ ...newFilter, operator: value })}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select operator" />
            </SelectTrigger>
            <SelectContent>
              {OPERATORS.map((op) => (
                <SelectItem key={op.value} value={op.value}>
                  {op.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Value Input - Show dropdown for choice fields, text input otherwise */}
          {needsValue && (
            selectedColumnOptions ? (
              <Select
                value={newFilter.value || ""}
                onValueChange={(value) => setNewFilter({ ...newFilter, value })}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select value" />
                </SelectTrigger>
                <SelectContent>
                  {selectedColumnOptions
                    .filter((opt) => opt && opt.trim() !== "")
                    .filter((opt, idx, arr) => arr.indexOf(opt) === idx)
                    .map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={newFilter.value || ""}
                onChange={(e) => setNewFilter({ ...newFilter, value: e.target.value })}
                placeholder="Enter a value"
                className="w-[200px]"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleAddFilter();
                  }
                }}
              />
            )
          )}

          {/* Action Buttons */}
          <Button size="sm" onClick={handleAddFilter}>
            Apply
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setIsAdding(false);
              setNewFilter({ column: "", operator: "like", value: "" });
            }}
          >
            Cancel
          </Button>
        </div>
      )       : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsAdding(true)}
          className="gap-1"
        >
          <Plus className="w-4 h-4" />
          Add filter
        </Button>
      )}
    </div>
  );
}

// Inline version for horizontal toolbar layout
export function InlineFilterBuilder({ columns, filters, onFiltersChange }: FilterBuilderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newFilter, setNewFilter] = useState<Partial<FilterCondition>>({
    column: "",
    operator: "like",
    value: "",
  });

  const handleAddFilter = () => {
    if (!newFilter.column) return;
    
    const needsValue = !["empty", "notempty"].includes(newFilter.operator || "");
    if (needsValue && !newFilter.value) return;

    const filter: FilterCondition = {
      id: `filter-${Date.now()}`,
      column: newFilter.column,
      operator: newFilter.operator || "like",
      value: newFilter.value || "",
    };

    onFiltersChange([...filters, filter]);
    setNewFilter({ column: "", operator: "like", value: "" });
    setIsOpen(false);
  };

  const getColumnOptions = (field: string) => {
    return columns.find((c) => c.field === field)?.options;
  };

  const needsValue = !["empty", "notempty"].includes(newFilter.operator || "");
  const selectedColumnOptions = newFilter.column ? getColumnOptions(newFilter.column) : undefined;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Filter className="w-4 h-4" />
          Add filter
          {filters.length > 0 && (
            <span className="bg-blue-500 text-white text-xs rounded-full px-1.5 py-0.5 ml-1">
              {filters.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="start">
        <div className="space-y-3">
          <div className="text-sm font-medium">Add Filter</div>
          
          <div className="flex flex-col gap-2">
            {/* Column Select */}
            <Select
              value={newFilter.column}
              onValueChange={(value) => setNewFilter({ ...newFilter, column: value, value: "" })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select column" />
              </SelectTrigger>
              <SelectContent>
                {columns.map((col) => (
                  <SelectItem key={col.field} value={col.field}>
                    {col.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Operator Select */}
            <Select
              value={newFilter.operator}
              onValueChange={(value) => setNewFilter({ ...newFilter, operator: value })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select operator" />
              </SelectTrigger>
              <SelectContent>
                {OPERATORS.map((op) => (
                  <SelectItem key={op.value} value={op.value}>
                    {op.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Value Input */}
            {needsValue && (
              selectedColumnOptions ? (
                <Select
                  value={newFilter.value || ""}
                  onValueChange={(value) => setNewFilter({ ...newFilter, value })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select value" />
                  </SelectTrigger>
                <SelectContent>
                  {selectedColumnOptions
                    .filter((opt) => opt && opt.trim() !== "")
                    .filter((opt, idx, arr) => arr.indexOf(opt) === idx)
                    .map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={newFilter.value || ""}
                onChange={(e) => setNewFilter({ ...newFilter, value: e.target.value })}
                placeholder="Enter a value"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddFilter();
                }}
              />
            )
          )}
        </div>

        <div className="flex gap-2 justify-end">
          <Button size="sm" variant="ghost" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleAddFilter}>
            Apply
          </Button>
        </div>
      </div>
    </PopoverContent>
  </Popover>
  );
}

