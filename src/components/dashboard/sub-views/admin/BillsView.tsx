import { useState, useMemo } from 'react';
import { DataTable } from '../../DataTable';
import { ViewHeader } from '../../ViewHeader';
import { Badge } from '../../Badge';
import { DateRangeFilter } from '../../DateRangeFilter';
import { History, Package, Car, IndianRupee, X, Download } from 'lucide-react';
import type { CounterBill } from '../../../../hooks/useAdminData';
import { exportToExcel } from '../../../../utils/exportToExcel';

export const BillsView = ({
  counterName, data, onBack, onRowClick, onViewBillReceipt, onRevertBill, startDate, endDate, setStartDate, setEndDate
}: {
  counterName: string, data: CounterBill[], onBack: () => void, onRowClick: (b: CounterBill) => void, onViewBillReceipt?: (b: CounterBill) => void, onRevertBill?: (b: CounterBill) => void,
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <ViewHeader title={`Bills for: ${counterName}`} onBack={onBack} backLabel="Back to Reports" icon={History} />
        <button 
          onClick={() => {
            const exportData = filteredData.map(b => ({
              'Bill No.': b.bill_number || '-',
              'Date': new Date(b.created_at).toLocaleDateString(),
              'Accessories': b.items && b.items.length > 1 ? `${b.items.length} Accessories` : (b.accessory_name || 'Unknown'),
              'Model': b.vehicle_model || '-',
              'Total Qty': b.quantity,
              'Payment Method': b.payment_method || 'Cash',
              'Total Amount (₹)': b.total_amount,
              'Paid (₹)': b.amount_paid ?? b.total_amount,
              'Balance (₹)': b.amount_left ?? 0
            }));
            if (exportData.length > 0) {
              exportToExcel(exportData, `Counter_${counterName.replace(/\s+/g, '_')}_Bills_Report`);
            } else {
              alert('No bills to export');
            }
          }}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-500 border border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 hover:text-emerald-800 dark:hover:text-emerald-400 text-xs font-bold uppercase tracking-wider rounded-lg transition-all active:scale-95 whitespace-nowrap shadow-sm w-fit"
        >
          <Download className="w-4 h-4" /> Export Report
        </button>
      </div>

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
            { 
              header: 'Balance', 
              accessor: (b) => {
                const amt = b.amount_left ?? 0;
                const sign = amt > 0 ? '+' : amt < 0 ? '-' : '';
                return <span className={amt < 0 ? 'text-emerald-600 dark:text-emerald-400' : amt > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-foreground font-medium'}>{sign}₹{Math.abs(amt).toFixed(2)}</span>;
              }, 
              sortAccessor: 'amount_left', 
              className: 'text-right' 
            },
            {
              header: 'Actions',
              accessor: (b) => (
                <div className="flex justify-end items-center gap-2" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => onRowClick(b)}
                    className="px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded hover:bg-secondary/80 whitespace-nowrap"
                  >
                    Details
                  </button>
                  {onViewBillReceipt && (
                    <button
                      onClick={() => onViewBillReceipt(b)}
                      className="px-2 py-1 bg-primary text-primary-foreground text-xs rounded hover:bg-primary/90 whitespace-nowrap"
                    >
                      View Bill
                    </button>
                  )}
                  {onRevertBill && b.approval_status !== 'reverted' && b.approval_status !== 'reverted_by_admin' && (
                    <button
                      onClick={() => onRevertBill(b)}
                      className="px-2 py-1 bg-destructive text-destructive-foreground text-xs rounded hover:bg-destructive/90 whitespace-nowrap"
                    >
                      Revert
                    </button>
                  )}
                  {(b.approval_status === 'reverted' || b.approval_status === 'reverted_by_admin') && (
                    <span className="text-xs px-2 py-1 rounded bg-destructive/10 text-destructive font-bold uppercase tracking-wider">
                      Reverted
                    </span>
                  )}
                </div>
              ),
              className: 'text-right pr-4'
            }
          ], [onRowClick, onViewBillReceipt, onRevertBill])}
        />
      </div>
    </div>
  );
};
