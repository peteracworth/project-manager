"use client";

import { useEffect, useLayoutEffect, useRef, useCallback, useMemo } from "react";
import { TabulatorFull as Tabulator, ColumnDefinition } from "tabulator-tables";

export interface UseTabulatorTableOptions<T> {
  data: T[];
  columns: ColumnDefinition[];
  onCellEdited?: (id: string, field: string, value: any) => void;
  height?: string;
  frozenColumns?: boolean;
  rowSelection?: boolean;
  movableRows?: boolean;
  movableColumns?: boolean;
}

export interface UseTabulatorTableReturn {
  tableRef: React.RefObject<HTMLDivElement | null>;
  getInstance: () => Tabulator | null;
  setFilter: (filters: { field: string; type: string; value: string }[], matchType?: "or" | "and") => void;
  clearFilter: () => void;
  setGroupBy: (field: string | false) => void;
  updateRowData: (rowId: string, data: Record<string, any>) => void;
  refreshData: (data: any[]) => void;
  getSelectedRows: () => any[];
  deselectAll: () => void;
}

export function useTabulatorTable<T extends { id: string }>({
  data,
  columns,
  onCellEdited,
  height,
  rowSelection = true,
  movableRows = true,
  movableColumns = true,
}: UseTabulatorTableOptions<T>): UseTabulatorTableReturn {
  const tableRef = useRef<HTMLDivElement | null>(null);
  const tabulatorInstance = useRef<Tabulator | null>(null);
  const isInitializedRef = useRef(false);
  const dataRef = useRef(data);

  // Keep data ref updated
  dataRef.current = data;

  // Initialize table only once
  useLayoutEffect(() => {
    if (isInitializedRef.current) return;
    if (!tableRef.current || !data.length) return;

    const rowHeader = rowSelection
      ? {
          formatter: "rowSelection" as const,
          titleFormatter: "rowSelection" as const,
          headerSort: false,
          resizable: false,
          frozen: true,
          width: 30,
        }
      : undefined;

    const table = new Tabulator(tableRef.current, {
      data: data,
      layout: "fitData", // Changed from fitDataStretch to allow horizontal scrolling
      ...(height && { height }),
      movableRows,
      movableColumns,
      ...(rowHeader && { rowHeader }),
      columns,
    });

    // Handle cell edits
    table.on("cellEdited", (cell) => {
      const field = cell.getField();
      const value = cell.getValue();
      const rowData = cell.getRow().getData();

      if (onCellEdited && rowData.id) {
        onCellEdited(rowData.id, field, value);
      }
    });

    tabulatorInstance.current = table;

    table.on("tableBuilt", () => {
      isInitializedRef.current = true;
    });

    return () => {
      isInitializedRef.current = false;
      if (tabulatorInstance.current) {
        try {
          tabulatorInstance.current.destroy();
        } catch (error) {
          // Ignore destroy errors during cleanup
        }
        tabulatorInstance.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.length > 0]);

  // Update table data when data changes (without recreating the table)
  useEffect(() => {
    if (!isInitializedRef.current) return;

    const instance = tabulatorInstance.current;
    if (!instance) return;

    try {
      if (!tableRef.current) return;
      if (!instance.element || !document.body.contains(instance.element)) return;

      if (typeof instance.setData === "function") {
        instance.setData(data);
      }
    } catch (error) {
      // Ignore errors during data update
    }
  }, [data]);

  const getInstance = useCallback(() => tabulatorInstance.current, []);

  const setFilter = useCallback(
    (filters: { field: string; type: string; value: string }[], matchType: "or" | "and" = "or") => {
      if (tabulatorInstance.current) {
        tabulatorInstance.current.setFilter(filters, { matchType });
      }
    },
    []
  );

  const clearFilter = useCallback(() => {
    if (tabulatorInstance.current) {
      tabulatorInstance.current.clearFilter();
    }
  }, []);

  const setGroupBy = useCallback((field: string | false) => {
    if (tabulatorInstance.current) {
      tabulatorInstance.current.setGroupBy(field);
    }
  }, []);

  const updateRowData = useCallback((rowId: string, data: Record<string, any>) => {
    if (tabulatorInstance.current) {
      try {
        const row = tabulatorInstance.current.getRow(rowId);
        if (row) {
          row.update(data);
        }
      } catch (error) {
        // Ignore row update errors
      }
    }
  }, []);

  const refreshData = useCallback((newData: any[]) => {
    if (tabulatorInstance.current) {
      try {
        tabulatorInstance.current.setData(newData);
      } catch (error) {
        // Ignore refresh errors
      }
    }
  }, []);

  const getSelectedRows = useCallback(() => {
    if (tabulatorInstance.current) {
      try {
        return tabulatorInstance.current.getSelectedData();
      } catch (error) {
        return [];
      }
    }
    return [];
  }, []);

  const deselectAll = useCallback(() => {
    if (tabulatorInstance.current) {
      try {
        tabulatorInstance.current.deselectRow();
      } catch (error) {
        // Ignore deselect errors
      }
    }
  }, []);

  return {
    tableRef,
    getInstance,
    setFilter,
    clearFilter,
    setGroupBy,
    updateRowData,
    refreshData,
    getSelectedRows,
    deselectAll,
  };
}


