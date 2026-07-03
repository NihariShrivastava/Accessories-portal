// src/pages/CashierDashboard.tsx
import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../components/auth-provider';
import { useCashierData } from '../hooks/useCashierData';

import { toast } from 'sonner';
import { UserCircle, RefreshCw, Check, Clock, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { MultiSelectDropdown } from '../components/dashboard/MultiSelectDropdown';
import { exportToExcel } from '../utils/exportToExcel';

export function CashierDashboard() {
  const { profile } = useAuth();
  const { assignedCounters, transactions, updateTransactionStatus, createDrawerAction, fetchTransactions, fetchBills } = useCashierData();
  
  const [selectedCounters, setSelectedCounters] = useState<string[]>([]);
  
  // Drawer Action Form States
  const [actionTab, setActionTab] = useState<'expense' | 'bank' | 'refund'>('expense');
  const [expenseCategory, setExpenseCategory] = useState('Electricity Bill');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [targetCounterId, setTargetCounterId] = useState('');
  const [settleAmount, setSettleAmount] = useState<number | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Table Tabs
  const tabsList = ['pending', 'approved', 'expenses', 'bank', 'refunds'] as const;
  const [tableTabIndex, setTableTabIndex] = useState(0);
  const tableTab = tabsList[tableTabIndex];

  const handlePrevTab = () => setTableTabIndex(prev => (prev > 0 ? prev - 1 : tabsList.length - 1));
  const handleNextTab = () => setTableTabIndex(prev => (prev < tabsList.length - 1 ? prev + 1 : 0));

  // Initialize selected counters to all assigned counters when loaded
  useEffect(() => {
    if (assignedCounters.length > 0 && selectedCounters.length === 0) {
      setSelectedCounters(assignedCounters.map(c => c.id));
    }
  }, [assignedCounters]);

  const selectedCounterNames = useMemo(() => {
    return assignedCounters
      .filter(c => selectedCounters.includes(c.id))
      .map(c => c.name)
      .join(', ') || 'None';
  }, [selectedCounters, assignedCounters]);

  // Metrics Calculation
  const metrics = useMemo(() => {
    let expenses = 0; // Sum of daily_expense for selected counters
    let bankTransfers = 0; // Sum of bank_transfers for this cashier
    let globalCashCollected = 0; // Sum of all approved cashier_transfers (across all counters)
    let refunds = 0;

    transactions.forEach(t => {
      if (t.status === 'approved') {
        if (t.transaction_type === 'cashier_transfer') {
          globalCashCollected += Number(t.amount);
        } else if (t.transaction_type === 'daily_expense' && selectedCounters.includes(t.counter_id)) {
          expenses += Number(t.amount);
        } else if (t.transaction_type === 'bank_transfer' && t.counter_id === profile?.id) {
          bankTransfers += Number(t.amount);
        } else if (t.transaction_type === 'refund' && selectedCounters.includes(t.counter_id)) {
          refunds += Number(t.amount);
        }
      }
    });

    return {
      cashCollected: globalCashCollected, // Showing total amount collected (approved handovers)
      expenses,
      bankTransfers,
      drawerBalance: globalCashCollected - expenses - bankTransfers - refunds
    };
  }, [transactions, selectedCounters, profile?.id]);

  // Table Data
  const pendingHandovers = useMemo(() => {
    return transactions.filter(t => 
      t.transaction_type === 'cashier_transfer' && 
      t.status === 'pending' &&
      selectedCounters.includes(t.counter_id)
    );
  }, [transactions, selectedCounters]);

  const approvedHandovers = useMemo(() => {
    return transactions.filter(t => 
      t.transaction_type === 'cashier_transfer' && 
      t.status === 'approved' &&
      selectedCounters.includes(t.counter_id)
    );
  }, [transactions, selectedCounters]);

  const expensesList = useMemo(() => {
    return transactions.filter(t => 
      t.transaction_type === 'daily_expense' && 
      (selectedCounters.includes(t.counter_id) || t.counter_id === profile?.id)
    );
  }, [transactions, selectedCounters, profile?.id]);

  const bankTransfersList = useMemo(() => {
    return transactions.filter(t => 
      t.transaction_type === 'bank_transfer' && 
      (selectedCounters.includes(t.counter_id) || t.counter_id === profile?.id)
    );
  }, [transactions, selectedCounters, profile?.id]);

  const refundsList = useMemo(() => {
    return transactions.filter(t => 
      t.transaction_type === 'refund' && 
      (selectedCounters.includes(t.counter_id) || t.counter_id === profile?.id)
    );
  }, [transactions, selectedCounters, profile?.id]);

  const handleRefresh = () => {
    fetchTransactions();
    fetchBills();
    toast.success('Data refreshed');
  };

  const handleExportTab = () => {
    let exportData: any[] = [];
    let filename = '';

    if (tableTab === 'pending') {
      exportData = pendingHandovers.map(t => ({
        'Counter Name': t.counter_name,
        'ID': t.id.split('-')[0],
        'Type': 'Cashier Transfer',
        'Amount (₹)': t.amount,
        'Status': 'PENDING',
        'Date': new Date(t.created_at).toLocaleString()
      }));
      filename = 'Pending_Handovers';
    } else if (tableTab === 'approved') {
      exportData = approvedHandovers.map(t => ({
        'Counter Name': t.counter_name,
        'ID': t.id.split('-')[0],
        'Type': 'Cashier Transfer',
        'Amount (₹)': t.amount,
        'Status': 'APPROVED',
        'Date': new Date(t.created_at).toLocaleString()
      }));
      filename = 'Approved_Handovers';
    } else if (tableTab === 'expenses') {
      exportData = expensesList.map(t => ({
        'Counter/Desk': t.counter_name || 'Cashier Desk',
        'ID': t.id.split('-')[0],
        'Category': t.category || t.details || 'N/A',
        'Amount (₹)': t.amount,
        'Status': 'DEDUCTED',
        'Date': new Date(t.created_at).toLocaleString()
      }));
      filename = 'Expenses';
    } else if (tableTab === 'bank') {
      exportData = bankTransfersList.map(t => ({
        'Bank Name': t.bank_name || 'Bank Transfer',
        'ID': t.id.split('-')[0],
        'Account Number': t.account_number || 'N/A',
        'IFSC': t.ifsc_code || 'N/A',
        'Amount (₹)': t.amount,
        'Status': 'TRANSFERRED',
        'Date': new Date(t.created_at).toLocaleString()
      }));
      filename = 'Bank_Transfers';
    } else if (tableTab === 'refunds') {
      exportData = refundsList.map(t => ({
        'Counter/Desk': t.counter_name || 'Cashier Desk',
        'ID': t.id.split('-')[0],
        'Details': t.details || 'N/A',
        'Amount (₹)': t.amount,
        'Status': 'DEDUCTED',
        'Date': new Date(t.created_at).toLocaleString()
      }));
      filename = 'Refunds';
    }

    if (exportData.length > 0) {
      exportToExcel(exportData, `Cashier_${profile?.name.replace(/\s+/g, '_')}_${filename}`);
    } else {
      toast.error('No data to export');
    }
  };

  const handlePostDrawerAction = async () => {
    if (actionTab !== 'bank' && !targetCounterId) {
      toast.error('Please select a counter drawer.');
      return;
    }
    if (!settleAmount || settleAmount <= 0) {
      toast.error('Please enter a valid amount.');
      return;
    }

    setIsSubmitting(true);
    let success = false;

    if (actionTab === 'expense') {
      success = await createDrawerAction({
        counter_id: targetCounterId,
        transaction_type: 'daily_expense',
        amount: Number(settleAmount),
        category: expenseCategory
      });
    } else if (actionTab === 'bank') {
      if (!bankName || !accountNumber || !ifscCode) {
        toast.error('Please fill in all bank details.');
        setIsSubmitting(false);
        return;
      }
      success = await createDrawerAction({
        counter_id: profile?.id, // Bank transfers are posted to Cashier
        transaction_type: 'bank_transfer',
        amount: Number(settleAmount),
        bank_name: bankName,
        account_number: accountNumber,
        ifsc_code: ifscCode
      });
    } else if (actionTab === 'refund') {
      if (!refundReason) {
        toast.error('Please provide a refund reason.');
        setIsSubmitting(false);
        return;
      }
      success = await createDrawerAction({
        counter_id: targetCounterId,
        transaction_type: 'refund',
        amount: Number(settleAmount),
        details: refundReason
      });
    }

    if (success) {
      setSettleAmount('');
      setAccountNumber('');
      setIfscCode('');
      setRefundReason('');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <UserCircle className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-black tracking-wide uppercase text-foreground">CASHIER PANEL</h1>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded text-[10px] font-bold tracking-wider uppercase">
                  Logged Active
                </span>
              </div>
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-0.5">
                OPERATOR DESK: <span className="text-primary">{profile?.name}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 px-4 py-2 bg-transparent border border-border text-foreground text-sm font-semibold hover:bg-muted rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* LEFT COLUMN: ACTIVE COUNTERS */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
            <h2 className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-2">
              Select Active Counters
            </h2>
            <p className="text-[11px] text-muted-foreground/80 mb-6 leading-relaxed border-b border-border pb-4">
              Select one or more assigned counter workstations to view and manage their cash drawers.
            </p>
            
            <MultiSelectDropdown
              options={assignedCounters.map(c => ({ id: c.id, name: c.name }))}
              selectedIds={selectedCounters}
              onChange={setSelectedCounters}
              placeholder="Select Counters"
            />
          </div>
        </div>

        {/* MIDDLE COLUMN: METRICS & TABLE */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xs font-bold tracking-widest text-muted-foreground uppercase flex items-center gap-2">
            Counter Workstations (Combined): 
            <span className="text-primary truncate max-w-[400px] inline-block align-bottom">{selectedCounterNames}</span>
          </h2>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-card rounded-xl border border-border p-4 shadow-sm text-center flex flex-col justify-center min-h-[100px]">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Total Cash Collected</div>
              <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">₹{metrics.cashCollected.toLocaleString()}</div>
            </div>
            <div className="bg-card rounded-xl border border-border p-4 shadow-sm text-center flex flex-col justify-center min-h-[100px]">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Expenses Deducted</div>
              <div className="text-xl font-black text-amber-600 dark:text-amber-400">₹{metrics.expenses.toLocaleString()}</div>
            </div>
            <div className="bg-card rounded-xl border border-border p-4 shadow-sm text-center flex flex-col justify-center min-h-[100px]">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Bank Transfers</div>
              <div className="text-xl font-black text-blue-600 dark:text-blue-400">₹{metrics.bankTransfers.toLocaleString()}</div>
            </div>
            <div className="bg-card rounded-xl border border-border p-4 shadow-sm text-center flex flex-col justify-center min-h-[100px]">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Drawer Cash Balance</div>
              <div className="text-xl font-black text-purple-600 dark:text-purple-400">₹{metrics.drawerBalance.toLocaleString()}</div>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="text-xs font-bold tracking-widest text-muted-foreground uppercase">Reconciled Cash Drawer Settlements</h3>
            </div>

            {/* Tabs Arrow Slider View */}
            <div className="p-4 border-b border-border">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex-1" /> {/* Spacer */}
                
                <div className="flex items-center justify-between bg-muted p-2 rounded-lg border border-border w-full max-w-[400px]">
                  <button 
                    onClick={handlePrevTab} 
                    className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-background/50 rounded transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-primary text-center flex-1">
                    {tableTab === 'pending' && `Pending Handover (${pendingHandovers.length})`}
                    {tableTab === 'approved' && `Approved Handover (${approvedHandovers.length})`}
                    {tableTab === 'expenses' && `Expenses (${expensesList.length})`}
                    {tableTab === 'bank' && `Bank Transfers (${bankTransfersList.length})`}
                    {tableTab === 'refunds' && `Refunds (${refundsList.length})`}
                  </div>
                  <button 
                    onClick={handleNextTab} 
                    className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-background/50 rounded transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="flex-1 flex justify-end w-full md:w-auto">
                  <button 
                    onClick={handleExportTab} 
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-500 border border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 hover:text-emerald-800 dark:hover:text-emerald-400 text-xs font-bold uppercase tracking-wider rounded-lg transition-all active:scale-95 whitespace-nowrap shadow-sm"
                  >
                    <Download className="w-4 h-4" /> Export List
                  </button>
                </div>
              </div>
              
              <div className="flex justify-center gap-1.5 mt-3">
                {tabsList.map((_, idx) => (
                  <div key={idx} className={`w-1.5 h-1.5 rounded-full transition-colors ${idx === tableTabIndex ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
                ))}
              </div>
            </div>

            {/* Table Data */}
            <div className="min-h-[300px] overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Counter / Payment ID</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Details</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Amount (INR)</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Status</th>
                    {tableTab === 'pending' && <th className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-center">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                    {tableTab === 'pending' && pendingHandovers.length === 0 && (
                      <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground text-sm">No pending handovers found.</td></tr>
                    )}
                    {tableTab === 'pending' && pendingHandovers.map(t => (
                      <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-4">
                          <div className="font-bold text-foreground text-sm">{t.counter_name}</div>
                          <div className="text-[10px] text-muted-foreground font-mono mt-1">ID: {t.id.split('-')[0]}</div>
                        </td>
                        <td className="px-4 py-4 text-xs">
                          <div className="text-muted-foreground">Bank: <span className="text-foreground">Cashier Transfer</span></div>
                          <div className="text-muted-foreground mt-0.5">Acc: N/A</div>
                          <div className="text-muted-foreground mt-0.5">{new Date(t.created_at).toLocaleString()}</div>
                        </td>
                        <td className="px-4 py-4 text-sm font-bold text-foreground">₹{t.amount.toLocaleString()}</td>
                        <td className="px-4 py-4">
                          <span className="px-2 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded text-[10px] font-bold tracking-wider flex items-center gap-1 w-max">
                            <Clock className="w-3 h-3" /> PENDING
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => updateTransactionStatus(t.id, 'approved')} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-primary-foreground text-xs font-bold rounded transition-colors shadow">Approve</button>
                            <button onClick={() => updateTransactionStatus(t.id, 'reverted')} className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-primary-foreground text-xs font-bold rounded transition-colors shadow">Revert</button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {tableTab === 'approved' && approvedHandovers.length === 0 && (
                      <tr><td colSpan={4} className="px-4 py-12 text-center text-muted-foreground text-sm">No approved handovers found.</td></tr>
                    )}
                    {tableTab === 'approved' && approvedHandovers.map(t => (
                      <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-4">
                          <div className="font-bold text-foreground text-sm">{t.counter_name}</div>
                          <div className="text-[10px] text-muted-foreground font-mono mt-1">ID: {t.id.split('-')[0]}</div>
                        </td>
                        <td className="px-4 py-4 text-xs">
                          <div className="text-muted-foreground">Type: <span className="text-foreground">Cashier Transfer</span></div>
                          <div className="text-muted-foreground mt-0.5">{new Date(t.created_at).toLocaleString()}</div>
                        </td>
                        <td className="px-4 py-4 text-sm font-bold text-foreground">₹{t.amount.toLocaleString()}</td>
                        <td className="px-4 py-4">
                          <span className="px-2 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded text-[10px] font-bold tracking-wider flex items-center gap-1 w-max">
                            <Check className="w-3 h-3" /> APPROVED
                          </span>
                        </td>
                      </tr>
                    ))}

                    {tableTab === 'expenses' && expensesList.length === 0 && (
                      <tr><td colSpan={4} className="px-4 py-12 text-center text-muted-foreground text-sm">No expenses found.</td></tr>
                    )}
                    {tableTab === 'expenses' && expensesList.map(t => (
                      <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-4">
                          <div className="font-bold text-foreground text-sm">{t.counter_name || 'Cashier Desk'}</div>
                          <div className="text-[10px] text-muted-foreground font-mono mt-1">ID: {t.id.split('-')[0]}</div>
                        </td>
                        <td className="px-4 py-4 text-xs">
                          <div className="text-muted-foreground uppercase tracking-wider text-[10px] mb-1 font-bold text-amber-600 dark:text-amber-400">DAILY EXPENSE</div>
                          <div className="text-foreground">{t.category || t.details || 'N/A'}</div>
                          <div className="text-muted-foreground mt-0.5">{new Date(t.created_at).toLocaleString()}</div>
                        </td>
                        <td className="px-4 py-4 text-sm font-bold text-foreground">₹{t.amount.toLocaleString()}</td>
                        <td className="px-4 py-4"><span className="px-2 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded text-[10px] font-bold tracking-wider flex items-center gap-1 w-max uppercase">DEDUCTED</span></td>
                      </tr>
                    ))}

                    {tableTab === 'bank' && bankTransfersList.length === 0 && (
                      <tr><td colSpan={4} className="px-4 py-12 text-center text-muted-foreground text-sm">No bank transfers found.</td></tr>
                    )}
                    {tableTab === 'bank' && bankTransfersList.map(t => (
                      <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-4">
                          <div className="font-bold text-foreground text-sm">{t.bank_name || 'Bank Transfer'}</div>
                          <div className="text-[10px] text-muted-foreground font-mono mt-1">ID: {t.id.split('-')[0]}</div>
                        </td>
                        <td className="px-4 py-4 text-xs">
                          <div className="text-muted-foreground uppercase tracking-wider text-[10px] mb-1 font-bold text-blue-600 dark:text-blue-400">BANK TRANSFER</div>
                          <div className="text-foreground">A/C: {t.account_number || 'N/A'}</div>
                          <div className="text-muted-foreground mt-0.5">IFSC: {t.ifsc_code || 'N/A'}</div>
                          <div className="text-muted-foreground mt-0.5">{new Date(t.created_at).toLocaleString()}</div>
                        </td>
                        <td className="px-4 py-4 text-sm font-bold text-foreground">₹{t.amount.toLocaleString()}</td>
                        <td className="px-4 py-4"><span className="px-2 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded text-[10px] font-bold tracking-wider flex items-center gap-1 w-max uppercase">TRANSFERRED</span></td>
                      </tr>
                    ))}

                    {tableTab === 'refunds' && refundsList.length === 0 && (
                      <tr><td colSpan={4} className="px-4 py-12 text-center text-muted-foreground text-sm">No refunds found.</td></tr>
                    )}
                  {tableTab === 'refunds' && refundsList.map(t => (
                    <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-4">
                        <div className="font-bold text-foreground text-sm">{t.counter_name || 'Cashier Desk'}</div>
                        <div className="text-[10px] text-muted-foreground font-mono mt-1">ID: {t.id.split('-')[0]}</div>
                      </td>
                      <td className="px-4 py-4 text-xs">
                        <div className="text-muted-foreground uppercase tracking-wider text-[10px] mb-1 font-bold text-rose-500">REFUND</div>
                        <div className="text-foreground">{t.details || 'N/A'}</div>
                        <div className="text-muted-foreground mt-0.5">{new Date(t.created_at).toLocaleString()}</div>
                      </td>
                      <td className="px-4 py-4 text-sm font-bold text-foreground">₹{t.amount.toLocaleString()}</td>
                      <td className="px-4 py-4"><span className="px-2 py-1 bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded text-[10px] font-bold tracking-wider flex items-center gap-1 w-max uppercase">DEDUCTED</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: NEW DRAWER ACTION */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
            <h2 className="text-xs font-bold tracking-widest text-foreground uppercase mb-2">
              New Drawer Action
            </h2>
            <p className="text-[11px] text-muted-foreground/80 mb-6 leading-relaxed border-b border-border pb-4">
              Post immediate counter expenses or bank balance transfers.
            </p>

            <div className="flex bg-muted p-1 rounded-lg mb-6 border border-border">
              <button
                onClick={() => setActionTab('expense')}
                className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded transition-all ${actionTab === 'expense' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Daily Expense
              </button>
              <button
                onClick={() => setActionTab('bank')}
                className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded transition-all ${actionTab === 'bank' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Bank Transfer
              </button>
              <button
                onClick={() => setActionTab('refund')}
                className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded transition-all ${actionTab === 'refund' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Refund
              </button>
            </div>

            <div className="space-y-5">
              {actionTab === 'expense' && (
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 ml-1">Expense Tag Category</label>
                  <select 
                    className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all appearance-none cursor-pointer"
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value)}
                  >
                    <option>Electricity Bill</option>
                    <option>Tea & Coffee Snacks</option>
                    <option>Office Supplies</option>
                    <option>Internet Bill</option>
                    <option>Courier Postage</option>
                    <option>Custom Tag Category</option>
                  </select>
                </div>
              )}

              {actionTab === 'bank' && (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 ml-1">Bank Name</label>
                    <select 
                      className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all appearance-none cursor-pointer"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                    >
                      <option value="">Select bank/financer</option>
                      <option value="SBI">State Bank of India (SBI)</option>
                      <option value="HDFC">HDFC Bank</option>
                      <option value="ICICI">ICICI Bank</option>
                      <option value="AXIS">Axis Bank</option>
                      <option value="KOTAK">Kotak Mahindra Bank</option>
                      <option value="PNB">Punjab National Bank</option>
                      <option value="BOB">Bank of Baroda</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 ml-1">Account Number</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 30294820192"
                      className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 ml-1">IFSC Code</label>
                    <input 
                      type="text" 
                      placeholder="e.g. SBIN0001234"
                      className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                      value={ifscCode}
                      onChange={(e) => setIfscCode(e.target.value)}
                    />
                  </div>
                </>
              )}

              {actionTab === 'refund' && (
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 ml-1">Refund Reason / Details</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Refund for chassis rejection REC-1234"
                    className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                  />
                </div>
              )}

              {actionTab !== 'bank' && (
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 ml-1">Post to Counter Drawer</label>
                  <select 
                    className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all appearance-none cursor-pointer"
                    value={targetCounterId}
                    onChange={(e) => setTargetCounterId(e.target.value)}
                  >
                    <option value="" disabled>Select Counter</option>
                    {assignedCounters.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1 mb-1">Settle Amount (INR)</label>
                <input 
                  type="number" 
                  placeholder="0"
                  className="w-full px-3 py-2.5 bg-input border border-border rounded-lg font-bold text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(Number(e.target.value))}
                />
              </div>

              <div className="pt-2">
                <button 
                  disabled={isSubmitting || (actionTab !== 'bank' && !targetCounterId) || !settleAmount}
                  onClick={handlePostDrawerAction}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 rounded-lg text-sm tracking-wider transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Processing...' : 'Post Drawer Settlement'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      </main>
    </div>
  );
}