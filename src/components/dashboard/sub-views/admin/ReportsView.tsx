import { useState } from 'react';
import { DataTable } from '../../DataTable';
import { ViewHeader } from '../../ViewHeader';
import { Badge } from '../../Badge';
import { BarChart3, ChevronLeft, ChevronRight, History, IndianRupee, Package, X, Save } from 'lucide-react';
import type { SalesReport, InventoryItem, InventorySummary } from '../../../../hooks/useAdminData';

export const ReportsView = ({
  data, onBack, onCounterClick, inventory, inventoryReport
}: {
  data: SalesReport[], onBack: () => void, onCounterClick: (r: SalesReport) => void,
  inventory: InventoryItem[], inventoryReport: InventorySummary[]
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [expandedCounter, setExpandedCounter] = useState<string | null>(null);
  const totalSlides = 3;
  const slideNames = ['Ledger', 'Revenue Report', 'Inventory Report'];

  const goNext = () => { setExpandedCounter(null); setCurrentSlide((prev) => (prev + 1) % totalSlides); };
  const goPrev = () => { setExpandedCounter(null); setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides); };

  return (
    <div className="space-y-6">
      <ViewHeader title="System Reports" onBack={onBack} icon={BarChart3} />

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
              <DataTable<SalesReport> idAccessor="counter_id" data={data} onRowClick={onCounterClick} columns={[
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
                data={data}
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
                {inventoryReport.map((r) => {
                  const isExpanded = expandedCounter === r.counter_id;
                  const counterInv = inventory.filter(i => i.counter_name === r.counter_name);
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
                        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2 duration-500">
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
          </div>
        </div>
      </div>
    </div>
  );
};
