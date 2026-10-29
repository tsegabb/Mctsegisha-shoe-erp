import { useState, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, 
  Plus, 
  Search, 
  MapPin, 
  Phone, 
  Layers, 
  X,
  Wallet,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { Warehouse } from '../types.ts';

interface WarehousesViewProps {
  warehouses: Warehouse[];
  loading: boolean;
  onRefresh: () => void;
  onCreateWarehouse: (data: any) => Promise<any>;
  onUpdateWarehouse?: (id: string, data: any) => Promise<any>;
  onDeleteWarehouse?: (id: string) => Promise<any>;
}

export default function WarehousesView({
  warehouses,
  loading,
  onRefresh,
  onCreateWarehouse
}: WarehousesViewProps) {
  const [activeTab, setActiveTab] = useState<'register' | 'transactions'>('register');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [address, setAddress] = useState('');

  const displayBranches = warehouses.length > 0 ? warehouses : [
    { id: 'w1', name: 'Main Branch', code: 'MAIN-01', address: 'Bole Road, Addis Ababa' }
  ];

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await onCreateWarehouse({ name, code, address });
    setIsModalOpen(false);
    onRefresh();
  };

  return (
    <div className="space-y-5 text-slate-900 dark:text-slate-100">
      
      {/* PAGE TITLE & SUBTITLE */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Branches & Cash Management</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Track store branches, register cash floats, drops, and sessions.</p>
      </div>

      {/* TABS */}
      <div className="flex items-center space-x-1.5 p-1 bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] rounded-xl w-fit text-xs">
        <button
          onClick={() => setActiveTab('register')}
          className={`px-3.5 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer flex items-center space-x-1.5 ${
            activeTab === 'register' ? 'bg-indigo-600 text-white dark:bg-[#1e2233] shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Wallet className="w-3.5 h-3.5" />
          <span>Register Session</span>
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          className={`px-3.5 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
            activeTab === 'transactions' ? 'bg-indigo-600 text-white dark:bg-[#1e2233] shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          Cash Transactions
        </button>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] rounded-xl p-4 shadow-2xs">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Opening Float</p>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">1,000.00 ETB</h2>
        </div>
        <div className="bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] rounded-xl p-4 shadow-2xs">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Cash Collected</p>
          <h2 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">4,250.00 ETB</h2>
        </div>
        <div className="bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] rounded-xl p-4 shadow-2xs">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Expected Drawer Cash</p>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">5,250.00 ETB</h2>
        </div>
      </div>

      {/* BRANCHES LIST */}
      <div className="bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] rounded-xl p-5 space-y-4 shadow-2xs">
        <div className="flex justify-between items-center pb-2">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">Shoe Store Branches & Warehouses</h3>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center space-x-1.5 cursor-pointer transition-colors shadow-md"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Branch</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {displayBranches.map((wh) => (
            <div key={wh.id} className="p-4 bg-slate-50 dark:bg-[#181b28] border border-slate-200 dark:border-[#262b3f] rounded-xl space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">{wh.name}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">{wh.code}</p>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                  Open Register
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center space-x-1.5 pt-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{wh.address || 'Addis Ababa'}</span>
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ADD BRANCH MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#12141e] border border-[#1e2233] rounded-xl w-full max-w-md p-5 space-y-4"
            >
              <div className="flex justify-between items-center pb-3 border-b border-[#161926]">
                <h3 className="font-bold text-sm text-white">Add New Branch</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-400 font-medium">Branch Name</label>
                  <input 
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Kazanchis Branch"
                    className="w-full mt-1 px-3 py-1.5 bg-[#181b28] border border-[#262b3f] rounded-lg text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-400 font-medium">Branch Code</label>
                  <input 
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="e.g. KAZ-02"
                    className="w-full mt-1 px-3 py-1.5 bg-[#181b28] border border-[#262b3f] rounded-lg text-white focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="text-slate-400 font-medium">Address</label>
                  <input 
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. Kazanchis, Addis Ababa"
                    className="w-full mt-1 px-3 py-1.5 bg-[#181b28] border border-[#262b3f] rounded-lg text-white focus:outline-none"
                  />
                </div>

                <div className="pt-3 flex justify-end space-x-2">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-4 py-1.5 bg-[#6366f1] hover:bg-indigo-500 text-white font-bold rounded-lg shadow-md"
                  >
                    Add Branch
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
