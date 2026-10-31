import { useState, FormEvent, useEffect, useCallback } from 'react';
import { 
  Wallet, 
  ArrowUpRight, 
  CreditCard, 
  Building2, 
  CheckCircle2, 
  RefreshCw,
  Banknote,
  Edit2,
  X,
  Loader2,
  History
} from 'lucide-react';
import { cashService, CashSummary } from '../services/cash.service.ts';
import { formatPrice } from '../utils/formatters.ts';

interface CashManagementViewProps {
  selectedBranch?: string;
  triggerToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export default function CashManagementView({ selectedBranch = 'Main Branch', triggerToast }: CashManagementViewProps) {
  const [summary, setSummary] = useState<CashSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Cash Drop Form State
  const [cashDropAmount, setCashDropAmount] = useState('');
  const [dropNote, setDropNote] = useState('');
  const [submittingDrop, setSubmittingDrop] = useState(false);

  // Set Opening Float Modal State
  const [isFloatModalOpen, setIsFloatModalOpen] = useState(false);
  const [newFloatAmount, setNewFloatAmount] = useState('');
  const [floatNote, setFloatNote] = useState('');
  const [submittingFloat, setSubmittingFloat] = useState(false);

  // Fetch summary from backend database
  const loadCashSummary = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await cashService.getSummary(selectedBranch);
      if (res.success && res.data) {
        setSummary(res.data);
      } else {
        if (triggerToast) triggerToast(res.message || 'Failed to load cash summary', 'error');
      }
    } catch (err: any) {
      console.error('Failed to fetch cash summary:', err);
      if (triggerToast) triggerToast('Error connecting to backend server', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedBranch, triggerToast]);

  useEffect(() => {
    loadCashSummary();
  }, [loadCashSummary]);

  // Handle Cash Drop Submit
  const handleCashDrop = async (e: FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(cashDropAmount);
    if (isNaN(amt) || amt <= 0) {
      if (triggerToast) triggerToast('Please enter a valid cash drop amount', 'error');
      return;
    }

    const available = summary?.currentRegisterCash || 0;
    if (amt > available) {
      if (triggerToast) triggerToast(`Cash drop (${formatPrice(amt, true)} ETB) cannot exceed current register cash (${formatPrice(available, true)} ETB)`, 'error');
      return;
    }

    setSubmittingDrop(true);
    try {
      const res = await cashService.recordCashDrop({
        amount: amt,
        note: dropNote.trim() || 'Mid-day cash drop to bank vault',
        shopId: selectedBranch
      });

      if (res.success && res.data) {
        setSummary(res.data);
        setCashDropAmount('');
        setDropNote('');
        if (triggerToast) triggerToast(`Cash drop of ${amt.toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB processed successfully!`, 'success');
      } else {
        if (triggerToast) triggerToast(res.message || 'Failed to process cash drop', 'error');
      }
    } catch (err: any) {
      console.error('Error recording cash drop:', err);
      if (triggerToast) triggerToast('Server error recording cash drop', 'error');
    } finally {
      setSubmittingDrop(false);
    }
  };

  // Handle Set Opening Float Submit
  const handleSetFloat = async (e: FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(newFloatAmount);
    if (isNaN(amt) || amt < 0) {
      if (triggerToast) triggerToast('Please enter a valid non-negative float amount', 'error');
      return;
    }

    setSubmittingFloat(true);
    try {
      const res = await cashService.setOpeningFloat({
        amount: amt,
        note: floatNote.trim() || 'Opening shift float update',
        shopId: selectedBranch
      });

      if (res.success && res.data) {
        setSummary(res.data);
        setIsFloatModalOpen(false);
        setNewFloatAmount('');
        setFloatNote('');
        if (triggerToast) triggerToast(`Opening register float updated to ${amt.toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB`, 'success');
      } else {
        if (triggerToast) triggerToast(res.message || 'Failed to update float', 'error');
      }
    } catch (err: any) {
      console.error('Error updating float:', err);
      if (triggerToast) triggerToast('Server error updating float', 'error');
    } finally {
      setSubmittingFloat(false);
    }
  };

  const currentRegisterCash = summary?.currentRegisterCash ?? 0;
  const todaysCashSales = summary?.todaysCashSales ?? 0;
  const todaysDigitalSales = summary?.todaysDigitalSales ?? 0;
  const todaysTelebirrSales = summary?.todaysTelebirrSales ?? 0;
  const todaysCbeBirrSales = summary?.todaysCbeBirrSales ?? 0;
  const todaysOtherDigitalSales = summary?.todaysOtherDigitalSales ?? 0;

  const historicalCashSales = summary?.historicalCashSales ?? 0;
  const historicalDigitalSales = summary?.historicalDigitalSales ?? 0;
  const historicalTelebirrSales = summary?.historicalTelebirrSales ?? 0;
  const historicalCbeBirrSales = summary?.historicalCbeBirrSales ?? 0;
  const historicalOtherDigitalSales = summary?.historicalOtherDigitalSales ?? 0;

  const openingFloat = summary?.openingFloat ?? 5000;
  const activities = summary?.activities ?? [];

  return (
    <div className="space-y-6 text-slate-900 dark:text-slate-100">
      
      {/* HEADER WITH REFRESH & BRANCH LABEL */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2">
            <span>Cash & Branch Drawer Management</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Monitor daily register floats, opening/closing balances, cash drops, and live POS drawer activity.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => loadCashSummary(true)}
            disabled={refreshing || loading}
            className="px-3.5 py-2 bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-semibold text-xs rounded-xl flex items-center space-x-2 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-500' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh Live Data'}</span>
          </button>

          <button
            onClick={() => {
              setNewFloatAmount(String(openingFloat));
              setFloatNote('');
              setIsFloatModalOpen(true);
            }}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center space-x-2 transition-colors cursor-pointer shadow-md"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Set Register Float</span>
          </button>
        </div>
      </div>

      {/* CASH OVERVIEW CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Card 1: Current Register Cash */}
        <div className="bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] rounded-xl p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Current Register Cash</p>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          {loading ? (
            <div className="h-8 w-28 bg-slate-200 dark:bg-slate-800 animate-pulse rounded mt-2" />
          ) : (
            <h2 className="text-xl font-black text-slate-900 dark:text-white mt-2 font-mono">
              {currentRegisterCash.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
            </h2>
          )}
          <p className="text-[11px] text-slate-500 font-medium mt-1">Available physical cash in drawer</p>
        </div>

        {/* Card 2: Today's Cash Sales */}
        <div className="bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Today's Cash Sales</p>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          {loading ? (
            <div className="h-8 w-28 bg-slate-200 dark:bg-slate-800 animate-pulse rounded mt-2" />
          ) : (
            <h2 className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-2 font-mono">
              +{todaysCashSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
            </h2>
          )}
          <p className="text-[11px] text-slate-500 font-medium mt-1">Direct register cash receipts</p>
        </div>

        {/* Card 3: Digital Payments */}
        <div className="bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Digital Payments</p>
            <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          {loading ? (
            <div className="h-8 w-28 bg-slate-200 dark:bg-slate-800 animate-pulse rounded mt-2" />
          ) : (
            <>
              <h2 className="text-xl font-black text-sky-600 dark:text-sky-400 mt-2 font-mono">
                +{todaysDigitalSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
              </h2>
              <p className="text-[11px] text-slate-500 font-medium mt-1">
                Telebirr ({todaysTelebirrSales > 0 ? `+${todaysTelebirrSales.toLocaleString('en-US')} ETB` : '0.00'}) & CBE Birr ({todaysCbeBirrSales > 0 ? `+${todaysCbeBirrSales.toLocaleString('en-US')} ETB` : '0.00'})
              </p>
            </>
          )}
        </div>

        {/* Card 4: Opening Register Float */}
        <div className="bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Opening Register Float</p>
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          {loading ? (
            <div className="h-8 w-28 bg-slate-200 dark:bg-slate-800 animate-pulse rounded mt-2" />
          ) : (
            <h2 className="text-xl font-black text-slate-900 dark:text-white mt-2 font-mono">
              {openingFloat.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
            </h2>
          )}
          <p className="text-[11px] text-slate-500 font-medium mt-1">Initial shift allocation</p>
        </div>
      </div>

      {/* CONSOLIDATED TRANSACTION RECONCILIATION & DIGITAL AGGREGATION PANEL */}
      <div className="bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-[#1e2233] pb-3">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Consolidated Transaction Reconciliation & Digital Aggregation</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Aggregated Telebirr, CBE Birr, and digital payment totals comparing daily shift activity against historical records.
            </p>
          </div>
          <span className="text-xs px-2.5 py-1 bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 font-bold rounded-lg border border-sky-200 dark:border-sky-800">
            Automated Sales Service Sync
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Telebirr Sales */}
          <div className="bg-slate-50 dark:bg-[#181b28] border border-slate-200/80 dark:border-[#24293a] rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                <span>Telebirr Payments</span>
              </span>
              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                Telebirr
              </span>
            </div>
            <div className="pt-1">
              <div className="text-[11px] text-slate-500">Today's Telebirr</div>
              <div className="text-sm font-extrabold font-mono text-slate-900 dark:text-white">
                +{todaysTelebirrSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
              </div>
            </div>
            <div className="border-t border-slate-200/60 dark:border-slate-800 pt-1.5">
              <div className="text-[11px] text-slate-500">Historical Telebirr Total</div>
              <div className="text-xs font-bold font-mono text-blue-600 dark:text-blue-400">
                +{historicalTelebirrSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
              </div>
            </div>
          </div>

          {/* CBE Birr Payments */}
          <div className="bg-slate-50 dark:bg-[#181b28] border border-slate-200/80 dark:border-[#24293a] rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                <span>CBE Birr Payments</span>
              </span>
              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
                CBE Birr
              </span>
            </div>
            <div className="pt-1">
              <div className="text-[11px] text-slate-500">Today's CBE Birr</div>
              <div className="text-sm font-extrabold font-mono text-slate-900 dark:text-white">
                +{todaysCbeBirrSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
              </div>
            </div>
            <div className="border-t border-slate-200/60 dark:border-slate-800 pt-1.5">
              <div className="text-[11px] text-slate-500">Historical CBE Birr Total</div>
              <div className="text-xs font-bold font-mono text-purple-600 dark:text-purple-400">
                +{historicalCbeBirrSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
              </div>
            </div>
          </div>

          {/* Consolidated Digital Total */}
          <div className="bg-slate-50 dark:bg-[#181b28] border border-slate-200/80 dark:border-[#24293a] rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                <span>All Digital Aggregated</span>
              </span>
              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300">
                Non-Cash Total
              </span>
            </div>
            <div className="pt-1">
              <div className="text-[11px] text-slate-500">Today's All Digital</div>
              <div className="text-sm font-extrabold font-mono text-sky-600 dark:text-sky-400">
                +{todaysDigitalSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
              </div>
            </div>
            <div className="border-t border-slate-200/60 dark:border-slate-800 pt-1.5">
              <div className="text-[11px] text-slate-500">Historical All Digital Total</div>
              <div className="text-xs font-bold font-mono text-sky-600 dark:text-sky-400">
                +{historicalDigitalSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
              </div>
            </div>
          </div>

          {/* Historical Cash & Gross Revenue */}
          <div className="bg-slate-50 dark:bg-[#181b28] border border-slate-200/80 dark:border-[#24293a] rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Historical Cash & Total</span>
              </span>
              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                All-Time Sales
              </span>
            </div>
            <div className="pt-1">
              <div className="text-[11px] text-slate-500">Historical Cash Sales</div>
              <div className="text-sm font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                +{historicalCashSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
              </div>
            </div>
            <div className="border-t border-slate-200/60 dark:border-slate-800 pt-1.5">
              <div className="text-[11px] text-slate-500">Historical Gross Revenue</div>
              <div className="text-xs font-bold font-mono text-slate-900 dark:text-white">
                +{(historicalCashSales + historicalDigitalSales).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CASH DROP FORM & TRANSACTIONS LOG */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* CASH DROP FORM */}
        <div className="bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] rounded-xl p-6 shadow-xs space-y-4">
          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center space-x-2">
            <ArrowUpRight className="w-4 h-4 text-indigo-500" />
            <span>Process Cash Drop / Safe Transfer</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Transfer surplus cash from register drawer to main branch vault or bank account.
          </p>

          <form onSubmit={handleCashDrop} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">
                Transfer Amount (ETB) <span className="text-indigo-500">*</span>
              </label>
              <input 
                type="number"
                step="0.01"
                min="0.01"
                required
                value={cashDropAmount}
                onChange={(e) => setCashDropAmount(e.target.value)}
                placeholder="e.g. 2500.00"
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-[#181b28] border border-slate-200 dark:border-[#262b3f] rounded-xl text-slate-900 dark:text-slate-100 font-mono font-bold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">Note / Reason</label>
              <input 
                type="text"
                value={dropNote}
                onChange={(e) => setDropNote(e.target.value)}
                placeholder="e.g. Bank deposit via CBE"
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-[#181b28] border border-slate-200 dark:border-[#262b3f] rounded-xl text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={submittingDrop || loading}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer shadow-xs flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {submittingDrop ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Cash Drop</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* TRANSACTIONS TABLE */}
        <div className="lg:col-span-2 bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <History className="w-4 h-4 text-indigo-500" />
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Shift Cash Activity Log</h3>
            </div>
            <span className="text-[11px] px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold rounded-lg">
              Branch: {selectedBranch}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-[#1e2233] text-slate-400 font-bold uppercase text-[10px]">
                  <th className="py-3 px-2">TIME</th>
                  <th className="py-3 px-2">ACTIVITY</th>
                  <th className="py-3 px-2">METHOD</th>
                  <th className="py-3 px-2">NOTE</th>
                  <th className="py-3 px-2 text-right">AMOUNT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#1a1e2e] font-medium text-slate-700 dark:text-slate-300">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                        <span className="text-xs font-semibold">Loading live cash activity from database...</span>
                      </div>
                    </td>
                  </tr>
                ) : activities.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500 font-medium">
                      No cash transactions or drawer movements recorded yet for this shift.
                    </td>
                  </tr>
                ) : (
                  activities.map((tx) => {
                    const isPositive = tx.amount > 0;
                    return (
                      <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-[#181b28] transition-colors">
                        <td className="py-3 px-2 font-mono text-slate-400 shrink-0">{tx.time || 'N/A'}</td>
                        <td className="py-3 px-2 font-bold text-slate-900 dark:text-white whitespace-nowrap">{tx.type}</td>
                        <td className="py-3 px-2 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            tx.method.toLowerCase() === 'cash'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : tx.method.toLowerCase() === 'telebirr'
                              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                              : tx.method.toLowerCase().includes('cbe')
                              ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                              : 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20'
                          }`}>
                            {tx.method.toLowerCase() === 'telebirr'
                              ? 'Telebirr'
                              : tx.method.toLowerCase() === 'cbe_birr' || tx.method.toLowerCase().includes('cbe')
                              ? 'CBE Birr'
                              : tx.method.toLowerCase() === 'mobile_money'
                              ? 'Mobile Money'
                              : tx.method.toLowerCase() === 'bank_transfer'
                              ? 'Bank Transfer'
                              : tx.method}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-slate-500 dark:text-slate-400 max-w-xs truncate">{tx.note || '-'}</td>
                        <td className={`py-3 px-2 text-right font-mono font-bold whitespace-nowrap ${
                          isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                        }`}>
                          {isPositive ? `+${formatPrice(tx.amount, true)}` : `${formatPrice(tx.amount, true)}`} ETB
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* SET OPENING FLOAT MODAL */}
      {isFloatModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl relative">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white tracking-tight">Set Opening Register Float</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Configure starting shift cash balance for register drawer.</p>
              </div>
              <button 
                onClick={() => setIsFloatModalOpen(false)} 
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSetFloat} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Opening Float Amount (ETB) <span className="text-indigo-500">*</span>
                </label>
                <input 
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={newFloatAmount}
                  onChange={(e) => setNewFloatAmount(e.target.value)}
                  placeholder="e.g. 5000.00"
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-[#181b28] border border-slate-200 dark:border-[#262b3f] rounded-xl text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Note / Note</label>
                <input 
                  type="text"
                  value={floatNote}
                  onChange={(e) => setFloatNote(e.target.value)}
                  placeholder="e.g. Initial float allocated for morning shift"
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-[#181b28] border border-slate-200 dark:border-[#262b3f] rounded-xl text-slate-900 dark:text-white font-medium focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button 
                  type="button" 
                  onClick={() => setIsFloatModalOpen(false)}
                  className="px-5 py-2.5 bg-white dark:bg-[#181b28] border border-slate-200 dark:border-[#262b3f] text-slate-700 dark:text-slate-300 rounded-xl font-medium text-xs hover:bg-slate-50 dark:hover:bg-[#22273a] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={submittingFloat}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center space-x-2"
                >
                  {submittingFloat ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Update Opening Float</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
