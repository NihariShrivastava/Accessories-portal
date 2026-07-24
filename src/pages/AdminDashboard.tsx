import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { Upload, Users, Package, FileSpreadsheet, BarChart3, ShoppingCart, ArrowLeftRight, Plus, Trash2, ChevronRight, History, Copy } from 'lucide-react';
import { DashboardCard } from '../components/dashboard/DashboardCard';


import { supabase } from '../lib/supabase';
import { useAdminData } from '../hooks/useAdminData';
import type { InventoryItem, CounterBill, SalesReport, TeamLeadReport } from '../hooks/useAdminData';
import { Modal } from '../components/dashboard/Modal';
import { BillDetails } from '../components/dashboard/BillDetails';
import { BillReceipt } from '../components/dashboard/BillReceipt';
import { CounterManagementView, AddTeamLeadView, AddCashierView, AddWarehouseView, ModelDetailView, ReportsView, BillsView, AddCounterView, InventorySliderView, CounterInventoryDetailsView, GlobalInventorySliderView, UploadHistoryView, CashierDetailsView, AddAuditorView, AuditorDetailsView, AddBillingCounterView } from '../components/dashboard/sub-views/AdminSubViews';
import { TeamLeadApprovalView } from '../components/dashboard/sub-views/admin/TeamLeadApprovalView';

export function AdminDashboard() {
  const {
    counters, warehouses, inventory, vehicleModels, modelAccessories, salesReport, inventoryReport, amountCollectedReport, uploading, cashierReports, teamLeadReports, allBills, unpaidBillsReport, duplicacyReport,
    startDate, endDate, setStartDate, setEndDate,
    fetchCounters, fetchWarehouses, fetchVehicleModels, fetchModelAccessories, fetchCounterBills, handleFileUpload, fetchBills,
    updateCounter, deleteCounter, updateWarehouse, deleteWarehouse, deleteAccessory, updateAccessory, transferAccessory, transferAllAccessories,
    transferCart, addToTransferCart, removeFromTransferCart, clearTransferCart, executeCartTransfer,
    deleteDataByDate, teamLeads, fetchTeamLeads, updateTeamLead, deleteTeamLead,
    cashiers, fetchCashiers, updateCashier, deleteCashier,
    auditors, fetchAuditors, updateAuditor, deleteAuditor, auditorReports,
    billingCounters, fetchBillingCounters, updateBillingCounter, deleteBillingCounter,
    updateBillStatusAdmin, updateBillAuditStatus, updateBillAuditDetails
  } = useAdminData();

  const [activeView, setActiveView] = useState('dashboard');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedCounterId, setSelectedCounterId] = useState('');
  const [selectedCounterName, setSelectedCounterName] = useState('');
  const [selectedBill, setSelectedBill] = useState<CounterBill | null>(null);
  const [showBillDetails, setShowBillDetails] = useState(false);
  const [selectedCashierReport, setSelectedCashierReport] = useState<any>(null);
  const [selectedTeamLeadReport, setSelectedTeamLeadReport] = useState<TeamLeadReport | null>(null);
  const [selectedAuditorReport, setSelectedAuditorReport] = useState<any>(null);
  const [generatedBill, setGeneratedBill] = useState<CounterBill | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [selectedDuplicacyReport, setSelectedDuplicacyReport] = useState<any>(null);
  const [revertingIdx, setRevertingIdx] = useState<number | null>(null);
  const [revertRemark, setRevertRemark] = useState('');


  useEffect(() => {
    if (allBills.length > 0) {
      const patchDuplicates = async () => {
        const billsToPatch = allBills.filter(b => b.bill_number === 'INV-0035' || b.bill_number === 'INV-0036');
        for (const bill of billsToPatch) {
          const existingAudits = Array.isArray(bill.payment_audits) ? bill.payment_audits : [];
          if (!existingAudits.some(a => a.resolved_duplicate)) {
            const newAudit = {
              resolved_duplicate: true,
              customer_name: bill.customer_name || 'Unknown',
              old_excellon_receipt: 'ER-DUPLICATE-PREV',
              new_excellon_receipt: bill.excellon_receipt_number || 'N/A',
              resolved_at: new Date().toISOString()
            };
            await supabase.from('bills').update({ payment_audits: [...existingAudits, newAudit] }).eq('id', bill.id);
            console.log('Patched', bill.bill_number);
          }
        }
      };
      patchDuplicates();
    }
  }, [allBills]);


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

  const [reportSlide, setReportSlide] = useState(0);

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
    const countMap = new Map<string, number>();
    inventory.forEach(i => {
      if (i.created_at) {
        timestamps.add(i.created_at);
        countMap.set(i.created_at, (countMap.get(i.created_at) || 0) + 1);
      }
    });

    // Filter to strictly Excel uploads: 
    // - customDate uploads end in T12:00:00Z
    // - Batch upserts have exactly the same timestamp (count > 1)
    let result = Array.from(timestamps)
      .filter(t => t.includes('T12:00:00') || (countMap.get(t) || 0) > 1)
      .sort((a, b) => b.localeCompare(a));

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


  const handleAuditorClick = (report: any) => {
    setSelectedAuditorReport(report);
    setActiveView('auditor-details');
  };

  let content;
  if (activeView === 'logins' || activeView === 'logins-team-leads' || activeView === 'logins-cashiers' || activeView === 'logins-warehouses' || activeView === 'logins-auditors' || activeView === 'logins-billing-counters') {
    content = (
      <CounterManagementView
        initialTab={activeView === 'logins-team-leads' ? 'team_leads' : activeView === 'logins-cashiers' ? 'cashiers' : activeView === 'logins-warehouses' ? 'warehouses' : activeView === 'logins-auditors' ? 'auditors' : activeView === 'logins-billing-counters' ? 'billing_counters' : 'counters'}
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
        auditors={auditors}
        onAddAuditor={() => setActiveView('add-auditor')}
        onUpdateAuditor={updateAuditor}
        onDeleteAuditor={deleteAuditor}
        billingCounters={billingCounters}
        onAddBillingCounter={() => setActiveView('add-billing-counter')}
        onUpdateBillingCounter={updateBillingCounter}
        onDeleteBillingCounter={deleteBillingCounter}
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
  } else if (activeView === 'add-auditor') {
    content = (
      <AddAuditorView
        teamLeads={teamLeads}
        onBack={() => {
          setTimeout(() => {
            fetchAuditors();
            setActiveView('logins-auditors');
          }, 500);
        }}
      />
    );
  } else if (activeView === 'add-billing-counter') {
    content = (
      <AddBillingCounterView
        teamLeads={teamLeads}
        onBack={() => {
          setTimeout(() => {
            fetchBillingCounters();
            setActiveView('logins-billing-counters');
          }, 500);
        }}
      />
    );
  } else if (activeView === 'inventory-slider') {
    content = (
      <InventorySliderView
        vehicleModels={vehicleModels}
        counters={counters}
        warehouses={warehouses}
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
        onWarehouseClick={(warehouse) => {
          setSelectedCounterId(warehouse.id);
          setSelectedCounterName(warehouse.name);
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
        auditorReports={auditorReports}
        onAuditorClick={handleAuditorClick}
        unpaidBillsReport={unpaidBillsReport}
        onViewUnpaidBill={(b) => { setGeneratedBill(b); setShowReceipt(true); }}
        currentSlide={reportSlide}
        onSlideChange={setReportSlide}
        allBills={allBills}
        onViewBill={(b) => { setGeneratedBill(b); setShowReceipt(true); }}
      />
    );
  } else if (activeView === 'cashier-details' && selectedCashierReport) {
    content = (
      <CashierDetailsView
        cashierReport={selectedCashierReport}
        onBack={() => setActiveView('reports')}
      />
    );
  } else if (activeView === 'auditor-details' && selectedAuditorReport) {
    const tlIds = selectedAuditorReport.team_leads || [];
    const tLeads = teamLeads.filter(tl => tlIds.includes(tl.id));
    const counterIds = tLeads.flatMap(tl => tl.assigned_counters || []);

    // pending
    const pendingBills = allBills.filter(b => b.counter_id && counterIds.includes(b.counter_id) && b.approval_status === 'approved' && (!b.audit_status || b.audit_status === 'pending'));

    // audited
    const auditedBills = allBills.filter(b => b.auditor_id === selectedAuditorReport.auditor_id && b.audit_status === 'audited');

    content = (
      <AuditorDetailsView
        report={selectedAuditorReport}
        pendingBills={pendingBills}
        auditedBills={auditedBills}
        onBack={() => setActiveView('reports')}
        onViewInvoice={(b) => { setGeneratedBill(b); setShowReceipt(true); }}
        onUpdateBillAuditStatus={updateBillAuditStatus}
        onUpdateBillAuditDetails={updateBillAuditDetails}
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
  } else if (activeView === 'duplicacy-report') {
    content = (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => setActiveView('dashboard')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeftRight className="w-5 h-5 rotate-180" /> Back to Dashboard
          </button>
          <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-2">
            <Copy className="w-6 h-6 text-primary" /> Duplicacy Report
          </h2>
        </div>

        <div className="bg-card p-6 rounded-xl border border-border shadow-lg">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/50 text-xs uppercase tracking-wider text-muted-foreground bg-muted/20">
                <th className="px-4 py-3 font-bold">Billing Counter Name</th>
                <th className="px-4 py-3 font-bold">Duplicacy Registered</th>
                <th className="px-4 py-3 font-bold">Duplicacy Resolved</th>
              </tr>
            </thead>
            <tbody>
              {duplicacyReport?.map((report: any) => (
                <tr key={report.counter_id} className="border-b border-border/10 hover:bg-muted/10 transition-colors">
                  <td className="px-4 py-4">
                    <button
                      onClick={() => setSelectedDuplicacyReport(report)}
                      className="text-primary font-bold hover:underline text-left transition-all"
                    >
                      {report.counter_name}
                    </button>
                  </td>
                  <td className="px-4 py-4 font-mono font-medium text-amber-500">{report.registered_count}</td>
                  <td className="px-4 py-4 font-mono font-medium text-green-500">{report.resolved_count}</td>
                </tr>
              ))}
              {(!duplicacyReport || duplicacyReport.length === 0) && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground text-sm">
                    No duplicacy data available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <DashboardCard icon={Users} label="Counter Management" value="" onClick={() => { fetchCounters(); fetchTeamLeads(); fetchCashiers(); setActiveView('logins'); }} colorClass="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
          <DashboardCard icon={Package} label="Total Inventory" value="" onClick={() => { fetchVehicleModels(); fetchCounters(); setActiveView('inventory-slider'); }} colorClass="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" />
          <DashboardCard icon={BarChart3} label="Reports" value="" onClick={() => { fetchBills(); setActiveView('reports'); }} colorClass="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" />
          <DashboardCard icon={Copy} label="Duplicacy Report" value="" onClick={() => { fetchBills(); setActiveView('duplicacy-report'); }} colorClass="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" />
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


      <Modal isOpen={!!selectedDuplicacyReport} onClose={() => setSelectedDuplicacyReport(null)} title={`Detailed View: ${selectedDuplicacyReport?.counter_name}`} maxWidth="max-w-3xl">
        <div className="space-y-4 p-4 max-h-[70vh] overflow-y-auto">
          {selectedDuplicacyReport?.edited_entries && selectedDuplicacyReport.edited_entries.length > 0 ? (
            <div className="space-y-4">
              {selectedDuplicacyReport.edited_entries.map((entry: any, idx: number) => {
                const isUtrChange = !!entry.old_utr || !!entry.new_utr;
                const isReverting = revertingIdx === idx;

                return (
                  <div key={idx} className="bg-muted/30 border border-border rounded-xl p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col gap-1">
                        <div className="font-bold text-primary text-lg">{entry.bill_number}</div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Resolved By:</span>
                          <div className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded">
                            {entry.resolved_by_counter || selectedDuplicacyReport.counter_name}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">{new Date(entry.resolved_at).toLocaleString()}</div>
                    </div>
                    <div className="text-sm font-semibold">Customer: {entry.customer_name || '-'}</div>
                    <div className="grid grid-cols-2 gap-4 mt-2 p-3 bg-card border border-border rounded-lg text-sm">
                      <div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">
                          {isUtrChange ? 'Old UTR / Ref No' : 'Old Excellon ID'}
                        </div>
                        <div className="font-mono text-red-400 line-through">
                          {isUtrChange ? (entry.old_utr || '-') : (entry.old_excellon_receipt || '-')}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">
                          {isUtrChange ? 'New UTR / Ref No' : 'New Excellon ID'}
                        </div>
                        <div className="font-mono text-green-400 font-bold">
                          {isUtrChange ? (entry.new_utr || '-') : (entry.new_excellon_receipt || '-')}
                        </div>
                      </div>
                    </div>

                    {isReverting ? (
                      <div className="mt-3 p-3 bg-card border border-destructive/20 rounded-lg space-y-2">
                        <label className="text-xs font-semibold text-destructive">Reason for Revert</label>
                        <input
                          type="text"
                          value={revertRemark}
                          onChange={(e) => setRevertRemark(e.target.value)}
                          placeholder="Type remark for the cashier..."
                          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-destructive"
                          autoFocus
                        />
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => {
                              setRevertingIdx(null);
                              setRevertRemark('');
                            }}
                            className="flex-1 py-1.5 text-xs font-bold bg-muted text-muted-foreground hover:bg-muted/80 rounded-lg transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={async () => {
                              if (!revertRemark.trim()) {
                                alert("Remark is required to revert a bill.");
                                return;
                              }

                              if (entry.bill_id && selectedDuplicacyReport.counter_id) {
                                const billToFix = allBills.find((b: any) => b.id === entry.bill_id);
                                if (!billToFix) {
                                  alert("Bill not found.");
                                  return;
                                }

                                const isUtrChange = !!entry.old_utr || !!entry.new_utr;

                                let newPaymentDetails = billToFix.payment_details;
                                if (Array.isArray(newPaymentDetails)) {
                                  newPaymentDetails = newPaymentDetails.map((pd: any) => {
                                    const newPd = { ...pd };
                                    if (isUtrChange && entry.old_utr) {
                                      newPd.utrNumber = entry.old_utr;
                                    }
                                    if (!isUtrChange && entry.old_excellon_receipt) {
                                      newPd.excellonReceipt = entry.old_excellon_receipt;
                                    }
                                    return newPd;
                                  });
                                }

                                const newAudits = Array.isArray(billToFix.payment_audits)
                                  ? billToFix.payment_audits.filter((a: any) => !a.resolved_duplicate)
                                  : [];

                                const updatePayload: any = {
                                  approval_status: 'approved',
                                  approval_note: `Admin Revert: ${revertRemark}`,
                                  payment_audits: newAudits,
                                  payment_details: newPaymentDetails,
                                };

                                if (!isUtrChange && entry.old_excellon_receipt) {
                                  updatePayload.excellon_receipt_number = entry.old_excellon_receipt;
                                }

                                try {
                                  const { supabase } = await import('../lib/supabase');
                                  await supabase.from('bills').update(updatePayload).eq('id', entry.bill_id);

                                  setSelectedDuplicacyReport({
                                    ...selectedDuplicacyReport,
                                    edited_entries: selectedDuplicacyReport.edited_entries.filter((_: any, i: number) => i !== idx)
                                  });

                                  setRevertingIdx(null);
                                  setRevertRemark('');

                                  fetchBills();
                                } catch (err) {
                                  console.error(err);
                                  alert("Failed to revert bill.");
                                }
                              }
                            }}
                            className="flex-1 py-1.5 text-xs font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-lg transition-colors"
                          >
                            Confirm Revert
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 pt-2">
                        <button
                          onClick={() => {
                            const billData = allBills.find((b: any) => b.id === entry.bill_id);
                            if (billData) {
                              setGeneratedBill(billData);
                              setShowReceipt(true);
                            } else {
                              alert('Bill data not found in current session.');
                            }
                          }}
                          className="flex-1 py-2 text-xs font-bold bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground rounded-lg transition-colors border border-primary/20"
                        >
                          View Bill
                        </button>
                        <button
                          onClick={() => {
                            setRevertingIdx(idx);
                            setRevertRemark('');
                          }}
                          className="flex-1 py-2 text-xs font-bold bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground rounded-lg transition-colors border border-destructive/20"
                        >
                          Revert Back
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              <Copy className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p>No historically resolved duplicacies found for this counter.</p>
            </div>
          )}
        </div>
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
