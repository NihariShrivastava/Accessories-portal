import React, { useState } from 'react';
import { supabase } from '../../../../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { UserPlus, ArrowLeft } from 'lucide-react';
import { MultiSelectDropdown } from '../../MultiSelectDropdown';
import type { TeamLead } from '../../../../hooks/useAdminData';

export const AddAuditorView = ({ onBack, teamLeads }: { onBack: () => void, teamLeads: TeamLead[] }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    assigned_team_leads: [] as string[]
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const tempSupabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        { auth: { persistSession: false, autoRefreshToken: false } }
      );

      const email = `${formData.username.trim().toLowerCase()}@auditor.local`;
      
      const { data: authData, error: authError } = await tempSupabase.auth.signUp({
        email,
        password: formData.password
      });

      if (authError) throw authError;

      const { error: profileError } = await supabase.from('profiles').upsert([{
        id: authData.user?.id,
        name: formData.username,
        username: formData.username,
        password: formData.password,
        role: 'auditor',
        assigned_team_leads: formData.assigned_team_leads
      }]);

      if (profileError) throw profileError;

      toast.success('Auditor added successfully!');
      onBack();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create auditor account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <UserPlus className="w-6 h-6 text-primary" />
          Add New Auditor
        </h2>
        <button 
          onClick={onBack}
          className="p-2 hover:bg-muted rounded-full transition-colors"
          title="Back to management"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="bg-card p-6 rounded-xl border border-border shadow-sm space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Username (Login ID)</label>
            <input
              type="text"
              required
              className="w-full px-4 py-2 bg-input border rounded-lg focus:ring-2 focus:ring-primary"
              value={formData.username}
              onChange={e => setFormData({ ...formData, username: e.target.value })}
              placeholder="e.g. auditor_alice"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="text"
              required
              className="w-full px-4 py-2 bg-input border rounded-lg focus:ring-2 focus:ring-primary"
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
              placeholder="Min 6 characters"
              minLength={6}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Assign Team Leads</label>
          <MultiSelectDropdown 
            options={teamLeads.map(tl => ({ id: tl.id, name: tl.name || tl.username || 'Unknown' }))}
            selectedIds={formData.assigned_team_leads}
            onChange={(ids) => setFormData(prev => ({ ...prev, assigned_team_leads: ids }))}
            placeholder="Select team leads to assign..."
          />
          <p className="text-xs text-muted-foreground mt-2">
            The auditor will only receive bills approved by these selected Team Leads.
          </p>
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-lg hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Creating Account...</>
            ) : (
              <><UserPlus className="w-5 h-5" /> Create Auditor Account</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
