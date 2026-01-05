import React, { useState, useEffect } from 'react';
import { 
  User, Shield, Key, Settings, Database, Server, 
  Save, Bell, Lock, Globe, Mail, AlertTriangle, 
  Smartphone, Eye, Moon, Sun, Volume2, Wifi, 
  FileText, Activity, Layers, CheckCircle, XCircle, LogOut,
  Users, Plus, Trash2, Edit, UserPlus, RefreshCw
} from 'lucide-react';
import { getUsers, addUser, deleteUser } from '../services/db'; // <--- Import Logic DB

interface UserAccount {
  id: number;
  name: string;
  username: string; 
  role: 'super_admin' | 'manager';
  status: 'active' | 'suspended';
  lastLogin?: string;
}

interface SettingsProps {
  user?: { 
    id: string; 
    name: string; 
    role: string; 
    email: string; 
  };
}

const TABS = [
  { id: 'users', label: 'Pengurusan Pengguna', icon: Users },
  { id: 'account', label: 'Profil Saya', icon: User },
  { id: 'general', label: 'Umum', icon: Settings },
  { id: 'notifications', label: 'Notifikasi', icon: Bell },
  { id: 'system', label: 'Sistem & DB', icon: Database },
  { id: 'api', label: 'Integrasi API', icon: Globe },
];

const SuperSettings: React.FC<SettingsProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState('users');
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // --- STATE PENGURUSAN USER ---
  const [usersList, setUsersList] = useState<UserAccount[]>([]);

  // State Form Tambah User
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    username: '',
    password: '',
    role: 'manager'
  });

  // --- INIT DATA PADA MULA ---
  useEffect(() => {
    refreshUserList();
  }, []);

  const refreshUserList = () => {
    const data = getUsers();
    setUsersList(data);
  };

  // --- SETTINGS LAIN ---
  const [formData, setFormData] = useState({
    siteName: 'VMMS Enterprise',
    language: 'Bahasa Melayu',
    timezone: 'Asia/Kuala_Lumpur',
    emailNotif: true,
    pushNotif: true,
    smsNotif: false,
    autoBackup: true,
    maintenanceMode: false,
    apiKeyLHDN: 'IG50462506030-SECURE-KEY',
    paymentGateway: 'ipay88',
  });

  // --- LOGIC TAMBAH USER ---
  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name || !newUser.username || !newUser.password) {
        alert("Sila isi semua maklumat!");
        return;
    }

    // SIMPAN KE DB
    addUser({
        name: newUser.name,
        username: newUser.username,
        password: newUser.password,
        role: newUser.role,
        email: `${newUser.username}@vmms.local`,
        status: 'active'
    });

    refreshUserList(); // Update table
    setShowAddForm(false);
    setNewUser({ name: '', username: '', password: '', role: 'manager' });
    alert(`Pengguna ${newUser.username} berjaya ditambah dan DISIMPAN!`);
  };

  const handleDeleteUser = (id: number) => {
      if (confirm("Adakah anda pasti ingin memadam pengguna ini? Tindakan ini kekal.")) {
          const success = deleteUser(id);
          if (success) {
            refreshUserList();
            alert("Pengguna berjaya dipadam.");
          } else {
            alert("Tidak boleh memadam pengguna terakhir!");
          }
      }
  };

  const handleSave = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      alert('Tetapan berjaya disimpan!');
    }, 1500);
  };

  const handleToggle = (key: keyof typeof formData) => {
    setFormData(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] animate-in fade-in zoom-in duration-300 font-sans">
      
      {/* --- HEADER --- */}
      <div className="mb-6 pb-6 border-b border-slate-200 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-slate-800 flex items-center gap-3">
            <div className="p-2 bg-slate-800 text-white rounded-lg shadow-xl shadow-slate-300">
              <Settings size={28} />
            </div>
            Super Admin Panel
          </h2>
          <p className="text-slate-500 mt-2 font-medium">
            Pusat kawalan sistem, pangkalan data & pengurusan akaun pengguna.
          </p>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/30 flex items-center gap-2 transition-all active:scale-95"
          >
            {loading ? <Activity className="animate-spin" size={18}/> : <Save size={18} />}
            Simpan Perubahan
          </button>
        </div>
      </div>

      <div className="flex flex-1 gap-8 overflow-hidden">
        
        {/* --- SIDEBAR MENU TABS --- */}
        <div className="w-64 flex-shrink-0 flex flex-col gap-2 overflow-y-auto pr-2">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-md transform translate-x-1' 
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-white' : 'text-slate-400'} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* --- MAIN CONTENT AREA --- */}
        <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-y-auto p-8 custom-scrollbar relative">
          
          {/* TAB 1: PENGURUSAN PENGGUNA (FEATURE BARU) */}
          {activeTab === 'users' && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">Senarai Pengguna Berdaftar</h3>
                        <p className="text-sm text-slate-500">Urus akses staf ke dalam sistem (Data Kekal).</p>
                    </div>
                    <button 
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-emerald-700 transition-colors"
                    >
                        {showAddForm ? <XCircle size={18}/> : <UserPlus size={18}/>}
                        {showAddForm ? 'Batal' : 'Tambah Pengguna'}
                    </button>
                </div>

                {/* FORM TAMBAH USER */}
                {showAddForm && (
                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 shadow-inner mb-6 animate-in fade-in slide-in-from-top-2">
                        <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                            <Plus size={18} className="text-emerald-600"/> Maklumat Pengguna Baru
                        </h4>
                        <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Nama Penuh</label>
                                <input 
                                    type="text" required placeholder="Cth: Ahmad Albab"
                                    className="w-full p-2.5 mt-1 border border-slate-300 rounded-lg text-sm focus:border-blue-500 outline-none"
                                    value={newUser.name}
                                    onChange={e => setNewUser({...newUser, name: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Peranan (Role)</label>
                                <select 
                                    className="w-full p-2.5 mt-1 border border-slate-300 rounded-lg text-sm focus:border-blue-500 outline-none bg-white"
                                    value={newUser.role}
                                    onChange={e => setNewUser({...newUser, role: e.target.value})}
                                >
                                    <option value="manager">Manager (Operasi Sahaja)</option>
                                    <option value="super_admin">Super Admin (Akses Penuh)</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Username (Login ID)</label>
                                <input 
                                    type="text" required placeholder="Cth: ahmad123"
                                    className="w-full p-2.5 mt-1 border border-slate-300 rounded-lg text-sm focus:border-blue-500 outline-none"
                                    value={newUser.username}
                                    onChange={e => setNewUser({...newUser, username: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Kata Laluan</label>
                                <input 
                                    type="password" required placeholder="••••••••"
                                    className="w-full p-2.5 mt-1 border border-slate-300 rounded-lg text-sm focus:border-blue-500 outline-none"
                                    value={newUser.password}
                                    onChange={e => setNewUser({...newUser, password: e.target.value})}
                                />
                            </div>
                            <div className="md:col-span-2 pt-2">
                                <button type="submit" className="w-full bg-slate-900 text-white font-bold py-3 rounded-lg hover:bg-slate-800 transition-colors">
                                    Simpan Pengguna Ke Database
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* TABLE USER LIST */}
                <div className="overflow-hidden border border-slate-200 rounded-xl">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                            <tr>
                                <th className="px-6 py-4">Nama</th>
                                <th className="px-6 py-4">Username</th>
                                <th className="px-6 py-4">Role</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-center">Tindakan</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {usersList.length === 0 ? (
                                <tr><td colSpan={5} className="p-4 text-center">Tiada pengguna. Sila tambah baru.</td></tr>
                            ) : usersList.map((u) => (
                                <tr key={u.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 font-bold text-slate-700">{u.name}</td>
                                    <td className="px-6 py-4 font-mono text-xs text-slate-500 bg-slate-50 w-fit px-2 rounded border border-slate-200">{u.username}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${
                                            u.role === 'super_admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                                        }`}>
                                            {u.role.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="flex items-center gap-1 text-emerald-600 font-bold text-xs">
                                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div> Active
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex justify-center gap-2">
                                            <button className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Edit (Coming Soon)"><Edit size={16}/></button>
                                            <button 
                                                onClick={() => handleDeleteUser(u.id)}
                                                className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                                title="Padam User"
                                            >
                                                <Trash2 size={16}/>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
          )}

          {/* TAB 2: PROFIL SAYA */}
          {activeTab === 'account' && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-8 text-white relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 p-8 opacity-10"><User size={180} /></div>
                <div className="relative z-10 flex items-start gap-6">
                   <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center text-3xl font-bold shadow-lg border-4 border-slate-700">
                      {user?.name ? user.name.substring(0,1).toUpperCase() : 'U'}
                   </div>
                   <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h2 className="text-3xl font-bold">{user?.name || 'Guest User'}</h2>
                        <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded-full text-xs font-bold uppercase tracking-wider">
                           Active Session
                        </span>
                      </div>
                      <p className="text-slate-400 font-mono mb-4 flex items-center gap-2">
                        <Mail size={14}/> {user?.email || 'No Email'} 
                        <span className="w-1 h-1 bg-slate-600 rounded-full mx-2"></span>
                        <Key size={14}/> ID: {user?.id || 'N/A'}
                      </p>
                      <div className="flex gap-3 mt-6">
                         <div className="bg-white/10 px-4 py-2 rounded-lg backdrop-blur-sm border border-white/5">
                            <p className="text-[10px] text-slate-400 uppercase font-bold">Role Access</p>
                            <p className="font-bold text-white capitalize">{user?.role?.replace('_', ' ') || 'Viewer'}</p>
                         </div>
                      </div>
                   </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: GENERAL */}
          {activeTab === 'general' && (
             <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                <div>
                  <h3 className="text-xl font-bold text-slate-800 mb-1">Tetapan Umum</h3>
                  <p className="text-sm text-slate-500">Konfigurasi asas aplikasi.</p>
                </div>
                
                <div className="grid grid-cols-1 gap-6">
                   <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">Nama Sistem</label>
                      <input 
                        type="text" 
                        value={formData.siteName}
                        onChange={(e) => setFormData({...formData, siteName: e.target.value})}
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500" 
                      />
                   </div>
                   <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                          <label className="text-sm font-bold text-slate-700">Bahasa Utama</label>
                          <select className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none">
                             <option>Bahasa Melayu</option>
                             <option>English (US)</option>
                          </select>
                      </div>
                      <div className="space-y-2">
                          <label className="text-sm font-bold text-slate-700">Zon Masa</label>
                          <select className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none">
                             <option>Asia/Kuala_Lumpur (GMT+8)</option>
                             <option>UTC</option>
                          </select>
                      </div>
                   </div>
                </div>

                <div className="border-t border-slate-100 pt-6">
                   <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Eye size={18}/> Paparan</h4>
                   <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-3">
                         <div className="p-2 bg-white rounded-lg shadow-sm">{darkMode ? <Moon size={20}/> : <Sun size={20}/>}</div>
                         <div>
                            <p className="font-bold text-slate-700">Mod Gelap</p>
                            <p className="text-xs text-slate-500">Tukar tema antaramuka sistem.</p>
                         </div>
                      </div>
                      <button 
                        onClick={() => setDarkMode(!darkMode)}
                        className={`w-12 h-6 rounded-full p-1 transition-colors ${darkMode ? 'bg-blue-600' : 'bg-slate-300'}`}
                      >
                         <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${darkMode ? 'translate-x-6' : ''}`}></div>
                      </button>
                   </div>
                </div>
             </div>
          )}

          {/* TAB 4: NOTIFICATIONS */}
          {activeTab === 'notifications' && (
             <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                <div>
                  <h3 className="text-xl font-bold text-slate-800 mb-1">Pusat Notifikasi</h3>
                  <p className="text-sm text-slate-500">Urus cara sistem menghantar makluman.</p>
                </div>

                <div className="space-y-4">
                   <ToggleCard 
                      icon={Mail} title="Notifikasi Emel" 
                      desc="Hantar laporan harian dan amaran stok ke emel admin."
                      active={formData.emailNotif}
                      onToggle={() => handleToggle('emailNotif')}
                   />
                   <ToggleCard 
                      icon={Smartphone} title="Push Notification" 
                      desc="Hantar notifikasi terus ke aplikasi mobile manager."
                      active={formData.pushNotif}
                      onToggle={() => handleToggle('pushNotif')}
                   />
                   <ToggleCard 
                      icon={Volume2} title="SMS Alert (Kritikal)" 
                      desc="Hantar SMS jika mesin offline lebih 24 jam."
                      active={formData.smsNotif}
                      onToggle={() => handleToggle('smsNotif')}
                   />
                </div>
             </div>
          )}

          {/* TAB 5: SYSTEM & DB */}
          {activeTab === 'system' && (
             <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                <div>
                  <h3 className="text-xl font-bold text-slate-800 mb-1">Sistem & Pangkalan Data</h3>
                  <p className="text-sm text-slate-500">Tetapan teknikal dan penyelenggaraan.</p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                   <div className="p-6 border border-slate-200 rounded-xl bg-slate-50">
                      <div className="flex items-center gap-2 mb-4 text-blue-600 font-bold">
                         <Database size={20} /> Status Storan
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full mb-2">
                         <div className="bg-blue-500 h-2 rounded-full w-[45%]"></div>
                      </div>
                      <p className="text-xs text-slate-500 flex justify-between">
                         <span>Digunakan: 450 MB</span>
                         <span>Had: 1 GB</span>
                      </p>
                   </div>
                   <div className="p-6 border border-slate-200 rounded-xl bg-slate-50">
                      <div className="flex items-center gap-2 mb-4 text-emerald-600 font-bold">
                         <Activity size={20} /> Kesihatan Server
                      </div>
                      <p className="text-2xl font-black text-slate-800">99.9%</p>
                      <p className="text-xs text-slate-500">Uptime bulan ini</p>
                   </div>
                </div>

                <div className="space-y-4">
                    <ToggleCard 
                      icon={Server} title="Mode Penyelenggaraan" 
                      desc="Tutup akses kepada Manager semasa update sistem."
                      active={formData.maintenanceMode}
                      onToggle={() => handleToggle('maintenanceMode')}
                      danger
                   />
                   <ToggleCard 
                      icon={Save} title="Auto-Backup Database" 
                      desc="Lakukan backup setiap pukul 12:00 tengah malam."
                      active={formData.autoBackup}
                      onToggle={() => handleToggle('autoBackup')}
                   />
                </div>
             </div>
          )}

          {/* TAB 6: API INTEGRATION */}
          {activeTab === 'api' && (
             <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                <div>
                  <h3 className="text-xl font-bold text-slate-800 mb-1">Integrasi API</h3>
                  <p className="text-sm text-slate-500">Sambungan ke LHDN MyInvois & Payment Gateway.</p>
                </div>

                <div className="space-y-6">
                   <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="flex items-center justify-between mb-4">
                         <div className="flex items-center gap-2 font-bold text-slate-800">
                            <Globe size={20} className="text-blue-600" />
                            LHDN MyInvois Environment
                         </div>
                         <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">Connected</span>
                      </div>
                      <div className="space-y-3">
                         <div>
                            <label className="text-xs font-bold text-slate-400 uppercase">Client ID</label>
                            <input type="text" value="8392-ACBD-9281-XKLA" disabled className="w-full mt-1 p-2 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-500" />
                         </div>
                         <div>
                            <label className="text-xs font-bold text-slate-400 uppercase">Secret Key</label>
                            <input type="password" value={formData.apiKeyLHDN} readOnly className="w-full mt-1 p-2 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-500" />
                         </div>
                      </div>
                   </div>
                </div>
             </div>
          )}

        </div>
      </div>
    </div>
  );
};

// HELPER COMPONENT
const ToggleCard = ({ icon: Icon, title, desc, active, onToggle, danger = false }: any) => (
  <div className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${active ? 'bg-white border-blue-200 shadow-sm' : 'bg-slate-50 border-slate-100'}`}>
     <div className="flex items-center gap-4">
        <div className={`p-2 rounded-lg ${active ? (danger ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600') : 'bg-slate-200 text-slate-500'}`}>
           <Icon size={20} />
        </div>
        <div>
           <p className={`font-bold text-sm ${active ? 'text-slate-800' : 'text-slate-500'}`}>{title}</p>
           <p className="text-xs text-slate-400">{desc}</p>
        </div>
     </div>
     <button 
        onClick={onToggle}
        className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${active ? (danger ? 'bg-red-500' : 'bg-blue-600') : 'bg-slate-300'}`}
     >
        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${active ? 'translate-x-6' : ''}`}></div>
     </button>
  </div>
);

export default SuperSettings;