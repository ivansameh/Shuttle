import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import NotificationManager from './components/NotificationManager';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './store/auth';
import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Lines from './pages/Lines';
import Fleet from './pages/Fleet';
import Scheduler from './pages/Scheduler';
import Dispatch from './pages/Dispatch';
import Users from './pages/Users';
import ChatMonitor from './pages/ChatMonitor';
import Broadcast from './pages/Broadcast';
import DriverProfile from './pages/DriverProfile';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Guard component for protected routes
function RequireAuth({ children }: { children: JSX.Element }) {
  const { isAuthenticated, user } = useAuthStore();
  
  if (!isAuthenticated || user?.role !== 'ADMIN') {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster position="top-center" />
      <NotificationManager />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route 
            path="/" 
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="lines" element={<Lines />} />
            <Route path="fleet" element={<Fleet />} />
            <Route path="fleet/:id" element={<DriverProfile />} />
            <Route path="scheduler" element={<Scheduler />} />
            <Route path="dispatch" element={<Dispatch />} />
            <Route path="users" element={<Users />} />
            <Route path="broadcast" element={<Broadcast />} />
            <Route path="chat/:bookingId" element={<ChatMonitor />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
