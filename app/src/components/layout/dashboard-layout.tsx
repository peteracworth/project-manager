"use client";

import { ReactNode, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Edit2, Check, X, Save, Trash2, LayoutList, Bookmark, Plus } from "lucide-react";
import { useView, SavedView } from "@/contexts/view-context";
import { Button } from "@/components/ui/button";

interface DashboardLayoutProps {
  children: ReactNode;
}

const TABLE_LABELS: Record<string, string> = {
  projects: "Projects",
  users: "Users",
  items: "Items",
  static_info: "Static Info",
};

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { savedViews, saveCurrentView, deleteSavedView, applyView, currentView } = useView();
  
  const [viewName, setViewName] = useState("All Items Flat View");
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(viewName);
  const [saving, setSaving] = useState(false);

  // Load saved view name from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("viewName");
    if (saved) setViewName(saved);
  }, []);

  const handleSaveNameEdit = () => {
    if (editValue.trim()) {
      setViewName(editValue.trim());
      localStorage.setItem("viewName", editValue.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditValue(viewName);
    setIsEditing(false);
  };

  // Save current view directly with current name
  const handleSaveView = async () => {
    if (!viewName.trim()) return;
    
    setSaving(true);
    try {
      await saveCurrentView(viewName.trim());
    } finally {
      setSaving(false);
    }
  };

  // Create a new view with default name based on current table views count
  const handleNewView = async () => {
    const tableLabel = TABLE_LABELS[currentView.tableName] || currentView.tableName;
    const tableViewsCount = savedViews.filter(v => v.table_name === currentView.tableName).length;
    const newName = `${tableLabel} View ${tableViewsCount + 1}`;
    setSaving(true);
    try {
      const saved = await saveCurrentView(newName);
      if (saved) {
        setViewName(newName);
        localStorage.setItem("viewName", newName);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleApplyView = (view: SavedView) => {
    applyView(view);
    // Update the current view name
    setViewName(view.name);
    localStorage.setItem("viewName", view.name);
  };

  const handleDeleteView = async (e: React.MouseEvent, viewId: string) => {
    e.stopPropagation();
    if (confirm("Delete this saved view?")) {
      await deleteSavedView(viewId);
    }
  };

  // Filter saved views for the current table only
  const currentTableViews = savedViews.filter(
    (view) => view.table_name === currentView.tableName
  );

  // Get label for current table
  const currentTableLabel = TABLE_LABELS[currentView.tableName] || currentView.tableName;

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">Project Manager</h1>
        </div>

        {/* Editable View Name with Save Button inline */}
        <div className="p-4 border-b border-gray-200">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Current View</div>
          {isEditing ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="flex-1 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveNameEdit();
                  if (e.key === "Escape") handleCancelEdit();
                }}
              />
              <button
                onClick={handleSaveNameEdit}
                className="p-1 text-green-600 hover:bg-green-50 rounded"
                title="Save name"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={handleCancelEdit}
                className="p-1 text-gray-400 hover:bg-gray-100 rounded"
                title="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setEditValue(viewName);
                  setIsEditing(true);
                }}
                className="group flex items-center gap-2 flex-1 text-left px-3 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors"
              >
                <span className="flex-1 font-medium text-blue-900 text-sm truncate">{viewName}</span>
                <Edit2 className="w-3 h-3 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </button>
              <button
                onClick={handleSaveView}
                disabled={saving}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
                title="Save view"
              >
                <Save className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Saved Views section - filtered by current table */}
        <div className="flex-1 p-4 overflow-y-auto flex flex-col">
          <div className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-wide mb-3">
            <Bookmark className="w-3 h-3" />
            {currentTableLabel} Views
          </div>
          <div className="flex-1">
            {currentTableViews.length === 0 ? (
              <div className="text-sm text-gray-400 italic">No saved views for {currentTableLabel}</div>
            ) : (
              <div className="space-y-1">
                {currentTableViews.map((view) => (
                  <div
                    key={view.id}
                    onClick={() => handleApplyView(view)}
                    className={cn(
                      "group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors",
                      "hover:bg-gray-100"
                    )}
                  >
                    <LayoutList className="w-4 h-4 text-gray-400" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-700 truncate">
                        {view.name}
                      </div>
                      {view.filters && view.filters.length > 0 && (
                        <div className="text-xs text-gray-400">
                          {view.filters.length} filter{view.filters.length > 1 ? 's' : ''}
                          {view.group_by && ` · Grouped`}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={(e) => handleDeleteView(e, view.id)}
                      className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* New View button */}
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2 mt-3"
            onClick={handleNewView}
            disabled={saving}
          >
            <Plus className="w-4 h-4" />
            New View
          </Button>
        </div>

        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
              <span className="text-sm font-medium text-gray-600">U</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">User</p>
              <p className="text-xs text-gray-500 truncate">user@example.com</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-x-auto overflow-y-auto">
        <div className="min-w-max">
          {children}
        </div>
      </main>
    </div>
  );
}
