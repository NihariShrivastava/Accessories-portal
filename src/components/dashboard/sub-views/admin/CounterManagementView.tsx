import { useState, useEffect } from 'react';
import { ManageCountersView } from './ManageCountersView';
import { ManageTeamLeadsView } from './ManageTeamLeadsView';
import type { Counter, TeamLead } from '../../../../hooks/useAdminData';

export const CounterManagementView = (props: {
  counters: (Counter & { login_count?: number })[],
  teamLeads: TeamLead[],
  onBack: () => void,
  onAddCounter: () => void,
  onUpdateCounter: (id: string, updates: any) => void,
  onDeleteCounter: (id: string) => void,
  onAddTeamLead: () => void,
  onUpdateTeamLead: (id: string, updates: any) => void,
  onDeleteTeamLead: (id: string) => void,
  initialTab?: 'counters' | 'team_leads'
}) => {
  const [activeTab, setActiveTab] = useState<'counters' | 'team_leads'>(props.initialTab || 'counters');

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
          onClick={() => setActiveTab('team_leads')}
          className={`px-6 py-2 rounded-md font-semibold transition-all ${activeTab === 'team_leads' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
        >
          Manage Team Leads
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
      ) : (
        <ManageTeamLeadsView
          data={props.teamLeads}
          counters={props.counters}
          onBack={props.onBack}
          onAddTeamLead={props.onAddTeamLead}
          onUpdate={props.onUpdateTeamLead}
          onDelete={props.onDeleteTeamLead}
        />
      )}
    </div>
  );
};
// Triggering an IDE cache refresh.
