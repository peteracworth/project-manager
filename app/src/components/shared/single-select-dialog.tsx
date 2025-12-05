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

interface SingleSelectDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  options: string[];
  selectedValue: string;
  onSave: (value: string) => Promise<void>;
  allowCreate?: boolean;
  createPlaceholder?: string;
}

export function SingleSelectDialog({
  open,
  onClose,
  title,
  options,
  selectedValue,
  onSave,
  allowCreate = true,
  createPlaceholder = "Type a new value...",
}: SingleSelectDialogProps) {
  const [selected, setSelected] = useState(selectedValue);
  const [newValueInput, setNewValueInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setSelected(selectedValue);
      setNewValueInput("");
    }
  }, [open, selectedValue]);

  const handleSave = async () => {
    const valueToSave = newValueInput.trim() || selected;
    if (!valueToSave) return;

    setSaving(true);
    try {
      await onSave(valueToSave);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleOptionSelect = (option: string) => {
    setSelected(option);
    setNewValueInput("");
  };

  const handleNewValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewValueInput(e.target.value);
    setSelected("");
  };

  const currentSelection = newValueInput.trim() || selected;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current selection display */}
          {currentSelection && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-sm font-medium text-blue-900">
                Current selection: {currentSelection}
              </div>
            </div>
          )}

          {/* New value input */}
          {allowCreate && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Add new value</label>
              <Input
                type="text"
                placeholder={createPlaceholder}
                value={newValueInput}
                onChange={handleNewValueChange}
                className="w-full"
              />
            </div>
          )}

          {/* Existing options list */}
          {options.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                {allowCreate ? "Or select from existing" : "Select an option"}
              </label>
              <div className="max-h-48 overflow-y-auto border rounded-lg p-2 space-y-1">
                {options.map((option) => (
                  <div
                    key={option}
                    className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                    onClick={() => handleOptionSelect(option)}
                  >
                    <input
                      type="radio"
                      checked={selected === option && !newValueInput}
                      onChange={() => handleOptionSelect(option)}
                      className="cursor-pointer"
                    />
                    <span className="text-sm">{option}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !currentSelection}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


