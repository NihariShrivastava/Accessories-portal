import { useState, useMemo } from 'react';
import { X, ShieldAlert } from 'lucide-react';
import type { CounterBill } from '../../../../hooks/useAdminData';

interface AuditDetailsDialogProps {
  bill: CounterBill;
  onClose: () => void;
  onSave: (billId: string, savingsData: any, paymentsData: any, totalSavings: number, totalGap: number) => void;
}

export function AuditDetailsDialog({ bill, onClose, onSave }: AuditDetailsDialogProps) {
  const [basePriceSavings, setBasePriceSavings] = useState<number | ''>('');
  const [miscOriginal, setMiscOriginal] = useState<number | ''>('');
  const [miscSavings, setMiscSavings] = useState<number | ''>('');

  const paymentMethods = useMemo(() => {
    let methods: any[] = [];
    if (bill.items && bill.items.length > 0 && bill.items[0].payment_details) {
      methods = bill.items[0].payment_details;
    } else if (bill.payment_details) {
      methods = bill.payment_details;
    } else {
      methods = [{ method: bill.payment_method || 'Unknown', amount: bill.amount_paid }];
    }
    return methods;
  }, [bill]);

  const [paymentsData, setPaymentsData] = useState(() => 
    paymentMethods.map(p => ({
      method: p.method,
      amount: p.amount,
      reference: p.utr || '',
      utr: p.utr || '',
      gap: '' as number | ''
    }))
  );

  const handlePaymentChange = (index: number, field: string, value: string) => {
    const newData = [...paymentsData];
    newData[index] = { ...newData[index], [field]: value };
    setPaymentsData(newData);
  };

  const tlDiscount = bill.discount_approved || 0;
  const tlExcess = bill.excess_adjustment || 0;
  
  const parsedBasePriceSavings = Number(basePriceSavings) || 0;
  const parsedMiscSavings = Number(miscSavings) || 0;
  
  // Adjusted: Removed TL Discount deduction
  const totalSavings = parsedBasePriceSavings + parsedMiscSavings + tlExcess;
  const totalGap = paymentsData.reduce((sum, p) => sum + (Number(p.gap) || 0), 0);

  const handleSave = () => {
    const savingsData = {
      base_price_savings: parsedBasePriceSavings,
      misc_original: Number(miscOriginal) || 0,
      misc_savings: parsedMiscSavings,
      tl_discount: tlDiscount,
      tl_excess: tlExcess
    };
    onSave(bill.id, savingsData, paymentsData.map(p => ({ ...p, gap: Number(p.gap) || 0 })), totalSavings, totalGap);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-5xl max-h-[90vh] rounded-2xl border border-border shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4">
          <div>
            <h2 className="text-xl font-black uppercase tracking-wider flex items-center gap-2 text-foreground">
              <ShieldAlert className="w-5 h-5 text-primary" />
              AUDIT RECEIPT #{bill.bill_number}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">Adjust reference numbers, UTR and record any deal-level discount/savings. Original price numbers remain read-only.</p>
          </div>
          <button onClick={onClose} className="px-3 py-1.5 flex items-center gap-2 bg-muted/50 hover:bg-muted rounded-lg border border-border transition-colors text-sm font-bold text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" /> Close
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-8">
          
          {/* Customer Details Banner */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 rounded-2xl border border-border">
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Customer</span>
              <span className="font-black text-foreground uppercase text-sm">{bill.customer_name || 'N/A'}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Phone</span>
              <span className="font-black text-foreground uppercase text-sm">{bill.customer_phone || 'N/A'}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Chassis No</span>
              <span className="font-black text-primary uppercase text-sm">{bill.chassis_number || 'N/A'}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Customer ID</span>
              <span className="font-black text-foreground uppercase text-sm">{bill.customer_id || 'N/A'}</span>
            </div>
          </div>
          
          {/* Dealership Savings Matrix */}
          <div>
            <div className="flex justify-between items-end mb-4 border-b border-border pb-2">
              <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-widest">Dealership Savings Matrix</h3>
              <div className="px-3 py-1 bg-green-500/10 border border-green-500/20 text-green-500 rounded-md text-[10px] font-black uppercase tracking-widest">
                TOTAL SAVINGS: ₹{totalSavings.toLocaleString()}
              </div>
            </div>
            
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="grid grid-cols-[2fr_1.5fr_1.5fr] gap-4 p-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-muted/20 border-b border-border">
                <div>Dealership Ledger Parameter</div>
                <div>Original Billed Value</div>
                <div>Deal Savings / Discount Value</div>
              </div>

              <div className="divide-y divide-border">
                {/* Base Price Row */}
                <div className="grid grid-cols-[2fr_1.5fr_1.5fr] gap-4 items-center p-4">
                  <div className="font-bold text-sm text-foreground">Base Price</div>
                  <div className="font-mono text-sm font-bold text-foreground">₹{(bill.base_amount || 0).toLocaleString()}</div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-xs">₹</span>
                    <input 
                      type="number"
                      className="w-full pl-7 pr-3 py-1.5 bg-background border border-border rounded-md focus:ring-1 focus:ring-primary text-right font-mono text-sm font-bold"
                      placeholder="0"
                      value={basePriceSavings}
                      onChange={e => setBasePriceSavings(e.target.value ? Number(e.target.value) : '')}
                    />
                  </div>
                </div>

                {/* Miscellaneous Row */}
                <div className="grid grid-cols-[2fr_1.5fr_1.5fr] gap-4 items-center p-4">
                  <div className="font-bold text-sm text-primary">Miscellaneous</div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-xs">₹</span>
                    <input 
                      type="number"
                      className="w-full pl-7 pr-3 py-1.5 bg-background border border-border rounded-md focus:ring-1 focus:ring-primary text-right font-mono text-sm"
                      placeholder="Enter Original"
                      value={miscOriginal}
                      onChange={e => setMiscOriginal(e.target.value ? Number(e.target.value) : '')}
                    />
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-xs">₹</span>
                    <input 
                      type="number"
                      className="w-full pl-7 pr-3 py-1.5 bg-background border border-border rounded-md focus:ring-1 focus:ring-primary text-right font-mono text-sm font-bold"
                      placeholder="Enter Savings"
                      value={miscSavings}
                      onChange={e => setMiscSavings(e.target.value ? Number(e.target.value) : '')}
                    />
                  </div>
                </div>

                {/* Team Lead Excess Row */}
                <div className="grid grid-cols-[2fr_1.5fr_1.5fr] gap-4 items-center p-4">
                  <div className="font-bold text-sm text-foreground flex items-center gap-2">
                    Team Lead Excess
                    <span className="text-[10px] bg-green-500/20 text-green-500 px-2 py-0.5 rounded-full uppercase tracking-wider">Added</span>
                  </div>
                  <div className="font-mono text-sm font-bold text-green-500">₹{(tlExcess || 0).toLocaleString()}</div>
                  <div className="relative opacity-50">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-xs">₹</span>
                    <input type="text" disabled className="w-full pl-7 pr-3 py-1.5 bg-muted border border-border rounded-md text-right font-mono text-sm" value="0" />
                  </div>
                </div>

                {/* Total Invoice Row */}
                <div className="grid grid-cols-[3.5fr_1.5fr] gap-4 items-center p-4 bg-muted/10">
                  <div className="font-black text-lg text-foreground">Total Invoice Value</div>
                  <div className="font-mono text-lg font-black text-primary text-right">
                    ₹{(bill.total_amount || 0).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Transaction Auditing */}
          <div>
            <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-widest mb-4 border-b border-border pb-2">
              Transaction Installments Reference & UTR Auditing
            </h3>
            <p className="text-xs text-muted-foreground mb-4">Review and audit the reference and UTR numbers for each installment payment logged for this receipt.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {paymentsData.map((p, index) => (
                <div key={index} className="rounded-2xl border border-border p-5 space-y-4">
                  <div className="flex justify-between items-center border-b border-border pb-3">
                    <div>
                      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">TX #{index + 1} MODE: <span className="text-primary">{p.method}</span></div>
                      <div className="text-xs font-bold text-foreground">Date: {new Date(bill.created_at).toLocaleDateString()}</div>
                    </div>
                    <div className="text-sm font-black text-yellow-500 font-mono">₹{Number(p.amount || 0).toLocaleString()}</div>
                  </div>

                  <div className={`grid gap-3 ${p.method?.toUpperCase() === 'CASH' ? 'grid-cols-1' : 'grid-cols-2'}`}>
                    {p.method?.toUpperCase() !== 'CASH' && (
                      <div>
                        <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Transaction UTR / Ref ID</span>
                        <div className="w-full px-3 py-1.5 bg-muted/50 border border-border rounded-md text-xs font-mono font-bold text-foreground truncate" title={p.utr || '-'}>
                          {p.utr || '-'}
                        </div>
                      </div>
                    )}
                    <div>
                      <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Gap (INR)</span>
                      <div className="relative">
                        <input 
                          type="number"
                          className="w-full pl-2 pr-2 py-1.5 bg-background border border-border rounded-md focus:ring-1 focus:ring-destructive text-xs font-mono font-bold"
                          placeholder="Gap Amount"
                          value={p.gap}
                          onChange={e => handlePaymentChange(index, 'gap', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-border flex justify-between gap-3 bg-card rounded-b-2xl">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 rounded-full font-bold bg-background border border-border hover:bg-muted transition-colors text-xs uppercase tracking-widest"
          >
            Cancel Changes
          </button>
          <button 
            onClick={handleSave}
            className="px-6 py-2.5 rounded-full font-black bg-primary text-primary-foreground hover:bg-primary/90 transition-all text-xs uppercase tracking-widest"
          >
            Save Draft Settings
          </button>
        </div>
      </div>
    </div>
  );
}
