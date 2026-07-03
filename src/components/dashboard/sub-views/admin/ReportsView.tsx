// src/components/dashboard/sub-views/admin/ReportsView.tsx
import { useState } from 'react';
import { DataTable } from '../../DataTable';
import { ViewHeader } from '../../ViewHeader';
import { Badge } from '../../Badge';
import { BarChart3, ChevronLeft, ChevronRight, History, IndianRupee, Package, X, Save, Users, Download } from 'lucide-react';
import type { SalesReport, InventoryItem, InventorySummary, CashierReport, AmountCollectedReport, TeamLeadReport } from '../../../../hooks/useAdminData';
import { AmountCollectedDialog } from './AmountCollectedDialog';
import { exportToExcel } from '../../../../utils/exportToExcel';

export const ReportsView = ({
  data, onBack, onCounterClick, inventory, inventoryReport, cashierReports, onCashierClick, amountCollectedReport = [], teamLeadReports, onTeamLeadClick
}: {
  data: SalesReport[], onBack: () => void, onCounterClick: (r: SalesReport) => void,
  inventory: InventoryItem[], inventoryReport: InventorySummary[], cashierReports?: CashierReport[],
  onCashierClick?: (r: CashierReport) => void, amountCollectedReport?: AmountCollectedReport[],
  teamLeadReports?: TeamLeadReport[], onTeamLeadClick?: (r: TeamLeadReport) => void
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [expandedCounter, setExpandedCounter] = useState<string | null>(null);
  const [selectedCounterFilter, setSelectedCounterFilter] = useState<string>('all');
  const [selectedAmountReport, setSelectedAmountReport] = useState<AmountCollectedReport | null>(null);
  
  const slideNames = ['Ledger', 'Revenue Report', 'Inventory Report', 'Amount Collected'];
  if (teamLeadReports) slideNames.push('Team Lead Report');
  if (cashierReports && onCashierClick) slideNames.push('Cashier Report');
  const totalSlides = slideNames.length;

  const filteredData = selectedCounterFilter === 'all' ? data : data.filter(d => d.counter_id === selectedCounterFilter);
  const filteredInventoryReport = selectedCounterFilter === 'all' ? inventoryReport : inventoryReport.filter(r => r.counter_id === selectedCounterFilter);
  const filteredInventory = selectedCounterFilter === 'all' ? inventory : inventory.filter(i => i.counter_id === selectedCounterFilter);

  const uniqueCounters = Array.from(new Map(data.map(d => [d.counter_id, d])).values());

  const goNext = () => { setExpandedCounter(null); setCurrentSlide((prev) => (prev + 1) % totalSlides); };
  const goPrev = () => { setExpandedCounter(null); setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides); };

  const handleExportSlide = () => {
    const currentSlideName = slideNames[currentSlide];
    
    if (currentSlideName === 'Ledger') {
      const exportData = filteredData.map(r => ({
        'Counter Name': r.counter_name,
        'Total Bills': r.total_bills,
        'Receivable Amt (Debit) ₹': r.total_sales,
        'Paid (Credit) ₹': r.total_collected,
        'Outstanding (₹)': r.outstanding
      }));
      exportToExcel(exportData, 'Ledger_Report');
    } else if (currentSlideName === 'Revenue Report') {
      const exportData = filteredData.map(r => ({
        'Counter Name': r.counter_name,
        'Total Bills': r.total_bills,
        'Total Items Sold': r.total_items,
        'Revenue Generated (₹)': r.total_sales
      }));
      exportToExcel(exportData, 'Revenue_Report');
    } else if (currentSlideName === 'Inventory Report') {
      const exportData = filteredInventoryReport.map(r => ({
        'Counter Name': r.counter_name,
        'Surplus Count': r.surplus_count,
        'Shortage Count': r.shortage_count
      }));
      exportToExcel(exportData, 'Inventory_Summary_Report');
    } else if (currentSlideName === 'Amount Collected') {
      const exportData = (selectedCounterFilter === 'all' ? amountCollectedReport : amountCollectedReport.filter(r => r.counter_id === selectedCounterFilter)).map(r => ({
        'Counter Name': r.counter_name,
        'Cash Collected (₹)': r.cash_collected,
        'UPI Collected (₹)': r.upi_collected,
        'Card Collected (₹)': r.card_collected,
        'Bank Transfer Collected (₹)': r.bank_transfer_collected
      }));
      exportToExcel(exportData, 'Amount_Collected_Report');
    } else if (currentSlideName === 'Team Lead Report' && teamLeadReports) {
      const exportData = teamLeadReports.map(r => ({
        'Team Lead': r.team_lead_name,
        'Counters Assigned Count': r.assigned_counters_count,
        'Counters Assigned Names': r.assigned_counters_names.join(', '),
        'Pending Approvals': r.pending_approvals,
        'Approved Approvals': r.approved_approvals
      }));
      exportToExcel(exportData, 'Team_Lead_Report');
    } else if (currentSlideName === 'Cashier Report' && cashierReports) {
      const exportData = cashierReports.map(r => ({
        'Cashier Name': r.cashier_name,
        'Total Cash Collected (₹)': r.total_cash_collected,
        'Pending Handover (₹)': r.pending_handover,
        'Approved Handover (₹)': r.approved_handover,
        'Drawer Cash Balance (₹)': r.drawer_balance
      }));
      exportToExcel(exportData, 'Cashier_Report');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <ViewHeader title="System Reports" onBack={onBack} icon={BarChart3} />
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
          <button 
            onClick={handleExportSlide}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-500 border border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 hover:text-emerald-800 dark:hover:text-emerald-400 text-xs font-bold uppercase tracking-wider rounded-lg transition-all active:scale-95 shadow-sm whitespace-nowrap"
          >
            <Download className="w-4 h-4" /> Export Slide
          </button>
          <div className="w-full sm:w-64">
            <select
              className="w-full px-4 py-2 bg-card border border-border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary text-sm font-medium transition-shadow"
              value={selectedCounterFilter}
              onChange={(e) => setSelectedCounterFilter(e.target.value)}
            >
              <option value="all">All Counters</option>
              {uniqueCounters.map(c => (
                <option key={c.counter_id} value={c.counter_id}>{c.counter_name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Slider Container */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        {/* Slider Header with Navigation */}
        <div className="p-4 sm:p-6 border-b border-border bg-muted/30 flex items-center justify-between">
          <button
            onClick={goPrev}
            className="w-10 h-10 flex items-center justify-center rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-all hover:scale-110 active:scale-95"
            aria-label="Previous report"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="text-center flex-1">
            <h2 className="text-xl font-bold uppercase tracking-wider text-primary">{slideNames[currentSlide]}</h2>
            <div className="flex items-center justify-center gap-2 mt-2">
              {slideNames.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className={`h-2 rounded-full transition-all duration-300 ${i === currentSlide ? 'w-8 bg-primary' : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'}`}
                  aria-label={`Go to ${slideNames[i]}`}
                />
              ))}
            </div>
          </div>
          <button
            onClick={goNext}
            className="w-10 h-10 flex items-center justify-center rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-all hover:scale-110 active:scale-95"
            aria-label="Next report"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>

        {/* Slides Track */}
        <div className="overflow-hidden">
          <div
            className="flex transition-transform duration-500 ease-in-out"
            style={{ transform: `translateX(-${currentSlide * 100}%)` }}
          >
            {/* Slide 1: Ledger */}
            <div className="w-full flex-shrink-0">
              <div className="px-4 sm:px-6 pt-4 pb-2">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <History className="w-4 h-4 text-primary" />
                  Click a counter to view all their bills.
                </p>
              </div>
              <DataTable<SalesReport> idAccessor="counter_id" data={filteredData} onRowClick={onCounterClick} columns={[
                { header: 'Counter Name', accessor: 'counter_name', sortAccessor: 'counter_name', className: 'text-left font-semibold text-primary group-hover:underline' },
                { header: 'Total Bills', accessor: 'total_bills', sortAccessor: 'total_bills', className: 'text-center' },
                { header: 'Receivable Amt (Debit) ₹', accessor: (r) => `₹${r.total_sales.toFixed(2)}`, sortAccessor: 'total_sales', className: 'text-right font-medium' },
                { header: 'Paid (Credit) ₹', accessor: (r) => <span className="text-green-600 dark:text-green-400 font-medium">₹{r.total_collected.toFixed(2)}</span>, sortAccessor: 'total_collected', className: 'text-right' },
                { header: 'Outstanding (₹)', accessor: (r) => <span className="text-destructive font-medium">₹{r.outstanding.toFixed(2)}</span>, sortAccessor: 'outstanding', className: 'text-right' }
              ]} />
            </div>

            {/* Slide 2: Revenue Report */}
            <div className="w-full flex-shrink-0">
              <div className="px-4 sm:px-6 pt-4 pb-2">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <IndianRupee className="w-4 h-4 text-green-600" />
                  Detailed revenue and item sales performance.
                </p>
              </div>
              <DataTable<SalesReport>
                idAccessor="counter_id"
                data={filteredData}
                columns={[
                  { header: 'Counter Name', accessor: 'counter_name', sortAccessor: 'counter_name', className: 'text-left font-semibold' },
                  { header: 'Total Bills', accessor: 'total_bills', sortAccessor: 'total_bills', className: 'text-center' },
                  { header: 'Total Items Sold', accessor: 'total_items', sortAccessor: 'total_items', className: 'text-center font-medium text-primary' },
                  { header: 'Revenue Generated', accessor: (r) => `₹${r.total_sales.toLocaleString()}`, sortAccessor: 'total_sales', className: 'text-right font-bold text-green-600' }
                ]}
              />
            </div>

            {/* Slide 3: Inventory Report */}
            <div className="w-full flex-shrink-0">
              <div className="px-4 sm:px-6 pt-4 pb-2">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Package className="w-4 h-4 text-orange-500" />
                  Click a counter to expand its stock status.
                </p>
              </div>

              <div className="mt-2 divide-y divide-border border-t border-border">
                {filteredInventoryReport.map((r) => {
                  const isExpanded = expandedCounter === r.counter_id;
                  const counterInv = filteredInventory.filter(i => i.counter_name === r.counter_name);
                  const surplus = counterInv.filter(i => i.quantity > 5);
                  const shortage = counterInv.filter(i => i.quantity <= 5);

                  return (
                    <div key={r.counter_id} className="group">
                      {/* Counter Row */}
                      <div
                        onClick={() => setExpandedCounter(isExpanded ? null : r.counter_id)}
                        className={`flex items-center justify-between px-6 py-4 cursor-pointer transition-colors ${isExpanded ? 'bg-primary/5' : 'hover:bg-muted/50'}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isExpanded ? 'bg-primary text-white rotate-90' : 'bg-muted text-muted-foreground'}`}>
                            <ChevronRight className="w-5 h-5" />
                          </div>
                          <span className="font-bold text-lg">{r.counter_name}</span>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="text-center">
                            <div className="text-[10px] uppercase font-bold text-muted-foreground mb-0.5">Surplus</div>
                            <Badge variant="success">{r.surplus_count}</Badge>
                          </div>
                          <div className="text-center">
                            <div className="text-[10px] uppercase font-bold text-muted-foreground mb-0.5">Shortage</div>
                            <Badge variant="danger">{r.shortage_count}</Badge>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Content */}
                      <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isExpanded ? 'max-h-[800px] border-b border-border bg-muted/20' : 'max-h-0'}`}>
                        <div className="px-6 pt-4 flex justify-end">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const exportData = [
                                ...shortage.map(i => ({ 'Accessory Name': i.name, 'Model': i.vehicle_model, 'Quantity': i.quantity, 'Status': 'Shortage' })),
                                ...surplus.map(i => ({ 'Accessory Name': i.name, 'Model': i.vehicle_model, 'Quantity': i.quantity, 'Status': 'Surplus' }))
                              ];
                              if (exportData.length > 0) exportToExcel(exportData, `Counter_${r.counter_name.replace(/\s+/g, '_')}_Stock_Report`);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-500 border border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 hover:text-emerald-800 dark:hover:text-emerald-400 text-[10px] font-bold uppercase tracking-wider rounded transition-all active:scale-95 shadow-sm whitespace-nowrap"
                          >
                            <Download className="w-3 h-3" /> Export Stock
                          </button>
                        </div>
                        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2 duration-500 pt-2">
                          {/* Shortage Section */}
                          <div className="space-y-3">
                            <h4 className="text-xs font-black uppercase tracking-widest text-destructive flex items-center gap-2">
                              <X className="w-3 h-3" /> Shortage ({" <= 5"})
                            </h4>
                            <div className="bg-card rounded-lg border border-destructive/10 overflow-hidden shadow-sm">
                              <table className="w-full text-xs">
                                <thead className="bg-destructive/5 text-destructive font-bold border-b border-destructive/10">
                                  <tr>
                                    <th className="px-3 py-2 text-left">Model</th>
                                    <th className="px-3 py-2 text-left">Accessory</th>
                                    <th className="px-3 py-2 text-right">Qty</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                  {shortage.map(i => (
                                    <tr key={i.id} className="hover:bg-destructive/5 transition-colors">
                                      <td className="px-3 py-2 font-medium">{i.vehicle_model}</td>
                                      <td className="px-3 py-2">{i.name}</td>
                                      <td className="px-3 py-2 text-right font-bold text-destructive">{i.quantity}</td>
                                    </tr>
                                  ))}
                                  {shortage.length === 0 && <tr><td colSpan={3} className="px-3 py-4 text-center text-muted-foreground">No shortages</td></tr>}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* Surplus Section */}
                          <div className="space-y-3">
                            <h4 className="text-xs font-black uppercase tracking-widest text-green-600 flex items-center gap-2">
                              <Save className="w-3 h-3" /> Surplus ({" > 5"})
                            </h4>
                            <div className="bg-card rounded-lg border border-green-600/10 overflow-hidden shadow-sm">
                              <table className="w-full text-xs">
                                <thead className="bg-green-600/5 text-green-600 font-bold border-b border-green-600/10">
                                  <tr>
                                    <th className="px-3 py-2 text-left">Model</th>
                                    <th className="px-3 py-2 text-left">Accessory</th>
                                    <th className="px-3 py-2 text-right">Qty</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                  {surplus.map(i => (
                                    <tr key={i.id} className="hover:bg-green-600/5 transition-colors">
                                      <td className="px-3 py-2 font-medium">{i.vehicle_model}</td>
                                      <td className="px-3 py-2">{i.name}</td>
                                      <td className="px-3 py-2 text-right font-bold text-green-600">{i.quantity}</td>
                                    </tr>
                                  ))}
                                  {surplus.length === 0 && <tr><td colSpan={3} className="px-3 py-4 text-center text-muted-foreground">No surplus items</td></tr>}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Slide 4: Amount Collected Report */}
            <div className="w-full flex-shrink-0">
              <div className="px-4 sm:px-6 pt-4 pb-2">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <IndianRupee className="w-4 h-4 text-primary" />
                  Detailed payment collection breakdown by counter.
                </p>
              </div>
              <DataTable<AmountCollectedReport>
                idAccessor="counter_id"
                data={selectedCounterFilter === 'all' ? amountCollectedReport : amountCollectedReport.filter(r => r.counter_id === selectedCounterFilter)}
                onRowClick={(r) => setSelectedAmountReport(r)}
                columns={[
                  { header: 'Counter Name', accessor: 'counter_name', sortAccessor: 'counter_name', className: 'text-left font-semibold text-primary group-hover:underline cursor-pointer' },
                  { header: 'Cash Collected (₹)', accessor: (r) => `₹${r.cash_collected.toLocaleString()}`, sortAccessor: 'cash_collected', className: 'text-right font-medium text-emerald-600' },
                  { header: 'UPI (₹)', accessor: (r) => `₹${r.upi_collected.toLocaleString()}`, sortAccessor: 'upi_collected', className: 'text-right' },
                  { header: 'Card (₹)', accessor: (r) => `₹${r.card_collected.toLocaleString()}`, sortAccessor: 'card_collected', className: 'text-right' },
                  { header: 'Bank Transfer (₹)', accessor: (r) => `₹${r.bank_transfer_collected.toLocaleString()}`, sortAccessor: 'bank_transfer_collected', className: 'text-right' }
                ]}
              />
            </div>
            
            {/* Slide 5: Team Lead Report */}
            {teamLeadReports && (
              <div className="w-full flex-shrink-0">
                <div className="px-4 sm:px-6 pt-4 pb-2">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-500" />
                    Overview of team leads and their assigned counters.
                  </p>
                </div>
                <DataTable<TeamLeadReport>
                  idAccessor="team_lead_id"
                  data={teamLeadReports}
                  onRowClick={onTeamLeadClick}
                  columns={[
                    { header: 'Team Lead', accessor: 'team_lead_name', sortAccessor: 'team_lead_name', className: 'text-left font-bold text-primary uppercase text-xs tracking-wider' },
                    { header: 'Counters Assigned', accessor: (r) => (
                      <div className="flex flex-col gap-1">
                        <span className="font-bold">{r.assigned_counters_count}</span>
                        <span className="text-[10px] text-muted-foreground">{r.assigned_counters_names.join(', ')}</span>
                      </div>
                    ), sortAccessor: 'assigned_counters_count', className: 'text-left' },
                    { header: 'Pending Approvals', accessor: (r) => <span className="text-amber-500 font-bold">{r.pending_approvals}</span>, sortAccessor: 'pending_approvals', className: 'text-right' },
                    { header: 'Approved Approvals', accessor: (r) => <span className="text-emerald-600 font-bold">{r.approved_approvals}</span>, sortAccessor: 'approved_approvals', className: 'text-right' }
                  ]}
                />
              </div>
            )}
            
            {/* Slide 6: Cashier Report */}
            {cashierReports && onCashierClick && (
              <div className="w-full flex-shrink-0">
                <div className="px-4 sm:px-6 pt-4 pb-2">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <IndianRupee className="w-4 h-4 text-emerald-600" />
                    Detailed cashier drawer balances and handovers.
                  </p>
                </div>
                <DataTable<CashierReport>
                  idAccessor="cashier_id"
                  data={cashierReports}
                  onRowClick={onCashierClick}
                  columns={[
                    { header: 'Cashier Name', accessor: 'cashier_name', sortAccessor: 'cashier_name', className: 'text-left font-bold text-primary uppercase text-xs tracking-wider' },
                    { header: 'Total Cash Collected (₹)', accessor: (r) => r.total_cash_collected, sortAccessor: 'total_cash_collected', className: 'text-right font-medium' },
                    { header: 'Pending Handover (₹)', accessor: (r) => <span className="text-amber-500 font-medium">{r.pending_handover}</span>, sortAccessor: 'pending_handover', className: 'text-right' },
                    { header: 'Approved Handover (₹)', accessor: (r) => <span className="text-emerald-600 dark:text-emerald-400 font-medium">{r.approved_handover}</span>, sortAccessor: 'approved_handover', className: 'text-right' },
                    { header: 'Drawer Cash Balance (₹)', accessor: (r) => <span className="font-black text-foreground">{r.drawer_balance}</span>, sortAccessor: 'drawer_balance', className: 'text-right font-bold' }
                  ]}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedAmountReport && (
        <AmountCollectedDialog
          report={selectedAmountReport}
          onClose={() => setSelectedAmountReport(null)}
        />
      )}
    </div>
  );
};