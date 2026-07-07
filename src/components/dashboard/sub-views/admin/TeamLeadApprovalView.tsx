import { useState, useEffect } from 'react';
import { ArrowLeft, Filter, Download } from 'lucide-react';
import { exportToExcel } from '../../../../utils/exportToExcel';
import { BillApprovalCard } from './BillApprovalCard';
import type { CounterBill, Counter } from '../../../../hooks/useAdminData';

type Props = {
  counters: Counter[];
  bills: CounterBill[];
  onBack: () => void;
  onUpdateBillStatus: (billId: string, status: 'approved' | 'reverted', counterId: string, excess?: number, discount?: number, note?: string) => Promise<void>;
  onViewBill: (bill: CounterBill) => void;
};

export function TeamLeadApprovalView({ counters, bills, onBack, onUpdateBillStatus, onViewBill }: Props) {
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'reverted' | 'reverted_by_auditor'>('pending');
  const [selectedCounterId, setSelectedCounterId] = useState<string>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const filteredBills = bills.filter(b => {
    // Determine status: if approval_status is undefined or 'pending', it's pending.
    const status = b.approval_status || 'pending';
    
    if (activeTab === 'pending') {
      if (status !== 'pending') return false;
      if (b.audit_status === 'reverted_to_team_lead') return false;
    }
    if (activeTab === 'approved' && status !== 'approved' && status !== 'closed') return false;
    if (activeTab === 'reverted' && status !== 'reverted' && status !== 'reverted_by_admin') return false;
    if (activeTab === 'reverted_by_auditor' && b.audit_status !== 'reverted_to_team_lead') return false;
    
    if (selectedCounterId !== 'all' && b.counter_id !== selectedCounterId) return false;
    return true;
  });

  const ITEMS_PER_PAGE = 6;
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, selectedCounterId]);

  const totalPages = Math.ceil(filteredBills.length / ITEMS_PER_PAGE);
  const paginatedBills = filteredBills.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleStatusUpdate = async (bill: CounterBill, newStatus: 'approved' | 'reverted', excess = 0, discount = 0, note = '') => {
    if (!bill.counter_id) return;
    setProcessingId(bill.id);
    try {
      await onUpdateBillStatus(bill.id, newStatus, bill.counter_id, excess, discount, note);
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
          <button
            onClick={() => setActiveTab('reverted_by_auditor')}
            className={`flex-1 md:flex-none px-6 py-2 rounded-md text-sm font-bold transition-all ${
              activeTab === 'reverted_by_auditor'
                ? 'bg-background text-orange-600 shadow-sm'
                : 'text-muted-foreground hover:text-orange-600'
            }`}
          >
            Reverted by Auditor
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

      <div className="bg-background rounded-xl border-none shadow-none">
        {filteredBills.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-xl border border-border shadow-sm">
            <p className="text-muted-foreground text-sm font-medium">There are currently no {activeTab} bills for the selected filter.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {paginatedBills.map(bill => (
                <BillApprovalCard
                  key={bill.id}
                  bill={bill}
                  activeTab={activeTab}
                  isProcessing={processingId === bill.id}
                  onApprove={(excess, discount, note) => handleStatusUpdate(bill, 'approved', excess, discount, note)}
                  onRevert={() => handleStatusUpdate(bill, 'reverted')}
                  onViewBill={() => onViewBill(bill)}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 pt-4 pb-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-md border border-border bg-card hover:bg-muted text-sm font-medium disabled:opacity-50 transition-colors"
                >
                  Previous
                </button>
                <span className="text-sm font-medium text-muted-foreground mx-4">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-md border border-border bg-card hover:bg-muted text-sm font-medium disabled:opacity-50 transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
