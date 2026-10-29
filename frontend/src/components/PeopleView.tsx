import { useState, FormEvent } from 'react';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  Phone, 
  Mail, 
  Store, 
  CheckCircle2, 
  Search,
  MoreVertical,
  Plus,
  UserCheck
} from 'lucide-react';

interface PeopleViewProps {
  selectedBranch?: string;
  triggerToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export default function PeopleView({ selectedBranch = 'Main Branch', triggerToast }: PeopleViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Mock staff list matching multi-branch shoe store needs
  const [staffList, setStaffList] = useState([
    {
      id: '1',
      name: 'Abebe Bekele',
      email: 'abebe.b@soleflow.et',
      phone: '+251 91 123 4567',
      role: 'Store Manager',
      branch: 'Main Branch',
      status: 'Active',
      joinedDate: '2025-01-15'
    },
    {
      id: '2',
      name: 'Tigist Haile',
      email: 'tigist.h@soleflow.et',
      phone: '+251 92 987 6543',
      role: 'Head Cashier',
      branch: 'Bole Branch #1',
      status: 'Active',
      joinedDate: '2025-02-01'
    },
    {
      id: '3',
      name: 'Dawit Yohannes',
      email: 'dawit.y@soleflow.et',
      phone: '+251 93 456 7890',
      role: 'Inventory Specialist',
      branch: 'Kazanchis Outlet',
      status: 'Active',
      joinedDate: '2025-03-10'
    },
    {
      id: '4',
      name: 'Marta Tadesse',
      email: 'marta.t@soleflow.et',
      phone: '+251 94 321 0987',
      role: 'Sales Associate',
      branch: 'Piassa Store',
      status: 'Active',
      joinedDate: '2025-04-05'
    }
  ]);

  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState('Sales Associate');
  const [newBranch, setNewBranch] = useState(selectedBranch);

  const handleAddStaff = (e: FormEvent) => {
    e.preventDefault();
    if (!newName || !newEmail) {
      if (triggerToast) triggerToast('Name and email are required', 'error');
      return;
    }

    const newPerson = {
      id: String(Date.now()),
      name: newName,
      email: newEmail,
      phone: newPhone || '+251 91 000 0000',
      role: newRole,
      branch: newBranch,
      status: 'Active',
      joinedDate: new Date().toISOString().substring(0, 10)
    };

    setStaffList([newPerson, ...staffList]);
    setIsAddModalOpen(false);
    setNewName('');
    setNewEmail('');
    setNewPhone('');
    if (triggerToast) triggerToast(`Added ${newName} to staff roster!`, 'success');
  };

  const filteredStaff = staffList.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.phone.includes(searchTerm) ||
    s.branch.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* ACTION TOOLBAR */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] p-4 rounded-xl shadow-xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input 
            type="text"
            placeholder="Search staff by name, phone, email or branch..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-[#181b28] border border-slate-200 dark:border-[#262b3f] rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
          />
        </div>

        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl flex items-center space-x-2 transition-colors shadow-xs cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Staff Member</span>
        </button>
      </div>

      {/* STAFF CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStaff.map((staff) => (
          <div 
            key={staff.id} 
            className="bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] rounded-xl p-5 shadow-xs hover:border-indigo-300 dark:hover:border-indigo-900/50 transition-all space-y-4"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/50 text-indigo-600 dark:text-indigo-400 font-extrabold text-sm flex items-center justify-center">
                  {staff.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">{staff.name}</h3>
                  <span className="inline-block mt-0.5 px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 font-bold text-[10px] rounded-md border border-indigo-200 dark:border-indigo-900/30">
                    {staff.role}
                  </span>
                </div>
              </div>

              <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] rounded-full border border-emerald-200 dark:border-emerald-900/30 flex items-center space-x-1">
                <UserCheck className="w-3 h-3" />
                <span>{staff.status}</span>
              </span>
            </div>

            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400 font-medium pt-2 border-t border-slate-100 dark:border-[#1e2233]">
              <div className="flex items-center space-x-2">
                <Store className="w-3.5 h-3.5 text-slate-400" />
                <span>Branch: <strong className="text-slate-800 dark:text-slate-200">{staff.branch}</strong></span>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>{staff.phone}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span className="truncate">{staff.email}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ADD STAFF MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#12141e] border border-slate-200 dark:border-[#1e2233] rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-fade-in">
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">Add New Staff Member</h2>
            
            <form onSubmit={handleAddStaff} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">Full Name</label>
                <input 
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Samuel Alemu"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#181b28] border border-slate-200 dark:border-[#262b3f] rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">Email Address</label>
                <input 
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="samuel@soleflow.et"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#181b28] border border-slate-200 dark:border-[#262b3f] rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">Phone Number</label>
                <input 
                  type="text"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="+251 91 234 5678"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#181b28] border border-slate-200 dark:border-[#262b3f] rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">Assigned Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#181b28] border border-slate-200 dark:border-[#262b3f] rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none font-medium"
                >
                  <option value="Store Manager">Store Manager</option>
                  <option value="Head Cashier">Head Cashier</option>
                  <option value="Inventory Specialist">Inventory Specialist</option>
                  <option value="Sales Associate">Sales Associate</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">Branch</label>
                <input 
                  type="text"
                  value={newBranch}
                  onChange={(e) => setNewBranch(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#181b28] border border-slate-200 dark:border-[#262b3f] rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none font-medium"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-[#1e2233]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl cursor-pointer shadow-xs"
                >
                  Save Staff Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
