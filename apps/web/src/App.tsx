import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { LoginPage } from './features/auth/LoginPage';
import { RoleRedirect } from './features/auth/RoleRedirect';
import { PermitsListPage } from './features/applicant/PermitsListPage';
import { PermitDetailPage } from './features/applicant/PermitDetailPage';
import { NewPermitPage } from './features/applicant/NewPermitPage';
import { InspectorQueuePage } from './features/inspector/InspectorQueuePage';
import { InspectorSignOffPage } from './features/inspector/InspectorSignOffPage';
import { DashboardOverviewPage } from './features/dashboard/DashboardOverviewPage';
import { ReconciliationPage } from './features/dashboard/ReconciliationPage';
import { RegistryPage } from './features/dashboard/RegistryPage';
import { AuditTrailPage } from './features/dashboard/AuditTrailPage';
import { CertificateVerifyPage } from './features/public/CertificateVerifyPage';
import { NotFoundPage } from './features/public/NotFoundPage';

const COUNCIL_ROLES = ['COUNCIL', 'MINISTRY'] as const;

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/verify/:qrToken" element={<CertificateVerifyPage />} />

        <Route element={<AppShell />}>
          <Route path="/" element={<RoleRedirect />} />

          <Route
            path="/permits"
            element={
              <ProtectedRoute allowedRoles={['APPLICANT']}>
                <PermitsListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/permits/new"
            element={
              <ProtectedRoute allowedRoles={['APPLICANT']}>
                <NewPermitPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/permits/:ref"
            element={
              <ProtectedRoute allowedRoles={['APPLICANT']}>
                <PermitDetailPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/inspect"
            element={
              <ProtectedRoute allowedRoles={['INSPECTOR']}>
                <InspectorQueuePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/inspect/:stageId"
            element={
              <ProtectedRoute allowedRoles={['INSPECTOR']}>
                <InspectorSignOffPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={[...COUNCIL_ROLES]}>
                <DashboardOverviewPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/reconciliation"
            element={
              <ProtectedRoute allowedRoles={[...COUNCIL_ROLES]}>
                <ReconciliationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/registry"
            element={
              <ProtectedRoute allowedRoles={[...COUNCIL_ROLES]}>
                <RegistryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/audit"
            element={
              <ProtectedRoute allowedRoles={[...COUNCIL_ROLES]}>
                <AuditTrailPage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
