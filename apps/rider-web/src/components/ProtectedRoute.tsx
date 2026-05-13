import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore, UserRole } from '../store/authStore';

interface ProtectedRouteProps {
  children: JSX.Element;
  allowedRoles: UserRole[];
}

/**
 * RBAC Route Guard.
 *
 * 1. Not authenticated → redirect to /login (preserving the attempted URL).
 * 2. Authenticated but role not in allowedRoles → redirect to /unauthorized.
 * 3. All checks pass → render children.
 */
export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    // Preserve the page they tried to visit so we can redirect after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}
