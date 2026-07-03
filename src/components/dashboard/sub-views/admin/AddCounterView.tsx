// src/components/dashboard/sub-views/admin/AddCounterView.tsx
import { useState } from 'react';
import { toast } from 'sonner';
import { ViewHeader } from '../../ViewHeader';
import { UserPlus } from 'lucide-react';
import { api } from '../../../../lib/api';

export const AddCounterView = ({ onBack }: { onBack: () => void }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.fetch('/api/protected/admin/profiles', {
        method: 'POST',
        body: JSON.stringify({ name: username, username, password, role: 'counter' })
      });

      toast.success('Counter created successfully!');
      setUsername('');
      setPassword('');
      onBack();
    } catch (error: any) {
      toast.error(error.message || 'Error creating counter');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <ViewHeader title="Create New Counter" onBack={onBack} icon={UserPlus} description="Add a new counter to the system." />
      <div className="bg-card p-6 rounded-xl border border-border shadow-sm max-w-md mx-auto">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Username (Counter Name)</label>
            <input type="text" required className="w-full px-4 py-2 bg-input border border-border rounded-md" value={username} onChange={e => setUsername(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input type="password" required className="w-full px-4 py-2 bg-input border border-border rounded-md" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-md hover:bg-primary/90 flex items-center justify-center gap-2 mt-4">
            {loading ? 'Creating...' : <><UserPlus className="w-4 h-4" /> Create Counter</>}
          </button>
        </form>
      </div>
    </div>
  );
};