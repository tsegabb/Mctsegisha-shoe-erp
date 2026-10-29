import { useState } from 'react';
import { motion } from 'motion/react';
import { 
  ShoppingCart, 
  AlertTriangle, 
  Clock, 
  Package, 
  Plus, 
  Search,
  User,
  ArrowUpRight,
  TrendingUp,
  Building
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { DashboardStats } from '../types.ts';
import { formatPrice } from '../utils/formatters.ts';

interface DashboardViewProps {
  stats: DashboardStats | null;
  sales?: any[];
  warehouses?: any[];
  selectedBranch?: string;
  loading: boolean;
  onNavigate: (tab: string) => void;
}

export default function DashboardView({ stats, sales, warehouses = [], selectedBranch = 'Main Branch', loading, onNavigate }: DashboardViewProps) {
  const totalProductsCount = stats?.totalStock ?? 0;
  const lowStockCount = stats?.lowStockCount ?? 0;
  const todayRevenue = stats?.dailyRevenue ?? 0;
  const todayTransactionsCount = stats?.dailySalesCount ?? (() => {
    if (!sales || sales.length === 0) return 0;
    const todayStr = new Date().toISOString().substring(0, 10);
    return sales.filter(s => {
      if (!s.createdAt) return false;
      const sDateStr = new Date(s.createdAt).toISOString().substring(0, 10);
      return sDateStr === todayStr;
    }).length;
  })();
  const recentMovements = stats?.recentMovements || [];

  // Calculate 7-day weekly sales from stats.revenueHistory and sales props
  const weeklySalesData = (() => {
    const revMap = new Map<string, number>();

    if (stats?.revenueHistory) {
      stats.revenueHistory.forEach(r => {
        if (r.date) {
          const dateKey = r.date.substring(0, 10);
          revMap.set(dateKey, (revMap.get(dateKey) || 0) + Number(r.revenue || 0));
        }
      });
    }

    if (sales && sales.length > 0) {
      sales.forEach(s => {
        if (s.createdAt) {
          const dateKey = new Date(s.createdAt).toISOString().substring(0, 10);
          const totalVal = Number(s.totalAmount || (s.quantity * s.sellingPrice) || 0);
          if (!revMap.has(dateKey)) {
            revMap.set(dateKey, totalVal);
          }
        }
      });
    }

    const today = new Date();
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const isoDate = d.toISOString().substring(0, 10);
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const salesVal = revMap.get(isoDate) || 0;
      days.push({
        day: dayName,
        date: isoDate,
        sales: salesVal
      });
    }

    return days;
  })();

  const totalWeeklySales = weeklySalesData.reduce((acc, d) => acc + d.sales, 0);

  return (
    <div className="space-y-6 text-slate-900 dark:text-slate-100">

      {/* PAGE TITLE HEADER */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Dashboard</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
          Real-time overview of your shoe inventory & sales operations.
        </p>
      </div>

      {/* 4 STAT CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Today's Revenue */}
        <div className="bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] rounded-xl p-5 flex flex-col justify-between shadow-2xs">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Today&apos;s Revenue</p>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-1.5 flex items-baseline gap-1.5">
                ETB <span className="text-2xl">{formatPrice(todayRevenue)}</span>
              </h2>
            </div>
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-4">
            {todayTransactionsCount} {todayTransactionsCount === 1 ? 'transaction' : 'transactions'}
          </p>
        </div>

        {/* Card 2: Low Stock */}
        <div className="bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] rounded-xl p-5 flex flex-col justify-between shadow-2xs">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Low Stock</p>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-1.5">{lowStockCount}</h2>
            </div>
            <div className="p-2 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-4">products below reorder</p>
        </div>

        {/* Card 3: Out of Stock */}
        <div className="bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] rounded-xl p-5 flex flex-col justify-between shadow-2xs">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Out of Stock</p>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-1.5">0</h2>
            </div>
            <div className="p-2 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-4">variants requiring restock</p>
        </div>

        {/* Card 4: Total Products */}
        <div className="bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] rounded-xl p-5 flex flex-col justify-between shadow-2xs">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Products</p>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-1.5">{totalProductsCount}</h2>
            </div>
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-4">active products</p>
        </div>

      </div>

      {/* MIDDLE SECTION: WEEKLY SALES & QUICK ACTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Weekly Sales Chart Card */}
        <div className="bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] rounded-xl p-5 lg:col-span-2 flex flex-col justify-between min-h-[280px] shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400">Weekly Sales</h3>
              <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                {totalWeeklySales.toLocaleString('en-US')} <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">ETB (Last 7 Days)</span>
              </p>
            </div>
            <span className="text-[11px] px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-full font-medium">
              Live POS Data
            </span>
          </div>

          <div className="h-48 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklySalesData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-[#1e2233]" />
                <XAxis dataKey="day" stroke="#64748b" fontSize={11} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={{ stroke: '#cbd5e1' }} 
                  tickFormatter={(val) => {
                    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
                    if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
                    return `${val}`;
                  }} 
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#181b28', borderRadius: '8px', borderColor: '#262b3f', color: '#fff', fontSize: '12px' }}
                  formatter={(value: any) => [`${Number(value).toLocaleString('en-US')} ETB`, 'Revenue']}
                  labelFormatter={(label, payload) => {
                    const item = payload && payload[0]?.payload;
                    return item ? `${item.day} (${item.date})` : label;
                  }}
                />
                <Area type="monotone" dataKey="sales" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#salesGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Actions Card */}
        <div className="bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] rounded-xl p-5 flex flex-col justify-between shadow-2xs">
          <div>
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-4">Quick Actions</h3>
            
            <div className="space-y-2.5">
              <button 
                onClick={() => onNavigate('pos')} 
                className="w-full py-2.5 px-4 bg-slate-50 dark:bg-[#181b28] hover:bg-slate-100 dark:hover:bg-[#202538] border border-slate-200 dark:border-[#262b3f] text-slate-800 dark:text-white rounded-xl text-xs font-semibold flex items-center space-x-2.5 transition-colors cursor-pointer"
              >
                <ShoppingCart className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>New Sale</span>
              </button>

              <button 
                onClick={() => onNavigate('products')} 
                className="w-full py-2.5 px-4 bg-slate-50 dark:bg-[#181b28] hover:bg-slate-100 dark:hover:bg-[#202538] border border-slate-200 dark:border-[#262b3f] text-slate-800 dark:text-white rounded-xl text-xs font-semibold flex items-center space-x-2.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>Add Product</span>
              </button>

              <button 
                onClick={() => onNavigate('movements')} 
                className="w-full py-2.5 px-4 bg-slate-50 dark:bg-[#181b28] hover:bg-slate-100 dark:hover:bg-[#202538] border border-slate-200 dark:border-[#262b3f] text-slate-800 dark:text-white rounded-xl text-xs font-semibold flex items-center space-x-2.5 transition-colors cursor-pointer"
              >
                <Search className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>Check Stock</span>
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* BOTTOM SECTION: RECENT ACTIVITY & BRANCH COMPARISON */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Recent Activity Card */}
        <div className="bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] rounded-xl p-5 lg:col-span-2 min-h-[160px] shadow-2xs">
          <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-4">Recent Activity</h3>

          {recentMovements.length > 0 ? (
            <div className="space-y-3">
              {recentMovements.map((mv: any, idx: number) => (
                <div key={mv.id || idx} className="flex justify-between items-center text-xs pb-2 border-b border-slate-100 dark:border-[#1a1e2e] last:border-0 last:pb-0">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">{mv.type} - {mv.variant?.productName || mv.variantId}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Quantity: {mv.quantity} ({mv.reason || 'Stock Movement'})</p>
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {mv.createdAt ? new Date(mv.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-slate-500 py-4 text-center">
              No recent stock activity logged yet.
            </div>
          )}
        </div>

        {/* Branch Comparison Card */}
        <div className="bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] rounded-xl p-5 flex flex-col justify-between min-h-[160px] shadow-2xs">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400">Branch Overview</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50">
                Active: {selectedBranch}
              </span>
            </div>
            
            <div className="space-y-2.5 pt-1">
              {warehouses.length > 0 ? (
                warehouses.slice(0, 4).map((wh: any) => {
                  const isSelected = selectedBranch === wh.name;
                  return (
                    <div 
                      key={wh.id} 
                      className={`p-2.5 rounded-lg border text-xs flex items-center justify-between transition-colors ${
                        isSelected 
                          ? 'bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800/60 font-semibold text-indigo-900 dark:text-indigo-200' 
                          : 'bg-slate-50 dark:bg-[#161824] border-slate-100 dark:border-[#1a1e2e] text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <Building className={`w-3.5 h-3.5 ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                        <div>
                          <p className="font-bold leading-tight">{wh.name}</p>
                          <p className="text-[10px] text-slate-400 font-normal">{wh.location || wh.code}</p>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                        Cap: {wh.capacity || 500}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="p-2.5 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 text-xs">
                  <p className="font-bold text-indigo-900 dark:text-indigo-200">{selectedBranch}</p>
                  <p className="text-[10px] text-indigo-600 dark:text-indigo-400 mt-0.5">Active Store Branch</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}


