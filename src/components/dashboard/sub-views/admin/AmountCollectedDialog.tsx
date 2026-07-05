// src/components/dashboard/sub-views/admin/AmountCollectedDialog.tsx
import { X, Download } from 'lucide-react';
import type { AmountCollectedReport } from '../../../../hooks/useAdminData';
import { exportToExcel } from '../../../../utils/exportToExcel';

export const AmountCollectedDialog = ({
  report,
  onClose
}: {
  report: AmountCollectedReport;
  onClose: () => void;
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-card w-full max-w-4xl max-h-[90vh] rounded-xl border border-border shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border bg-muted/30">
          <div>
            <h3 className="text-xl font-black uppercase tracking-tight text-primary">
              {report.counter_name} - Collected Bills
            </h3>
            <p className="text-sm text-muted-foreground mt-1 font-medium">
              Detailed breakdown of amount collected for this counter
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const exportData = report.bills_data.map(bill => {
                  const otherPayments = bill.payment_details.filter((p: any) => p.method.toLowerCase() !== 'cash');
                  const others = otherPayments.map((p: any) => `${p.method}: ₹${Number(p.amount).toFixed(2)}`).join(', ');
                  return {
                    'Bill Number': bill.bill_number,
                    'Cash Amount (₹)': bill.cash_amount,
                    'Other Payments': others || '-'
                  };
                });
                if (exportData.length > 0) {
                  exportToExcel(exportData, `${report.counter_name.replace(/\s+/g, '_')}_Amount_Collected_Report`);
                }
              }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-500 border border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 hover:text-emerald-800 dark:hover:text-emerald-400 text-xs font-bold uppercase tracking-wider rounded-lg transition-all active:scale-95 shadow-sm whitespace-nowrap"
            >
              <Download className="w-4 h-4" /> Export Report
            </button>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-muted/10">
          <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-muted/50 text-muted-foreground font-bold border-b border-border">
                  <tr>
                    <th className="px-4 py-3">Bill Number</th>
                    <th className="px-4 py-3 text-right text-emerald-600">Cash Amount</th>
                    <th className="px-4 py-3 text-right">Other Payment Method</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {report.bills_data.map((bill, index) => {
                    const otherPayments = bill.payment_details.filter((p: any) => p.method.toLowerCase() !== 'cash');
                    return (
                      <tr key={index} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-mono font-medium">{bill.bill_number}</td>
                        <td className="px-4 py-3 text-right font-medium text-emerald-600">
                          ₹{Number(bill.cash_amount).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {otherPayments.length > 0 ? (
                            <div className="flex flex-col items-end gap-1">
                              {otherPayments.map((p: any, i: number) => (
                                <div key={i} className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                    {p.method}:
                                  </span>
                                  <span>₹{Number(p.amount).toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {report.bills_data.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                        No bills found for this counter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-border bg-muted/30 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-secondary text-secondary-foreground rounded-lg font-bold hover:bg-secondary/80 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};