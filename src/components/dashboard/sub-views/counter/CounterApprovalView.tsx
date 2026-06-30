import { useState } from 'react';
import { ArrowLeft, Clock, CheckCircle, RotateCcw, FileText } from 'lucide-react';
import type { Bill } from '../../../../hooks/useCounterData';

type Props = {
  bills: Bill[];
  onBack: () => void;
  onViewBill: (bill: Bill) => void;
  onDownloadBill: (bill: Bill) => void;
};

export function CounterApprovalView({ bills, onBack, onViewBill, onDownloadBill }: Props) {
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'reverted' | 'reverted_by_admin'>('pending');

  const filteredBills = bills.filter(b => {
    const status = b.approval_status || 'pending';
    return status === activeTab;
  });

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
          filteredBills.map(bill => (
            <div 
              key={bill.id} 
              className={`bg-card border rounded-xl p-5 shadow-sm transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:border-primary/50 ${
                (activeTab === 'reverted' || activeTab === 'reverted_by_admin') ? 'border-red-200 dark:border-red-900/50 hover:border-red-400' : 'border-border'
              }`}
              onClick={() => onViewBill(bill)}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl flex-shrink-0 ${
                  activeTab === 'pending' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' : 
                  activeTab === 'approved' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' :
                  'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg">{bill.bill_number}</h3>
                    {(activeTab === 'reverted' || activeTab === 'reverted_by_admin') && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 font-bold uppercase tracking-wider">
                        Reverted {activeTab === 'reverted_by_admin' ? 'by Admin' : ''}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {bill.items?.length || 1} Item(s) • ₹{(bill.total_amount || 0).toLocaleString('en-IN')}
                    {(activeTab === 'reverted' || activeTab === 'reverted_by_admin') && <span className="ml-2 font-medium text-foreground">({bill.quantity} Qty Restored)</span>}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(bill.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <button
                  onClick={(e) => { e.stopPropagation(); onDownloadBill(bill); }}
                  className="w-full md:w-auto px-4 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 font-medium transition-colors"
                >
                  Download / Print
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
