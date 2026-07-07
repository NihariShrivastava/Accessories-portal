import { useState } from 'react';
import { useAuth } from '../components/auth-provider';
import { useBillingCounterData } from '../hooks/useBillingCounterData';
import { FileText, CheckCircle2, ShieldCheck, Printer, FileCheck, Search, Download, Store } from 'lucide-react';
import type { CounterBill } from '../hooks/useAdminData';
import { BillReceipt } from '../components/dashboard/BillReceipt';
import { exportToExcel } from '../utils/exportToExcel';

export function BillingCounterDashboard() {
  const { profile } = useAuth();
  const { bills, loading, assignedCounters, updateBillToClosed, updateBillReferences } = useBillingCounterData();
  
  const [activeTab, setActiveTab] = useState<'workstation' | 'closed' | 'registry'>('workstation');
  const [generatedBill, setGeneratedBill] = useState<CounterBill | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [editingBill, setEditingBill] = useState<CounterBill | null>(null);
  
  const [editForm, setEditForm] = useState({
    customerId: '',
    excellonReceiptNumber: '',
    paymentDetails: [] as any[]
  });

  const [selectedCounters, setSelectedCounters] = useState<string[]>([]);
  const [registryModeFilter, setRegistryModeFilter] = useState('All');
  const [registryStatusFilter, setRegistryStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Auto-select all counters initially if empty, or just handle empty as all
  const activeCounters = selectedCounters.length > 0 ? selectedCounters : assignedCounters.map(c => c.id);

  const approvedBills = bills.filter(b => b.approval_status === 'approved' && activeCounters.includes(b.counter_id || ''));
  const closedBills = bills.filter(b => b.approval_status === 'closed' && activeCounters.includes(b.counter_id || ''));
  
  // Flatten payment details for registry
  const registryItems = closedBills.flatMap(b => {
    let details = b.payment_details;
    if (!details || !Array.isArray(details) || details.length === 0) {
      if (b.payment_method && b.payment_method.toLowerCase() !== 'cash') {
        details = [{ method: b.payment_method, amount: b.amount_paid, excellonReceipt: b.excellon_receipt_number, utrNumber: b.payment_method === 'Finance' ? '' : (b as any).utr_number }];
      } else {
        return [];
      }
    }
    
    return details
      .map((d: any, index: number) => ({
        ...d,
        billId: b.id,
        billNumber: b.bill_number,
        counterName: b.counter_name || 'Unknown',
        customerName: b.customer_name || '-',
        customerPhone: b.customer_phone || '-',
        vehicleModel: b.vehicle_model || '-',
        chassisNumber: b.chassis_number || '-',
        date: b.created_at,
        index
      }))
      .filter(d => d.method && d.method.toLowerCase() !== 'cash');
  });

  const filteredRegistry = registryItems.filter(item => {
    if (registryModeFilter !== 'All' && item.method !== registryModeFilter) return false;
    if (registryStatusFilter === 'Cleared Payouts' && !item.cleared) return false;
    if (registryStatusFilter === 'Pending Verification' && item.cleared) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!item.billNumber.toLowerCase().includes(q) && 
          !item.excellonReceipt?.toLowerCase().includes(q) && 
          !item.utrNumber?.toLowerCase().includes(q) &&
          !item.customerName?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const startEdit = (bill: CounterBill) => {
    setEditingBill(bill);
    let details = bill.payment_details;
    if (!details || !Array.isArray(details) || details.length === 0) {
      details = [{ method: bill.payment_method, amount: bill.amount_paid }];
    }
    
    // Normalize properties from legacy JSON shapes (utr -> utrNumber, excellon_receipt_number -> excellonReceipt)
    const normalizedDetails = details.map((d: any) => ({
      ...d,
      utrNumber: d.utrNumber || d.utr || (bill as any).utr_number || '',
      excellonReceipt: d.excellonReceipt || d.excellon_receipt_number || bill.excellon_receipt_number || ''
    }));

    setEditForm({
      customerId: bill.customer_id || '',
      excellonReceiptNumber: bill.excellon_receipt_number || '',
      paymentDetails: JSON.parse(JSON.stringify(normalizedDetails))
    });
  };

  const handleSaveEdit = async () => {
    if (!editingBill) return;
    try {
      await updateBillReferences(editingBill.id, editForm.customerId, editForm.paymentDetails, editForm.excellonReceiptNumber);
      setEditingBill(null);
    } catch (e) {
      // error handled in hook
    }
  };

  const handleMarkCleared = async (billId: string, paymentIndex: number) => {
    const bill = bills.find(b => b.id === billId);
    if (!bill) return;

    let details = bill.payment_details;
    if (!details || !Array.isArray(details) || details.length === 0) {
      details = [{ method: bill.payment_method, amount: bill.amount_paid, excellonReceipt: bill.excellon_receipt_number }];
    }

    const currentItem = details[paymentIndex];
    if (!currentItem) return;

    const utr = prompt(`Enter UTR / Reference Number to clear ${currentItem.method} payment of ₹${currentItem.amount}:`, currentItem.utrNumber || '');
    if (utr === null) return;

    const newDetails = [...details];
    newDetails[paymentIndex] = { ...currentItem, cleared: true, utrNumber: utr };

    try {
      await updateBillReferences(billId, bill.customer_id || '', newDetails, bill.excellon_receipt_number || '');
    } catch (e) {
      // error handled
    }
  };

  const handleMarkPending = async (billId: string, paymentIndex: number) => {
    const bill = bills.find(b => b.id === billId);
    if (!bill) return;

    let details = bill.payment_details;
    if (!details || !Array.isArray(details) || details.length === 0) return;

    const currentItem = details[paymentIndex];
    if (!currentItem) return;

    if (!confirm(`Are you sure you want to mark this ${currentItem.method} payment as pending again?`)) return;

    const newDetails = [...details];
    newDetails[paymentIndex] = { ...currentItem, cleared: false };

    try {
      await updateBillReferences(billId, bill.customer_id || '', newDetails, bill.excellon_receipt_number || '');
    } catch (e) {
      // error handled
    }
  };

  const handleExportLedger = () => {
    if (filteredRegistry.length === 0) return;
    const dataToExport = filteredRegistry.map(item => ({
      'Date': new Date(item.date).toLocaleDateString(),
      'Receipt No': item.billNumber,
      'Customer Name': item.customerName,
      'Customer Phone': item.customerPhone,
      'Model & Chassis': `${item.vehicleModel} / ${item.chassisNumber}`,
      'Counter': item.counterName,
      'Method': item.method,
      'Amount': Number(item.amount),
      'Excellon Receipt': item.excellonReceipt || '-',
      'UTR / DO No.': item.utrNumber || '-',
      'Status': item.cleared ? 'CLEARED PAYOUTS' : 'PENDING VERIFICATION'
    }));
    exportToExcel(dataToExport, 'Dealership_Non_Cash_Logbook');
  };

  const toggleCounter = (counterId: string) => {
    setSelectedCounters(prev => {
      const current = prev.length === 0 ? assignedCounters.map(c => c.id) : prev;
      if (current.includes(counterId)) {
        return current.filter(c => c !== counterId);
      } else {
        return [...current, counterId];
      }
    });
  };

  const clearToSingle = () => {
    if (assignedCounters.length > 0) {
      setSelectedCounters([assignedCounters[0].name]);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const activeBills = activeTab === 'workstation' ? approvedBills : closedBills;

  return (
    <div className="animate-in fade-in duration-500  text-foreground p-6 space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col items-center justify-center py-4 space-y-1">
        <div className="flex items-center gap-2 text-primary/60">
          <Store className="w-5 h-5" />
          <span className="text-xs font-black uppercase tracking-[0.2em]">Billing Counter Dashboard</span>
        </div>
        <h1 className="text-3xl font-black uppercase tracking-tight text-center">
          Welcome, <span className="text-primary">{profile?.name || 'Cashier'}</span>
        </h1>
        <p className="text-muted-foreground text-sm font-medium uppercase tracking-widest mt-2">
          Managing {assignedCounters.length} Counters
        </p>
        <div className="w-16 h-1.5 bg-primary rounded-full mt-4" />
      </div>



      {/* Tabs */}
      <div className="bg-card border border-border rounded-2xl p-2 flex overflow-x-auto">
        <button
          onClick={() => setActiveTab('workstation')}
          className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'workstation' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <FileText className="w-4 h-4" /> Billing Workstation
        </button>
        <button
          onClick={() => setActiveTab('closed')}
          className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'closed' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <CheckCircle2 className="w-4 h-4" /> Closed Bills ({closedBills.length})
        </button>
        <button
          onClick={() => setActiveTab('registry')}
          className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'registry' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <ShieldCheck className="w-4 h-4" /> Digital & Finance Registry ({filteredRegistry.length})
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Left Sidebar */}
        <div className="lg:w-72 flex-shrink-0">
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1 border-b border-border pb-3">SELECT ACTIVE COUNTERS</h3>
            <p className="text-[11px] text-muted-foreground mt-3 mb-4 leading-relaxed">
              Select one or more counter workstations to view and manage bills.
            </p>
            
            <div className="flex justify-between items-center mb-4">
              <button onClick={clearToSingle} className="text-xs font-bold text-foreground hover:text-foreground transition-colors">CLEAR TO SINGLE</button>
              <span className="text-[10px] text-muted-foreground font-mono">{activeCounters.length} / {assignedCounters.length} selected</span>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {assignedCounters.map(counter => (
                <div 
                  key={counter.id}
                  onClick={() => toggleCounter(counter.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    activeCounters.includes(counter.id) 
                      ? 'bg-muted/50 border-border' 
                      : 'border-border hover:border-border opacity-60'
                  }`}
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center ${activeCounters.includes(counter.id) ? 'bg-primary border-primary' : 'border-border'}`}>
                    {activeCounters.includes(counter.id) && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
                  </div>
                  <span className="text-xs font-bold text-foreground tracking-wide">{counter.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Content Area */}
        <div className="flex-1 min-w-0">
          
          {activeTab === 'registry' ? (
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-border bg-muted/50/50">
                <div className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2">DEALERSHIP NON-CASH LOGBOOK</div>
                <h2 className="text-2xl font-bold text-foreground mb-1">Reconciled Finance & Digital Payments</h2>
                <p className="text-xs text-muted-foreground mb-6">Track and monitor loan disbursements, digital gateway sales (UPI, cards, net banking, Amazon/Flipkart) and clear items with UTR numbers.</p>
                
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input 
                      type="text" 
                      placeholder="Search by receipt"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full bg-card border border-border text-sm text-foreground rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:border-primary"
                    />
                  </div>
                  <select 
                    value={registryModeFilter}
                    onChange={e => setRegistryModeFilter(e.target.value)}
                    className="bg-card border border-border text-sm text-foreground rounded-lg px-4 py-2 focus:outline-none focus:border-primary appearance-none cursor-pointer"
                  >
                    <option value="All">All Non-Cash Modes</option>
                    <option value="UPI">UPI</option>
                    <option value="Card">Card</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Finance">Finance</option>
                  </select>
                  <select 
                    value={registryStatusFilter}
                    onChange={e => setRegistryStatusFilter(e.target.value)}
                    className="bg-card border border-border text-sm text-foreground rounded-lg px-4 py-2 focus:outline-none focus:border-primary appearance-none cursor-pointer"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Pending Verification">⏳ Pending Verification</option>
                    <option value="Cleared Payouts">✓ Cleared Payouts</option>
                  </select>
                  <button 
                    onClick={handleExportLedger}
                    className="bg-card hover:bg-muted/50 border border-border text-sm text-foreground rounded-lg px-4 py-2 font-semibold transition-colors flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" /> Export Ledger
                  </button>
                </div>
              </div>

              <div className="p-6">
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">PAYMENT TRANSACTIONS ({filteredRegistry.length})</div>
                
                <div className="bg-card border border-border rounded-xl overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-muted/50 border-b border-border">
                        <th className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">RECEIPT NO</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">CUSTOMER DETAILS</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">MODEL & CHASSIS</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">PAYMENT METHOD</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">AMOUNT</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">RECONCILIATION STATUS</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-right">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {filteredRegistry.map(d => (
                        <tr key={`${d.billId}-${d.index}`} className="hover:bg-muted/50/50 transition-colors">
                          <td className="px-4 py-3 text-sm font-mono font-bold text-foreground">{d.billNumber}</td>
                          <td className="px-4 py-3 text-xs text-foreground">
                            <div className="font-semibold">{d.customerName}</div>
                            <div className="text-muted-foreground">{d.customerPhone}</div>
                          </td>
                          <td className="px-4 py-3 text-xs text-foreground">
                            <div>{d.vehicleModel}</div>
                            <div className="font-mono text-muted-foreground">{d.chassisNumber}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 bg-slate-800 text-foreground text-[10px] font-bold rounded">{d.method}</span>
                          </td>
                          <td className="px-4 py-3 text-sm font-bold text-foreground">₹{Number(d.amount).toLocaleString()}</td>
                          <td className="px-4 py-3">
                            {d.cleared ? (
                              <span className="px-2 py-1 bg-emerald-900/30 text-emerald-400 border border-emerald-900 text-[10px] font-bold rounded">CLEARED PAYOUTS</span>
                            ) : (
                              <span className="px-2 py-1 bg-amber-900/30 text-amber-400 border border-amber-900 text-[10px] font-bold rounded">PENDING VERIFICATION</span>
                            )}
                            <div className="text-[10px] text-muted-foreground mt-1">
                              {d.excellonReceipt ? `Exc: ${d.excellonReceipt}` : ''} {d.utrNumber ? `| UTR: ${d.utrNumber}` : ''}
                            </div>
                          </td>
                                                      <td className="px-4 py-3 text-right">
                              {!d.cleared ? (
                                <button 
                                  onClick={() => handleMarkCleared(d.billId, d.index)}
                                  className="px-3 py-1.5 text-[10px] font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded transition-colors"
                                >
                                  MARK CLEARED
                                </button>
                              ) : (
                                <button 
                                  onClick={() => handleMarkPending(d.billId, d.index)}
                                  className="px-3 py-1.5 text-[10px] font-bold bg-amber-900/50 hover:bg-amber-900 text-amber-400 border border-amber-900 rounded transition-colors"
                                >
                                  MARK PENDING
                                </button>
                              )}
                            </td>
                        </tr>
                      ))}
                      {filteredRegistry.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground text-sm">
                            No transactions found matching your criteria.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-border bg-muted/50/50">
                <h2 className="font-bold text-lg text-foreground flex items-center gap-2">
                  {activeTab === 'workstation' ? <FileText className="w-5 h-5 text-primary" /> : <FileCheck className="w-5 h-5 text-emerald-500" />} 
                  {activeTab === 'workstation' ? 'Approved Bills (Ready to Close)' : 'Closed Bills Log'}
                </h2>
              </div>
              <div className="bg-card overflow-x-auto p-4">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border">
                      <th className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-center w-12">S.No</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Bill No.</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Customer Info</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Accessories</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-right">Amount Left</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Status</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {activeBills.map((b, idx) => (
                      <tr key={b.id} className="hover:bg-muted/50/50 transition-colors">
                        <td className="px-4 py-4 text-sm text-center text-muted-foreground">{idx + 1}</td>
                        <td className="px-4 py-4 text-sm font-mono font-bold text-primary">{b.bill_number}</td>
                        <td className="px-4 py-4 text-sm text-foreground">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold">{b.customer_name || '-'}</span>
                            <span className="text-xs text-muted-foreground">{b.customer_phone || '-'}</span>
                          </div>
                        </td>
                                                  <td className="px-4 py-4 text-sm text-foreground">{b.items?.map(i => i.accessories?.name || i.accessory_name).filter(Boolean).join(', ') || b.accessory_name || '-'}</td>
                        <td className="px-4 py-4 text-sm font-bold text-amber-500 text-right">₹{(b.amount_left || 0).toLocaleString()}</td>
                        <td className="px-4 py-4">
                          {b.approval_status === 'closed' ? (
                            <span className="px-2 py-1 bg-blue-900/30 text-blue-400 border border-blue-900 text-[10px] font-bold rounded">CLOSED</span>
                          ) : (
                            <span className="px-2 py-1 bg-emerald-900/30 text-emerald-400 border border-emerald-900 text-[10px] font-bold rounded">APPROVED</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <button onClick={() => { setGeneratedBill(b); setShowReceipt(true); }} className="p-1.5 hover:bg-muted/50 rounded text-muted-foreground hover:text-foreground transition-colors" title="View Bill">
                              <Printer className="w-4 h-4" />
                            </button>
                            <button onClick={() => startEdit(b)} className="px-2 py-1.5 text-[10px] font-bold bg-muted/50 hover:bg-slate-700 text-foreground rounded transition-colors whitespace-nowrap" title="Add Excellon Receipt, UTR and Customer ID">
                              ADD REF / CID
                            </button>
                            {activeTab === 'workstation' && b.approval_status === 'approved' && (
                              <button onClick={() => { if(confirm(`Close bill ${b.bill_number}?`)) updateBillToClosed(b.id); }} className="px-3 py-1.5 text-[10px] font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded transition-colors shadow-sm whitespace-nowrap">
                                CLOSE BILL
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {activeBills.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground text-sm">
                          No records found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
        </div>
      </div>

      {showReceipt && generatedBill && (
        <div className="fixed inset-0 z-[100] bg-white overflow-y-auto">
          <BillReceipt bill={generatedBill as any} onClose={() => { setShowReceipt(false); setGeneratedBill(null); }} />
        </div>
      )}

      {editingBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-card border border-border shadow-2xl rounded-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/50/50">
              <div>
                <h3 className="text-xl font-bold text-foreground">Edit Reference & CRM Details</h3>
                <p className="text-sm text-muted-foreground font-medium mt-1">Bill No: {editingBill.bill_number}</p>
              </div>
              <button onClick={() => setEditingBill(null)} className="text-muted-foreground hover:text-foreground">
                <ShieldCheck className="w-6 h-6 opacity-0" />
                <span className="sr-only">Close</span>
              </button>
            </div>
            
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Customer ID (CRM)</label>
                <input 
                  type="text" 
                  value={editForm.customerId}
                  onChange={e => setEditForm({...editForm, customerId: e.target.value})}
                  className="w-full bg-muted/50 border border-border text-foreground rounded-lg px-4 py-2.5 focus:outline-none focus:border-primary"
                  placeholder="Enter Customer ID"
                />
              </div>

              {editForm.paymentDetails.length <= 1 && editForm.paymentDetails[0]?.method?.toLowerCase() === 'cash' ? (
                <div>
                  <label className="block text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Excellon Receipt Number</label>
                  <input 
                    type="text" 
                    value={editForm.excellonReceiptNumber}
                    onChange={e => setEditForm({...editForm, excellonReceiptNumber: e.target.value})}
                    className="w-full bg-muted/50 border border-border text-foreground rounded-lg px-4 py-2.5 focus:outline-none focus:border-primary"
                    placeholder="Enter Excellon Receipt"
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Payment References</h4>
                  {editForm.paymentDetails.map((p, idx) => (
                    <div key={idx} className="p-4 bg-muted/50/30 rounded-xl border border-border space-y-3 relative">
                      <div className="absolute top-0 right-0 px-3 py-1 bg-primary/20 text-primary font-bold text-xs rounded-bl-lg rounded-tr-xl">
                        {p.method}
                      </div>
                      <div className="font-semibold text-lg text-foreground">₹{Number(p.amount).toLocaleString()}</div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground mb-1">Excellon Receipt ID</label>
                          <input 
                            type="text" 
                            value={p.excellonReceipt || ''}
                            onChange={e => {
                              const newArr = [...editForm.paymentDetails];
                              newArr[idx].excellonReceipt = e.target.value;
                              setEditForm({...editForm, paymentDetails: newArr});
                            }}
                            className="w-full bg-card border border-border text-foreground rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary"
                            placeholder="Receipt ID"
                          />
                        </div>
                        {p.method.toLowerCase() !== 'cash' && (
                          <div>
                            <label className="block text-xs font-semibold text-muted-foreground mb-1">
                              {p.method.toLowerCase() === 'finance' ? 'Finance DO Number' : 'UTR Number'}
                            </label>
                            <input 
                              type="text" 
                              value={p.utrNumber || ''}
                              onChange={e => {
                                const newArr = [...editForm.paymentDetails];
                                newArr[idx].utrNumber = e.target.value;
                                setEditForm({...editForm, paymentDetails: newArr});
                              }}
                              className="w-full bg-card border border-border text-foreground rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary"
                              placeholder={p.method.toLowerCase() === 'finance' ? 'DO Number' : 'UTR'}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-border bg-muted/50/50 flex justify-end gap-3">
              <button onClick={() => setEditingBill(null)} className="px-4 py-2 font-semibold text-muted-foreground hover:text-foreground transition-colors">
                Cancel
              </button>
              <button onClick={handleSaveEdit} className="px-6 py-2 font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg shadow-md transition-all active:scale-95">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}






