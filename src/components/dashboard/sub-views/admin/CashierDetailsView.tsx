// src/components/dashboard/sub-views/admin/CashierDetailsView.tsx
import { useState, useEffect } from 'react';
import { api } from '../../../../lib/api';
import { ViewHeader } from '../../ViewHeader';
import { ChevronLeft, ChevronRight, Clock, Check, UserCircle } from 'lucide-react';
import type { CashierReport } from "../../../../hooks/useAdminData";

export const CashierDetailsView = ({ cashierReport, onBack }: { cashierReport: CashierReport, onBack: () => void }) => {
  const [tableTab, setTableTab] = useState<'pending' | 'approved' | 'expenses' | 'bank' | 'refunds'>('approved');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      try {
        const profileData = await api.fetch('/api/protected/profiles/me');
        const assigned = profileData?.assigned_counters || [];
        const ids = [...assigned, cashierReport.cashier_id];

        const data = await api.fetch('/api/protected/drawer_transactions/list', {
          method: 'POST',
          body: JSON.stringify({ counter_ids: ids })
        });
        setTransactions(data || []);
      } catch (err) {
        console.error('Error fetching cashier transactions', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTransactions();
  }, [cashierReport]);

  const tabsList: { id: typeof tableTab; label: string; count?: number }[] = [
    { id: 'pending', label: 'PENDING HANDOVER', count: transactions.filter(t => t.transaction_type === 'cashier_transfer' && t.status === 'pending').length },
    { id: 'approved', label: 'APPROVED HANDOVER', count: transactions.filter(t => t.transaction_type === 'cashier_transfer' && t.status === 'approved').length },
    { id: 'expenses', label: 'DAILY EXPENSES' },
    { id: 'bank', label: 'BANK TRANSFERS' },
    { id: 'refunds', label: 'REFUNDS' }
  ];

  const handlePrevTab = () => {
    const currentIndex = tabsList.findIndex(t => t.id === tableTab);
    const newIndex = currentIndex === 0 ? tabsList.length - 1 : currentIndex - 1;
    setTableTab(tabsList[newIndex].id);
  };

  const handleNextTab = () => {
    const currentIndex = tabsList.findIndex(t => t.id === tableTab);
    const newIndex = currentIndex === tabsList.length - 1 ? 0 : currentIndex + 1;
    setTableTab(tabsList[newIndex].id);
  };

  const pendingHandovers = transactions.filter(t => t.transaction_type === 'cashier_transfer' && t.status === 'pending');
  const approvedHandovers = transactions.filter(t => t.transaction_type === 'cashier_transfer' && t.status === 'approved');
  const expensesList = transactions.filter(t => t.transaction_type === 'daily_expense' && t.status === 'approved');
  const bankTransfersList = transactions.filter(t => t.transaction_type === 'bank_transfer' && t.status === 'approved');
  const refundsList = transactions.filter(t => t.transaction_type === 'refund' && t.status === 'approved');

  return (
    <div className="space-y-6">
      <ViewHeader title={`Drawer Details: ${cashierReport.cashier_name}`} onBack={onBack} backLabel="Back to Reports" icon={UserCircle} />
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="text-xs font-bold tracking-widest text-muted-foreground uppercase">Reconciled Cash Drawer Settlements</h3>
        </div>
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between bg-muted p-2 rounded-lg border border-border max-w-[400px] mx-auto">
            <button onClick={handlePrevTab} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-background/50 rounded transition-colors"><ChevronLeft className="w-5 h-5" /></button>
            <div className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-primary text-center flex-1">
              {tabsList.find(t => t.id === tableTab)?.label} {tabsList.find(t => t.id === tableTab)?.count !== undefined && `(${tabsList.find(t => t.id === tableTab)?.count})`}
            </div>
            <button onClick={handleNextTab} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-background/50 rounded transition-colors"><ChevronRight className="w-5 h-5" /></button>
          </div>
          <div className="flex justify-center gap-1.5 mt-3">
            {tabsList.map((tab) => <div key={tab.id} className={`w-1.5 h-1.5 rounded-full transition-colors ${tab.id === tableTab ? 'bg-primary' : 'bg-border'}`} />)}
          </div>
        </div>
        <div className="min-h-[300px] overflow-x-auto relative">
          {loading && <div className="absolute inset-0 bg-background/50 z-10 flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div></div>}
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Counter / Payment ID</th>
                <th className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Details</th>
                <th className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Amount (INR)</th>
                <th className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tableTab === 'pending' && pendingHandovers.length === 0 && <tr><td colSpan={4} className="px-4 py-12 text-center text-muted-foreground text-sm">No pending handovers found.</td></tr>}
              {tableTab === 'pending' && pendingHandovers.map(t => (
                <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-4"><div className="font-bold text-foreground text-sm">{t.counter_name}</div><div className="text-[10px] text-muted-foreground font-mono mt-1">ID: {t.id.split('-')[0]}</div></td>
                  <td className="px-4 py-4 text-xs"><div className="text-muted-foreground">Bank: <span className="text-foreground">Cashier Transfer</span></div><div className="text-muted-foreground mt-0.5">Acc: N/A</div><div className="text-muted-foreground mt-0.5">{new Date(t.created_at).toLocaleString()}</div></td>
                  <td className="px-4 py-4 text-sm font-bold text-foreground">₹{t.amount.toLocaleString()}</td>
                  <td className="px-4 py-4"><span className="px-2 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded text-[10px] font-bold tracking-wider flex items-center gap-1 w-max"><Clock className="w-3 h-3" /> PENDING</span></td>
                </tr>
              ))}
              {tableTab === 'approved' && approvedHandovers.length === 0 && <tr><td colSpan={4} className="px-4 py-12 text-center text-muted-foreground text-sm">No approved handovers found.</td></tr>}
              {tableTab === 'approved' && approvedHandovers.map(t => (
                <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-4"><div className="font-bold text-foreground text-sm">{t.counter_name}</div><div className="text-[10px] text-muted-foreground font-mono mt-1">ID: {t.id.split('-')[0]}</div></td>
                  <td className="px-4 py-4 text-xs"><div className="text-muted-foreground">Type: <span className="text-foreground">Cashier Transfer</span></div><div className="text-muted-foreground mt-0.5">{new Date(t.created_at).toLocaleString()}</div></td>
                  <td className="px-4 py-4 text-sm font-bold text-foreground">₹{t.amount.toLocaleString()}</td>
                  <td className="px-4 py-4"><span className="px-2 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded text-[10px] font-bold tracking-wider flex items-center gap-1 w-max"><Check className="w-3 h-3" /> APPROVED</span></td>
                </tr>
              ))}
              {tableTab === 'expenses' && expensesList.length === 0 && <tr><td colSpan={4} className="px-4 py-12 text-center text-muted-foreground text-sm">No expenses found.</td></tr>}
              {tableTab === 'expenses' && expensesList.map(t => (
                <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-4"><div className="font-bold text-foreground text-sm">{t.counter_name || 'Cashier Desk'}</div><div className="text-[10px] text-muted-foreground font-mono mt-1">ID: {t.id.split('-')[0]}</div></td>
                  <td className="px-4 py-4 text-xs"><div className="text-muted-foreground uppercase tracking-wider text-[10px] mb-1 font-bold text-amber-600 dark:text-amber-400">DAILY EXPENSE</div><div className="text-foreground">{t.category || t.details || 'N/A'}</div><div className="text-muted-foreground mt-0.5">{new Date(t.created_at).toLocaleString()}</div></td>
                  <td className="px-4 py-4 text-sm font-bold text-foreground">₹{t.amount.toLocaleString()}</td>
                  <td className="px-4 py-4"><span className="px-2 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded text-[10px] font-bold tracking-wider flex items-center gap-1 w-max uppercase">DEDUCTED</span></td>
                </tr>
              ))}
              {tableTab === 'bank' && bankTransfersList.length === 0 && <tr><td colSpan={4} className="px-4 py-12 text-center text-muted-foreground text-sm">No bank transfers found.</td></tr>}
              {tableTab === 'bank' && bankTransfersList.map(t => (
                <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-4"><div className="font-bold text-foreground text-sm">{t.bank_name || 'Bank Transfer'}</div><div className="text-[10px] text-muted-foreground font-mono mt-1">ID: {t.id.split('-')[0]}</div></td>
                  <td className="px-4 py-4 text-xs"><div className="text-muted-foreground uppercase tracking-wider text-[10px] mb-1 font-bold text-blue-600 dark:text-blue-400">BANK TRANSFER</div><div className="text-foreground">A/C: {t.account_number || 'N/A'}</div><div className="text-muted-foreground mt-0.5">IFSC: {t.ifsc_code || 'N/A'}</div><div className="text-muted-foreground mt-0.5">{new Date(t.created_at).toLocaleString()}</div></td>
                  <td className="px-4 py-4 text-sm font-bold text-foreground">₹{t.amount.toLocaleString()}</td>
                  <td className="px-4 py-4"><span className="px-2 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded text-[10px] font-bold tracking-wider flex items-center gap-1 w-max uppercase">TRANSFERRED</span></td>
                </tr>
              ))}
              {tableTab === 'refunds' && refundsList.length === 0 && <tr><td colSpan={4} className="px-4 py-12 text-center text-muted-foreground text-sm">No refunds found.</td></tr>}
              {tableTab === 'refunds' && refundsList.map(t => (
                <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-4"><div className="font-bold text-foreground text-sm">{t.counter_name || 'Cashier Desk'}</div><div className="text-[10px] text-muted-foreground font-mono mt-1">ID: {t.id.split('-')[0]}</div></td>
                  <td className="px-4 py-4 text-xs"><div className="text-muted-foreground uppercase tracking-wider text-[10px] mb-1 font-bold text-rose-500">REFUND</div><div className="text-foreground">{t.details || 'N/A'}</div><div className="text-muted-foreground mt-0.5">{new Date(t.created_at).toLocaleString()}</div></td>
                  <td className="px-4 py-4 text-sm font-bold text-foreground">₹{t.amount.toLocaleString()}</td>
                  <td className="px-4 py-4"><span className="px-2 py-1 bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded text-[10px] font-bold tracking-wider flex items-center gap-1 w-max uppercase">DEDUCTED</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};