import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Spinner } from '../../components/ui/Spinner';
import type { Role } from '../../lib/domain';

const HOME_BY_ROLE: Record<Role, string> = {
  APPLICANT: '/permits',
  INSPECTOR: '/inspect',
  COUNCIL: '/dashboard',
  MINISTRY: '/dashboard',
};

/** `/` — sends each persona straight to the surface that matters to them. */
export function RoleRedirect() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="vk-container" style={{ paddingTop: '4rem' }}>
        <Spinner label="Loading your account" size="lg" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={HOME_BY_ROLE[user.role]} replace />;
}
