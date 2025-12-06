"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export interface SelectOption {
  id: string;
  label: string;
  sublabel?: string;
}

interface MultiSelectDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  options: SelectOption[];
  selectedIds: string[];
  onSave: (selectedIds: string[]) => Promise<void>;
  allowCreate?: boolean;
  createPlaceholder?: string;
  excludeIds?: string[];
}

export function MultiSelectDialog({
  open,
  onClose,
  title,
  options,
  selectedIds,
  onSave,
  allowCreate = false,
  createPlaceholder = "Add new...",
  excludeIds = [],
}: MultiSelectDialogProps) {
  const [selected, setSelected] = useState<string[]>(selectedIds);
  const [newItemInput, setNewItemInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSelected(selectedIds);
    setSearchTerm("");
  }, [selectedIds, open]);

  const toggleItem = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const addNewItem = () => {
    const trimmed = newItemInput.trim();
    if (trimmed && !selected.includes(trimmed)) {
      setSelected((prev) => [...prev, trimmed]);
      setNewItemInput("");
    }
  };

  const removeItem = (id: string) => {
    setSelected((prev) => prev.filter((i) => i !== id));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(selected);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addNewItem();
    }
  };

  // Filter options based on search term and sort matches to top
  const filteredOptions = useMemo(() => {
    const available = options.filter((opt) => !excludeIds.includes(opt.id));
    
    if (!searchTerm.trim()) {
      return available;
    }
    
    const search = searchTerm.toLowerCase();
    
    // Filter and sort: exact matches first, then starts with, then contains
    return available
      .filter((opt) => 
        opt.label.toLowerCase().includes(search) ||
        opt.sublabel?.toLowerCase().includes(search)
      )
      .sort((a, b) => {
        const aLabel = a.label.toLowerCase();
        const bLabel = b.label.toLowerCase();
        
        // Exact match first
        if (aLabel === search) return -1;
        if (bLabel === search) return 1;
        
        // Starts with next
        if (aLabel.startsWith(search) && !bLabel.startsWith(search)) return -1;
        if (bLabel.startsWith(search) && !aLabel.startsWith(search)) return 1;
        
        // Then alphabetical
        return aLabel.localeCompare(bLabel);
      });
  }, [options, excludeIds, searchTerm]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search..."
            className="pl-10"
            autoFocus
          />
        </div>

        {/* Selected Items */}
        {selected.length > 0 && (
          <div className="mb-2">
            <div className="text-sm font-medium mb-2">Selected:</div>
            <div className="flex flex-wrap gap-2">
              {selected.map((id) => {
                const option = options.find((o) => o.id === id);
                const label = option?.label || id;
                return (
                  <div
                    key={id}
                    className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm"
                  >
                    <span>{label}</span>
                    <button
                      onClick={() => removeItem(id)}
                      className="hover:bg-indigo-200 rounded-full w-4 h-4 flex items-center justify-center"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Add New Item */}
        {allowCreate && (
          <div className="mb-2">
            <div className="text-sm font-medium mb-2">Add New:</div>
            <div className="flex gap-2">
              <Input
                value={newItemInput}
                onChange={(e) => setNewItemInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={createPlaceholder}
                className="flex-1"
              />
              <Button onClick={addNewItem} disabled={!newItemInput.trim()}>
                Add
              </Button>
            </div>
          </div>
        )}

        {/* Options List */}
        <div className="max-h-64 overflow-y-auto border rounded-lg">
          <div className="space-y-0">
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                {searchTerm ? "No matches found" : "No options available"}
              </div>
            ) : (
              filteredOptions.map((option) => (
                <div
                  key={option.id}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                  onClick={() => toggleItem(option.id)}
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(option.id)}
                    onChange={() => {}}
                    className="h-4 w-4"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{option.label}</div>
                    {option.sublabel && (
                      <div className="text-xs text-gray-500 truncate">{option.sublabel}</div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
