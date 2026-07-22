import { useState } from 'react';
import { toast } from 'sonner';
import { createClient } from '@supabase/supabase-js';
import { ViewHeader } from '../../ViewHeader';
import { UserPlus } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { MultiSelectDropdown } from '../../MultiSelectDropdown';
import type { Counter, Warehouse } from '../../../../hooks/useAdminData';

export const AddTeamLeadView = ({ counters, warehouses, onBack }: { counters: Counter[], warehouses: Warehouse[], onBack: () => void }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [assignedCounters, setAssignedCounters] = useState<string[]>([]);
  const [assignedWarehouses, setAssignedWarehouses] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const tempSupabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        { auth: { persistSession: false, autoRefreshToken: false } }
      );

      const { data, error } = await tempSupabase.auth.signUp({
        email: `${username.trim().toLowerCase()}@portal.com`,
        password,
        options: {
          data: {
            name: username,
            role: 'team_lead',
            username: username,
            password: password,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            name: username,
            username,
            password,
            role: 'team_lead',
            assigned_counters: assignedCounters,
            assigned_warehouses: assignedWarehouses
          });

        if (profileError) {
          console.warn('Could not update profile with credentials:', profileError);
        }
      }

      toast.success('Team Lead created successfully!');
      setUsername('');
      setPassword('');
      setAssignedCounters([]);
      setAssignedWarehouses([]);
      onBack();
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Error creating team lead');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <ViewHeader title="Create New Team Lead" onBack={onBack} icon={UserPlus} description="Add a new Team Lead and assign counters." />
      <div className="bg-card p-6 rounded-xl border border-border shadow-sm max-w-2xl mx-auto">
        <form onSubmit={handleCreate} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Username</label>
              <input
                type="text"
                required
                className="w-full px-4 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <input
                type="password"
                required
                className="w-full px-4 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Assign Counters</label>
            <MultiSelectDropdown 
              options={counters.map(c => ({ id: c.id, name: c.name }))}
              selectedIds={assignedCounters}
              onChange={setAssignedCounters}
              placeholder="Click to assign counters..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Assign Warehouses</label>
            <MultiSelectDropdown 
              options={warehouses.map(w => ({ id: w.id, name: w.name }))}
              selectedIds={assignedWarehouses}
              onChange={setAssignedWarehouses}
              placeholder="Click to assign warehouses..."
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground py-3 px-4 rounded-md hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 font-bold shadow-md"
          >
            {loading ? 'Creating...' : <><UserPlus className="w-5 h-5" /> Create Team Lead</>}
          </button>
        </form>
      </div>
    </div>
  );
};
