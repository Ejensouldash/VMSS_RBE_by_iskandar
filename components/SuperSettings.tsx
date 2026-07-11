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
      <div className="mb-6 pb-6 border-b border-white/10 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-white flex items-center gap-3">
            <div className="p-2 bg-slate-800 text-white rounded-lg shadow-xl shadow-slate-950/40 border border-slate-700">
              <Settings size={28} className="text-indigo-400" />
            </div>
            Super Admin Panel
          </h2>
          <p className="text-slate-400 mt-2 font-medium">
            Pusat kawalan sistem, pangkalan data & pengurusan akaun pengguna.
          </p>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-950/20 flex items-center gap-2 transition-all active:scale-95"
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
                    ? 'bg-gradient-to-r from-indigo-500 to-cyan-500 text-white shadow-lg shadow-cyan-500/20 transform translate-x-1' 
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-white' : 'text-slate-500'} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* --- MAIN CONTENT AREA --- */}
        <div className="flex-1 vm-glass bg-slate-900/60 rounded-2xl border border-slate-700/50 overflow-y-auto p-8 custom-scrollbar relative">
          
          {/* TAB 1: PENGURUSAN PENGGUNA */}
          {activeTab === 'users' && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-bold text-white">Senarai Pengguna Berdaftar</h3>
                        <p className="text-sm text-slate-400">Urus akses staf ke dalam sistem (Data Kekal).</p>
                    </div>
                    <button 
                        onClick={() => setShowAddForm(!showAddForm)}
                        className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors ${
                          showAddForm 
                            ? 'bg-rose-950/40 text-rose-400 border border-rose-900/30 hover:bg-rose-900/20' 
                            : 'bg-emerald-600 text-white hover:bg-emerald-700'
                        }`}
                    >
                        {showAddForm ? <XCircle size={18}/> : <UserPlus size={18}/>}
                        {showAddForm ? 'Batal' : 'Tambah Pengguna'}
                    </button>
                </div>

                {/* FORM TAMBAH USER */}
                {showAddForm && (
                    <div className="bg-slate-900/40 p-6 rounded-xl border border-slate-800/60 mb-6 animate-in fade-in slide-in-from-top-2">
                        <h4 className="font-bold text-slate-200 mb-4 flex items-center gap-2">
                            <Plus size={18} className="text-emerald-400"/> Maklumat Pengguna Baru
                        </h4>
                        <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase">Nama Penuh</label>
                                <input 
                                    type="text" required placeholder="Cth: Ahmad Albab"
                                    className="w-full p-2.5 mt-1 bg-slate-950/60 border border-slate-800 rounded-lg text-sm text-slate-200 focus:border-indigo-500 outline-none"
                                    value={newUser.name}
                                    onChange={e => setNewUser({...newUser, name: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase">Peranan (Role)</label>
                                <select 
                                    className="w-full p-2.5 mt-1 bg-slate-950/60 border border-slate-800 rounded-lg text-sm text-slate-200 focus:border-indigo-500 outline-none"
                                    value={newUser.role}
                                    onChange={e => setNewUser({...newUser, role: e.target.value})}
                                >
                                    <option value="manager" className="bg-slate-900">Manager (Operasi Sahaja)</option>
                                    <option value="super_admin" className="bg-slate-900">Super Admin (Akses Penuh)</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase">Username (Login ID)</label>
                                <input 
                                    type="text" required placeholder="Cth: ahmad123"
                                    className="w-full p-2.5 mt-1 bg-slate-950/60 border border-slate-800 rounded-lg text-sm text-slate-200 focus:border-indigo-500 outline-none"
                                    value={newUser.username}
                                    onChange={e => setNewUser({...newUser, username: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase">Kata Laluan</label>
                                <input 
                                    type="password" required placeholder="••••••••"
                                    className="w-full p-2.5 mt-1 bg-slate-950/60 border border-slate-800 rounded-lg text-sm text-slate-200 focus:border-indigo-500 outline-none"
                                    value={newUser.password}
                                    onChange={e => setNewUser({...newUser, password: e.target.value})}
                                />
                            </div>
                            <div className="md:col-span-2 pt-2">
                                <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 transition-colors">
                                    Simpan Pengguna Ke Database
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* TABLE USER LIST */}
                <div className="overflow-hidden border border-slate-800 rounded-xl">
                    <table className="w-full text-sm text-left text-slate-300">
                        <thead className="bg-slate-900/60 text-slate-200 font-bold uppercase text-xs border-b border-slate-800/60">
                            <tr>
                                <th className="px-6 py-4">Nama</th>
                                <th className="px-6 py-4">Username</th>
                                <th className="px-6 py-4">Role</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-center">Tindakan</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/40">
                            {usersList.length === 0 ? (
                                <tr><td colSpan={5} className="p-4 text-center text-slate-500">Tiada pengguna. Sila tambah baru.</td></tr>
                            ) : usersList.map((u) => (
                                <tr key={u.id} className="hover:bg-white/5 transition-colors border-b border-slate-800/40">
                                    <td className="px-6 py-4 font-bold text-slate-200">{u.name}</td>
                                    <td className="px-6 py-4">
                                        <span className="font-mono text-xs text-slate-300 bg-slate-950/40 px-2 py-0.5 rounded border border-slate-800/40">
                                            {u.username}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase border shadow-sm ${
                                            u.role === 'super_admin' 
                                              ? 'bg-purple-950/40 text-purple-400 border-purple-900/30' 
                                              : 'bg-indigo-950/40 text-indigo-400 border-indigo-900/30'
                                        }`}>
                                            {u.role.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="flex items-center gap-1 text-emerald-400 font-bold text-xs">
                                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div> Active
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex justify-center gap-2">
                                            <button className="p-1.5 text-indigo-400 hover:bg-indigo-500/10 rounded" title="Edit (Coming Soon)"><Edit size={16}/></button>
                                            <button 
                                                onClick={() => handleDeleteUser(u.id)}
                                                className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded"
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
              <div className="bg-gradient-to-br from-slate-950 to-slate-900 rounded-2xl p-8 text-white relative overflow-hidden shadow-2xl border border-slate-800/60">
                <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none"><User size={180} /></div>
                <div className="relative z-10 flex items-start gap-6">
                   <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center text-3xl font-bold shadow-lg border-4 border-slate-800">
                      {user?.name ? user.name.substring(0,1).toUpperCase() : 'U'}
                   </div>
                   <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h2 className="text-3xl font-bold text-white">{user?.name || 'Guest User'}</h2>
                        <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-xs font-bold uppercase tracking-wider">
                           Active Session
                        </span>
                      </div>
                      <p className="text-slate-400 font-mono mb-4 flex items-center gap-2">
                        <Mail size={14} className="text-slate-500"/> {user?.email || 'No Email'} 
                        <span className="w-1 h-1 bg-slate-700 rounded-full mx-2"></span>
                        <Key size={14} className="text-slate-500"/> ID: {user?.id || 'N/A'}
                      </p>
                      <div className="flex gap-3 mt-6">
                         <div className="bg-slate-900/60 px-4 py-2 rounded-lg backdrop-blur-sm border border-slate-800/40">
                            <p className="text-[10px] text-slate-500 uppercase font-bold">Role Access</p>
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
                  <h3 className="text-xl font-bold text-white mb-1">Tetapan Umum</h3>
                  <p className="text-sm text-slate-400">Konfigurasi asas aplikasi.</p>
                </div>
                
                <div className="grid grid-cols-1 gap-6">
                   <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-350">Nama Sistem</label>
                      <input 
                        type="text" 
                        value={formData.siteName}
                        onChange={(e) => setFormData({...formData, siteName: e.target.value})}
                        className="w-full p-3 bg-slate-900/60 border border-slate-700/50 rounded-xl text-sm text-slate-200 outline-none focus:border-indigo-500" 
                      />
                   </div>
                   <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                          <label className="text-sm font-bold text-slate-350">Bahasa Utama</label>
                          <select className="w-full p-3 bg-slate-900/60 border border-slate-700/50 rounded-xl text-sm text-slate-200 outline-none">
                             <option className="bg-slate-900">Bahasa Melayu</option>
                             <option className="bg-slate-900">English (US)</option>
                          </select>
                      </div>
                      <div className="space-y-2">
                          <label className="text-sm font-bold text-slate-350">Zon Masa</label>
                          <select className="w-full p-3 bg-slate-900/60 border border-slate-700/50 rounded-xl text-sm text-slate-200 outline-none">
                             <option className="bg-slate-900">Asia/Kuala_Lumpur (GMT+8)</option>
                             <option className="bg-slate-900">UTC</option>
                          </select>
                      </div>
                   </div>
                </div>

                <div className="border-t border-slate-800/60 pt-6">
                   <h4 className="font-bold text-white mb-4 flex items-center gap-2"><Eye size={18} className="text-indigo-400"/> Paparan</h4>
                   <div className="flex items-center justify-between p-4 bg-slate-900/40 rounded-xl border border-slate-800/40">
                      <div className="flex items-center gap-3">
                         <div className="p-2 bg-slate-950/60 rounded-lg border border-slate-800/40 text-slate-300">{darkMode ? <Moon size={20}/> : <Sun size={20}/>}</div>
                         <div>
                            <p className="font-bold text-slate-200">Mod Gelap</p>
                            <p className="text-xs text-slate-500">Tukar tema antaramuka sistem.</p>
                         </div>
                      </div>
                      <button 
                        onClick={() => setDarkMode(!darkMode)}
                        className={`w-12 h-6 rounded-full p-1 transition-colors ${darkMode ? 'bg-indigo-600' : 'bg-slate-700'}`}
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
                  <h3 className="text-xl font-bold text-white mb-1">Pusat Notifikasi</h3>
                  <p className="text-sm text-slate-400">Urus cara sistem menghantar makluman.</p>
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
                  <h3 className="text-xl font-bold text-white mb-1">Sistem & Pangkalan Data</h3>
                  <p className="text-sm text-slate-400">Tetapan teknikal dan penyelenggaraan.</p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                   <div className="p-6 border border-slate-800 rounded-xl bg-slate-900/40">
                      <div className="flex items-center gap-2 mb-4 text-indigo-400 font-bold">
                         <Database size={20} /> Status Storan
                      </div>
                      <div className="w-full bg-slate-950 h-2 rounded-full mb-2 border border-slate-800/40 overflow-hidden">
                         <div className="bg-indigo-500 h-2 rounded-full w-[45%]"></div>
                      </div>
                      <p className="text-xs text-slate-500 flex justify-between font-mono">
                         <span>Digunakan: 450 MB</span>
                         <span>Had: 1 GB</span>
                      </p>
                   </div>
                   <div className="p-6 border border-slate-800 rounded-xl bg-slate-900/40">
                      <div className="flex items-center gap-2 mb-4 text-emerald-400 font-bold">
                         <Activity size={20} /> Kesihatan Server
                      </div>
                      <p className="text-2xl font-black text-slate-100">99.9%</p>
                      <p className="text-xs text-slate-550">Uptime bulan ini</p>
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
                  <h3 className="text-xl font-bold text-white mb-1">Integrasi API</h3>
                  <p className="text-sm text-slate-400">Sambungan ke LHDN MyInvois & Payment Gateway.</p>
                </div>

                <div className="space-y-6">
                   <div className="p-6 bg-slate-900/40 border border-slate-800/60 rounded-xl">
                      <div className="flex items-center justify-between mb-4">
                         <div className="flex items-center gap-2 font-bold text-white">
                            <Globe size={20} className="text-indigo-400" />
                            LHDN MyInvois Environment
                         </div>
                         <span className="px-3 py-1 bg-emerald-950/40 text-emerald-400 text-xs font-bold rounded-full border border-emerald-900/30">Connected</span>
                      </div>
                      <div className="space-y-3">
                         <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Client ID</label>
                            <input type="text" value="8392-ACBD-9281-XKLA" disabled className="w-full mt-1 p-2 bg-slate-950/60 border border-slate-800 rounded-lg text-xs font-mono text-slate-450" />
                         </div>
                         <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Secret Key</label>
                            <input type="password" value={formData.apiKeyLHDN} readOnly className="w-full mt-1 p-2 bg-slate-950/60 border border-slate-800 rounded-lg text-xs font-mono text-slate-450" />
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
  <div className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${active ? 'bg-indigo-950/20 border-indigo-900/30' : 'bg-slate-900/40 border-slate-800/40'}`}>
     <div className="flex items-center gap-4">
        <div className={`p-2 rounded-lg ${active ? (danger ? 'bg-red-950/40 text-red-400 border border-red-900/30' : 'bg-indigo-950/40 text-indigo-400 border border-indigo-900/30') : 'bg-slate-900/60 text-slate-400 border border-slate-800/40'}`}>
           <Icon size={20} />
        </div>
        <div>
           <p className={`font-bold text-sm ${active ? 'text-slate-200' : 'text-slate-400'}`}>{title}</p>
           <p className="text-xs text-slate-500">{desc}</p>
        </div>
     </div>
     <button 
        onClick={onToggle}
        className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${active ? (danger ? 'bg-red-600' : 'bg-indigo-600') : 'bg-slate-700'}`}
     >
        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${active ? 'translate-x-6' : ''}`}></div>
     </button>
  </div>
);

export default SuperSettings;