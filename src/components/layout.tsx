// src/components/layout.tsx
import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { ThemeToggle } from './theme-toggle';
import { LogOut, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from './auth-provider';

export function Layout({ children }: { children?: React.ReactNode }) {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 min-h-16 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-bold text-xl text-primary whitespace-nowrap">
            <Wrench className="h-6 w-6 shrink-0" />
            <span className="hidden sm:inline">Vehicle Accessories Portal</span>
            <span className="sm:hidden">Accessories Portal</span>
          </div>
          <div className="flex items-center gap-4 ml-auto">
            <ThemeToggle />
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm font-medium bg-destructive/10 text-destructive px-3 py-1.5 rounded-md hover:bg-destructive hover:text-destructive-foreground transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 container mx-auto px-4 py-8">
        {children || <Outlet />}
      </main>
    </div>
  );
}