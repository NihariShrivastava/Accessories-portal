import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { DataTable } from '../DataTable';
import { ViewHeader } from '../ViewHeader';
import { Badge } from '../Badge';
import { Users, Package, BarChart3, History, Store, ChevronRight, ChevronLeft, Car, UserPlus, IndianRupee } from 'lucide-react';
import { DateRangeFilter } from '../DateRangeFilter';
import { supabase } from '../../../lib/supabase';
import type { ModelAccessory, SalesReport, CounterBill, InventoryItem, Counter, InventorySummary } from '../../../hooks/useAdminData';

import { Save, X } from 'lucide-react';

export const ManageCountersView = ({ 
  data, 
  onBack, 
  onAddCounter,
  onUpdate,
  onDelete
}: { 
  data: (Counter & { login_count?: number })[], 
  onBack: () => void, 
  onAddCounter: () => void,
  onUpdate: (id: string, updates: any) => void,
  onDelete: (id: string) => void
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', username: '', password: '' });

  const startEdit = (counter: any) => {
    setEditingId(counter.id);
    setEditForm({ 
      name: counter.name || '', 
      username: counter.username || '', 
      password: counter.password || '' 
    });
  };

  const handleSave = (id: string) => {
    onUpdate(id, editForm);
    setEditingId(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <ViewHeader 
          title="Manage Counters" 
          onBack={onBack} 
          icon={Users} 
          description={`${data.length} total counter accounts in the system.`} 
        />
        <button
          onClick={onAddCounter}
          className="bg-primary text-primary-foreground py-2 px-6 rounded-lg hover:bg-primary/90 transition-all flex items-center justify-center gap-2 font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95"
        >
          <UserPlus className="w-5 h-5" /> Add New Counter
        </button>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <DataTable<(Counter & { login_count?: number })> 
          idAccessor="id" 
          data={data} 
          columns={[
            { 
              header: 'Counter Name', 
              accessor: (c) => editingId === c.id ? (
                <input 
                  className="w-full px-2 py-1 bg-background border rounded text-sm" 
                  value={editForm.name} 
                  onChange={e => setEditForm({...editForm, name: e.target.value})}
                />
              ) : <span className="font-semibold text-primary">{c.name}</span>,
              className: 'min-w-[150px]'
            },
            { 
              header: 'Username', 
              accessor: (c) => editingId === c.id ? (
                <input 
                  className="w-full px-2 py-1 bg-background border rounded text-sm" 
                  value={editForm.username} 
                  onChange={e => setEditForm({...editForm, username: e.target.value})}
                />
              ) : <span className="text-muted-foreground font-mono text-xs">{c.username || c.name || '-'}</span>
            },
            { 
              header: 'Password', 
              accessor: (c) => editingId === c.id ? (
                <input 
                  className="w-full px-2 py-1 bg-background border rounded text-sm" 
                  value={editForm.password} 
                  onChange={e => setEditForm({...editForm, password: e.target.value})}
                />
              ) : <span className="text-muted-foreground font-mono text-xs">{c.password || '••••••••'}</span>
            },
            {
              header: 'Logins',
              accessor: (c) => <Badge variant="secondary">{c.login_count || 0}</Badge>,
              className: 'text-center'
            },
            { 
              header: 'Actions', 
              headerClassName: 'text-center',
              accessor: (c) => (
                <div className="flex items-center justify-center gap-2">
                  {editingId === c.id ? (
                    <>
                      <button 
                        onClick={() => handleSave(c.id)} 
                        className="px-3 py-1 bg-green-600 text-white text-xs font-bold rounded-md hover:bg-green-700 transition-colors"
                      >
                        Save
                      </button>
                      <button 
                        onClick={() => setEditingId(null)} 
                        className="px-3 py-1 bg-muted text-muted-foreground text-xs font-bold rounded-md hover:bg-muted/80 transition-colors"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        onClick={() => startEdit(c)} 
                        className="px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-md hover:bg-blue-700 transition-colors"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => onDelete(c.id)} 
                        className="px-3 py-1 bg-destructive text-white text-xs font-bold rounded-md hover:bg-destructive/90 transition-colors"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              ),
              className: 'w-40'
            }
          ]} 
        />
      </div>
    </div>
  );
};

import { createClient } from '@supabase/supabase-js';

export const AddCounterView = ({ onBack }: { onBack: () => void }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create a temporary client that doesn't persist the session to prevent auto-login
      const tempSupabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        { auth: { persistSession: false, autoRefreshToken: false } }
      );

      const { data, error } = await tempSupabase.auth.signUp({
        email: `${username}@portal.local`,
        password,
        options: {
          data: {
            name: username,
            role: 'counter',
          },
        },
      });

      if (error) throw error;
      
      // Explicitly update the profiles table if it was created by a trigger, 
      // or wait for it and then update.
      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ username, password })
          .eq('id', data.user.id);
        
        if (profileError) {
          console.warn('Could not update profile with credentials:', profileError);
        }
      }

      toast.success('Counter created successfully!');
      setUsername('');
      setPassword('');
      onBack();
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Error creating counter');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <ViewHeader title="Create New Counter" onBack={onBack} icon={UserPlus} description="Add a new counter to the system." />
      <div className="bg-card p-6 rounded-xl border border-border shadow-sm max-w-md mx-auto">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Username (Counter Name)</label>
            <input
              type="text"
              required
              className="w-full px-4 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              required
              className="w-full px-4 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-md hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 mt-4"
          >
            {loading ? 'Creating...' : <><UserPlus className="w-4 h-4" /> Create Counter</>}
          </button>
        </form>
      </div>
    </div>
  );
};

export const ModelDetailView = ({ model, data, onBack }: { model: string, data: ModelAccessory[], onBack: () => void }) => (
  <div className="space-y-6">
    <ViewHeader title={`Accessories for: ${model}`} onBack={onBack} backLabel="Back to Models" icon={Package} />
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      <DataTable<ModelAccessory> idAccessor={(a) => `${a.name}-${a.counter_name}`} data={data} columns={[
        { header: 'Accessory Name', accessor: 'name', className: 'font-medium' },
        { header: 'Code', accessor: (a) => a.accessory_code || '-', className: 'text-muted-foreground text-sm' },
        { header: 'Counter', accessor: 'counter_name', className: 'text-muted-foreground' },
        { header: 'Quantity', accessor: (a) => <Badge variant={a.quantity > 5 ? 'success' : 'danger'}>{a.quantity}</Badge>, className: 'text-right' },
        { header: 'Price (₹)', accessor: (a) => `₹${a.price.toFixed(2)}`, className: 'text-right' }
      ]} />
    </div>
  </div>
);

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
                { header: 'Counter Name', accessor: 'counter_name', className: 'font-semibold text-primary group-hover:underline' },
                { header: 'Total Bills', accessor: 'total_bills', className: 'text-center' },
                { header: 'Receivable Amt (Debit) ₹', accessor: (r) => `₹${r.total_sales.toFixed(2)}`, className: 'text-right font-medium' },
                { header: 'Paid (Credit) ₹', accessor: (r) => <span className="text-green-600 dark:text-green-400 font-medium">₹{r.total_collected.toFixed(2)}</span>, className: 'text-right' },
                { header: 'Outstanding (₹)', accessor: (r) => <span className="text-destructive font-medium">₹{r.outstanding.toFixed(2)}</span>, className: 'text-right' }
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
                  { header: 'Counter Name', accessor: 'counter_name', className: 'font-semibold' },
                  { header: 'Total Bills', accessor: 'total_bills', className: 'text-center' },
                  { header: 'Total Items Sold', accessor: 'total_items', className: 'text-center font-medium text-primary' },
                  { header: 'Revenue Generated', accessor: (r) => `₹${r.total_sales.toLocaleString()}`, className: 'text-right font-bold text-green-600' }
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

export const BillsView = ({
  counterName, data, onBack, onRowClick, startDate, endDate, setStartDate, setEndDate
}: {
  counterName: string, data: CounterBill[], onBack: () => void, onRowClick: (b: CounterBill) => void,
  startDate: string, endDate: string, setStartDate: (d: string) => void, setEndDate: (d: string) => void
}) => (
  <div className="space-y-6">
    <ViewHeader title={`Bills for: ${counterName}`} onBack={onBack} backLabel="Back to Reports" icon={History} />

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
      <DataTable<CounterBill>
        idAccessor="id"
        data={data}
        onRowClick={onRowClick}
        pageSize={50}
        columns={useMemo(() => [
          { header: 'Bill No.', accessor: (b) => <span className="font-mono text-xs">{b.bill_number || '-'}</span>, className: 'font-medium' },
          { header: 'Date', accessor: (b) => new Date(b.created_at).toLocaleDateString(), className: 'text-muted-foreground' },
          { 
            header: 'Accessories', 
            accessor: (b: any) => b.items && b.items.length > 1 ? (
              <span className="font-semibold text-primary">{b.items.length} Accessories</span>
            ) : (
              <span className="font-medium">{b.accessory_name}</span>
            ),
            className: 'font-medium' 
          },
          { header: 'Model', accessor: 'vehicle_model', className: 'text-muted-foreground' },
          { header: 'Total Qty', accessor: (b) => b.quantity, className: 'text-center' },
          { header: 'Payment', accessor: (b) => <Badge variant="secondary">{b.payment_method}</Badge> },
          { header: 'Total', accessor: (b) => `₹${b.total_amount?.toFixed(2)}`, className: 'text-right font-medium' },
          { header: 'Paid', accessor: (b) => `₹${(b.amount_paid ?? b.total_amount)?.toFixed(2)}`, className: 'text-right text-green-600 dark:text-green-400' },
          { header: 'Balance', accessor: (b) => `₹${(b.amount_left ?? 0)?.toFixed(2)}`, className: 'text-right text-destructive font-medium' }
        ], [])}
      />
    </div>
  </div>
);

export const CounterInventoryModelsView = ({
  counterName, models, onBack, onModelClick
}: {
  counterName: string, models: string[], onBack: () => void, onModelClick: (model: string) => void
}) => (
  <div className="space-y-6">
    <ViewHeader title={`Inventory for: ${counterName}`} onBack={onBack} backLabel="Back to Reports" icon={Store} description="Select a vehicle model to view available accessories." />
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {models.map(m => (
        <button
          key={m}
          onClick={() => onModelClick(m)}
          className="flex items-center justify-between p-4 bg-card border border-border rounded-xl hover:bg-muted hover:border-primary/30 transition-all group"
        >
          <div className="flex items-center gap-3">
            <Car className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
            <span className="font-medium">{m}</span>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-transform" />
        </button>
      ))}
    </div>
  </div>
);

export const CounterInventoryDetailsView = ({
  counterName, model, data, onBack
}: {
  counterName: string, model: string, data: InventoryItem[], onBack: () => void
}) => (
  <div className="space-y-6">
    <ViewHeader
      title={`${model} Accessories`}
      onBack={onBack}
      backLabel="Back to Models"
      icon={Package}
      description={`Viewing stock for ${model} at ${counterName}.`}
    />
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      <DataTable<InventoryItem> idAccessor="id" data={data} columns={[
        { header: 'Accessory Name', accessor: 'name', className: 'font-medium' },
        { header: 'Code', accessor: (i) => i.accessory_code || '-', className: 'text-muted-foreground text-sm' },
        { header: 'Stock Quantity', accessor: (i) => <Badge variant={i.quantity > 5 ? 'success' : 'danger'}>{i.quantity} units</Badge>, className: 'text-right' },
        { header: 'Price per Unit (₹)', accessor: (i) => `₹${i.price.toFixed(2)}`, className: 'text-right' }
      ]} />
    </div>
  </div>
);

export const CounterInventoryStatusView = ({ 
  counterName, 
  inventory, 
  onBack 
}: { 
  counterName: string, 
  inventory: InventoryItem[], 
  onBack: () => void 
}) => {
  const counterInventory = inventory.filter(i => i.counter_name === counterName);
  const surplus = counterInventory.filter(i => i.quantity > 5);
  const shortage = counterInventory.filter(i => i.quantity <= 5);

  const columns = [
    { header: 'Model', accessor: 'vehicle_model' as const, className: 'font-medium' },
    { header: 'Accessory', accessor: 'name' as const },
    { header: 'Code', accessor: (i: InventoryItem) => i.accessory_code || '-', className: 'text-xs text-muted-foreground' },
    { header: 'Qty', accessor: (i: InventoryItem) => <Badge variant={i.quantity > 5 ? 'success' : 'danger'}>{i.quantity}</Badge>, className: 'text-right' },
    { header: 'Price', accessor: (i: InventoryItem) => `₹${i.price.toLocaleString()}`, className: 'text-right' }
  ];

  return (
    <div className="space-y-6">
      <ViewHeader title={`${counterName} - Inventory Status`} onBack={onBack} icon={Store} description="Accessories categorized by stock status." />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Shortage Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <div className="w-2 h-6 bg-destructive rounded-full" />
            <h3 className="text-lg font-bold uppercase tracking-tight text-destructive">Shortage Items ({" <= 5"})</h3>
            <Badge variant="danger" className="ml-auto">{shortage.length}</Badge>
          </div>
          <div className="bg-card rounded-xl border border-destructive/20 shadow-sm overflow-hidden border-t-4 border-t-destructive">
            <DataTable<InventoryItem> idAccessor="id" data={shortage} columns={columns} maxHeight="400px" />
          </div>
        </div>

        {/* Surplus Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <div className="w-2 h-6 bg-green-600 rounded-full" />
            <h3 className="text-lg font-bold uppercase tracking-tight text-green-600">Surplus Items ({" > 5"})</h3>
            <Badge variant="success" className="ml-auto">{surplus.length}</Badge>
          </div>
          <div className="bg-card rounded-xl border border-green-600/20 shadow-sm overflow-hidden border-t-4 border-t-green-600">
            <DataTable<InventoryItem> idAccessor="id" data={surplus} columns={columns} maxHeight="400px" />
          </div>
        </div>
      </div>
    </div>
  );
};
