import { useState } from 'react';
import { 
  LayoutGrid, 
  ShoppingCart, 
  Package, 
  Box, 
  Truck, 
  Banknote, 
  Wallet, 
  BarChart3, 
  Users, 
  Settings, 
  Store, 
  ChevronDown, 
  ChevronsLeft, 
  ChevronsRight,
  X,
  Check,
  Building2,
  Footprints,
  LogOut
} from 'lucide-react';
import { UserSession, Warehouse } from '../../types.ts';

export interface NavItem {
  id: string;
  label: string;
  icon: any;
  path?: string;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export const defaultNavGroups: NavGroup[] = [
  {
    title: 'OVERVIEW',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid, path: '/dashboard' },
      { id: 'pos', label: 'Point of Sale', icon: ShoppingCart, path: '/pos' },
    ]
  },
  {
    title: 'INVENTORY',
    items: [
      { id: 'products', label: 'Products', icon: Package, path: '/inventory/products' },
      { id: 'movements', label: 'Inventory', icon: Box, path: '/inventory/stock' },
      { id: 'orders', label: 'Purchases', icon: Truck, path: '/inventory/purchases' },
    ]
  },
  {
    title: 'FINANCE',
    items: [
      { id: 'sales', label: 'Sales', icon: Banknote, path: '/finance/sales' },
      { id: 'cash', label: 'Cash Management', icon: Wallet, path: '/finance/cash' },
      { id: 'reports', label: 'Reports', icon: BarChart3, path: '/finance/reports' },
    ]
  },
  {
    title: 'MANAGE',
    items: [
      { id: 'people', label: 'People', icon: Users, path: '/manage/people' },
      { id: 'settings', label: 'Settings', icon: Settings, path: '/manage/settings' },
    ]
  }
];

export const BRANCHES = [
  { id: 'b1', name: 'Main Branch', location: 'Addis Ababa - Central' },
  { id: 'b2', name: 'Bole Branch #1', location: 'Bole Medhanialem' },
  { id: 'b3', name: 'Kazanchis Outlet', location: 'Kazanchis Business Dist.' },
  { id: 'b4', name: 'Piassa Store', location: 'Piassa Commercial' },
  { id: 'b5', name: 'Hawassa Hub', location: 'Hawassa Center' }
];

interface SidebarProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  selectedBranch: string;
  onSelectBranch: (branchName: string, warehouseId?: string) => void;
  session?: UserSession | null;
  onLogout?: () => void;
  warehouses?: Warehouse[];
}

export default function Sidebar({
  activeTab,
  onTabChange,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  selectedBranch,
  onSelectBranch,
  session,
  onLogout,
  warehouses = []
}: SidebarProps) {
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);

  const realBranches = warehouses.length > 0
    ? warehouses.map(w => ({
        id: w.id,
        name: w.name,
        location: w.location || (w as any).address || w.code || 'Branch Store'
      }))
    : BRANCHES;

  const activeBranches = realBranches.length > 1
    ? [{ id: 'all', name: 'All Branches', location: 'All store locations' }, ...realBranches]
    : realBranches;

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs md:hidden transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* SIDEBAR PANEL */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 bg-white dark:bg-[#0b0c12] text-slate-800 dark:text-slate-300 flex flex-col justify-between border-r border-slate-200 dark:border-[#161926] transition-all duration-300 md:static ${
          isCollapsed ? 'md:w-20' : 'md:w-64'
        } ${
          isMobileOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'
        } shrink-0 shadow-xl md:shadow-none font-sans`}
      >
        <div className="flex flex-col h-full justify-between overflow-hidden">
          
          {/* HEADER / LOGO */}
          <div>
            <div className="p-4 border-b border-slate-200 dark:border-[#161926] flex items-center justify-between">
              <div className="flex items-center space-x-3 overflow-hidden">
                <div className="w-9 h-9 rounded-xl bg-indigo-600/10 dark:bg-indigo-600/20 border border-indigo-500/20 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold shrink-0">
                  <Footprints className="w-5 h-5" />
                </div>
                {(!isCollapsed || isMobileOpen) && (
                  <div className="truncate">
                    <h1 className="font-extrabold text-sm text-slate-900 dark:text-white tracking-tight leading-none flex items-center gap-1.5">
                      SoleFlow
                    </h1>
                    <p className="text-[11px] text-slate-500 font-medium mt-1">
                      Shoe Inventory
                    </p>
                  </div>
                )}
              </div>

              {/* Close Mobile Button */}
              <button 
                onClick={onCloseMobile}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white md:hidden rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Close Sidebar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* NAV GROUPS */}
            <nav className="p-3 space-y-4 overflow-y-auto max-h-[calc(100vh-160px)] custom-scrollbar">
              {defaultNavGroups.map((group, idx) => (
                <div key={group.title} className="space-y-1">
                  {(!isCollapsed || isMobileOpen) ? (
                    <p className={`px-3 text-[10px] font-extrabold text-slate-400 dark:text-[#56627a] tracking-widest uppercase ${
                      idx === 0 ? 'mb-2' : 'mt-4 mb-2'
                    }`}>
                      {group.title}
                    </p>
                  ) : (
                    <div className="h-2" />
                  )}

                  {group.items.map((tab) => {
                    const Icon = tab.icon;
                    const isSelected = activeTab === tab.id;

                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          onTabChange(tab.id);
                          if (isMobileOpen) onCloseMobile();
                        }}
                        title={isCollapsed && !isMobileOpen ? tab.label : undefined}
                        className={`w-full flex items-center ${
                          isCollapsed && !isMobileOpen ? 'justify-center px-2 py-2.5' : 'space-x-3 px-3.5 py-2.5'
                        } rounded-xl text-xs font-semibold transition-all text-left cursor-pointer ${
                          isSelected 
                            ? 'bg-indigo-50 dark:bg-[#12152d] text-indigo-600 dark:text-[#7d8eff] border border-indigo-200 dark:border-[#2b3368] shadow-xs' 
                            : 'text-slate-600 dark:text-[#94a3b8] hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#121422] border border-transparent'
                        }`}
                      >
                        <Icon className={`w-4 h-4 shrink-0 ${
                          isSelected 
                            ? 'text-indigo-600 dark:text-[#7d8eff]' 
                            : 'text-slate-400 dark:text-[#64748b]'
                        }`} />
                        {(!isCollapsed || isMobileOpen) && (
                          <span className="truncate">{tab.label}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </nav>
          </div>

          {/* BOTTOM PROFILE & BRANCH SELECTOR */}
          <div className="p-3 border-t border-slate-200 dark:border-[#141628] bg-slate-50/50 dark:bg-[#0b0c12] space-y-2 relative">
            
            {/* Branch Switcher Dropdown */}
            {(!isCollapsed || isMobileOpen) && (
              <div className="relative">
                <button 
                  onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
                  className="w-full px-3 py-2 flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-[#131525] rounded-xl transition-colors border border-slate-200 dark:border-[#1e2233] bg-white dark:bg-[#12141e] cursor-pointer"
                >
                  <div className="flex items-center space-x-2.5 truncate">
                    <Store className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span className="font-bold text-xs truncate">{selectedBranch}</span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </button>

                {/* Dropdown Menu */}
                {isBranchDropdownOpen && (
                  <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#262b3f] rounded-xl shadow-xl z-50 py-1.5 overflow-hidden animate-fade-in">
                    <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-[#1e2233]">
                      Switch Store Branch
                    </div>
                    {activeBranches.map(b => (
                      <button
                        key={b.id}
                        onClick={() => {
                          onSelectBranch(b.name, b.id === 'all' ? undefined : b.id);
                          setIsBranchDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-100 dark:hover:bg-[#181b28] cursor-pointer ${
                          selectedBranch === b.name ? 'text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50/50 dark:bg-indigo-950/20' : 'text-slate-700 dark:text-slate-300 font-medium'
                        }`}
                      >
                        <div>
                          <p className="leading-tight">{b.name}</p>
                          <p className="text-[10px] text-slate-400 font-normal">{b.location}</p>
                        </div>
                        {selectedBranch === b.name && <Check className="w-3.5 h-3.5 text-indigo-500" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* User Profile Footer */}
            <div className="px-2 pt-1 flex items-center justify-between text-xs">
              {(!isCollapsed || isMobileOpen) ? (
                <div className="truncate pr-2">
                  <p className="font-bold text-xs text-slate-900 dark:text-white leading-tight truncate">
                    {session?.user?.name || 'Administrator'}
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                    {session?.user?.phone || '+251 91 123 4567'}
                  </p>
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center mx-auto">
                  {(session?.user?.name || 'Admin').substring(0, 2).toUpperCase()}
                </div>
              )}

              {/* Collapse Toggle Button */}
              <button 
                onClick={onToggleCollapse}
                className="hidden md:flex p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              >
                {isCollapsed ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
              </button>
            </div>

            {/* Logout Option - Available on Desktop (expanded & collapsed) and Mobile */}
            {(!isCollapsed || isMobileOpen) ? (
              onLogout && (
                <button
                  onClick={onLogout}
                  className="w-full mt-2 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-transparent hover:border-rose-200 dark:hover:border-rose-900/40 rounded-xl flex items-center justify-between transition-colors cursor-pointer group"
                  title="Sign out of your session"
                >
                  <div className="flex items-center space-x-2">
                    <LogOut className="w-4 h-4 text-rose-500 transition-transform group-hover:-translate-x-0.5" />
                    <span>Log Out</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-normal">End shift</span>
                </button>
              )
            ) : (
              onLogout && (
                <div className="pt-2 flex justify-center border-t border-slate-200 dark:border-[#161926]">
                  <button
                    onClick={onLogout}
                    className="p-2 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-all cursor-pointer"
                    title="Log Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              )
            )}

          </div>

        </div>
      </aside>
    </>
  );
}
