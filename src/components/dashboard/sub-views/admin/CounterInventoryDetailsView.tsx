// src/components/dashboard/sub-views/admin/CounterInventoryDetailsView.tsx
import { useMemo } from 'react';
import { DataTable } from '../../DataTable';
import { ViewHeader } from '../../ViewHeader';
import { Badge } from '../../Badge';
import { Package, Download } from 'lucide-react';
import type { InventoryItem } from '../../../../hooks/useAdminData';
import type { Column } from '../../DataTable';
import { exportToExcel } from '../../../../utils/exportToExcel';

export const CounterInventoryDetailsView = ({
  counterName,
  model,
  data,
  onBack,
  onEdit,
  onTransfer,
  onDelete
}: {
  counterName: string,
  model?: string,
  data: InventoryItem[],
  onBack: () => void,
  onEdit: (item: InventoryItem) => void,
  onTransfer: (item: InventoryItem) => void,
  onDelete: (id: string) => void
}) => {
  const columns: Column<InventoryItem>[] = useMemo(() => [
    { header: 'Accessory Name', accessor: 'name', sortAccessor: 'name', className: 'font-medium' },
    { header: 'Model', accessor: 'vehicle_model', sortAccessor: 'vehicle_model', className: 'text-muted-foreground' },
    { header: 'Code', accessor: (i) => i.accessory_code || '-', sortAccessor: 'accessory_code', className: 'text-muted-foreground text-sm' },
    { header: 'Stock Quantity', accessor: (i) => <Badge variant={i.quantity > 5 ? 'success' : 'danger'}>{i.quantity} units</Badge>, sortAccessor: 'quantity', className: 'text-right' },
    { header: 'Price (₹)', accessor: (i) => `₹${i.price.toFixed(2)}`, sortAccessor: 'price', className: 'text-right' },
    {
      header: 'Actions',
      accessor: (i: any) => (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(i); }}
            className="px-3 py-1 bg-blue-600 text-white hover:bg-blue-700 rounded text-xs font-semibold transition-all shadow-sm active:scale-95"
          >
            Edit
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onTransfer(i); }}
            className="px-3 py-1 bg-green-600 text-white hover:bg-green-700 rounded text-xs font-semibold transition-all shadow-sm active:scale-95"
          >
            Transfer
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(i.id); }}
            className="px-3 py-1 bg-red-600 text-white hover:bg-red-700 rounded text-xs font-semibold transition-all shadow-sm active:scale-95"
          >
            Delete
          </button>
        </div>
      ),
      className: 'text-center'
    }
  ], [onEdit, onTransfer, onDelete]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <ViewHeader
          title={model ? `${model} Accessories` : `Inventory for ${counterName}`}
          onBack={onBack}
          backLabel="Back"
          icon={Package}
          description={`Viewing stock for ${model || 'all items'} at ${counterName}.`}
        />
        <button 
          onClick={() => {
            const exportData = data.map(i => ({
              'Accessory Name': i.name,
              'Model': i.vehicle_model,
              'Code': i.accessory_code || '-',
              'Stock Quantity': i.quantity,
              'Price (₹)': i.price
            }));
            if (exportData.length > 0) exportToExcel(exportData, `${counterName.replace(/\s+/g, '_')}_Inventory`);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-500 border border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 hover:text-emerald-800 dark:hover:text-emerald-400 text-xs font-bold uppercase tracking-wider rounded-lg transition-all active:scale-95 whitespace-nowrap shadow-sm w-fit"
        >
          <Download className="w-4 h-4" /> Export Report
        </button>
      </div>
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <DataTable<InventoryItem> idAccessor="id" data={data} columns={columns} />
      </div>
    </div>
  );
};