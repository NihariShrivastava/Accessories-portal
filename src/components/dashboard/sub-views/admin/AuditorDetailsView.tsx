import { useState } from 'react';
import { ArrowLeft, ClipboardCheck, Clock, FileCheck } from 'lucide-react';
import type { CounterBill, AuditorReport } from '../../../../hooks/useAdminData';
import { AuditedBillCard } from '../auditor/AuditedBillCard';
import { AuditDetailsDialog } from '../auditor/AuditDetailsDialog';

interface AuditorDetailsViewProps {
  report: AuditorReport;
  pendingBills: CounterBill[];
  auditedBills: CounterBill[];
  onBack: () => void;
  onViewInvoice: (bill: CounterBill) => void;
  onUpdateBillAuditStatus?: (billId: string, status: 'verified' | 'reverted_by_admin') => void;
  onUpdateBillAuditDetails?: (billId: string, savingsData: any, paymentsData: any, totalSavings: number, totalGap: number) => void;
}

export function AuditorDetailsView({ report, pendingBills, auditedBills, onBack, onViewInvoice, onUpdateBillAuditStatus, onUpdateBillAuditDetails }: AuditorDetailsViewProps) {
  const [activeTab, setActiveTab] = useState<'pending' | 'audited'>('pending');
  const [editingBill, setEditingBill] = useState<CounterBill | null>(null);

  const displayBills = activeTab === 'pending' ? pendingBills : auditedBills;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-black text-foreground uppercase tracking-wide">
              {report.auditor_name}
            </h2>
            <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest mt-1">
              Auditor Overview
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl">
            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest block mb-1">Total Savings Found</span>
            <span className="font-black text-xl text-emerald-500">₹{(report.total_savings_found || 0).toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="flex bg-muted/30 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'pending' 
              ? 'bg-background text-foreground shadow-sm' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Clock className="w-4 h-4" />
          Pending Audit ({pendingBills.length})
        </button>
        <button
          onClick={() => setActiveTab('audited')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'audited' 
              ? 'bg-background text-foreground shadow-sm' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          Forwarded to Admin ({auditedBills.length})
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {displayBills.length === 0 ? (
          <div className="xl:col-span-2 text-center py-12 bg-card border border-border rounded-2xl shadow-sm">
            <ClipboardCheck className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground font-medium tracking-wide">
              No bills found in this queue.
            </p>
          </div>
        ) : (
          displayBills.map((bill) => (
            activeTab === 'pending' ? (
              <div key={bill.id} className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col gap-3 text-foreground transition-all hover:border-primary/50 hover:shadow-md">
                {/* Header row */}
                <div className="flex justify-between items-start">
                  <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-500 rounded-full border border-yellow-200 dark:border-yellow-900/50">
                    PENDING REVIEW
                  </span>
                  <div className="text-right">
                    <span className="text-muted-foreground text-[9px] font-bold tracking-widest uppercase block mb-0.5">Billed Amount</span>
                    <span className="font-bold text-xl text-foreground">₹{(bill.total_amount || 0).toLocaleString()}</span>
                  </div>
                </div>

                {/* Title & Mode */}
                <div className="flex justify-between items-end mt-0">
                  <h3 className="font-bold text-lg text-foreground tracking-wide uppercase">
                    {(!bill.vehicle_model || bill.vehicle_model.trim() === '-') ? `INVOICE: ${bill.bill_number}` : bill.vehicle_model.toUpperCase()}
                  </h3>
                  <span className="text-muted-foreground text-[9px] font-mono uppercase tracking-widest text-right">
                    MODE: {(() => {
                      let methods: any[] = [];
                      if (bill.items && bill.items.length > 0 && bill.items[0].payment_details) {
                        methods = bill.items[0].payment_details;
                      } else if (bill.payment_details) {
                        methods = bill.payment_details;
                      } else if (bill.payment_method) {
                        methods = [{ method: bill.payment_method }];
                      }
                      const uniqueMethods = Array.from(new Set(methods.map(m => m.method || 'UNKNOWN')));
                      return uniqueMethods.join(', ') || 'UNKNOWN';
                    })()}
                  </span>
                </div>

                {/* Details List */}
                <div className="grid grid-cols-2 gap-y-1.5 gap-x-2 text-[11px] font-mono mt-1">
                  <div className="col-span-2 text-primary font-bold">Receipt No: {bill.bill_number}</div>
                  <div className="text-muted-foreground truncate">Chassis: <span className="text-foreground">{bill.chassis_number || 'N/A'}</span></div>
                  <div className="text-muted-foreground truncate">Customer: <span className="text-foreground font-semibold">{bill.customer_name?.toUpperCase() || 'N/A'}</span></div>
                  <div className="text-muted-foreground truncate">Counter: <span className="text-foreground font-semibold">{bill.profiles?.name?.toUpperCase() || 'UNKNOWN'}</span></div>
                  <div className="text-muted-foreground truncate">Closed: <span className="text-foreground">{new Date(bill.created_at).toLocaleDateString()}</span></div>
                </div>

                {/* Dark gray box for breakdown */}
                <div className="bg-muted/50 rounded-lg p-2.5 text-xs flex flex-wrap gap-4 text-muted-foreground mt-1 border border-border">
                  <span>Ex: <span className="text-foreground font-semibold">₹{(bill.base_amount || 0).toLocaleString()}</span></span>
                  <span>CGST: <span className="text-foreground font-semibold">₹{(bill.cgst_amount || 0).toLocaleString()}</span></span>
                  <span>SGST: <span className="text-foreground font-semibold">₹{(bill.sgst_amount || 0).toLocaleString()}</span></span>
                </div>
              </div>
            ) : (
              <AuditedBillCard 
                key={bill.id}
                bill={bill}
                onViewInvoice={() => onViewInvoice(bill)}
                onApprove={() => {
                  if (confirm(`Approve this audit for Bill ${bill.bill_number}?`)) {
                    onUpdateBillAuditStatus?.(bill.id, 'verified');
                  }
                }}
                onRevert={() => {
                  if (confirm(`Revert this audit back to the Auditor for Bill ${bill.bill_number}?`)) {
                    onUpdateBillAuditStatus?.(bill.id, 'reverted_by_admin');
                  }
                }}
                onEdit={() => setEditingBill(bill)}
              />
            )
          ))
        )}
      </div>

      {editingBill && (
        <AuditDetailsDialog 
          bill={editingBill}
          onClose={() => setEditingBill(null)}
          onSave={async (billId, savings, payments, tSavings, tGap) => {
            if (onUpdateBillAuditDetails) {
              await onUpdateBillAuditDetails(billId, savings, payments, tSavings, tGap);
            }
            setEditingBill(null);
          }}
        />
      )}
    </div>
  );
}
