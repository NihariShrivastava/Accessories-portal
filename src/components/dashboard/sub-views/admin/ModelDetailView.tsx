import { useMemo } from 'react';
import { DataTable, type Column } from '../../DataTable';
import { ViewHeader } from '../../ViewHeader';
import { Badge } from '../../Badge';
import { Package, Download } from 'lucide-react';
import type { ModelAccessory } from '../../../../hooks/useAdminData';
import { exportToExcel } from '../../../../utils/exportToExcel';

export const ModelDetailView = ({
  model,
  data,
  onBack,
  onEdit,
  onTransfer,
  onDelete
}: {
  model: string,
  data: ModelAccessory[],
  onBack: () => void,
  onEdit: (item: ModelAccessory) => void,
  onTransfer: (item: ModelAccessory) => void,
  onDelete: (id: string) => void

}) => {
  const columns: Column<ModelAccessory>[] = useMemo(() => [
    { header: 'Accessory Name', accessor: 'name', sortAccessor: 'name', className: 'font-medium' },
    { header: 'Code', accessor: (a) => a.accessory_code || '-', sortAccessor: 'accessory_code', className: 'text-muted-foreground text-sm' },
    { header: 'Counter', accessor: 'counter_name', sortAccessor: 'counter_name', className: 'text-muted-foreground' },
    { header: 'Quantity', accessor: (a) => <Badge variant={a.quantity > 5 ? 'success' : 'danger'}>{a.quantity}</Badge>, sortAccessor: 'quantity', className: 'text-right' },
    { header: 'Price (₹)', accessor: (a) => `₹${a.price.toFixed(2)}`, sortAccessor: 'price', className: 'text-right' },
    {
      header: 'Actions',
      accessor: (a: any) => (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(a); }}
            className="px-3 py-1 bg-blue-600 text-white hover:bg-blue-700 rounded text-xs font-semibold transition-all shadow-sm active:scale-95"
          >
            Edit
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onTransfer(a); }}
            className="px-3 py-1 bg-green-600 text-white hover:bg-green-700 rounded text-xs font-semibold transition-all shadow-sm active:scale-95"
          >
            Transfer
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(a.id); }}
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
        <ViewHeader title={`Accessories for: ${model}`} onBack={onBack} backLabel="Back to Models" icon={Package} />
        <button 
          onClick={() => {
            const exportData = data.map(a => ({
              'Accessory Name': a.name,
              'Code': a.accessory_code || '-',
              'Counter': a.counter_name,
              'Quantity': a.quantity,
              'Price (₹)': a.price
            }));
            if (exportData.length > 0) exportToExcel(exportData, `Model_${model.replace(/\s+/g, '_')}_Inventory`);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-500 border border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 hover:text-emerald-800 dark:hover:text-emerald-400 text-xs font-bold uppercase tracking-wider rounded-lg transition-all active:scale-95 whitespace-nowrap shadow-sm w-fit"
        >
          <Download className="w-4 h-4" /> Export Report
        </button>
      </div>
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <DataTable<ModelAccessory> idAccessor={(a) => `${a.name}-${a.counter_name}`} data={data} columns={columns} />
      </div>
    </div>
  );
};
