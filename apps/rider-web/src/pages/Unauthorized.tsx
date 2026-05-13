import { Bus, ShieldX } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

/**
 * Shown when a user tries to access a route they don't have permission for.
 * Provides a link back to their own role-specific dashboard.
 */
export default function Unauthorized() {
  const { user, isAuthenticated } = useAuthStore();

  // Decide where to send them based on their role
  const homeLink = !isAuthenticated
    ? '/login'
    : user?.role === 'DRIVER'
      ? '/driver/schedule'
      : user?.role === 'ADMIN'
        ? '/admin'
        : '/rider/home';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center animate-slide-up max-w-sm">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-error/10 border-2 border-error/20 rounded-3xl mb-6">
          <ShieldX className="w-10 h-10 text-error" />
        </div>

        <h1 className="text-3xl font-black text-foreground mb-3">Access Denied</h1>
        <p className="text-muted mb-8 text-sm leading-relaxed">
          You don't have permission to view this page.
          {user && (
            <span className="block mt-2 text-foreground/60">
              Signed in as <span className="text-primary-400 font-semibold">{user.role}</span>
            </span>
          )}
        </p>

        <Link
          to={homeLink}
          className="btn-primary inline-flex shadow-lg shadow-primary-500/25"
        >
          <Bus className="w-5 h-5" />
          Go to My Dashboard
        </Link>
      </div>
    </div>
  );
}
