import React from 'react';

export interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T, index: number) => React.ReactNode);
  sortAccessor?: keyof T;
  className?: string;
  headerClassName?: string;
}

import { ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (item: T) => void;
  maxHeight?: string;
  emptyMessage?: string;
  idAccessor: keyof T | ((item: T) => string);
  pageSize?: number;
  overflowVisible?: boolean;
}

function DataTableInner<T>({
  columns,
  data,
  onRowClick,
  maxHeight,
  emptyMessage = "No records found.",
  idAccessor,
  pageSize = 0,
  overflowVisible = false
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = React.useState(1);
  const [sortConfig, setSortConfig] = React.useState<{ key: string | number | symbol; direction: 'asc' | 'desc' } | null>(null);

  const getRowId = (item: T) => {
    if (typeof idAccessor === 'function') return idAccessor(item);
    return String(item[idAccessor]);
  };

  const handleSort = (col: Column<T>) => {
    const sortKey = col.sortAccessor || (typeof col.accessor !== 'function' ? col.accessor : null);
    if (!sortKey) return;
    
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === sortKey && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key: sortKey as string, direction });
  };

  const sortedData = React.useMemo(() => {
    if (!sortConfig) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key as keyof T];
      const bValue = b[sortConfig.key as keyof T];

      if (aValue === bValue) return 0;
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc' 
          ? aValue.localeCompare(bValue) 
          : bValue.localeCompare(aValue);
      }

      if (sortConfig.direction === 'asc') {
        return (aValue as any) > (bValue as any) ? 1 : -1;
      } else {
        return (aValue as any) < (bValue as any) ? 1 : -1;
      }
    });
  }, [data, sortConfig]);

  const paginatedData = React.useMemo(() => {
    if (!pageSize || pageSize <= 0) return sortedData;
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const totalPages = pageSize > 0 ? Math.ceil(data.length / pageSize) : 1;

  // Reset page when data changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [data.length]);

  return (
    <div className="flex flex-col">
      <div className={`${overflowVisible ? '' : 'overflow-x-auto'} ${maxHeight ? 'overflow-y-auto' : ''}`} style={maxHeight ? { maxHeight } : {}}>
        <table className="w-full text-left text-sm">
          <thead className={`bg-muted text-muted-foreground ${maxHeight ? 'sticky top-0 z-10' : ''}`}>
            <tr>
              {columns.map((col, idx) => {
                // Extract alignment and width classes to ensure headers align with data
                const alignmentClass = col.className?.match(/\b(text-(left|center|right|justify))\b/)?.[1] || '';
                const widthClass = col.className?.match(/\b(w-\w+)\b/)?.[1] || '';
                const sortKey = col.sortAccessor || (typeof col.accessor !== 'function' ? col.accessor : null);
                const isSortable = !!sortKey;
                
                const justifyClass = alignmentClass === 'text-right' ? 'justify-end' : alignmentClass === 'text-center' ? 'justify-center' : 'justify-start';
                
                return (
                  <th
                    key={idx}
                    onClick={() => isSortable && handleSort(col)}
                    className={`px-4 py-3 font-medium ${idx === 0 ? 'rounded-tl-lg' : ''} ${idx === columns.length - 1 ? 'rounded-tr-lg' : ''} ${alignmentClass} ${widthClass} ${col.headerClassName || ''} ${isSortable ? 'cursor-pointer hover:bg-muted-foreground/10 select-none group' : ''}`}
                  >
                    <div className={`flex items-center gap-1.5 ${justifyClass}`}>
                      <span>{col.header}</span>
                      {isSortable && (
                        <span className="shrink-0">
                          {sortConfig?.key === sortKey ? (
                            sortConfig.direction === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-primary" /> : <ArrowDown className="w-3.5 h-3.5 text-primary" />
                          ) : (
                            <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paginatedData.map((item, rowIdx) => (
              <tr
                key={getRowId(item)}
                onClick={() => onRowClick?.(item)}
                className={`transition-colors ${onRowClick ? 'cursor-pointer hover:bg-muted/50 group' : 'hover:bg-muted/20'}`}
              >
                {columns.map((col, idx) => (
                  <td key={idx} className={`px-4 py-3 ${col.className || ''}`}>
                    {typeof col.accessor === 'function' ? col.accessor(item, (currentPage - 1) * pageSize + rowIdx) : (item[col.accessor] as React.ReactNode)}
                  </td>
                ))}
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-muted-foreground">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pageSize > 0 && data.length > pageSize && (
        <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-t border-border">
          <div className="text-xs text-muted-foreground">
            Showing <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> to <span className="font-medium">{Math.min(currentPage * pageSize, data.length)}</span> of <span className="font-medium">{data.length}</span> results
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded-md hover:bg-muted disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-medium px-2">Page {currentPage} of {totalPages}</span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-1 rounded-md hover:bg-muted disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export const DataTable = React.memo(DataTableInner) as typeof DataTableInner;
