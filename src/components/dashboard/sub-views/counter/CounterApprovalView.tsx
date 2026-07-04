import { useState, useEffect } from 'react';
import { ArrowLeft, Clock, CheckCircle, RotateCcw } from 'lucide-react';
import { BillApprovalCard } from '../admin/BillApprovalCard';
import type { Bill } from '../../../../hooks/useCounterData';

type Props = {
  bills: Bill[];
  onBack: () => void;
  onViewBill: (bill: Bill) => void;
  onDownloadBill: (bill: Bill) => void;
};

export function CounterApprovalView({ bills, onBack, onDownloadBill }: Props) {
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'reverted' | 'reverted_by_admin'>('pending');

  const filteredBills = bills.filter(b => {
    const status = b.approval_status || 'pending';
    return status === activeTab;
  });

  const ITEMS_PER_PAGE = 6;
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  const totalPages = Math.ceil(filteredBills.length / ITEMS_PER_PAGE);
  const paginatedBills = filteredBills.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

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
            Track the status of your generated bills
          </p>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden p-4">
        <div className="flex bg-muted/50 p-1 rounded-lg flex-wrap md:flex-nowrap gap-1 md:gap-0">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex-1 px-4 py-2.5 rounded-md text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'pending'
                ? 'bg-background text-primary shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Clock className="w-4 h-4" />
            Pending Bills
          </button>
          <button
            onClick={() => setActiveTab('approved')}
            className={`flex-1 px-4 py-2.5 rounded-md text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'approved'
                ? 'bg-background text-emerald-600 shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            Approved Bills
          </button>
          <button
            onClick={() => setActiveTab('reverted')}
            className={`flex-1 px-4 py-2.5 rounded-md text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'reverted'
                ? 'bg-background text-red-600 shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            Amount Reverted
          </button>
          <button
            onClick={() => setActiveTab('reverted_by_admin')}
            className={`flex-1 px-4 py-2.5 rounded-md text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'reverted_by_admin'
                ? 'bg-background text-red-800 shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            Reverted by Admin
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {filteredBills.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-12 text-center shadow-sm">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              {activeTab === 'pending' && <Clock className="w-8 h-8 text-muted-foreground" />}
              {activeTab === 'approved' && <CheckCircle className="w-8 h-8 text-muted-foreground" />}
              {(activeTab === 'reverted' || activeTab === 'reverted_by_admin') && <RotateCcw className="w-8 h-8 text-muted-foreground" />}
            </div>
            <h3 className="text-lg font-bold text-foreground">No {activeTab} bills</h3>
            <p className="text-muted-foreground mt-1">
              There are currently no bills in the {activeTab} state.
            </p>
          </div>
        ) : (
          <div className="bg-background rounded-xl border-none shadow-none space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {paginatedBills.map(bill => (
                <BillApprovalCard
                  key={bill.id}
                  bill={bill as any}
                  activeTab={activeTab === 'reverted_by_admin' ? 'reverted' : activeTab}
                  isCounterView={true}
                  onViewBill={() => onDownloadBill(bill)}
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
