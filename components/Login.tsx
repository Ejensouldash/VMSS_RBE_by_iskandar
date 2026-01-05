import React, { useState } from 'react';
import { Lock, User, Monitor, ArrowRight, AlertCircle } from 'lucide-react';
import { authenticateUser } from '../services/db'; // <--- Import Logic DB

interface UserData {
  id: string;
  name: string;
  role: 'super_admin' | 'manager';
  email: string;
}

interface LoginProps {
  onLogin: (userData: UserData) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    setTimeout(() => {
      // GUNA FUNCTION DARI DB.TS
      const foundUser = authenticateUser(username, password);

      if (foundUser) {
        onLogin({
            id: `USR-${foundUser.id}`,
            name: foundUser.name,
            role: foundUser.role,
            email: foundUser.email || 'user@vmms.local'
        });
      } else {
        setError('Username atau Password salah! Sila cuba lagi.');
        setLoading(false);
      }
    }, 800);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      
      {/* BACKGROUND EFFECTS */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-blue-600/20 blur-[120px] rounded-full animate-pulse"></div>
        <div className="absolute -bottom-[20%] -right-[10%] w-[50%] h-[50%] bg-indigo-600/20 blur-[120px] rounded-full animate-pulse delay-700"></div>
      </div>

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative z-10 flex flex-col animate-in fade-in zoom-in duration-500">
        <div className="w-full p-8 md:p-10">
          
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 mx-auto mb-4 transform hover:rotate-12 transition-transform duration-500">
              <Monitor className="text-white" size={32} />
            </div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">VMMS<span className="text-blue-600">.Pro</span></h1>
            <p className="text-slate-400 text-sm mt-1 font-medium">Enterprise Vending Management</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm flex items-center gap-3 border border-red-100 animate-in slide-in-from-top-2 shadow-sm">
                <AlertCircle size={18} className="shrink-0" /> 
                <span className="font-medium">{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase ml-1 tracking-wider">Username ID</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors duration-300" />
                </div>
                <input
                  type="text" required placeholder="e.g. admin"
                  className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-700"
                  value={username} onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase ml-1 tracking-wider">Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors duration-300" />
                </div>
                <input
                  type="password" required placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-700"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-slate-900 hover:bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-slate-900/20 hover:shadow-blue-600/30 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 mt-2">
              {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : <>Sign In Securely <ArrowRight size={18} /></>}
            </button>
          </form>

          <div className="mt-8 text-center border-t border-slate-100 pt-6">
            <p className="text-xs text-slate-400 mb-2">Protected by VMMS Security System</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;