import { useMemo } from 'react';
import { DataTable, type Column } from '../../DataTable';
import { ViewHeader } from '../../ViewHeader';
import { Badge } from '../../Badge';
import { Package } from 'lucide-react';
import type { ModelAccessory } from '../../../../hooks/useAdminData';

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
      <ViewHeader title={`Accessories for: ${model}`} onBack={onBack} backLabel="Back to Models" icon={Package} />
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <DataTable<ModelAccessory> idAccessor={(a) => `${a.name}-${a.counter_name}`} data={data} columns={columns} />
      </div>
    </div>
  );
};
