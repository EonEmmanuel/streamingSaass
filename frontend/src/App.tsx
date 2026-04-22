import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Dashboard } from './pages/admin/DashboardPage';
import { LiveMonitorPage } from './pages/admin/LiveMonitorPage';
import { LoginPage } from './pages/admin/LoginPage';
import { StreamsPage } from './pages/admin/StreamsPage';
import { TestPage } from './pages/test/TestPage';
import { WatchPage } from './pages/watch/WatchPage';
import { AdminLayout } from './components/AdminLayout';

export default function App() {
  const location = useLocation();
  const isPublicPage = location.pathname.startsWith('/watch/');

  const content = (
    <Routes>
      <Route path="/admin/login" element={<LoginPage />} />
      <Route path="/admin/dashboard" element={<Dashboard />} />
      <Route path="/admin/streams" element={<StreamsPage />} />
      <Route path="/admin/live-monitor" element={<LiveMonitorPage />} />
      <Route path="/test" element={<TestPage />} />
      <Route path="/watch/:streamKey" element={<WatchPage />} />
      <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
    </Routes>
  );

  if (isPublicPage) {
    return content;
  }

  return <AdminLayout>{content}</AdminLayout>;
}
