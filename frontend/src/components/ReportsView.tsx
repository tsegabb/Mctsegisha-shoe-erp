import { useState, useEffect } from 'react';
import { 
  Download, 
  BarChart3, 
  TrendingUp, 
  AlertTriangle,
  TrendingDown,
  Activity,
  RefreshCw,
  PieChart as PieChartIcon,
  Layers,
  ShoppingBag,
  Bot,
  Loader2
} from 'lucide-react';
import { settingsService } from '../services/settings.service.ts';
import { formatPrice } from '../utils/formatters.ts';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Sale, StockMovement, Product, Warehouse, Variant } from '../types.ts';

interface ReportsViewProps {
  sales?: Sale[];
  movements?: StockMovement[];
  products?: Product[];
  variants?: Variant[];
  warehouses?: Warehouse[];
  onNavigate?: (tab: string) => void;
  triggerToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
  onRefresh?: () => void;
}

const CATEGORY_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];

export default function ReportsView({ 
  sales = [], 
  movements = [], 
  products = [],
  variants = [],
  triggerToast,
  onRefresh
}: ReportsViewProps) {
  const [activeTab, setActiveTab] = useState<'sales' | 'profit' | 'expiry' | 'lowstock' | 'activity'>('sales');
  
  // Dynamic default dates: last 30 days up to today
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().substring(0, 10);
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [groupBy, setGroupBy] = useState<'Day' | 'Week' | 'Month'>('Day');
  const [sendingTelegram, setSendingTelegram] = useState(false);

  const handleSendTelegramReport = async () => {
    setSendingTelegram(true);
    try {
      const res = await settingsService.sendDailyReportTelegram();
      if (res.success) {
        if (triggerToast) triggerToast('Daily sales & inventory report dispatched to Telegram bot!', 'success');
      } else {
        if (triggerToast) triggerToast(res.error || 'Please configure Telegram Bot token & Chat ID in Settings first.', 'error');
      }
    } catch (err: any) {
      if (triggerToast) triggerToast(err.message || 'Failed to dispatch report to Telegram', 'error');
    } finally {
      setSendingTelegram(false);
    }
  };

  // Sync data automatically on load
  useEffect(() => {
    if (onRefresh) {
      onRefresh();
    }
  }, []);

  const parseDateStr = (str: string, endOfDay = false) => {
    if (!str) return endOfDay ? Infinity : 0;
    const date = new Date(str + (endOfDay ? 'T23:59:59' : 'T00:00:00'));
    return date.getTime();
  };

  const startMs = parseDateStr(fromDate, false);
  const endMs = parseDateStr(toDate, true);

  // Strictly filter sales by date range
  const activeSales = sales.filter(s => {
    if (!s.createdAt) return true;
    const sMs = new Date(s.createdAt).getTime();
    if (isNaN(sMs)) return true;
    return sMs >= startMs && sMs <= endMs;
  });

  // Quick Date Range Helpers
  const setPresetRange = (days: number) => {
    const today = new Date();
    const past = new Date();
    past.setDate(today.getDate() - days);
    setFromDate(past.toISOString().substring(0, 10));
    setToDate(today.toISOString().substring(0, 10));
  };

  // Calculate totals from real filtered sales
  const totalRevenue = activeSales.reduce((acc, s) => {
    const rev = s.totalAmount || (s.quantity * (s.sellingPrice || 0));
    return acc + Number(rev || 0);
  }, 0);

  const totalCost = activeSales.reduce((acc, s) => {
    const cost = s.quantity * (s.unitCost || s.costPrice || (s.sellingPrice ? s.sellingPrice * 0.6 : 0));
    return acc + Number(cost || 0);
  }, 0);

  const totalProfit = activeSales.reduce((acc, s) => {
    const rev = s.totalAmount || (s.quantity * (s.sellingPrice || 0));
    const cost = s.quantity * (s.unitCost || s.costPrice || (s.sellingPrice ? s.sellingPrice * 0.6 : 0));
    const profit = s.profit !== undefined && s.profit !== null ? s.profit : (rev - cost);
    return acc + Number(profit || 0);
  }, 0);

  const numDays = Math.max(1, Math.round((endMs - startMs) / (1000 * 3600 * 24)));
  const avgDailySales = totalRevenue / numDays;

  // Group sales by selected GroupBy option
  const groupedSalesMap = new Map<string, {
    key: string;
    timestamp: number;
    dateLabel: string;
    chartLabel: string;
    salesCount: number;
    revenue: number;
    cost: number;
    profit: number;
    margin: number;
  }>();

  activeSales.forEach(s => {
    const dObj = s.createdAt ? new Date(s.createdAt) : new Date();
    let key = dObj.toISOString().substring(0, 10);
    let label = dObj.toLocaleDateString('en-US');
    let chartLabel = dObj.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
    let timestamp = dObj.getTime();

    if (groupBy === 'Week') {
      const day = dObj.getDay();
      const diff = dObj.getDate() - day + (day === 0 ? -6 : 1);
      const weekStart = new Date(dObj);
      weekStart.setDate(diff);
      key = `Week_${weekStart.toISOString().substring(0, 10)}`;
      label = `Week of ${weekStart.toLocaleDateString('en-US', { month: 'short', day: '2-digit' })}`;
      chartLabel = `Wk ${weekStart.toLocaleDateString('en-US', { month: 'short', day: '2-digit' })}`;
      timestamp = weekStart.getTime();
    } else if (groupBy === 'Month') {
      key = `${dObj.getFullYear()}-${String(dObj.getMonth() + 1).padStart(2, '0')}`;
      label = dObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      chartLabel = dObj.toLocaleDateString('en-US', { month: 'short' });
      timestamp = new Date(dObj.getFullYear(), dObj.getMonth(), 1).getTime();
    }

    const rev = Number(s.totalAmount || (s.quantity * (s.sellingPrice || 0)) || 0);
    const cost = Number(s.quantity * (s.unitCost || s.costPrice || (s.sellingPrice ? s.sellingPrice * 0.6 : 0)));
    const prf = s.profit !== undefined && s.profit !== null ? Number(s.profit) : (rev - cost);

    if (!groupedSalesMap.has(key)) {
      groupedSalesMap.set(key, {
        key,
        timestamp,
        dateLabel: label,
        chartLabel,
        salesCount: Number(s.quantity || 1),
        revenue: rev,
        cost,
        profit: prf,
        margin: 0
      });
    } else {
      const item = groupedSalesMap.get(key)!;
      item.salesCount += Number(s.quantity || 1);
      item.revenue += rev;
      item.cost += cost;
      item.profit += prf;
    }
  });

  // Sort chronologically for table and chart
  const groupedRows = Array.from(groupedSalesMap.values())
    .sort((a, b) => a.timestamp - b.timestamp)
    .map(r => ({
      ...r,
      margin: r.revenue > 0 ? (r.profit / r.revenue) * 100 : 0
    }));

  // --- RECHARTS TRENDS ANALYSIS CALCULATIONS ---
  // 1. Weekly Sales Volume
  const weeklyVolumeMap = new Map<string, { weekLabel: string; volume: number; revenue: number; ordersCount: number; timestamp: number }>();

  activeSales.forEach(s => {
    const dObj = s.createdAt ? new Date(s.createdAt) : new Date();
    const day = dObj.getDay();
    const diff = dObj.getDate() - day + (day === 0 ? -6 : 1);
    const weekStart = new Date(dObj);
    weekStart.setDate(diff);
    
    const key = `Week_${weekStart.toISOString().substring(0, 10)}`;
    const weekLabel = `Wk ${weekStart.toLocaleDateString('en-US', { month: 'short', day: '2-digit' })}`;
    const timestamp = weekStart.getTime();
    
    const qty = Number(s.quantity || 1);
    const rev = Number(s.totalAmount || (s.quantity * (s.sellingPrice || 0)) || 0);

    if (!weeklyVolumeMap.has(key)) {
      weeklyVolumeMap.set(key, { weekLabel, volume: qty, revenue: rev, ordersCount: 1, timestamp });
    } else {
      const item = weeklyVolumeMap.get(key)!;
      item.volume += qty;
      item.revenue += rev;
      item.ordersCount += 1;
    }
  });

  const weeklyVolumeData = Array.from(weeklyVolumeMap.values()).sort((a, b) => a.timestamp - b.timestamp);

  // 2. Top Performing Product Categories
  const categoryDataMap = new Map<string, { category: string; unitsSold: number; revenue: number }>();

  activeSales.forEach(s => {
    let catName = 'Uncategorized';
    const variant = variants.find(v => v.id === s.variantId || v.id === s.variant?.id);
    if (variant) {
      const prod = products.find(p => p.id === variant.productId);
      if (prod && prod.category) {
        catName = prod.category;
      } else if (variant.productName) {
        const pLower = variant.productName.toLowerCase();
        if (pLower.includes('running') || pLower.includes('marathon')) catName = 'Running';
        else if (pLower.includes('jordan') || pLower.includes('dunk') || pLower.includes('basketball')) catName = 'Basketball';
        else if (pLower.includes('boot') || pLower.includes('leather')) catName = 'Boots';
        else if (pLower.includes('casual') || pLower.includes('canvas')) catName = 'Casual';
        else catName = 'Sneakers';
      }
    } else {
      catName = 'Sneakers';
    }

    const qty = Number(s.quantity || 1);
    const rev = Number(s.totalAmount || (s.quantity * (s.sellingPrice || 0)) || 0);

    if (!categoryDataMap.has(catName)) {
      categoryDataMap.set(catName, { category: catName, unitsSold: qty, revenue: rev });
    } else {
      const cur = categoryDataMap.get(catName)!;
      cur.unitsSold += qty;
      cur.revenue += rev;
    }
  });

  // Top Performing Product Categories
  let topCategories = Array.from(categoryDataMap.values()).sort((a, b) => b.revenue - a.revenue);
  if (topCategories.length === 0) {
    const catalogCats = new Map<string, number>();
    products.forEach(p => {
      const cat = p.category || 'Sneakers';
      catalogCats.set(cat, (catalogCats.get(cat) || 0) + 1);
    });
    topCategories = Array.from(catalogCats.entries()).map(([cat]) => ({
      category: cat,
      unitsSold: 0,
      revenue: 0
    }));
  }

  // Low stock calculation from real variants
  const lowStockVariants = variants.filter(v => v.currentStock <= ((v as any).reorderLevel || 15));
  const criticalStockVariants = variants.filter(v => v.currentStock <= 5);

  const handleExportCSV = () => {
    let csvData = '';
    const filename = `report_${activeTab}_${fromDate}_to_${toDate}.csv`;

    if (activeTab === 'sales' || activeTab === 'profit') {
      csvData = 'Date/Group,Sales Qty,Revenue (ETB),Cost (ETB),Profit (ETB),Margin (%)\n';
      groupedRows.forEach(r => {
        csvData += `"${r.dateLabel}",${r.salesCount},${r.revenue.toFixed(2)},${r.cost.toFixed(2)},${r.profit.toFixed(2)},${r.margin.toFixed(1)}%\n`;
      });
    } else if (activeTab === 'expiry') {
      csvData = 'Product Name,SKU,Size/Color,Stock,Status\n';
      criticalStockVariants.forEach(v => {
        csvData += `"${v.productName || 'Shoe'}","${v.sku}","${v.size || ''} ${v.color || ''}",${v.currentStock},${v.currentStock <= 0 ? 'Out of Stock' : 'Critical Stock'}\n`;
      });
    } else if (activeTab === 'lowstock') {
      csvData = 'Product Name,SKU,Current Stock,Status\n';
      lowStockVariants.forEach(v => {
        csvData += `"${v.productName || 'Shoe'}","${v.sku}",${v.currentStock},Low Stock\n`;
      });
    } else {
      csvData = 'Timestamp,Type,Quantity,Variant/Product ID,Reason\n';
      movements.forEach(m => {
        csvData += `${new Date(m.createdAt).toLocaleString()},${m.type},${m.quantity},"${m.productId || m.variantId}","${m.reason || ''}"\n`;
      });
    }

    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (triggerToast) {
      triggerToast(`Exported ${activeTab.toUpperCase()} report CSV`, 'success');
    }
  };

  return (
    <div className="space-y-5 text-slate-900 dark:text-slate-100">
      
      {/* PAGE TITLE & AUTO-SYNC HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Reports & Analytics</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Real-time synced metrics and visual trends for store management.</p>
        </div>
        {onRefresh && (
          <button 
            onClick={() => {
              onRefresh();
              if (triggerToast) triggerToast('Reports data synced with POS!', 'info');
            }}
            className="px-3 py-1.5 bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] hover:bg-slate-50 dark:hover:bg-[#181b28] text-xs font-semibold text-slate-700 dark:text-slate-300 rounded-xl flex items-center space-x-1.5 cursor-pointer transition-colors shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
            <span>Sync Live Data</span>
          </button>
        )}
      </div>

      {/* TOP TAB PILLS */}
      <div className="flex items-center space-x-1.5 p-1 bg-slate-100 dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] rounded-xl w-fit text-xs overflow-x-auto">
        <button
          onClick={() => setActiveTab('sales')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer flex items-center space-x-1.5 ${
            activeTab === 'sales' 
              ? 'bg-white dark:bg-[#1e2233] text-indigo-600 dark:text-white shadow-xs' 
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Sales</span>
        </button>
        <button
          onClick={() => setActiveTab('profit')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer flex items-center space-x-1.5 ${
            activeTab === 'profit' 
              ? 'bg-white dark:bg-[#1e2233] text-indigo-600 dark:text-white shadow-xs' 
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Profit</span>
        </button>
        <button
          onClick={() => setActiveTab('expiry')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer flex items-center space-x-1.5 ${
            activeTab === 'expiry' 
              ? 'bg-white dark:bg-[#1e2233] text-indigo-600 dark:text-white shadow-xs' 
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Stock Alerts</span>
        </button>
        <button
          onClick={() => setActiveTab('lowstock')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer flex items-center space-x-1.5 ${
            activeTab === 'lowstock' 
              ? 'bg-white dark:bg-[#1e2233] text-indigo-600 dark:text-white shadow-xs' 
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <TrendingDown className="w-3.5 h-3.5" />
          <span>Low Stock ({variants.filter(v => v.currentStock <= 15).length})</span>
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer flex items-center space-x-1.5 ${
            activeTab === 'activity' 
              ? 'bg-white dark:bg-[#1e2233] text-indigo-600 dark:text-white shadow-xs' 
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Activity</span>
        </button>
      </div>

      {/* FULLY FUNCTIONAL FILTER TOOLBAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] p-3.5 rounded-xl shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="space-y-1">
            <label className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">From</label>
            <input 
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
              className="bg-slate-50 dark:bg-[#181b28] border border-slate-200 dark:border-[#262b3f] rounded-xl pl-3 pr-2 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 w-36 font-mono cursor-pointer"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">To</label>
            <input 
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
              className="bg-slate-50 dark:bg-[#181b28] border border-slate-200 dark:border-[#262b3f] rounded-xl pl-3 pr-2 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 w-36 font-mono cursor-pointer"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">Group By</label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as any)}
              className="bg-slate-50 dark:bg-[#181b28] border border-slate-200 dark:border-[#262b3f] rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer pr-7 font-medium"
            >
              <option value="Day">Day</option>
              <option value="Week">Week</option>
              <option value="Month">Month</option>
            </select>
          </div>

          {/* PRESET DATE BUTTONS */}
          <div className="space-y-1">
            <label className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">Quick Presets</label>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setPresetRange(7)}
                className="px-2.5 py-1.5 bg-slate-100 dark:bg-[#181b28] hover:bg-slate-200 dark:hover:bg-[#202538] border border-slate-200 dark:border-[#262b3f] text-[11px] text-slate-700 dark:text-slate-300 rounded-lg transition-colors cursor-pointer"
              >
                7 Days
              </button>
              <button
                onClick={() => setPresetRange(30)}
                className="px-2.5 py-1.5 bg-slate-100 dark:bg-[#181b28] hover:bg-slate-200 dark:hover:bg-[#202538] border border-slate-200 dark:border-[#262b3f] text-[11px] text-slate-700 dark:text-slate-300 rounded-lg transition-colors cursor-pointer"
              >
                30 Days
              </button>
              <button
                onClick={() => setPresetRange(90)}
                className="px-2.5 py-1.5 bg-slate-100 dark:bg-[#181b28] hover:bg-slate-200 dark:hover:bg-[#202538] border border-slate-200 dark:border-[#262b3f] text-[11px] text-slate-700 dark:text-slate-300 rounded-lg transition-colors cursor-pointer"
              >
                90 Days
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-auto">
          <button 
            onClick={handleSendTelegramReport}
            disabled={sendingTelegram}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
          >
            {sendingTelegram ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bot className="w-3.5 h-3.5" />}
            <span>Send to Telegram</span>
          </button>

          <button 
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* 3 SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] rounded-xl p-4 shadow-xs">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Revenue</p>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-2 font-mono tracking-wider">
            ETB {totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h2>
        </div>

        <div className="bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] rounded-xl p-4 shadow-xs">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Profit</p>
          <h2 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-2 font-mono tracking-wider">
            ETB {totalProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h2>
        </div>

        <div className="bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] rounded-xl p-4 shadow-xs">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Avg Daily Sales ({numDays} days)</p>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-2 font-mono tracking-wider">
            ETB {avgDailySales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h2>
        </div>
      </div>

      {/* REVENUE VS PROFIT BAR CHART CARD */}
      <div className="bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400">Revenue & Profit Performance</h3>
            <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
              Grouped by {groupBy} ({fromDate} to {toDate})
            </p>
          </div>
          <span className="text-[11px] px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full font-medium">
            Live Analytics
          </span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={groupedRows} margin={{ top: 15, right: 15, left: -10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" vertical={false} />
              <XAxis 
                dataKey="chartLabel" 
                stroke="#64748b" 
                fontSize={11} 
                tickLine={false} 
                axisLine={false} 
              />
              <YAxis 
                stroke="#64748b" 
                fontSize={11} 
                tickLine={false} 
                axisLine={false}
                tickFormatter={(val) => {
                  if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
                  if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
                  return `${val}`;
                }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(15, 23, 42, 0.92)', 
                  borderRadius: '12px', 
                  borderColor: '#334155', 
                  color: '#fff', 
                  fontSize: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)' 
                }}
                formatter={(value: any, name: string) => [
                  `${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB`, 
                  name === 'revenue' ? 'Revenue' : 'Profit'
                ]}
                labelFormatter={(label, payload) => {
                  const item = payload && payload[0]?.payload;
                  return item ? item.dateLabel : label;
                }}
              />
              <Legend 
                verticalAlign="bottom" 
                height={32} 
                iconType="square"
                formatter={(value) => <span className="text-xs text-slate-600 dark:text-slate-300 font-medium capitalize">{value}</span>}
              />
              <Bar 
                dataKey="revenue" 
                name="Revenue" 
                fill="#6366f1" 
                radius={[4, 4, 0, 0]} 
                maxBarSize={36} 
              />
              <Bar 
                dataKey="profit" 
                name="Profit" 
                fill="#10b981" 
                radius={[4, 4, 0, 0]} 
                maxBarSize={36} 
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* VISUAL TRENDS ANALYSIS SECTION (Recharts) */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center space-x-2">
          <PieChartIcon className="w-5 h-5 text-indigo-500" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Visual Trends Analysis</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          
          {/* CHART 1: WEEKLY SALES VOLUME */}
          <div className="bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] rounded-xl p-5 shadow-xs flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400">Sales Volume Trend</h3>
                <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">Weekly Sales Volume (Units Sold)</p>
              </div>
              <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 rounded-lg text-indigo-600 dark:text-indigo-400">
                <ShoppingBag className="w-4 h-4" />
              </div>
            </div>

            <div className="h-60 w-full mt-auto">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyVolumeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" vertical={false} />
                  <XAxis dataKey="weekLabel" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(15, 23, 42, 0.92)', 
                      borderRadius: '12px', 
                      borderColor: '#334155', 
                      color: '#fff', 
                      fontSize: '12px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)' 
                    }}
                    formatter={(value: any, name: string) => [
                      `${value} Pairs Sold`, 
                      'Volume'
                    ]}
                  />
                  <Area type="monotone" dataKey="volume" name="Units Sold" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorVolume)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-[#1e2233] flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Total Volume: <strong className="text-slate-800 dark:text-slate-200 font-mono">{weeklyVolumeData.reduce((a, b) => a + b.volume, 0)} Units</strong></span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">↑ High Turnover</span>
            </div>
          </div>

          {/* CHART 2: TOP-PERFORMING PRODUCT CATEGORIES */}
          <div className="bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] rounded-xl p-5 shadow-xs flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400">Category Breakdown</h3>
                <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">Top-Performing Product Categories</p>
              </div>
              <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg text-emerald-600 dark:text-emerald-400">
                <Layers className="w-4 h-4" />
              </div>
            </div>

            <div className="h-60 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={topCategories}
                    dataKey="revenue"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    label={({ category, percent }) => `${category} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {topCategories.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(15, 23, 42, 0.92)', 
                      borderRadius: '12px', 
                      borderColor: '#334155', 
                      color: '#fff', 
                      fontSize: '12px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)' 
                    }}
                    formatter={(val: any) => [`${Number(val).toLocaleString()} ETB`, 'Revenue']}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle"
                    formatter={(val) => <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">{val}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-[#1e2233] flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Categories Tracked: <strong className="text-slate-800 dark:text-slate-200 font-mono">{topCategories.length}</strong></span>
              <span>Leading: <strong className="text-indigo-600 dark:text-indigo-400 font-semibold">{topCategories[0]?.category || 'Sneakers'}</strong></span>
            </div>
          </div>

        </div>
      </div>

      {/* DATA TABLE CONTAINER */}
      <div className="bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] rounded-xl overflow-hidden min-h-[300px] shadow-xs">
        
        {/* SALES TAB */}
        {activeTab === 'sales' && (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-[#161926] text-slate-500 dark:text-slate-400 font-semibold uppercase text-[10px] tracking-wider bg-slate-50 dark:bg-[#181b28]">
                <th className="p-4 pl-6">DATE / PERIOD</th>
                <th className="p-4">SALES QTY</th>
                <th className="p-4">REVENUE</th>
                <th className="p-4">EST. COST</th>
                <th className="p-4">PROFIT</th>
                <th className="p-4 pr-6 text-right">MARGIN %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#1a1e2e] font-medium text-slate-800 dark:text-slate-200">
              {groupedRows.length > 0 ? (
                groupedRows.map((row) => (
                  <tr key={row.key} className="hover:bg-slate-50 dark:hover:bg-[#181b28] transition-colors">
                    <td className="p-4 pl-6 text-slate-900 dark:text-slate-300 font-mono font-bold">
                      {row.dateLabel}
                    </td>
                    <td className="p-4 font-mono">{row.salesCount}</td>
                    <td className="p-4 font-bold text-slate-900 dark:text-white font-mono">{formatPrice(row.revenue, true)} ETB</td>
                    <td className="p-4 text-slate-500 dark:text-slate-400 font-mono">{formatPrice(row.cost, true)} ETB</td>
                    <td className="p-4 text-emerald-600 dark:text-emerald-400 font-bold font-mono">{formatPrice(row.profit, true)} ETB</td>
                    <td className="p-4 pr-6 text-right font-mono font-bold text-slate-700 dark:text-slate-300">{row.margin.toFixed(1)}%</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-16 text-center text-slate-500 font-medium">
                    No sales recorded for the selected date range ({fromDate} to {toDate}).
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {/* PROFIT TAB */}
        {activeTab === 'profit' && (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-[#161926] text-slate-500 dark:text-slate-400 font-semibold uppercase text-[10px] tracking-wider bg-slate-50 dark:bg-[#181b28]">
                <th className="p-4 pl-6">DATE / PERIOD</th>
                <th className="p-4">REVENUE</th>
                <th className="p-4">COGS</th>
                <th className="p-4">GROSS PROFIT</th>
                <th className="p-4 pr-6 text-right">MARGIN %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#1a1e2e] font-medium text-slate-800 dark:text-slate-200">
              {groupedRows.length > 0 ? (
                groupedRows.map((row) => (
                  <tr key={row.key} className="hover:bg-slate-50 dark:hover:bg-[#181b28] transition-colors">
                    <td className="p-4 pl-6 text-slate-900 dark:text-slate-300 font-mono font-bold">
                      {row.dateLabel}
                    </td>
                    <td className="p-4 font-bold text-slate-900 dark:text-white font-mono">{formatPrice(row.revenue, true)} ETB</td>
                    <td className="p-4 text-slate-500 dark:text-slate-400 font-mono">{formatPrice(row.cost, true)} ETB</td>
                    <td className="p-4 text-emerald-600 dark:text-emerald-400 font-bold font-mono">{formatPrice(row.profit, true)} ETB</td>
                    <td className="p-4 pr-6 text-right font-mono font-bold text-slate-700 dark:text-slate-300">{row.margin.toFixed(1)}%</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-16 text-center text-slate-500 font-medium">
                    No profit data recorded for the selected period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {/* STOCK ALERTS / EXPIRY TAB */}
        {activeTab === 'expiry' && (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-[#161926] text-slate-500 dark:text-slate-400 font-semibold uppercase text-[10px] tracking-wider bg-slate-50 dark:bg-[#181b28]">
                <th className="p-4 pl-6">SHOE MODEL</th>
                <th className="p-4">SKU</th>
                <th className="p-4">SIZE / COLOR</th>
                <th className="p-4">STOCK</th>
                <th className="p-4 pr-6 text-right">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#1a1e2e] font-medium text-slate-800 dark:text-slate-200">
              {criticalStockVariants.length > 0 ? (
                criticalStockVariants.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-[#181b28] transition-colors">
                    <td className="p-4 pl-6 font-bold text-slate-900 dark:text-white">{item.productName || 'Shoe Model'}</td>
                    <td className="p-4 font-mono text-slate-500 dark:text-slate-400">{item.sku}</td>
                    <td className="p-4 text-slate-700 dark:text-slate-300">{item.size || 'EU Standard'} - {item.color || 'Standard'}</td>
                    <td className="p-4 font-mono text-rose-600 dark:text-rose-400 font-bold">{item.currentStock}</td>
                    <td className="p-4 pr-6 text-right">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        item.currentStock <= 0 
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20' 
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                      }`}>
                        {item.currentStock <= 0 ? 'Out of Stock' : 'Critical Low'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-16 text-center text-slate-500 font-medium">
                    All inventory levels are currently healthy!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {/* LOW STOCK TAB */}
        {activeTab === 'lowstock' && (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-[#161926] text-slate-500 dark:text-slate-400 font-semibold uppercase text-[10px] tracking-wider bg-slate-50 dark:bg-[#181b28]">
                <th className="p-4 pl-6">SHOE MODEL</th>
                <th className="p-4">SKU</th>
                <th className="p-4">CURRENT STOCK</th>
                <th className="p-4">UNIT PRICE</th>
                <th className="p-4 pr-6 text-right">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#1a1e2e] font-medium text-slate-800 dark:text-slate-200">
              {lowStockVariants.length > 0 ? (
                lowStockVariants.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-[#181b28] transition-colors">
                    <td className="p-4 pl-6 font-bold text-slate-900 dark:text-white">{item.productName || 'Shoe Model'}</td>
                    <td className="p-4 font-mono text-slate-500 dark:text-slate-400">{item.sku}</td>
                    <td className="p-4 font-mono font-bold text-rose-600 dark:text-rose-400">{item.currentStock}</td>
                    <td className="p-4 font-mono text-slate-700 dark:text-slate-300">{formatPrice(item.price, true)} ETB</td>
                    <td className="p-4 pr-6 text-right">
                      <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-[10px] font-semibold">
                        Reorder Needed
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-16 text-center text-slate-500 font-medium">
                    No items currently require reordering.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {/* ACTIVITY TAB */}
        {activeTab === 'activity' && (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-[#161926] text-slate-500 dark:text-slate-400 font-semibold uppercase text-[10px] tracking-wider bg-slate-50 dark:bg-[#181b28]">
                <th className="p-4 pl-6">TIMESTAMP</th>
                <th className="p-4">MOVEMENT TYPE</th>
                <th className="p-4">QUANTITY</th>
                <th className="p-4">REASON</th>
                <th className="p-4 pr-6 text-right">LOGGED BY</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#1a1e2e] font-medium text-slate-800 dark:text-slate-200">
              {movements.length > 0 ? (
                movements.map((mov) => (
                  <tr key={mov.id} className="hover:bg-slate-50 dark:hover:bg-[#181b28] transition-colors">
                    <td className="p-4 pl-6 text-slate-700 dark:text-slate-300 font-mono">
                      {mov.createdAt ? new Date(mov.createdAt).toLocaleString() : 'Recent'}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        String(mov.type).toUpperCase().includes('IN')
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : String(mov.type).toUpperCase().includes('OUT') || String(mov.type).toUpperCase().includes('SALE')
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                          : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                      }`}>
                        {mov.type}
                      </span>
                    </td>
                    <td className="p-4 font-mono font-bold text-slate-900 dark:text-white">{mov.quantity}</td>
                    <td className="p-4 text-slate-700 dark:text-slate-300">{mov.reason || 'General inventory update'}</td>
                    <td className="p-4 pr-6 text-right font-mono text-slate-500 dark:text-slate-400">{mov.createdBy || 'System'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-16 text-center text-slate-500 font-medium">
                    No recent inventory activity recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

      </div>

    </div>
  );
}
