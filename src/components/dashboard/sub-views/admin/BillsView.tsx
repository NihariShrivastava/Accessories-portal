import { useState, useMemo } from 'react';
import { DataTable } from '../../DataTable';
import { ViewHeader } from '../../ViewHeader';
import { Badge } from '../../Badge';
import { DateRangeFilter } from '../../DateRangeFilter';
import { History, Package, Car, IndianRupee, X } from 'lucide-react';
import type { CounterBill } from '../../../../hooks/useAdminData';

export const BillsView = ({
  counterName, data, onBack, onRowClick, startDate, endDate, setStartDate, setEndDate
}: {
  counterName: string, data: CounterBill[], onBack: () => void, onRowClick: (b: CounterBill) => void,
  startDate: string, endDate: string, setStartDate: (d: string) => void, setEndDate: (d: string) => void
}) => {
  const [accFilter, setAccFilter] = useState('');
  const [modelFilter, setModelFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');

  const filteredData = useMemo(() => {
    return data.filter(b => {
      const bItems = b.items || [];
      const accMatch = !accFilter ||
        bItems.some((i: any) => (i.name || i.accessories?.name || '').toLowerCase().includes(accFilter.toLowerCase())) ||
        (b.accessory_name || '').toLowerCase().includes(accFilter.toLowerCase());

      const modelMatch = !modelFilter ||
        (b.vehicle_model || '').toLowerCase().includes(modelFilter.toLowerCase());

      const paymentMatch = !paymentFilter ||
        (b.payment_method || 'Cash') === paymentFilter;

      return accMatch && modelMatch && paymentMatch;
    });
  }, [data, accFilter, modelFilter, paymentFilter]);

  return (
    <div className="space-y-6">
      <ViewHeader title={`Bills for: ${counterName}`} onBack={onBack} backLabel="Back to Reports" icon={History} />

      <div className="bg-card rounded-xl border border-border shadow-sm p-4 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <History className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Filter Ledger</h3>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Analyze transactions for this counter</p>
            </div>
          </div>

          <DateRangeFilter
            initialStartDate={startDate}
            initialEndDate={endDate}
            onApply={(start, end) => {
              setStartDate(start);
              setEndDate(end);
            }}
            onClear={() => { setStartDate(''); setEndDate(''); }}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-border">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Accessory</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search Accessory..."
                className="w-full pl-9 pr-4 py-2 bg-muted/30 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                value={accFilter}
                onChange={(e) => setAccFilter(e.target.value)}
              />
              <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Model</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search Model..."
                className="w-full pl-9 pr-4 py-2 bg-muted/30 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                value={modelFilter}
                onChange={(e) => setModelFilter(e.target.value)}
              />
              <Car className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Payment</label>
            <div className="relative">
              <select
                className="w-full pl-9 pr-4 py-2 bg-muted/30 border border-border rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer"
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
              >
                <option value="">All Methods</option>
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Card">Card</option>
              </select>
              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            </div>
          </div>

          <div className="flex items-end">
            {(accFilter || modelFilter || paymentFilter) && (
              <button
                onClick={() => { setAccFilter(''); setModelFilter(''); setPaymentFilter(''); }}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <DataTable<CounterBill>
          idAccessor="id"
          data={filteredData}
          onRowClick={onRowClick}
          pageSize={50}
          columns={useMemo(() => [
            { header: 'Bill No.', accessor: (b) => <span className="font-mono text-xs">{b.bill_number || '-'}</span>, sortAccessor: 'bill_number', className: 'text-left font-medium' },
            { header: 'Date', accessor: (b) => new Date(b.created_at).toLocaleDateString(), sortAccessor: 'created_at', className: 'text-left text-muted-foreground' },
            {
              header: 'Accessories',
              accessor: (b: any) => b.items && b.items.length > 1 ? (
                <span className="font-semibold text-primary">{b.items.length} Accessories</span>
              ) : (
                <span className="font-medium">{b.accessory_name}</span>
              ),
              className: 'text-left font-medium'
            },
            { header: 'Model', accessor: 'vehicle_model', sortAccessor: 'vehicle_model', className: 'text-left text-muted-foreground' },
            { header: 'Total Qty', accessor: (b) => b.quantity, sortAccessor: 'quantity', className: 'text-right' },
            { header: 'Payment', accessor: (b) => <Badge variant="secondary">{b.payment_method}</Badge> },
            { header: 'Total', accessor: (b) => `₹${b.total_amount?.toFixed(2)}`, sortAccessor: 'total_amount', className: 'text-right font-medium' },
            { header: 'Paid', accessor: (b) => `₹${(b.amount_paid ?? b.total_amount)?.toFixed(2)}`, sortAccessor: 'amount_paid', className: 'text-right text-green-600 dark:text-green-400' },
            { header: 'Balance', accessor: (b) => `₹${(b.amount_left ?? 0)?.toFixed(2)}`, sortAccessor: 'amount_left', className: 'text-right text-destructive font-medium' }
          ], [])}
        />
      </div>
    </div>
  );
};
