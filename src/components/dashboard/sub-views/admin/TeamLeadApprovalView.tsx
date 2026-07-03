// src/components/dashboard/sub-views/admin/TeamLeadApprovalView.tsx
import { useState } from 'react';
import { ArrowLeft, CheckCircle, RotateCcw, Filter, Download } from 'lucide-react';
import { exportToExcel } from '../../../../utils/exportToExcel';
import { DataTable } from '../../DataTable';
import { Badge } from '../../Badge';
import type { CounterBill, Counter } from '../../../../hooks/useAdminData';

type Props = {
  counters: Counter[];
  bills: CounterBill[];
  onBack: () => void;
  onUpdateBillStatus: (billId: string, status: 'approved' | 'reverted', counterId: string) => Promise<void>;
  onViewBill: (bill: CounterBill) => void;
};

export function TeamLeadApprovalView({ counters, bills, onBack, onUpdateBillStatus, onViewBill }: Props) {
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'reverted'>('pending');
  const [selectedCounterId, setSelectedCounterId] = useState<string>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Filter bills
  const filteredBills = bills.filter(b => {
    // Determine status: if approval_status is undefined or 'pending', it's pending.
    const status = b.approval_status || 'pending';
    if (activeTab === 'pending' && status !== 'pending') return false;
    if (activeTab === 'approved' && status !== 'approved') return false;
    if (activeTab === 'reverted' && status !== 'reverted' && status !== 'reverted_by_admin') return false;
    
    if (selectedCounterId !== 'all' && b.counter_id !== selectedCounterId) return false;
    return true;
  });

  const handleStatusUpdate = async (bill: CounterBill, newStatus: 'approved' | 'reverted') => {
    if (!bill.counter_id) return;
    setProcessingId(bill.id);
    try {
      await onUpdateBillStatus(bill.id, newStatus, bill.counter_id);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 bg-card hover:bg-muted rounded-xl border border-border shadow-sm transition-colors text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tight">Bill Approvals</h2>
          <p className="text-sm text-muted-foreground uppercase tracking-widest font-medium">
            Manage counter bill approvals
          </p>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col md:flex-row items-center justify-between p-4 gap-4">
        <div className="flex bg-muted/50 p-1 rounded-lg w-full md:w-auto">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex-1 md:flex-none px-6 py-2 rounded-md text-sm font-bold transition-all ${
              activeTab === 'pending'
                ? 'bg-background text-primary shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Pending Bills
          </button>
          <button
            onClick={() => setActiveTab('approved')}
            className={`flex-1 md:flex-none px-6 py-2 rounded-md text-sm font-bold transition-all ${
              activeTab === 'approved'
                ? 'bg-background text-primary shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Approved Bills
          </button>
          <button
            onClick={() => setActiveTab('reverted')}
            className={`flex-1 md:flex-none px-6 py-2 rounded-md text-sm font-bold transition-all ${
              activeTab === 'reverted'
                ? 'bg-background text-red-600 shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Reverted Bills
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => {
              const exportData = filteredBills.map(b => ({
                'Bill No.': b.bill_number,
                'Counter': b.profiles?.name || 'Unknown Counter',
                'Amount (₹)': b.total_amount || 0,
                'No. of Accessories': b.items?.length || 1,
                'Status': b.approval_status || 'pending',
                'Date': new Date(b.created_at).toLocaleString()
              }));
              if (exportData.length > 0) exportToExcel(exportData, `TeamLead_${activeTab}_Bills`);
            }}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-500 border border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 hover:text-emerald-800 dark:hover:text-emerald-400 text-xs font-bold uppercase tracking-wider rounded-lg transition-all active:scale-95 shadow-sm whitespace-nowrap w-full sm:w-auto"
          >
            <Download className="w-4 h-4" /> Export Report
          </button>

          <div className="relative w-full md:w-64">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <select
              value={selectedCounterId}
              onChange={(e) => setSelectedCounterId(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none font-medium"
            >
              <option value="all">All Counters</option>
              {counters.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <DataTable<CounterBill>
          idAccessor="id"
          pageSize={50}
          columns={[
            { header: 'Bill No.', accessor: (b) => <span className="font-mono font-medium">{b.bill_number}</span>, sortAccessor: 'bill_number', className: 'text-left' },
            { header: 'Counter Name', accessor: (b) => <Badge variant="secondary">{b.profiles?.name || 'Unknown Counter'}</Badge>, className: 'text-left' },
            { header: 'Amount', accessor: (b) => `₹${(b.total_amount || 0).toLocaleString('en-IN')}`, sortAccessor: 'total_amount', className: 'text-right font-medium' },
            { header: 'No. of Accessories', accessor: (b) => b.items?.length || 1, className: 'text-center' },
            { header: 'Date', accessor: (b) => new Date(b.created_at).toLocaleString(), sortAccessor: 'created_at', className: 'text-left text-muted-foreground text-sm' },
            {
              header: 'Actions',
              accessor: (b) => (
                <div className="flex justify-end items-center gap-2">
                  <button
                    onClick={() => onViewBill(b)}
                    className="px-2 py-1.5 bg-secondary text-secondary-foreground text-xs rounded hover:bg-secondary/80 whitespace-nowrap font-medium"
                  >
                    View Bill
                  </button>
                  {activeTab === 'pending' ? (
                    <>
                      <button
                        onClick={() => handleStatusUpdate(b, 'reverted')}
                        disabled={processingId === b.id}
                        className="flex items-center gap-1 px-3 py-1.5 rounded bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 font-bold transition-colors disabled:opacity-50 text-xs"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Revert
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(b, 'approved')}
                        disabled={processingId === b.id}
                        className="flex items-center gap-1 px-3 py-1.5 rounded bg-emerald-500 text-white hover:bg-emerald-600 font-bold transition-colors disabled:opacity-50 text-xs"
                      >
                        <CheckCircle className="w-3 h-3" />
                        Approve
                      </button>
                    </>
                  ) : activeTab === 'approved' ? (
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-end gap-1 ml-2">
                      <CheckCircle className="w-3 h-3" /> Approved
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-red-600 dark:text-red-400 flex items-center justify-end gap-1 ml-2 uppercase">
                      Reverted {b.approval_status === 'reverted_by_admin' ? 'by Admin' : ''}
                    </span>
                  )}
                </div>
              ),
              className: 'text-right pr-4'
            }
          ]}
          data={filteredBills}
          emptyMessage={`There are currently no ${activeTab} bills for the selected filter.`}
        />
      </div>
    </div>
  );
}