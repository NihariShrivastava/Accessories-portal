import { useState } from 'react';
import { DataTable } from '../../DataTable';
import { ViewHeader } from '../../ViewHeader';
import { Badge } from '../../Badge';
import { MultiSelectDropdown } from '../../MultiSelectDropdown';
import { Users, UserPlus, Save, X, Trash2 } from 'lucide-react';
import type { TeamLead, Counter, Warehouse } from '../../../../hooks/useAdminData';

export const ManageTeamLeadsView = ({
  data,
  counters,
  warehouses,
  onBack,
  onAddTeamLead,
  onUpdate,
  onDelete
}: {
  data: TeamLead[],
  counters: Counter[],
  warehouses: Warehouse[],
  onBack: () => void,
  onAddTeamLead: () => void,
  onUpdate: (id: string, updates: any) => void,
  onDelete: (id: string) => void
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ username: string, password: string, assigned_counters: string[], assigned_warehouses: string[] }>({ username: '', password: '', assigned_counters: [], assigned_warehouses: [] });

  const startEdit = (tl: TeamLead) => {
    setEditingId(tl.id);
    setEditForm({
      username: tl.username || '',
      password: tl.password || '',
      assigned_counters: tl.assigned_counters || [],
      assigned_warehouses: tl.assigned_warehouses || []
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
          title="Manage Team Leads"
          onBack={onBack}
          icon={Users}
          description={`${data.length} total team leads in the system.`}
        />
        <button
          onClick={onAddTeamLead}
          className="bg-primary text-primary-foreground py-2 px-6 rounded-lg hover:bg-primary/90 transition-all flex items-center justify-center gap-2 font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95"
        >
          <UserPlus className="w-5 h-5" /> Add New Team Lead
        </button>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-visible">
        <DataTable<TeamLead>
          idAccessor="id"
          data={data}
          columns={[
            {
              header: 'Username',
              accessor: (c) => editingId === c.id ? (
                <input
                  className="w-full px-2 py-1 bg-background border rounded text-sm"
                  value={editForm.username}
                  onChange={e => setEditForm({ ...editForm, username: e.target.value })}
                />
              ) : <span className="font-semibold text-primary">{c.username || c.name}</span>,
              className: 'min-w-[150px]'
            },
            {
              header: 'Password',
              accessor: (c) => editingId === c.id ? (
                <input
                  className="w-full px-2 py-1 bg-background border rounded text-sm"
                  value={editForm.password}
                  onChange={e => setEditForm({ ...editForm, password: e.target.value })}
                />
              ) : <span className="text-muted-foreground font-mono text-xs">{c.password || <span className="text-destructive font-bold underline">EMPTY</span>}</span>
            },
            {
              header: 'Assigned Counters',
              accessor: (c) => editingId === c.id ? (
                <div className="min-w-[200px]">
                  <MultiSelectDropdown 
                    options={counters.map(ctr => ({ id: ctr.id, name: ctr.name }))}
                    selectedIds={editForm.assigned_counters}
                    onChange={(ids) => setEditForm(prev => ({ ...prev, assigned_counters: ids }))}
                    placeholder="Assign counters..."
                  />
                </div>
              ) : (
                <div className="flex flex-wrap gap-1 max-w-xs">
                  {c.assigned_counters && c.assigned_counters.length > 0 ? (
                    c.assigned_counters.map(id => {
                      const counter = counters.find(ctr => ctr.id === id);
                      return <Badge key={id} variant="secondary">{counter ? counter.name : 'Unknown'}</Badge>;
                    })
                  ) : (
                    <span className="text-muted-foreground text-xs">None</span>
                  )}
                </div>
              )
            },
            {
              header: 'Assigned Warehouses',
              accessor: (c) => editingId === c.id ? (
                <div className="min-w-[200px]">
                  <MultiSelectDropdown 
                    options={warehouses.map(w => ({ id: w.id, name: w.name }))}
                    selectedIds={editForm.assigned_warehouses}
                    onChange={(ids) => setEditForm(prev => ({ ...prev, assigned_warehouses: ids }))}
                    placeholder="Assign warehouses..."
                  />
                </div>
              ) : (
                <div className="flex flex-wrap gap-1 max-w-xs">
                  {c.assigned_warehouses && c.assigned_warehouses.length > 0 ? (
                    c.assigned_warehouses.map((id: string) => {
                      const wh = warehouses.find(w => w.id === id);
                      if (!wh) return null;
                      return <Badge key={id} variant="secondary">{wh.name}</Badge>;
                    })
                  ) : (
                    <span className="text-muted-foreground text-xs">None</span>
                  )}
                </div>
              )
            },
            {
              header: 'Logins',
              accessor: (c) => <Badge variant="secondary">{c.login_count || 0}</Badge>,
              className: 'text-center'
            },
            {
              header: 'Actions',
              accessor: (c) => (
                <div className="flex items-center justify-end gap-2">
                  {editingId === c.id ? (
                    <>
                      <button
                        onClick={() => handleSave(c.id)}
                        className="p-1.5 bg-green-100 text-green-600 hover:bg-green-200 rounded-lg transition-colors"
                        title="Save Changes"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-1.5 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg transition-colors"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => startEdit(c)}
                        className="px-3 py-1 bg-muted hover:bg-muted-foreground hover:text-white rounded text-xs font-semibold transition-all"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => { if (confirm(`Are you sure you want to delete ${c.username}?`)) onDelete(c.id); }}
                        className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                        title="Delete Team Lead"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              ),
              className: 'text-right'
            }
          ]}
          overflowVisible={true}
        />
      </div>
    </div>
  );
};
// Triggering an IDE cache refresh.
