import { useState, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  UserCheck, 
  Plus, 
  Search, 
  ShieldCheck, 
  Phone, 
  X, 
  Edit, 
  Trash2 
} from 'lucide-react';
import { Supplier } from '../types.ts';

interface PeopleViewProps {
  suppliers: Supplier[];
  loading: boolean;
  onRefresh: () => void;
  onCreateSupplier: (data: any) => Promise<any>;
  onUpdateSupplier: (id: string, data: any) => Promise<any>;
  onDeleteSupplier: (id: string) => Promise<any>;
}

export default function SuppliersView({
  suppliers,
  loading,
  onRefresh,
  onCreateSupplier,
  onUpdateSupplier,
  onDeleteSupplier
}: PeopleViewProps) {
  const [activeTab, setActiveTab] = useState<'staff' | 'customers'>('staff');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<any | null>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('pharmacist');
  const [saving, setSaving] = useState(false);

  // Demo staff list matching Screenshot 6
  const staffList = [
    { id: '1', name: 'Abebe Kebede', phone: '0933333333', role: 'pharmacist', status: 'Active' },
    { id: '2', name: 'Demo Owner', phone: '0922222222', role: 'owner', status: 'Active' },
    { id: '3', name: 'Tigist Haile', phone: '0944444444', role: 'cashier', status: 'Active' }
  ];

  const customersList = suppliers;

  const handleOpenCreate = () => {
    setEditingPerson(null);
    setName('');
    setPhone('');
    setRole('pharmacist');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onCreateSupplier({ name, contactPerson: role, phone });
      setIsModalOpen(false);
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 text-slate-100">
      
      {/* PAGE TITLE & SUBTITLE */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">People</h1>
        <p className="text-xs text-slate-400 mt-1">Manage employees, roles, and customer records.</p>
      </div>

      {/* TOP PILL TABS (Screenshot 6 exact match) */}
      <div className="flex items-center space-x-1.5 p-1 bg-[#12141e] border border-[#1e2233] rounded-xl w-fit text-xs">
        <button
          onClick={() => setActiveTab('staff')}
          className={`px-3.5 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer flex items-center space-x-1.5 ${
            activeTab === 'staff' ? 'bg-[#1e2233] text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>Staff</span>
        </button>
        <button
          onClick={() => setActiveTab('customers')}
          className={`px-3.5 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer flex items-center space-x-1.5 ${
            activeTab === 'customers' ? 'bg-[#1e2233] text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Customers</span>
        </button>
      </div>

      {/* MAIN CONTAINER CARD (Screenshot 6 exact match) */}
      <div className="bg-[#12141e] border border-[#1e2233] rounded-xl p-5 space-y-4">
        
        {/* CARD HEADER WITH RIGHT BUTTON */}
        <div className="flex justify-between items-center pb-2">
          <h3 className="font-bold text-sm text-white">
            {activeTab === 'staff' ? 'Staff Members' : 'Customer Records'}
          </h3>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleOpenCreate}
              className="px-3 py-1.5 bg-[#181b28] border border-[#262b3f] hover:bg-[#202436] text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5 cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{activeTab === 'staff' ? 'Add Staff' : 'Add Customer'}</span>
            </button>

            <button
              className="px-3 py-1.5 bg-[#181b28] border border-[#262b3f] hover:bg-[#202436] text-white text-xs font-semibold rounded-xl cursor-pointer transition-colors"
            >
              Manage in Settings
            </button>
          </div>
        </div>

        {/* PEOPLE TABLE (Screenshot 6 exact match) */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#161926] text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                <th className="p-4 pl-2">NAME</th>
                <th className="p-4">PHONE</th>
                <th className="p-4">ROLES</th>
                <th className="p-4">STATUS</th>
                <th className="p-4 text-right pr-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a1e2e] font-medium text-slate-200">
              {(activeTab === 'staff' ? staffList : customersList).map((person) => (
                <tr key={person.id} className="hover:bg-[#181b28] transition-colors">
                  <td className="p-4 pl-2 font-bold text-white">{person.name}</td>
                  <td className="p-4 text-slate-300 font-mono">{person.phone}</td>
                  <td className="p-4">
                    <span className="px-2.5 py-1 rounded-full bg-[#181b28] border border-[#262b3f] text-slate-300 text-[11px] font-medium">
                      {(person as any).role || (person as any).contactPerson || 'pharmacist'}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="text-emerald-400 font-semibold">Active</span>
                  </td>
                  <td className="p-4 text-right pr-2">
                    <button 
                      onClick={() => onDeleteSupplier(person.id)}
                      className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>

      {/* ADD PERSON MODAL */}
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
                <h3 className="font-bold text-sm text-white">Add New Person</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-400 font-medium">Full Name</label>
                  <input 
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Abebe Kebede"
                    className="w-full mt-1 px-3 py-1.5 bg-[#181b28] border border-[#262b3f] rounded-lg text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-400 font-medium">Phone Number</label>
                  <input 
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 0933333333"
                    className="w-full mt-1 px-3 py-1.5 bg-[#181b28] border border-[#262b3f] rounded-lg text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-400 font-medium">Role</label>
                  <select 
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 bg-[#181b28] border border-[#262b3f] rounded-lg text-white focus:outline-none"
                  >
                    <option value="pharmacist">pharmacist</option>
                    <option value="cashier">cashier</option>
                    <option value="manager">manager</option>
                    <option value="owner">owner</option>
                  </select>
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
                    disabled={saving}
                    className="px-4 py-1.5 bg-[#6366f1] hover:bg-indigo-500 text-white font-bold rounded-lg shadow-md"
                  >
                    {saving ? 'Saving...' : 'Add Person'}
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
