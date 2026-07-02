import { useState, useMemo } from 'react';
import { ViewHeader } from '../../ViewHeader';
import { IndianRupee, Clock, CheckCircle2, Check, Download } from 'lucide-react';
import type { Bill } from '../../../../hooks/useCounterData';
import { exportToExcel } from '../../../../utils/exportToExcel';

import { toast } from 'sonner';

export const CashDrawerView = ({
  allBills,
  drawerTransactions,
  onBack,
  onCreateTransfer
}: {
  allBills: Bill[];
  drawerTransactions: any[];
  onBack: () => void;
  onCreateTransfer: (amount: number) => Promise<boolean>;
}) => {
  const [transferAmount, setTransferAmount] = useState<number | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved'>('pending');

  const totalCashCollected = useMemo(() => {
    return allBills
      .filter(b => b.approval_status !== 'reverted')
      .filter(b => b.payment_method === 'Cash' || (b.payment_method === 'Split Payment' && b.payment_details && b.payment_details.some(p => p.method.toLowerCase().includes('cash'))))
      .reduce((sum, b) => {
        if (b.payment_method === 'Split Payment' && b.payment_details) {
          const cashPayments = b.payment_details.filter(p => p.method.toLowerCase().includes('cash'));
          const cashAmount = cashPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
          return sum + cashAmount;
        }
        return sum + Number(b.amount_paid || 0);
      }, 0);
  }, [allBills]);

  const cashierTransfers = useMemo(() => {
    return drawerTransactions
      .filter(t => t.transaction_type === 'cashier_transfer' && (t.status === 'approved' || t.status === 'pending'))
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  }, [drawerTransactions]);

  const otherDeductions = useMemo(() => {
    return drawerTransactions
      .filter(t => ['daily_expense', 'refund'].includes(t.transaction_type) && t.status === 'approved')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  }, [drawerTransactions]);

  const drawerCashBalance = totalCashCollected - cashierTransfers - otherDeductions;

  const pendingHandovers = useMemo(() => {
    return drawerTransactions.filter(t => t.transaction_type === 'cashier_transfer' && t.status === 'pending');
  }, [drawerTransactions]);

  const approvedHandovers = useMemo(() => {
    return drawerTransactions.filter(t => t.transaction_type === 'cashier_transfer' && t.status === 'approved');
  }, [drawerTransactions]);

  const handleExportTab = () => {
    let exportData: any[] = [];
    let filename = '';

    if (activeTab === 'pending') {
      exportData = pendingHandovers.map(t => ({
        'Counter': t.counter_name || 'Cashier Desk',
        'Amount (₹)': t.amount,
        'Status': 'PENDING',
        'Date': new Date(t.created_at).toLocaleString()
      }));
      filename = 'Pending_Handovers';
    } else if (activeTab === 'approved') {
      exportData = approvedHandovers.map(t => ({
        'Counter': t.counter_name || 'Cashier Desk',
        'Amount (₹)': t.amount,
        'Status': 'APPROVED',
        'Date': new Date(t.created_at).toLocaleString()
      }));
      filename = 'Approved_Handovers';
    }

    if (exportData.length > 0) {
      exportToExcel(exportData, `Cash_Drawer_${filename}_Report`);
    } else {
      toast.error('No data to export');
    }
  };

  const handleTransfer = async () => {
    if (!transferAmount || transferAmount <= 0) return;
    
    if (transferAmount > drawerCashBalance) {
      toast.error(`Cannot transfer ₹${transferAmount.toLocaleString()}. Available balance is ₹${drawerCashBalance.toLocaleString()}`);
      return;
    }

    setIsSubmitting(true);
    const success = await onCreateTransfer(Number(transferAmount));
    if (success) {
      setTransferAmount('');
      setActiveTab('pending');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <ViewHeader title="Cash Drawer Settlements" onBack={onBack} icon={IndianRupee} description="Manage daily cash handovers to the cashier." />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Stats & Handovers */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col items-center justify-center text-center">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Total Cash Collected</span>
              <span className="text-2xl font-black text-emerald-500">₹{totalCashCollected.toLocaleString()}</span>
            </div>
            <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col items-center justify-center text-center">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Cashier Transfers</span>
              <span className="text-2xl font-black text-blue-500">₹{cashierTransfers.toLocaleString()}</span>
            </div>
            <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col items-center justify-center text-center">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Drawer Cash Balance</span>
              <span className="text-2xl font-black text-purple-500">₹{drawerCashBalance.toLocaleString()}</span>
            </div>
          </div>

          <div className="space-y-4 pt-4">
            <h3 className="text-sm font-bold tracking-wider uppercase text-muted-foreground">Reconciled Cash Drawer Settlements</h3>
            
            <div className="flex gap-4 border-b border-border items-center">
              <div className="flex gap-4 flex-1">
                <button 
                  onClick={() => setActiveTab('pending')}
                  className={`pb-2 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'pending' ? 'text-amber-500 border-b-2 border-amber-500' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Pending Handover ({pendingHandovers.length})
                </button>
                <button 
                  onClick={() => setActiveTab('approved')}
                  className={`pb-2 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'approved' ? 'text-emerald-500 border-b-2 border-emerald-500' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Approved Handover ({approvedHandovers.length})
                </button>
              </div>
              <button 
                onClick={handleExportTab} 
                className="flex items-center gap-2 px-4 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-500 border border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 hover:text-emerald-800 dark:hover:text-emerald-400 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all active:scale-95 whitespace-nowrap shadow-sm mb-2"
              >
                <Download className="w-3.5 h-3.5" /> Export List
              </button>
            </div>

            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden min-h-[200px]">
              {activeTab === 'pending' ? (
                pendingHandovers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                    <CheckCircle2 className="w-8 h-8 mb-2 opacity-20" />
                    <span className="text-sm italic">No pending handovers to reconcile.</span>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {pendingHandovers.map(t => (
                      <div key={t.id} className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-amber-500/10 rounded-full">
                            <Clock className="w-5 h-5 text-amber-500" />
                          </div>
                          <div>
                            <div className="font-bold">₹{t.amount.toLocaleString()}</div>
                            <div className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()}</div>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 bg-amber-500/10 text-amber-500 rounded text-[10px] font-bold uppercase tracking-wider">Pending</span>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                approvedHandovers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                    <CheckCircle2 className="w-8 h-8 mb-2 opacity-20" />
                    <span className="text-sm italic">No approved handovers yet.</span>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {approvedHandovers.map(t => (
                      <div key={t.id} className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-emerald-500/10 rounded-full">
                            <Check className="w-5 h-5 text-emerald-500" />
                          </div>
                          <div>
                            <div className="font-bold">₹{t.amount.toLocaleString()}</div>
                            <div className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()}</div>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-500 rounded text-[10px] font-bold uppercase tracking-wider">Approved</span>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        {/* Right Column: New Transfer Form */}
        <div>
          <div className="bg-card p-5 rounded-xl border border-border shadow-lg">
            <h2 className="text-sm font-bold tracking-wider uppercase text-muted-foreground mb-1">
              New Cashier Transfer
            </h2>
            <p className="text-xs text-muted-foreground mb-4 pb-4 border-b border-border">
              Transfer physical cash balance to cashier.
            </p>

            <div className="p-3 bg-muted/30 rounded-lg border border-border mb-6">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Transfer physical cash balance to cashier. The cashier will review and reconcile this transfer on their dashboard.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1 mb-1">Settle Amount (INR)</label>
                <input 
                  type="number" 
                  placeholder="0"
                  className="w-full px-4 py-3 bg-input border border-border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-lg"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(Number(e.target.value))}
                />
              </div>

              <div className="pt-2">
                <button 
                  disabled={isSubmitting || !transferAmount || transferAmount <= 0}
                  onClick={handleTransfer}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg transition-all shadow-md active:scale-[0.98] disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {isSubmitting ? 'Processing...' : 'Post Drawer Settlement'}
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
