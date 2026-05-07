import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import type { Accessory } from '../../hooks/useCounterData';

interface BillFormProps {
  accessory: Accessory;
  userId: string;
  onSuccess: () => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

export function BillForm({ accessory, userId, onSuccess, loading, setLoading }: BillFormProps) {
  const [chassisNo, setChassisNo] = useState('');
  const [engineNo, setEngineNo] = useState('');
  const [checklistNo, setChecklistNo] = useState('');
  const [buyQuantity, setBuyQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [amountPaid, setAmountPaid] = useState<number | ''>('');
  const [upiId, setUpiId] = useState('');

  const handleBuy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (buyQuantity > accessory.quantity) {
      toast.error('Not enough stock available');
      return;
    }

    const totalAmount = buyQuantity * accessory.price;
    const paid = Number(amountPaid) || 0;
    const amountLeft = Math.max(0, totalAmount - paid);

    setLoading(true);
    try {
      const { error: billError } = await supabase.from('bills').insert([{
        counter_id: userId,
        accessory_id: accessory.id,
        chassis_number: chassisNo,
        engine_number: engineNo,
        checklist_number: checklistNo,
        quantity: buyQuantity,
        total_amount: totalAmount,
        payment_method: paymentMethod,
        amount_paid: paid,
        amount_left: amountLeft
      }]);

      if (billError) throw billError;

      const { error: updateError } = await supabase
        .from('accessories')
        .update({ quantity: accessory.quantity - buyQuantity })
        .eq('id', accessory.id);

      if (updateError) throw updateError;

      toast.success(`Bill generated successfully! Total: ₹${totalAmount.toFixed(2)}`);
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
          <span className="text-2xl font-bold text-primary">₹{(buyQuantity * accessory.price).toFixed(2)}</span>
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
          <label className="block font-medium mb-1">Quantity</label>
          <input type="number" min="1" max={accessory.quantity} required className="w-full px-3 py-2 bg-input border border-border rounded-md focus:ring-2 focus:ring-primary" value={buyQuantity} onChange={e => setBuyQuantity(parseInt(e.target.value) || 1)} />
        </div>
        <div>
          <label className="block font-medium mb-1">Payment Method</label>
          <select className="w-full px-3 py-2 bg-input border border-border rounded-md focus:ring-2 focus:ring-primary" value={paymentMethod} onChange={e => { setPaymentMethod(e.target.value); if (e.target.value !== 'UPI') setUpiId(''); }}>
            <option value="Cash">Cash</option>
            <option value="Card">Card</option>
            <option value="UPI">UPI</option>
            <option value="Bank Transfer">Bank Transfer</option>
          </select>
        </div>
      </div>

      {paymentMethod === 'UPI' && (
        <div>
          <label className="block font-medium mb-1">UPI ID</label>
          <input type="text" required placeholder="e.g. name@upi" className="w-full px-3 py-2 bg-input border border-border rounded-md focus:ring-2 focus:ring-primary" value={upiId} onChange={e => setUpiId(e.target.value)} />
        </div>
      )}

      <div>
        <label className="block font-medium mb-1">Amount Paid (₹)</label>
        <input type="number" min="0" step="0.01" required className="w-full px-3 py-2 bg-input border border-border rounded-md focus:ring-2 focus:ring-primary" value={amountPaid} onChange={e => setAmountPaid(e.target.value ? parseFloat(e.target.value) : '')} />
      </div>

      <div className="pt-4 border-t border-border bg-muted/50 p-4 rounded-md">
        <div className="flex justify-between font-bold text-lg mb-4 text-destructive">
          <span>Balance Left:</span>
          <span>₹{Math.max(0, (buyQuantity * accessory.price) - (Number(amountPaid) || 0)).toFixed(2)}</span>
        </div>
        <button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground py-2 rounded-md hover:bg-primary/90 font-medium flex items-center justify-center gap-2">
          {loading ? 'Processing...' : <><Check className="w-4 h-4" /> Save & Print Bill</>}
        </button>
      </div>
    </form>
  );
}
