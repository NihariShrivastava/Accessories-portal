import { useState } from 'react';
import { useAuth } from '../components/auth-provider';
import { Search, ShoppingCart, History, ReceiptText, AlertTriangle, PackageCheck, Package, LayoutGrid } from 'lucide-react';
import { DashboardCard } from '../components/dashboard/DashboardCard';
import { DataTable } from '../components/dashboard/DataTable';
import { ViewHeader } from '../components/dashboard/ViewHeader';
import { Badge } from '../components/dashboard/Badge';
import { Modal } from '../components/dashboard/Modal';
import { useCounterData } from '../hooks/useCounterData';
import type { Accessory, Bill } from '../hooks/useCounterData';
import { BillForm } from '../components/dashboard/BillForm';
import { BillDetails } from '../components/dashboard/BillDetails';
import { DateRangeFilter } from '../components/dashboard/DateRangeFilter';

export function CounterDashboard() {
  const { user } = useAuth();
  const {
    models, selectedModel, setSelectedModel, accessories, recentBills, allBills, loading,
    startDate, endDate, setStartDate, setEndDate,
    shortageCount, surplusCount, searchResults, setSearchResults,
    handleModelChange, fetchAllBills, fetchAccessories, fetchRecentBills,
    searchAccessories, fetchShortageModels, fetchSurplusModels, fetchShortageAccessories, fetchSurplusAccessories
  } = useCounterData(user);

  const [selectedAccessory, setSelectedAccessory] = useState<Accessory | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [activeView, setActiveView] = useState<'dashboard' | 'bills' | 'shortage-models' | 'surplus-models'>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewModels, setViewModels] = useState<string[]>([]);
  const [viewTitle, setViewTitle] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [showBillDetails, setShowBillDetails] = useState(false);

  const handleBillSuccess = () => {
    setShowDialog(false);
    setSelectedAccessory(null);
    if (activeView === 'shortage-models') fetchShortageAccessories(selectedModel);
    else if (activeView === 'surplus-models') fetchSurplusAccessories(selectedModel);
    else if (selectedModel) fetchAccessories(selectedModel);
    fetchRecentBills();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  let content;
  if (activeView === 'bills') {
      content = (
        <div className="space-y-6">
          <ViewHeader title="Previous Bills" onBack={() => setActiveView('dashboard')} icon={History} />
          
          <DateRangeFilter
            initialStartDate={startDate}
            initialEndDate={endDate}
            onApply={(start, end) => {
              setStartDate(start);
              setEndDate(end);
            }}
            onClear={() => { setStartDate(''); setEndDate(''); }}
          />

          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <DataTable<Bill>
              idAccessor="id"
              pageSize={50}
              onRowClick={(b) => { setSelectedBill(b); setShowBillDetails(true); }}
              columns={[
                { header: 'Bill No.', accessor: (b) => <span className="font-mono text-xs">{b.bill_number || '-'}</span>, className: 'font-medium' },
                { header: 'Date', accessor: (b) => new Date(b.created_at).toLocaleDateString(), className: 'text-muted-foreground' },
                { header: 'Accessory', accessor: (b) => b.accessories?.name || 'Unknown', className: 'font-medium' },
                { header: 'Code', accessor: (b) => b.accessories?.accessory_code || '-', className: 'text-muted-foreground text-sm' },
                { header: 'Model', accessor: (b) => b.accessories?.vehicle_model || '-', className: 'text-muted-foreground' },
                { header: 'Qty', accessor: 'quantity', className: 'text-center' },
                { header: 'Payment', accessor: (b) => <Badge variant="secondary">{b.payment_method || 'Cash'}</Badge> },
                { header: 'Total', accessor: (b) => `₹${b.total_amount?.toFixed(2)}`, className: 'text-right font-medium' },
                { header: 'Paid', accessor: (b) => `₹${(b.amount_paid ?? b.total_amount)?.toFixed(2)}`, className: 'text-right text-green-600 dark:text-green-400' },
                { header: 'Balance', accessor: (b) => `₹${(b.amount_left ?? 0)?.toFixed(2)}`, className: 'text-right text-destructive font-medium' }
              ]}
              data={allBills}
              emptyMessage="No bills found for the selected period."
            />
          </div>
        </div>
      );
    } else if (activeView === 'shortage-models' || activeView === 'surplus-models') {
      content = (
        <div className="space-y-6">
          <ViewHeader title={viewTitle} onBack={() => { setActiveView('dashboard'); setSelectedModel(''); }} icon={LayoutGrid} />
          
          {!selectedModel ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {viewModels.map(model => (
                <div 
                  key={model} 
                  onClick={() => {
                    setSelectedModel(model);
                    if (activeView === 'shortage-models') fetchShortageAccessories(model);
                    else fetchSurplusAccessories(model);
                  }}
                  className="bg-card p-6 rounded-xl border border-border shadow-sm cursor-pointer hover:border-primary transition-colors text-center"
                >
                  <Package className="w-8 h-8 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold text-lg">{model}</h3>
                </div>
              ))}
              {viewModels.length === 0 && (
                <div className="col-span-full py-12 text-center text-muted-foreground">No models found with {activeView === 'shortage-models' ? 'shortage' : 'surplus'} items.</div>
              )}
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
              <div className="p-6 pb-0 flex items-center justify-between">
                <h3 className="text-lg font-semibold mb-4">{activeView === 'shortage-models' ? 'Shortage' : 'Surplus'} Accessories for {selectedModel}</h3>
                <button onClick={() => setSelectedModel('')} className="text-sm text-primary hover:underline">Back to Models</button>
              </div>
              {loading && !showDialog ? <div className="py-8 text-center text-muted-foreground">Loading accessories...</div> : (
                <DataTable<Accessory>
                  idAccessor="id"
                  columns={[
                    { header: 'Accessory Name', accessor: 'name', className: 'font-medium' },
                    { header: 'Code', accessor: (i) => i.accessory_code || '-', className: 'text-muted-foreground text-sm' },
                    { header: 'Available Qty', accessor: (i) => <Badge variant={i.quantity > 5 ? 'success' : 'danger'}>{i.quantity} units</Badge> },
                    { header: 'Price (1 Unit)', accessor: (i) => `₹${i.price.toFixed(2)}`, className: 'text-right' },
                    { 
                      header: 'Action', headerClassName: 'text-center',
                      accessor: (i) => (
                        <div className="text-center">
                          <button
                            onClick={() => { setSelectedAccessory(i); setShowDialog(true); }}
                            disabled={i.quantity === 0}
                            className="inline-flex items-center gap-1 bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-xs font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                          >
                            <ShoppingCart className="w-3 h-3" /> Buy
                          </button>
                        </div>
                      )
                    }
                  ]}
                  data={accessories}
                  emptyMessage={`No ${activeView === 'shortage-models' ? 'shortage' : 'surplus'} accessories available for this model.`}
                />
              )}
            </div>
          )}
        </div>
      );
    } else {
      content = (
      <div className="space-y-6">
        <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex items-center gap-3">
          <Search className="w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Global Search: Enter Accessory Name, Code, or Vehicle Model..."
            className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              searchAccessories(e.target.value);
            }}
          />
          {searchQuery && (
            <button onClick={() => { setSearchQuery(''); setSearchResults([]); }} className="text-muted-foreground hover:text-foreground">Clear</button>
          )}
        </div>

        {searchQuery ? (
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 pb-0"><h3 className="text-lg font-semibold mb-4">Search Results for "{searchQuery}"</h3></div>
            {loading && !showDialog ? <div className="py-8 text-center text-muted-foreground">Searching...</div> : (
              <DataTable<Accessory>
                idAccessor="id"
                columns={[
                  { header: 'Accessory Name', accessor: 'name', className: 'font-medium' },
                  { header: 'Code', accessor: (i) => i.accessory_code || '-', className: 'text-muted-foreground text-sm' },
                  { header: 'Model', accessor: 'vehicle_model', className: 'text-muted-foreground' },
                  { header: 'Available Qty', accessor: (i) => <Badge variant={i.quantity > 5 ? 'success' : 'danger'}>{i.quantity} units</Badge> },
                  { header: 'Price (1 Unit)', accessor: (i) => `₹${i.price.toFixed(2)}`, className: 'text-right' },
                  { 
                    header: 'Action', headerClassName: 'text-center',
                    accessor: (i) => (
                      <div className="text-center">
                        <button onClick={() => { setSelectedAccessory(i); setShowDialog(true); }} disabled={i.quantity === 0} className="inline-flex items-center gap-1 bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-xs font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
                          <ShoppingCart className="w-3 h-3" /> Buy
                        </button>
                      </div>
                    )
                  }
                ]}
                data={searchResults}
                emptyMessage="No accessories found matching your search."
              />
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-1 bg-card p-6 rounded-xl border border-border shadow-sm">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-primary" /> Generate Bill</h2>
                <select
                  className="w-full px-4 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  value={selectedModel}
                  onChange={(e) => handleModelChange(e.target.value)}
                >
                  <option value="">-- Select a Model --</option>
                  {models.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                <DashboardCard
                  icon={ReceiptText} label="Previous Bills" value={`${recentBills.length}+`} subValue="view all transactions"
                  onClick={() => { fetchAllBills(); setActiveView('bills'); }}
                  colorClass="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
                  rightIcon={History}
                />
                <DashboardCard
                  icon={AlertTriangle} label="Shortage" value={shortageCount.toString()} subValue="items running low (≤ 5)"
                  onClick={async () => { 
                    const m = await fetchShortageModels(); 
                    setViewModels(m); 
                    setViewTitle('Shortage Models'); 
                    setSelectedModel('');
                    setActiveView('shortage-models'); 
                  }}
                  colorClass="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                  rightIcon={LayoutGrid}
                />
                <DashboardCard
                  icon={PackageCheck} label="Surplus" value={surplusCount.toString()} subValue="well stocked items (> 5)"
                  onClick={async () => { 
                    const m = await fetchSurplusModels(); 
                    setViewModels(m); 
                    setViewTitle('Surplus Models'); 
                    setSelectedModel('');
                    setActiveView('surplus-models'); 
                  }}
                  colorClass="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                  rightIcon={LayoutGrid}
                />
              </div>
            </div>

        {selectedModel && (
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 pb-0"><h3 className="text-lg font-semibold mb-4">Accessories for {selectedModel}</h3></div>
            {loading && !showDialog ? <div className="py-8 text-center text-muted-foreground">Loading accessories...</div> : (
              <DataTable<Accessory>
                idAccessor="id"
                columns={[
                  { header: 'Accessory Name', accessor: 'name', className: 'font-medium' },
                  { header: 'Code', accessor: (i) => i.accessory_code || '-', className: 'text-muted-foreground text-sm' },
                  { header: 'Available Qty', accessor: (i) => <Badge variant={i.quantity > 5 ? 'success' : 'danger'}>{i.quantity} units</Badge> },
                  { header: 'Price (1 Unit)', accessor: (i) => `₹${i.price.toFixed(2)}`, className: 'text-right' },
                  { 
                    header: 'Action', headerClassName: 'text-center',
                    accessor: (i) => (
                      <div className="text-center">
                        <button
                          onClick={() => { setSelectedAccessory(i); setShowDialog(true); }}
                          disabled={i.quantity === 0}
                          className="inline-flex items-center gap-1 bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-xs font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                        >
                          <ShoppingCart className="w-3 h-3" /> Buy
                        </button>
                      </div>
                    )
                  }
                ]}
                data={accessories}
                emptyMessage="No accessories available for this model."
              />
            )}
          </div>
        )}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {content}

      <Modal isOpen={showDialog && !!selectedAccessory} onClose={() => { setShowDialog(false); setSelectedAccessory(null); }} title="Generate Bill">
        {selectedAccessory && (
          <BillForm
            accessory={selectedAccessory}
            userId={user?.id || ''}
            onSuccess={handleBillSuccess}
            loading={formLoading}
            setLoading={setFormLoading}
          />
        )}
      </Modal>

      <Modal isOpen={showBillDetails && !!selectedBill} onClose={() => { setShowBillDetails(false); setSelectedBill(null); }} title="Bill Details">
        <BillDetails bill={selectedBill} onClose={() => { setShowBillDetails(false); setSelectedBill(null); }} />
      </Modal>
    </div>
  );
}
