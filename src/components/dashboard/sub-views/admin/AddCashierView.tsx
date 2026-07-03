// src/components/dashboard/sub-views/admin/AddCashierView.tsx
import { useState } from 'react';
import { toast } from 'sonner';
import { ViewHeader } from '../../ViewHeader';
import { UserPlus } from 'lucide-react';
import { api } from '../../../../lib/api';
import { MultiSelectDropdown } from '../../MultiSelectDropdown';
import type { Counter } from '../../../../hooks/useAdminData';

export const AddCashierView = ({ counters, onBack }: { counters: Counter[], onBack: () => void }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [assignedCounters, setAssignedCounters] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.fetch('/api/protected/admin/profiles', {
        method: 'POST',
        body: JSON.stringify({
          name: username,
          username,
          password,
          role: 'cashier',
          assigned_counters: assignedCounters
        })
      });

      toast.success('Cashier created successfully!');
      setUsername('');
      setPassword('');
      setAssignedCounters([]);
      onBack();
    } catch (error: any) {
      toast.error(error.message || 'Error creating cashier');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <ViewHeader title="Create New Cashier" onBack={onBack} icon={UserPlus} description="Add a new Cashier and assign counters." />
      <div className="bg-card p-6 rounded-xl border border-border shadow-sm max-w-2xl mx-auto">
        <form onSubmit={handleCreate} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Username</label>
              <input type="text" required className="w-full px-4 py-2 bg-input border border-border rounded-md" value={username} onChange={e => setUsername(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <input type="password" required className="w-full px-4 py-2 bg-input border border-border rounded-md" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Assign Counters</label>
            <MultiSelectDropdown options={counters.map(c => ({ id: c.id, name: c.name }))} selectedIds={assignedCounters} onChange={setAssignedCounters} placeholder="Click to assign counters..." />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground py-3 px-4 rounded-md hover:bg-primary/90 font-bold flex items-center justify-center gap-2">
            {loading ? 'Creating...' : <><UserPlus className="w-5 h-5" /> Create Cashier</>}
          </button>
        </form>
      </div>
    </div>
  );
};