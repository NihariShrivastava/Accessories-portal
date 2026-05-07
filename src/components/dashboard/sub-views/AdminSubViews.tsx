import { DataTable } from '../DataTable';
import { ViewHeader } from '../ViewHeader';
import { Badge } from '../Badge';
import { Users, Package, BarChart3, History, Store, ChevronRight, Car } from 'lucide-react';
import { DateRangeFilter } from '../DateRangeFilter';
import type { LoginDetail, ModelAccessory, SalesReport, CounterBill, InventoryItem } from '../../../hooks/useAdminData';

export const LoginsView = ({ data, onBack }: { data: LoginDetail[], onBack: () => void }) => (
  <div className="space-y-6">
    <ViewHeader title="Counter Login Details" onBack={onBack} icon={Users} description={`${data.length} unique counter(s) have logged in.`} />
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      <DataTable<LoginDetail> idAccessor="user_id" data={data} columns={[
        { header: '#', accessor: (_, i) => (i || 0) + 1, className: 'text-muted-foreground w-12' },
        { header: 'Counter Name', accessor: 'name', className: 'font-medium' },
        { header: 'Total Logins', accessor: 'login_count', className: 'text-right' }
      ]} />
    </div>
  </div>
);

export const ModelDetailView = ({ model, data, onBack }: { model: string, data: ModelAccessory[], onBack: () => void }) => (
  <div className="space-y-6">
    <ViewHeader title={`Accessories for: ${model}`} onBack={onBack} backLabel="Back to Models" icon={Package} />
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      <DataTable<ModelAccessory> idAccessor={(a) => `${a.name}-${a.counter_name}`} data={data} columns={[
        { header: 'Accessory Name', accessor: 'name', className: 'font-medium' },
        { header: 'Counter', accessor: 'counter_name', className: 'text-muted-foreground' },
        { header: 'Quantity', accessor: (a) => <Badge variant={a.quantity > 5 ? 'success' : 'danger'}>{a.quantity}</Badge>, className: 'text-right' },
        { header: 'Price (₹)', accessor: (a) => `₹${a.price.toFixed(2)}`, className: 'text-right' }
      ]} />
    </div>
  </div>
);

export const ReportsView = ({ 
  data, onBack, onCounterClick, inventory, onInventoryCounterClick 
}: { 
  data: SalesReport[], onBack: () => void, onCounterClick: (r: SalesReport) => void, 
  inventory: InventoryItem[], onInventoryCounterClick: (counterName: string) => void 
}) => {
  const inventoryCounters = [...new Set(inventory.map(i => i.counter_name))].sort();

  return (
    <div className="space-y-6">
      <ViewHeader title="System Reports" onBack={onBack} icon={BarChart3} />
      
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border bg-muted/30">
          <h2 className="text-xl font-bold flex items-center gap-2"><History className="w-5 h-5 text-primary" /> Sales Report by Counter</h2>
          <p className="text-sm text-muted-foreground mt-1">Click a counter to see all their bills.</p>
        </div>
        <DataTable<SalesReport> idAccessor="counter_id" data={data} onRowClick={onCounterClick} columns={[
          { header: 'Counter Name', accessor: 'counter_name', className: 'font-semibold text-primary group-hover:underline' },
          { header: 'Total Bills', accessor: 'total_bills', className: 'text-center' },
          { header: 'Total Sales (₹)', accessor: (r) => `₹${r.total_sales.toFixed(2)}`, className: 'text-right font-medium' },
          { header: 'Collected (₹)', accessor: (r) => <span className="text-green-600 dark:text-green-400 font-medium">₹{r.total_collected.toFixed(2)}</span>, className: 'text-right' },
          { header: 'Outstanding (₹)', accessor: (r) => <span className="text-destructive font-medium">₹{r.outstanding.toFixed(2)}</span>, className: 'text-right' }
        ]} />
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Package className="w-5 h-5 text-primary" /> 
          <h2 className="text-xl font-bold">Inventory Quantity Report</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Select a counter to view its model-wise inventory.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {inventoryCounters.map(c => (
            <button
              key={c}
              onClick={() => onInventoryCounterClick(c)}
              className="flex items-center justify-between p-4 bg-muted/50 border border-border rounded-xl hover:bg-primary/10 hover:border-primary/50 transition-all group"
            >
              <div className="flex items-center gap-3">
                <Store className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
                <span className="font-semibold">{c}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-transform" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export const BillsView = ({ 
  counterName, data, onBack, onRowClick, startDate, endDate, setStartDate, setEndDate 
}: { 
  counterName: string, data: CounterBill[], onBack: () => void, onRowClick: (b: CounterBill) => void,
  startDate: string, endDate: string, setStartDate: (d: string) => void, setEndDate: (d: string) => void
}) => (
  <div className="space-y-6">
    <ViewHeader title={`Bills for: ${counterName}`} onBack={onBack} backLabel="Back to Reports" icon={History} />
    
    <DateRangeFilter
      initialStartDate={startDate}
      initialEndDate={endDate}
      onApply={(start, end) => {
        setStartDate(start);
        setEndDate(end);
      }}
      onClear={() => { setStartDate(''); setEndDate(''); }}
    />

    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      <DataTable<CounterBill> idAccessor="id" data={data} onRowClick={onRowClick} pageSize={50} columns={[
        { header: 'Date', accessor: (b) => new Date(b.created_at).toLocaleDateString(), className: 'text-muted-foreground' },
        { header: 'Accessory', accessor: 'accessory_name', className: 'font-medium' },
        { header: 'Model', accessor: 'vehicle_model', className: 'text-muted-foreground' },
        { header: 'Qty', accessor: 'quantity', className: 'text-center' },
        { header: 'Payment', accessor: (b) => <Badge variant="secondary">{b.payment_method}</Badge> },
        { header: 'Total', accessor: (b) => `₹${b.total_amount?.toFixed(2)}`, className: 'text-right font-medium' },
        { header: 'Paid', accessor: (b) => `₹${(b.amount_paid ?? b.total_amount)?.toFixed(2)}`, className: 'text-right text-green-600 dark:text-green-400' },
        { header: 'Balance', accessor: (b) => `₹${(b.amount_left ?? 0)?.toFixed(2)}`, className: 'text-right text-destructive font-medium' }
      ]} />
    </div>
  </div>
);

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

export const CounterInventoryDetailsView = ({ 
  counterName, model, data, onBack 
}: { 
  counterName: string, model: string, data: InventoryItem[], onBack: () => void 
}) => (
  <div className="space-y-6">
    <ViewHeader 
      title={`${model} Accessories`} 
      onBack={onBack} 
      backLabel="Back to Models" 
      icon={Package} 
      description={`Viewing stock for ${model} at ${counterName}.`}
    />
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      <DataTable<InventoryItem> idAccessor="id" data={data} columns={[
        { header: 'Accessory Name', accessor: 'name', className: 'font-medium' },
        { header: 'Stock Quantity', accessor: (i) => <Badge variant={i.quantity > 5 ? 'success' : 'danger'}>{i.quantity} units</Badge>, className: 'text-right' },
        { header: 'Price per Unit (₹)', accessor: (i) => `₹${i.price.toFixed(2)}`, className: 'text-right' }
      ]} />
    </div>
  </div>
);
