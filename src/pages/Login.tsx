import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/auth-provider';
import { toast } from 'sonner';
import { LogIn, Car } from 'lucide-react';
import { ThemeToggle } from '../components/theme-toggle';

export function Login() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // If already logged in, redirect to dashboard
  if (!authLoading && user) {
    if (profile?.role === 'admin') return <Navigate to="/admin" replace />;
    if (profile?.role === 'team_lead') return <Navigate to="/teamlead" replace />;
    if (profile?.role === 'cashier') return <Navigate to="/cashier" replace />;
    if (profile?.role === 'warehouse') return <Navigate to="/warehouse" replace />;
    return <Navigate to="/counter" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const domains = [
        'portal.com', 'teamlead.com', 'cashier.com', 'auditor.com',
        'portal.local', 'teamlead.local', 'cashier.local', 'auditor.local'
      ];
      
      let data, error;
      for (const domain of domains) {
        const result = await supabase.auth.signInWithPassword({
          email: `${username.trim().toLowerCase()}@${domain}`,
          password,
        });
        
        data = result.data;
        error = result.error;
        
        if (!error) break;
        if (error && !error.message.includes('Invalid login credentials')) {
          break; // Stop trying if it's a real error (like rate limit)
        }
      }

      if (error) throw error;

        // Check if profile exists before redirecting
      if (data?.user) {
        const isHardcodedAdmin = data.user.email?.startsWith('admin@');
        let role = isHardcodedAdmin ? 'admin' : 'counter';

        if (!isHardcodedAdmin) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role, username, password')
            .eq('id', data.user.id)
            .single();

          if (profileError || !profile) {
            await supabase.auth.signOut();
            throw new Error('This account is no longer active or unauthorized.');
          }
          role = profile.role || 'counter';
        }

        // Log the login event (fire-and-forget, don't block login)
        supabase.from('login_logs').insert([{ user_id: data.user.id }]).then(() => {});

        navigate(role === 'admin' ? '/admin' : role === 'team_lead' ? '/teamlead' : role === 'cashier' ? '/cashier' : role === 'warehouse' ? '/warehouse' : role === 'auditor' ? '/auditor' : '/counter', { replace: true });
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Error logging in');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative">
      <div className="absolute top-4 right-4"><ThemeToggle /></div>
      <div className="w-full max-w-md bg-card p-8 rounded-xl shadow-lg border border-border">
        <div className="flex flex-col items-center mb-8 text-primary">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Car className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Accessories Portal</h1>
          <p className="text-muted-foreground text-sm mt-2">Welcome back! Please login.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
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
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-md hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
          >
            {loading ? 'Logging in...' : <><LogIn className="w-4 h-4" /> Login</>}
          </button>
        </form>
      </div>
    </div>
  );
}
