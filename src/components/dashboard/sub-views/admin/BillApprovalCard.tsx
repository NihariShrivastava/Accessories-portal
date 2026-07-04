import { useState } from 'react';
import { CheckCircle, RotateCcw, FileText, Clock } from 'lucide-react';
import type { CounterBill } from '../../../../hooks/useAdminData';

type Props = {
  bill: CounterBill;
  activeTab: 'pending' | 'approved' | 'reverted' | 'reverted_by_auditor';
  onApprove?: (excess: number, discount: number, note: string) => void;
  onRevert?: () => void;
  onViewBill: () => void;
  isProcessing?: boolean;
  isCounterView?: boolean;
};

export function BillApprovalCard({ bill, activeTab, onApprove, onRevert, onViewBill, isProcessing, isCounterView }: Props) {
  const [showApproveForm, setShowApproveForm] = useState(false);
  const [adjustmentValue, setAdjustmentValue] = useState<string>('');
  const [approvalNote, setApprovalNote] = useState<string>('');

  const debit = (bill.total_amount || 0) - (bill.amount_paid || 0);
  const isExcess = debit < 0; // if amount paid > total amount
  const isDue = debit > 0; // if amount paid < total amount

  const handleConfirmApprove = () => {
    const numericAdjustment = Number(adjustmentValue) || 0;
    const excess = isExcess ? numericAdjustment : 0;
    const discount = isDue ? numericAdjustment : 0;
    if (onApprove) onApprove(excess, discount, approvalNote);
    setShowApproveForm(false);
  };

  const paymentModes = Array.from(new Set(
    bill.payment_details ? bill.payment_details.map((p: any) => p.method) : [bill.payment_method]
  )).join(', ').toUpperCase();

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm text-card-foreground font-sans">
      <div className="p-4 md:p-5 space-y-3">
        {/* Header Section */}
        <div className="flex justify-between items-start">
          <div>
            <div className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mb-2 ${
              activeTab === 'pending' ? 'bg-primary/10 text-primary' :
              activeTab === 'approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
              'bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive'
            }`}>
              {activeTab === 'pending' ? 'Awaiting Approval' : activeTab === 'approved' ? 'Approved' : 'Reverted'}
            </div>
            <h3 className="text-lg md:text-xl font-black text-foreground uppercase tracking-tight leading-tight">
              {bill.accessory_name === 'Multiple Items' ? 'Multiple Accessories' : bill.accessory_name}
            </h3>
            <p className="text-muted-foreground text-xs mt-1">{bill.vehicle_model}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Total Amount</p>
            <p className="text-lg md:text-xl font-black text-foreground">₹{(bill.total_amount || 0).toLocaleString('en-IN')}</p>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">Mode: {paymentModes}</p>
          </div>
        </div>

        {/* Details Section */}
        <div className="space-y-1 text-xs md:text-xs font-mono mt-1">
          <p><span className="text-primary font-semibold">Receipt No:</span> <span className="text-foreground">{bill.bill_number || 'N/A'}</span></p>
          {bill.chassis_number && <p><span className="text-muted-foreground">Chassis:</span> <span className="text-foreground">{bill.chassis_number}</span></p>}

          <p className="pt-1 font-sans font-bold"><span className="text-muted-foreground">Customer:</span> <span className="text-foreground uppercase">{bill.customer_name || 'Walk-in'} {bill.customer_phone ? `(${bill.customer_phone})` : ''}</span></p>
          <div className="pt-1">
            <span className="inline-flex items-center gap-2 bg-muted/50 border border-border px-2 py-1 rounded-md font-sans text-[10px]">
              <span className="text-muted-foreground font-bold">Counter:</span>
              <span className="text-primary font-medium">{bill.profiles?.name || 'Unknown'}</span>
            </span>
          </div>
        </div>

        {/* Base/GST Breakup */}
        <div className="bg-muted/50 rounded-lg p-2 flex flex-wrap gap-3 text-[10px] font-semibold text-muted-foreground border border-border mt-3">
          <p>Base: <span className="text-foreground">₹{(bill.base_amount || 0).toLocaleString('en-IN')}</span></p>
          <p>CGST: <span className="text-foreground">₹{(bill.cgst_amount || 0).toLocaleString('en-IN')}</span></p>
          <p>SGST: <span className="text-foreground">₹{(bill.sgst_amount || 0).toLocaleString('en-IN')}</span></p>
        </div>

        {/* Adjustments */}
        {(Number(bill.excess_adjustment) > 0 || Number(bill.discount_approved) > 0) && activeTab !== 'pending' && (
          <div className="flex gap-4 bg-emerald-100 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-900/30 p-3 rounded-xl mt-3">
            {Number(bill.excess_adjustment) > 0 && (
              <div>
                <p className="text-emerald-700 dark:text-emerald-500 text-[9px] font-bold uppercase tracking-widest mb-0.5">Excess Adjusted:</p>
                <p className="text-emerald-600 dark:text-emerald-400 font-bold text-base">+₹{Number(bill.excess_adjustment).toLocaleString('en-IN')}</p>
              </div>
            )}
            {Number(bill.discount_approved) > 0 && (
              <div>
                <p className="text-amber-700 dark:text-amber-500 text-[9px] font-bold uppercase tracking-widest mb-0.5">Discount Approved:</p>
                <p className="text-amber-600 dark:text-amber-400 font-bold text-base">-₹{Number(bill.discount_approved).toLocaleString('en-IN')}</p>
              </div>
            )}
          </div>
        )}

        {/* Note Box */}
        {bill.approval_note && activeTab !== 'pending' && (
          <div className="border border-border bg-muted/30 rounded-lg p-3 mt-3">
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1">Approval Note:</p>
            <p className="italic text-foreground font-medium text-xs">"{bill.approval_note}"</p>
          </div>
        )}

        <hr className="border-border my-4" />

        {/* Credit / Debit */}
        <div className="flex justify-between items-end mb-3">
          <div>
            <p className="text-muted-foreground text-xs">Credit (Got): <span className="text-emerald-600 dark:text-emerald-400 font-bold">₹{(bill.amount_paid || 0).toLocaleString('en-IN')}</span></p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">
              Debit (Left): <span className={`font-bold ${isExcess ? 'text-emerald-600 dark:text-emerald-400' : isDue ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}>
                {isExcess ? '-' : isDue ? '+' : ''}₹{Math.abs(debit).toLocaleString('en-IN')}
              </span>
            </p>
          </div>
        </div>

        {/* Transactions list */}
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="bg-muted/50 px-3 py-2 border-b border-border">
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Transactions:</p>
          </div>
          <div className="p-3 space-y-2 font-mono text-xs bg-card">
            {bill.payment_details ? bill.payment_details.map((p: any, idx: number) => (
              <div key={idx} className="flex justify-between items-center pb-2 border-b border-border/50 last:border-0 last:pb-0">
                <p className="text-foreground">#{idx + 1} {p.method}</p>
                <p className="text-emerald-600 dark:text-emerald-400 font-bold">+₹{Number(p.amount || 0).toLocaleString('en-IN')}</p>
              </div>
            )) : (
              <div className="flex justify-between items-center">
                <p className="text-foreground">#1 {bill.payment_method}</p>
                <p className="text-emerald-600 dark:text-emerald-400 font-bold">+₹{(bill.amount_paid || 0).toLocaleString('en-IN')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Action / Form Section */}
        {(activeTab === 'pending' || activeTab === 'reverted_by_auditor') && !isCounterView && (
          <div className="mt-4 pt-1">
            {!showApproveForm ? (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setShowApproveForm(true)}
                  disabled={isProcessing}
                  className={`flex-1 min-w-[150px] flex items-center justify-center gap-2 text-white py-2 px-3 rounded-lg font-bold transition-all disabled:opacity-50 text-sm ${activeTab === 'reverted_by_auditor' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                >
                  <CheckCircle className="w-4 h-4" /> {activeTab === 'reverted_by_auditor' ? 'Re-Approve for Audit' : 'Approve for Billing'}
                </button>
                <button
                  onClick={onRevert}
                  disabled={isProcessing}
                  className="flex items-center justify-center gap-2 bg-muted hover:bg-muted/80 text-foreground py-2 px-3 rounded-lg font-bold transition-all disabled:opacity-50 text-sm"
                >
                  <RotateCcw className="w-4 h-4" /> {activeTab === 'reverted_by_auditor' ? 'Revert to Counter' : 'Revert'}
                </button>
                <button
                  onClick={onViewBill}
                  className="flex items-center justify-center gap-2 bg-transparent border border-border hover:bg-muted text-foreground py-2 px-3 rounded-lg font-bold transition-all text-sm"
                >
                  <FileText className="w-4 h-4" /> View / Print
                </button>
              </div>
            ) : (
              <div className="border border-border bg-muted/30 rounded-lg p-4 animate-in slide-in-from-top-4 fade-in duration-300 mt-2">
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
                      {isExcess ? 'ADD EXCESS ADJUSTMENT (INR):' : isDue ? 'ADD APPROVAL DISCOUNT (INR):' : 'NO ADJUSTMENT NEEDED:'}
                    </label>
                    <input
                      type="number"
                      value={adjustmentValue}
                      onChange={(e) => setAdjustmentValue(e.target.value)}
                      placeholder={isExcess ? "Enter excess adjustment amount..." : "Enter optional discount amount..."}
                      disabled={!isExcess && !isDue}
                      className="w-full bg-background border border-border text-foreground px-3 py-2 rounded-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-mono text-sm disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
                      ADD APPROVAL NOTE:
                    </label>
                    <textarea
                      value={approvalNote}
                      onChange={(e) => setApprovalNote(e.target.value)}
                      placeholder="Add optional team lead review note..."
                      className="w-full bg-background border border-border text-foreground px-3 py-2 rounded-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm resize-none h-20"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      onClick={() => setShowApproveForm(false)}
                      className="px-4 py-1.5 rounded-md font-bold text-foreground bg-muted hover:bg-muted/80 transition-colors uppercase text-xs tracking-wider"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmApprove}
                      disabled={isProcessing}
                      className={`px-4 py-1.5 rounded-md font-bold text-white transition-colors uppercase text-xs tracking-wider disabled:opacity-50 ${activeTab === 'reverted_by_auditor' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                    >
                      {activeTab === 'reverted_by_auditor' ? 'Confirm Re-Approve' : 'Confirm Approve'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* View Bill fallback for approved/reverted */}
        {(activeTab !== 'pending' && activeTab !== 'reverted_by_auditor') && (
          <div className="mt-3 flex justify-end">
             <button
                onClick={onViewBill}
                className="flex items-center justify-center gap-2 bg-transparent border border-border hover:bg-muted text-foreground py-1.5 px-3 rounded-md text-xs font-bold transition-all"
              >
                <FileText className="w-3.5 h-3.5" /> View / Print Details
              </button>
          </div>
        )}
        
        {/* View Bill fallback for counter view pending */}
        {(activeTab === 'pending' || activeTab === 'reverted_by_auditor') && isCounterView && (
          <div className="mt-3 flex justify-between items-center">
             <span className="text-amber-600 dark:text-amber-400 font-bold text-[10px] uppercase tracking-widest flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Pending Review...</span>
             <button
                onClick={onViewBill}
                className="flex items-center justify-center gap-2 bg-transparent border border-border hover:bg-muted text-foreground py-1.5 px-3 rounded-md text-xs font-bold transition-all"
              >
                <FileText className="w-3.5 h-3.5" /> View / Print Details
              </button>
          </div>
        )}
      </div>
    </div>
  );
}
