"use client";

import { ColumnDefinition } from "tabulator-tables";

/**
 * Creates a column definition for the expand/edit icon that opens an entity editor
 * The icon is always visible but styled differently based on whether there's additional data
 */
export function createExpandColumn(options?: {
  field?: string;
  countField?: string;
  onClick: (rowData: any) => void;
}): ColumnDefinition {
  const { field = "expand", countField = "message_count", onClick } = options || { onClick: () => {} };

  return {
    title: "",
    field,
    width: 50,
    headerSort: false,
    frozen: true,
    formatter: (cell: any) => {
      const rowData = cell.getRow().getData();
      const count = rowData[countField] || 0;
      const hasData = count > 0;
      
      // Always visible, but styled differently if there's data
      const bgColor = hasData ? "#3b82f6" : "#f3f4f6";
      const textColor = hasData ? "#ffffff" : "#6b7280";
      const borderColor = hasData ? "#3b82f6" : "#d1d5db";
      
      return `<div style="display: flex; align-items: center; justify-content: center; height: 100%; cursor: pointer;">
        <button style="background: ${bgColor}; color: ${textColor}; padding: 4px 8px; border-radius: 4px; font-size: 11px; display: flex; align-items: center; gap: 4px; border: 1px solid ${borderColor}; transition: all 0.15s;"
          onmouseover="this.style.background='#3b82f6'; this.style.color='#ffffff'; this.style.borderColor='#3b82f6';"
          onmouseout="this.style.background='${bgColor}'; this.style.color='${textColor}'; this.style.borderColor='${borderColor}';">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          ${hasData ? count : ""}
        </button>
      </div>`;
    },
    cellClick: (_e: any, cell: any) => {
      const rowData = cell.getRow().getData();
      onClick(rowData);
    },
  };
}

/**
 * Creates a simple expand/edit icon column without count display
 */
export function createSimpleExpandColumn(onClick: (rowData: any) => void): ColumnDefinition {
  return {
    title: "",
    field: "expand",
    width: 45,
    headerSort: false,
    frozen: true,
    formatter: () => {
      return `<div style="display: flex; align-items: center; justify-content: center; height: 100%; cursor: pointer;">
        <button style="background: #f3f4f6; color: #6b7280; padding: 6px; border-radius: 4px; display: flex; align-items: center; justify-content: center; border: 1px solid #d1d5db; transition: all 0.15s;"
          onmouseover="this.style.background='#3b82f6'; this.style.color='#ffffff'; this.style.borderColor='#3b82f6';"
          onmouseout="this.style.background='#f3f4f6'; this.style.color='#6b7280'; this.style.borderColor='#d1d5db';">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
      </div>`;
    },
    cellClick: (_e: any, cell: any) => {
      const rowData = cell.getRow().getData();
      onClick(rowData);
    },
  };
}

