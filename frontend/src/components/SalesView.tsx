import { useState, useMemo, useEffect } from 'react';
import { salesService } from '../services/sales.service.ts';
import Pagination from './Pagination.tsx';
import { 
  ShoppingCart, 
  X,
  Plus,
  Minus,
  DollarSign,
  Smartphone,
  Eye,
  Calendar,
  Receipt,
  ShoppingBag,
  TrendingUp,
  History,
  Terminal,
  Search,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Printer,
  CreditCard,
  Landmark
} from 'lucide-react';
import { Sale, Variant, Warehouse, PaymentMethod } from '../types.ts';
import { formatPrice } from '../utils/formatters.ts';
import { LoadingSpinner, EmptyState } from './common/UIStates.tsx';

interface SalesViewProps {
  sales: Sale[];
  variants: Variant[];
  warehouses: Warehouse[];
  selectedBranch?: string;
  selectedWarehouseId?: string;
  loading: boolean;
  onRefresh: () => void;
  initialMode?: 'history' | 'pos';
  onRecordSale: (data: {
    variantId: string;
    quantity: number;
    sellingPrice: number;
    costPrice?: number;
    warehouseId: string;
    paymentMethod?: string;
  }) => Promise<any>;
}



interface CartItem {
  variant: Variant;
  quantity: number;
  serialNo?: string;
  size?: string;
}

const DEMO_SALES_ROWS = [
  {
    id: 's1',
    saleNo: 'SL-2026-00146',
    dateStr: '6/9/2026',
    timeStr: '11:27 AM',
    dateTimeFull: '6/9/2026, 11:27:59 AM',
    itemsCount: 4,
    items: [
      { name: 'Nike Air Max 270 (EU 42)', qty: 1, price: 4800.00, total: 4800.00 },
      { name: 'Skechers Arch Fit (EU 41)', qty: 2, price: 2900.00, total: 5800.00 },
      { name: 'Adidas Ultraboost 22 (EU 43)', qty: 1, price: 5200.00, total: 5200.00 }
    ],
    subtotal: 15800.00,
    vat: 2370.00,
    totalAmount: 18170.00,
    paymentMethod: 'cash',
    status: 'Completed',
    rawDate: '2026-06-09T11:27:00Z'
  },
  {
    id: 's2',
    saleNo: 'SL-2026-00147',
    dateStr: '6/9/2026',
    timeStr: '09:27 AM',
    dateTimeFull: '6/9/2026, 09:27:59 AM',
    itemsCount: 3,
    items: [
      { name: 'Jordan 1 Retro High (EU 41)', qty: 2, price: 6500.00, total: 13000.00 },
      { name: 'Timberland 6-Inch Boot (EU 44)', qty: 1, price: 7200.00, total: 7200.00 }
    ],
    subtotal: 20200.00,
    vat: 3030.00,
    totalAmount: 23230.00,
    paymentMethod: 'cash',
    status: 'Completed',
    rawDate: '2026-06-09T09:27:00Z'
  },
  {
    id: 's3',
    saleNo: 'SL-2026-00148',
    dateStr: '6/9/2026',
    timeStr: '07:27 AM',
    dateTimeFull: '6/9/2026, 07:27:59 AM',
    itemsCount: 2,
    items: [
      { name: 'Vans Old Skool Classic (EU 41)', qty: 2, price: 2400.00, total: 4800.00 }
    ],
    subtotal: 4800.00,
    vat: 720.00,
    totalAmount: 5520.00,
    paymentMethod: 'cash',
    status: 'Completed',
    rawDate: '2026-06-09T07:27:00Z'
  },
  {
    id: 's4',
    saleNo: 'SL-2026-00149',
    dateStr: '6/9/2026',
    timeStr: '05:27 AM',
    dateTimeFull: '6/9/2026, 05:27:59 AM',
    itemsCount: 1,
    items: [
      { name: 'Clarks Genuine Leather Loafer (EU 42)', qty: 1, price: 3800.00, total: 3800.00 }
    ],
    subtotal: 3800.00,
    vat: 570.00,
    totalAmount: 4370.00,
    paymentMethod: 'telebirr',
    status: 'Completed',
    rawDate: '2026-06-09T05:27:00Z'
  },
  {
    id: 's5',
    saleNo: 'SL-2026-00150',
    dateStr: '6/9/2026',
    timeStr: '03:27 AM',
    dateTimeFull: '6/9/2026, 03:27:59 AM',
    itemsCount: 4,
    items: [
      { name: 'Puma Velocity Nitro 2 (EU 42)', qty: 2, price: 3400.00, total: 6800.00 },
      { name: 'Converse Chuck Taylor (EU 40)', qty: 2, price: 2200.00, total: 4400.00 }
    ],
    subtotal: 11200.00,
    vat: 1680.00,
    totalAmount: 12880.00,
    paymentMethod: 'mixed',
    status: 'Completed',
    rawDate: '2026-06-09T03:27:00Z'
  }
];

export default function SalesView({
  sales,
  variants,
  warehouses,
  selectedBranch,
  selectedWarehouseId,
  loading = false,
  initialMode,
  onRecordSale,
  onRefresh
}: SalesViewProps) {
  // Default mode to initialMode or 'history'
  const [activeMode, setActiveMode] = useState<'history' | 'pos'>(initialMode || 'pos');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [posSearchQuery, setPosSearchQuery] = useState('');
  
  // Cart state initialized empty
  const [cart, setCart] = useState<CartItem[]>([]);

  const formatPaymentMethodLabel = (method?: string): string => {
    if (!method) return 'Cash';
    const m = method.toLowerCase();
    if (m === 'telebirr') return 'Telebirr';
    if (m === 'cbe_birr' || m === 'cbebirr' || m === 'cbe') return 'CBE Birr';
    if (m === 'mobile_money') return 'Mobile Money';
    if (m === 'bank_transfer') return 'Bank Transfer';
    if (m === 'card') return 'Card';
    if (m === 'credit') return 'Credit';
    if (m === 'cash') return 'Cash';
    return method.replace(/_/g, ' ');
  };

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | 'cash' | 'telebirr' | 'cbe_birr' | 'card'>('cash');
  const [includeVat, setIncludeVat] = useState(true);
  const [customerInfoOpen, setCustomerInfoOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [customerNotes, setCustomerNotes] = useState('');
  const [customerInfoText, setCustomerInfoText] = useState('');
  const [recording, setRecording] = useState(false);
  const [saleSuccessMessage, setSaleSuccessMessage] = useState<string | null>(null);

  const [completedReceipt, setCompletedReceipt] = useState<any | null>(null);
  const [completedToast, setCompletedToast] = useState<{ title: string; message: string } | null>(null);

  // History filters
  const [historyFromDate, setHistoryFromDate] = useState('');
  const [historyToDate, setHistoryToDate] = useState('');
  const [historyPaymentMethod, setHistoryPaymentMethod] = useState<string>('all');
  const [selectedSale, setSelectedSale] = useState<any | null>(null);

  // Return Process modal state
  const [returnSale, setReturnSale] = useState<any | null>(null);
  const [returnQuantities, setReturnQuantities] = useState<{ [key: number]: number }>({});
  const [returnReason, setReturnReason] = useState('');
  const [restockReturned, setRestockReturned] = useState(true);
  const [returnSuccessMsg, setReturnSuccessMsg] = useState<string | null>(null);
  const [processedReturns, setProcessedReturns] = useState<{ 
    [saleId: string]: { 
      returnedQty: number; 
      returnedAmount: number; 
      status: string; 
      items?: any[] 
    } 
  }>({});

  const handleOpenReturnModal = (sale: any) => {
    setReturnSale(sale);
    setSelectedSale(null);
    const initialQtys: { [key: number]: number } = {};
    const items = sale.items && sale.items.length > 0 
      ? sale.items 
      : [{ name: 'Shoe Item', qty: sale.itemsCount || 1, price: (sale.totalAmount / (sale.itemsCount || 1)) }];
    items.forEach((_: any, idx: number) => {
      initialQtys[idx] = 0;
    });
    setReturnQuantities(initialQtys);
    setReturnReason('');
    setRestockReturned(true);
  };

  const handleConfirmReturn = async () => {
    if (!returnReason.trim()) {
      alert('Please enter a reason for the return.');
      return;
    }

    const items = returnSale.items && returnSale.items.length > 0 
      ? returnSale.items 
      : [{ name: 'Shoe Item', qty: returnSale.itemsCount || 1, price: (returnSale.totalAmount / (returnSale.itemsCount || 1)) }];

    let totalReturnQty = 0;
    let totalReturnAmount = 0;

    const updatedItems = items.map((item: any, idx: number) => {
      const returnQty = returnQuantities[idx] || 0;
      totalReturnQty += returnQty;
      const itemUnitPrice = Number(item.price) || (returnSale.totalAmount / (returnSale.itemsCount || 1));
      const itemReturnVal = returnQty * itemUnitPrice;
      totalReturnAmount += itemReturnVal;
      return {
        ...item,
        qty: Math.max(0, (item.qty || 1) - returnQty),
        total: Math.max(0, ((item.qty || 1) - returnQty) * itemUnitPrice)
      };
    });

    if (totalReturnQty <= 0) {
      alert('Please enter a return quantity of at least 1.');
      return;
    }

    const actualDeduction = Math.min(returnSale.totalAmount, totalReturnAmount);
    const newTotalAmount = Math.max(0, returnSale.totalAmount - actualDeduction);
    const newStatus = newTotalAmount <= 0 ? 'Returned' : 'Partially Returned';

    setProcessedReturns(prev => {
      const existing = prev[returnSale.id] || { returnedQty: 0, returnedAmount: 0 };
      return {
        ...prev,
        [returnSale.id]: {
          returnedQty: existing.returnedQty + totalReturnQty,
          returnedAmount: existing.returnedAmount + actualDeduction,
          status: newStatus,
          items: updatedItems
        }
      };
    });

    try {
      await salesService.processReturn({
        saleId: returnSale.id,
        totalReturnAmount: actualDeduction,
        totalReturnQty,
        reason: returnReason,
        restock: restockReturned
      });
    } catch (e) {
      console.warn('Backend return process warning:', e);
    }

    if (onRefresh) {
      onRefresh();
    }

    setReturnSuccessMsg(`Return processed: ETB ${formatPrice(actualDeduction, true)} deducted from total sales revenue${restockReturned ? ' and inventory restocked' : ''}.`);
    setReturnSale(null);
    setTimeout(() => setReturnSuccessMsg(null), 5000);
  };

  const posProducts = variants;

  // Extract categories dynamically from backend products & variants
  const categories = useMemo(() => {
    const catSet = new Set<string>();
    posProducts.forEach((prod: any) => {
      const cat = prod.category || prod.product?.category;
      if (cat && typeof cat === 'string' && cat.trim() !== '' && cat !== '--') {
        catSet.add(cat.trim());
      }
    });
    const sortedCats = Array.from(catSet).sort();
    return ['All', ...sortedCats];
  }, [posProducts]);

  const filteredPosProducts = posProducts.filter((prod) => {
    const prodCat = (prod as any).category || (prod as any).product?.category;
    const matchesCat = selectedCategory === 'All' || prodCat === selectedCategory;
    const q = posSearchQuery.toLowerCase().trim();
    if (!q) return matchesCat;

    const nameMatch = prod.productName ? prod.productName.toLowerCase().includes(q) : false;
    const rawB = (prod as any).brand || (prod as any).productBrand || (prod as any).product?.brand;
    const bStr = typeof rawB === 'object' && rawB ? rawB.name : (typeof rawB === 'string' ? rawB : '');
    const brandMatch = bStr.toLowerCase().includes(q);
    const skuMatch = (prod as any).sku && (prod as any).sku.toLowerCase().includes(q);
    const catMatch = prodCat ? prodCat.toLowerCase().includes(q) : false;
    return matchesCat && (nameMatch || brandMatch || skuMatch || catMatch);
  });

  const addToCart = (product: Variant) => {
    setCart(prev => {
      const existing = prev.find(item => item.variant.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.variant.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, {
        variant: product,
        quantity: 1,
        batchNo: 'BN-2026-0019A',
        expDate: '2029-04-06'
      }];
    });
  };

  const updateQuantity = (variantId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.variant.id === variantId) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : item;
      }
      return item;
    }));
  };

  const removeFromCart = (variantId: string) => {
    setCart(prev => prev.filter(item => item.variant.id !== variantId));
  };

  const clearCart = () => setCart([]);

  const subtotal = cart.reduce((sum, item) => sum + (item.variant.price * item.quantity), 0);
  const vatAmount = includeVat ? subtotal * 0.15 : 0;
  const totalAmount = subtotal + vatAmount;

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setRecording(true);
    setSaleSuccessMessage(null);

    const activeWarehouse = warehouses.find(w => w.id === selectedWarehouseId || w.name === selectedBranch) || warehouses[0];
    const targetWh = activeWarehouse?.id || 'wh-1';
    const activeBranchName = activeWarehouse?.name || selectedBranch || 'Main Branch';

    try {
      for (const item of cart) {
        await onRecordSale({
          variantId: item.variant.id,
          quantity: item.quantity,
          sellingPrice: item.variant.price,
          warehouseId: targetWh,
          paymentMethod: paymentMethod
        });
      }

      const receiptNum = `SAL-${String((sales?.length || 0) + 154).padStart(5, '0')}`;
      const now = new Date();
      const formattedDate = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}, ${now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })}`;

      const newReceipt = {
        receiptNo: receiptNum,
        dateTime: formattedDate,
        storeName: 'Fidel ERP',
        branchName: activeBranchName,
        items: cart.map(item => ({
          name: item.variant.productName + (item.variant.size ? ` (${item.variant.size})` : ''),
          qty: item.quantity,
          price: item.variant.price,
          total: item.quantity * item.variant.price
        })),
        subtotal: subtotal,
        vat: vatAmount,
        totalAmount: totalAmount,
        paymentMethod: formatPaymentMethodLabel(paymentMethod)
      };

      setCompletedReceipt(newReceipt);
      setCompletedToast({
        title: 'Sale completed',
        message: `Sale ${receiptNum} recorded successfully.`
      });

      clearCart();
    } catch (err: any) {
      console.error(err);
    } finally {
      setRecording(false);
    }
  };

  // Process Sales History Data from real database
  const rawSalesList = (sales || []).map((s, idx) => {
    const dateObj = s.createdAt ? new Date(s.createdAt) : new Date();
    const dateStr = dateObj.toLocaleDateString();
    const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const retQty = s.returnedQty || 0;
    const retAmt = s.returnedAmount || 0;
    const origQty = s.quantity;
    const activeQty = Math.max(0, origQty - retQty);

    const origTotal = s.totalAmount || (origQty * s.sellingPrice);
    const tot = Math.max(0, origTotal - retAmt);
    const pName = (s as any).productName || (s as any).variant?.productName || 'Shoe Item';
    const computedStatus = s.status || (retQty >= origQty ? 'Returned' : (retQty > 0 ? 'Partially Returned' : 'Completed'));

    return {
      id: s.id,
      saleNo: `SL-2026-001${46 - idx}`,
      dateStr,
      timeStr,
      dateTimeFull: `${dateStr}, ${timeStr}`,
      itemsCount: activeQty,
      items: [{ name: pName, qty: activeQty, price: s.sellingPrice, total: tot }],
      subtotal: tot / 1.15,
      vat: tot - (tot / 1.15),
      totalAmount: tot,
      paymentMethod: s.paymentMethod || 'cash',
      status: computedStatus,
      rawDate: s.createdAt || new Date().toISOString()
    };
  });

  const formattedSalesList = rawSalesList.map((sale) => {
    const retInfo = processedReturns[sale.id];
    if (!retInfo) return sale;

    const newTotalAmount = Math.max(0, sale.totalAmount - retInfo.returnedAmount);
    const newItemsCount = Math.max(0, sale.itemsCount - retInfo.returnedQty);
    const newSubtotal = newTotalAmount / 1.15;
    const newVat = newTotalAmount - newSubtotal;

    return {
      ...sale,
      totalAmount: newTotalAmount,
      subtotal: newSubtotal,
      vat: newVat,
      itemsCount: newItemsCount,
      status: retInfo.status || (newTotalAmount <= 0 ? 'Returned' : 'Partially Returned'),
      items: retInfo.items || sale.items
    };
  });

  // Filter sales list by date range and payment method if provided
  const activeSales = formattedSalesList.filter(item => {
    if (historyPaymentMethod !== 'all') {
      const pm = (item.paymentMethod || 'cash').toLowerCase();
      if (historyPaymentMethod === 'cbe_birr') {
        if (pm !== 'cbe_birr' && pm !== 'cbe' && pm !== 'cbebirr') return false;
      } else if (pm !== historyPaymentMethod) {
        return false;
      }
    }
    if (!historyFromDate && !historyToDate) return true;
    const itemTime = new Date(item.rawDate).getTime();
    if (historyFromDate) {
      const fromTime = new Date(`${historyFromDate}T00:00:00`).getTime();
      if (itemTime < fromTime) return false;
    }
    if (historyToDate) {
      const toTime = new Date(`${historyToDate}T23:59:59.999`).getTime();
      if (itemTime > toTime) return false;
    }
    return true;
  });

  // Pagination State
  const [salesPage, setSalesPage] = useState(1);
  const salesPageSize = 10;

  useEffect(() => {
    setSalesPage(1);
  }, [historyFromDate, historyToDate, historyPaymentMethod]);

  const paginatedSales = useMemo(() => {
    const start = (salesPage - 1) * salesPageSize;
    return activeSales.slice(start, start + salesPageSize);
  }, [activeSales, salesPage, salesPageSize]);

  const totalSalesCount = activeSales.length;
  const totalRevenue = activeSales.reduce((sum, item) => sum + item.totalAmount, 0);
  const totalItemsSold = activeSales.reduce((sum, item) => sum + item.itemsCount, 0);
  const avgTransaction = totalSalesCount > 0 ? totalRevenue / totalSalesCount : 0;

  return (
    <div className="space-y-5 text-slate-900 dark:text-slate-100">
      
      {/* HEADER WITH TITLE & TERMINAL / HISTORY TOGGLE */}
      <div className="flex justify-between items-center pb-1">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            {activeMode === 'history' ? 'Sales History' : 'Point of Sale (POS)'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {activeMode === 'history' ? 'View and manage all sales transactions.' : 'Quick POS checkout terminal for shoe stock sales.'}
          </p>
        </div>

        {/* MODE SWITCHER BUTTONS */}
        <div className="flex items-center space-x-2 bg-slate-100 dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] p-1 rounded-xl text-xs">
          <button
            onClick={() => setActiveMode('history')}
            className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer transition-colors flex items-center space-x-1.5 ${
              activeMode === 'history' ? 'bg-white dark:bg-[#1e2233] text-slate-900 dark:text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Sales History</span>
          </button>
          <button
            onClick={() => setActiveMode('pos')}
            className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer transition-colors flex items-center space-x-1.5 ${
              activeMode === 'pos' ? 'bg-white dark:bg-[#1e2233] text-slate-900 dark:text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>POS Terminal</span>
          </button>
        </div>
      </div>

      {returnSuccessMsg && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-600 dark:text-rose-300 text-xs font-medium flex items-center justify-between shadow-xs">
          <span>{returnSuccessMsg}</span>
          <button onClick={() => setReturnSuccessMsg(null)} className="text-rose-400 hover:text-rose-600 dark:hover:text-white p-0.5">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {activeMode === 'history' ? (
        /* SALES HISTORY VIEW */
        <div className="space-y-5">
          
          {/* 4 STAT CARDS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* CARD 1: TOTAL SALES */}
            <div className="bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] rounded-xl p-4 flex justify-between items-start shadow-xs">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Sales</p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1.5 font-mono">
                  {totalSalesCount}
                </h3>
              </div>
              <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-[#181b28] border border-slate-200 dark:border-[#262b3f] text-slate-600 dark:text-slate-400">
                <Receipt className="w-4 h-4" />
              </div>
            </div>

            {/* CARD 2: REVENUE */}
            <div className="bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] rounded-xl p-4 flex justify-between items-start shadow-xs">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Revenue</p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1.5 font-mono tracking-wide">
                  {formatPrice(totalRevenue, true)} ETB
                </h3>
              </div>
              <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-[#181b28] border border-slate-200 dark:border-[#262b3f] text-slate-600 dark:text-slate-400">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>

            {/* CARD 3: ITEMS SOLD */}
            <div className="bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] rounded-xl p-4 flex justify-between items-start shadow-xs">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Items Sold</p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1.5 font-mono">
                  {totalItemsSold}
                </h3>
              </div>
              <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-[#181b28] border border-slate-200 dark:border-[#262b3f] text-slate-600 dark:text-slate-400">
                <ShoppingBag className="w-4 h-4" />
              </div>
            </div>

            {/* CARD 4: AVG TRANSACTION */}
            <div className="bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] rounded-xl p-4 flex justify-between items-start shadow-xs">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Avg. Transaction</p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1.5 font-mono tracking-wide">
                  {formatPrice(avgTransaction, true)} ETB
                </h3>
              </div>
              <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-[#181b28] border border-slate-200 dark:border-[#262b3f] text-slate-600 dark:text-slate-400">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>

          </div>

          {/* DATE & PAYMENT FILTERS ROW */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-600 dark:text-slate-400 font-medium">From:</span>
              <input 
                type="date"
                value={historyFromDate}
                onChange={(e) => setHistoryFromDate(e.target.value)}
                className="bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500 font-mono cursor-pointer"
              />
            </div>

            <div className="flex items-center space-x-1.5">
              <span className="text-slate-600 dark:text-slate-400 font-medium">To:</span>
              <input 
                type="date"
                value={historyToDate}
                onChange={(e) => setHistoryToDate(e.target.value)}
                className="bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500 font-mono cursor-pointer"
              />
            </div>

            <div className="flex items-center space-x-1.5">
              <span className="text-slate-600 dark:text-slate-400 font-medium">Payment:</span>
              <select
                value={historyPaymentMethod}
                onChange={(e) => setHistoryPaymentMethod(e.target.value)}
                className="bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500 font-medium cursor-pointer"
              >
                <option value="all">All Methods</option>
                <option value="cash">Cash</option>
                <option value="telebirr">Telebirr</option>
                <option value="cbe_birr">CBE Birr</option>
                <option value="card">Card</option>
                <option value="mobile_money">Mobile Money</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="other">Other</option>
              </select>
            </div>

            {(historyFromDate || historyToDate || historyPaymentMethod !== 'all') && (
              <button 
                onClick={() => { setHistoryFromDate(''); setHistoryToDate(''); setHistoryPaymentMethod('all'); }}
                className="px-2.5 py-1.5 bg-slate-100 dark:bg-[#181b28] hover:bg-slate-200 dark:hover:bg-[#22273a] text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                Clear Filter
              </button>
            )}
          </div>

          {/* SALES HISTORY DATA TABLE */}
          <div className="bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] rounded-xl overflow-hidden min-h-[360px] shadow-xs">
            {loading ? (
              <LoadingSpinner message="Loading sales history..." />
            ) : (
              <>
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-[#161926] text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                      <th className="p-4 pl-6">SALE #</th>
                      <th className="p-4">DATE/TIME</th>
                      <th className="p-4">ITEMS</th>
                      <th className="p-4">TOTAL</th>
                      <th className="p-4">PAYMENT</th>
                      <th className="p-4">STATUS</th>
                      <th className="p-4 pr-6 text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#1a1e2e] font-medium text-slate-800 dark:text-slate-200">
                    {paginatedSales.map((sale) => {
                      const isReturned = sale.status.toLowerCase().includes('return') || sale.status.toLowerCase().includes('refund');

                      return (
                        <tr key={sale.id} className="hover:bg-slate-50 dark:hover:bg-[#181b28] transition-colors">
                          <td className="p-4 pl-6 font-mono font-bold text-slate-900 dark:text-white tracking-wide">
                            {sale.saleNo}
                          </td>
                          <td className="p-4 font-mono">
                            <span className="text-slate-700 dark:text-slate-300">{sale.dateStr}</span>
                            <span className="text-slate-400 dark:text-slate-500 ml-1.5">{sale.timeStr}</span>
                          </td>
                          <td className="p-4 font-mono">{sale.itemsCount}</td>
                          <td className="p-4 font-bold text-slate-900 dark:text-white font-mono tracking-wider">
                            {formatPrice(sale.totalAmount, true)} ETB
                          </td>
                          <td className="p-4">
                            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-[#181b28] border border-slate-200 dark:border-[#262b3f] text-slate-700 dark:text-slate-300 text-[10px] font-medium">
                              {formatPaymentMethodLabel(sale.paymentMethod)}
                            </span>
                          </td>
                          <td className="p-4">
                            {isReturned ? (
                              <span className="px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 font-bold text-[11px]">
                                {sale.status}
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                                {sale.status}
                              </span>
                            )}
                          </td>
                          <td className="p-4 pr-6 text-right">
                            <button 
                              onClick={() => setSelectedSale(sale)}
                              className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 cursor-pointer transition-colors"
                              title="View Sale Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {activeSales.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-8">
                          <EmptyState
                            title="No sales history found"
                            description="No recorded sales transactions match your date range or search query."
                          />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                <Pagination 
                  currentPage={salesPage} 
                  totalPages={Math.ceil(activeSales.length / salesPageSize) || 1} 
                  onPageChange={setSalesPage} 
                />
              </>
            )}
          </div>

        </div>
      ) : (
        /* POS TERMINAL VIEW */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          
          {/* LEFT 2-COLUMNS: SEARCH, CATEGORIES & PRODUCT CARDS GRID */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* 1. TOP SEARCH BAR WITH CTRL+K SHORTCUT */}
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3" />
              <input 
                type="text"
                placeholder="Search products by name, generic name, or SKU..."
                value={posSearchQuery}
                onChange={(e) => setPosSearchQuery(e.target.value)}
                className="w-full pl-10 pr-20 py-2.5 bg-white dark:bg-[#0b0c14] border border-slate-200 dark:border-[#1e2233] rounded-xl text-xs text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/60 font-sans shadow-xs"
              />
              <kbd className="absolute right-3 top-2 px-2 py-0.5 text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-[#141724] border border-slate-200 dark:border-[#262b3f] rounded-md">
                Ctrl+K
              </kbd>
            </div>

            {/* 2. CATEGORY FILTER PILLS */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-1.5 scrollbar-none">
              {categories.map((cat) => {
                const isSelected = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#6366f1] text-white font-bold shadow-sm'
                        : 'bg-white dark:bg-[#12141e] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-[#1e2233]'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* 3. PRODUCT CARDS GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 max-h-[calc(100vh-250px)] overflow-y-auto pr-1">
              {filteredPosProducts.map((prod) => {
                const rawBrand = (prod as any).brand || (prod as any).productBrand || (prod as any).product?.brand;
                const brand = typeof rawBrand === 'object' && rawBrand ? rawBrand.name : (typeof rawBrand === 'string' ? rawBrand : 'Nike');
                const size = (prod as any).size || 'EU 42';

                return (
                  <div
                    key={prod.id}
                    onClick={() => addToCart(prod)}
                    className="bg-white dark:bg-[#0b0c14] border border-slate-200 dark:border-[#1e2233] rounded-xl p-3.5 cursor-pointer hover:border-indigo-500/50 hover:bg-slate-50 dark:hover:bg-[#121422] transition-all flex flex-col justify-between h-[126px] relative group shadow-xs"
                  >
                    <div>
                      <h3 className="font-bold text-xs text-slate-900 dark:text-white leading-tight line-clamp-1">
                        {prod.productName}
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1 font-sans">
                        {brand}
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                        Size: {size}
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-auto pt-2">
                      <span className="font-bold text-xs text-slate-900 dark:text-white font-mono tracking-tight">
                        {formatPrice(prod.price, true)} ETB
                      </span>
                      <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400/80 bg-indigo-50 dark:bg-indigo-500/10 px-1.5 py-0.5 rounded">
                        {(prod as any).category || (prod as any).product?.category || 'Shoe'}
                      </span>
                    </div>
                  </div>
                );
              })}

              {filteredPosProducts.length === 0 && (
                <div className="col-span-full py-16 text-center text-slate-500">
                  <p className="text-xs font-medium">No products found matching your search.</p>
                </div>
              )}
            </div>

          </div>

          {/* RIGHT SIDEBAR: CART CHECKOUT PANEL */}
          <div className="bg-white dark:bg-[#0b0c14] border border-slate-200 dark:border-[#1e2233] rounded-2xl p-4 flex flex-col justify-between h-[calc(100vh-180px)] min-h-[580px] shadow-xl text-slate-900 dark:text-slate-100">
            
            {/* CART TOP */}
            <div className="space-y-4">
              
              {/* CART HEADER */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#181b29]">
                <div className="flex items-center space-x-2">
                  <ShoppingCart className="w-4 h-4 text-slate-400" />
                  <span className="font-bold text-xs text-slate-900 dark:text-white">Cart</span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#161927] text-slate-700 dark:text-slate-300 text-xs font-bold font-mono">
                    {cart.reduce((s, c) => s + c.quantity, 0)}
                  </span>
                </div>
                {cart.length > 0 && (
                  <button 
                    onClick={clearCart}
                    className="text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer font-medium transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* CART ITEMS LIST */}
              <div className="space-y-3 overflow-y-auto max-h-[220px] pr-1">
                {cart.map((item) => (
                  <div key={item.variant.id} className="pt-2 pb-3 border-b border-slate-100 dark:border-[#161927] relative">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white pr-4 leading-tight">
                        {item.variant.productName}
                      </h4>
                      <button 
                        onClick={() => removeFromCart(item.variant.id)}
                        className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-0.5 cursor-pointer transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      {/* Quantity Controls */}
                      <div className="flex items-center space-x-2 bg-slate-50 dark:bg-[#08090f] border border-slate-200 dark:border-[#1c2030] rounded-lg px-2 py-1">
                        <button 
                          onClick={() => updateQuantity(item.variant.id, -1)}
                          className="text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-bold text-slate-900 dark:text-white min-w-[16px] text-center font-mono">
                          {item.quantity}
                        </span>
                        <button 
                          onClick={() => updateQuantity(item.variant.id, 1)}
                          className="text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Pricing Info */}
                      <div className="text-right">
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                          {formatPrice(item.variant.price, true)} ETB x {item.quantity}
                        </p>
                        <p className="font-bold text-xs text-slate-900 dark:text-white font-mono tracking-tight mt-0.5">
                          {formatPrice(item.variant.price * item.quantity, true)} ETB
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {cart.length === 0 && (
                  <div className="py-12 text-center text-slate-500">
                    <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-xs font-medium">Cart is empty</p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-600 mt-0.5">Click products on the left to add items.</p>
                  </div>
                )}
              </div>

              {/* COLLAPSIBLE OPTIONS: CUSTOMER INFO & NOTES */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-[#161927]">
                
                {/* Customer Info Optional Dropdown */}
                <div className="border-b border-slate-100 dark:border-[#161927] pb-2">
                  <button 
                    onClick={() => setCustomerInfoOpen(!customerInfoOpen)}
                    className="w-full flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 py-1 transition-colors cursor-pointer"
                  >
                    <span>Customer info (optional)</span>
                    {customerInfoOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                  {customerInfoOpen && (
                    <input 
                      type="text" 
                      value={customerInfoText}
                      onChange={(e) => setCustomerInfoText(e.target.value)}
                      placeholder="Enter customer name or phone..."
                      className="w-full mt-2 px-3 py-1.5 bg-slate-50 dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] rounded-lg text-xs text-slate-900 dark:text-slate-300 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50"
                    />
                  )}
                </div>

                {/* Notes Optional Dropdown */}
                <div className="border-b border-slate-100 dark:border-[#161927] pb-2">
                  <button 
                    onClick={() => setNotesOpen(!notesOpen)}
                    className="w-full flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 py-1 transition-colors cursor-pointer"
                  >
                    <span>Notes (optional)</span>
                    {notesOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                  {notesOpen && (
                    <textarea 
                      rows={2}
                      value={customerNotes}
                      onChange={(e) => setCustomerNotes(e.target.value)}
                      placeholder="Add transaction notes..."
                      className="w-full mt-2 px-3 py-1.5 bg-slate-50 dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] rounded-lg text-xs text-slate-900 dark:text-slate-300 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50 resize-none"
                    />
                  )}
                </div>

              </div>

            </div>

            {/* CHECKOUT BOTTOM: TOTALS, PAYMENT METHOD & COMPLETE SALE */}
            <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-[#181b29]">
              
              {/* FINANCIAL TOTALS */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>Subtotal</span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono">{formatPrice(subtotal, true)} ETB</span>
                </div>

                <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
                  <label className="flex items-center space-x-2 cursor-pointer select-none">
                    <input 
                      type="checkbox"
                      checked={includeVat}
                      onChange={(e) => setIncludeVat(e.target.checked)}
                      className="rounded border-slate-300 dark:border-[#262b3f] bg-slate-50 dark:bg-[#12141e] text-indigo-500 focus:ring-0"
                    />
                    <span>VAT (15%)</span>
                  </label>
                  <span className="font-bold text-slate-900 dark:text-white font-mono">{formatPrice(vatAmount, true)} ETB</span>
                </div>

                <div className="flex justify-between pt-2 border-t border-slate-100 dark:border-[#1c2030] text-sm font-extrabold text-slate-900 dark:text-white">
                  <span>Total</span>
                  <span className="font-mono text-base tracking-tight">{formatPrice(totalAmount, true)} ETB</span>
                </div>
              </div>

              {/* PAYMENT METHOD SELECTOR (Cash, Telebirr, CBE Birr, Card) */}
              <div className="grid grid-cols-4 gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`py-2 px-1 rounded-xl text-[11px] font-bold flex flex-col items-center justify-center space-y-1 cursor-pointer transition-colors ${
                    paymentMethod === 'cash'
                      ? 'bg-[#6366f1] text-white shadow-md'
                      : 'bg-slate-50 dark:bg-[#0b0c14] border border-slate-200 dark:border-[#1e2233] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Cash</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('telebirr')}
                  className={`py-2 px-1 rounded-xl text-[11px] font-bold flex flex-col items-center justify-center space-y-1 cursor-pointer transition-colors ${
                    paymentMethod === 'telebirr'
                      ? 'bg-[#6366f1] text-white shadow-md'
                      : 'bg-slate-50 dark:bg-[#0b0c14] border border-slate-200 dark:border-[#1e2233] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Telebirr</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('cbe_birr')}
                  className={`py-2 px-1 rounded-xl text-[11px] font-bold flex flex-col items-center justify-center space-y-1 cursor-pointer transition-colors ${
                    paymentMethod === 'cbe_birr'
                      ? 'bg-[#6366f1] text-white shadow-md'
                      : 'bg-slate-50 dark:bg-[#0b0c14] border border-slate-200 dark:border-[#1e2233] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Landmark className="w-3.5 h-3.5" />
                  <span>CBE Birr</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`py-2 px-1 rounded-xl text-[11px] font-bold flex flex-col items-center justify-center space-y-1 cursor-pointer transition-colors ${
                    paymentMethod === 'card'
                      ? 'bg-[#6366f1] text-white shadow-md'
                      : 'bg-slate-50 dark:bg-[#0b0c14] border border-slate-200 dark:border-[#1e2233] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Card</span>
                </button>
              </div>

              {/* COMPLETE SALE BUTTON */}
              <button
                disabled={cart.length === 0 || recording}
                onClick={handleCheckout}
                className="w-full py-3 bg-[#6366f1] hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-lg transition-colors cursor-pointer flex items-center justify-center"
              >
                <span>{recording ? 'Processing...' : 'Complete Sale'}</span>
              </button>

              {saleSuccessMessage && (
                <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-600 dark:text-emerald-400 text-xs font-medium text-center">
                  {saleSuccessMessage}
                </div>
              )}

            </div>

          </div>

        </div>
      )}

      {/* SALE DETAILS MODAL POPUP */}
      {selectedSale && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedSale(null)}
        >
          <div 
            className="bg-white dark:bg-[#0b0c15] border border-slate-200 dark:border-[#1e2233] rounded-2xl w-full max-w-md p-6 relative shadow-2xl animate-in fade-in duration-150 text-slate-900 dark:text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Title Bar */}
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Sale Details</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                  {selectedSale.saleNo} - {selectedSale.dateTimeFull || `${selectedSale.dateStr}, ${selectedSale.timeStr}`}
                </p>
                <div className="flex items-center space-x-2 mt-3">
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-xs">{selectedSale.status}</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-[#181b28] border border-slate-200 dark:border-[#262b3f] text-slate-700 dark:text-slate-300 text-[11px] font-medium">
                    {formatPaymentMethodLabel(selectedSale.paymentMethod)}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedSale(null)}
                className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Items Table */}
            <div className="mt-5">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-[#1c2030] text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 text-left font-semibold">ITEM</th>
                    <th className="py-2.5 text-center font-semibold">QTY</th>
                    <th className="py-2.5 text-right font-semibold">PRICE</th>
                    <th className="py-2.5 text-right font-semibold">TOTAL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#181b29] font-medium text-slate-800 dark:text-slate-200">
                  {selectedSale.items && selectedSale.items.length > 0 ? (
                    selectedSale.items.map((item: any, idx: number) => (
                      <tr key={idx}>
                        <td className="py-3 text-slate-900 dark:text-white font-medium">{item.name}</td>
                        <td className="py-3 text-center font-mono">{item.qty}</td>
                        <td className="py-3 text-right font-mono">{formatPrice(item.price, true)} ETB</td>
                        <td className="py-3 text-right font-mono font-semibold text-slate-900 dark:text-white">{formatPrice(item.total, true)} ETB</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="py-3 text-slate-900 dark:text-white font-medium">Shoe Item</td>
                      <td className="py-3 text-center font-mono">{selectedSale.itemsCount}</td>
                      <td className="py-3 text-right font-mono">{formatPrice(selectedSale.totalAmount / (selectedSale.itemsCount || 1), true)} ETB</td>
                      <td className="py-3 text-right font-mono font-semibold text-slate-900 dark:text-white">{formatPrice(selectedSale.totalAmount, true)} ETB</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Subtotals & Totals */}
            <div className="space-y-2 border-t border-slate-100 dark:border-[#1c2030] pt-4 mt-2 text-xs font-mono">
              <div className="flex justify-between text-slate-500 dark:text-[#8888a0]">
                <span className="font-sans">Subtotal</span>
                <span className="text-slate-900 dark:text-white font-mono">{formatPrice(selectedSale.subtotal || (selectedSale.totalAmount / 1.15), true)} ETB</span>
              </div>
              <div className="flex justify-between text-slate-500 dark:text-[#8888a0]">
                <span className="font-sans">VAT</span>
                <span className="text-slate-900 dark:text-white font-mono">{formatPrice(selectedSale.vat || (selectedSale.totalAmount - (selectedSale.totalAmount / 1.15)), true)} ETB</span>
              </div>
              <div className="flex justify-between items-center text-sm font-bold text-slate-900 dark:text-white pt-2 border-t border-slate-100 dark:border-[#1c2030]">
                <span className="font-bold font-sans">Total</span>
                <span className="text-slate-900 dark:text-white font-mono text-base font-extrabold">{formatPrice(selectedSale.totalAmount, true)} ETB</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2.5 mt-6">
              <button 
                onClick={() => handleOpenReturnModal(selectedSale)}
                className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-[#12141e] border border-slate-200 dark:border-[#262b3f] text-slate-800 dark:text-white text-xs font-medium hover:bg-slate-200 dark:hover:bg-[#1a1e2e] flex items-center space-x-1.5 cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500 dark:text-slate-300" />
                <span>Process Return</span>
              </button>
              <button 
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-[#12141e] border border-slate-200 dark:border-[#262b3f] text-slate-800 dark:text-white text-xs font-medium hover:bg-slate-200 dark:hover:bg-[#1a1e2e] cursor-pointer transition-colors"
              >
                Print
              </button>
            </div>

          </div>
        </div>
      )}

      {/* PROCESS RETURN MODAL POPUP */}
      {returnSale && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={() => setReturnSale(null)}
        >
          <div 
            className="bg-white dark:bg-[#0b0c15] border border-slate-200 dark:border-[#1e2233] rounded-2xl w-full max-w-md p-6 relative shadow-2xl animate-in fade-in duration-150 text-slate-900 dark:text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Process Return</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-sans">
                  Return items from sale {returnSale.saleNo}
                </p>
              </div>
              <button 
                onClick={() => setReturnSale(null)}
                className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Table */}
            <div className="mt-5">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-[#1c2030] text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 text-left font-semibold">ITEM</th>
                    <th className="py-2.5 text-center font-semibold">MAX</th>
                    <th className="py-2.5 text-right font-semibold pr-1">RETURN QTY</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#181b29] font-medium text-slate-800 dark:text-slate-200">
                  {(returnSale.items && returnSale.items.length > 0
                    ? returnSale.items
                    : [{ name: 'Shoe Item', qty: returnSale.itemsCount || 1 }]
                  ).map((item: any, idx: number) => {
                    const maxQty = item.qty || 1;
                    const currentVal = returnQuantities[idx] ?? 0;
                    return (
                      <tr key={idx}>
                        <td className="py-3 text-slate-900 dark:text-white font-medium">{item.name}</td>
                        <td className="py-3 text-center font-bold text-slate-900 dark:text-white font-mono">{maxQty}</td>
                        <td className="py-3 text-right">
                          <input
                            type="number"
                            min="0"
                            max={maxQty}
                            value={currentVal}
                            onChange={(e) => {
                              const parsed = parseInt(e.target.value, 10);
                              const val = isNaN(parsed) ? 0 : Math.min(maxQty, Math.max(0, parsed));
                              setReturnQuantities(prev => ({ ...prev, [idx]: val }));
                            }}
                            className="bg-slate-50 dark:bg-[#12141e] border border-slate-200 dark:border-[#262b3f] text-slate-900 dark:text-white text-center rounded-lg px-2 py-1 text-xs w-16 focus:outline-none focus:border-indigo-500 font-mono inline-block"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Reason Textarea */}
            <div className="mt-5 space-y-1.5">
              <label className="block text-xs font-semibold text-slate-800 dark:text-white">
                Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="Reason for return..."
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] rounded-xl p-3 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/80 resize-none font-sans"
              />
            </div>

            {/* Restock Checkbox */}
            <div className="mt-4 flex items-center">
              <label className="flex items-center space-x-2.5 cursor-pointer text-xs font-medium text-slate-800 dark:text-white">
                <input 
                  type="checkbox"
                  checked={restockReturned}
                  onChange={(e) => setRestockReturned(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 dark:border-[#262b3f] bg-slate-50 dark:bg-[#12141e] text-indigo-600 focus:ring-0 cursor-pointer"
                />
                <span>Restock returned items</span>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={() => setReturnSale(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-[#12141e] border border-slate-200 dark:border-[#262b3f] text-slate-800 dark:text-white text-xs font-medium hover:bg-slate-200 dark:hover:bg-[#1a1e2e] cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReturn}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md cursor-pointer transition-colors"
              >
                Confirm Return
              </button>
            </div>

          </div>
        </div>
      )}

      {/* SALE RECEIPT MODAL (Matching requested design & screenshot) */}
      {completedReceipt && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={() => setCompletedReceipt(null)}
        >
          <div 
            className="bg-white rounded-2xl w-full max-w-sm sm:max-w-md p-6 relative shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-slate-800 border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">Sale Receipt</h2>
                <p className="text-xs text-slate-500 mt-0.5 font-sans">
                  Sale completed successfully
                </p>
              </div>
              <button 
                onClick={() => setCompletedReceipt(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Store Information Header */}
            <div className="text-center mt-5 mb-6 space-y-0.5">
              <h3 className="text-base font-bold text-slate-900 leading-tight">{completedReceipt.storeName}</h3>
              <p className="text-xs text-slate-500 font-medium">{completedReceipt.branchName}</p>
              <p className="text-xs text-slate-400 font-normal">{completedReceipt.dateTime}</p>
              <p className="text-xs font-bold font-mono text-slate-900 tracking-wider pt-1">{completedReceipt.receiptNo}</p>
            </div>

            {/* Table */}
            <div className="border-t border-slate-100 pt-3">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-100">
                    <th className="pb-2 text-left font-semibold">ITEM</th>
                    <th className="pb-2 text-center font-semibold">QTY</th>
                    <th className="pb-2 text-right font-semibold">PRICE</th>
                    <th className="pb-2 text-right font-semibold">TOTAL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans text-slate-700">
                  {completedReceipt.items.map((item: any, idx: number) => (
                    <tr key={idx}>
                      <td className="py-3 text-slate-900 font-medium max-w-[140px] truncate">{item.name}</td>
                      <td className="py-3 text-center font-mono">{item.qty}</td>
                      <td className="py-3 text-right font-mono">{formatPrice(item.price, true)} ETB</td>
                      <td className="py-3 text-right font-mono font-semibold text-slate-900">{formatPrice(item.total, true)} ETB</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Subtotal, VAT, Total */}
            <div className="space-y-2 border-t border-slate-100 pt-4 mt-1 text-xs font-mono">
              <div className="flex justify-between text-slate-500 font-sans">
                <span>Subtotal</span>
                <span className="font-mono text-slate-800">{formatPrice(completedReceipt.subtotal, true)} ETB</span>
              </div>
              <div className="flex justify-between text-slate-500 font-sans">
                <span>VAT (15%)</span>
                <span className="font-mono text-slate-800">{formatPrice(completedReceipt.vat, true)} ETB</span>
              </div>
              <div className="flex justify-between items-center text-sm font-bold text-slate-900 pt-2 border-t border-slate-100">
                <span className="font-bold font-sans">Total</span>
                <span className="font-mono text-base font-extrabold text-slate-900">{formatPrice(completedReceipt.totalAmount, true)} ETB</span>
              </div>
            </div>

            {/* Payment Method */}
            <div className="flex justify-between items-center mt-5 pt-3 border-t border-slate-100 text-xs">
              <span className="text-slate-500 font-sans">Payment Method</span>
              <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium text-xs shadow-xs">
                {completedReceipt.paymentMethod}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2.5 mt-6 pt-2">
              <button 
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 flex items-center space-x-1.5 cursor-pointer shadow-xs transition-colors"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                <span>Print</span>
              </button>
              <button 
                onClick={() => setCompletedReceipt(null)}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm cursor-pointer transition-colors"
              >
                New Sale
              </button>
            </div>

          </div>
        </div>
      )}

      {/* FLOATING SUCCESS TOAST NOTIFICATION (Matching requested image) */}
      {completedToast && (
        <div className="fixed bottom-6 right-6 z-50 shadow-xl rounded-xl p-4 min-w-[280px] max-w-sm bg-[#eafaf1] border border-[#a8ecc1] text-[#0f5233] animate-in slide-in-from-bottom-5 fade-in duration-200 flex items-start justify-between space-x-3">
          <div>
            <h4 className="text-sm font-semibold text-[#093e27] leading-tight">{completedToast.title}</h4>
            <p className="text-xs text-[#146c46] mt-0.5">{completedToast.message}</p>
          </div>
          <button 
            onClick={() => setCompletedToast(null)}
            className="text-[#146c46] hover:text-[#093e27] p-0.5 rounded transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

    </div>
  );
}
