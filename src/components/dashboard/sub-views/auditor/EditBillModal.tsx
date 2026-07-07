import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import { Modal } from '../../Modal';
import type { CounterBill } from '../../../../hooks/useAdminData';

interface EditBillModalProps {
  bill: CounterBill | null;
  onClose: () => void;
  onSave: (billId: string, metadata: any) => Promise<void>;
}

export function EditBillModal({ bill, onClose, onSave }: EditBillModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    chassis_number: bill?.chassis_number || '',
    engine_number: bill?.engine_number || '',
    checklist_number: bill?.checklist_number || '',
    customer_name: bill?.customer_name || '',
    customer_phone: bill?.customer_phone || '',
    customer_id: bill?.customer_id || '',
    payment_method: bill?.payment_method || 'Cash',
  });

  const [payments, setPayments] = useState<{ method: string; amount: number | ''; utr: string; excellon_receipt_number: string }[]>(
    bill?.payment_details && bill.payment_details.length > 0
      ? bill.payment_details.map(p => ({ ...p, excellon_receipt_number: p.excellon_receipt_number || '' }))
      : [{ method: bill?.payment_method || 'Cash', amount: bill?.amount_paid || '', utr: '', excellon_receipt_number: bill?.excellon_receipt_number || '' }]
  );

  if (!bill) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const primaryMethod = payments.length > 1 ? 'Split Payment' : payments[0].method;
      
      const totalAmountPaid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const totalAmountLeft = Math.max(0, bill.total_amount - totalAmountPaid);

      const combinedExcellon = payments.map(p => p.excellon_receipt_number).filter(Boolean).join(', ');

      const metadata = {
        chassis_number: formData.chassis_number,
        engine_number: formData.engine_number,
        checklist_number: formData.checklist_number,
        customer_name: formData.customer_name,
        customer_phone: formData.customer_phone,
        customer_id: formData.customer_id,
        excellon_receipt_number: combinedExcellon,
        payment_method: primaryMethod,
        payment_details: payments,
        amount_paid: totalAmountPaid,
        amount_left: totalAmountLeft
      };

      await onSave(bill.id, metadata);
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={!!bill} onClose={onClose} title={`Edit Details: ${bill.bill_number}`}>
      <form onSubmit={handleSubmit} className="space-y-4 p-4 text-sm max-h-[80vh] overflow-y-auto">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-medium mb-1 text-xs">Chassis Number</label>
            <input 
              type="text" required 
              className="w-full px-3 py-2 bg-input border border-border rounded-md focus:ring-2 focus:ring-primary" 
              value={formData.chassis_number} 
              onChange={e => setFormData({ ...formData, chassis_number: e.target.value })} 
            />
          </div>
          <div>
            <label className="block font-medium mb-1 text-xs">Engine Number</label>
            <input 
              type="text" required 
              className="w-full px-3 py-2 bg-input border border-border rounded-md focus:ring-2 focus:ring-primary" 
              value={formData.engine_number} 
              onChange={e => setFormData({ ...formData, engine_number: e.target.value })} 
            />
          </div>
          <div>
            <label className="block font-medium mb-1 text-xs">Checklist No.</label>
            <input 
              type="text" required 
              className="w-full px-3 py-2 bg-input border border-border rounded-md focus:ring-2 focus:ring-primary" 
              value={formData.checklist_number} 
              onChange={e => setFormData({ ...formData, checklist_number: e.target.value })} 
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-border">
          <div>
            <label className="block font-medium mb-1 text-xs">Customer Name</label>
            <input 
              type="text" 
              className="w-full px-3 py-2 bg-input border border-border rounded-md focus:ring-2 focus:ring-primary text-sm" 
              value={formData.customer_name} 
              onChange={e => setFormData({ ...formData, customer_name: e.target.value })} 
            />
          </div>
          <div>
            <label className="block font-medium mb-1 text-xs">Phone Number</label>
            <input 
              type="tel" 
              className="w-full px-3 py-2 bg-input border border-border rounded-md focus:ring-2 focus:ring-primary text-sm" 
              value={formData.customer_phone} 
              onChange={e => setFormData({ ...formData, customer_phone: e.target.value })} 
            />
          </div>
          <div>
            <label className="block font-medium mb-1 text-xs">Customer ID</label>
            <input 
              type="text" 
              className="w-full px-3 py-2 bg-input border border-border rounded-md focus:ring-2 focus:ring-primary text-sm" 
              value={formData.customer_id} 
              onChange={e => setFormData({ ...formData, customer_id: e.target.value })} 
            />
          </div>
        </div>

        <div className="space-y-3 pt-2 border-t border-border">
          <div className="flex justify-between items-center">
            <h4 className="font-bold text-sm">Payment Methods</h4>
            <button 
              type="button" 
              onClick={() => setPayments([...payments, { method: 'Cash', amount: '', utr: '', excellon_receipt_number: '' }])}
              className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded hover:bg-secondary/80"
            >
              + Add Payment
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
                  <X className="w-3 h-3" />
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
              <div>
                <label className="block text-xs font-medium mb-1">Excellon Receipt No.</label>
                <input 
                  type="text" required placeholder="e.g. EXC-12345" 
                  className="w-full px-3 py-1.5 bg-input border border-border rounded-md focus:ring-2 focus:ring-primary text-sm" 
                  value={payment.excellon_receipt_number || ''} 
                  onChange={e => {
                    const newP = [...payments];
                    newP[index].excellon_receipt_number = e.target.value;
                    setPayments(newP);
                  }} 
                />
              </div>
            </div>
          ))}
          <div className="flex justify-between items-center text-xs font-bold pt-2">
            <span>Total Bill Amount: ₹{bill.total_amount.toFixed(2)}</span>
            <span className={Math.max(0, bill.total_amount - payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)) > 0 ? "text-destructive" : "text-green-600"}>
              Balance Left: ₹{Math.max(0, bill.total_amount - payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)).toFixed(2)}
            </span>
          </div>
        </div>

        <div className="pt-4 border-t border-border mt-4">
          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-primary text-primary-foreground py-2 rounded-md hover:bg-primary/90 font-medium flex items-center justify-center gap-2"
          >
            {loading ? 'Saving...' : <><Save className="w-4 h-4" /> Save Changes</>}
          </button>
        </div>
      </form>
    </Modal>
  );
}
