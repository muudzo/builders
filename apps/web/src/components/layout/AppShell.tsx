import { NavLink, Outlet } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../../features/auth/AuthContext';
import './app-shell.css';

interface NavItem {
  to: string;
  label: string;
}

const NAV_BY_ROLE: Record<string, NavItem[]> = {
  APPLICANT: [{ to: '/permits', label: 'My permits' }],
  INSPECTOR: [{ to: '/inspect', label: 'Job queue' }],
  COUNCIL: [
    { to: '/dashboard', label: 'Overview' },
    { to: '/dashboard/reconciliation', label: 'Reconciliation' },
    { to: '/dashboard/registry', label: 'Builder registry' },
    { to: '/dashboard/audit', label: 'Audit trail' },
  ],
  MINISTRY: [
    { to: '/dashboard', label: 'Overview' },
    { to: '/dashboard/reconciliation', label: 'Reconciliation' },
    { to: '/dashboard/registry', label: 'Builder registry' },
    { to: '/dashboard/audit', label: 'Audit trail' },
  ],
};

const ROLE_LABEL: Record<string, string> = {
  APPLICANT: 'Builder / Applicant',
  INSPECTOR: 'Inspector',
  COUNCIL: 'Council',
  MINISTRY: 'Ministry (read-only)',
};

export function AppShell({ children }: { children?: ReactNode }) {
  const { user, logout } = useAuth();
  const navItems = user ? NAV_BY_ROLE[user.role] ?? [] : [];

  return (
    <div className="vk-app-shell">
      <a href="#vk-main-content" className="vk-skip-link">
        Skip to main content
      </a>
      <header className="vk-header">
        <div className="vk-container vk-header__inner">
          <NavLink to="/" className="vk-header__brand" aria-label="Vaka home">
            <span className="vk-header__brand-mark">V</span>
            <span className="vk-header__brand-name">Vaka</span>
          </NavLink>
          {user && (
            <nav className="vk-header__nav" aria-label="Main navigation">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/dashboard'}
                  className={({ isActive }) => `vk-header__nav-link${isActive ? ' is-active' : ''}`}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          )}
          {user && (
            <div className="vk-header__persona">
              <span className="vk-header__persona-role">{ROLE_LABEL[user.role] ?? user.role}</span>
              <span className="vk-header__persona-name">{user.name}</span>
              <button type="button" className="vk-header__logout" onClick={() => void logout()}>
                Log out
              </button>
            </div>
          )}
        </div>
      </header>
      <main className="vk-main" id="vk-main-content">
        {children ?? <Outlet />}
      </main>
      <footer className="vk-footer">
        <div className="vk-container vk-footer__inner">
          <span>Vaka — digital building inspection &amp; permits</span>
          <span>Every fee is a traceable digital record.</span>
        </div>
      </footer>
    </div>
  );
}
