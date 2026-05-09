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
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [amountPaid, setAmountPaid] = useState<number | ''>('');
  const [upiId, setUpiId] = useState('');

  const totalBillAmount = items.reduce((sum, item) => sum + (item.accessory.price * item.quantity), 0);

  const handleBuy = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check stock for all items
    for (const item of items) {
      if (item.quantity > item.accessory.quantity) {
        toast.error(`Not enough stock for ${item.accessory.name}`);
        return;
      }
    }

    const paid = Number(amountPaid) || 0;
    const totalAmountLeft = Math.max(0, totalBillAmount - paid);

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
      const billRows = items.map((item, index) => ({
        // Append suffix to handle unique constraint if multiple items
        bill_number: items.length > 1 ? `${billNumber}-${index + 1}` : billNumber,
        counter_id: userId,
        accessory_id: item.accessory.id,
        chassis_number: chassisNo,
        engine_number: engineNo,
        checklist_number: checklistNo,
        quantity: item.quantity,
        total_amount: item.accessory.price * item.quantity,
        payment_method: paymentMethod,
        // Store total paid and left ONLY in the first row to avoid overcounting in sums
        amount_paid: index === 0 ? paid : 0,
        amount_left: index === 0 ? totalAmountLeft : 0
      }));

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
        <div className="flex justify-between items-center">
          <span className="font-semibold text-primary">Receivable Amount:</span>
          <span className="text-2xl font-bold text-primary">₹{totalBillAmount.toFixed(2)}</span>
        </div>
      </div>

      <div className="space-y-4">
        <div className="p-3 bg-muted/30 rounded-lg border border-border">
          <h4 className="font-bold mb-2 flex items-center gap-2">Items Breakdown ({items.length})</h4>
          <div className="max-h-[150px] overflow-y-auto space-y-1">
            {items.map(item => (
              <div key={item.accessory.id} className="flex justify-between text-xs">
                <span>{item.accessory.name} (x{item.quantity})</span>
                <span className="font-medium">₹{(item.accessory.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
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

        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
          <div>
            <label className="block font-medium mb-1">Payment Method</label>
            <select className="w-full px-3 py-2 bg-input border border-border rounded-md focus:ring-2 focus:ring-primary" value={paymentMethod} onChange={e => { setPaymentMethod(e.target.value); if (e.target.value !== 'UPI') setUpiId(''); }}>
              <option value="Cash">Cash</option>
              <option value="Card">Card</option>
              <option value="UPI">UPI</option>
              <option value="Bank Transfer">Bank Transfer</option>
            </select>
          </div>
          <div>
            <label className="block font-medium mb-1">Amount Paid (₹)</label>
            <input type="number" min="0" step="0.01" required className="w-full px-3 py-2 bg-input border border-border rounded-md focus:ring-2 focus:ring-primary" value={amountPaid} onChange={e => setAmountPaid(e.target.value ? parseFloat(e.target.value) : '')} />
          </div>
        </div>

        {paymentMethod === 'UPI' && (
          <div>
            <label className="block font-medium mb-1">UPI ID</label>
            <input type="text" required placeholder="e.g. name@upi" className="w-full px-3 py-2 bg-input border border-border rounded-md focus:ring-2 focus:ring-primary" value={upiId} onChange={e => setUpiId(e.target.value)} />
          </div>
        )}

        <div className="pt-4 border-t border-border bg-muted/50 p-4 rounded-md">
          <div className="flex justify-between font-bold text-lg mb-4 text-destructive">
            <span>Balance Left:</span>
            <span>₹{Math.max(0, totalBillAmount - (Number(amountPaid) || 0)).toFixed(2)}</span>
          </div>
          <button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground py-2 rounded-md hover:bg-primary/90 font-medium flex items-center justify-center gap-2">
            {loading ? 'Processing...' : <><Check className="w-4 h-4" /> Save & Print Bill</>}
          </button>
        </div>
      </div>
    </form>
  );
}
