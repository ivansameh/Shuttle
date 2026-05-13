import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import NotificationManager from './components/NotificationManager';
import { useAuthStore } from './store/authStore';
import ProtectedRoute from './components/ProtectedRoute';

// Layouts
import AppLayout from './components/AppLayout';
import DriverLayout from './components/DriverLayout';
import AvailableTrips from './pages/driver/AvailableTrips';

// Public pages
import Login from './pages/Login';
import Register from './pages/Register';
import Unauthorized from './pages/Unauthorized';

// Rider pages
import Home from './pages/Home';
import TripDetail from './pages/TripDetail';
import Checkout from './pages/Checkout';
import BookingConfirmation from './pages/BookingConfirmation';
import BookingHistory from './pages/BookingHistory';
import LiveTracking from './pages/LiveTracking';
import Settings from './pages/Settings';
import Chat from './pages/Chat';

// Driver pages
import DriverSchedule from './pages/driver/DriverSchedule';
import DriverManifest from './pages/driver/DriverManifest';
import DriverTracking from './pages/driver/DriverTracking';
import VehicleRegistration from './pages/driver/VehicleRegistration';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

/** Redirects already-logged-in users away from the auth pages */
function RedirectIfAuthed({ children }: { children: JSX.Element }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return children;

  // Send them to their role-specific home
  switch (user?.role) {
    case 'DRIVER': return <Navigate to="/driver/schedule" replace />;
    case 'ADMIN':  return <Navigate to="/admin" replace />;
    default:       return <Navigate to="/rider/home" replace />;
  }
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster position="top-center" />
      <NotificationManager />
      <BrowserRouter>
        <Routes>
          {/* ── Public Routes ──────────────────────────────── */}
          <Route path="/login"        element={<RedirectIfAuthed><Login /></RedirectIfAuthed>} />
          <Route path="/register"     element={<RedirectIfAuthed><Register /></RedirectIfAuthed>} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* ── Rider Routes (Protected: RIDER only) ──────── */}
          <Route
            path="/rider"
            element={
              <ProtectedRoute allowedRoles={['RIDER']}>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="home"                  element={<Home />} />
            <Route path="trips/:tripId"         element={<TripDetail />} />
            <Route path="checkout/:tripId"      element={<Checkout />} />
            <Route path="booking/:bookingId"    element={<BookingConfirmation />} />
            <Route path="bookings"              element={<BookingHistory />} />
            <Route path="tracking/:tripId"      element={<LiveTracking />} />
            <Route path="settings"              element={<Settings />} />
            <Route path="chat/:bookingId"       element={<Chat />} />
            {/* Default /rider → /rider/home */}
            <Route index element={<Navigate to="home" replace />} />
          </Route>

          {/* ── Driver Routes (Protected: DRIVER only) ────── */}
          <Route path="/driver" element={<ProtectedRoute allowedRoles={['DRIVER']}><DriverLayout /></ProtectedRoute>}>
            <Route path="schedule" element={<DriverSchedule />} />
            <Route path="manifest/:tripId" element={<DriverManifest />} />
            <Route path="manifest" element={<DriverManifest />} />
            <Route path="tracking" element={<DriverTracking />} />
            <Route path="register-vehicle" element={<VehicleRegistration />} />
            <Route path="browse" element={<AvailableTrips />} />
            {/* Default /driver → /driver/schedule */}
            <Route index element={<Navigate to="schedule" replace />} />
          </Route>

          {/* ── Root redirect based on auth state ─────────── */}
          <Route path="/" element={<RootRedirect />} />

          {/* ── Catch-all ─────────────────────────────────── */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

/** Sends unauthenticated users to /login, authenticated users to their dashboard */
function RootRedirect() {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  switch (user?.role) {
    case 'DRIVER': return <Navigate to="/driver/schedule" replace />;
    case 'ADMIN':  return <Navigate to="/admin" replace />;
    default:       return <Navigate to="/rider/home" replace />;
  }
}
