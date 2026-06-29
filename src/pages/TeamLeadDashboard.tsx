import { useState } from 'react';
import { useAuth } from '../components/auth-provider';
import { useTeamLeadData } from '../hooks/useTeamLeadData';
import { DashboardCard } from '../components/dashboard/DashboardCard';
import { ReportsView, BillsView, TeamLeadInventoryView, TeamLeadApprovalView } from '../components/dashboard/sub-views/AdminSubViews';
import { Store, Package, BarChart3, ReceiptText } from 'lucide-react';
import type { SalesReport } from '../hooks/useAdminData';

export function TeamLeadDashboard() {
  const { user, loading: authLoading } = useAuth();
  const { 
    profile, 
    assignedCounters, 
    inventory, 
    bills, 
    salesReport, 
    inventoryReport, 
    amountCollectedReport,
    loading,
    updateBillStatus
  } = useTeamLeadData(user);

  const [activeView, setActiveView] = useState<'dashboard' | 'reports' | 'bills' | 'inventory' | 'approvals'>('dashboard');
  const [selectedCounterId, setSelectedCounterId] = useState('');
  const [selectedCounterName, setSelectedCounterName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  if (authLoading || loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const handleCounterClick = (r: SalesReport) => {
    setSelectedCounterId(r.counter_id);
    setSelectedCounterName(r.counter_name);
    setActiveView('bills');
  };

  let content;
  if (activeView === 'reports') {
    content = (
      <ReportsView
        data={salesReport}
        inventory={inventory}
        inventoryReport={inventoryReport}
        amountCollectedReport={amountCollectedReport}
        onBack={() => setActiveView('dashboard')}
        onCounterClick={handleCounterClick}
      />
    );
  } else if (activeView === 'bills') {
    const counterBills = bills.filter(b => b.counter_id === selectedCounterId);
    content = (
      <BillsView 
        counterName={selectedCounterName} 
        data={counterBills} 
        onBack={() => { setActiveView('reports'); setSelectedCounterId(''); }} 
        onRowClick={() => {}} 
        startDate={startDate} 
        endDate={endDate} 
        setStartDate={setStartDate} 
        setEndDate={setEndDate} 
      />
    );
  } else if (activeView === 'inventory') {
    content = (
      <TeamLeadInventoryView
        counters={assignedCounters}
        inventory={inventory}
        onBack={() => setActiveView('dashboard')}
      />
    );
  } else if (activeView === 'approvals') {
    content = (
      <TeamLeadApprovalView
        counters={assignedCounters}
        bills={bills}
        onBack={() => setActiveView('dashboard')}
        onUpdateBillStatus={updateBillStatus}
      />
    );
  } else {
    content = (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col items-center justify-center py-4 space-y-1">
          <div className="flex items-center gap-2 text-primary/60">
            <Store className="w-5 h-5" />
            <span className="text-xs font-black uppercase tracking-[0.2em]">Team Lead Dashboard</span>
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tight text-center">
            Welcome, <span className="text-primary">{profile?.name || 'Lead'}</span>
          </h1>
          <p className="text-muted-foreground text-sm font-medium uppercase tracking-widest mt-2">
            Managing {assignedCounters.length} Counters
          </p>
          <div className="w-16 h-1.5 bg-primary rounded-full mt-4" />
        </div>

        {assignedCounters.length === 0 ? (
          <div className="bg-card p-12 rounded-xl border border-border shadow-sm text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Store className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold text-foreground">No Counters Assigned</h2>
            <p className="text-muted-foreground mt-2 max-w-md mx-auto">
              You haven't been assigned any counters yet. Please contact the administrator to assign counters to your profile.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <DashboardCard 
                icon={Store} 
                label="Assigned Counters" 
                value={assignedCounters.length} 
                colorClass="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" 
              />
              <DashboardCard 
                icon={Package} 
                label="Total Inventory" 
                value={inventory.length} 
                onClick={() => setActiveView('inventory')} 
                colorClass="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" 
              />
              <DashboardCard 
                icon={BarChart3} 
                label="Overall Reports" 
                value={salesReport.length} 
                onClick={() => setActiveView('reports')} 
                colorClass="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" 
              />
              <DashboardCard 
                icon={ReceiptText} 
                label="Bill Approvals" 
                value={bills.filter(b => b.approval_status === 'pending').length} 
                onClick={() => setActiveView('approvals')} 
                colorClass="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" 
              />
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {content}
    </div>
  );
}
