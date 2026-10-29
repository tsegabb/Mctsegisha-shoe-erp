import { useState, ReactNode } from 'react';
import Sidebar from './Sidebar.tsx';
import Topbar from './Topbar.tsx';
import { UserSession, Warehouse } from '../../types.ts';

interface AppShellProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  theme: 'light' | 'dark' | 'system';
  onToggleTheme: () => void;
  selectedBranch: string;
  onSelectBranch: (branchName: string, warehouseId?: string) => void;
  session?: UserSession | null;
  onLogout?: () => void;
  warehouses?: Warehouse[];
  children: ReactNode;
}

export default function AppShell({
  activeTab,
  onTabChange,
  theme,
  onToggleTheme,
  selectedBranch,
  onSelectBranch,
  session,
  onLogout,
  warehouses = [],
  children
}: AppShellProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Page Header Descriptions
  const getPageInfo = (tab: string) => {
    switch (tab) {
      case 'dashboard':
        return {
          title: 'Dashboard Overview',
          description: 'Real-time sales velocity, inventory status, and core metrics across branches.'
        };
      case 'pos':
        return {
          title: 'Point of Sale (POS)',
          description: 'Fast checkout billing, barcode scanning, size selection, and instant receipt issuing.'
        };
      case 'products':
        return {
          title: 'Shoe Product Catalog',
          description: 'Manage shoes, color variants, size grids (EU/US), brands, and unit prices.'
        };
      case 'movements':
        return {
          title: 'Inventory & Stock Movements',
          description: 'Track stock counts, batch receipts, branch transfers, and adjustments.'
        };
      case 'orders':
        return {
          title: 'Purchases & Restock Orders',
          description: 'Create supplier purchase orders, track incoming inventory shipments, and status.'
        };
      case 'sales':
        return {
          title: 'Sales Transactions',
          description: 'Historical register log, payment breakdowns (Cash/Telebirr/CBE/Card), and refunds.'
        };
      case 'cash':
        return {
          title: 'Cash & Branch Drawer Management',
          description: 'Monitor daily register floats, opening/closing balances, cash drops, and branch totals.'
        };
      case 'reports':
        return {
          title: 'Reports & Analytics',
          description: 'Revenue, gross profit calculations, stock velocity, and downloadable CSV exports.'
        };
      case 'people':
        return {
          title: 'People & Staff Management',
          description: 'Manage store managers, cashiers, role permissions, and branch assignments.'
        };
      case 'settings':
        return {
          title: 'System Settings',
          description: 'Configure store parameters, branch locations, tax/VAT preferences, and database integrations.'
        };
      default:
        return {
          title: 'Overview',
          description: 'Multi-branch shoe inventory and sales management workspace.'
        };
    }
  };

  const pageInfo = getPageInfo(activeTab);

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#0b0c10] text-slate-900 dark:text-slate-100 overflow-hidden font-sans transition-colors duration-200 relative select-none">
      
      {/* PERSISTENT SIDEBAR */}
      <Sidebar 
        activeTab={activeTab}
        onTabChange={onTabChange}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
        selectedBranch={selectedBranch}
        onSelectBranch={onSelectBranch}
        session={session}
        onLogout={onLogout}
        warehouses={warehouses}
      />

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-slate-50 dark:bg-[#0b0c10] transition-colors duration-200">
        
        {/* STICKY TOPBAR */}
        <Topbar 
          activeTab={activeTab}
          onOpenMobile={() => setIsMobileOpen(true)}
          theme={theme}
          onToggleTheme={onToggleTheme}
          session={session}
          selectedBranch={selectedBranch}
          onLogout={onLogout}
        />

        {/* MAIN PAGE BODY */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          
          {/* PAGE TITLE HEADING & ONE-LINE DESCRIPTION */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 dark:border-[#161926] pb-4">
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {pageInfo.title}
              </h1>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
                {pageInfo.description}
              </p>
            </div>
            
            <div className="flex items-center space-x-2 text-xs">
              <span className="px-2.5 py-1 bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] text-slate-600 dark:text-slate-300 font-semibold rounded-lg shadow-2xs">
                Active Branch: <strong className="text-indigo-600 dark:text-indigo-400 font-bold">{selectedBranch}</strong>
              </span>
            </div>
          </div>

          {/* VIEW CONTENT */}
          <div className="animate-fade-in">
            {children}
          </div>

        </main>
      </div>

    </div>
  );
}
