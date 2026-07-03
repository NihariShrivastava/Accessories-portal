// src/pages/AdminDashboard.tsx
import { useState, useRef, useMemo, useCallback } from 'react';
import { Upload, Users, Package, FileSpreadsheet, BarChart3, ShoppingCart, ArrowLeftRight, Plus, Trash2, ChevronRight, History } from 'lucide-react';
import { DashboardCard } from '../components/dashboard/DashboardCard';

import { useAdminData } from '../hooks/useAdminData';
import type { InventoryItem, CounterBill, SalesReport, TeamLeadReport } from '../hooks/useAdminData';
import { Modal } from '../components/dashboard/Modal';
import { BillDetails } from '../components/dashboard/BillDetails';
import { BillReceipt } from '../components/dashboard/BillReceipt';
import { CounterManagementView, AddTeamLeadView, AddCashierView, AddWarehouseView, ModelDetailView, ReportsView, BillsView, AddCounterView, InventorySliderView, CounterInventoryDetailsView, GlobalInventorySliderView, UploadHistoryView, CashierDetailsView } from '../components/dashboard/sub-views/AdminSubViews';
import { TeamLeadApprovalView } from '../components/dashboard/sub-views/admin/TeamLeadApprovalView';

export function AdminDashboard() {
  const {
    counters, warehouses, inventory, vehicleModels, modelAccessories, salesReport, inventoryReport, amountCollectedReport, uploading, cashierReports, teamLeadReports, allBills,
    startDate, endDate, setStartDate, setEndDate,
    fetchCounters, fetchWarehouses, fetchVehicleModels, fetchModelAccessories, fetchCounterBills, handleFileUpload, fetchBills,
    updateCounter, deleteCounter, updateWarehouse, deleteWarehouse, deleteAccessory, updateAccessory, transferAccessory, transferAllAccessories,
    transferCart, addToTransferCart, removeFromTransferCart, clearTransferCart, executeCartTransfer,
    deleteDataByDate, teamLeads, fetchTeamLeads, updateTeamLead, deleteTeamLead,
    cashiers, fetchCashiers, updateCashier, deleteCashier,
    updateBillStatusAdmin
  } = useAdminData();

  const [activeView, setActiveView] = useState('dashboard');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedCounterId, setSelectedCounterId] = useState('');
  const [selectedCounterName, setSelectedCounterName] = useState('');
  const [selectedBill, setSelectedBill] = useState<CounterBill | null>(null);
  const [showBillDetails, setShowBillDetails] = useState(false);
  const [selectedCashierReport, setSelectedCashierReport] = useState<any>(null);
  const [selectedTeamLeadReport, setSelectedTeamLeadReport] = useState<TeamLeadReport | null>(null);
  const [generatedBill, setGeneratedBill] = useState<CounterBill | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [transferringItem, setTransferringItem] = useState<InventoryItem | null>(null);
  const [editForm, setEditForm] = useState({ quantity: 0, price: 0 });
  const [transferForm, setTransferForm] = useState({ targetCounterId: '', quantity: 0 });
  const [transferMode, setTransferMode] = useState<'type' | 'single' | 'cart'>('type');
  const [showCartModal, setShowCartModal] = useState(false);
  const [cartTargetCounterId, setCartTargetCounterId] = useState('');
  const [uploadDate, setUploadDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');
  const [expandedUpload, setExpandedUpload] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const counterBills = useMemo(() => {
    if (!selectedCounterId) return [];
    return fetchCounterBills(selectedCounterId);
  }, [selectedCounterId, fetchCounterBills]);

  const handleBillClick = useCallback((b: CounterBill) => {
    setSelectedBill(b);
    setShowBillDetails(true);
  }, []);

  const uploadHistory = useMemo(() => {
    const timestamps = new Set<string>();
    inventory.forEach(i => {
      if (i.created_at) timestamps.add(i.created_at);
    });
    let result = Array.from(timestamps).sort((a, b) => b.localeCompare(a));
    if (historyStartDate || historyEndDate) {
      result = result.filter(t => {
        try {
          const dStr = new Date(t).toLocaleDateString('en-CA');
          if (historyStartDate && historyEndDate) return dStr >= historyStartDate && dStr <= historyEndDate;
          if (historyStartDate) return dStr >= historyStartDate;
          if (historyEndDate) return dStr <= historyEndDate;
          return true;
        } catch { return false; }
      });
    }
    return result;
  }, [inventory, historyStartDate, historyEndDate]);

  const handleCounterClick = (report: SalesReport) => {
    setSelectedCounterId(report.counter_id);
    setSelectedCounterName(report.counter_name);
    fetchCounterBills(report.counter_id);
    setActiveView('counter-bills');
  };

  const handleCashierClick = (report: any) => {
    setSelectedCashierReport(report);
    setActiveView('cashier-details');
  };

  const handleTeamLeadClick = (report: TeamLeadReport) => {
    setSelectedTeamLeadReport(report);
    setActiveView('team-lead-approvals');
  };

  const handleEditClick = (item: InventoryItem) => {
    setEditingItem(item);
    setEditForm({ quantity: item.quantity, price: item.price });
  };

  const handleTransferClick = (item: InventoryItem) => {
    setTransferringItem(item);
    setTransferMode('type');
    setTransferForm({ targetCounterId: '', quantity: 0 });
  };

  let content;
  if (activeView === 'logins' || activeView === 'logins-team-leads' || activeView === 'logins-cashiers' || activeView === 'logins-warehouses') {
    content = (
      <CounterManagementView 
        initialTab={activeView === 'logins-team-leads' ? 'team_leads' : activeView === 'logins-cashiers' ? 'cashiers' : activeView === 'logins-warehouses' ? 'warehouses' : 'counters'}
        counters={counters}
        warehouses={warehouses}
        teamLeads={teamLeads}
        cashiers={cashiers}
        onBack={() => setActiveView('dashboard')} 
        onAddCounter={() => setActiveView('add-counter')}
        onUpdateCounter={updateCounter}
        onDeleteCounter={deleteCounter}
        onAddWarehouse={() => setActiveView('add-warehouse')}
        onUpdateWarehouse={updateWarehouse}
        onDeleteWarehouse={deleteWarehouse}
        onAddTeamLead={() => setActiveView('add-team-lead')}
        onUpdateTeamLead={updateTeamLead}
        onDeleteTeamLead={deleteTeamLead}
        onAddCashier={() => setActiveView('add-cashier')}
        onUpdateCashier={updateCashier}
        onDeleteCashier={deleteCashier}
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
  } else if (activeView === 'add-warehouse') {
    content = (
      <AddWarehouseView 
        onBack={() => { 
          setTimeout(() => {
            fetchWarehouses(); 
            setActiveView('logins-warehouses'); 
          }, 500);
        }} 
      />
    );
  } else if (activeView === 'add-team-lead') {
    content = (
      <AddTeamLeadView 
        counters={counters}
        warehouses={warehouses}
        onBack={() => { 
          setTimeout(() => {
            fetchTeamLeads(); 
            setActiveView('logins-team-leads'); 
          }, 500);
        }} 
      />
    );
  } else if (activeView === 'add-cashier') {
    content = (
      <AddCashierView 
        counters={counters}
        onBack={() => { 
          setTimeout(() => {
            fetchCashiers(); 
            setActiveView('logins-cashiers'); 
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
        transferCartCount={transferCart.length}
        onCartClick={() => setShowCartModal(true)}
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
        cashierReports={cashierReports}
        teamLeadReports={teamLeadReports}
        amountCollectedReport={amountCollectedReport}
        onBack={() => setActiveView('dashboard')}
        onCounterClick={handleCounterClick}
        onCashierClick={handleCashierClick}
        onTeamLeadClick={handleTeamLeadClick}
      />
    );
  } else if (activeView === 'cashier-details' && selectedCashierReport) {
    content = (
      <CashierDetailsView 
        cashierReport={selectedCashierReport} 
        onBack={() => setActiveView('reports')} 
      />
    );
  } else if (activeView === 'team-lead-approvals' && selectedTeamLeadReport) {
    const tlCounters = counters.filter(c => selectedTeamLeadReport.assigned_counters_ids.includes(c.id));
    const tlBills = allBills.filter(b => b.counter_id && selectedTeamLeadReport.assigned_counters_ids.includes(b.counter_id));
    content = (
      <TeamLeadApprovalView
        counters={tlCounters}
        bills={tlBills}
        onBack={() => setActiveView('reports')}
        onUpdateBillStatus={async (billId, status, counterId) => {
          if (!counterId) return;
          await updateBillStatusAdmin(billId, status as 'approved' | 'reverted' | 'reverted_by_admin', counterId);
        }}
        onViewBill={(b) => { setGeneratedBill(b); setShowReceipt(true); }}
      />
    );
  } else if (activeView === 'counter-bills') {
    content = <BillsView 
      counterName={selectedCounterName} 
      data={counterBills} 
      onBack={() => { setActiveView('reports'); setSelectedCounterId(''); }} 
      onRowClick={handleBillClick} 
      onViewBillReceipt={(b) => { setGeneratedBill(b); setShowReceipt(true); }}
      onRevertBill={(b) => {
        if (confirm(`Are you sure you want to revert bill ${b.bill_number}?`)) {
          updateBillStatusAdmin(b.id, 'reverted_by_admin', selectedCounterId);
        }
      }}
      startDate={startDate} 
      endDate={endDate} 
      setStartDate={setStartDate} 
      setEndDate={setEndDate} 
    />;
  } else if (activeView === 'upload-history') {
    content = (
      <UploadHistoryView 
        inventory={inventory}
        uploadHistory={uploadHistory}
        expandedUpload={expandedUpload}
        setExpandedUpload={setExpandedUpload}
        historyStartDate={historyStartDate}
        setHistoryStartDate={setHistoryStartDate}
        historyEndDate={historyEndDate}
        setHistoryEndDate={setHistoryEndDate}
        onDeleteByDate={deleteDataByDate}
        onBack={() => setActiveView('dashboard')}
      />
    );
  } else {
    content = (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <DashboardCard icon={Users} label="Counter Management" value="" onClick={() => { fetchCounters(); fetchTeamLeads(); fetchCashiers(); setActiveView('logins'); }} colorClass="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
          <DashboardCard icon={Package} label="Total Inventory" value="" onClick={() => { fetchVehicleModels(); fetchCounters(); setActiveView('inventory-slider'); }} colorClass="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" />
          <DashboardCard icon={BarChart3} label="Reports" value="" onClick={() => { fetchBills(); setActiveView('reports'); }} colorClass="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left Column: Upload Box */}
          <div className="bg-card p-5 rounded-xl border border-border shadow-lg space-y-4 flex flex-col h-full">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2 text-primary">
                <Upload className="w-5 h-5" /> Upload Excel
              </h2>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">Import inventory from Excel</p>
            </div>

            <div className="space-y-3 flex-1">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Target Counter / Warehouse</label>
                <select 
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/20 transition-all outline-none text-sm" 
                  value={selectedCounterId} 
                  onChange={(e) => setSelectedCounterId(e.target.value)}
                >
                  <option value="" className="bg-background text-foreground">-- Choose Target --</option>
                  {counters.length > 0 && (
                    <optgroup label="Counters" className="bg-muted text-muted-foreground font-bold">
                      {counters.map(c => <option key={c.id} value={c.id} className="bg-background text-foreground font-medium">{c.name}</option>)}
                    </optgroup>
                  )}
                  {warehouses && warehouses.length > 0 && (
                    <optgroup label="Warehouses" className="bg-muted text-muted-foreground font-bold">
                      {warehouses.map(w => <option key={w.id} value={w.id} className="bg-background text-foreground font-medium">{w.name}</option>)}
                    </optgroup>
                  )}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Upload Date</label>
                <input 
                  type="date" 
                  className="w-full px-3 py-2 bg-muted/20 border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/20 dark:[&::-webkit-calendar-picker-indicator]:invert text-sm" 
                  value={uploadDate}
                  onChange={(e) => setUploadDate(e.target.value)}
                />
              </div>

              <div className="pt-1">
                <input type="file" className="hidden" ref={fileInputRef} onChange={(e) => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0], selectedCounterId, uploadDate); }} />
                <button 
                  onClick={() => fileInputRef.current?.click()} 
                  disabled={uploading || !selectedCounterId} 
                  className="w-full h-[46px] bg-primary text-primary-foreground font-bold rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-md hover:scale-[1.02] active:scale-[0.98] text-sm"
                >
                  {uploading ? (
                    <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> Processing...</span>
                  ) : (
                    <><FileSpreadsheet className="w-4 h-4" /> Upload Excel</>
                  )}
                </button>
              </div>
            </div>

            <div className="pt-3 border-t border-border">
              <button 
                onClick={() => setActiveView('upload-history')}
                className="w-full py-2.5 bg-secondary/50 hover:bg-secondary text-secondary-foreground font-bold rounded-lg flex items-center justify-center gap-2 transition-all border border-border/50 text-xs"
              >
                <History className="w-4 h-4" /> See Upload History
              </button>
            </div>
          </div>

          {/* Right Column: Global Inventory Slider */}
          <div className="lg:col-span-2 h-full">
            <GlobalInventorySliderView 
              inventory={inventory}
              counters={counters}
              warehouses={warehouses || []}
              onEdit={handleEditClick}
              onTransfer={handleTransferClick}
              onDelete={deleteAccessory}
              onTransferAll={transferAllAccessories}
              initialStartDate={startDate}
              initialEndDate={endDate}
              onDateRangeChange={(start, end) => {
                setStartDate(start);
                setEndDate(end);
              }}
              transferCartCount={transferCart.length}
              onCartClick={() => setShowCartModal(true)}
            />
          </div>
        </div>
      </div>
    );
  }

  if (showReceipt && generatedBill) {
    return (
      <div className="fixed inset-0 z-[100] bg-white overflow-y-auto">
        <BillReceipt bill={generatedBill as any} onClose={() => { setShowReceipt(false); setGeneratedBill(null); }} />
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
      <Modal isOpen={!!transferringItem} onClose={() => setTransferringItem(null)} title={transferMode === 'type' ? "Transfer Options" : "Transfer Accessory"}>
        <div className="space-y-4 p-4">
          <p className="text-sm text-muted-foreground">Transferring <span className="font-bold text-foreground">{transferringItem?.name}</span> from <span className="font-bold text-foreground">{transferringItem?.counter_name}</span></p>
          
          {transferMode === 'type' ? (
            <div className="grid grid-cols-1 gap-3">
              <button 
                onClick={() => setTransferMode('single')}
                className="w-full flex items-center justify-between p-4 bg-muted/30 border border-border rounded-xl hover:bg-muted transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 rounded-lg">
                    <ArrowLeftRight className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold">Transfer Single Accessory</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Move items directly to another counter</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </button>

              <button 
                onClick={() => setTransferMode('cart')}
                className="w-full flex items-center justify-between p-4 bg-muted/30 border border-border rounded-xl hover:bg-muted transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 rounded-lg">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold">Add to Transfer Cart</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Accumulate items for a bulk transfer</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {transferMode === 'single' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Target Destination</label>
                  <select 
                    className="w-full px-3 py-2 bg-input border rounded-md" 
                    value={transferForm.targetCounterId} 
                    onChange={(e) => setTransferForm(prev => ({ ...prev, targetCounterId: e.target.value }))}
                  >
                    <option value="" className="bg-background text-foreground">-- Select Destination --</option>
                    {counters.length > 0 && (
                      <optgroup label="Counters" className="bg-muted text-muted-foreground font-bold">
                        {counters.filter(c => c.id !== transferringItem?.counter_id).map(c => <option key={c.id} value={c.id} className="bg-background text-foreground font-medium">{c.name}</option>)}
                      </optgroup>
                    )}
                    {warehouses && warehouses.length > 0 && (
                      <optgroup label="Warehouses" className="bg-muted text-muted-foreground font-bold">
                        {warehouses.filter(w => w.id !== transferringItem?.counter_id).map(w => <option key={w.id} value={w.id} className="bg-background text-foreground font-medium">{w.name}</option>)}
                      </optgroup>
                    )}
                  </select>
                </div>
              )}
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
              <div className="flex gap-2">
                <button onClick={() => setTransferMode('type')} className="flex-1 py-2 rounded-md font-semibold bg-muted text-muted-foreground">Back</button>
                <button 
                  onClick={() => {
                    if (transferringItem && transferForm.quantity > 0) {
                      if (transferMode === 'single') {
                        if (!transferForm.targetCounterId) return alert('Please select a target destination');
                        transferAccessory(transferringItem, transferForm.targetCounterId, transferForm.quantity);
                      } else {
                        addToTransferCart(transferringItem, transferForm.quantity);
                      }
                      setTransferringItem(null);
                    }
                  }}
                  className={`flex-[2] py-2 rounded-md font-semibold text-white ${transferMode === 'single' ? 'bg-green-600 hover:bg-green-700' : 'bg-purple-600 hover:bg-purple-700'}`}
                >
                  {transferMode === 'single' ? 'Confirm Transfer' : 'Add to Cart'}
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Transfer Cart Modal */}
      <Modal isOpen={showCartModal} onClose={() => setShowCartModal(false)} title="Transfer Cart">
        <div className="space-y-6 p-4">
          {transferCart.length === 0 ? (
            <div className="text-center py-10">
              <ShoppingCart className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">Your transfer cart is empty.</p>
            </div>
          ) : (
            <>
              <div className="space-y-3 max-h-[300px] overflow-auto pr-2">
                {transferCart.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-muted/20 border border-border rounded-lg group">
                    <div>
                      <div className="font-bold text-sm">{item.name}</div>
                      <div className="text-[10px] text-muted-foreground uppercase">{item.vehicle_model} • {item.counter_name}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-xs font-black px-2 py-1 bg-primary/10 text-primary rounded">{item.transferQuantity} Units</div>
                      <button onClick={() => removeFromTransferCart(item.id)} className="p-1 text-destructive hover:bg-destructive/10 rounded transition-colors opacity-0 group-hover:opacity-100">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-border space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5 ml-1">Destination Target</label>
                  <select 
                    className="w-full px-4 py-2 bg-input border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/20"
                    value={cartTargetCounterId}
                    onChange={(e) => setCartTargetCounterId(e.target.value)}
                  >
                    <option value="" className="bg-background text-foreground">-- Select Destination --</option>
                    {counters.length > 0 && (
                      <optgroup label="Counters" className="bg-muted text-muted-foreground font-bold">
                        {counters.map(c => <option key={c.id} value={c.id} className="bg-background text-foreground font-medium">{c.name}</option>)}
                      </optgroup>
                    )}
                    {warehouses && warehouses.length > 0 && (
                      <optgroup label="Warehouses" className="bg-muted text-muted-foreground font-bold">
                        {warehouses.map(w => <option key={w.id} value={w.id} className="bg-background text-foreground font-medium">{w.name}</option>)}
                      </optgroup>
                    )}
                  </select>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => { clearTransferCart(); setShowCartModal(false); }} className="px-4 py-2 text-destructive font-bold hover:bg-destructive/10 rounded-lg">Clear All</button>
                  <button 
                    disabled={!cartTargetCounterId || uploading}
                    onClick={async () => {
                      await executeCartTransfer(cartTargetCounterId);
                      setShowCartModal(false);
                      setCartTargetCounterId('');
                    }}
                    className="flex-1 bg-purple-600 text-white py-2.5 rounded-lg font-bold hover:bg-purple-700 disabled:opacity-50 transition-all shadow-sm active:scale-95"
                  >
                    {uploading ? 'Transferring...' : 'Transfer All Items'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </Modal>
    </>
  );
}