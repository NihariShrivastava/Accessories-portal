import { ViewHeader } from '../../ViewHeader';
import { Store, Car, ChevronRight, Package } from 'lucide-react';
import { Badge } from '../../Badge';
import { DataTable } from '../../DataTable';
import type { InventoryItem } from '../../../../hooks/useAdminData';

export const CounterInventoryModelsView = ({
  counterName, models, onBack, onModelClick
}: {
  counterName: string, models: string[], onBack: () => void, onModelClick: (model: string) => void
}) => (
  <div className="space-y-6">
    <ViewHeader title={`Inventory for: ${counterName}`} onBack={onBack} backLabel="Back to Reports" icon={Store} description="Select a vehicle model to view available accessories." />
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {models.map(m => (
        <button
          key={m}
          onClick={() => onModelClick(m)}
          className="flex items-center justify-between p-4 bg-card border border-border rounded-xl hover:bg-muted hover:border-primary/30 transition-all group"
        >
          <div className="flex items-center gap-3">
            <Car className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
            <span className="font-medium">{m}</span>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-transform" />
        </button>
      ))}
    </div>
  </div>
);

export const CounterInventoryStatusView = ({
  counterName,
  inventory,
  onBack
}: {
  counterName: string,
  inventory: InventoryItem[],
  onBack: () => void
}) => {
  const counterInventory = inventory.filter(i => i.counter_name === counterName);
  const surplus = counterInventory.filter(i => i.quantity > 5);
  const shortage = counterInventory.filter(i => i.quantity <= 5);

  const columns = [
    { header: 'Model', accessor: 'vehicle_model' as const, className: 'font-medium' },
    { header: 'Accessory', accessor: 'name' as const },
    { header: 'Code', accessor: (i: InventoryItem) => i.accessory_code || '-', className: 'text-xs text-muted-foreground' },
    { header: 'Qty', accessor: (i: InventoryItem) => <Badge variant={i.quantity > 5 ? 'success' : 'danger'}>{i.quantity}</Badge>, className: 'text-right' },
    { header: 'Price', accessor: (i: InventoryItem) => `₹${i.price.toLocaleString()}`, className: 'text-right' }
  ];

  return (
    <div className="space-y-6">
      <ViewHeader title={`${counterName} - Inventory Status`} onBack={onBack} icon={Store} description="Accessories categorized by stock status." />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Shortage Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <div className="w-2 h-6 bg-destructive rounded-full" />
            <h3 className="text-lg font-bold uppercase tracking-tight text-destructive">Shortage Items ({" <= 5"})</h3>
            <Badge variant="danger" className="ml-auto">{shortage.length}</Badge>
          </div>
          <div className="bg-card rounded-xl border border-destructive/20 shadow-sm overflow-hidden border-t-4 border-t-destructive">
            <DataTable<InventoryItem> idAccessor="id" data={shortage} columns={columns} maxHeight="400px" />
          </div>
        </div>

        {/* Surplus Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <div className="w-2 h-6 bg-green-600 rounded-full" />
            <h3 className="text-lg font-bold uppercase tracking-tight text-green-600">Surplus Items ({" > 5"})</h3>
            <Badge variant="success" className="ml-auto">{surplus.length}</Badge>
          </div>
          <div className="bg-card rounded-xl border border-green-600/20 shadow-sm overflow-hidden border-t-4 border-t-green-600">
            <DataTable<InventoryItem> idAccessor="id" data={surplus} columns={columns} maxHeight="400px" />
          </div>
        </div>
      </div>
    </div>
  );
};
