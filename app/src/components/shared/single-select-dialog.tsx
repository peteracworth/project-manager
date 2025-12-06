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
  const [searchTerm, setSearchTerm] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setSelected(selectedValue);
      setSearchTerm("");
    }
  }, [open, selectedValue]);

  const handleSave = async () => {
    // If user typed something that doesn't exist, use that as new value
    const valueToSave = searchTerm.trim() && allowCreate && !options.includes(searchTerm.trim()) 
      ? searchTerm.trim() 
      : selected;
    
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
    setSearchTerm(option); // Show selected in search box
  };

  // Filter and sort options based on search term
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) {
      return options;
    }
    
    const search = searchTerm.toLowerCase();
    
    return options
      .filter((opt) => opt.toLowerCase().includes(search))
      .sort((a, b) => {
        const aLower = a.toLowerCase();
        const bLower = b.toLowerCase();
        
        // Exact match first
        if (aLower === search) return -1;
        if (bLower === search) return 1;
        
        // Starts with next
        if (aLower.startsWith(search) && !bLower.startsWith(search)) return -1;
        if (bLower.startsWith(search) && !aLower.startsWith(search)) return 1;
        
        // Then alphabetical
        return aLower.localeCompare(bLower);
      });
  }, [options, searchTerm]);

  const currentSelection = searchTerm.trim() || selected;
  const isNewValue = allowCreate && searchTerm.trim() && !options.includes(searchTerm.trim());

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search/Type Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder={allowCreate ? "Search or type new value..." : "Search..."}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                // Clear selection if typing something new
                if (e.target.value && !options.includes(e.target.value)) {
                  setSelected("");
                }
              }}
              className="pl-10"
              autoFocus
            />
          </div>

          {/* Current selection display */}
          {currentSelection && (
            <div className={`p-3 rounded-lg border ${isNewValue ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
              <div className={`text-sm font-medium ${isNewValue ? 'text-green-900' : 'text-blue-900'}`}>
                {isNewValue ? `New value: ${currentSelection}` : `Selected: ${currentSelection}`}
              </div>
            </div>
          )}

          {/* Options list */}
          {filteredOptions.length > 0 && (
            <div className="max-h-48 overflow-y-auto border rounded-lg">
              {filteredOptions.map((option) => (
                <div
                  key={option}
                  className={`flex items-center space-x-2 p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 ${
                    selected === option ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => handleOptionSelect(option)}
                >
                  <input
                    type="radio"
                    checked={selected === option}
                    onChange={() => handleOptionSelect(option)}
                    className="cursor-pointer"
                  />
                  <span className="text-sm">{option}</span>
                </div>
              ))}
            </div>
          )}

          {/* No matches message */}
          {searchTerm && filteredOptions.length === 0 && !allowCreate && (
            <div className="p-4 text-center text-gray-500 text-sm border rounded-lg">
              No matches found
            </div>
          )}

          {/* Create new hint */}
          {searchTerm && filteredOptions.length === 0 && allowCreate && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
              Press Save to create "{searchTerm.trim()}" as a new value
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
