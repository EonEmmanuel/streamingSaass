import { Search, Bell, LogOut, Menu } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface NavbarProps {
  onMenuClick: () => void;
}

export function Navbar({ onMenuClick }: NavbarProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/admin/login');
  };

  return (
    <header className="h-16 border-b border-vimeo-border bg-white sticky top-0 z-30 px-4 md:px-8 flex items-center justify-between gap-4">
      {/* Hamburger - mobile only */}
      <button
        className="md:hidden p-2 rounded-lg hover:bg-vimeo-lightGray transition-colors flex-shrink-0"
        onClick={onMenuClick}
        aria-label="Open menu"
      >
        <Menu size={22} />
      </button>

      <div className="flex-1 max-w-xl">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40 group-focus-within:text-black transition-colors" size={18} />
          <input
            type="text"
            placeholder="Search streams..."
            className="w-full pl-10 pr-4 py-2 bg-vimeo-lightGray rounded-full text-sm border-transparent focus:bg-white focus:border-vimeo-blue outline-none transition-all text-black"
          />
        </div>
      </div>

      <div className="flex items-center gap-4 flex-shrink-0">
        <Bell size={22} className="cursor-pointer text-black/40 hover:text-black transition-colors hidden sm:block" />

        <div className="relative">
          <div
            className="w-8 h-8 rounded-full bg-vimeo-lightGray overflow-hidden border border-vimeo-border cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            <img src="https://ui-avatars.com/api/?name=Admin&background=random" alt="User" />
          </div>

          {showUserMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
              <div className="absolute right-0 mt-2 w-48 bg-white border border-vimeo-border rounded-xl shadow-vimeo z-50 py-2">
                <div className="px-4 py-2 border-b border-vimeo-border mb-1">
                  <p className="text-sm font-bold text-black">Admin Account</p>
                  <p className="text-[10px] text-black/60">admin@example.com</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-vimeo-lightGray transition-colors"
                >
                  <LogOut size={16} />
                  Log out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
