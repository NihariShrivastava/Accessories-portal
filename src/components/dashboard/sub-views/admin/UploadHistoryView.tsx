import { ViewHeader } from '../../ViewHeader';
import { DateRangeFilter } from '../../DateRangeFilter';
import { History, Trash2, FileSpreadsheet, ChevronRight, Package } from 'lucide-react';
import type { InventoryItem } from '../../../../hooks/useAdminData';

export const UploadHistoryView = ({
  inventory,
  uploadHistory,
  expandedUpload,
  setExpandedUpload,
  historyStartDate,
  setHistoryStartDate,
  historyEndDate,
  setHistoryEndDate,
  onDeleteByDate,
  onBack
}: {
  inventory: InventoryItem[],
  uploadHistory: string[],
  expandedUpload: string | null,
  setExpandedUpload: (id: string | null) => void,
  historyStartDate: string,
  setHistoryStartDate: (date: string) => void,
  historyEndDate: string,
  setHistoryEndDate: (date: string) => void,
  onDeleteByDate: (date: string) => void,
  onBack: () => void
}) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <ViewHeader 
          title="Upload History" 
          onBack={onBack} 
          icon={History} 
          description="View and manage past inventory uploads."
        />
      </div>

      <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <DateRangeFilter
            initialStartDate={historyStartDate}
            initialEndDate={historyEndDate}
            onApply={(start, end) => {
              setHistoryStartDate(start);
              setHistoryEndDate(end);
            }}
            onClear={() => { setHistoryStartDate(''); setHistoryEndDate(''); }}
          />
        </div>

        <div className="grid grid-cols-1 gap-4">
          {uploadHistory.map(timestamp => {
            const isExpanded = expandedUpload === timestamp;
            const batchItems = inventory.filter(i => i.created_at === timestamp);
            const dateObj = new Date(timestamp);
            
            return (
              <div key={timestamp} className={`overflow-hidden border border-border rounded-xl transition-all duration-300 ${isExpanded ? 'bg-muted/30 shadow-md ring-1 ring-primary/20' : 'bg-muted/10 hover:bg-muted/20 hover:border-primary/30'}`}>
                {/* History Item Header */}
                <div 
                  onClick={() => setExpandedUpload(isExpanded ? null : timestamp)}
                  className="flex items-center justify-between p-4 cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isExpanded ? 'bg-primary text-white' : 'bg-primary/10 text-primary'}`}>
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-sm">{dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                      <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                        At {dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} • {batchItems.length} Items
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); onDeleteByDate(timestamp.split('T')[0]); }}
                      className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                      title="Delete this upload"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`}>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </div>
                </div>

                {/* Expanded Content: Entry List */}
                <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isExpanded ? 'max-h-[500px] border-t border-border bg-card' : 'max-h-0'}`}>
                  <div className="p-4">
                    <div className="rounded-lg border border-border overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-muted text-muted-foreground font-bold uppercase tracking-wider border-b border-border">
                          <tr>
                            <th className="px-4 py-2 text-left">Counter</th>
                            <th className="px-4 py-2 text-left">Model</th>
                            <th className="px-4 py-2 text-left">Accessory</th>
                            <th className="px-4 py-2 text-right">Qty</th>
                            <th className="px-4 py-2 text-right">Price</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {batchItems.map(item => (
                            <tr key={item.id} className="hover:bg-muted/50 transition-colors">
                              <td className="px-4 py-2 font-medium">{item.counter_name}</td>
                              <td className="px-4 py-2 text-muted-foreground">{item.vehicle_model}</td>
                              <td className="px-4 py-2">{item.name}</td>
                              <td className="px-4 py-2 text-right font-bold text-primary">{item.quantity}</td>
                              <td className="px-4 py-2 text-right">₹{item.price.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          
          {uploadHistory.length === 0 && (
            <div className="col-span-full py-10 text-center bg-muted/5 rounded-xl border border-dashed border-border">
              <Package className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm font-medium">No upload history found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
