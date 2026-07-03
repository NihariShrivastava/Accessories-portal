// src/App.tsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './components/theme-provider';
import { AuthProvider, useAuth } from './components/auth-provider';
import { Layout } from './components/layout';
import { Login } from './pages/Login';
import { CounterDashboard } from './pages/CounterDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { TeamLeadDashboard } from './pages/TeamLeadDashboard';
import { CashierDashboard } from './pages/CashierDashboard';
import { WarehouseDashboard } from './pages/WarehouseDashboard';
import { Toaster } from 'sonner';

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    if (user.role === 'team_lead') return <Navigate to="/teamlead" replace />;
    if (user.role === 'cashier') return <Navigate to="/cashier" replace />;
    if (user.role === 'warehouse') return <Navigate to="/warehouse" replace />;
    return <Navigate to="/counter" replace />;
  }

  return <>{children}</>;
};

function RedirectToDashboard() {
  const { user } = useAuth();
  if (user?.role === 'admin') return <Navigate to="/admin" replace />;
  if (user?.role === 'team_lead') return <Navigate to="/teamlead" replace />;
  if (user?.role === 'cashier') return <Navigate to="/cashier" replace />;
  if (user?.role === 'warehouse') return <Navigate to="/warehouse" replace />;
  return <Navigate to="/counter" replace />;
}

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <Toaster richColors position="top-right" />
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route path="/" element={<Layout />}>
              <Route index element={<ProtectedRoute><RedirectToDashboard /></ProtectedRoute>} />
              <Route path="counter" element={<ProtectedRoute allowedRoles={['counter']}><CounterDashboard /></ProtectedRoute>} />
              <Route path="admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
              <Route path="teamlead" element={<ProtectedRoute allowedRoles={['team_lead']}><TeamLeadDashboard /></ProtectedRoute>} />
              <Route path="cashier" element={<ProtectedRoute allowedRoles={['cashier']}><CashierDashboard /></ProtectedRoute>} />
              <Route path="warehouse" element={<ProtectedRoute allowedRoles={['warehouse']}><WarehouseDashboard /></ProtectedRoute>} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;