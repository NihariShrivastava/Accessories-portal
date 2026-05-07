import { useState } from 'react';
import { useAuth } from '../components/auth-provider';
import { Search, ShoppingCart, History, ReceiptText } from 'lucide-react';
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
    models, selectedModel, accessories, recentBills, allBills, loading,
    startDate, endDate, setStartDate, setEndDate,
    handleModelChange, fetchAllBills, fetchAccessories, fetchRecentBills
  } = useCounterData(user);

  const [selectedAccessory, setSelectedAccessory] = useState<Accessory | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [activeView, setActiveView] = useState<'dashboard' | 'bills'>('dashboard');
  const [formLoading, setFormLoading] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [showBillDetails, setShowBillDetails] = useState(false);

  const handleBillSuccess = () => {
    setShowDialog(false);
    setSelectedAccessory(null);
    fetchAccessories(selectedModel);
    fetchRecentBills();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const ViewContent = () => {
    if (activeView === 'bills') {
      return (
        <div className="space-y-6">
          <ViewHeader title="All Bills" onBack={() => setActiveView('dashboard')} icon={History} />
          
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
                { header: 'Date', accessor: (b) => new Date(b.created_at).toLocaleDateString(), className: 'text-muted-foreground' },
                { header: 'Accessory', accessor: (b) => b.accessories?.name || 'Unknown', className: 'font-medium' },
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
    }

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><Search className="w-5 h-5 text-primary" /> Search Vehicle Model</h2>
            <select
              className="w-full px-4 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              value={selectedModel}
              onChange={(e) => handleModelChange(e.target.value)}
            >
              <option value="">-- Select a Model --</option>
              {models.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <DashboardCard
            icon={ReceiptText} label="Bills" value={`${recentBills.length}+`} subValue="view all transactions"
            onClick={() => { fetchAllBills(); setActiveView('bills'); }}
            colorClass="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
            rightIcon={History}
          />
        </div>

        {selectedModel && (
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 pb-0"><h3 className="text-lg font-semibold mb-4">Accessories for {selectedModel}</h3></div>
            {loading && !showDialog ? <div className="py-8 text-center text-muted-foreground">Loading accessories...</div> : (
              <DataTable<Accessory>
                idAccessor="id"
                columns={[
                  { header: 'Accessory Name', accessor: 'name', className: 'font-medium' },
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
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <ViewContent />

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
