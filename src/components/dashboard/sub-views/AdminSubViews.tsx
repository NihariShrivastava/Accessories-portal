import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { DataTable } from '../DataTable';
import { ViewHeader } from '../ViewHeader';
import { Badge } from '../Badge';
import { Users, Package, BarChart3, History, Store, ChevronRight, ChevronLeft, Car, UserPlus, IndianRupee } from 'lucide-react';
import { DateRangeFilter } from '../DateRangeFilter';
import type { LoginDetail, ModelAccessory, SalesReport, CounterBill, InventoryItem } from '../../../hooks/useAdminData';

export const LoginsView = ({ data, onBack, onAddCounter }: { data: LoginDetail[], onBack: () => void, onAddCounter: () => void }) => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <ViewHeader title="Counter Login Details" onBack={onBack} icon={Users} description={`${data.length} unique counter(s) have logged in.`} />
      <button
        onClick={onAddCounter}
        className="bg-primary text-primary-foreground py-2 px-4 rounded-md hover:bg-primary/90 transition-colors flex items-center gap-2"
      >
        <UserPlus className="w-4 h-4" /> Add Counter
      </button>
    </div>
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      <DataTable<LoginDetail> idAccessor="user_id" data={data} columns={[
        { header: '#', accessor: (_, i) => (i || 0) + 1, className: 'text-muted-foreground w-12' },
        { header: 'Counter Username', accessor: 'name', className: 'font-medium' },
        { header: 'Total Logins', accessor: 'login_count', className: 'text-right' }
      ]} />
    </div>
  </div>
);

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

      const { error } = await tempSupabase.auth.signUp({
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
  data, onBack, onCounterClick, inventory, onInventoryCounterClick
}: {
  data: SalesReport[], onBack: () => void, onCounterClick: (r: SalesReport) => void,
  inventory: InventoryItem[], onInventoryCounterClick: (counterName: string) => void
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const totalSlides = 3;
  const slideNames = ['Ledger', 'Revenue Report', 'Inventory Report'];
  const inventoryCounters = [...new Set(inventory.map(i => i.counter_name))].sort();

  // Compute revenue data from sales report
  const maxRevenue = Math.max(...data.map(r => r.total_sales), 1);

  const goNext = () => setCurrentSlide((prev) => (prev + 1) % totalSlides);
  const goPrev = () => setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);

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
              <div className="p-4 sm:p-6">
                <p className="text-sm text-muted-foreground mb-4 flex items-center gap-2">
                  <IndianRupee className="w-4 h-4 text-primary" />
                  Total revenue generated by each counter.
                </p>
                <div className="space-y-3">
                  {data.length === 0 && (
                    <div className="py-12 text-center text-muted-foreground">No revenue data available.</div>
                  )}
                  {data
                    .sort((a, b) => b.total_sales - a.total_sales)
                    .map((r, i) => (
                    <div key={r.counter_id} className="bg-muted/40 border border-border rounded-xl p-4 hover:border-primary/30 transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">{i + 1}</span>
                          <span className="font-semibold">{r.counter_name}</span>
                        </div>
                        <span className="text-lg font-bold text-primary">₹{r.total_sales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                      {/* Revenue bar */}
                      <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary/70 to-primary transition-all duration-700 ease-out"
                          style={{ width: `${(r.total_sales / maxRevenue) * 100}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground mt-2">
                        <span>{r.total_bills} bill{r.total_bills !== 1 ? 's' : ''}</span>
                        <span className="text-green-600 dark:text-green-400">Paid (Credit): ₹{r.total_collected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        <span className="text-destructive">Outstanding: ₹{r.outstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  ))}
                  {data.length > 0 && (
                    <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-xl flex items-center justify-between">
                      <span className="font-bold text-lg">Overall Total Revenue</span>
                      <span className="text-2xl font-bold text-primary">
                        ₹{data.reduce((sum, r) => sum + r.total_sales, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Slide 3: Inventory Quantity Report */}
            <div className="w-full flex-shrink-0">
              <div className="p-4 sm:p-6">
                <p className="text-sm text-muted-foreground mb-4 flex items-center gap-2">
                  <Package className="w-4 h-4 text-primary" />
                  Select a counter to view its model-wise inventory.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {inventoryCounters.map(c => (
                    <button
                      key={c}
                      onClick={() => onInventoryCounterClick(c)}
                      className="flex items-center justify-between p-4 bg-muted/50 border border-border rounded-xl hover:bg-primary/10 hover:border-primary/50 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <Store className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
                        <span className="font-semibold">{c}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-transform" />
                    </button>
                  ))}
                </div>
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
          { header: 'Accessory', accessor: 'accessory_name', className: 'font-medium' },
          { header: 'Model', accessor: 'vehicle_model', className: 'text-muted-foreground' },
          { header: 'Qty', accessor: 'quantity', className: 'text-center' },
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
