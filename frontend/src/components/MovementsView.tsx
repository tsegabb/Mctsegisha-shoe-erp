import { useState, FormEvent, Fragment, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Pagination from './Pagination.tsx';
import { 
  Boxes, 
  DollarSign, 
  TrendingDown, 
  AlertTriangle, 
  Search, 
  ChevronDown, 
  ChevronRight,
  Plus,
  ArrowRightLeft,
  X,
  Trash2
} from 'lucide-react';
import { StockMovement, Variant, Warehouse } from '../types.ts';
import { formatPrice } from '../utils/formatters.ts';
import { LoadingSpinner, EmptyState } from './common/UIStates.tsx';

interface MovementsViewProps {
  movements: StockMovement[];
  variants: Variant[];
  warehouses: Warehouse[];
  loading: boolean;
  onRefresh: () => void;
  onRecordMovement?: (data: {
    variantId: string;
    warehouseId?: string;
    fromWarehouseId?: string;
    toWarehouseId?: string;
    type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'TRANSFER';
    quantity: number;
    reason?: string;
  }) => Promise<any>;
  onCreateMovement?: (data: any) => Promise<any>;
}

export default function MovementsView({
  movements,
  variants,
  warehouses,
  loading,
  onRefresh,
  onRecordMovement,
  onCreateMovement
}: MovementsViewProps) {
  const [activeTab, setActiveTab] = useState<'stock' | 'adjustments' | 'transfers'>('stock');
  const [searchTerm, setSearchTerm] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [selectedSizeFilter, setSelectedSizeFilter] = useState('All');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // New Adjustment Modal State (matching screenshot 1)
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustSearchProduct, setAdjustSearchProduct] = useState('');
  const [selectedAdjustVariant, setSelectedAdjustVariant] = useState<Variant | null>(null);
  const [isAdjustDropdownOpen, setIsAdjustDropdownOpen] = useState(false);
  const [adjustQtyInput, setAdjustQtyInput] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustNotes, setAdjustNotes] = useState('');
  const [recording, setRecording] = useState(false);

  // New Transfer Modal State (matching screenshot 2)
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [destinationBranchId, setDestinationBranchId] = useState('');
  const [transferItems, setTransferItems] = useState<Array<{
    id: string;
    variant: Variant | null;
    search: string;
    isDropdownOpen: boolean;
    qty: string;
  }>>([
    { id: '1', variant: null, search: '', isDropdownOpen: false, qty: '' }
  ]);
  const [transferring, setTransferring] = useState(false);

  // Search & Type Filter for Adjustments
  const [movementSearch, setMovementSearch] = useState('');
  const [movementTypeFilter, setMovementTypeFilter] = useState('ALL');

  // Stock items
  const stockItems = variants;

  const hasHistory = movements && movements.length > 0;
  const transferMovements = movements.filter(m => String(m.type).toLowerCase() === 'transfer');
  const hasTransfers = transferMovements && transferMovements.length > 0;

  // Auto-switch to stock tab if active tab has no history
  useEffect(() => {
    if (activeTab === 'adjustments' && !hasHistory) {
      setActiveTab('stock');
    }
    if (activeTab === 'transfers' && !hasTransfers) {
      setActiveTab('stock');
    }
  }, [hasHistory, hasTransfers, activeTab]);

  const lowStockCount = stockItems.filter(item => {
    const reorder = (item as any).reorderLevel || 20;
    return item.currentStock > 0 && item.currentStock <= reorder;
  }).length;

  const outOfStockCount = stockItems.filter(item => item.currentStock <= 0).length;
  const totalValue = stockItems.reduce((acc, item) => acc + (item.currentStock * (item.price || 0)), 0);

  // Filter stock items
  const filteredItems = stockItems.filter(item => {
    const matchesSearch = 
      item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.color && item.color.toLowerCase().includes(searchTerm.toLowerCase()));
    if (!matchesSearch) return false;

    const reorder = (item as any).reorderLevel || 20;
    if (lowStockOnly && item.currentStock > reorder) {
      return false;
    }

    if (selectedSizeFilter !== 'All') {
      const rawSize = item.size || '';
      const numMatch = rawSize.match(/\d+/);
      const sizeNum = numMatch ? parseInt(numMatch[0], 10) : 0;

      if (selectedSizeFilter === 'EU 39 - 41') {
        if (sizeNum < 39 || sizeNum > 41) return false;
      } else if (selectedSizeFilter === 'EU 42 - 44') {
        if (sizeNum < 42 || sizeNum > 44) return false;
      } else if (selectedSizeFilter === 'EU 45+') {
        if (sizeNum < 45) return false;
      }
    }

    return true;
  });

  // Filter movements for Adjustments Tab
  const filteredMovements = movements.filter(m => {
    const pName = m.variant?.productName || (m as any).productName || 'Shoe Item';
    const sku = m.variant?.sku || (m as any).sku || '';
    const reason = m.reason || '';

    const matchesSearch = pName.toLowerCase().includes(movementSearch.toLowerCase()) ||
      sku.toLowerCase().includes(movementSearch.toLowerCase()) ||
      reason.toLowerCase().includes(movementSearch.toLowerCase());

    if (!matchesSearch) return false;

    if (movementTypeFilter !== 'ALL') {
      const typeStr = String(m.type).toLowerCase();
      const filterStr = movementTypeFilter.toLowerCase();
      if (!typeStr.includes(filterStr) && !filterStr.includes(typeStr)) return false;
    }

    return true;
  });

  // Pagination State
  const [stockPage, setStockPage] = useState(1);
  const stockPageSize = 10;

  const [adjustmentsPage, setAdjustmentsPage] = useState(1);
  const adjustmentsPageSize = 10;

  const [transfersPage, setTransfersPage] = useState(1);
  const transfersPageSize = 10;

  useEffect(() => {
    setStockPage(1);
  }, [searchTerm, lowStockOnly, selectedSizeFilter]);

  useEffect(() => {
    setAdjustmentsPage(1);
  }, [movementSearch, movementTypeFilter]);

  const paginatedItems = useMemo(() => {
    const start = (stockPage - 1) * stockPageSize;
    return filteredItems.slice(start, start + stockPageSize);
  }, [filteredItems, stockPage, stockPageSize]);

  const paginatedMovements = useMemo(() => {
    const start = (adjustmentsPage - 1) * adjustmentsPageSize;
    return filteredMovements.slice(start, start + adjustmentsPageSize);
  }, [filteredMovements, adjustmentsPage, adjustmentsPageSize]);

  const paginatedTransfers = useMemo(() => {
    const start = (transfersPage - 1) * transfersPageSize;
    return transferMovements.slice(start, start + transfersPageSize);
  }, [transferMovements, transfersPage, transfersPageSize]);

  // Open Handlers
  const handleOpenAdjust = (variant?: Variant) => {
    if (variant) {
      setSelectedAdjustVariant(variant);
      setAdjustSearchProduct(`${variant.productName} (${variant.size || 'EU Standard'})`);
    } else {
      setSelectedAdjustVariant(null);
      setAdjustSearchProduct('');
    }
    setAdjustQtyInput('');
    setAdjustReason('');
    setAdjustNotes('');
    setIsAdjustDropdownOpen(false);
    setIsAdjustModalOpen(true);
  };

  const handleOpenTransfer = (variant?: Variant) => {
    setDestinationBranchId('');
    if (variant) {
      setTransferItems([{
        id: '1',
        variant: variant,
        search: `${variant.productName} (${variant.size || 'EU Standard'})`,
        isDropdownOpen: false,
        qty: '1'
      }]);
    } else {
      setTransferItems([{
        id: '1',
        variant: null,
        search: '',
        isDropdownOpen: false,
        qty: ''
      }]);
    }
    setIsTransferModalOpen(true);
  };

  // Transfer item row helper actions
  const addTransferItemRow = () => {
    setTransferItems(prev => [
      ...prev,
      { id: String(Date.now()), variant: null, search: '', isDropdownOpen: false, qty: '' }
    ]);
  };

  const removeTransferItemRow = (id: string) => {
    setTransferItems(prev => prev.filter(item => item.id !== id));
  };

  const updateTransferItem = (id: string, updates: Partial<typeof transferItems[0]>) => {
    setTransferItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  // Submit Adjustment Form
  const handleAdjustSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedAdjustVariant) {
      alert('Please select a product');
      return;
    }
    if (!adjustQtyInput.trim()) {
      alert('Please specify quantity change');
      return;
    }
    if (!adjustReason) {
      alert('Please select a reason');
      return;
    }

    const rawNum = parseInt(adjustQtyInput.replace(/[^0-9-]/g, ''), 10);
    if (isNaN(rawNum) || rawNum === 0) {
      alert('Please enter a valid quantity change (e.g. -5 or +10)');
      return;
    }

    const isDeduct = adjustQtyInput.trim().startsWith('-') || rawNum < 0;
    const qty = Math.abs(rawNum);
    const type = isDeduct ? 'OUT' : 'ADJUSTMENT';

    setRecording(true);
    try {
      const fn = onRecordMovement || onCreateMovement;
      if (fn) {
        await fn({
          variantId: selectedAdjustVariant.id,
          warehouseId: warehouses[0]?.id,
          type,
          quantity: qty,
          reason: adjustNotes ? `${adjustReason} - ${adjustNotes}` : adjustReason
        });
      }
      setIsAdjustModalOpen(false);
      onRefresh();
    } catch (err) {
      console.error('Failed to submit adjustment:', err);
    } finally {
      setRecording(false);
    }
  };

  // Submit Transfer Form
  const handleTransferSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!destinationBranchId) {
      alert('Please select a destination branch');
      return;
    }

    const validItems = transferItems.filter(item => item.variant && parseInt(item.qty, 10) > 0);
    if (validItems.length === 0) {
      alert('Please select at least one product and specify a quantity to transfer.');
      return;
    }

    const destBranch = warehouses.find(w => w.id === destinationBranchId);

    setTransferring(true);
    try {
      const fn = onRecordMovement || onCreateMovement;
      if (fn) {
        for (const item of validItems) {
          await fn({
            variantId: item.variant!.id,
            fromWarehouseId: warehouses[0]?.id,
            toWarehouseId: destinationBranchId,
            type: 'TRANSFER',
            quantity: parseInt(item.qty, 10),
            reason: `Branch transfer to ${destBranch?.name || 'Destination Branch'}`
          });
        }
      }
      setIsTransferModalOpen(false);
      onRefresh();
    } catch (err) {
      console.error('Failed to submit transfer:', err);
    } finally {
      setTransferring(false);
    }
  };

  return (
    <div className="space-y-5 text-slate-900 dark:text-slate-100">
      
      {/* PAGE TITLE & SUBTITLE */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Inventory</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Track and manage shoe stock levels across all store branches.</p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleOpenAdjust()}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center space-x-2 transition-colors cursor-pointer shadow-md"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Adjustment</span>
          </button>
          <button
            onClick={() => handleOpenTransfer()}
            className="px-3.5 py-2 bg-slate-800 dark:bg-[#181b28] hover:bg-slate-700 dark:hover:bg-[#22273a] text-white font-bold text-xs border border-slate-700 dark:border-[#262b3f] rounded-xl flex items-center space-x-2 transition-colors cursor-pointer shadow-md"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Branch Transfer</span>
          </button>
        </div>
      </div>

      {/* TOP TAB PILLS - ONLY SHOW IF THERE IS HISTORY */}
      {(hasHistory || hasTransfers) && (
        <div className="flex items-center space-x-1.5 p-1 bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] rounded-xl w-fit text-xs">
          <button
            onClick={() => setActiveTab('stock')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
              activeTab === 'stock' ? 'bg-indigo-600 text-white dark:bg-[#1e2233] shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Stock Levels
          </button>

          {hasHistory && (
            <button
              onClick={() => setActiveTab('adjustments')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                activeTab === 'adjustments' ? 'bg-indigo-600 text-white dark:bg-[#1e2233] shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Adjustments History ({movements.length})
            </button>
          )}

          {hasTransfers && (
            <button
              onClick={() => setActiveTab('transfers')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                activeTab === 'transfers' ? 'bg-indigo-600 text-white dark:bg-[#1e2233] shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Branch Transfers ({transferMovements.length})
            </button>
          )}
        </div>
      )}

      {/* SUMMARY STATS GRID */}
      <div className="p-1 border border-indigo-500/20 rounded-xl bg-slate-50 dark:bg-[#0d0e17]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-white dark:bg-[#12141e] p-4 rounded-lg border border-slate-200 dark:border-transparent">
          
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-[#181b28] border border-slate-200 dark:border-[#262b3f] text-slate-500 dark:text-slate-400">
              <Boxes className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Shoe Models</p>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">{stockItems.length}</h3>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-[#181b28] border border-slate-200 dark:border-[#262b3f] text-slate-500 dark:text-slate-400">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Inventory Value</p>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">{formatPrice(totalValue, true)} ETB</h3>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-[#181b28] border border-slate-200 dark:border-[#262b3f] text-amber-500 dark:text-amber-400">
              <TrendingDown className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Low Stock Models</p>
              <h3 className="text-lg font-bold text-amber-600 dark:text-amber-400 leading-tight">{lowStockCount}</h3>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-[#181b28] border border-slate-200 dark:border-[#262b3f] text-rose-500 dark:text-rose-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Out of Stock</p>
              <h3 className="text-lg font-bold text-rose-600 dark:text-rose-400 leading-tight">{outOfStockCount}</h3>
            </div>
          </div>

        </div>
      </div>

      {/* ==================== TAB 1: STOCK LEVELS ==================== */}
      {activeTab === 'stock' && (
        <div className="space-y-4">
          {/* FILTER CONTROLS */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input 
                  type="text"
                  placeholder="Search shoe models or SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64 pl-8 pr-4 py-1.5 bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] rounded-xl text-xs text-slate-900 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500/50 font-medium"
                />
              </div>

              <button 
                onClick={() => setLowStockOnly(!lowStockOnly)}
                className={`px-3 py-1.5 border rounded-xl text-xs font-semibold flex items-center space-x-1.5 cursor-pointer transition-colors ${
                  lowStockOnly 
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-600 dark:text-amber-400' 
                    : 'bg-white dark:bg-[#12141e] border-slate-200 dark:border-[#1e2233] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <TrendingDown className={`w-3.5 h-3.5 ${lowStockOnly ? 'text-amber-500' : 'text-slate-400'}`} />
                <span>Low Stock Only</span>
              </button>

              <select 
                value={selectedSizeFilter}
                onChange={(e) => setSelectedSizeFilter(e.target.value)}
                className="px-3 py-1.5 bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] rounded-xl text-xs text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer font-medium"
              >
                <option value="All">All Size Categories</option>
                <option value="EU 39 - 41">EU 39 - 41</option>
                <option value="EU 42 - 44">EU 42 - 44</option>
                <option value="EU 45+">EU 45+</option>
              </select>
            </div>

            <div className="text-xs text-slate-500 font-medium">
              Showing <span className="font-bold text-slate-900 dark:text-white">{filteredItems.length}</span> of {stockItems.length} models
            </div>
          </div>

          {/* STOCK LEVELS TABLE */}
          <div className="bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-[#161926] text-slate-500 dark:text-slate-400 font-semibold uppercase text-[10px] tracking-wider bg-slate-50/50 dark:bg-[#12141e]">
                  <th className="p-4 pl-6">SHOE MODEL</th>
                  <th className="p-4">SKU</th>
                  <th className="p-4">TOTAL QTY</th>
                  <th className="p-4">REORDER LEVEL</th>
                  <th className="p-4">STATUS</th>
                  <th className="p-4">SIZE</th>
                  <th className="p-4 text-right pr-6">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#1a1e2e] font-medium text-slate-700 dark:text-slate-200">
                {paginatedItems.map((item) => {
                  const isExpanded = expandedRow === item.id;
                  const reorder = (item as any).reorderLevel || 20;
                  const isOut = item.currentStock <= 0;
                  const isLow = !isOut && item.currentStock <= reorder;

                  return (
                    <Fragment key={item.id}>
                      <tr 
                        onClick={() => setExpandedRow(isExpanded ? null : item.id)}
                        className="hover:bg-slate-50 dark:hover:bg-[#181b28] transition-colors cursor-pointer group"
                      >
                        <td className="p-4 pl-6 font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          )}
                          <span>{item.productName}</span>
                        </td>
                        <td className="p-4 text-slate-500 dark:text-slate-400 font-mono">{item.sku || 'N/A'}</td>
                        <td className="p-4 font-bold text-slate-900 dark:text-white font-mono">{item.currentStock}</td>
                        <td className="p-4 text-slate-500 dark:text-slate-400 font-mono">{reorder}</td>
                        <td className="p-4">
                          {isOut ? (
                            <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-semibold text-[11px]">Out of Stock</span>
                          ) : isLow ? (
                            <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-semibold text-[11px]">Low Stock</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold text-[11px]">Healthy</span>
                          )}
                        </td>
                        <td className="p-4 text-slate-600 dark:text-slate-300 font-mono">{item.size || 'EU Standard'}</td>
                        <td className="p-4 text-right pr-6">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenAdjust(item);
                            }}
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                          >
                            Adjust
                          </button>
                        </td>
                      </tr>

                      {/* EXPANDED SUB-ROW DETAILS */}
                      {isExpanded && (
                        <tr className="bg-[#0e1019] border-b border-[#1a1e2e]">
                          <td colSpan={7} className="p-4 pl-12 text-slate-300">
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-xs">
                              <div>
                                <p className="text-[10px] text-slate-500 font-semibold uppercase">SERIAL / BARCODE</p>
                                <p className="font-bold text-white font-mono mt-1">{item.barcode || (item as any).serialNo || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-slate-500 font-semibold uppercase">COLOR / MATERIAL</p>
                                <p className="font-bold text-white mt-1">{item.color || 'Standard'}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-slate-500 font-semibold uppercase">IN STOCK QTY</p>
                                <p className="font-bold text-white font-mono mt-1">{item.currentStock} pairs</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-slate-500 font-semibold uppercase">UNIT PRICE</p>
                                <p className="font-bold text-white font-mono mt-1">{item.price ? `${formatPrice(item.price, true)} ETB` : 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-slate-500 font-semibold uppercase font-sans">BRAND</p>
                                <p className="font-bold text-white mt-1">{item.productBrand || 'Brand'}</p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}

                {filteredItems.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-slate-500 font-medium">
                      No inventory items found matching your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <Pagination 
              currentPage={stockPage} 
              totalPages={Math.ceil(filteredItems.length / stockPageSize) || 1} 
              onPageChange={setStockPage} 
            />
          </div>
        </div>
      )}

      {/* ==================== TAB 2: ADJUSTMENTS HISTORY ==================== */}
      {activeTab === 'adjustments' && hasHistory && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input 
                  type="text"
                  placeholder="Search movement or reason..."
                  value={movementSearch}
                  onChange={(e) => setMovementSearch(e.target.value)}
                  className="w-64 pl-8 pr-4 py-1.5 bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] rounded-xl text-xs text-slate-900 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500/50 font-medium"
                />
              </div>

              <select
                value={movementTypeFilter}
                onChange={(e) => setMovementTypeFilter(e.target.value)}
                className="px-3 py-1.5 bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] rounded-xl text-xs text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer font-medium"
              >
                <option value="ALL">All Types</option>
                <option value="IN">IN (Receive Stock)</option>
                <option value="OUT">OUT (Deduct Stock)</option>
                <option value="ADJUSTMENT">ADJUSTMENT (Audit)</option>
                <option value="TRANSFER">TRANSFER (Inter-branch)</option>
              </select>
            </div>

            <button
              onClick={() => handleOpenAdjust()}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record Stock Adjustment</span>
            </button>
          </div>

          <div className="bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-[#161926] text-slate-500 dark:text-slate-400 font-semibold uppercase text-[10px] tracking-wider bg-slate-50/50 dark:bg-[#12141e]">
                  <th className="p-4 pl-6">DATE & TIME</th>
                  <th className="p-4">SHOE MODEL / VARIANT</th>
                  <th className="p-4">LOCATION</th>
                  <th className="p-4">TYPE</th>
                  <th className="p-4 font-mono">QTY</th>
                  <th className="p-4">REASON / NOTE</th>
                  <th className="p-4 pr-6">PERFORMED BY</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#1a1e2e] font-medium text-slate-700 dark:text-slate-200">
                {paginatedMovements.map((m) => {
                  const dateObj = m.createdAt ? new Date(m.createdAt) : new Date();
                  const pName = m.variant?.productName || (m as any).productName || 'Shoe Model';
                  const sizeColor = [m.variant?.size, m.variant?.color].filter(Boolean).join(' / ');
                  const mTypeLower = String(m.type || 'ADJUSTMENT').toLowerCase();

                  return (
                    <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-[#181b28] transition-colors">
                      <td className="p-4 pl-6 font-mono text-slate-500 dark:text-slate-400">
                        {dateObj.toLocaleDateString()} {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-4">
                        <p className="font-bold text-slate-900 dark:text-white">{pName}</p>
                        {sizeColor && <p className="text-[10px] text-slate-400 font-mono mt-0.5">{sizeColor}</p>}
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-300 font-medium">
                        {m.fromWarehouseName && m.toWarehouseName 
                          ? `${m.fromWarehouseName} ➔ ${m.toWarehouseName}`
                          : (m.toWarehouseName || m.fromWarehouseName || 'Main Store Branch')}
                      </td>
                      <td className="p-4">
                        {(mTypeLower === 'in' || mTypeLower === 'incoming') && (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold text-[10px]">
                            IN (+Receive)
                          </span>
                        )}
                        {(mTypeLower === 'out' || mTypeLower === 'outgoing') && (
                          <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-bold text-[10px]">
                            OUT (-Deduct)
                          </span>
                        )}
                        {mTypeLower === 'adjustment' && (
                          <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-bold text-[10px]">
                            ADJUSTMENT
                          </span>
                        )}
                        {mTypeLower === 'transfer' && (
                          <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-bold text-[10px]">
                            TRANSFER
                          </span>
                        )}
                      </td>
                      <td className="p-4 font-mono font-bold text-slate-900 dark:text-white">
                        {(mTypeLower === 'out' || mTypeLower === 'outgoing') ? `-${m.quantity}` : `+${m.quantity}`}
                      </td>
                      <td className="p-4 text-slate-500 dark:text-slate-400 max-w-xs truncate">{m.reason || 'Audit Adjustment'}</td>
                      <td className="p-4 pr-6 text-slate-400 font-mono">{m.createdBy || 'Inventory Staff'}</td>
                    </tr>
                  );
                })}

                {filteredMovements.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-slate-500 font-medium">
                      No matching movement records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <Pagination 
              currentPage={adjustmentsPage} 
              totalPages={Math.ceil(filteredMovements.length / adjustmentsPageSize) || 1} 
              onPageChange={setAdjustmentsPage} 
            />
          </div>
        </div>
      )}

      {/* ==================== TAB 3: BRANCH TRANSFERS ==================== */}
      {activeTab === 'transfers' && hasTransfers && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pt-1">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Inter-Branch Stock Transfers</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Track inventory shifted between store locations and warehouses.</p>
            </div>

            <button
              onClick={() => handleOpenTransfer()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center space-x-2 transition-colors cursor-pointer shadow-md"
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>New Branch Transfer</span>
            </button>
          </div>

          <div className="bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-[#161926] text-slate-500 dark:text-slate-400 font-semibold uppercase text-[10px] tracking-wider bg-slate-50/50 dark:bg-[#12141e]">
                  <th className="p-4 pl-6">DATE & TIME</th>
                  <th className="p-4">SHOE MODEL / VARIANT</th>
                  <th className="p-4">FROM BRANCH</th>
                  <th className="p-4">TO BRANCH</th>
                  <th className="p-4 font-mono">QTY</th>
                  <th className="p-4 pr-6">TRANSFER NOTE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#1a1e2e] font-medium text-slate-700 dark:text-slate-200">
                {paginatedTransfers.map((m) => {
                  const dateObj = m.createdAt ? new Date(m.createdAt) : new Date();
                  const pName = m.variant?.productName || (m as any).productName || 'Shoe Model';

                  return (
                    <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-[#181b28] transition-colors">
                      <td className="p-4 pl-6 font-mono text-slate-500 dark:text-slate-400">
                        {dateObj.toLocaleDateString()} {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-4 font-bold text-slate-900 dark:text-white">
                        {pName}
                      </td>
                      <td className="p-4 text-slate-700 dark:text-slate-300 font-medium">
                        {m.fromWarehouseName || 'Main Branch Store'}
                      </td>
                      <td className="p-4 text-indigo-600 dark:text-indigo-400 font-bold">
                        {m.toWarehouseName || 'Secondary Store'}
                      </td>
                      <td className="p-4 font-mono font-bold text-slate-900 dark:text-white">
                        {m.quantity} pairs
                      </td>
                      <td className="p-4 pr-6 text-slate-500 dark:text-slate-400">{m.reason || 'Branch Balancing'}</td>
                    </tr>
                  );
                })}

                {transferMovements.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-500 font-medium">
                      No branch transfer records logged yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <Pagination 
              currentPage={transfersPage} 
              totalPages={Math.ceil(transferMovements.length / transfersPageSize) || 1} 
              onPageChange={setTransfersPage} 
            />
          </div>
        </div>
      )}

      {/* ==================== NEW ADJUSTMENT MODAL (MATCHING SCREENSHOT 1) ==================== */}
      <AnimatePresence>
        {isAdjustModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl relative"
            >
              {/* Header */}
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white tracking-tight">New Adjustment</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Adjust stock for a product.</p>
                </div>
                <button 
                  onClick={() => setIsAdjustModalOpen(false)} 
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAdjustSubmit} className="space-y-4 text-xs">
                {/* Product * */}
                <div className="relative">
                  <label className="text-xs font-medium text-slate-900 dark:text-slate-100 block mb-1.5">
                    Product <span className="text-indigo-500">*</span>
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input 
                      type="text"
                      placeholder="Search products..."
                      value={adjustSearchProduct}
                      onChange={(e) => {
                        setAdjustSearchProduct(e.target.value);
                        setSelectedAdjustVariant(null);
                        setIsAdjustDropdownOpen(true);
                      }}
                      onFocus={() => setIsAdjustDropdownOpen(true)}
                      className="w-full pl-9 pr-8 py-2.5 bg-white dark:bg-[#181b28] border border-indigo-400 dark:border-indigo-500 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 font-normal focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900/40"
                    />
                    {selectedAdjustVariant && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAdjustVariant(null);
                          setAdjustSearchProduct('');
                          setIsAdjustDropdownOpen(true);
                        }}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-white p-0.5 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Product Dropdown */}
                  {isAdjustDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-[#181b28] border border-slate-200 dark:border-[#262b3f] rounded-xl shadow-xl max-h-48 overflow-y-auto z-20 divide-y divide-slate-100 dark:divide-[#22273a]">
                      {variants
                        .filter(v => {
                          if (!adjustSearchProduct || selectedAdjustVariant) return true;
                          const q = adjustSearchProduct.toLowerCase();
                          return v.productName?.toLowerCase().includes(q) ||
                            v.sku?.toLowerCase().includes(q) ||
                            v.color?.toLowerCase().includes(q) ||
                            v.size?.toString().includes(q);
                        })
                        .map((v) => (
                          <div
                            key={v.id}
                            onClick={() => {
                              setSelectedAdjustVariant(v);
                              setAdjustSearchProduct(`${v.productName} (${v.size || 'EU Standard'})`);
                              setIsAdjustDropdownOpen(false);
                            }}
                            className="p-2.5 hover:bg-slate-50 dark:hover:bg-[#22273a] cursor-pointer flex items-center justify-between transition-colors text-xs"
                          >
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-white">{v.productName}</p>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400">Size: {v.size || 'EU Standard'} | SKU: {v.sku}</p>
                            </div>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-[#12141e] text-slate-700 dark:text-slate-300 font-bold">
                              Stock: {v.currentStock}
                            </span>
                          </div>
                        ))}
                      {variants.length === 0 && (
                        <div className="p-3 text-slate-400 text-center">No products found</div>
                      )}
                    </div>
                  )}
                </div>

                {/* Quantity Change * */}
                <div>
                  <label className="text-xs font-medium text-slate-900 dark:text-slate-100 block mb-1.5">
                    Quantity Change <span className="text-indigo-500">*</span>
                  </label>
                  <input 
                    type="text"
                    placeholder="e.g. -5 or +10"
                    value={adjustQtyInput}
                    onChange={(e) => setAdjustQtyInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-[#181b28] border border-slate-200 dark:border-[#262b3f] rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 font-normal focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Reason * */}
                <div>
                  <label className="text-xs font-medium text-slate-900 dark:text-slate-100 block mb-1.5">
                    Reason <span className="text-indigo-500">*</span>
                  </label>
                  <select 
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-[#181b28] border border-slate-200 dark:border-[#262b3f] rounded-xl text-slate-900 dark:text-white font-normal focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="" disabled>Select reason</option>
                    <option value="Damaged">Damaged</option>
                    <option value="Discrepancy">Discrepancy</option>
                    <option value="Restock">Restock</option>
                    <option value="Physical Audit">Physical Audit</option>
                    <option value="Returned">Returned</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Notes */}
                <div>
                  <label className="text-xs font-medium text-slate-900 dark:text-slate-100 block mb-1.5">
                    Notes
                  </label>
                  <textarea 
                    rows={3}
                    placeholder="Optional notes"
                    value={adjustNotes}
                    onChange={(e) => setAdjustNotes(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-[#181b28] border border-slate-200 dark:border-[#262b3f] rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 font-normal focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
                  />
                </div>

                {/* Buttons */}
                <div className="pt-2 flex items-center justify-end space-x-3">
                  <button 
                    type="button" 
                    onClick={() => setIsAdjustModalOpen(false)}
                    className="px-5 py-2.5 bg-white dark:bg-[#181b28] border border-slate-200 dark:border-[#262b3f] text-slate-700 dark:text-slate-300 rounded-xl font-medium text-xs hover:bg-slate-50 dark:hover:bg-[#22273a] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={recording}
                    className="px-6 py-2.5 bg-[#8282f6] hover:bg-indigo-600 text-white font-medium text-xs rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {recording ? 'Submitting...' : 'Submit'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================== NEW TRANSFER MODAL (MATCHING SCREENSHOT 2) ==================== */}
      <AnimatePresence>
        {isTransferModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl relative"
            >
              {/* Header */}
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white tracking-tight">New Transfer</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Transfer stock to another branch.</p>
                </div>
                <button 
                  onClick={() => setIsTransferModalOpen(false)} 
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleTransferSubmit} className="space-y-4 text-xs">
                {/* Destination Branch * */}
                <div>
                  <label className="text-xs font-medium text-slate-900 dark:text-slate-100 block mb-1.5">
                    Destination Branch <span className="text-indigo-500">*</span>
                  </label>
                  <select 
                    value={destinationBranchId}
                    onChange={(e) => setDestinationBranchId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-[#181b28] border border-indigo-400 dark:border-indigo-500 rounded-xl text-slate-900 dark:text-white font-normal focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900/40 cursor-pointer"
                  >
                    <option value="" disabled>Select branch</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                    ))}
                  </select>
                </div>

                {/* Items Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-900 dark:text-slate-100">Items</span>
                    <button
                      type="button"
                      onClick={addTransferItemRow}
                      className="text-xs text-slate-800 dark:text-slate-200 hover:text-indigo-600 font-semibold flex items-center space-x-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Item</span>
                    </button>
                  </div>

                  <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                    {transferItems.map((item) => (
                      <div key={item.id} className="flex items-center space-x-2">
                        {/* Search product field */}
                        <div className="relative flex-1">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                          <input 
                            type="text"
                            placeholder="Search product..."
                            value={item.search}
                            onChange={(e) => updateTransferItem(item.id, { search: e.target.value, variant: null, isDropdownOpen: true })}
                            onFocus={() => updateTransferItem(item.id, { isDropdownOpen: true })}
                            className="w-full pl-8 pr-3 py-2 bg-white dark:bg-[#181b28] border border-slate-200 dark:border-[#262b3f] rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 font-normal focus:outline-none focus:border-indigo-500"
                          />

                          {item.isDropdownOpen && (
                            <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-[#181b28] border border-slate-200 dark:border-[#262b3f] rounded-xl shadow-xl max-h-40 overflow-y-auto z-30 divide-y divide-slate-100 dark:divide-[#22273a]">
                              {variants
                                .filter(v => {
                                  if (!item.search || item.variant) return true;
                                  const q = item.search.toLowerCase();
                                  return v.productName?.toLowerCase().includes(q) ||
                                    v.sku?.toLowerCase().includes(q) ||
                                    v.color?.toLowerCase().includes(q) ||
                                    v.size?.toString().includes(q);
                                })
                                .map((v) => (
                                  <div
                                    key={v.id}
                                    onClick={() => {
                                      updateTransferItem(item.id, {
                                        variant: v,
                                        search: `${v.productName} (${v.size || 'EU Standard'})`,
                                        isDropdownOpen: false
                                      });
                                    }}
                                    className="p-2 hover:bg-slate-50 dark:hover:bg-[#22273a] cursor-pointer flex items-center justify-between text-xs"
                                  >
                                    <div>
                                      <p className="font-semibold text-slate-900 dark:text-white">{v.productName}</p>
                                      <p className="text-[10px] text-slate-500">Size: {v.size || 'EU Standard'}</p>
                                    </div>
                                    <span className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300">
                                      Stock: {v.currentStock}
                                    </span>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>

                        {/* Qty field */}
                        <div className="w-24">
                          <input 
                            type="number"
                            placeholder="Qty"
                            min={1}
                            value={item.qty}
                            onChange={(e) => updateTransferItem(item.id, { qty: e.target.value })}
                            className="w-full px-3 py-2 bg-white dark:bg-[#181b28] border border-slate-200 dark:border-[#262b3f] rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 font-normal focus:outline-none focus:border-indigo-500"
                          />
                        </div>

                        {/* Remove row button */}
                        {transferItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeTransferItemRow(item.id)}
                            className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Buttons */}
                <div className="pt-3 flex items-center justify-end space-x-3">
                  <button 
                    type="button" 
                    onClick={() => setIsTransferModalOpen(false)}
                    className="px-5 py-2.5 bg-white dark:bg-[#181b28] border border-slate-200 dark:border-[#262b3f] text-slate-700 dark:text-slate-300 rounded-xl font-medium text-xs hover:bg-slate-50 dark:hover:bg-[#22273a] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={transferring}
                    className="px-6 py-2.5 bg-[#8282f6] hover:bg-indigo-600 text-white font-medium text-xs rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {transferring ? 'Creating...' : 'Create Transfer'}
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
