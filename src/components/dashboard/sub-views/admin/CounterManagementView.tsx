import { useState, useEffect } from 'react';
import { ManageCountersView } from './ManageCountersView';
import { ManageWarehousesView } from './ManageWarehousesView';
import { ManageTeamLeadsView } from './ManageTeamLeadsView';
import { ManageCashiersView } from './ManageCashiersView';
import { ManageAuditorsView } from './ManageAuditorsView';
import type { Counter, Warehouse, TeamLead, Cashier, Auditor } from '../../../../hooks/useAdminData';

export const CounterManagementView = (props: {
  counters: (Counter & { login_count?: number })[],
  warehouses: (Warehouse & { login_count?: number })[],
  teamLeads: TeamLead[],
  onBack: () => void,
  onAddCounter: () => void,
  onUpdateCounter: (id: string, updates: any) => void,
  onDeleteCounter: (id: string) => void,
  onAddWarehouse: () => void,
  onUpdateWarehouse: (id: string, updates: any) => void,
  onDeleteWarehouse: (id: string) => void,
  onAddTeamLead: () => void,
  onUpdateTeamLead: (id: string, updates: any) => void,
  onDeleteTeamLead: (id: string) => void,
  cashiers: Cashier[],
  onAddCashier: () => void,
  onUpdateCashier: (id: string, updates: any) => void,
  onDeleteCashier: (id: string) => void,
  auditors: Auditor[],
  onAddAuditor: () => void,
  onUpdateAuditor: (id: string, updates: any) => void,
  onDeleteAuditor: (id: string) => void,
  initialTab?: 'counters' | 'warehouses' | 'team_leads' | 'cashiers' | 'auditors'
}) => {
  const [activeTab, setActiveTab] = useState<'counters' | 'warehouses' | 'team_leads' | 'cashiers' | 'auditors'>(props.initialTab || 'counters');

  useEffect(() => {
    if (props.initialTab) {
      setActiveTab(props.initialTab);
    }
  }, [props.initialTab]);

  return (
    <div className="space-y-6">
      <div className="flex bg-muted/50 p-1 rounded-lg w-fit border border-border">
        <button
          onClick={() => setActiveTab('counters')}
          className={`px-6 py-2 rounded-md font-semibold transition-all ${activeTab === 'counters' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
        >
          Manage Counters
        </button>
        <button
          onClick={() => setActiveTab('warehouses')}
          className={`px-6 py-2 rounded-md font-semibold transition-all ${activeTab === 'warehouses' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
        >
          Manage Warehouses
        </button>
        <button
          onClick={() => setActiveTab('team_leads')}
          className={`px-6 py-2 rounded-md font-semibold transition-all ${activeTab === 'team_leads' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
        >
          Manage Team Leads
        </button>
        <button
          onClick={() => setActiveTab('cashiers')}
          className={`px-6 py-2 rounded-md font-semibold transition-all ${activeTab === 'cashiers' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
        >
          Manage Cashiers
        </button>
        <button
          onClick={() => setActiveTab('auditors')}
          className={`px-6 py-2 rounded-md font-semibold transition-all ${activeTab === 'auditors' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
        >
          Manage Auditors
        </button>
      </div>

      {activeTab === 'counters' ? (
        <ManageCountersView
          data={props.counters}
          onBack={props.onBack}
          onAddCounter={props.onAddCounter}
          onUpdate={props.onUpdateCounter}
          onDelete={props.onDeleteCounter}
        />
      ) : activeTab === 'warehouses' ? (
        <ManageWarehousesView
          data={props.warehouses}
          onBack={props.onBack}
          onAddWarehouse={props.onAddWarehouse}
          onUpdate={props.onUpdateWarehouse}
          onDelete={props.onDeleteWarehouse}
        />
      ) : activeTab === 'team_leads' ? (
        <ManageTeamLeadsView
          data={props.teamLeads}
          counters={props.counters}
          warehouses={props.warehouses}
          onBack={props.onBack}
          onAddTeamLead={props.onAddTeamLead}
          onUpdate={props.onUpdateTeamLead}
          onDelete={props.onDeleteTeamLead}
        />
      ) : activeTab === 'cashiers' ? (
        <ManageCashiersView
          data={props.cashiers}
          counters={props.counters}
          onBack={props.onBack}
          onAddCashier={props.onAddCashier}
          onUpdate={props.onUpdateCashier}
          onDelete={props.onDeleteCashier}
        />
      ) : (
        <ManageAuditorsView
          data={props.auditors}
          teamLeads={props.teamLeads}
          onBack={props.onBack}
          onAddAuditor={props.onAddAuditor}
          onUpdate={props.onUpdateAuditor}
          onDelete={props.onDeleteAuditor}
        />
      )}
    </div>
  );
};
// Triggering an IDE cache refresh.
