/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutGrid, 
  Package, 
  Warehouse as WarehouseIcon, 
  Building2, 
  Sliders, 
  FileText, 
  Settings as SettingsIcon,
  RefreshCw,
  AlertCircle,
  ShoppingCart,
  FileSpreadsheet,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  Sparkles,
  CheckCircle2,
  Search,
  Bell,
  Globe,
  ChevronDown,
  ChevronsLeft,
  Boxes,
  Truck,
  DollarSign,
  Wallet,
  Users,
  Link as LinkIcon,
  Box,
  Banknote,
  BarChart3,
  Store
} from 'lucide-react';

import DashboardView from './components/DashboardView.tsx';
import ReportsView from './components/ReportsView.tsx';
import ProductsView from './components/ProductsView.tsx';
import MovementsView from './components/MovementsView.tsx';
import WarehousesView from './components/WarehousesView.tsx';
import SuppliersView from './components/SuppliersView.tsx';
import OrdersView from './components/OrdersView.tsx';
import SettingsView from './components/SettingsView.tsx';
import SalesView from './components/SalesView.tsx';
import LoginView from './components/LoginView.tsx';
import PeopleView from './components/PeopleView.tsx';
import CashManagementView from './components/CashManagementView.tsx';
import AppShell from './components/layout/AppShell.tsx';

import { productsService } from './services/products.service.ts';
import { inventoryService } from './services/inventory.service.ts';
import { salesService } from './services/sales.service.ts';
import { reportsService } from './services/reports.service.ts';
import { settingsService } from './services/settings.service.ts';

import { 
  Product, 
  Variant, 
  Brand, 
  Warehouse, 
  Supplier, 
  Movement, 
  PurchaseOrder, 
  DashboardStats,
  OrderStatus,
  Sale,
  UserSession
} from './types.ts';

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    const saved = localStorage.getItem('shoetracker_theme') as 'light' | 'dark' | 'system';
    if (saved === 'dark' || saved === 'light' || saved === 'system') {
      return saved;
    }
    return 'dark'; // Default to sleek dark mode
  });

  useEffect(() => {
    const applyTheme = () => {
      let isDark = theme === 'dark';
      if (theme === 'system') {
        isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      }

      if (isDark) {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
      }
    };

    applyTheme();
    localStorage.setItem('shoetracker_theme', theme);

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme();
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  const [session, setSession] = useState<UserSession | null>(() => {
    const saved = localStorage.getItem('shoetracker_session');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Dynamic SEO Page Titles & Meta Descriptions
  useEffect(() => {
    if (!session) {
      document.title = 'Sign In | SoleFlow Shoe ERP';
      return;
    }

    const tabTitles: Record<string, string> = {
      dashboard: 'Dashboard & Analytics | SoleFlow Shoe ERP',
      pos: 'Point of Sale (POS) | SoleFlow Shoe ERP',
      products: 'Inventory & Product Catalog | SoleFlow Shoe ERP',
      sales: 'Sales & Returns History | SoleFlow Shoe ERP',
      movements: 'Stock Movements & Transfers | SoleFlow Shoe ERP',
      orders: 'Purchase Orders & Suppliers | SoleFlow Shoe ERP',
      cash: 'Cash Management & Drawer Operations | SoleFlow Shoe ERP',
      reports: 'Reports & Analytics | SoleFlow Shoe ERP',
      warehouses: 'Warehouse & Branch Management | SoleFlow Shoe ERP',
      suppliers: 'Supplier Directory | SoleFlow Shoe ERP',
      people: 'Users & Roles Management | SoleFlow Shoe ERP',
      settings: 'System & DB Settings | SoleFlow Shoe ERP'
    };

    const newTitle = tabTitles[activeTab] || 'SoleFlow Shoe ERP - Multi-Branch Inventory & POS Platform';
    document.title = newTitle;

    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', `${newTitle} - Enterprise shoe inventory, Point of Sale, and multi-branch operations.`);
    }
  }, [activeTab, session]);
  const [selectedBranch, setSelectedBranch] = useState('Main Branch');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | undefined>(undefined);
  const [dbStatus, setDbStatus] = useState<{
    postgresConnected: boolean;
    dbError: string | null;
    mode: string;
    configDocUrl?: string;
  } | null>(null);

  // Core Datasets
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);

  // Loading States
  const [statsLoading, setStatsLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [movementsLoading, setMovementsLoading] = useState(true);
  const [warehousesLoading, setWarehousesLoading] = useState(true);
  const [suppliersLoading, setSuppliersLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [salesLoading, setSalesLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Global Toast State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const triggerToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ------------------------------------------
  // API FETCH & MUTATION FUNCTIONS
  // ------------------------------------------
  
  const fetchDbStatus = async () => {
    try {
      const data = await settingsService.getDbStatus();
      if (data.success) {
        setDbStatus({
          postgresConnected: data.postgresConnected,
          dbError: data.dbError,
          mode: data.mode,
          configDocUrl: data.configDocUrl
        });
      }
    } catch (err) {
      console.error('Failed to fetch status:', err);
    }
  };

  const fetchStats = async (wId?: string) => {
    const targetId = wId !== undefined ? wId : selectedWarehouseId;
    setStatsLoading(true);
    try {
      const data = await reportsService.getStats(targetId);
      if (data.success) {
        setStats(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchProducts = async () => {
    setProductsLoading(true);
    try {
      const data = await productsService.getProducts();
      if (data.success) {
        setProducts(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProductsLoading(false);
    }
  };

  const fetchBrands = async () => {
    try {
      const data = await productsService.getBrands();
      if (data.success) {
        setBrands(data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchVariants = async (wId?: string) => {
    const targetId = wId !== undefined ? wId : selectedWarehouseId;
    try {
      const data = await inventoryService.getVariants(targetId);
      if (data.success) {
        setVariants(data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchWarehouses = async () => {
    setWarehousesLoading(true);
    try {
      const data = await inventoryService.getWarehouses();
      if (data.success) {
        setWarehouses(data.data);
        if (data.data.length > 0 && selectedWarehouseId === undefined) {
          const match = data.data.find((w: Warehouse) => w.name === selectedBranch);
          if (match) {
            setSelectedWarehouseId(match.id);
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setWarehousesLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    setSuppliersLoading(true);
    try {
      const data = await inventoryService.getSuppliers();
      if (data.success) {
        setSuppliers(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSuppliersLoading(false);
    }
  };

  const fetchMovements = async (wId?: string) => {
    const targetId = wId !== undefined ? wId : selectedWarehouseId;
    setMovementsLoading(true);
    try {
      const data = await inventoryService.getMovements(targetId);
      if (data.success) {
        setMovements(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setMovementsLoading(false);
    }
  };

  const fetchOrders = async () => {
    setOrdersLoading(true);
    try {
      const data = await inventoryService.getOrders();
      if (data.success) {
        setOrders(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setOrdersLoading(false);
    }
  };

  const fetchSales = async (wId?: string) => {
    const targetId = wId !== undefined ? wId : selectedWarehouseId;
    setSalesLoading(true);
    try {
      const data = await salesService.getSales(targetId);
      if (data.success) {
        setSales(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSalesLoading(false);
    }
  };

  const handleSelectBranch = (branchName: string, warehouseId?: string) => {
    setSelectedBranch(branchName);
    setSelectedWarehouseId(warehouseId);
    fetchStats(warehouseId);
    fetchSales(warehouseId);
    fetchVariants(warehouseId);
    fetchMovements(warehouseId);
  };

  // Initial Sync on load
  useEffect(() => {
    const runInitialFetches = async () => {
      await fetchDbStatus();
      await Promise.all([
        fetchStats(),
        fetchBrands(),
        fetchProducts(),
        fetchVariants(),
        fetchWarehouses(),
        fetchSuppliers(),
        fetchMovements(),
        fetchOrders(),
        fetchSales()
      ]);
    };
    runInitialFetches();
  }, []);

  // Trigger global data refresh
  const handleDataRefresh = async () => {
    await fetchDbStatus();
    await Promise.all([
      fetchStats(),
      fetchBrands(),
      fetchProducts(),
      fetchVariants(),
      fetchWarehouses(),
      fetchSuppliers(),
      fetchMovements(),
      fetchOrders(),
      fetchSales()
    ]);
    triggerToast('All operational stocks and audit trails synchronized!', 'success');
  };

  // ------------------------------------------
  // DATABASE ACTIONS
  // ------------------------------------------
  
  const handleDatabaseReconnect = async () => {
    setActionLoading(true);
    try {
      const data = await settingsService.reconnectDb();
      if (data.success) {
        await handleDataRefresh();
        if (data.postgresConnected) {
          triggerToast('Successfully initialized connection to Supabase PostgreSQL!', 'success');
        } else {
          triggerToast('Running in Memory SandboxFallback.', 'info');
        }
      }
    } catch (err) {
      triggerToast('Database sync test failed.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ------------------------------------------
  // API MUTATION POST TRIGGERS
  // ------------------------------------------

  const handleCreateProduct = async (payload: any) => {
    try {
      const data = await productsService.createProduct(payload);
      if (data.success) {
        triggerToast(`Item "${payload.name}" cataloged!`, 'success');
        return data.data;
      } else {
        triggerToast(data.error || 'Failed to catalog item', 'error');
      }
    } catch (err) {
      triggerToast('Network error during product creation', 'error');
    }
  };

  const handleUpdateProduct = async (id: string, payload: any) => {
    try {
      const data = await productsService.updateProduct(id, payload);
      if (data.success) {
        triggerToast(`Updated product details.`, 'success');
        return data.data;
      }
    } catch (err) {
      triggerToast('Failed to update product', 'error');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      const data = await productsService.deleteProduct(id);
      if (data.success) {
        triggerToast('Product deleted from catalog', 'success');
      }
    } catch (err) {
      triggerToast('Failed to delete product', 'error');
    }
  };

  const handleCreateVariant = async (payload: any) => {
    try {
      const data = await inventoryService.createVariant(payload);
      if (data.success) {
        triggerToast(`Size SKU "${payload.sku}" generated successfully!`, 'success');
        return data.data;
      }
    } catch (err) {
      triggerToast('Failed to generate variant SKU', 'error');
    }
  };

  const handleUpdateVariant = async (id: string, payload: any) => {
    try {
      const data = await inventoryService.updateVariant(id, payload);
      if (data.success) {
        triggerToast('Variant metadata updated.', 'success');
        return data.data;
      }
    } catch (err) {
      triggerToast('Failed to update variant', 'error');
    }
  };

  const handleDeleteVariant = async (id: string) => {
    try {
      const data = await inventoryService.deleteVariant(id);
      if (data.success) {
        triggerToast('Variant SKU deleted.', 'success');
      }
    } catch (err) {
      triggerToast('Failed to delete variant', 'error');
    }
  };

  const handleCreateWarehouse = async (payload: any) => {
    try {
      const data = await inventoryService.createWarehouse(payload);
      if (data.success) {
        triggerToast(`Facility "${payload.name}" mapped!`, 'success');
        return data.data;
      }
    } catch (err) {
      triggerToast('Failed to map warehouse', 'error');
    }
  };

  const handleUpdateWarehouse = async (id: string, payload: any) => {
    try {
      const data = await inventoryService.updateWarehouse(id, payload);
      if (data.success) {
        triggerToast('Facility information updated.', 'success');
        return data.data;
      }
    } catch (err) {
      triggerToast('Failed to update warehouse', 'error');
    }
  };

  const handleDeleteWarehouse = async (id: string) => {
    try {
      const data = await inventoryService.deleteWarehouse(id);
      if (data.success) {
        triggerToast('Facility deleted.', 'success');
      }
    } catch (err) {
      triggerToast('Failed to delete warehouse', 'error');
    }
  };

  const handleCreateSupplier = async (payload: any) => {
    try {
      const data = await inventoryService.createSupplier(payload);
      if (data?.success) {
        triggerToast(`Supplier "${payload.name}" registered!`, 'success');
        await fetchSuppliers();
        return data.data;
      }
    } catch (err) {
      triggerToast('Failed to register supplier', 'error');
    }
  };

  const handleUpdateSupplier = async (id: string, payload: any) => {
    try {
      const data = await inventoryService.updateSupplier(id, payload);
      if (data?.success) {
        triggerToast('Supplier directory updated.', 'success');
        await fetchSuppliers();
        return data.data;
      }
    } catch (err) {
      triggerToast('Failed to update supplier details', 'error');
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    try {
      const data = await inventoryService.deleteSupplier(id);
      if (data?.success) {
        triggerToast('Supplier profile removed.', 'success');
        await fetchSuppliers();
      }
    } catch (err) {
      triggerToast('Failed to delete supplier', 'error');
    }
  };

  const handleCreateMovement = async (payload: any) => {
    try {
      const data = await inventoryService.createMovement(payload);
      if (data.success) {
        triggerToast('Stock movement registered successfully. Inventory updated!', 'success');
        await Promise.all([
          fetchVariants(),
          fetchMovements(),
          fetchStats()
        ]);
        return data.data;
      } else {
        triggerToast(data.error || 'Failed to log stock change', 'error');
      }
    } catch (err: any) {
      triggerToast(err.message || 'Failed to log stock change', 'error');
    }
  };

  const handleCreateOrder = async (payload: any) => {
    try {
      const data = await inventoryService.createOrder(payload);
      if (data.success) {
        triggerToast(`Restock order "${payload.orderNumber}" created!`, 'success');
        return data.data;
      }
    } catch (err) {
      triggerToast('Failed to authorize purchase order', 'error');
    }
  };

  const handleUpdateOrderStatus = async (id: string, status: OrderStatus) => {
    try {
      const data = await inventoryService.updateOrderStatus(id, status);
      if (data.success) {
        triggerToast(`Order marked as ${status.toUpperCase()}!`, 'success');
        return data.data;
      }
    } catch (err) {
      triggerToast('Failed to update order status', 'error');
    }
  };

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    localStorage.removeItem('shoetracker_session');
    setSession(null);
    setShowLogoutConfirm(false);
    triggerToast('Logged out successfully. Have a great day!', 'info');
  };

  // Grouped Navigation Structure matching screenshot exactly
  const navGroups = [
    {
      title: 'OVERVIEW',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
        { id: 'pos', label: 'Point of Sale', icon: ShoppingCart },
      ]
    },
    {
      title: 'INVENTORY',
      items: [
        { id: 'products', label: 'Products', icon: LinkIcon },
        { id: 'movements', label: 'Inventory', icon: Box },
        { id: 'orders', label: 'Purchases', icon: Truck },
      ]
    },
    {
      title: 'FINANCE',
      items: [
        { id: 'sales', label: 'Sales', icon: Banknote },
        { id: 'warehouses', label: 'Cash Management', icon: Wallet },
        { id: 'reports', label: 'Reports', icon: BarChart3 },
      ]
    },
    {
      title: 'MANAGE',
      items: [
        { id: 'people', label: 'People', icon: Users },
        { id: 'settings', label: 'Settings', icon: SettingsIcon },
      ]
    }
  ];

  const handleTabChange = (tab: string) => {
    if (tab === 'people') {
      triggerToast('People Management view loaded', 'info');
      setActiveTab('settings');
      return;
    }
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
    if (tab === 'dashboard') fetchStats();
    if (tab === 'products') { fetchProducts(); fetchBrands(); }
    if (tab === 'movements') { fetchMovements(); fetchVariants(); fetchWarehouses(); }
    if (tab === 'warehouses') fetchWarehouses();
    if (tab === 'suppliers') fetchSuppliers();
    if (tab === 'orders') { fetchOrders(); fetchSuppliers(); fetchVariants(); }
    if (tab === 'sales' || tab === 'pos') { fetchSales(); fetchVariants(); fetchWarehouses(); }
    if (tab === 'reports') { fetchSales(); fetchVariants(); fetchMovements(); fetchProducts(); fetchStats(); }
    if (tab === 'settings') fetchDbStatus();
  };

  if (!session) {
    return (
      <LoginView 
        onLoginSuccess={(sess) => {
          setSession(sess);
          localStorage.setItem('shoetracker_session', JSON.stringify(sess));
        }} 
        triggerToast={triggerToast} 
      />
    );
  }

  return (
    <AppShell
      activeTab={activeTab}
      onTabChange={handleTabChange}
      theme={theme}
      onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      selectedBranch={selectedBranch}
      onSelectBranch={handleSelectBranch}
      session={session}
      onLogout={handleLogout}
      warehouses={warehouses}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15 }}
          className="h-full"
        >
          {activeTab === 'dashboard' && (
            <DashboardView 
              stats={stats} 
              sales={sales}
              warehouses={warehouses}
              selectedBranch={selectedBranch}
              loading={statsLoading} 
              onNavigate={handleTabChange}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView 
              sales={sales}
              movements={movements}
              products={products}
              variants={variants}
              warehouses={warehouses}
              onNavigate={handleTabChange}
              triggerToast={triggerToast}
              onRefresh={() => {
                fetchSales(selectedWarehouseId);
                fetchVariants(selectedWarehouseId);
                fetchMovements(selectedWarehouseId);
                fetchProducts();
                fetchStats(selectedWarehouseId);
              }}
            />
          )}

          {activeTab === 'products' && (
            <ProductsView 
              products={products}
              brands={brands}
              warehouses={warehouses}
              loading={productsLoading}
              onRefresh={handleDataRefresh}
              onCreateProduct={handleCreateProduct}
              onUpdateProduct={handleUpdateProduct}
              onDeleteProduct={handleDeleteProduct}
              onCreateVariant={handleCreateVariant}
              onUpdateVariant={handleUpdateVariant}
              onDeleteVariant={handleDeleteVariant}
              userPermissions={session?.permissions || []}
            />
          )}

          {activeTab === 'movements' && (
            <MovementsView 
              movements={movements}
              variants={variants}
              warehouses={warehouses}
              loading={movementsLoading}
              onRefresh={handleDataRefresh}
              onCreateMovement={handleCreateMovement}
            />
          )}

          {activeTab === 'warehouses' && (
            <WarehousesView 
              warehouses={warehouses}
              loading={warehousesLoading}
              onRefresh={handleDataRefresh}
              onCreateWarehouse={handleCreateWarehouse}
              onUpdateWarehouse={handleUpdateWarehouse}
              onDeleteWarehouse={handleDeleteWarehouse}
            />
          )}

          {activeTab === 'suppliers' && (
            <SuppliersView 
              suppliers={suppliers}
              loading={suppliersLoading}
              onRefresh={handleDataRefresh}
              onCreateSupplier={handleCreateSupplier}
              onUpdateSupplier={handleUpdateSupplier}
              onDeleteSupplier={handleDeleteSupplier}
            />
          )}

          {activeTab === 'orders' && (
            <OrdersView 
              orders={orders}
              suppliers={suppliers}
              variants={variants}
              loading={ordersLoading}
              onRefresh={handleDataRefresh}
              onCreateOrder={handleCreateOrder}
              onUpdateOrderStatus={handleUpdateOrderStatus}
              onCreateSupplier={handleCreateSupplier}
              onUpdateSupplier={handleUpdateSupplier}
              onDeleteSupplier={handleDeleteSupplier}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView 
              warehouses={warehouses}
              onCreateWarehouse={handleCreateWarehouse}
              onRefresh={() => { fetchWarehouses(); }}
              dbStatus={dbStatus}
              loading={actionLoading}
              onReconnect={handleDatabaseReconnect}
              triggerToast={triggerToast}
              session={session}
              currentTheme={theme}
              onThemeToggle={setTheme}
            />
          )}

          {activeTab === 'pos' && (
            <SalesView 
              sales={sales}
              variants={variants}
              warehouses={warehouses}
              selectedBranch={selectedBranch}
              selectedWarehouseId={warehouses.find(w => w.name === selectedBranch)?.id}
              loading={salesLoading}
              onRefresh={fetchSales}
              initialMode="pos"
              onRecordSale={async (sData) => {
                const data = await salesService.recordSale(sData);
                if (!data.success) {
                  throw new Error(data.error || 'Failed to record the sale.');
                }
                triggerToast('Sale recorded successfully!', 'success');
                await Promise.all([
                  fetchSales(),
                  fetchVariants(),
                  fetchMovements(),
                  fetchStats()
                ]);
                return data.data;
              }}
            />
          )}

          {activeTab === 'sales' && (
            <SalesView 
              sales={sales}
              variants={variants}
              warehouses={warehouses}
              selectedBranch={selectedBranch}
              selectedWarehouseId={warehouses.find(w => w.name === selectedBranch)?.id}
              loading={salesLoading}
              onRefresh={fetchSales}
              initialMode="history"
              onRecordSale={async (sData) => {
                const data = await salesService.recordSale(sData);
                if (!data.success) {
                  throw new Error(data.error || 'Failed to record the sale.');
                }
                triggerToast('Sale recorded successfully!', 'success');
                await Promise.all([
                  fetchSales(),
                  fetchVariants(),
                  fetchMovements(),
                  fetchStats()
                ]);
                return data.data;
              }}
            />
          )}

          {activeTab === 'people' && (
            <PeopleView 
              selectedBranch={selectedBranch}
              triggerToast={triggerToast}
            />
          )}

          {activeTab === 'cash' && (
            <CashManagementView 
              selectedBranch={selectedBranch}
              triggerToast={triggerToast}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#222738] rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4 animate-scale-up">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto border border-rose-100 dark:border-rose-900/50">
              <LogOut className="w-6 h-6" />
            </div>
            
            <div className="text-center space-y-1">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Confirm Log Out
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Are you sure you want to end your session? Make sure any active POS transactions or edits are completed.
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-[#181b28] p-3 rounded-xl border border-slate-100 dark:border-[#222738] flex items-center space-x-3 text-xs">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                {(session?.user?.name || 'AD').substring(0, 2).toUpperCase()}
              </div>
              <div className="truncate text-left">
                <p className="font-bold text-slate-900 dark:text-white truncate">
                  {session?.user?.name || 'Staff User'}
                </p>
                <p className="text-[11px] text-slate-400 truncate">
                  {session?.user?.role || 'Staff'} &bull; {selectedBranch}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#222738] hover:bg-slate-100 dark:hover:bg-[#181b28] text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmLogout}
                className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors shadow-xs cursor-pointer flex items-center justify-center space-x-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 z-50 flex items-center space-x-3 p-4 rounded-xl shadow-2xl backdrop-blur-xl bg-slate-900/90 dark:bg-[#12141e]/90 border border-slate-800 dark:border-[#1e2233] text-white max-w-sm"
          >
            <div className="shrink-0 p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
              {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
            </div>
            <p className="text-xs font-semibold leading-relaxed text-slate-200">{toast.message}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </AppShell>
  );
}

