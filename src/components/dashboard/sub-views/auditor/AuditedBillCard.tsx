import type { CounterBill } from '../../../../hooks/useAdminData';

interface AuditedBillCardProps {
  bill: CounterBill;
  onViewInvoice: () => void;
  onApprove?: () => void;
  onRevert?: () => void;
  onEdit?: () => void;
}

export function AuditedBillCard({ bill, onViewInvoice, onApprove, onRevert, onEdit }: AuditedBillCardProps) {
  const payments = bill.payment_audits || [];
  
  // Extract unique payment methods
  const paymentMethods = (() => {
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
  })();

  // Extract first valid UTR for the summary
  const mainUtr = payments.find((p: any) => p.utr)?.utr || 'N/A';

  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col gap-3 text-foreground transition-all hover:border-primary/50 hover:shadow-md cursor-pointer" onClick={onViewInvoice}>
      {/* Header row */}
      <div className="flex justify-between items-start">
        <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full">
          FORWARDED TO ADMIN
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
          MODE: {paymentMethods}
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

      {/* Breakdown Box */}
      <div className="bg-muted/50 rounded-lg p-2.5 text-xs flex flex-wrap gap-4 text-muted-foreground mt-1 border border-border">
        <span>Ex: <span className="text-foreground font-semibold">₹{(bill.base_amount || 0).toLocaleString()}</span></span>
        <span>CGST: <span className="text-foreground font-semibold">₹{(bill.cgst_amount || 0).toLocaleString()}</span></span>
        <span>SGST: <span className="text-foreground font-semibold">₹{(bill.sgst_amount || 0).toLocaleString()}</span></span>
      </div>

      {/* Dealership Savings */}
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 flex justify-between items-center mt-1">
        <span className="font-bold text-xs text-emerald-500">Dealership Savings Recorded:</span>
        <span className="font-black text-base text-emerald-500">₹{(bill.total_savings || 0).toLocaleString()}</span>
      </div>

      {/* Audited Details */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mt-1 space-y-3">
        <h4 className="font-bold text-[10px] uppercase tracking-widest text-primary mb-2">Audited Details:</h4>
        
        <div className="space-y-0.5 text-xs font-bold">
          <div className="text-primary/80">UTR: <span className="text-primary">{mainUtr}</span></div>
          <div className="text-foreground">Total Gap: ₹{(bill.total_gap || 0).toLocaleString()}</div>
        </div>

        {payments.length > 0 && (
          <div className="pt-3 border-t border-primary/20 space-y-3">
            {payments.map((p: any, i: number) => (
              <div key={i} className="text-[10px] font-mono space-y-1 pb-3 border-b border-primary/10 last:border-0 last:pb-0">
                <div className="font-bold text-muted-foreground">TX #{i + 1} ({p.method}):</div>
                <div className="text-muted-foreground">Ref: <span className="text-foreground">{p.reference || '-'}</span></div>
                {p.method?.toUpperCase() !== 'CASH' && (
                  <div className="text-muted-foreground">UTR: <span className="text-foreground">{p.utr || '-'}</span></div>
                )}
                <div className="text-muted-foreground">Gap: <span className="text-foreground">₹{p.gap || 0}</span></div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Admin Action Buttons */}
      {(onApprove || onRevert || onEdit) && (
        <>
          <hr className="border-border my-1" />
          <div className="flex justify-center gap-2">
            {onApprove && (
              <button 
                onClick={(e) => { e.stopPropagation(); onApprove(); }} 
                className="flex-1 py-1.5 bg-emerald-600/10 text-emerald-600 border border-emerald-600/20 hover:bg-emerald-600/20 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-colors"
              >
                Approve
              </button>
            )}
            {onRevert && (
              <button 
                onClick={(e) => { e.stopPropagation(); onRevert(); }} 
                className="flex-1 py-1.5 bg-red-600/10 text-red-600 border border-red-600/20 hover:bg-red-600/20 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-colors"
              >
                Revert
              </button>
            )}
            {onEdit && (
              <button 
                onClick={(e) => { e.stopPropagation(); onEdit(); }} 
                className="flex-1 py-1.5 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-colors"
              >
                Edit
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
