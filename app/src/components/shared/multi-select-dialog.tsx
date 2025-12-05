"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSelected(selectedIds);
  }, [selectedIds]);

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

  const filteredOptions = options.filter((opt) => !excludeIds.includes(opt.id));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {/* Selected Items */}
        {selected.length > 0 && (
          <div className="mb-4">
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
          <div className="mb-4">
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
        <div className="max-h-64 overflow-y-auto">
          <div className="space-y-1">
            {filteredOptions.map((option) => (
              <div
                key={option.id}
                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 cursor-pointer rounded"
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
            ))}
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


