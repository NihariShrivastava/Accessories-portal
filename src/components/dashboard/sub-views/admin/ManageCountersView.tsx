import { useState } from 'react';
import { DataTable } from '../../DataTable';
import { ViewHeader } from '../../ViewHeader';
import { Badge } from '../../Badge';
import { Users, UserPlus, Save, X, Trash2 } from 'lucide-react';
import type { Counter } from '../../../../hooks/useAdminData';

export const ManageCountersView = ({
  data,
  onBack,
  onAddCounter,
  onUpdate,
  onDelete
}: {
  data: (Counter & { login_count?: number })[],
  onBack: () => void,
  onAddCounter: () => void,
  onUpdate: (id: string, updates: any) => void,
  onDelete: (id: string) => void
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', username: '', password: '' });

  const startEdit = (counter: any) => {
    setEditingId(counter.id);
    setEditForm({
      name: counter.name || '',
      username: counter.username || '',
      password: counter.password || ''
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
          title="Manage Counters"
          onBack={onBack}
          icon={Users}
          description={`${data.length} total counter accounts in the system.`}
        />
        <button
          onClick={onAddCounter}
          className="bg-primary text-primary-foreground py-2 px-6 rounded-lg hover:bg-primary/90 transition-all flex items-center justify-center gap-2 font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95"
        >
          <UserPlus className="w-5 h-5" /> Add New Counter
        </button>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <DataTable<(Counter & { login_count?: number }) >
          idAccessor="id"
          data={data}
          columns={[
            {
              header: 'Counter Name / Username',
              accessor: (c) => editingId === c.id ? (
                <input
                  className="w-full px-2 py-1 bg-background border rounded text-sm"
                  value={editForm.name}
                  onChange={e => setEditForm({ ...editForm, name: e.target.value, username: e.target.value })}
                />
              ) : <span className="font-semibold text-primary">{c.name}</span>,
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
                        onClick={() => { if (confirm(`Are you sure you want to delete ${c.name}?`)) onDelete(c.id); }}
                        className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                        title="Delete Counter"
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
        />
      </div>
    </div>
  );
};
