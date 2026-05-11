import { useState, useRef, useMemo, useCallback } from 'react';
import { Upload, Users, Package, FileSpreadsheet, BarChart3 } from 'lucide-react';
import { DashboardCard } from '../components/dashboard/DashboardCard';
import { DataTable } from '../components/dashboard/DataTable';
import type { Column } from '../components/dashboard/DataTable';

import { useAdminData } from '../hooks/useAdminData';
import type { InventoryItem, CounterBill, SalesReport } from '../hooks/useAdminData';
import { Modal } from '../components/dashboard/Modal';
import { BillDetails } from '../components/dashboard/BillDetails';
import { DateRangeFilter } from '../components/dashboard/DateRangeFilter';
import { ManageCountersView, ModelDetailView, ReportsView, BillsView, AddCounterView, InventorySliderView, CounterInventoryDetailsView } from '../components/dashboard/sub-views/AdminSubViews';

export function AdminDashboard() {
  const {
    stats, counters, inventory, vehicleModels, modelAccessories, salesReport, inventoryReport, uploading,
    startDate, endDate, setStartDate, setEndDate,
    fetchCounters, fetchVehicleModels, fetchModelAccessories, fetchCounterBills, handleFileUpload, fetchBills,
    updateCounter, deleteCounter, deleteAccessory, updateAccessory, transferAccessory
  } = useAdminData();

  const [activeView, setActiveView] = useState('dashboard');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedCounterId, setSelectedCounterId] = useState('');
  const [selectedCounterName, setSelectedCounterName] = useState('');
  const [selectedBill, setSelectedBill] = useState<CounterBill | null>(null);
  const [showBillDetails, setShowBillDetails] = useState(false);
  
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [transferringItem, setTransferringItem] = useState<InventoryItem | null>(null);
  const [editForm, setEditForm] = useState({ quantity: 0, price: 0 });
  const [transferForm, setTransferForm] = useState({ targetCounterId: '', quantity: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const counterBills = useMemo(() => {
    if (!selectedCounterId) return [];
    return fetchCounterBills(selectedCounterId);
  }, [selectedCounterId, fetchCounterBills]);

  const handleBillClick = useCallback((b: CounterBill) => {
    setSelectedBill(b);
    setShowBillDetails(true);
  }, []);

  const handleCounterClick = useCallback(async (r: SalesReport) => {
    setSelectedCounterId(r.counter_id);
    setSelectedCounterName(r.counter_name);
    setActiveView('counter-bills');
  }, []);


  const handleEditClick = (item: InventoryItem) => {
    setEditingItem(item);
    setEditForm({ quantity: item.quantity, price: item.price });
  };

  const handleTransferClick = (item: InventoryItem) => {
    setTransferringItem(item);
    setTransferForm({ targetCounterId: '', quantity: 0 });
  };

  const inventoryColumns: Column<InventoryItem>[] = useMemo(() => [
    { header: 'Date', accessor: (i: InventoryItem) => new Date(i.created_at).toLocaleDateString(), sortAccessor: 'created_at', className: 'text-left text-muted-foreground whitespace-nowrap' },
    { header: 'Counter', accessor: 'counter_name' as const, className: 'text-left font-medium' },
    { header: 'Model', accessor: 'vehicle_model' as const, className: 'text-left text-muted-foreground' },
    { header: 'Accessory', accessor: 'name' as const, sortAccessor: 'name', className: 'text-left' },
    { header: 'Code', accessor: (i: InventoryItem) => i.accessory_code || '-', sortAccessor: 'accessory_code', className: 'text-left text-muted-foreground text-sm' },
    { header: 'Qty', accessor: 'quantity' as const, className: 'text-right font-bold' },
    { header: 'Price', accessor: (i: InventoryItem) => `₹${i.price.toFixed(2)}`, sortAccessor: 'price', className: 'text-right font-medium' },
    { 
      header: 'Actions', 
      accessor: (i: InventoryItem) => (
        <div className="flex items-center justify-center gap-2">
          <button 
            onClick={(e) => { e.stopPropagation(); handleEditClick(i); }} 
            className="px-3 py-1 bg-blue-600 text-white hover:bg-blue-700 rounded text-xs font-semibold transition-all shadow-sm active:scale-95"
          >
            Edit
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); handleTransferClick(i); }} 
            className="px-3 py-1 bg-green-600 text-white hover:bg-green-700 rounded text-xs font-semibold transition-all shadow-sm active:scale-95"
          >
            Transfer
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); deleteAccessory(i.id); }} 
            className="px-3 py-1 bg-red-600 text-white hover:bg-red-700 rounded text-xs font-semibold transition-all shadow-sm active:scale-95"
          >
            Delete
          </button>
        </div>
      ),
      className: 'text-center'
    }
  ], [deleteAccessory]);

  let content;
  if (activeView === 'logins') {
    content = (
      <ManageCountersView 
        data={counters} 
        onBack={() => setActiveView('dashboard')} 
        onAddCounter={() => setActiveView('add-counter')}
        onUpdate={updateCounter}
        onDelete={deleteCounter}
      />
    );
  } else if (activeView === 'add-counter') {
    content = (
      <AddCounterView 
        onBack={() => { 
          setTimeout(() => {
            fetchCounters(); 
            setActiveView('logins'); 
          }, 500);
        }} 
      />
    );
  } else if (activeView === 'inventory-slider') {
    content = (
      <InventorySliderView 
        vehicleModels={vehicleModels}
        counters={counters}
        onBack={() => setActiveView('dashboard')}
        onModelClick={(model) => {
          setSelectedModel(model);
          fetchModelAccessories(model);
          setActiveView('model-detail');
        }}
        onCounterClick={(counter) => {
          setSelectedCounterId(counter.id);
          setSelectedCounterName(counter.name);
          setActiveView('counter-inventory-detail');
        }}
      />
    );
  } else if (activeView === 'model-detail') {
    content = (
      <ModelDetailView 
        model={selectedModel} 
        data={modelAccessories} 
        onBack={() => setActiveView('inventory-slider')}
        onEdit={handleEditClick}
        onTransfer={handleTransferClick}
        onDelete={deleteAccessory}
      />
    );
  } else if (activeView === 'counter-inventory-detail') {
    const counterInv = inventory.filter(i => i.counter_id === selectedCounterId);
    content = (
      <CounterInventoryDetailsView 
        counterName={selectedCounterName}
        data={counterInv}
        onBack={() => setActiveView('inventory-slider')}
        onEdit={handleEditClick}
        onTransfer={handleTransferClick}
        onDelete={deleteAccessory}
      />
    );
  } else if (activeView === 'reports') {
    content = (
      <ReportsView
        data={salesReport}
        inventory={inventory}
        inventoryReport={inventoryReport}
        onBack={() => setActiveView('dashboard')}
        onCounterClick={handleCounterClick}
      />
    );
  } else if (activeView === 'counter-bills') {
    content = <BillsView counterName={selectedCounterName} data={counterBills} onBack={() => { setActiveView('reports'); setSelectedCounterId(''); }} onRowClick={handleBillClick} startDate={startDate} endDate={endDate} setStartDate={setStartDate} setEndDate={setEndDate} />;
  } else {
    content = (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <DashboardCard icon={Users} label="Manage Counters" value={counters.length} onClick={() => { fetchCounters(); setActiveView('logins'); }} colorClass="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
          <DashboardCard icon={Package} label="Total Inventory" value={stats.items} onClick={() => { fetchVehicleModels(); fetchCounters(); setActiveView('inventory-slider'); }} colorClass="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" />
          <DashboardCard icon={BarChart3} label="Reports" value={salesReport.length} onClick={() => { fetchBills(); setActiveView('reports'); }} colorClass="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" />
        </div>

        {/* Full-width Upload Bar */}
        <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-primary"><Upload className="w-5 h-5" /> Upload Excel Data</h2>
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">Target Counter</label>
              <select className="w-full px-4 py-2.5 bg-input border border-border rounded-lg focus:ring-2 focus:ring-primary/20 transition-all outline-none" value={selectedCounterId} onChange={(e) => setSelectedCounterId(e.target.value)}>
                <option value="">-- Choose Counter --</option>
                {counters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="flex-[2] w-full">
              <input type="file" className="hidden" ref={fileInputRef} onChange={(e) => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0], selectedCounterId); }} />
              <button 
                onClick={() => fileInputRef.current?.click()} 
                disabled={uploading || !selectedCounterId} 
                className="w-full h-[46px] bg-secondary hover:bg-secondary/80 text-secondary-foreground font-semibold rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 transition-all border border-border/50 shadow-sm active:scale-[0.98]"
              >
                {uploading ? (
                  <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> Processing...</span>
                ) : (
                  <><FileSpreadsheet className="w-5 h-5" /> Select and Upload Excel File</>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Global Inventory with Date Filter */}
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 pb-2">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <h2 className="text-lg font-semibold">Global Inventory</h2>
              <DateRangeFilter 
                onApply={(start, end) => { setStartDate(start); setEndDate(end); }} 
                onClear={() => { setStartDate(''); setEndDate(''); }}
                initialStartDate={startDate}
                initialEndDate={endDate}
              />
            </div>
          </div>
          <DataTable<InventoryItem>
            idAccessor="id"
            maxHeight="600px"
            pageSize={50}
            data={inventory}
            columns={inventoryColumns}
          />
        </div>
      </div>
    );
  }

  return (
    <>
      {content}
      <Modal isOpen={showBillDetails && !!selectedBill} onClose={() => { setShowBillDetails(false); setSelectedBill(null); }} title="Bill Details">
        <BillDetails bill={selectedBill} onClose={() => { setShowBillDetails(false); setSelectedBill(null); }} />
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editingItem} onClose={() => setEditingItem(null)} title="Edit Accessory">
        <div className="space-y-4 p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Quantity</label>
              <input 
                type="number" 
                className="w-full px-3 py-2 bg-input border rounded-md" 
                value={editForm.quantity} 
                onChange={(e) => setEditForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Price (₹)</label>
              <input 
                type="number" 
                className="w-full px-3 py-2 bg-input border rounded-md" 
                value={editForm.price} 
                onChange={(e) => setEditForm(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
              />
            </div>
          </div>
          <button 
            onClick={() => {
              if (editingItem) {
                updateAccessory(editingItem.id, editForm);
                setEditingItem(null);
              }
            }}
            className="w-full bg-primary text-primary-foreground py-2 rounded-md font-semibold"
          >
            Save Changes
          </button>
        </div>
      </Modal>

      {/* Transfer Modal */}
      <Modal isOpen={!!transferringItem} onClose={() => setTransferringItem(null)} title="Transfer Accessory">
        <div className="space-y-4 p-4">
          <p className="text-sm text-muted-foreground">Transferring <span className="font-bold text-foreground">{transferringItem?.name}</span> from <span className="font-bold text-foreground">{transferringItem?.counter_name}</span></p>
          <div>
            <label className="block text-sm font-medium mb-1">Target Counter</label>
            <select 
              className="w-full px-3 py-2 bg-input border rounded-md" 
              value={transferForm.targetCounterId} 
              onChange={(e) => setTransferForm(prev => ({ ...prev, targetCounterId: e.target.value }))}
            >
              <option value="">-- Select Target Counter --</option>
              {counters.filter(c => c.id !== transferringItem?.counter_id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Quantity (Available: {transferringItem?.quantity})</label>
            <input 
              type="number" 
              className="w-full px-3 py-2 bg-input border rounded-md" 
              value={transferForm.quantity} 
              onChange={(e) => setTransferForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
              max={transferringItem?.quantity}
            />
          </div>
          <button 
            onClick={() => {
              if (transferringItem && transferForm.targetCounterId && transferForm.quantity > 0) {
                transferAccessory(transferringItem, transferForm.targetCounterId, transferForm.quantity);
                setTransferringItem(null);
              } else {
                alert('Please select a target counter and valid quantity');
              }
            }}
            className="w-full bg-purple-600 text-white py-2 rounded-md font-semibold hover:bg-purple-700"
          >
            Confirm Transfer
          </button>
        </div>
      </Modal>
    </>
  );
}
