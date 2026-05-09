import { useState, useMemo } from 'react';
import { useAuth } from '../components/auth-provider';
import { Search, ShoppingCart, History, ReceiptText, AlertTriangle, PackageCheck, LayoutGrid, Store } from 'lucide-react';
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

import { QuantityModal } from '../components/dashboard/QuantityModal';
import { CartModal } from '../components/dashboard/CartModal';
import { CollapsibleModelRow } from '../components/dashboard/CollapsibleModelRow';

import { SearchableDropdown } from '../components/dashboard/SearchableDropdown';

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
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [activeView, setActiveView] = useState<'dashboard' | 'bills' | 'shortage-models' | 'surplus-models'>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewModels, setViewModels] = useState<string[]>([]);
  const [viewTitle, setViewTitle] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [showBillDetails, setShowBillDetails] = useState(false);

  const [cart, setCart] = useState<{ accessory: Accessory; quantity: number }[]>([]);
  const [accSearch, setAccSearch] = useState('');
  const [expandedAccs, setExpandedAccs] = useState<Record<string, Accessory[]>>({});
  const [expandedLoading, setExpandedLoading] = useState<Record<string, boolean>>({});

  const filteredAccessories = useMemo(() => 
    accessories.filter(a => 
      a.name.toLowerCase().includes(accSearch.toLowerCase()) || 
      (a.accessory_code || '').toLowerCase().includes(accSearch.toLowerCase())
    ), 
    [accessories, accSearch]
  );

  const handleExpandModel = async (model: string) => {
    setExpandedLoading(prev => ({ ...prev, [model]: true }));
    let data: Accessory[] = [];
    if (activeView === 'shortage-models') {
      data = await fetchShortageAccessories(model);
    } else {
      data = await fetchSurplusAccessories(model);
    }
    setExpandedAccs(prev => ({ ...prev, [model]: data }));
    setExpandedLoading(prev => ({ ...prev, [model]: false }));
  };

  const addToCart = (accessory: Accessory, quantity: number) => {
    setCart(prev => {
      const existing = prev.find(item => item.accessory.id === accessory.id);
      if (existing) {
        return prev.map(item => item.accessory.id === accessory.id ? { ...item, quantity: item.quantity + quantity } : item);
      }
      return [...prev, { accessory, quantity }];
    });
    setShowDialog(false);
    setSelectedAccessory(null);
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.accessory.id !== id));
  };

  const updateCartQuantity = (id: string, delta: number, absolute?: number) => {
    setCart(prev => prev.map(item => {
      if (item.accessory.id === id) {
        const newQty = absolute !== undefined 
          ? Math.max(1, Math.min(item.accessory.quantity, absolute))
          : Math.max(1, Math.min(item.accessory.quantity, item.quantity + delta));
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const handleBillSuccess = () => {
    setShowCheckout(false);
    setShowCart(false);
    setCart([]);
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
              { 
                header: 'Accessories', 
                accessor: (b) => b.items && b.items.length > 1 ? (
                  <span className="font-semibold text-primary">{b.items.length} Accessories</span>
                ) : (
                  <span className="font-medium">{b.accessories?.name || 'Unknown'}</span>
                ),
                className: 'font-medium' 
              },
              { header: 'Model', accessor: (b) => b.accessories?.vehicle_model || '-', className: 'text-muted-foreground' },
              { header: 'Total Qty', accessor: (b) => b.quantity, className: 'text-center' },
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

        <div className="space-y-4">
          {viewModels.length === 0 ? (
            <div className="bg-card py-12 rounded-xl border border-border text-center text-muted-foreground">
              No models found with {activeView === 'shortage-models' ? 'shortage' : 'surplus'} items.
            </div>
          ) : (
            viewModels.map(model => (
              <CollapsibleModelRow
                key={model}
                model={model}
                accessories={expandedAccs[model] || []}
                loading={expandedLoading[model] || false}
                onExpand={() => handleExpandModel(model)}
                onAddToCart={(acc) => { setSelectedAccessory(acc); setShowDialog(true); }}
              />
            ))
          )}
        </div>
      </div>
    );
  } else {
    content = (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center py-2 space-y-1">
          <div className="flex items-center gap-2 text-primary/60">
            <Store className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Active Session</span>
          </div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-center">
            COUNTER: <span className="text-primary">"{user?.user_metadata?.name || 'Unknown'}"</span>
          </h1>
          <div className="w-12 h-1 bg-primary rounded-full mt-2" />
        </div>

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
          
          <div className="h-6 w-px bg-border mx-2" />
          
          <button
            onClick={() => setShowCart(true)}
            className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-lg hover:bg-primary/20 transition-all font-bold relative"
          >
            <ShoppingCart className="w-5 h-5" />
            <span>CART</span>
            {cart.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-background animate-in zoom-in">
                {cart.length}
              </span>
            )}
          </button>
        </div>

        {searchQuery ? (
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 pb-0"><h3 className="text-lg font-semibold mb-4">Search Results for "{searchQuery}"</h3></div>
            {loading && !showDialog ? <div className="py-8 text-center text-muted-foreground">Searching...</div> : (
              <DataTable<Accessory>
                idAccessor="id"
                columns={[
                  { header: 'Accessory Name', accessor: 'name', className: 'font-medium pl-4' },
                  { header: 'Code', accessor: (i) => i.accessory_code || '-', className: 'text-muted-foreground text-sm' },
                  { header: 'Model', accessor: 'vehicle_model', className: 'text-muted-foreground' },
                  { header: 'Available Qty', accessor: (i) => <Badge variant={i.quantity > 5 ? 'success' : 'danger'}>{i.quantity} units</Badge> },
                  { header: 'Price (1 Unit)', accessor: (i) => `₹${i.price.toFixed(2)}`, className: 'text-right pr-4' },
                  {
                    header: 'Action', headerClassName: 'text-center pr-4',
                    accessor: (i) => (
                      <div className="text-center pr-4">
                        <button
                          onClick={() => { setSelectedAccessory(i); setShowDialog(true); }}
                          disabled={i.quantity === 0}
                          className="inline-flex items-center gap-1 bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-xs font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                        >
                          <ShoppingCart className="w-3 h-3" /> Add to Cart
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
                
                <SearchableDropdown
                  options={models}
                  value={selectedModel}
                  onChange={handleModelChange}
                  placeholder="Select or Search Model..."
                />
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
                <div className="p-6 pb-4 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <h3 className="text-lg font-semibold">Accessories for {selectedModel}</h3>
                  <div className="relative w-full md:w-64">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input 
                      type="text"
                      placeholder="Search accessory or code..."
                      className="w-full pl-9 pr-4 py-2 bg-muted/50 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      value={accSearch}
                      onChange={(e) => setAccSearch(e.target.value)}
                    />
                  </div>
                </div>
                {loading && !showDialog ? <div className="py-8 text-center text-muted-foreground">Loading accessories...</div> : (
                  <DataTable<Accessory>
                    idAccessor="id"
                    columns={[
                      { header: 'Accessory Name', accessor: 'name', className: 'font-medium pl-4' },
                      { header: 'Code', accessor: (i) => i.accessory_code || '-', className: 'text-muted-foreground text-sm' },
                      { header: 'Available Qty', accessor: (i) => <Badge variant={i.quantity > 5 ? 'success' : 'danger'}>{i.quantity} units</Badge> },
                      { header: 'Price (1 Unit)', accessor: (i) => `₹${i.price.toFixed(2)}`, className: 'text-right pr-4' },
                      {
                        header: 'Action', headerClassName: 'text-center pr-4',
                        accessor: (i) => (
                          <div className="text-center pr-4">
                            <button
                              onClick={() => { setSelectedAccessory(i); setShowDialog(true); }}
                              disabled={i.quantity === 0}
                              className="inline-flex items-center gap-1 bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-xs font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                            >
                              <ShoppingCart className="w-3 h-3" /> Add to Cart
                            </button>
                          </div>
                        )
                      }
                    ]}
                    data={filteredAccessories}
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

      <Modal isOpen={showDialog && !!selectedAccessory} onClose={() => { setShowDialog(false); setSelectedAccessory(null); }} title="Add to Cart">
        {selectedAccessory && (
          <QuantityModal
            accessory={selectedAccessory}
            onAddToCart={(qty) => addToCart(selectedAccessory, qty)}
            onClose={() => { setShowDialog(false); setSelectedAccessory(null); }}
          />
        )}
      </Modal>

      <Modal isOpen={showCart} onClose={() => setShowCart(false)} title="My Shopping Cart">
        <CartModal
          items={cart}
          onRemove={removeFromCart}
          onUpdateQuantity={updateCartQuantity}
          onCheckout={() => { setShowCart(false); setShowCheckout(true); }}
          onClose={() => setShowCart(false)}
        />
      </Modal>

      <Modal isOpen={showCheckout && cart.length > 0} onClose={() => setShowCheckout(false)} title="Generate Bill">
        <BillForm
          items={cart}
          userId={user?.id || ''}
          onSuccess={handleBillSuccess}
          loading={formLoading}
          setLoading={setFormLoading}
        />
      </Modal>

      <Modal isOpen={showBillDetails && !!selectedBill} onClose={() => { setShowBillDetails(false); setSelectedBill(null); }} title="Bill Details">
        <BillDetails bill={selectedBill} onClose={() => { setShowBillDetails(false); setSelectedBill(null); }} />
      </Modal>
    </div>
  );
}
