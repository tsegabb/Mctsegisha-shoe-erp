import { useState, FormEvent, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Pagination from './Pagination.tsx';
import { 
  Plus, 
  Search, 
  X,
  CheckCircle2,
  Trash2,
  Edit,
  PackagePlus,
  Layers,
  Building2,
  Tag,
  Box
} from 'lucide-react';
import { Product, Brand, Variant, Warehouse, MasterCatalogItem, ProductUnit } from '../types.ts';
import { formatPrice } from '../utils/formatters.ts';
import { MASTER_CATALOG_ITEMS } from '../data/masterCatalogData.ts';
import { productsService } from '../services/products.service.ts';
import { LoadingSpinner, EmptyState } from './common/UIStates.tsx';
import { ConfirmModal } from './common/ConfirmModal.tsx';

interface ProductsViewProps {
  products: Product[];
  brands: Brand[];
  warehouses?: Warehouse[];
  loading: boolean;
  onRefresh: () => void;
  onCreateProduct: (data: any) => Promise<any>;
  onUpdateProduct: (id: string, data: any) => Promise<any>;
  onDeleteProduct: (id: string) => Promise<any>;
  onCreateVariant: (data: any) => Promise<any>;
  onUpdateVariant: (id: string, data: any) => Promise<any>;
  onDeleteVariant: (id: string) => Promise<any>;
  userPermissions?: string[];
}

export default function ProductsView({
  products,
  brands,
  loading,
  onRefresh,
  onCreateProduct,
  onUpdateProduct,
  onDeleteProduct
}: ProductsViewProps) {
  const [activeTab, setActiveTab] = useState<'products' | 'catalog' | 'categories'>('products');
  const [searchTerm, setSearchTerm] = useState('');
  const [catalogSearchTerm, setCatalogSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // Standard product create/edit modal
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [formName, setFormName] = useState('');
  const [formBrand, setFormBrand] = useState('');
  const [formCategory, setFormCategory] = useState('Sneakers');
  const [formSize, setFormSize] = useState('Standard');
  const [formColor, setFormColor] = useState('Standard');
  const [formPrice, setFormPrice] = useState(100.0);

  // Master Catalog Modal State (Picture 2)
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<MasterCatalogItem | null>(null);
  const [catalogSellingPrice, setCatalogSellingPrice] = useState<number | string>('0.00');
  const [catalogCostPrice, setCatalogCostPrice] = useState<number | string>('0.00');
  const [catalogReorderLevel, setCatalogReorderLevel] = useState<number>(10);
  const [catalogUnits, setCatalogUnits] = useState<ProductUnit[]>([]);
  
  // Inline Unit Creator State
  const [showAddUnitForm, setShowAddUnitForm] = useState(false);
  const [unitNameInput, setUnitNameInput] = useState('');
  const [unitQtyInput, setUnitQtyInput] = useState<number>(1);
  const [isSubmittingCatalog, setIsSubmittingCatalog] = useState(false);

  // Master catalog list (fetched from server or fallback)
  const [masterCatalogList, setMasterCatalogList] = useState<MasterCatalogItem[]>(MASTER_CATALOG_ITEMS);

  // Categories State & Management
  const [categoriesList, setCategoriesList] = useState<{ id?: string; name: string; description?: string }[]>([]);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [catNameInput, setCatNameInput] = useState('');
  const [catDescInput, setCatDescInput] = useState('');
  const [isSubmittingCategory, setIsSubmittingCategory] = useState(false);

  // Deletion confirmation state
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);
    try {
      await onDeleteProduct(productToDelete.id);
      setProductToDelete(null);
    } catch (err) {
      console.error('Failed to delete product:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await productsService.getCategories();
      if (res && res.data && Array.isArray(res.data)) {
        setCategoriesList(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleCreateCategory = async (e: FormEvent) => {
    e.preventDefault();
    if (!catNameInput.trim()) return;
    setIsSubmittingCategory(true);
    try {
      await productsService.createCategory({
        name: catNameInput.trim(),
        description: catDescInput.trim()
      });
      setCatNameInput('');
      setCatDescInput('');
      setIsCategoryModalOpen(false);
      await fetchCategories();
    } catch (err) {
      console.error('Failed to create category:', err);
    } finally {
      setIsSubmittingCategory(false);
    }
  };

  const allCategoryNames = useMemo(() => {
    const set = new Set<string>();
    categoriesList.forEach(c => {
      if (c.name) set.add(c.name);
    });
    products.forEach(p => {
      if (p.category) set.add(p.category);
    });
    if (set.size === 0) {
      ['Sneakers', 'Running Shoes', 'Retro Basketball', 'Performance Running', 'Lifestyle / Classics', 'Skateboarding', 'Trail / Outdoor', 'Sandals & Slides', 'Formal Shoes', 'Boots', 'Loafers'].forEach(c => set.add(c));
    }
    return Array.from(set).sort();
  }, [categoriesList, products]);

  useEffect(() => {
    let isMounted = true;
    productsService.getMasterCatalog()
      .then(res => {
        if (isMounted && res && Array.isArray(res.data) && res.data.length > 0) {
          setMasterCatalogList(res.data);
        }
      })
      .catch(() => {
        // Fallback to local MASTER_CATALOG_ITEMS
      });
    return () => { isMounted = false; };
  }, []);

  const getBrandName = (brandVal: any): string => {
    if (!brandVal) return 'Generic';
    if (typeof brandVal === 'string') return brandVal;
    if (typeof brandVal === 'object' && brandVal.name) return String(brandVal.name);
    return 'Generic';
  };

  // Check if a catalog item has already been added to active products
  const isItemAdded = (itemName: string) => {
    return products.some(p => p.name.toLowerCase() === itemName.toLowerCase());
  };

  const filteredProducts = products.filter(p => {
    const q = searchTerm.toLowerCase();
    const brandStr = getBrandName(p.brand || (p as any).productBrand);
    const matchesSearch = p.name.toLowerCase().includes(q) || 
      (brandStr && brandStr.toLowerCase().includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q));
    const matchesCat = selectedCategory === 'all' || (p.category && p.category.toLowerCase().replace(/\s+/g, '') === selectedCategory.toLowerCase().replace(/\s+/g, ''));
    return matchesSearch && matchesCat;
  });

  const filteredMasterCatalog = masterCatalogList.filter(item => {
    const q = catalogSearchTerm.toLowerCase();
    return item.name.toLowerCase().includes(q) ||
      item.genericName.toLowerCase().includes(q) ||
      item.manufacturer.toLowerCase().includes(q) ||
      (item.category && item.category.toLowerCase().includes(q));
  });

  // Pagination State
  const [productsPage, setProductsPage] = useState(1);
  const productsPageSize = 10;

  const [catalogPage, setCatalogPage] = useState(1);
  const catalogPageSize = 10;

  useEffect(() => {
    setProductsPage(1);
  }, [searchTerm, selectedCategory]);

  useEffect(() => {
    setCatalogPage(1);
  }, [catalogSearchTerm]);

  const paginatedProducts = useMemo(() => {
    const start = (productsPage - 1) * productsPageSize;
    return filteredProducts.slice(start, start + productsPageSize);
  }, [filteredProducts, productsPage, productsPageSize]);

  const paginatedMasterCatalog = useMemo(() => {
    const start = (catalogPage - 1) * catalogPageSize;
    return filteredMasterCatalog.slice(start, start + catalogPageSize);
  }, [filteredMasterCatalog, catalogPage, catalogPageSize]);

  // Calculate category stats for Categories Tab
  const categoryCounts: Record<string, number> = {};
  products.forEach(p => {
    const cat = p.category || 'General';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setFormName('');
    setFormBrand('');
    setFormCategory('Sneakers');
    setFormSize('Standard');
    setFormColor('Standard');
    setFormPrice(100.0);
    setIsProductModalOpen(true);
  };

  const handleOpenEdit = (prod: any) => {
    setEditingProduct(prod);
    setFormName(prod.name);
    setFormBrand(getBrandName(prod.brand || (prod as any).productBrand));
    setFormCategory(prod.category || 'Sneakers');
    setFormSize((prod as any).size || 'Standard');
    setFormColor((prod as any).color || 'Standard');
    setFormPrice(prod.basePrice || prod.price || 100.0);
    setIsProductModalOpen(true);
  };

  // Open "Add to My Products" modal for a Master Catalog item
  const handleOpenAddCatalogModal = (item: MasterCatalogItem) => {
    setSelectedCatalogItem(item);
    setCatalogSellingPrice(item.defaultSellingPrice !== undefined ? item.defaultSellingPrice.toFixed(2) : '0.00');
    setCatalogCostPrice(item.defaultCostPrice !== undefined ? item.defaultCostPrice.toFixed(2) : '0.00');
    setCatalogReorderLevel(10);
    setCatalogUnits([]);
    setShowAddUnitForm(false);
    setUnitNameInput('');
    setUnitQtyInput(1);
    setIsCatalogModalOpen(true);
  };

  const handleAddUnitToCatalogModal = () => {
    if (!unitNameInput.trim()) return;
    const newUnit: ProductUnit = {
      name: unitNameInput.trim(),
      quantity: unitQtyInput || 1
    };
    setCatalogUnits(prev => [...prev, newUnit]);
    setUnitNameInput('');
    setUnitQtyInput(1);
    setShowAddUnitForm(false);
  };

  const handleRemoveUnitFromCatalogModal = (index: number) => {
    setCatalogUnits(prev => prev.filter((_, i) => i !== index));
  };

  // Submit "Add to My Products" form (Picture 2 Modal)
  const handleCatalogSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedCatalogItem) return;

    setIsSubmittingCatalog(true);
    try {
      const payload = {
        catalogItemId: selectedCatalogItem.id,
        name: selectedCatalogItem.name,
        genericName: selectedCatalogItem.genericName,
        form: selectedCatalogItem.form,
        strength: selectedCatalogItem.strength,
        manufacturer: selectedCatalogItem.manufacturer,
        category: selectedCatalogItem.category !== '--' ? selectedCatalogItem.category : 'Sneakers',
        sellingPrice: parseFloat(String(catalogSellingPrice)) || 0,
        costPrice: parseFloat(String(catalogCostPrice)) || 0,
        reorderLevel: Number(catalogReorderLevel) || 10,
        units: catalogUnits
      };

      // Call service to add to backend DB
      await productsService.addFromCatalog(payload);
      
      setIsCatalogModalOpen(false);
      onRefresh();
    } catch (err) {
      console.error('Failed to add product from catalog:', err);
      // Fallback: create via onCreateProduct if needed
      await onCreateProduct({
        name: selectedCatalogItem.name,
        brand: selectedCatalogItem.manufacturer || 'Generic',
        category: selectedCatalogItem.category !== '--' ? selectedCatalogItem.category : 'Sneakers',
        basePrice: parseFloat(String(catalogSellingPrice)) || 0,
        brandId: brands[0]?.id || ''
      });
      setIsCatalogModalOpen(false);
      onRefresh();
    } finally {
      setIsSubmittingCatalog(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const payload = {
      name: formName,
      brand: formBrand || 'Generic',
      category: formCategory || 'Pharmaceuticals',
      size: formSize || 'Standard',
      color: formColor || 'Standard',
      basePrice: formPrice,
      brandId: brands[0]?.id || ''
    };

    if (editingProduct) {
      await onUpdateProduct(editingProduct.id, payload);
    } else {
      await onCreateProduct(payload);
    }
    setIsProductModalOpen(false);
    onRefresh();
  };

  return (
    <div className="space-y-5 text-slate-900 dark:text-slate-100">
      
      {/* PAGE TITLE & SUBTITLE */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Products</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Manage your product catalog and pricing.</p>
      </div>

      {/* TOP PILL TABS */}
      <div className="flex items-center space-x-1.5 p-1 bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] rounded-xl w-fit text-xs">
        <button
          onClick={() => setActiveTab('products')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
            activeTab === 'products' ? 'bg-indigo-600 text-white dark:bg-[#1e2233] shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          Products
        </button>
        <button
          onClick={() => setActiveTab('catalog')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
            activeTab === 'catalog' ? 'bg-indigo-600 text-white dark:bg-[#1e2233] shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          Master Catalog
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
            activeTab === 'categories' ? 'bg-indigo-600 text-white dark:bg-[#1e2233] shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          Categories
        </button>
      </div>

      {/* ==================== TAB 1: PRODUCTS ==================== */}
      {activeTab === 'products' && (
        <>
          {/* SEARCH BAR & ADD PRODUCT BUTTON */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input 
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-56 pl-8 pr-4 py-1.5 bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] rounded-xl text-xs text-slate-900 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500/50 font-medium"
                />
              </div>

              <select 
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-1.5 bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] rounded-xl text-xs text-slate-900 dark:text-slate-300 focus:outline-none cursor-pointer font-medium"
              >
                <option value="all">All Categories</option>
                {allCategoryNames.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleOpenCreate}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center space-x-2 transition-colors cursor-pointer shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Add Product</span>
            </button>
          </div>

          {/* PRODUCTS TABLE */}
          <div className="bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] rounded-xl overflow-hidden shadow-2xs">
            {loading ? (
              <LoadingSpinner message="Loading products catalog..." />
            ) : (
              <>
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-[#161926] text-slate-500 dark:text-slate-400 font-semibold uppercase text-[10px] tracking-wider bg-slate-50/50 dark:bg-[#12141e]">
                      <th className="p-4">PRODUCT NAME</th>
                      <th className="p-4">BRAND / MFR</th>
                      <th className="p-4">CATEGORY</th>
                      <th className="p-4">PRICE (ETB)</th>
                      <th className="p-4">STATUS</th>
                      <th className="p-4 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#1a1e2e] font-medium text-slate-700 dark:text-slate-200">
                    {paginatedProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-[#181b28] transition-colors group">
                        <td className="p-4 font-bold text-slate-900 dark:text-white">
                          <div>{p.name}</div>
                          {p.genericName && (
                            <div className="text-[11px] font-normal text-slate-400">Generic: {p.genericName}</div>
                          )}
                        </td>
                        <td className="p-4 text-slate-600 dark:text-slate-300 font-medium">
                          {p.manufacturer || getBrandName(p.brand || (p as any).productBrand)}
                        </td>
                        <td className="p-4 text-slate-500 dark:text-slate-400">{p.category || 'Sneakers'}</td>
                        <td className="p-4 font-bold text-slate-900 dark:text-white font-mono">
                          {formatPrice(p.basePrice || p.sellingPrice || (p as any).price || 0, true)} ETB
                        </td>
                        <td className="p-4">
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Active</span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button 
                              onClick={() => handleOpenEdit(p)}
                              className="p-1 text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
                              title="Edit product"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => setProductToDelete(p)}
                              className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                              title="Delete product"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {filteredProducts.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-6">
                          <EmptyState
                            title="No products found"
                            description="No items match your search term or category filter."
                            actionLabel="Add Product"
                            onAction={handleOpenCreate}
                          />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                <Pagination 
                  currentPage={productsPage} 
                  totalPages={Math.ceil(filteredProducts.length / productsPageSize) || 1} 
                  onPageChange={setProductsPage} 
                />
              </>
            )}
          </div>
        </>
      )}

      {/* ==================== TAB 2: MASTER CATALOG (Picture 1 & Picture 2) ==================== */}
      {activeTab === 'catalog' && (
        <>
          {/* SEARCH MASTER CATALOG INPUT */}
          <div className="pt-1">
            <div className="relative max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-3" />
              <input 
                type="text"
                placeholder="Search master catalog..."
                value={catalogSearchTerm}
                onChange={(e) => setCatalogSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] rounded-xl text-xs text-slate-900 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500/50 font-medium shadow-2xs"
              />
            </div>
          </div>

          {/* MASTER CATALOG TABLE (Picture 1) */}
          <div className="bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-[#161926] text-slate-500 dark:text-slate-400 font-semibold uppercase text-[10px] tracking-wider bg-slate-50/50 dark:bg-[#12141e]">
                  <th className="p-4">PRODUCT / MODEL</th>
                  <th className="p-4">SILHOUETTE / LINE</th>
                  <th className="p-4">CATEGORY</th>
                  <th className="p-4">CUT / STYLE</th>
                  <th className="p-4">SIZE RANGE / TECH</th>
                  <th className="p-4">BRAND / MFR</th>
                  <th className="p-4 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#1a1e2e] font-medium text-slate-700 dark:text-slate-200">
                {paginatedMasterCatalog.map((item) => {
                  const added = isItemAdded(item.name);
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-[#181b28] transition-colors group">
                      <td className="p-4 font-bold text-slate-900 dark:text-white">{item.name}</td>
                      <td className="p-4 text-slate-600 dark:text-slate-300 font-medium">{item.genericName}</td>
                      <td className="p-4 text-slate-500 dark:text-slate-400">{item.category}</td>
                      <td className="p-4 text-slate-500 dark:text-slate-400">{item.form}</td>
                      <td className="p-4 text-slate-500 dark:text-slate-400 font-mono">{item.strength}</td>
                      <td className="p-4 text-slate-600 dark:text-slate-300 font-medium">{item.manufacturer}</td>
                      <td className="p-4 text-right">
                        {added ? (
                          <div className="inline-flex items-center space-x-1 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-semibold border border-emerald-200 dark:border-emerald-800/40">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Added</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleOpenAddCatalogModal(item)}
                            className="inline-flex items-center space-x-1.5 px-3 py-1 bg-white dark:bg-[#181b28] hover:bg-indigo-50 dark:hover:bg-[#1e2233] text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200 dark:border-[#262b3f] rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                          >
                            <Plus className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                            <span>Add</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {filteredMasterCatalog.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500 font-medium">
                      No master catalog items match your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <Pagination 
              currentPage={catalogPage} 
              totalPages={Math.ceil(filteredMasterCatalog.length / catalogPageSize) || 1} 
              onPageChange={setCatalogPage} 
            />
          </div>
        </>
      )}

      {/* ==================== TAB 3: CATEGORIES ==================== */}
      {activeTab === 'categories' && (
        <div className="space-y-4 pt-1">
          {/* Header row with Add Category button */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Product Categories</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Manage and organize your product categories.</p>
            </div>
            <button
              onClick={() => setIsCategoryModalOpen(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center space-x-2 transition-colors cursor-pointer shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Add Category</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(categoriesList.length > 0 ? categoriesList : allCategoryNames.map(name => ({ name }))).map((cat) => {
              const count = categoryCounts[cat.name] || 0;
              return (
                <div 
                  key={cat.id || cat.name} 
                  className="bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] rounded-xl p-4 flex items-start justify-between shadow-2xs hover:border-indigo-500/50 transition-colors"
                >
                  <div className="flex items-start space-x-3">
                    <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl shrink-0 mt-0.5">
                      <Tag className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">{cat.name}</h3>
                      {cat.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{cat.description}</p>
                      )}
                      <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium mt-1.5">{count} {count === 1 ? 'Product' : 'Products'}</p>
                    </div>
                  </div>
                </div>
              );
            })}

            {categoriesList.length === 0 && allCategoryNames.length === 0 && (
              <div className="col-span-full p-8 text-center text-slate-500 font-medium bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] rounded-xl">
                No categories configured yet. Click "Add Category" to create one.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== ADD TO MY PRODUCTS MODAL (Picture 2) ==================== */}
      <AnimatePresence>
        {isCatalogModalOpen && selectedCatalogItem && (
          <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.15 }}
              className="bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] rounded-2xl w-full max-w-lg overflow-hidden p-6 space-y-5 shadow-2xl"
            >
              {/* Modal Header */}
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white tracking-tight">
                    Add to My Products
                  </h3>
                  <div className="mt-1 font-semibold text-sm text-slate-800 dark:text-slate-200">
                    {selectedCatalogItem.name}
                  </div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 flex items-center space-x-6">
                    <span>
                      Model / Line: <strong className="font-semibold text-slate-700 dark:text-slate-300">{selectedCatalogItem.genericName}</strong>
                    </span>
                    <span>
                      Cut / Style: <strong className="font-semibold text-slate-700 dark:text-slate-300">{selectedCatalogItem.form || '--'}</strong>
                    </span>
                  </div>
                </div>

                <button 
                  onClick={() => setIsCatalogModalOpen(false)} 
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-[#1a1e2e] transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleCatalogSubmit} className="space-y-4">
                
                {/* Selling Price & Cost Price Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Selling Price <span className="text-rose-500">*</span>
                    </label>
                    <input 
                      type="number"
                      step="0.01"
                      required
                      value={catalogSellingPrice}
                      onChange={(e) => setCatalogSellingPrice(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3 py-2 bg-white dark:bg-[#181b28] border border-slate-300 dark:border-[#262b3f] rounded-xl text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Cost Price
                    </label>
                    <input 
                      type="number"
                      step="0.01"
                      value={catalogCostPrice}
                      onChange={(e) => setCatalogCostPrice(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3 py-2 bg-white dark:bg-[#181b28] border border-slate-300 dark:border-[#262b3f] rounded-xl text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                {/* Reorder Level */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Reorder Level
                  </label>
                  <input 
                    type="number"
                    value={catalogReorderLevel}
                    onChange={(e) => setCatalogReorderLevel(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-white dark:bg-[#181b28] border border-slate-300 dark:border-[#262b3f] rounded-xl text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                {/* Units Section */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Units</span>
                    <button
                      type="button"
                      onClick={() => setShowAddUnitForm(true)}
                      className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 hover:underline cursor-pointer flex items-center space-x-1"
                    >
                      <span>+ Add Unit</span>
                    </button>
                  </div>

                  {/* Inline Add Unit Creator Form */}
                  {showAddUnitForm && (
                    <div className="p-3 bg-slate-50 dark:bg-[#181b28] border border-slate-200 dark:border-[#262b3f] rounded-xl space-y-2">
                      <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">Configure New Unit</div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-2">
                          <input 
                            type="text"
                            placeholder="Unit Name (Pair, Box, Carton)"
                            value={unitNameInput}
                            onChange={(e) => setUnitNameInput(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-[#12141e] border border-slate-300 dark:border-[#262b3f] rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div>
                          <input 
                            type="number"
                            min="1"
                            placeholder="Qty / ratio"
                            value={unitQtyInput}
                            onChange={(e) => setUnitQtyInput(parseInt(e.target.value) || 1)}
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-[#12141e] border border-slate-300 dark:border-[#262b3f] rounded-lg text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end space-x-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setShowAddUnitForm(false)}
                          className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleAddUnitToCatalogModal}
                          className="px-3 py-1 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-500"
                        >
                          Save Unit
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Configured Units Pills / Empty Text */}
                  {catalogUnits.length === 0 && !showAddUnitForm ? (
                    <p className="text-xs text-slate-400 italic">
                      No units configured. Add units like Pair, Box, Carton.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {catalogUnits.map((u, idx) => (
                        <span 
                          key={idx}
                          className="inline-flex items-center space-x-1.5 px-3 py-1 bg-slate-100 dark:bg-[#1a1e2e] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-[#262b3f] rounded-lg text-xs font-medium"
                        >
                          <span>{u.name} {u.quantity && u.quantity > 1 ? `(${u.quantity} pcs)` : ''}</span>
                          <button 
                            type="button"
                            onClick={() => handleRemoveUnitFromCatalogModal(idx)}
                            className="text-slate-400 hover:text-rose-500 p-0.5 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer Action Buttons */}
                <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-100 dark:border-[#1a1e2e]">
                  <button 
                    type="button" 
                    onClick={() => setIsCatalogModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 dark:border-[#262b3f] hover:bg-slate-50 dark:hover:bg-[#181b28] text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmittingCatalog}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer flex items-center space-x-1.5 disabled:opacity-50"
                  >
                    {isSubmittingCatalog ? (
                      <span>Adding...</span>
                    ) : (
                      <span>Add Product</span>
                    )}
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* STANDARD CREATE / EDIT PRODUCT MODAL */}
      <AnimatePresence>
        {isProductModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] rounded-2xl w-full max-w-md overflow-hidden p-6 space-y-4 shadow-2xl"
            >
              <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-[#161926]">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  {editingProduct ? 'Edit Product' : 'Add New Product'}
                </h3>
                <button onClick={() => setIsProductModalOpen(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Product Name</label>
                  <input 
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Air Jordan 1 Retro High OG"
                    className="w-full mt-1 px-3 py-2 bg-white dark:bg-[#181b28] border border-slate-200 dark:border-[#262b3f] rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Brand / Mfr</label>
                    <input 
                      type="text"
                      value={formBrand}
                      onChange={(e) => setFormBrand(e.target.value)}
                      placeholder="e.g. Nike, Adidas, Jordan"
                      className="w-full mt-1 px-3 py-2 bg-white dark:bg-[#181b28] border border-slate-200 dark:border-[#262b3f] rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Category</label>
                    <select 
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full mt-1 px-3 py-2 bg-white dark:bg-[#181b28] border border-slate-200 dark:border-[#262b3f] rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                    >
                      {allCategoryNames.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Size / Tech</label>
                    <input 
                      type="text"
                      value={formSize}
                      onChange={(e) => setFormSize(e.target.value)}
                      placeholder="e.g. US 10.5"
                      className="w-full mt-1 px-3 py-2 bg-white dark:bg-[#181b28] border border-slate-200 dark:border-[#262b3f] rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Cut / Style</label>
                    <input 
                      type="text"
                      value={formColor}
                      onChange={(e) => setFormColor(e.target.value)}
                      placeholder="e.g. High Top"
                      className="w-full mt-1 px-3 py-2 bg-white dark:bg-[#181b28] border border-slate-200 dark:border-[#262b3f] rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Price (ETB)</label>
                    <input 
                      type="number"
                      step="1"
                      required
                      value={formPrice}
                      onChange={(e) => setFormPrice(parseFloat(e.target.value) || 0)}
                      className="w-full mt-1 px-3 py-2 bg-white dark:bg-[#181b28] border border-slate-200 dark:border-[#262b3f] rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                </div>

                <div className="pt-3 flex justify-end space-x-2">
                  <button 
                    type="button" 
                    onClick={() => setIsProductModalOpen(false)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md"
                  >
                    Save Product
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================== ADD CATEGORY MODAL ==================== */}
      <AnimatePresence>
        {isCategoryModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 dark:bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] rounded-2xl w-full max-w-md overflow-hidden p-6 space-y-5 shadow-2xl"
            >
              {/* Header */}
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">
                    Add Category
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                    Create a new product category.
                  </p>
                </div>

                <button 
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)} 
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleCreateCategory} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-900 dark:text-slate-200 block mb-1.5">
                    Name <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    type="text"
                    required
                    value={catNameInput}
                    onChange={(e) => setCatNameInput(e.target.value)}
                    placeholder="Category name"
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-[#181b28] border border-slate-300 dark:border-[#262b3f] rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-medium transition-all"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-900 dark:text-slate-200 block mb-1.5">
                    Description
                  </label>
                  <textarea 
                    rows={3}
                    value={catDescInput}
                    onChange={(e) => setCatDescInput(e.target.value)}
                    placeholder="Optional description"
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-[#181b28] border border-slate-300 dark:border-[#262b3f] rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-medium transition-all resize-none"
                  />
                </div>

                {/* Footer Buttons */}
                <div className="pt-3 flex items-center justify-end space-x-3">
                  <button 
                    type="button" 
                    onClick={() => setIsCategoryModalOpen(false)}
                    className="px-5 py-2.5 border border-slate-200 dark:border-[#262b3f] hover:bg-slate-50 dark:hover:bg-[#181b28] text-slate-800 dark:text-slate-200 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmittingCategory || !catNameInput.trim()}
                    className="px-6 py-2.5 bg-[#968cf4] hover:bg-[#857be9] text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingCategory ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!productToDelete}
        title="Delete Product"
        message={`Are you sure you want to delete "${productToDelete?.name}"? This will remove the item from your store catalog.`}
        confirmText="Delete Product"
        cancelText="Cancel"
        isDestructive={true}
        loading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setProductToDelete(null)}
      />

    </div>
  );
}
