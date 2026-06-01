import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { AccessRequestsPage } from './pages/AccessRequestsPage';
import { UsersPage } from './pages/UsersPage';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/access-requests" element={<AccessRequestsPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/" element={<Navigate to="/access-requests" replace />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/access-requests" replace />} />
    </Routes>
  );
}
