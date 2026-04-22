import { PlaySquare, Library, Radio, Settings, TestTube } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';

const navItems = [
  { icon: PlaySquare, label: 'Dashboard', href: '/admin/dashboard' },
  { icon: Library, label: 'Stream Keys', href: '/admin/streams' },
  { icon: Radio, label: 'Live Monitor', href: '/admin/live-monitor' },
  { icon: TestTube, label: 'Live Test', href: '/test' },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="w-64 border-r border-vimeo-border bg-white h-screen sticky top-0 flex flex-col p-4 gap-6">
      <div className="flex items-center px-2 mb-2">
         <span className="text-2xl font-bold italic text-black">StreamPanel</span>
      </div>

      <nav className="flex flex-col gap-1">
        {navItems.map((item) => (
          <Link
            key={item.label}
            to={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-[14px] font-medium transition-colors",
              location.pathname === item.href 
                ? "bg-vimeo-lightGray text-black" 
                : "text-black/60 hover:bg-vimeo-lightGray hover:text-black"
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
  );
}
