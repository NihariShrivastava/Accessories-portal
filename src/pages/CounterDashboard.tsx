import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/auth-provider';
import { toast } from 'sonner';
import { Search, ShoppingCart, Check, X, History, ReceiptText, ArrowLeft } from 'lucide-react';

type Accessory = {
  id: string;
  name: string;
  quantity: number;
  price: number;
  vehicle_model: string;
};

type Bill = {
  id: string;
  chassis_number: string;
  engine_number: string;
  checklist_number: string;
  quantity: number;
  total_amount: number;
  payment_method: string;
  amount_paid: number;
  amount_left: number;
  created_at: string;
  accessories: { name: string; vehicle_model: string };
};

export function CounterDashboard() {
  const { user } = useAuth();
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [accessories, setAccessories] = useState<Accessory[]>([]);
  const [selectedAccessory, setSelectedAccessory] = useState<Accessory | null>(null);
  const [recentBills, setRecentBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(false);

  // Form states
  const [chassisNo, setChassisNo] = useState('');
  const [engineNo, setEngineNo] = useState('');
  const [checklistNo, setChecklistNo] = useState('');
  const [buyQuantity, setBuyQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [amountPaid, setAmountPaid] = useState<number | ''>('');
  const [upiId, setUpiId] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [activeView, setActiveView] = useState<'dashboard' | 'bills'>('dashboard');
  const [allBills, setAllBills] = useState<Bill[]>([]);

  useEffect(() => {
    if (user) {
      fetchModels();
      fetchRecentBills();
    }
  }, [user]);

  const fetchModels = async () => {
    try {
      const { data, error } = await supabase
        .from('accessories')
        .select('vehicle_model')
        .eq('counter_id', user?.id);

      if (error) throw error;
      
      const uniqueModels = Array.from(new Set(data.map(item => item.vehicle_model)));
      setModels(uniqueModels);
    } catch (error) {
      console.error('Error fetching models:', error);
    }
  };

  const fetchRecentBills = async () => {
    try {
      const { data, error } = await supabase
        .from('bills')
        .select(`
          *,
          accessories (name, vehicle_model)
        `)
        .eq('counter_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setRecentBills(data as any);
    } catch (error) {
      console.error('Error fetching bills:', error);
    }
  };

  const fetchAllBills = async () => {
    try {
      const { data, error } = await supabase
        .from('bills')
        .select(`
          *,
          accessories (name, vehicle_model)
        `)
        .eq('counter_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAllBills(data as any);
    } catch (error) {
      console.error('Error fetching all bills:', error);
    }
  };

  const fetchAccessories = async (model: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('accessories')
        .select('*')
        .eq('counter_id', user?.id)
        .eq('vehicle_model', model);

      if (error) throw error;
      setAccessories(data || []);
    } catch (error) {
      console.error('Error fetching accessories:', error);
      toast.error('Failed to load accessories');
    } finally {
      setLoading(false);
    }
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const model = e.target.value;
    setSelectedModel(model);
    if (model) {
      fetchAccessories(model);
    } else {
      setAccessories([]);
    }
  };

  const handleBuy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccessory) return;

    if (buyQuantity > selectedAccessory.quantity) {
      toast.error('Not enough stock available');
      return;
    }

    const totalAmount = buyQuantity * selectedAccessory.price;
    const paid = Number(amountPaid) || 0;
    const amountLeft = Math.max(0, totalAmount - paid);

    setLoading(true);

    try {
      // Create bill
      const { error: billError } = await supabase
        .from('bills')
        .insert([{
          counter_id: user?.id,
          accessory_id: selectedAccessory.id,
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

      // Update quantity
      const newQuantity = selectedAccessory.quantity - buyQuantity;
      const { error: updateError } = await supabase
        .from('accessories')
        .update({ quantity: newQuantity })
        .eq('id', selectedAccessory.id);

      if (updateError) throw updateError;

      toast.success(`Bill generated successfully! Total: ₹${totalAmount.toFixed(2)}`);
      
      // Reset and refresh
      setShowDialog(false);
      setSelectedAccessory(null);
      setChassisNo('');
      setEngineNo('');
      setChecklistNo('');
      setBuyQuantity(1);
      setPaymentMethod('Cash');
      setAmountPaid('');
      setUpiId('');
      
      fetchAccessories(selectedModel);
      fetchRecentBills();
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error: any) {
      console.error('Error generating bill:', error);
      toast.error(error.message || 'Failed to generate bill. Did you update the database schema?');
    } finally {
      setLoading(false);
    }
  };

  if (activeView === 'bills') {
    return (
      <div className="space-y-6">
        <button onClick={() => setActiveView('dashboard')} className="flex items-center gap-2 text-sm text-primary hover:underline font-medium">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>
        <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            All Bills
          </h2>
          {allBills.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground border border-dashed border-border rounded-lg">
              <ReceiptText className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No bills found for this counter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium rounded-tl-lg">Date</th>
                    <th className="px-4 py-3 font-medium">Accessory</th>
                    <th className="px-4 py-3 font-medium">Model</th>
                    <th className="px-4 py-3 font-medium text-center">Qty</th>
                    <th className="px-4 py-3 font-medium">Payment</th>
                    <th className="px-4 py-3 font-medium text-right">Total</th>
                    <th className="px-4 py-3 font-medium text-right">Paid</th>
                    <th className="px-4 py-3 font-medium text-right rounded-tr-lg">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {allBills.map((bill) => (
                    <tr key={bill.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(bill.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 font-medium">{bill.accessories?.name || 'Unknown'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{bill.accessories?.vehicle_model || '-'}</td>
                      <td className="px-4 py-3 text-center">{bill.quantity}</td>
                      <td className="px-4 py-3">
                        <span className="bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-xs font-medium">
                          {bill.payment_method || 'Cash'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">₹{bill.total_amount?.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-green-600 dark:text-green-400">₹{(bill.amount_paid ?? bill.total_amount)?.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-destructive font-medium">₹{(bill.amount_left ?? 0)?.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Search className="w-5 h-5 text-primary" />
            Search Vehicle Model
          </h2>
          <div>
            <select
              className="w-full px-4 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              value={selectedModel}
              onChange={handleModelChange}
            >
              <option value="">-- Select a Model --</option>
              {models.map(model => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={() => { fetchAllBills(); setActiveView('bills'); }}
          className="bg-card p-6 rounded-xl border border-border shadow-sm flex items-center gap-4 hover:border-primary/50 hover:shadow-md transition-all text-left group"
        >
          <div className="w-12 h-12 bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 rounded-full flex items-center justify-center">
            <ReceiptText className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground font-medium">Bills</p>
            <p className="text-2xl font-bold">{recentBills.length}+</p>
            <p className="text-xs text-muted-foreground">view all transactions</p>
          </div>
          <History className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </button>
      </div>

      {selectedModel && (
        <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Accessories for {selectedModel}</h3>
          {loading && !showDialog ? (
            <div className="py-8 text-center text-muted-foreground">Loading accessories...</div>
          ) : accessories.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No accessories available for this model.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium rounded-tl-lg">Accessory Name</th>
                    <th className="px-4 py-3 font-medium">Available Qty</th>
                    <th className="px-4 py-3 font-medium text-right">Price (1 Unit)</th>
                    <th className="px-4 py-3 font-medium text-center rounded-tr-lg">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {accessories.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3 font-medium">{item.name}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.quantity > 5 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                          {item.quantity} units
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">₹{item.price.toFixed(2)}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => {
                            setSelectedAccessory(item);
                            setAmountPaid('');
                            setBuyQuantity(1);
                            setPaymentMethod('Cash');
                            setUpiId('');
                            setChassisNo('');
                            setEngineNo('');
                            setChecklistNo('');
                            setShowDialog(true);
                          }}
                          disabled={item.quantity === 0}
                          className="inline-flex items-center gap-1 bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-xs font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                        >
                          <ShoppingCart className="w-3 h-3" /> Buy
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Dialog Modal for Generate Bill */}
      {showDialog && selectedAccessory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setShowDialog(false); setSelectedAccessory(null); }} />
          <div className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 z-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Generate Bill</h3>
              <button onClick={() => { setShowDialog(false); setSelectedAccessory(null); }} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4 p-3 bg-muted rounded-md text-sm border border-border">
              <p><span className="font-medium text-muted-foreground">Item:</span> {selectedAccessory.name}</p>
              <p><span className="font-medium text-muted-foreground">Price:</span> ₹{selectedAccessory.price.toFixed(2)}</p>
              <p><span className="font-medium text-muted-foreground">Available:</span> {selectedAccessory.quantity}</p>
            </div>

            <form onSubmit={handleBuy} className="space-y-4 text-sm">
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
                  <input type="number" min="1" max={selectedAccessory.quantity} required className="w-full px-3 py-2 bg-input border border-border rounded-md focus:ring-2 focus:ring-primary" value={buyQuantity} onChange={e => setBuyQuantity(parseInt(e.target.value) || 1)} />
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
                  <input
                    type="text"
                    required
                    placeholder="e.g. name@upi"
                    className="w-full px-3 py-2 bg-input border border-border rounded-md focus:ring-2 focus:ring-primary"
                    value={upiId}
                    onChange={e => setUpiId(e.target.value)}
                  />
                </div>
              )}

              <div>
                <label className="block font-medium mb-1">Amount Paid (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  className="w-full px-3 py-2 bg-input border border-border rounded-md focus:ring-2 focus:ring-primary"
                  value={amountPaid}
                  onChange={e => setAmountPaid(e.target.value ? parseFloat(e.target.value) : '')}
                />
              </div>

              <div className="pt-4 border-t border-border bg-muted/50 p-4 rounded-md">
                <div className="flex justify-between font-medium text-sm mb-1 text-muted-foreground">
                  <span>Total Amount:</span>
                  <span>₹{(buyQuantity * selectedAccessory.price).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg mb-4 text-destructive">
                  <span>Balance Left:</span>
                  <span>₹{Math.max(0, (buyQuantity * selectedAccessory.price) - (Number(amountPaid) || 0)).toFixed(2)}</span>
                </div>
                <button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground py-2 rounded-md hover:bg-primary/90 font-medium flex items-center justify-center gap-2">
                  {loading ? 'Processing...' : <><Check className="w-4 h-4" /> Save & Print Bill</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


    </div>
  );
}
