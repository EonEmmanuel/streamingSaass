import { PlaySquare, Library, Radio, TestTube, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';

const navItems = [
  { icon: PlaySquare, label: 'Dashboard', href: '/admin/dashboard' },
  { icon: Library, label: 'Stream Keys', href: '/admin/streams' },
  { icon: Radio, label: 'Live Monitor', href: '/admin/live-monitor' },
  { icon: TestTube, label: 'Live Test', href: '/test' },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const location = useLocation();

  return (
    <>
      {/* Mobile overlay backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 border-r border-vimeo-border bg-white flex flex-col p-4 gap-6 transition-transform duration-300',
          'md:static md:translate-x-0 md:z-auto',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between px-2 mb-2">
          <span className="text-2xl font-bold italic text-black">StreamPanel</span>
          <button
            className="md:hidden p-1 rounded-lg hover:bg-vimeo-lightGray transition-colors"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <Link
              key={item.label}
              to={item.href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-[14px] font-medium transition-colors',
                location.pathname === item.href
                  ? 'bg-vimeo-lightGray text-black'
                  : 'text-black/60 hover:bg-vimeo-lightGray hover:text-black'
              )}
            >
              <item.icon size={20} />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-4">
          <div className="bg-vimeo-lightGray rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-black">System Status</span>
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <p className="text-[10px] text-black/50 font-medium">All systems operational</p>
          </div>
        </div>
      </aside>
    </>
  );
}
