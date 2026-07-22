import { useState } from 'react';
import { toast } from 'sonner';
import { createClient } from '@supabase/supabase-js';
import { ViewHeader } from '../../ViewHeader';
import { UserPlus } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';

export const AddWarehouseView = ({ onBack }: { onBack: () => void }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create a temporary client that doesn't persist the session to prevent auto-login
      const tempSupabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        { auth: { persistSession: false, autoRefreshToken: false } }
      );

      const { data, error } = await tempSupabase.auth.signUp({
        email: `${username}@portal.com`,
        password,
        options: {
          data: {
            name: username,
            role: 'warehouse',
            username: username,
            password: password,
          },
        },
      });

      if (error) throw error;

      // Explicitly update the profiles table if it was created by a trigger, 
      // or wait for it and then update.
      if (data.user) {
        // Use upsert to ensure the profile is created/updated with the correct credentials
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            name: username,
            username,
            password,
            role: 'warehouse'
          });

        if (profileError) {
          console.warn('Could not update profile with credentials:', profileError);
        }
      }

      toast.success('Warehouse created successfully!');
      setUsername('');
      setPassword('');
      onBack();
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Error creating warehouse');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <ViewHeader title="Create New Warehouse" onBack={onBack} icon={UserPlus} description="Add a new warehouse to the system." />
      <div className="bg-card p-6 rounded-xl border border-border shadow-sm max-w-md mx-auto">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Username (Warehouse Name)</label>
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
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-md hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 mt-4"
          >
            {loading ? 'Creating...' : <><UserPlus className="w-4 h-4" /> Create Warehouse</>}
          </button>
        </form>
      </div>
    </div>
  );
};
