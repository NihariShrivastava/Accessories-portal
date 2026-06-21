import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import type { Accessory } from '../../hooks/useCounterData';

interface CartItem {
  accessory: Accessory;
  quantity: number;
}

interface BillFormProps {
  items: CartItem[];
  userId: string;
  onSuccess: () => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

export function BillForm({ items, userId, onSuccess, loading, setLoading }: BillFormProps) {
  const [chassisNo, setChassisNo] = useState('');
  const [engineNo, setEngineNo] = useState('');
  const [checklistNo, setChecklistNo] = useState('');
  const [payments, setPayments] = useState<{ method: string; amount: number | ''; utr: string }[]>([
    { method: 'Cash', amount: '', utr: '' }
  ]);

  const totals = items.reduce((acc, item) => {
    const base = item.accessory.price * item.quantity;
    const cgst = base * ((item.accessory.cgst_percent || 0) / 100);
    const sgst = base * ((item.accessory.sgst_percent || 0) / 100);
    return {
      baseAmount: acc.baseAmount + base,
      cgstAmount: acc.cgstAmount + cgst,
      sgstAmount: acc.sgstAmount + sgst,
      totalAmount: acc.totalAmount + base + cgst + sgst
    };
  }, { baseAmount: 0, cgstAmount: 0, sgstAmount: 0, totalAmount: 0 });

  const totalBillAmount = totals.totalAmount;

  const handleBuy = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check stock for all items
    for (const item of items) {
      if (item.quantity > item.accessory.quantity) {
        toast.error(`Not enough stock for ${item.accessory.name}`);
        return;
      }
    }

    const totalAmountPaid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const totalAmountLeft = Math.max(0, totalBillAmount - totalAmountPaid);
    const primaryMethod = payments.length > 1 ? 'Split Payment' : payments[0].method;

    setLoading(true);
    try {
      // Generate a unique sequential bill number by finding the highest current number
      const { data: allBills } = await supabase
        .from('bills')
        .select('bill_number')
        .not('bill_number', 'is', null)
        .order('bill_number', { ascending: false })
        .limit(20); // Get a few to be safe and find the actual max numeric

      let maxNum = 0;
      if (allBills && allBills.length > 0) {
        allBills.forEach(b => {
          // Match the numeric part INV-XXXX
          const match = b.bill_number?.match(/INV-(\d+)/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) maxNum = num;
          }
        });
      }
      
      const nextNum = maxNum + 1;
      const billNumber = `INV-${String(nextNum).padStart(4, '0')}`;

      // Insert multiple rows for the same bill
      const billRows = items.map((item, index) => {
        const base = item.accessory.price * item.quantity;
        const cgst = base * ((item.accessory.cgst_percent || 0) / 100);
        const sgst = base * ((item.accessory.sgst_percent || 0) / 100);
        const total = base + cgst + sgst;
        
        return {
          // Append suffix to handle unique constraint if multiple items
          bill_number: items.length > 1 ? `${billNumber}-${index + 1}` : billNumber,
          counter_id: userId,
          accessory_id: item.accessory.id,
          chassis_number: chassisNo,
          engine_number: engineNo,
          checklist_number: checklistNo,
          quantity: item.quantity,
          base_amount: base,
          cgst_amount: cgst,
          sgst_amount: sgst,
          total_amount: total,
          payment_method: primaryMethod,
          payment_details: payments,
          // Store total paid and left ONLY in the first row to avoid overcounting in sums
          amount_paid: index === 0 ? totalAmountPaid : 0,
          amount_left: index === 0 ? totalAmountLeft : 0
        };
      });

      const { error: billError } = await supabase.from('bills').insert(billRows);
      if (billError) throw billError;

      // Update quantities for each accessory
      for (const item of items) {
        const { error: updateError } = await supabase
          .from('accessories')
          .update({ quantity: item.accessory.quantity - item.quantity })
          .eq('id', item.accessory.id);
        if (updateError) throw updateError;
      }

      toast.success(`Bill ${billNumber} generated! Total: ₹${totalBillAmount.toFixed(2)}`);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate bill');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleBuy} className="space-y-4 text-sm">
      <div className="bg-primary/10 border border-primary/20 p-4 rounded-lg mb-6">
        <div className="space-y-1 mb-2 border-b border-primary/10 pb-2">
          <div className="flex justify-between text-xs text-primary/80">
            <span>Base Amount:</span>
            <span>₹{totals.baseAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs text-primary/80">
            <span>Total CGST:</span>
            <span>₹{totals.cgstAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs text-primary/80">
            <span>Total SGST:</span>
            <span>₹{totals.sgstAmount.toFixed(2)}</span>
          </div>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-semibold text-primary">Receivable Amount:</span>
          <span className="text-2xl font-bold text-primary">₹{totalBillAmount.toFixed(2)}</span>
        </div>
      </div>

      <div className="space-y-4">
        <div className="p-3 bg-muted/30 rounded-lg border border-border">
          <h4 className="font-bold mb-2 flex items-center gap-2">Items Breakdown ({items.length})</h4>
          <div className="max-h-[150px] overflow-y-auto space-y-2">
            {items.map(item => {
              const base = item.accessory.price * item.quantity;
              const cgst = base * ((item.accessory.cgst_percent || 0) / 100);
              const sgst = base * ((item.accessory.sgst_percent || 0) / 100);
              const total = base + cgst + sgst;
              return (
                <div key={item.accessory.id} className="flex flex-col text-xs pb-1 border-b border-border/50 last:border-0">
                  <div className="flex justify-between font-medium">
                    <span>{item.accessory.name} (x{item.quantity})</span>
                    <span>₹{total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
                    <span>Base: ₹{base.toFixed(2)}</span>
                    {(item.accessory.cgst_percent || 0) > 0 && (
                      <span>+ {item.accessory.cgst_percent}% CGST / {item.accessory.sgst_percent}% SGST</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block font-medium mb-1">Chassis Number</label>
          <input type="text" required className="w-full px-3 py-2 bg-input border border-border rounded-md focus:ring-2 focus:ring-primary" value={chassisNo} onChange={e => setChassisNo(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-medium mb-1">Engine Number</label>
            <input type="text" required className="w-full px-3 py-2 bg-input border border-border rounded-md focus:ring-2 focus:ring-primary" value={engineNo} onChange={e => setEngineNo(e.target.value)} />
          </div>
          <div>
            <label className="block font-medium mb-1">Checklist No.</label>
            <input type="text" required className="w-full px-3 py-2 bg-input border border-border rounded-md focus:ring-2 focus:ring-primary" value={checklistNo} onChange={e => setChecklistNo(e.target.value)} />
          </div>
        </div>

        <div className="space-y-3 pt-2 border-t border-border">
          <div className="flex justify-between items-center">
            <h4 className="font-bold text-sm">Payment Methods</h4>
            <button 
              type="button" 
              onClick={() => setPayments([...payments, { method: 'Cash', amount: '', utr: '' }])}
              className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded hover:bg-secondary/80"
            >
              + Add Payment Method
            </button>
          </div>
          
          {payments.map((payment, index) => (
            <div key={index} className="p-3 bg-muted/20 border border-border rounded-lg space-y-3 relative group">
              {payments.length > 1 && (
                <button 
                  type="button" 
                  onClick={() => setPayments(payments.filter((_, i) => i !== index))}
                  className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground w-5 h-5 rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                >
                  &times;
                </button>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1">Method</label>
                  <select 
                    className="w-full px-3 py-1.5 bg-input border border-border rounded-md focus:ring-2 focus:ring-primary text-sm" 
                    value={payment.method} 
                    onChange={e => {
                      const newP = [...payments];
                      newP[index].method = e.target.value;
                      if (e.target.value === 'Cash') newP[index].utr = '';
                      setPayments(newP);
                    }}
                  >
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="UPI">UPI</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Amount (₹)</label>
                  <input 
                    type="number" min="0" step="0.01" required 
                    className="w-full px-3 py-1.5 bg-input border border-border rounded-md focus:ring-2 focus:ring-primary text-sm" 
                    value={payment.amount} 
                    onChange={e => {
                      const newP = [...payments];
                      newP[index].amount = e.target.value ? parseFloat(e.target.value) : '';
                      setPayments(newP);
                    }} 
                  />
                </div>
              </div>
              {payment.method !== 'Cash' && (
                <div>
                  <label className="block text-xs font-medium mb-1">Transaction UTR / Reference ID</label>
                  <input 
                    type="text" required placeholder={`e.g. ${payment.method} Reference...`} 
                    className="w-full px-3 py-1.5 bg-input border border-border rounded-md focus:ring-2 focus:ring-primary text-sm" 
                    value={payment.utr} 
                    onChange={e => {
                      const newP = [...payments];
                      newP[index].utr = e.target.value;
                      setPayments(newP);
                    }} 
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-border bg-muted/50 p-4 rounded-md">
          <div className="flex justify-between font-bold text-lg mb-4 text-destructive">
            <span>Balance Left:</span>
            <span>₹{Math.max(0, totalBillAmount - payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)).toFixed(2)}</span>
          </div>
          <button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground py-2 rounded-md hover:bg-primary/90 font-medium flex items-center justify-center gap-2">
            {loading ? 'Processing...' : <><Check className="w-4 h-4" /> Save & Print Bill</>}
          </button>
        </div>
      </div>
    </form>
  );
}
