import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { ReactNode, useState } from 'react';
import { useLocation } from 'react-router-dom';

export function AdminLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const isLoginPage = location.pathname === '/admin/login';
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (isLoginPage) {
    return <div className="min-h-screen bg-vimeo-lightGray flex items-center justify-center p-4">{children}</div>;
  }

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 bg-white overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
