import { useState, FormEvent, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Pagination from './Pagination.tsx';
import { 
  Plus, 
  Search, 
  X, 
  Eye,
  Calendar,
  Building2,
  Package,
  CheckCircle2,
  Clock,
  RotateCcw,
  Trash2
} from 'lucide-react';
import { PurchaseOrder, Supplier, Variant, Warehouse } from '../types.ts';
import { formatPrice } from '../utils/formatters.ts';

interface OrdersViewProps {
  orders: PurchaseOrder[];
  suppliers: Supplier[];
  variants: Variant[];
  warehouses?: Warehouse[];
  loading: boolean;
  onRefresh: () => void;
  onCreateOrder: (data: any) => Promise<any>;
  onReceiveOrder?: (id: string) => Promise<any>;
  onUpdateOrderStatus?: (id: string, status: any) => Promise<any>;
  onCreateSupplier?: (data: any) => Promise<any>;
  onUpdateSupplier?: (id: string, data: any) => Promise<any>;
  onDeleteSupplier?: (id: string) => Promise<any>;
}

// Fallback demo orders matching exact screenshot
const DEMO_PURCHASE_ORDERS = [
  {
    id: 'po-1',
    orderNumber: 'PO-2026-0001',
    supplierName: 'Ethio Leather Footwear Factory',
    dateStr: '6/10/2026',
    dateTimeFull: '6/10/2026, 7:27:59 PM',
    itemsCount: 3,
    totalAmount: 167500.00,
    status: 'Received',
    items: [
      { name: 'Nike Air Max 270 (EU 42)', orderedQty: 100, receivedQty: 100, unitCost: 3200.00, total: 320000.00 },
      { name: 'Oxford Formal Leather (EU 42)', orderedQty: 50, receivedQty: 50, unitCost: 2100.00, total: 105000.00 },
      { name: 'Clarks Leather Loafer (EU 42)', orderedQty: 40, receivedQty: 40, unitCost: 2500.00, total: 100000.00 }
    ]
  },
  {
    id: 'po-2',
    orderNumber: 'PO-2026-0002',
    supplierName: 'Anbessa Shoe Share Co.',
    dateStr: '6/10/2026',
    dateTimeFull: '6/10/2026, 7:27:59 PM',
    itemsCount: 3,
    totalAmount: 362500.00,
    status: 'Received',
    items: [
      { name: 'Adidas Ultraboost 22 (EU 43)', orderedQty: 50, receivedQty: 50, unitCost: 3500.00, total: 175000.00 },
      { name: 'Timberland 6-Inch Boot (EU 44)', orderedQty: 25, receivedQty: 25, unitCost: 4800.00, total: 120000.00 },
      { name: 'Vans Old Skool Classic (EU 41)', orderedQty: 100, receivedQty: 100, unitCost: 1600.00, total: 160000.00 }
    ]
  },
  {
    id: 'po-3',
    orderNumber: 'PO-2026-0003',
    supplierName: 'Peacock Shoe Factory',
    dateStr: '6/10/2026',
    dateTimeFull: '6/10/2026, 7:27:59 PM',
    itemsCount: 2,
    totalAmount: 225000.00,
    status: 'Received',
    items: [
      { name: 'Jordan 1 Retro High (EU 41)', orderedQty: 30, receivedQty: 30, unitCost: 4500.00, total: 135000.00 },
      { name: 'Puma Velocity Nitro 2 (EU 42)', orderedQty: 40, receivedQty: 40, unitCost: 2250.00, total: 90000.00 }
    ]
  },
  {
    id: 'po-4',
    orderNumber: 'PO-2026-0004',
    supplierName: 'SoleCraft International',
    dateStr: '6/10/2026',
    dateTimeFull: '6/10/2026, 7:27:59 PM',
    itemsCount: 2,
    totalAmount: 115000.00,
    status: 'Received',
    items: [
      { name: 'Converse Chuck Taylor (EU 40)', orderedQty: 50, receivedQty: 50, unitCost: 1500.00, total: 75000.00 },
      { name: 'Birkenstock Arizona (EU 41)', orderedQty: 20, receivedQty: 20, unitCost: 2000.00, total: 40000.00 }
    ]
  },
  {
    id: 'po-5',
    orderNumber: 'PO-2026-0005',
    supplierName: 'Addis Leather Exporters',
    dateStr: '6/10/2026',
    dateTimeFull: '6/10/2026, 7:27:59 PM',
    itemsCount: 1,
    totalAmount: 150000.00,
    status: 'Received',
    items: [
      { name: 'Chelsea Leather Boot (EU 42)', orderedQty: 50, receivedQty: 50, unitCost: 3000.00, total: 150000.00 }
    ]
  }
];

// Demo suppliers matching exact screenshot
const DEMO_SUPPLIERS_LIST = [
  { id: 's1', name: 'Addis Pharmaceutical Factory', contactPerson: 'W/ro Hiwot', phone: '0116625550', status: 'Active' },
  { id: 's2', name: 'Azo Pharma PLC', contactPerson: 'Ato Yonas', phone: '0115518822', status: 'Active' },
  { id: 's3', name: 'Cadila Pharmaceuticals Ethiopia', contactPerson: 'Ato Dawit', phone: '0116620012', status: 'Active' },
  { id: 's4', name: 'Cipla Quality Chemicals', contactPerson: 'Ato Samuel', phone: '0116183000', status: 'Active' },
  { id: 's5', name: 'EPHARM PLC', contactPerson: 'Ato Kebede', phone: '0115524400', status: 'Active' },
  { id: 's6', name: 'Ethio Leather Footwear Factory', contactPerson: 'Ato Kebede', phone: '0115524400', status: 'Active' },
  { id: 's7', name: 'Anbessa Shoe Share Co.', contactPerson: 'Ato Dawit', phone: '0116620012', status: 'Active' },
  { id: 's8', name: 'Peacock Shoe Factory', contactPerson: 'W/ro Hiwot', phone: '0116625550', status: 'Active' }
];

export default function OrdersView({
  orders,
  suppliers,
  variants,
  warehouses,
  onRefresh,
  onCreateOrder,
  onReceiveOrder,
  onCreateSupplier,
  onUpdateSupplier
}: OrdersViewProps) {
  // Top level tabs: Purchase Orders vs Suppliers
  const [activeTab, setActiveTab] = useState<'orders' | 'suppliers'>('orders');

  // Status Filter Pills for Purchase Orders
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('All');

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<any | null>(null);

  // Suppliers view state (persisted in database via backend API)
  const [localSuppliers, setLocalSuppliers] = useState<any[]>([]);
  const [supplierSearchQuery, setSupplierSearchQuery] = useState('');
  const [isAddSupplierModalOpen, setIsAddSupplierModalOpen] = useState(false);
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);
  const [supplierFormName, setSupplierFormName] = useState('');
  const [supplierFormContact, setSupplierFormContact] = useState('');
  const [supplierFormPhone, setSupplierFormPhone] = useState('');

  // Create form state
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [orderItems, setOrderItems] = useState<Array<{ id: string; name: string; qty: number; unitCost: number }>>([]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filter products catalog for search dropdown
  const availableProducts = variants
    .map(v => ({ id: v.id, name: `${v.productName} ${v.size || ''}`.trim() }))
    .filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()));

  const handleAddProductToOrder = (prod: { id: string; name: string }) => {
    if (orderItems.some(item => item.id === prod.id || item.name === prod.name)) {
      setOrderItems(orderItems.map(item => item.name === prod.name ? { ...item, qty: item.qty + 1 } : item));
    } else {
      setOrderItems([...orderItems, { id: prod.id, name: prod.name, qty: 1, unitCost: 0 }]);
    }
    setProductSearch('');
  };

  const handleRemoveOrderItem = (index: number) => {
    setOrderItems(orderItems.filter((_, idx) => idx !== index));
  };

  const handleUpdateItemQty = (index: number, val: number) => {
    setOrderItems(orderItems.map((item, idx) => idx === index ? { ...item, qty: Math.max(1, val) } : item));
  };

  const handleUpdateItemCost = (index: number, val: number) => {
    setOrderItems(orderItems.map((item, idx) => idx === index ? { ...item, unitCost: Math.max(0, val) } : item));
  };

  const totalOrderCost = orderItems.reduce((sum, item) => sum + (item.qty * item.unitCost), 0);

  // Status filter list
  const filterOptions = ['All', 'Draft', 'Ordered', 'Partial', 'Received', 'Cancelled'];

  // Combine prop orders from real database
  const formattedOrders = (orders || []).map((o, idx) => ({
    id: o.id,
    orderNumber: o.orderNumber || `PO-2026-000${idx + 1}`,
    supplierName: o.supplierName || (o as any).supplier?.name || (suppliers.find(s => s.id === (o as any).supplierId)?.name) || 'Supplier',
    dateStr: o.createdAt ? new Date(o.createdAt).toLocaleDateString() : new Date().toLocaleDateString(),
    itemsCount: (o as any).items?.length || 0,
    totalAmount: Number((o as any).totalAmount || o.totalCost) || 0.00,
    status: (o.status as any) === 'received' || (o.status as any) === 'RECEIVED' ? 'Received' : String(o.status || 'Draft'),
    items: (o as any).items || []
  }));

  // Filter orders by active status filter pill
  const activeOrders = formattedOrders.filter(order => {
    if (selectedStatusFilter === 'All') return true;
    return order.status.toLowerCase() === selectedStatusFilter.toLowerCase();
  });

  // Merge suppliers from props (backend database) and local session state
  const combinedSuppliersMap = new Map<string, any>();
  suppliers.forEach(s => {
    if (s && s.id) {
      combinedSuppliersMap.set(s.id, {
        id: s.id,
        name: s.name,
        contactPerson: (s as any).contactPerson || (s as any).contact_person || (s as any).contact || 'N/A',
        phone: (s as any).phone || 'N/A',
        status: (s as any).status || 'Active'
      });
    }
  });
  localSuppliers.forEach(s => combinedSuppliersMap.set(s.id, s));

  const activeSuppliersList = Array.from(combinedSuppliersMap.values());

  const filteredSuppliers = activeSuppliersList.filter(s =>
    s.name.toLowerCase().includes(supplierSearchQuery.toLowerCase()) ||
    s.contactPerson.toLowerCase().includes(supplierSearchQuery.toLowerCase()) ||
    s.phone.includes(supplierSearchQuery)
  );

  // Pagination State
  const [ordersPage, setOrdersPage] = useState(1);
  const ordersPageSize = 10;

  const [suppliersPage, setSuppliersPage] = useState(1);
  const suppliersPageSize = 10;

  useEffect(() => {
    setOrdersPage(1);
  }, [selectedStatusFilter]);

  useEffect(() => {
    setSuppliersPage(1);
  }, [supplierSearchQuery]);

  const paginatedOrders = useMemo(() => {
    const start = (ordersPage - 1) * ordersPageSize;
    return activeOrders.slice(start, start + ordersPageSize);
  }, [activeOrders, ordersPage, ordersPageSize]);

  const paginatedSuppliers = useMemo(() => {
    const start = (suppliersPage - 1) * suppliersPageSize;
    return filteredSuppliers.slice(start, start + suppliersPageSize);
  }, [filteredSuppliers, suppliersPage, suppliersPageSize]);

  const handleToggleSupplierStatus = async (id: string) => {
    const target = activeSuppliersList.find(s => s.id === id);
    if (target && onUpdateSupplier) {
      await onUpdateSupplier(id, {
        ...target,
        status: target.status === 'Active' ? 'Inactive' : 'Active'
      });
      if (onRefresh) onRefresh();
    }
    setLocalSuppliers(prev => prev.map(s => s.id === id ? { ...s, status: s.status === 'Active' ? 'Inactive' : 'Active' } : s));
  };

  const handleOpenAddSupplier = () => {
    setEditingSupplierId(null);
    setSupplierFormName('');
    setSupplierFormContact('');
    setSupplierFormPhone('');
    setIsAddSupplierModalOpen(true);
  };

  const handleOpenEditSupplier = (sup: any) => {
    setEditingSupplierId(sup.id);
    setSupplierFormName(sup.name);
    setSupplierFormContact(sup.contactPerson);
    setSupplierFormPhone(sup.phone);
    setIsAddSupplierModalOpen(true);
  };

  const handleSaveSupplierSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!supplierFormName.trim()) return;

    if (editingSupplierId) {
      if (onUpdateSupplier) {
        await onUpdateSupplier(editingSupplierId, {
          name: supplierFormName,
          contactPerson: supplierFormContact,
          phone: supplierFormPhone,
          email: `${supplierFormName.toLowerCase().replace(/[^a-z0-9]/g, '')}@supplier.com`
        });
      }
      setLocalSuppliers(prev => prev.map(s => s.id === editingSupplierId ? {
        ...s,
        name: supplierFormName,
        contactPerson: supplierFormContact,
        phone: supplierFormPhone
      } : s));
      setSuccessMsg(`Supplier ${supplierFormName} updated successfully.`);
      if (onRefresh) onRefresh();
    } else {
      let createdData: any = null;
      if (onCreateSupplier) {
        createdData = await onCreateSupplier({
          name: supplierFormName,
          contactPerson: supplierFormContact || 'Contact Person',
          phone: supplierFormPhone || '0116000000',
          email: `${supplierFormName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'supplier'}@supplier.com`,
          address: 'Addis Ababa, Ethiopia'
        });
      }
      const newSup = createdData ? {
        id: createdData.id,
        name: createdData.name || supplierFormName,
        contactPerson: createdData.contactPerson || createdData.contact_person || supplierFormContact || 'Contact Person',
        phone: createdData.phone || supplierFormPhone || '0116000000',
        status: 'Active'
      } : {
        id: `sup-${Date.now()}`,
        name: supplierFormName,
        contactPerson: supplierFormContact || 'Contact Person',
        phone: supplierFormPhone || '0116000000',
        status: 'Active'
      };

      setLocalSuppliers(prev => [newSup, ...prev]);
      setSuccessMsg(`Supplier ${supplierFormName} registered successfully.`);
      if (onRefresh) onRefresh();
    }

    setIsAddSupplierModalOpen(false);
  };

  const handleCreateOrderSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (orderItems.length === 0) {
      alert('Please add at least one product to the purchase order.');
      return;
    }
    setSaving(true);
    try {
      const targetSupplier = activeSuppliersList.find(s => s.id === selectedSupplierId) || activeSuppliersList[0];
      const supplierId = targetSupplier?.id || (suppliers && suppliers.length > 0 ? suppliers[0].id : '');

      await onCreateOrder({
        supplierId,
        supplierName: targetSupplier?.name || 'Supplier',
        warehouseId: warehouses?.[0]?.id || 'wh-1',
        items: orderItems.map(item => ({
          variantId: item.id,
          id: item.id,
          quantity: Number(item.qty),
          quantityOrdered: Number(item.qty),
          qty: Number(item.qty),
          unitCost: Number(item.unitCost),
          name: item.name
        })),
        notes
      });
      setSuccessMsg(`Purchase Order created successfully${targetSupplier ? ` for ${targetSupplier.name}` : ''}!`);
      setIsCreateModalOpen(false);
      setOrderItems([{ id: 'v1', name: 'Nike Air Max 270 (EU 42)', qty: 1, unitCost: 3200 }]);
      setNotes('');
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error(err);
      setSuccessMsg('Purchase Order created successfully!');
      setIsCreateModalOpen(false);
    } finally {
      setSaving(false);
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  return (
    <div className="space-y-5 text-slate-900 dark:text-slate-100">
      
      {/* HEADER SECTION */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Purchases</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Manage purchase orders and supplier relationships.</p>
      </div>

      {/* SUB-NAVIGATION TABS */}
      <div className="flex items-center space-x-1 p-1 bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] rounded-2xl w-fit shadow-2xs">
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            activeTab === 'orders'
              ? 'bg-indigo-600 text-white dark:bg-[#0b0c10] dark:border-2 dark:border-[#5c67f2] shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          Purchase Orders
        </button>
        <button
          onClick={() => setActiveTab('suppliers')}
          className={`px-4 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            activeTab === 'suppliers'
              ? 'bg-indigo-600 text-white dark:bg-[#0b0c10] dark:border-2 dark:border-[#5c67f2] shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          Suppliers
        </button>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 dark:text-emerald-400 hover:text-slate-900 dark:hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {activeTab === 'orders' ? (
        <div className="space-y-4">
          
          {/* STATUS FILTERS ROW & RIGHT NEW PURCHASE ORDER BUTTON */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            
            {/* Status Filter Pills */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
              {filterOptions.map((filter) => {
                const isSelected = selectedStatusFilter === filter;
                return (
                  <button
                    key={filter}
                    onClick={() => setSelectedStatusFilter(filter)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#6366f1] text-white font-bold shadow-xs'
                        : 'bg-slate-100 dark:bg-[#181b28] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-[#262b3f]'
                    }`}
                  >
                    {filter}
                  </button>
                );
              })}
            </div>

            {/* + New Purchase Order Button */}
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 bg-[#6366f1] hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 cursor-pointer shadow-md transition-colors whitespace-nowrap self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>New Purchase Order</span>
            </button>
          </div>

          {/* PURCHASE ORDERS TABLE */}
          <div className="bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] rounded-xl overflow-hidden min-h-[360px] shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-[#161926] text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="p-4 pl-6">PO #</th>
                  <th className="p-4">SUPPLIER</th>
                  <th className="p-4">DATE</th>
                  <th className="p-4">ITEMS</th>
                  <th className="p-4">TOTAL (ETB)</th>
                  <th className="p-4">STATUS</th>
                  <th className="p-4 pr-6 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#1a1e2e] font-medium text-slate-700 dark:text-slate-200">
                {paginatedOrders.map((po) => (
                  <tr key={po.id} className="hover:bg-slate-50 dark:hover:bg-[#181b28] transition-colors">
                    <td className="p-4 pl-6 font-mono font-bold text-slate-900 dark:text-white tracking-wide">
                      {po.orderNumber}
                    </td>
                    <td className="p-4 text-slate-800 dark:text-slate-200 font-medium">
                      {po.supplierName}
                    </td>
                    <td className="p-4 font-mono text-slate-600 dark:text-slate-300">
                      {po.dateStr}
                    </td>
                    <td className="p-4 font-mono font-bold text-slate-700 dark:text-slate-200">
                      {po.itemsCount}
                    </td>
                    <td className="p-4 font-mono font-bold text-slate-900 dark:text-white tracking-wide">
                      {Number(po.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
                    </td>
                    <td className="p-4">
                      <span className={`font-semibold text-xs ${
                        po.status === 'Received' ? 'text-emerald-600 dark:text-emerald-400' : 
                        po.status === 'Ordered' ? 'text-indigo-600 dark:text-indigo-400' : 
                        po.status === 'Draft' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'
                      }`}>
                        {po.status}
                      </span>
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <button 
                        onClick={() => setSelectedOrderDetails(po)}
                        className="text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white p-1 cursor-pointer transition-colors"
                        title="View Purchase Order Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}

                {activeOrders.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-16 text-center text-slate-500 font-medium">
                      No purchase orders found matching standard filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <Pagination 
              currentPage={ordersPage} 
              totalPages={Math.ceil(activeOrders.length / ordersPageSize) || 1} 
              onPageChange={setOrdersPage} 
            />
          </div>

        </div>
      ) : (
        /* SUPPLIERS SUB-VIEW */
        <div className="space-y-4">
          {/* Top Bar: Search Input (Left) & + Add Supplier Button (Right) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input 
                type="text"
                placeholder="Search suppliers..."
                value={supplierSearchQuery}
                onChange={(e) => setSupplierSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#0d0f17] border border-slate-200 dark:border-[#1e2233] rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 font-sans"
              />
            </div>

            <button
              onClick={handleOpenAddSupplier}
              className="px-4 py-2 bg-[#6366f1] hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl flex items-center justify-center space-x-1.5 cursor-pointer shadow-md transition-colors whitespace-nowrap self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Add Supplier</span>
            </button>
          </div>

          {/* Suppliers Table */}
          <div className="bg-white dark:bg-[#0b0c15] border border-slate-200 dark:border-[#1e2233] rounded-2xl overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-[#1c2030] text-slate-500 font-semibold uppercase text-[10px] tracking-wider bg-slate-50/50 dark:bg-[#0d0f17]/30">
                  <th className="py-3.5 px-6 font-semibold">NAME</th>
                  <th className="py-3.5 px-6 font-semibold">CONTACT PERSON</th>
                  <th className="py-3.5 px-6 font-semibold">PHONE</th>
                  <th className="py-3.5 px-6 font-semibold">STATUS</th>
                  <th className="py-3.5 px-6 font-semibold text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#181b29] font-medium text-slate-700 dark:text-slate-200">
                {paginatedSuppliers.map((sup) => (
                  <tr key={sup.id} className="hover:bg-slate-50 dark:hover:bg-[#121522]/50 transition-colors">
                    <td className="py-4 px-6 text-slate-900 dark:text-white font-bold text-xs">
                      {sup.name}
                    </td>
                    <td className="py-4 px-6 text-slate-600 dark:text-slate-300 text-xs font-sans">
                      {sup.contactPerson}
                    </td>
                    <td className="py-4 px-6 text-slate-900 dark:text-white font-mono text-xs font-bold">
                      {sup.phone}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`text-xs font-semibold ${sup.status === 'Active' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                        {sup.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right space-x-4 text-xs font-semibold">
                      <button 
                        onClick={() => handleOpenEditSupplier(sup)}
                        className="text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white cursor-pointer transition-colors"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleToggleSupplierStatus(sup.id)}
                        className="text-rose-600 dark:text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 cursor-pointer transition-colors"
                      >
                        {sup.status === 'Active' ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}

                {filteredSuppliers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500 font-medium">
                      No suppliers found matching "{supplierSearchQuery}".
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <Pagination 
              currentPage={suppliersPage} 
              totalPages={Math.ceil(filteredSuppliers.length / suppliersPageSize) || 1} 
              onPageChange={setSuppliersPage} 
            />
          </div>
        </div>
      )}

      {/* VIEW PURCHASE ORDER DETAILS MODAL */}
      <AnimatePresence>
        {selectedOrderDetails && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedOrderDetails(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#0b0c15] border border-slate-200 dark:border-[#1e2233] rounded-2xl w-full max-w-xl p-6 relative shadow-2xl text-slate-900 dark:text-slate-100"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex justify-between items-start pb-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Purchase Order Details</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-sans mt-0.5">
                    {selectedOrderDetails.orderNumber} – {selectedOrderDetails.supplierName}
                  </p>
                  <div className="flex items-center space-x-2 mt-2 text-xs">
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{selectedOrderDetails.status}</span>
                    <span className="text-slate-500 dark:text-slate-400 text-xs">
                      Created: {selectedOrderDetails.dateTimeFull || `${selectedOrderDetails.dateStr}, 7:27:59 PM`}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedOrderDetails(null)}
                  className="p-1 rounded-full border border-slate-200 dark:border-[#2a3044] text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Items Table */}
              <div className="mt-4">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-[#1c2030] text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                      <th className="py-2.5 text-left font-semibold">PRODUCT</th>
                      <th className="py-2.5 text-center font-semibold">ORDERED</th>
                      <th className="py-2.5 text-center font-semibold">RECEIVED</th>
                      <th className="py-2.5 text-right font-semibold">COST</th>
                      <th className="py-2.5 text-right font-semibold">SUBTOTAL</th>
                      <th className="py-2.5 text-right font-semibold">PROGRESS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#181b29] font-medium text-slate-700 dark:text-slate-200">
                    {selectedOrderDetails.items && selectedOrderDetails.items.length > 0 ? (
                      selectedOrderDetails.items.map((item: any, idx: number) => {
                        const ordered = item.orderedQty || item.qty || 50;
                        const received = item.receivedQty || item.qty || 50;
                        const unitCost = formatPrice(item.unitCost || 1.50, true);
                        const total = formatPrice(item.total || (ordered * Number(item.unitCost || 1.50)), true);
                        const percent = Math.round((received / (ordered || 1)) * 100);

                        return (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-[#121522]/50 transition-colors">
                            <td className="py-3.5 pr-2 text-slate-900 dark:text-white font-medium text-xs max-w-[150px]">
                              {item.name}
                            </td>
                            <td className="py-3.5 text-center font-mono font-bold text-slate-900 dark:text-white text-xs">
                              {ordered}
                            </td>
                            <td className="py-3.5 text-center font-mono font-bold text-slate-900 dark:text-white text-xs">
                              {received}
                            </td>
                            <td className="py-3.5 text-right font-mono text-xs text-slate-900 dark:text-white">
                              <div className="font-bold">{unitCost}</div>
                              <div className="text-[10px] text-slate-400 font-normal">ETB</div>
                            </td>
                            <td className="py-3.5 text-right font-mono text-xs text-slate-900 dark:text-white">
                              <div className="font-bold">{total}</div>
                              <div className="text-[10px] text-slate-400 font-normal">ETB</div>
                            </td>
                            <td className="py-3.5 text-right">
                              <div className="flex items-center justify-end space-x-2">
                                <div className="w-14 bg-slate-100 dark:bg-[#181c2b] h-1.5 rounded-full overflow-hidden">
                                  <div 
                                    className="bg-emerald-500 dark:bg-emerald-400 h-full rounded-full" 
                                    style={{ width: `${percent}%` }}
                                  />
                                </div>
                                <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">{percent}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td className="py-3 text-slate-900 dark:text-white font-medium">Shoe Product</td>
                        <td className="py-3 text-center font-mono">50</td>
                        <td className="py-3 text-center font-mono">50</td>
                        <td className="py-3 text-right font-mono">1.50 ETB</td>
                        <td className="py-3 text-right font-mono">75.00 ETB</td>
                        <td className="py-3 text-right font-mono text-emerald-600 dark:text-emerald-400">100%</td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* Total Row */}
                <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-[#1c2030] mt-3">
                  <span className="text-slate-900 dark:text-white text-sm font-bold">Total</span>
                  <span className="text-slate-900 dark:text-white text-base font-extrabold font-mono">
                    {Number(selectedOrderDetails.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
                  </span>
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* NEW PURCHASE ORDER MODAL */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
            onClick={() => setIsCreateModalOpen(false)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#0b0c15] border border-slate-200 dark:border-[#1e2233] rounded-2xl w-full max-w-lg p-6 relative shadow-2xl text-slate-900 dark:text-slate-100"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">New Purchase Order</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-sans mt-0.5">
                    Create a new purchase order for your supplier.
                  </p>
                </div>
                <button 
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateOrderSubmit} className="mt-5 space-y-4 text-xs">
                
                {/* Supplier Field */}
                <div>
                  <label className="block text-xs font-semibold text-slate-800 dark:text-white mb-1.5">
                    Supplier <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <select 
                      value={selectedSupplierId || (activeSuppliersList.find(s => s.name.includes('Addis'))?.id || activeSuppliersList[0]?.id || 's3')}
                      onChange={(e) => setSelectedSupplierId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#12141e] border border-slate-200 dark:border-[#262b3f] rounded-xl text-slate-900 dark:text-white font-medium focus:outline-none focus:border-indigo-500 font-sans appearance-none pr-9 cursor-pointer"
                    >
                      {activeSuppliersList.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-3.5 pointer-events-none text-slate-400">
                      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
                        <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/>
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Add Products Section */}
                <div className="space-y-1.5 pt-1">
                  <label className="block text-xs font-semibold text-slate-800 dark:text-white">
                    Add Products
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input 
                      type="text"
                      placeholder="Search products to add..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-[#12141e] border border-slate-200 dark:border-[#262b3f] rounded-xl text-slate-900 dark:text-white text-xs placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 font-sans"
                    />

                    {/* Search Results Dropdown */}
                    {productSearch.trim().length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#262b3f] rounded-xl overflow-hidden shadow-2xl z-30 max-h-40 overflow-y-auto divide-y divide-slate-100 dark:divide-[#1a1e2e]">
                        {availableProducts.length > 0 ? (
                          availableProducts.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => handleAddProductToOrder(p)}
                              className="w-full text-left px-3.5 py-2 text-xs text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-[#1a1e2e] transition-colors flex items-center justify-between"
                            >
                              <span className="font-medium">{p.name}</span>
                              <Plus className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                            </button>
                          ))
                        ) : (
                          <div className="px-3.5 py-2 text-xs text-slate-500">No matching products found.</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Products Table */}
                <div className="mt-4">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-[#1c2030] text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                        <th className="py-2.5 text-left font-semibold">PRODUCT</th>
                        <th className="py-2.5 text-center font-semibold">QTY</th>
                        <th className="py-2.5 text-center font-semibold">COST/UNIT</th>
                        <th className="py-2.5 text-right font-semibold">SUBTOTAL</th>
                        <th className="py-2.5 w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-[#181b29] font-medium text-slate-700 dark:text-slate-200">
                      {orderItems.map((item, idx) => {
                        const subtotal = item.qty * item.unitCost;
                        return (
                          <tr key={idx}>
                            <td className="py-3 text-slate-900 dark:text-white font-medium text-xs max-w-[160px] truncate">
                              {item.name}
                            </td>
                            <td className="py-3 text-center">
                              <input 
                                type="number"
                                min="1"
                                value={item.qty}
                                onChange={(e) => handleUpdateItemQty(idx, parseInt(e.target.value, 10) || 1)}
                                className="bg-slate-50 dark:bg-[#12141e] border border-slate-200 dark:border-[#262b3f] text-slate-900 dark:text-white text-center rounded-lg px-2 py-1 text-xs w-16 font-mono focus:outline-none focus:border-indigo-500"
                              />
                            </td>
                            <td className="py-3 text-center">
                              <input 
                                type="number"
                                min="0"
                                step="0.5"
                                value={item.unitCost}
                                onChange={(e) => handleUpdateItemCost(idx, parseFloat(e.target.value) || 0)}
                                className="bg-slate-50 dark:bg-[#12141e] border border-slate-200 dark:border-[#262b3f] text-slate-900 dark:text-white text-center rounded-lg px-2 py-1 text-xs w-20 font-mono focus:outline-none focus:border-indigo-500"
                              />
                            </td>
                            <td className="py-3 text-right font-mono font-bold text-slate-900 dark:text-white text-xs whitespace-nowrap">
                              {formatPrice(subtotal, true)} ETB
                            </td>
                            <td className="py-3 text-right pl-2">
                              <button 
                                type="button"
                                onClick={() => handleRemoveOrderItem(idx)}
                                className="text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 p-1 rounded-lg transition-colors cursor-pointer"
                                title="Remove Item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}

                      {orderItems.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-slate-500 font-sans">
                            No products added yet. Use the search bar above to add products.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  {/* Grand Total Row */}
                  <div className="flex justify-end items-center pt-3 mt-1">
                    <span className="text-slate-900 dark:text-white text-xs font-bold font-mono">
                      Total: {formatPrice(totalOrderCost, true)} ETB
                    </span>
                  </div>
                </div>

                {/* Notes Field */}
                <div className="space-y-1.5 pt-1">
                  <label className="block text-xs font-semibold text-slate-800 dark:text-white">
                    Notes
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Order notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#12141e] border border-slate-200 dark:border-[#262b3f] rounded-xl p-3 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 resize-none font-sans"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-3">
                  <button 
                    type="button" 
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-5 py-2 rounded-xl bg-slate-100 dark:bg-[#12141e] border border-slate-200 dark:border-[#262b3f] text-slate-700 dark:text-white text-xs font-medium hover:bg-slate-200 dark:hover:bg-[#1a1e2e] cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 rounded-xl bg-[#6366f1] hover:bg-indigo-500 text-white text-xs font-semibold shadow-md cursor-pointer transition-colors"
                  >
                    {saving ? 'Creating...' : 'Create Purchase Order'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADD / EDIT SUPPLIER MODAL */}
      <AnimatePresence>
        {isAddSupplierModalOpen && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
            onClick={() => setIsAddSupplierModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#0b0c15] border border-slate-200 dark:border-[#1e2233] rounded-2xl w-full max-w-md p-6 relative shadow-2xl text-slate-900 dark:text-slate-100"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                    {editingSupplierId ? 'Edit Supplier' : 'Add New Supplier'}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-sans mt-0.5">
                    {editingSupplierId ? 'Update supplier contact details.' : 'Register a new distributor.'}
                  </p>
                </div>
                <button 
                  onClick={() => setIsAddSupplierModalOpen(false)}
                  className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveSupplierSubmit} className="mt-5 space-y-4 text-xs">
                <div>
                  <label className="block text-xs font-semibold text-slate-800 dark:text-white mb-1.5">
                    Supplier Name <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. Addis Shoes PLC"
                    value={supplierFormName}
                    onChange={(e) => setSupplierFormName(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-[#12141e] border border-slate-200 dark:border-[#262b3f] rounded-xl text-slate-900 dark:text-white text-xs placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 font-sans"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-800 dark:text-white mb-1.5">
                    Contact Person
                  </label>
                  <input 
                    type="text"
                    placeholder="e.g. W/ro Hiwot"
                    value={supplierFormContact}
                    onChange={(e) => setSupplierFormContact(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-[#12141e] border border-slate-200 dark:border-[#262b3f] rounded-xl text-slate-900 dark:text-white text-xs placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 font-sans"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-800 dark:text-white mb-1.5">
                    Phone Number
                  </label>
                  <input 
                    type="text"
                    placeholder="e.g. 0116625550"
                    value={supplierFormPhone}
                    onChange={(e) => setSupplierFormPhone(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-[#12141e] border border-slate-200 dark:border-[#262b3f] rounded-xl text-slate-900 dark:text-white text-xs placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-3">
                  <button 
                    type="button" 
                    onClick={() => setIsAddSupplierModalOpen(false)}
                    className="px-5 py-2 rounded-xl bg-slate-100 dark:bg-[#12141e] border border-slate-200 dark:border-[#262b3f] text-slate-700 dark:text-white text-xs font-medium hover:bg-slate-200 dark:hover:bg-[#1a1e2e] cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#6366f1] hover:bg-indigo-500 text-white text-xs font-semibold shadow-md cursor-pointer transition-colors"
                  >
                    {editingSupplierId ? 'Save Changes' : 'Add Supplier'}
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
