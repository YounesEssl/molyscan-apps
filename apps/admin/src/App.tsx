import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { AccessRequestsPage } from './pages/AccessRequestsPage';
import { UsersPage } from './pages/UsersPage';
import { PriceRequestsPage } from './pages/PriceRequestsPage';
import { EquivalencesPage } from './pages/EquivalencesPage';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/access-requests" element={<AccessRequestsPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/price-requests" element={<PriceRequestsPage />} />
          <Route path="/equivalences" element={<EquivalencesPage />} />
          <Route path="/" element={<Navigate to="/access-requests" replace />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/access-requests" replace />} />
    </Routes>
  );
}
