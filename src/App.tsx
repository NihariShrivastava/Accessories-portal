import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './components/theme-provider';
import { AuthProvider, useAuth } from './components/auth-provider';
import { Layout } from './components/layout';
import { Login } from './pages/Login';
import { CounterDashboard } from './pages/CounterDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { Toaster } from 'sonner';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) => {
  const { user, profile, loading } = useAuth();

  // Still loading — show nothing (the Layout shell already shows the navbar)
  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  // Not logged in — go to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Role check required
  if (allowedRoles) {
    // Profile not loaded yet but user exists — might be a slow fetch, just show spinner briefly
    if (!profile) {
      return <Navigate to="/login" replace />;
    }

    if (!allowedRoles.includes(profile.role)) {
      return <Navigate to={profile.role === 'admin' ? '/admin' : '/counter'} replace />;
    }
  }

  return <>{children}</>;
};

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <Toaster richColors position="top-right" />
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route path="/" element={<Layout />}>
              <Route index element={
                <ProtectedRoute>
                  <RedirectToDashboard />
                </ProtectedRoute>
              } />
              
              <Route path="counter" element={
                <ProtectedRoute allowedRoles={['counter']}>
                  <CounterDashboard />
                </ProtectedRoute>
              } />
              
              <Route path="admin" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              } />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

// Separate component to redirect based on role
function RedirectToDashboard() {
  const { profile } = useAuth();
  if (profile?.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }
  return <Navigate to="/counter" replace />;
}

export default App;
