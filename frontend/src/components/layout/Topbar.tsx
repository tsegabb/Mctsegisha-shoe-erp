import { useState, useRef, useEffect } from 'react';
import { 
  Menu, 
  Search, 
  Globe, 
  Sun, 
  Moon, 
  Bell, 
  User, 
  Check, 
  Store,
  LogOut,
  ShieldCheck,
  ChevronDown
} from 'lucide-react';
import { UserSession } from '../../types.ts';

interface TopbarProps {
  activeTab: string;
  onOpenMobile: () => void;
  theme: 'light' | 'dark' | 'system';
  onToggleTheme: () => void;
  session?: UserSession | null;
  selectedBranch?: string;
  onLogout?: () => void;
}

export default function Topbar({
  activeTab,
  onOpenMobile,
  theme,
  onToggleTheme,
  session,
  selectedBranch = 'Main Branch',
  onLogout
}: TopbarProps) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserMenuOpen]);

  // Breadcrumb route map
  const getBreadcrumb = (tab: string) => {
    switch (tab) {
      case 'dashboard':
        return { group: 'Overview', title: 'Dashboard' };
      case 'pos':
        return { group: 'Overview', title: 'Point of Sale' };
      case 'products':
        return { group: 'Inventory', title: 'Products' };
      case 'movements':
        return { group: 'Inventory', title: 'Inventory Movements' };
      case 'orders':
        return { group: 'Inventory', title: 'Purchases & Restock' };
      case 'sales':
        return { group: 'Finance', title: 'Sales History' };
      case 'cash':
        return { group: 'Finance', title: 'Cash Management' };
      case 'reports':
        return { group: 'Finance', title: 'Reports & Analytics' };
      case 'people':
        return { group: 'Manage', title: 'People & Staff' };
      case 'settings':
        return { group: 'Manage', title: 'Settings' };
      default:
        return { group: 'Overview', title: 'Dashboard' };
    }
  };

  const bc = getBreadcrumb(activeTab);
  const userInitials = session?.user?.name 
    ? session.user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : 'AD';

  const userRole = session?.user?.role || 'Admin';

  return (
    <header className="h-16 bg-white/90 dark:bg-[#0b0c10]/95 backdrop-blur-md border-b border-slate-200 dark:border-[#161926] px-4 md:px-6 flex justify-between items-center shrink-0 sticky top-0 z-30 font-sans transition-colors duration-200">
      
      {/* LEFT: MOBILE TOGGLE & BREADCRUMB */}
      <div className="flex items-center space-x-3">
        <button 
          onClick={onOpenMobile}
          className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-xl bg-slate-100 dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] md:hidden cursor-pointer"
          aria-label="Open Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2 text-xs">
          <span className="font-semibold text-slate-400 dark:text-slate-500 hidden sm:inline">
            {bc.group}
          </span>
          <span className="text-slate-300 dark:text-slate-600 hidden sm:inline">/</span>
          <h1 className="font-extrabold text-sm text-slate-900 dark:text-white tracking-tight">
            {bc.title}
          </h1>
        </div>
      </div>

      {/* RIGHT: SEARCH, TOOLS, THEME, NOTIFICATIONS, AVATAR */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        
        {/* SEARCH BOX */}
        <div className="relative hidden md:flex items-center">
          <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3" />
          <input 
            type="text" 
            placeholder="Search products, orders, sales..." 
            className="w-52 lg:w-64 pl-8 pr-10 py-1.5 bg-slate-100 dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/50 transition-all font-medium"
          />
          <kbd className="absolute right-2.5 px-1.5 py-0.5 text-[9px] font-mono font-bold text-slate-400 bg-white dark:bg-[#1a1e2e] border border-slate-200 dark:border-[#262b3f] rounded-md shadow-2xs">
            ⌘K
          </kbd>
        </div>

        {/* BRANCH BADGE */}
        <div className="hidden xl:flex items-center space-x-1.5 px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-semibold">
          <Store className="w-3.5 h-3.5 text-indigo-500" />
          <span>{selectedBranch}</span>
        </div>

        {/* LANGUAGE TOGGLE */}
        <button 
          className="p-2 border border-slate-200 dark:border-[#1e2233] bg-slate-100 dark:bg-[#12141e] hover:bg-slate-200 dark:hover:bg-[#181b28] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 rounded-xl transition-colors cursor-pointer"
          title="Language Preferences (EN/AM)"
        >
          <Globe className="w-4 h-4" />
        </button>

        {/* DARK MODE TOGGLE */}
        <button 
          onClick={onToggleTheme}
          className="p-2 border border-slate-200 dark:border-[#1e2233] bg-slate-100 dark:bg-[#12141e] hover:bg-slate-200 dark:hover:bg-[#181b28] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 rounded-xl transition-colors cursor-pointer"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
        </button>

        {/* NOTIFICATIONS BELL */}
        <button 
          className="relative p-2 border border-slate-200 dark:border-[#1e2233] bg-slate-100 dark:bg-[#12141e] hover:bg-slate-200 dark:hover:bg-[#181b28] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 rounded-xl transition-colors cursor-pointer"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-indigo-500 ring-2 ring-white dark:ring-[#0b0c10]" />
        </button>

        {/* USER PROFILE & LOGOUT DROPDOWN */}
        <div className="relative pl-1 border-l border-slate-200 dark:border-[#1e2233]" ref={menuRef}>
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center space-x-2 p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-[#161926] transition-colors cursor-pointer focus:outline-none"
            aria-label="User Account Menu"
            title="User Profile & Session"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white font-black text-xs flex items-center justify-center shadow-xs">
              {userInitials}
            </div>
            <div className="hidden lg:flex flex-col text-left">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">
                {session?.user?.name || 'Administrator'}
              </span>
              <span className="text-[10px] text-slate-500 font-medium capitalize">
                {userRole}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          </button>

          {/* USER MENU DROPDOWN */}
          {isUserMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#222738] rounded-2xl shadow-2xl z-50 py-2 animate-fade-in divide-y divide-slate-100 dark:divide-[#1e2233]">
              
              {/* Account summary header */}
              <div className="px-4 py-3">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white font-black text-sm flex items-center justify-center shadow-xs">
                    {userInitials}
                  </div>
                  <div className="truncate">
                    <p className="font-bold text-sm text-slate-900 dark:text-white truncate">
                      {session?.user?.name || 'Administrator'}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {session?.user?.email || session?.user?.phone || 'admin@store.com'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900/60 uppercase">
                    <ShieldCheck className="w-3 h-3 mr-1" />
                    {userRole}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    <Store className="w-2.5 h-2.5 mr-1" />
                    {selectedBranch}
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="p-1.5 space-y-1">
                {onLogout && (
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors cursor-pointer group"
                  >
                    <LogOut className="w-4 h-4 text-rose-500 transition-transform group-hover:-translate-x-0.5" />
                    <span>Log Out of Session</span>
                  </button>
                )}
              </div>

            </div>
          )}
        </div>

        {/* QUICK LOGOUT ICON BUTTON */}
        {onLogout && (
          <button
            onClick={onLogout}
            className="p-2 border border-slate-200 dark:border-[#1e2233] bg-slate-100 dark:bg-[#12141e] hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 rounded-xl transition-colors cursor-pointer"
            title="Log Out"
            aria-label="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}

      </div>

    </header>
  );
}

