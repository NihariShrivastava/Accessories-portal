import { useState, useRef, useMemo } from 'react';
import { Upload, Users, Package, FileSpreadsheet, BarChart3, ChevronRight, Car } from 'lucide-react';
import { DashboardCard } from '../components/dashboard/DashboardCard';
import { DataTable } from '../components/dashboard/DataTable';
import { ViewHeader } from '../components/dashboard/ViewHeader';
import { useAdminData } from '../hooks/useAdminData';
import type { InventoryItem } from '../hooks/useAdminData';
import { Modal } from '../components/dashboard/Modal';
import { BillDetails } from '../components/dashboard/BillDetails';
import { LoginsView, ModelDetailView, ReportsView, BillsView, CounterInventoryModelsView, CounterInventoryDetailsView } from '../components/dashboard/sub-views/AdminSubViews';

export function AdminDashboard() {
  const {
    stats, counters, inventory, loginDetails, vehicleModels, modelAccessories, salesReport, uploading,
    startDate, endDate, setStartDate, setEndDate,
    fetchLoginDetails, fetchVehicleModels, fetchModelAccessories, fetchCounterBills, handleFileUpload
  } = useAdminData();

  const [activeView, setActiveView] = useState('dashboard');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedCounterId, setSelectedCounterId] = useState('');
  const [selectedCounterName, setSelectedCounterName] = useState('');
  const [selectedReportModel, setSelectedReportModel] = useState('');
  const [selectedReportCounterName, setSelectedReportCounterName] = useState('');
  const [selectedBill, setSelectedBill] = useState<any | null>(null);
  const [showBillDetails, setShowBillDetails] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const counterBills = useMemo(() => {
    if (!selectedCounterId) return [];
    return fetchCounterBills(selectedCounterId);
  }, [selectedCounterId, fetchCounterBills]);

  const reportCounterModels = useMemo(() => {
    if (!selectedReportCounterName) return [];
    return [...new Set(inventory.filter(i => i.counter_name === selectedReportCounterName).map(i => i.vehicle_model))].sort();
  }, [selectedReportCounterName, inventory]);

  const reportModelDetails = useMemo(() => {
    if (!selectedReportModel || !selectedReportCounterName) return [];
    return inventory.filter(i => i.counter_name === selectedReportCounterName && i.vehicle_model === selectedReportModel);
  }, [selectedReportModel, selectedReportCounterName, inventory]);

  if (activeView === 'logins') return <LoginsView data={loginDetails} onBack={() => setActiveView('dashboard')} />;
  if (activeView === 'models') return (
    <div className="space-y-6">
      <ViewHeader title="Vehicle Models" onBack={() => setActiveView('dashboard')} icon={Car} description={`${vehicleModels.length} model(s) found.`} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {vehicleModels.map(m => (
          <button key={m} onClick={() => { setSelectedModel(m); fetchModelAccessories(m); setActiveView('model-detail'); }} className="flex items-center justify-between p-4 bg-card border border-border rounded-lg hover:bg-muted group">
            <span className="font-medium">{m}</span><ChevronRight className="w-4 h-4" />
          </button>
        ))}
      </div>
    </div>
  );
  if (activeView === 'model-detail') return <ModelDetailView model={selectedModel} data={modelAccessories} onBack={() => setActiveView('models')} />;
  if (activeView === 'reports') return (
    <ReportsView
      data={salesReport}
      inventory={inventory}
      onBack={() => setActiveView('dashboard')}
      onCounterClick={async (r) => {
        setSelectedCounterId(r.counter_id);
        setSelectedCounterName(r.counter_name);
        setActiveView('counter-bills');
      }}
      onInventoryCounterClick={(counterName) => {
        setSelectedReportCounterName(counterName);
        setActiveView('report-counter-models');
      }}
    />
  );
  if (activeView === 'counter-bills') return <BillsView counterName={selectedCounterName} data={counterBills} onBack={() => { setActiveView('reports'); setSelectedCounterId(''); }} onRowClick={(b) => { setSelectedBill(b); setShowBillDetails(true); }} startDate={startDate} endDate={endDate} setStartDate={setStartDate} setEndDate={setEndDate} />;

  if (activeView === 'report-counter-models') return (
    <CounterInventoryModelsView
      counterName={selectedReportCounterName}
      models={reportCounterModels}
      onBack={() => setActiveView('reports')}
      onModelClick={(model) => {
        setSelectedReportModel(model);
        setActiveView('report-model-accessories');
      }}
    />
  );

  if (activeView === 'report-model-accessories') return (
    <CounterInventoryDetailsView
      counterName={selectedReportCounterName}
      model={selectedReportModel}
      data={reportModelDetails}
      onBack={() => setActiveView('report-counter-models')}
    />
  );

  const DashboardContent = (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <DashboardCard icon={Users} label="Total Logins" value={stats.uniqueLogins} onClick={() => { fetchLoginDetails(); setActiveView('logins'); }} colorClass="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
        <DashboardCard icon={Package} label="Total Inventory" value={stats.items} onClick={() => { fetchVehicleModels(); setActiveView('models'); }} colorClass="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" />
        <DashboardCard icon={BarChart3} label="Reports" value={salesReport.length} onClick={() => setActiveView('reports')} colorClass="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" />
      </div>
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Upload className="w-5 h-5" /> Upload Excel</h2>
          <select className="w-full px-3 py-2 bg-input border rounded-md mb-4" value={selectedCounterId} onChange={(e) => setSelectedCounterId(e.target.value)}>
            <option value="">-- Choose Counter --</option>
            {counters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input type="file" className="hidden" ref={fileInputRef} onChange={(e) => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0], selectedCounterId); }} />
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading || !selectedCounterId} className="w-full bg-secondary py-2 rounded-md flex items-center justify-center gap-2 disabled:opacity-50">
            {uploading ? 'Processing...' : <><FileSpreadsheet className="w-4 h-4" /> Select File</>}
          </button>
        </div>
        <div className="md:col-span-2 bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 pb-0"><h2 className="text-lg font-semibold mb-4">Global Inventory</h2></div>
          <DataTable<InventoryItem> idAccessor="id" maxHeight="400px" pageSize={50} data={inventory} columns={[
            { header: 'Counter', accessor: 'counter_name', className: 'font-medium' },
            { header: 'Model', accessor: 'vehicle_model', className: 'text-muted-foreground' },
            { header: 'Accessory', accessor: 'name' },
            { header: 'Qty', accessor: 'quantity', className: 'text-right' },
            { header: 'Price', accessor: (i) => `₹${i.price.toFixed(2)}`, className: 'text-right' }
          ]} />
        </div>
      </div>

      <Modal isOpen={showBillDetails && !!selectedBill} onClose={() => { setShowBillDetails(false); setSelectedBill(null); }} title="Bill Details">
        <BillDetails bill={selectedBill} onClose={() => { setShowBillDetails(false); setSelectedBill(null); }} />
      </Modal>
    </div>
  );

  return DashboardContent;
}
