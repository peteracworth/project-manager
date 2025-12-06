"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from "react";
import { FilterCondition } from "@/components/shared/filter-builder";

export interface ColumnConfig {
  field: string;
  width?: number;
}

export interface SortConfig {
  column: string;
  dir: "asc" | "desc";
}

export interface SavedView {
  id: string;
  name: string;
  table_name: string;
  view_type: string;
  filters: FilterCondition[];
  group_by: string | null;
  search_term: string | null;
  hidden_columns: string[];
  column_order: string[];
  column_widths: Record<string, number>;
  sort_config: SortConfig[];
  created_at: string;
  updated_at: string;
}

export interface ViewState {
  tableName: string;
  viewType: string;
  filters: FilterCondition[];
  groupBy: string | null;
  searchTerm: string;
  hiddenColumns: string[];
  columnOrder: string[];
  columnWidths: Record<string, number>;
  sortConfig: SortConfig[];
}

interface ViewContextType {
  // Current view state
  currentView: ViewState;
  setCurrentView: (view: Partial<ViewState>) => void;
  
  // Saved views
  savedViews: SavedView[];
  loadSavedViews: () => Promise<void>;
  saveCurrentView: (name: string) => Promise<SavedView | null>;
  deleteSavedView: (id: string) => Promise<void>;
  applyView: (view: SavedView) => void;
  
  // Loading state
  loading: boolean;
}

const ViewContext = createContext<ViewContextType | undefined>(undefined);

export function ViewProvider({ children }: { children: ReactNode }) {
  const [currentView, setCurrentViewState] = useState<ViewState>({
    tableName: "projects",
    viewType: "table",
    filters: [],
    groupBy: null,
    searchTerm: "",
    hiddenColumns: [],
    columnOrder: [],
    columnWidths: {},
    sortConfig: [],
  });
  
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [loading, setLoading] = useState(false);

  // Load saved views on mount
  useEffect(() => {
    loadSavedViews();
  }, []);

  const loadSavedViews = async () => {
    try {
      const response = await fetch("/api/saved-views");
      if (response.ok) {
        const data = await response.json();
        setSavedViews(data.views || []);
      }
    } catch (error) {
      console.error("Failed to load saved views:", error);
    }
  };

  const setCurrentView = useCallback((view: Partial<ViewState>) => {
    setCurrentViewState((prev) => ({ ...prev, ...view }));
  }, []);

  const saveCurrentView = async (name: string): Promise<SavedView | null> => {
    setLoading(true);
    try {
      const response = await fetch("/api/saved-views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          table_name: currentView.tableName,
          view_type: currentView.viewType,
          filters: currentView.filters,
          group_by: currentView.groupBy,
          search_term: currentView.searchTerm || null,
          hidden_columns: currentView.hiddenColumns || [],
          column_order: currentView.columnOrder || [],
          column_widths: currentView.columnWidths || {},
          sort_config: currentView.sortConfig || [],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSavedViews((prev) => [data.view, ...prev]);
        return data.view;
      } else {
        const errorData = await response.json();
        const errorMsg = errorData.error || "Unknown error";
        console.error("Failed to save view:", errorMsg);
        alert(`Failed to save view: ${errorMsg}\n\nMake sure you've run the saved_views migration in Supabase.`);
        return null;
      }
    } catch (error: any) {
      console.error("Failed to save view:", error);
      alert(`Failed to save view: ${error.message || "Network error"}`);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const deleteSavedView = async (id: string) => {
    try {
      const response = await fetch(`/api/saved-views/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setSavedViews((prev) => prev.filter((v) => v.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete view:", error);
    }
  };

  const applyView = useCallback((view: SavedView) => {
    setCurrentViewState({
      tableName: view.table_name,
      viewType: view.view_type,
      filters: view.filters || [],
      groupBy: view.group_by,
      searchTerm: view.search_term || "",
      hiddenColumns: view.hidden_columns || [],
      columnOrder: view.column_order || [],
      columnWidths: view.column_widths || {},
      sortConfig: view.sort_config || [],
    });
  }, []);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      currentView,
      setCurrentView,
      savedViews,
      loadSavedViews,
      saveCurrentView,
      deleteSavedView,
      applyView,
      loading,
    }),
    [currentView, setCurrentView, savedViews, saveCurrentView, applyView, loading]
  );

  return (
    <ViewContext.Provider value={contextValue}>
      {children}
    </ViewContext.Provider>
  );
}

export function useView() {
  const context = useContext(ViewContext);
  if (context === undefined) {
    throw new Error("useView must be used within a ViewProvider");
  }
  return context;
}

