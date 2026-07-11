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

    const attemptLogin = async () => {
      try {
        const foundUser = await authenticateUser(username, password);
        if (foundUser) {
          onLogin({
              id: foundUser.id,
              name: foundUser.name,
              role: foundUser.role as any,
              email: foundUser.email
          });
        } else {
          setError('Username atau Password salah! Sila cuba lagi.');
          setLoading(false);
        }
      } catch (err) {
        setError('Ralat semasa menyambung ke server.');
        setLoading(false);
      }
    };

    // Delay slight for UI effect
    setTimeout(() => {
      attemptLogin();
    }, 500);
  };

  return (
    <div className="min-h-screen vm-app-bg vm-grid vm-scanlines flex items-center justify-center p-4 relative overflow-hidden font-sans">

      {/* BACKGROUND EFFECTS */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-indigo-600/20 blur-[120px] rounded-full animate-pulse"></div>
        <div className="absolute -bottom-[20%] -right-[10%] w-[50%] h-[50%] bg-cyan-600/20 blur-[120px] rounded-full animate-pulse delay-700"></div>
      </div>

      <div className="vm-glass vm-spin-border rounded-2xl w-full max-w-md overflow-hidden relative z-10 flex flex-col vm-rise">
        <div className="w-full p-8 md:p-10">

          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-cyan-500 rounded-2xl flex items-center justify-center vm-glow-indigo mx-auto mb-4 transform hover:rotate-12 transition-transform duration-500">
              <Monitor className="text-white" size={32} />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight font-display">VMMS<span className="text-cyan-400">.Pro</span></h1>
            <p className="text-slate-400 text-sm mt-1 font-medium flex items-center justify-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 vm-pulse" /> Secure Access Terminal
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-rose-500/10 text-rose-300 px-4 py-3 rounded-xl text-sm flex items-center gap-3 border border-rose-500/20 animate-in slide-in-from-top-2">
                <AlertCircle size={18} className="shrink-0" /> 
                <span className="font-medium">{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase ml-1 tracking-wider">Username ID</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-500 group-focus-within:text-cyan-400 transition-colors duration-300" />
                </div>
                <input
                  type="text" required placeholder="e.g. admin"
                  className="w-full pl-10 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400/50 transition-all font-medium text-white placeholder:text-slate-500"
                  value={username} onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase ml-1 tracking-wider">Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-500 group-focus-within:text-cyan-400 transition-colors duration-300" />
                </div>
                <input
                  type="password" required placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400/50 transition-all font-medium text-white placeholder:text-slate-500"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full vm-btn-primary text-white font-bold py-4 rounded-xl transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 mt-2">
              {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : <>Sign In Securely <ArrowRight size={18} /></>}
            </button>
          </form>

          <div className="mt-8 text-center border-t border-white/10 pt-6">
            <p className="text-xs text-slate-500 mb-2">Protected by VMMS Security System</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;