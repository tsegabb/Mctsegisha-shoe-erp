import { useState, useEffect, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, 
  Users, 
  GitFork, 
  ShoppingBag, 
  Bell, 
  Palette, 
  CreditCard, 
  Save, 
  CheckCircle2,
  Plus,
  UserMinus,
  Sun,
  Moon,
  Laptop,
  X,
  Check,
  RefreshCw,
  Send,
  Loader2,
  Database,
  Store,
  ShieldCheck,
  Trash2,
  Bot,
  FileText,
  Clock,
  Sparkles,
  MessageSquare,
  ChevronDown
} from 'lucide-react';
import { User, Warehouse } from '../types.ts';
import { settingsService } from '../services/settings.service.ts';
import { usersService } from '../services/users.service.ts';
import { inventoryService } from '../services/inventory.service.ts';

interface SettingsViewProps {
  warehouses?: Warehouse[];
  users?: User[];
  loading?: boolean;
  onRefresh?: () => void;
  onCreateWarehouse?: (data: any) => Promise<any>;
  dbStatus?: any;
  onReconnect?: () => Promise<void>;
  triggerToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
  session?: any;
  currentTheme?: any;
  onThemeToggle?: (theme: any) => void;
}

export default function SettingsView({
  warehouses = [],
  users = [],
  loading: parentLoading,
  onRefresh,
  onCreateWarehouse,
  dbStatus,
  onReconnect,
  triggerToast,
  currentTheme = 'dark',
  onThemeToggle
}: SettingsViewProps) {
  const [activeTab, setActiveTab] = useState<'store' | 'users' | 'branches' | 'pos' | 'notifications' | 'appearance' | 'subscription'>('store');
  const [fetchingSettings, setFetchingSettings] = useState(false);

  // Store State
  const [storeName, setStoreName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [savingStore, setSavingStore] = useState(false);
  const [storeSaved, setStoreSaved] = useState(false);

  // Users & Roles State
  const [staffList, setStaffList] = useState<any[]>([]);
  const [fetchingUsers, setFetchingUsers] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('sales');
  const [newUserBranch, setNewUserBranch] = useState('');
  const [addingUser, setAddingUser] = useState(false);

  // Branches State
  const [branchesList, setBranchesList] = useState<any[]>([]);
  const [fetchingBranches, setFetchingBranches] = useState(false);
  const [isAddBranchModalOpen, setIsAddBranchModalOpen] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchAddress, setNewBranchAddress] = useState('');
  const [newBranchType, setNewBranchType] = useState('Branch');
  const [addingBranch, setAddingBranch] = useState(false);

  // POS Settings State
  const [vatEnabled, setVatEnabled] = useState(false);
  const [vatRate, setVatRate] = useState(15);
  const [receiptHeader, setReceiptHeader] = useState('');
  const [receiptFooter, setReceiptFooter] = useState('');
  const [savingPos, setSavingPos] = useState(false);
  const [posSaved, setPosSaved] = useState(false);

  // Notifications Settings State
  const [telegramEnabled, setTelegramEnabled] = useState(true);
  const [telegramToken, setTelegramToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [enableDailyReportTelegram, setEnableDailyReportTelegram] = useState(true);
  const [dailyReportTime, setDailyReportTime] = useState('20:00');
  const [lowStockThreshold, setLowStockThreshold] = useState(10);
  const [enableAutoEmail, setEnableAutoEmail] = useState(true);
  const [savingNotifs, setSavingNotifs] = useState(false);
  const [testingNotifs, setTestingNotifs] = useState(false);
  const [sendingDailyReport, setSendingDailyReport] = useState(false);
  const [showToken, setShowToken] = useState(false);

  // Theme State
  const [selectedTheme, setSelectedTheme] = useState<'light' | 'dark' | 'system'>((currentTheme as any) || 'dark');

  useEffect(() => {
    if (currentTheme) {
      setSelectedTheme(currentTheme as any);
    }
  }, [currentTheme]);

  // Load General Settings & Notification Settings on mount
  const loadSettingsData = async () => {
    setFetchingSettings(true);
    try {
      const [genRes, notifRes] = await Promise.allSettled([
        settingsService.getGeneralSettings(),
        settingsService.getNotificationSettings()
      ]);

      if (genRes.status === 'fulfilled' && genRes.value?.success) {
        const data = genRes.value.data || genRes.value;
        if (data.businessProfile) {
          setStoreName(data.businessProfile.shopName || '');
          setAddress(data.businessProfile.address || '');
          setPhone(data.businessProfile.phone || '');
          setEmail(data.businessProfile.email || '');
          if (data.businessProfile.receiptHeader) setReceiptHeader(data.businessProfile.receiptHeader);
          if (data.businessProfile.receiptFooter) setReceiptFooter(data.businessProfile.receiptFooter);
        }
        if (data.pricingTax) {
          setVatEnabled(data.pricingTax.vatRate > 0 || data.pricingTax.taxInclusive);
          setVatRate(data.pricingTax.vatRate || 15);
        }
        if (data.inventoryRules) {
          setLowStockThreshold(data.inventoryRules.globalThreshold || 10);
        }
      }

      if (notifRes.status === 'fulfilled' && notifRes.value?.success) {
        const notifData = notifRes.value.data || notifRes.value;
        setTelegramEnabled(notifData.enableTelegram !== undefined ? !!notifData.enableTelegram : true);
        setTelegramToken(notifData.telegramToken || '');
        setTelegramChatId(notifData.telegramChatId || '');
        if (notifData.enableDailyReportTelegram !== undefined) setEnableDailyReportTelegram(!!notifData.enableDailyReportTelegram);
        if (notifData.dailyReportTime) setDailyReportTime(notifData.dailyReportTime);
        if (notifData.threshold !== undefined) setLowStockThreshold(notifData.threshold);
        if (notifData.enableAutoEmail !== undefined) setEnableAutoEmail(notifData.enableAutoEmail);
      }
    } catch (err) {
      console.error('Error loading settings:', err);
    } finally {
      setFetchingSettings(false);
    }
  };

  // Load Users from Backend API
  const loadUsers = async () => {
    setFetchingUsers(true);
    try {
      const res = await usersService.getUsers();
      if (res.success && Array.isArray(res.data)) {
        setStaffList(res.data);
      } else if (Array.isArray(users) && users.length > 0) {
        setStaffList(users);
      } else {
        setStaffList([]);
      }
    } catch (err) {
      console.error('Error loading users:', err);
      if (Array.isArray(users)) setStaffList(users);
    } finally {
      setFetchingUsers(false);
    }
  };

  // Load Branches/Warehouses from Backend API
  const loadBranches = async () => {
    setFetchingBranches(true);
    try {
      const res = await inventoryService.getWarehouses();
      if (res.success && Array.isArray(res.data)) {
        setBranchesList(res.data);
      } else if (Array.isArray(warehouses) && warehouses.length > 0) {
        setBranchesList(warehouses);
      } else {
        setBranchesList([]);
      }
    } catch (err) {
      console.error('Error loading warehouses:', err);
      if (Array.isArray(warehouses)) setBranchesList(warehouses);
    } finally {
      setFetchingBranches(false);
    }
  };

  useEffect(() => {
    loadSettingsData();
    loadUsers();
    loadBranches();
  }, []);

  useEffect(() => {
    if (Array.isArray(warehouses) && warehouses.length > 0) {
      setBranchesList(warehouses);
    }
  }, [warehouses]);

  useEffect(() => {
    if (Array.isArray(users) && users.length > 0) {
      setStaffList(users);
    }
  }, [users]);

  // Handlers
  const handleSaveStore = async (e: FormEvent) => {
    e.preventDefault();
    setSavingStore(true);
    try {
      const res = await settingsService.saveGeneralSettings('businessProfile', {
        shopName: storeName,
        address,
        phone,
        email,
        receiptHeader,
        receiptFooter
      });
      if (res.success) {
        setStoreSaved(true);
        if (triggerToast) triggerToast('Store information saved successfully', 'success');
        setTimeout(() => setStoreSaved(false), 3000);
      } else {
        if (triggerToast) triggerToast(res.error || 'Failed to save store info', 'error');
      }
    } catch (err: any) {
      if (triggerToast) triggerToast(err.message || 'Error saving store info', 'error');
    } finally {
      setSavingStore(false);
    }
  };

  const handleAddUser = async (e: FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim()) {
      if (triggerToast) triggerToast('Please enter full name', 'error');
      return;
    }
    setAddingUser(true);
    try {
      const cleanPhone = newUserPhone.trim();
      const emailVal = newUserEmail.trim() || (cleanPhone ? `${cleanPhone.replace(/\s+/g, '')}@store.com` : `${newUserName.trim().toLowerCase().replace(/\s+/g, '')}@store.com`);
      
      const res = await usersService.createUser({
        name: newUserName.trim(),
        phone: cleanPhone,
        email: emailVal,
        password: newUserPassword || 'user123',
        role: newUserRole,
        shopId: newUserBranch || null
      });

      if (res.success) {
        if (triggerToast) triggerToast('New user added successfully', 'success');
        setNewUserName('');
        setNewUserEmail('');
        setNewUserPhone('');
        setNewUserPassword('');
        setNewUserRole('sales');
        setNewUserBranch('');
        setIsAddUserModalOpen(false);
        await loadUsers();
        if (onRefresh) onRefresh();
      } else {
        if (triggerToast) triggerToast(res.error || 'Failed to add user', 'error');
      }
    } catch (err: any) {
      if (triggerToast) triggerToast(err.message || 'Error adding user', 'error');
    } finally {
      setAddingUser(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Are you sure you want to remove this staff member?')) return;
    try {
      const res = await usersService.deleteUser(id);
      if (res.success) {
        if (triggerToast) triggerToast('User removed successfully', 'info');
        await loadUsers();
        if (onRefresh) onRefresh();
      } else {
        if (triggerToast) triggerToast(res.error || 'Failed to remove user', 'error');
      }
    } catch (err: any) {
      if (triggerToast) triggerToast(err.message || 'Error deleting user', 'error');
    }
  };

  const handleAddBranch = async (e: FormEvent) => {
    e.preventDefault();
    if (!newBranchName) return;
    setAddingBranch(true);
    try {
      const payload = {
        name: newBranchName,
        code: newBranchName.substring(0, 4).toUpperCase(),
        address: newBranchAddress || 'Addis Ababa',
        phone: '0911000000',
        type: newBranchType === 'Main' ? 'store' : 'warehouse'
      };

      if (onCreateWarehouse) {
        await onCreateWarehouse(payload);
      } else {
        await inventoryService.createWarehouse(payload);
      }
      if (triggerToast) triggerToast('Branch added successfully', 'success');
      setNewBranchName('');
      setNewBranchAddress('');
      setIsAddBranchModalOpen(false);
      await loadBranches();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      if (triggerToast) triggerToast(err.message || 'Error adding branch', 'error');
    } finally {
      setAddingBranch(false);
    }
  };

  const handleSavePOS = async (e: FormEvent) => {
    e.preventDefault();
    setSavingPos(true);
    try {
      const res = await settingsService.saveGeneralSettings('pricingTax', {
        vatRate: vatEnabled ? vatRate : 0,
        taxInclusive: vatEnabled,
        receiptHeader,
        receiptFooter
      });
      await settingsService.saveGeneralSettings('businessProfile', {
        receiptHeader,
        receiptFooter
      });
      if (res.success) {
        setPosSaved(true);
        if (triggerToast) triggerToast('POS & Receipt settings saved successfully', 'success');
        setTimeout(() => setPosSaved(false), 3000);
      } else {
        if (triggerToast) triggerToast(res.error || 'Failed to save POS settings', 'error');
      }
    } catch (err: any) {
      if (triggerToast) triggerToast(err.message || 'Error saving POS settings', 'error');
    } finally {
      setSavingPos(false);
    }
  };

  const handleSaveNotifications = async (e: FormEvent) => {
    e.preventDefault();
    setSavingNotifs(true);
    try {
      const res = await settingsService.saveNotificationSettings({
        enableTelegram: telegramEnabled,
        telegramToken,
        telegramChatId,
        enableDailyReportTelegram,
        dailyReportTime,
        threshold: lowStockThreshold,
        enableAutoEmail
      });
      await settingsService.saveGeneralSettings('inventoryRules', {
        globalThreshold: lowStockThreshold
      });
      if (res.success) {
        if (triggerToast) triggerToast('Notification & Telegram settings saved successfully!', 'success');
      } else {
        if (triggerToast) triggerToast(res.error || 'Failed to save notification settings', 'error');
      }
    } catch (err: any) {
      if (triggerToast) triggerToast(err.message || 'Error saving notification settings', 'error');
    } finally {
      setSavingNotifs(false);
    }
  };

  const handleTestTelegram = async () => {
    if (!telegramToken.trim() || !telegramChatId.trim()) {
      if (triggerToast) triggerToast('Please enter both Telegram Bot Token and Chat ID', 'error');
      return;
    }
    setTestingNotifs(true);
    try {
      const res = await settingsService.testTelegramBot({
        token: telegramToken.trim(),
        chatId: telegramChatId.trim()
      });
      if (res.success) {
        if (triggerToast) triggerToast('Telegram test message delivered successfully! Check your Telegram app.', 'success');
      } else {
        if (triggerToast) triggerToast(res.error || 'Failed to send Telegram test message', 'error');
      }
    } catch (err: any) {
      if (triggerToast) triggerToast(err.message || 'Failed to send Telegram test message', 'error');
    } finally {
      setTestingNotifs(false);
    }
  };

  const handleSendDailyReportTelegram = async () => {
    if (!telegramToken.trim() || !telegramChatId.trim()) {
      if (triggerToast) triggerToast('Please enter both Telegram Bot Token and Chat ID first', 'error');
      return;
    }
    setSendingDailyReport(true);
    try {
      const res = await settingsService.sendDailyReportTelegram({
        token: telegramToken.trim(),
        chatId: telegramChatId.trim()
      });
      if (res.success) {
        if (triggerToast) triggerToast('Daily Sales & Inventory Report dispatched to Telegram!', 'success');
      } else {
        if (triggerToast) triggerToast(res.error || 'Failed to send daily report to Telegram', 'error');
      }
    } catch (err: any) {
      if (triggerToast) triggerToast(err.message || 'Error dispatching daily report to Telegram', 'error');
    } finally {
      setSendingDailyReport(false);
    }
  };

  const handleThemeSelect = (theme: 'light' | 'dark' | 'system') => {
    setSelectedTheme(theme);
    if (onThemeToggle) onThemeToggle(theme);
    if (triggerToast) triggerToast(`Theme set to ${theme}`, 'info');
  };

  return (
    <div className="space-y-5 text-slate-900 dark:text-slate-100 font-sans">
      
      {/* PAGE TITLE & SUBTITLE */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Settings</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Configure your store and system preferences.</p>
        </div>

        {dbStatus && (
          <div className="flex items-center space-x-2 text-xs bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] px-3 py-1.5 rounded-xl shadow-2xs">
            <Database className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span className="text-slate-600 dark:text-slate-300">Database:</span>
            <span className={`font-bold ${dbStatus.postgresConnected ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
              {dbStatus.postgresConnected ? 'PostgreSQL' : 'In-Memory DB'}
            </span>
            {onReconnect && (
              <button 
                onClick={onReconnect}
                className="hover:text-slate-900 dark:hover:text-white p-1 cursor-pointer transition-colors"
                title="Reconnect Database"
              >
                <RefreshCw className="w-3 h-3 text-slate-400 hover:text-slate-700 dark:hover:text-white" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* TOP TAB PILLS */}
      <div className="flex items-center space-x-1.5 p-1 bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] rounded-xl w-fit text-xs overflow-x-auto shadow-2xs">
        <button
          onClick={() => setActiveTab('store')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer flex items-center space-x-1.5 ${
            activeTab === 'store' 
              ? 'bg-slate-100 dark:bg-[#1e2233] text-slate-900 dark:text-white shadow-2xs' 
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Store Info</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer flex items-center space-x-1.5 ${
            activeTab === 'users' 
              ? 'bg-slate-100 dark:bg-[#1e2233] text-slate-900 dark:text-white shadow-2xs' 
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Users & Roles</span>
        </button>

        <button
          onClick={() => setActiveTab('branches')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer flex items-center space-x-1.5 ${
            activeTab === 'branches' 
              ? 'bg-slate-100 dark:bg-[#1e2233] text-slate-900 dark:text-white shadow-2xs' 
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <GitFork className="w-3.5 h-3.5" />
          <span>Branches</span>
        </button>

        <button
          onClick={() => setActiveTab('pos')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer flex items-center space-x-1.5 ${
            activeTab === 'pos' 
              ? 'bg-slate-100 dark:bg-[#1e2233] text-slate-900 dark:text-white shadow-2xs' 
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>POS Settings</span>
        </button>

        <button
          onClick={() => setActiveTab('notifications')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer flex items-center space-x-1.5 ${
            activeTab === 'notifications' 
              ? 'bg-slate-100 dark:bg-[#1e2233] text-slate-900 dark:text-white shadow-2xs' 
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Bell className="w-3.5 h-3.5" />
          <span>Notifications</span>
        </button>

        <button
          onClick={() => setActiveTab('appearance')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer flex items-center space-x-1.5 ${
            activeTab === 'appearance' 
              ? 'bg-slate-100 dark:bg-[#1e2233] text-slate-900 dark:text-white shadow-2xs' 
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Palette className="w-3.5 h-3.5" />
          <span>Appearance</span>
        </button>

        <button
          onClick={() => setActiveTab('subscription')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer flex items-center space-x-1.5 ${
            activeTab === 'subscription' 
              ? 'bg-slate-100 dark:bg-[#1e2233] text-slate-900 dark:text-white shadow-2xs' 
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Subscription</span>
        </button>
      </div>

      {/* TAB 1: STORE INFORMATION */}
      {activeTab === 'store' && (
        <div className="bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] rounded-xl p-6 space-y-5 max-w-2xl relative shadow-2xs">
          {fetchingSettings && (
            <div className="absolute inset-0 bg-white/70 dark:bg-[#12141e]/70 backdrop-blur-xs rounded-xl flex items-center justify-center z-10">
              <Loader2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400 animate-spin" />
            </div>
          )}
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">Store Information</h3>

          <form onSubmit={handleSaveStore} className="space-y-4 text-xs">
            <div>
              <label className="text-slate-700 dark:text-slate-300 font-medium block mb-1">Store / Business Name</label>
              <input 
                type="text"
                required
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="e.g. SoleFlow Shoes"
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-[#181b28] border border-slate-200 dark:border-[#262b3f] rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-slate-700 dark:text-slate-300 font-medium block mb-1">Address</label>
              <textarea 
                rows={3}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Bole Road, Addis Ababa"
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-[#181b28] border border-slate-200 dark:border-[#262b3f] rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-slate-700 dark:text-slate-300 font-medium block mb-1">Phone</label>
                <input 
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 0911000000"
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-[#181b28] border border-slate-200 dark:border-[#262b3f] rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 font-medium block mb-1">Email</label>
                <input 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. info@soleflow.com"
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-[#181b28] border border-slate-200 dark:border-[#262b3f] rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>

            {storeSaved && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-600 dark:text-emerald-400 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Store information saved successfully.</span>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingStore}
                className="px-4 py-2 bg-[#6366f1] hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center space-x-2 shadow-md cursor-pointer transition-colors"
              >
                {savingStore ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: USERS & ROLES */}
      {activeTab === 'users' && (
        <div className="bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] rounded-xl p-6 space-y-4 shadow-2xs">
          <div className="flex justify-between items-center pb-2">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Staff Members</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Manage store users and access permissions.</p>
            </div>
            <button
              onClick={() => setIsAddUserModalOpen(true)}
              className="px-3 py-1.5 bg-[#6366f1] hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center space-x-1.5 cursor-pointer transition-colors shadow-md"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add User</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            {fetchingUsers ? (
              <div className="py-12 flex justify-center items-center">
                <Loader2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400 animate-spin" />
              </div>
            ) : staffList.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-200 dark:border-[#1e2233] rounded-xl text-slate-500 dark:text-slate-400 text-xs">
                No users found. Click &quot;Add User&quot; to add a staff member.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-[#161926] text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="p-4 pl-2">NAME</th>
                    <th className="p-4">CONTACT / EMAIL</th>
                    <th className="p-4">ROLES</th>
                    <th className="p-4">STATUS</th>
                    <th className="p-4 text-right pr-2">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#1a1e2e] font-medium text-slate-800 dark:text-slate-200">
                  {staffList.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-[#181b28] transition-colors">
                      <td className="p-4 pl-2 font-bold text-slate-900 dark:text-white">{user.name}</td>
                      <td className="p-4 text-slate-600 dark:text-slate-300 font-mono">{user.email || user.phone || 'N/A'}</td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-[#181b28] border border-slate-200 dark:border-[#262b3f] text-slate-700 dark:text-slate-300 text-[11px] font-medium capitalize">
                          {user.role}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center space-x-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                          <span>Active</span>
                        </span>
                      </td>
                      <td className="p-4 text-right pr-2">
                        <div className="flex items-center justify-end space-x-2 text-slate-400">
                          <button 
                            onClick={() => handleDeleteUser(user.id)}
                            className="hover:text-rose-500 p-1 cursor-pointer transition-colors"
                            title="Remove User"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
      {/* TAB 3: BRANCHES */}
      {activeTab === 'branches' && (
        <div className="bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] rounded-xl p-6 space-y-4 shadow-2xs">
          <div className="flex justify-between items-center pb-2">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Branches & Warehouses</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Manage physical stores and distribution hubs.</p>
            </div>
            <button
              onClick={() => setIsAddBranchModalOpen(true)}
              className="px-3 py-1.5 bg-[#6366f1] hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center space-x-1.5 cursor-pointer transition-colors shadow-md"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Branch</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            {fetchingBranches ? (
              <div className="py-12 flex justify-center items-center">
                <Loader2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400 animate-spin" />
              </div>
            ) : branchesList.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-200 dark:border-[#1e2233] rounded-xl text-slate-500 dark:text-slate-400 text-xs">
                No branches registered. Click &quot;Add Branch&quot; to create your first location.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-[#161926] text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="p-4 pl-2">NAME</th>
                    <th className="p-4">ADDRESS</th>
                    <th className="p-4">TYPE</th>
                    <th className="p-4">CODE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#1a1e2e] font-medium text-slate-800 dark:text-slate-200">
                  {branchesList.map((branch) => (
                    <tr key={branch.id} className="hover:bg-slate-50 dark:hover:bg-[#181b28] transition-colors">
                      <td className="p-4 pl-2 font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                        <Store className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <span>{branch.name}</span>
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-300">{branch.address || 'Addis Ababa'}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          branch.type === 'store' || branch.type === 'Main'
                            ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20' 
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                        }`}>
                          {branch.type === 'store' ? 'Main' : branch.type || 'Branch'}
                        </span>
                      </td>
                      <td className="p-4 font-mono font-bold text-slate-900 dark:text-white">{branch.code || 'MAIN'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: POS SETTINGS */}
      {activeTab === 'pos' && (
        <div className="bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] rounded-xl p-6 space-y-5 max-w-2xl relative shadow-2xs">
          {fetchingSettings && (
            <div className="absolute inset-0 bg-white/70 dark:bg-[#12141e]/70 backdrop-blur-xs rounded-xl flex items-center justify-center z-10">
              <Loader2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400 animate-spin" />
            </div>
          )}
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">POS & Receipt Settings</h3>

          <form onSubmit={handleSavePOS} className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-[#181b28] border border-slate-200 dark:border-[#262b3f] rounded-xl">
              <div>
                <span className="font-bold text-slate-900 dark:text-white block">Enable VAT (15%)</span>
                <span className="text-slate-500 dark:text-slate-400 text-[11px]">Include standard 15% Ethiopian VAT on checkout receipts</span>
              </div>
              <button
                type="button"
                onClick={() => setVatEnabled(!vatEnabled)}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                  vatEnabled ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 dark:bg-[#12141e] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#262b3f]'
                }`}
              >
                {vatEnabled ? 'Enabled' : 'Disabled'}
              </button>
            </div>

            <div>
              <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Receipt Header Text</label>
              <textarea 
                rows={3}
                value={receiptHeader}
                onChange={(e) => setReceiptHeader(e.target.value)}
                placeholder="e.g. SoleFlow Shoes Ltd. - TIN: 0098765432 - Tel: 0911000000"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#181b28] border border-slate-200 dark:border-[#262b3f] rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none font-mono text-[11px]"
              />
            </div>

            <div>
              <label className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">Receipt Footer Text</label>
              <textarea 
                rows={3}
                value={receiptFooter}
                onChange={(e) => setReceiptFooter(e.target.value)}
                placeholder="e.g. Thank you for shopping with us! Returns accepted within 7 days with original receipt."
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#181b28] border border-slate-200 dark:border-[#262b3f] rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none font-mono text-[11px]"
              />
            </div>

            {posSaved && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-600 dark:text-emerald-400 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>POS Settings updated successfully.</span>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingPos}
                className="px-4 py-2 bg-[#6366f1] hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center space-x-2 shadow-md cursor-pointer transition-colors"
              >
                {savingPos ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Save POS Settings</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 5: NOTIFICATIONS & TELEGRAM BOT */}
      {activeTab === 'notifications' && (
        <div className="bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] rounded-xl p-6 space-y-6 max-w-3xl relative shadow-2xs">
          {fetchingSettings && (
            <div className="absolute inset-0 bg-white/70 dark:bg-[#12141e]/70 backdrop-blur-xs rounded-xl flex items-center justify-center z-10">
              <Loader2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400 animate-spin" />
            </div>
          )}

          <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-[#1e2233]">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Bot className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span>Telegram Bot & Notification Integration</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Configure automated Telegram bot alerts for daily sales reports, financial performance, and stock threshold warnings.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {telegramToken && telegramChatId ? (
                <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-full flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Bot Configured
                </span>
              ) : (
                <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold rounded-full flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  Setup Required
                </span>
              )}
            </div>
          </div>

          <form onSubmit={handleSaveNotifications} className="space-y-5 text-xs">
            {/* TOGGLE TELEGRAM INTEGRATION */}
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-[#181b28] border border-slate-200 dark:border-[#262b3f] rounded-xl">
              <div className="space-y-0.5">
                <span className="font-bold text-sm text-slate-900 dark:text-white block">Enable Telegram Bot Integration</span>
                <span className="text-slate-500 dark:text-slate-400 text-xs">
                  Receive real-time sales notifications, stock alerts, and daily report summaries directly on Telegram.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setTelegramEnabled(!telegramEnabled)}
                className={`px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  telegramEnabled 
                    ? 'bg-indigo-600 text-white shadow-xs' 
                    : 'bg-slate-200 dark:bg-[#12141e] text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-[#262b3f]'
                }`}
              >
                {telegramEnabled ? 'Enabled' : 'Disabled'}
              </button>
            </div>

            {telegramEnabled && (
              <div className="space-y-4 p-5 bg-slate-50/70 dark:bg-[#181b28]/60 border border-slate-200 dark:border-[#262b3f] rounded-xl">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-slate-800 dark:text-slate-200 font-semibold block">Telegram Bot Token</label>
                    <a 
                      href="https://t.me/BotFather" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium"
                    >
                      <span>Get token from @BotFather</span>
                    </a>
                  </div>
                  <div className="relative">
                    <input 
                      type={showToken ? 'text' : 'password'}
                      value={telegramToken}
                      onChange={(e) => setTelegramToken(e.target.value)}
                      placeholder="e.g. 7123456789:AAFgX_example_bot_token"
                      className="w-full pl-3.5 pr-20 py-2.5 bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#262b3f] rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-mono text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowToken(!showToken)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 px-2 py-1 rounded bg-slate-100 dark:bg-[#1e2233] cursor-pointer"
                    >
                      {showToken ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-slate-800 dark:text-slate-200 font-semibold block">Telegram Chat ID</label>
                    <a 
                      href="https://t.me/userinfobot" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium"
                    >
                      <span>Find Chat ID via @userinfobot</span>
                    </a>
                  </div>
                  <input 
                    type="text"
                    value={telegramChatId}
                    onChange={(e) => setTelegramChatId(e.target.value)}
                    placeholder="e.g. 987654321 or @your_channel"
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#262b3f] rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-mono text-xs"
                  />
                </div>

                {/* DAILY REPORT AUTOMATION OPTION */}
                <div className="pt-2 border-t border-slate-200 dark:border-[#262b3f] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white block">Automated Daily Report Dispatch</span>
                      <span className="text-slate-500 dark:text-slate-400 text-[11px]">Automatically send daily sales revenue, net profit, and stock summary to Telegram</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEnableDailyReportTelegram(!enableDailyReportTelegram)}
                      className={`px-3 py-1.5 rounded-lg font-bold text-xs cursor-pointer ${
                        enableDailyReportTelegram 
                          ? 'bg-emerald-600 text-white' 
                          : 'bg-slate-200 dark:bg-[#12141e] text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-[#262b3f]'
                      }`}
                    >
                      {enableDailyReportTelegram ? 'Active' : 'Off'}
                    </button>
                  </div>

                  {enableDailyReportTelegram && (
                    <div className="flex items-center gap-3 pt-1">
                      <label className="text-slate-700 dark:text-slate-300 font-medium">Daily Report Schedule Time:</label>
                      <input 
                        type="time"
                        value={dailyReportTime}
                        onChange={(e) => setDailyReportTime(e.target.value)}
                        className="px-3 py-1.5 bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#262b3f] rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* THRESHOLD & EMAIL */}
            <div className="p-4 bg-slate-50/70 dark:bg-[#181b28]/60 border border-slate-200 dark:border-[#262b3f] rounded-xl space-y-3">
              <div>
                <label className="text-slate-800 dark:text-slate-200 font-semibold block mb-1">Low Stock Threshold (Pairs)</label>
                <input 
                  type="number"
                  min={1}
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(parseInt(e.target.value || '1', 10))}
                  className="w-36 px-3.5 py-2 bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#262b3f] rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-mono text-xs"
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Triggers low stock alert when product variant inventory drops below this quantity.
                </p>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={savingNotifs}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center space-x-2 shadow-md cursor-pointer transition-colors"
              >
                {savingNotifs ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Save Notification Settings</span>
              </button>

              <button
                type="button"
                onClick={handleTestTelegram}
                disabled={testingNotifs}
                className="px-4 py-2.5 bg-slate-100 dark:bg-[#1e2233] hover:bg-slate-200 dark:hover:bg-[#262b3f] text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl flex items-center space-x-2 border border-slate-200 dark:border-[#262b3f] cursor-pointer transition-colors"
              >
                {testingNotifs ? <Loader2 className="w-4 h-4 animate-spin text-indigo-500" /> : <Send className="w-4 h-4 text-indigo-500" />}
                <span>Send Telegram Test Ping</span>
              </button>

              <button
                type="button"
                onClick={handleSendDailyReportTelegram}
                disabled={sendingDailyReport}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center space-x-2 shadow-md cursor-pointer transition-colors"
              >
                {sendingDailyReport ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                <span>Send Daily Report to Telegram Now</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 6: APPEARANCE */}
      {activeTab === 'appearance' && (
        <div className="bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] rounded-xl p-6 space-y-4 max-w-3xl shadow-2xs">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1">Theme</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Choose how SoleFlow looks for you. Select a theme or follow your system setting.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {/* Light Card */}
            <div 
              onClick={() => handleThemeSelect('light')}
              className={`p-4 rounded-xl border cursor-pointer transition-all relative ${
                selectedTheme === 'light' 
                  ? 'bg-indigo-50/80 dark:bg-[#181b28] border-indigo-600 dark:border-indigo-500 shadow-md' 
                  : 'bg-slate-50 dark:bg-[#141622] border-slate-200 dark:border-[#202436] hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {selectedTheme === 'light' && (
                <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center text-white">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
              )}
              <div className="w-full h-20 bg-slate-100 rounded-lg p-2.5 space-y-2 mb-3 border border-slate-200">
                <div className="w-12 h-2.5 bg-slate-800 rounded-full" />
                <div className="w-20 h-2 bg-slate-300 rounded-full" />
                <div className="w-full h-8 bg-white border border-slate-200 rounded-md" />
              </div>
              <div className="flex items-center space-x-1.5 font-bold text-xs text-slate-900 dark:text-white">
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span>Light</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Clean light interface</p>
            </div>

            {/* Dark Card */}
            <div 
              onClick={() => handleThemeSelect('dark')}
              className={`p-4 rounded-xl border cursor-pointer transition-all relative ${
                selectedTheme === 'dark' 
                  ? 'bg-indigo-50/80 dark:bg-[#181b28] border-indigo-600 dark:border-indigo-500 shadow-md' 
                  : 'bg-slate-50 dark:bg-[#141622] border-slate-200 dark:border-[#202436] hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {selectedTheme === 'dark' && (
                <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center text-white">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
              )}
              <div className="w-full h-20 bg-[#0b0c10] border border-[#1e2233] rounded-lg p-2.5 space-y-2 mb-3">
                <div className="w-12 h-2.5 bg-slate-200 rounded-full" />
                <div className="w-20 h-2 bg-slate-700 rounded-full" />
                <div className="w-full h-8 bg-[#12141e] border border-[#1e2233] rounded-md" />
              </div>
              <div className="flex items-center space-x-1.5 font-bold text-xs text-slate-900 dark:text-white">
                <Moon className="w-3.5 h-3.5 text-indigo-400" />
                <span>Dark</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Easy on the eyes</p>
            </div>

            {/* System Card */}
            <div 
              onClick={() => handleThemeSelect('system')}
              className={`p-4 rounded-xl border cursor-pointer transition-all relative ${
                selectedTheme === 'system' 
                  ? 'bg-indigo-50/80 dark:bg-[#181b28] border-indigo-600 dark:border-indigo-500 shadow-md' 
                  : 'bg-slate-50 dark:bg-[#141622] border-slate-200 dark:border-[#202436] hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {selectedTheme === 'system' && (
                <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center text-white">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
              )}
              <div className="w-full h-20 bg-gradient-to-r from-slate-200 to-[#0b0c10] border border-slate-300 dark:border-[#202436] rounded-lg p-2.5 space-y-2 mb-3">
                <div className="w-12 h-2.5 bg-slate-600 rounded-full" />
                <div className="w-20 h-2 bg-slate-500 rounded-full" />
                <div className="w-full h-8 bg-slate-300/40 dark:bg-slate-400/20 border border-slate-400/30 rounded-md" />
              </div>
              <div className="flex items-center space-x-1.5 font-bold text-xs text-slate-900 dark:text-white">
                <Laptop className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>System</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Follow OS preference</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: SUBSCRIPTION */}
      {activeTab === 'subscription' && (
        <div className="bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] rounded-xl p-6 space-y-5 max-w-2xl shadow-2xs">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">Subscription & License</h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400 font-semibold block mb-1">Current Plan</span>
              <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-bold inline-block">
                Enterprise Suite
              </span>
            </div>

            <div>
              <span className="text-slate-500 dark:text-slate-400 font-semibold block mb-1">License Status</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center space-x-1">
                <ShieldCheck className="w-4 h-4" />
                <span>Active</span>
              </span>
            </div>

            <div>
              <span className="text-slate-500 dark:text-slate-400 font-semibold block mb-1">Store Name</span>
              <span className="text-slate-900 dark:text-slate-200 font-bold">{storeName || 'Fidel Store'}</span>
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-[#181b28] border border-slate-200 dark:border-[#262b3f] rounded-xl text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Your system license is active and synced with cloud servers. Multi-branch inventory, POS checkout, reports analytics, and Telegram notifications are enabled.
          </div>
        </div>
      )}

      {/* ADD USER MODAL */}
      <AnimatePresence>
        {isAddUserModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#12141e] border border-slate-200/80 dark:border-[#1e2233] rounded-2xl w-full max-w-lg p-7 space-y-6 shadow-2xl relative"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">Add User</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Create a new staff account.</p>
                </div>
                <button 
                  onClick={() => setIsAddUserModalOpen(false)} 
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddUser} className="space-y-5 text-xs">
                {/* Phone Number */}
                <div>
                  <label className="font-bold text-xs text-slate-800 dark:text-slate-200 block mb-1.5">
                    Phone Number
                  </label>
                  <input 
                    type="text"
                    value={newUserPhone}
                    onChange={(e) => setNewUserPhone(e.target.value)}
                    placeholder="09XXXXXXXX"
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-[#181b28] border border-slate-200 dark:border-[#262b3f] rounded-xl text-slate-900 dark:text-white text-xs placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 font-mono transition-colors shadow-2xs"
                  />
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 block">
                    Ethiopian mobile format: 09 or 07 followed by 8 digits
                  </span>
                </div>

                {/* Full Name */}
                <div>
                  <label className="font-bold text-xs text-slate-800 dark:text-slate-200 block mb-1.5">
                    Full Name
                  </label>
                  <input 
                    type="text"
                    required
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    placeholder="Full name"
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-[#181b28] border border-slate-200 dark:border-[#262b3f] rounded-xl text-slate-900 dark:text-white text-xs placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 transition-colors shadow-2xs"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="font-bold text-xs text-slate-800 dark:text-slate-200 block mb-1.5">
                    Password
                  </label>
                  <input 
                    type="password"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-[#181b28] border border-slate-200 dark:border-[#262b3f] rounded-xl text-slate-900 dark:text-white text-xs placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 transition-colors shadow-2xs"
                  />
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 block">
                    Minimum 8 characters. Share this with the user to log in.
                  </span>
                </div>

                {/* Roles */}
                <div>
                  <label className="font-bold text-xs text-slate-800 dark:text-slate-200 block mb-2">
                    Roles
                  </label>
                  <div className="flex items-center gap-2.5">
                    {['owner', 'sales', 'cashier'].map((roleOption) => {
                      const isSelected = newUserRole === roleOption;
                      return (
                        <button
                          key={roleOption}
                          type="button"
                          onClick={() => setNewUserRole(roleOption)}
                          className={`px-4 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all ${
                            isSelected 
                              ? 'bg-[#5345ed] text-white shadow-xs' 
                              : 'bg-white dark:bg-[#181b28] border border-slate-200 dark:border-[#262b3f] text-slate-800 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#202436]'
                          }`}
                        >
                          {roleOption}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Branch */}
                <div>
                  <label className="font-bold text-xs text-slate-800 dark:text-slate-200 block mb-1.5">
                    Branch
                  </label>
                  <div className="relative">
                    <select
                      value={newUserBranch}
                      onChange={(e) => setNewUserBranch(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-[#181b28] border border-slate-200 dark:border-[#262b3f] rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:border-indigo-500 transition-colors appearance-none cursor-pointer pr-9 shadow-2xs"
                    >
                      <option value="">Select branch</option>
                      {branchesList.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                  </div>
                </div>

                {/* Submit Action */}
                <div className="pt-3 flex justify-end">
                  <button 
                    type="submit"
                    disabled={addingUser}
                    className="px-6 py-2.5 bg-[#8b92f8] hover:bg-[#6366f1] disabled:opacity-50 text-white font-medium text-xs rounded-xl shadow-xs cursor-pointer flex items-center space-x-2 transition-colors"
                  >
                    {addingUser && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Create User</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADD BRANCH MODAL */}
      <AnimatePresence>
        {isAddBranchModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 dark:bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] rounded-xl w-full max-w-md p-5 space-y-4 shadow-xl"
            >
              <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-[#161926]">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Add New Branch</h3>
                <button onClick={() => setIsAddBranchModalOpen(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddBranch} className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-700 dark:text-slate-400 font-medium">Branch Name</label>
                  <input 
                    type="text"
                    required
                    value={newBranchName}
                    onChange={(e) => setNewBranchName(e.target.value)}
                    placeholder="e.g. Merkato Branch"
                    className="w-full mt-1 px-3 py-1.5 bg-slate-50 dark:bg-[#181b28] border border-slate-200 dark:border-[#262b3f] rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-slate-700 dark:text-slate-400 font-medium">Address</label>
                  <input 
                    type="text"
                    value={newBranchAddress}
                    onChange={(e) => setNewBranchAddress(e.target.value)}
                    placeholder="e.g. Merkato, Addis Ababa"
                    className="w-full mt-1 px-3 py-1.5 bg-slate-50 dark:bg-[#181b28] border border-slate-200 dark:border-[#262b3f] rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-slate-700 dark:text-slate-400 font-medium">Branch Type</label>
                  <select 
                    value={newBranchType}
                    onChange={(e) => setNewBranchType(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 bg-slate-50 dark:bg-[#181b28] border border-slate-200 dark:border-[#262b3f] rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Branch">Branch</option>
                    <option value="Main">Main</option>
                  </select>
                </div>

                <div className="pt-3 flex justify-end space-x-2">
                  <button 
                    type="button" 
                    onClick={() => setIsAddBranchModalOpen(false)}
                    className="px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={addingBranch}
                    className="px-4 py-1.5 bg-[#6366f1] hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-lg shadow-md cursor-pointer flex items-center space-x-1"
                  >
                    {addingBranch && <Loader2 className="w-3 h-3 animate-spin" />}
                    <span>Add Branch</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
