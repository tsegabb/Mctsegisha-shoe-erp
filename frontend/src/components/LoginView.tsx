import { useState, FormEvent } from 'react';
import { motion } from 'motion/react';
import { Mail, Lock, LogIn, Eye, EyeOff, Activity } from 'lucide-react';
import { UserSession } from '../types.ts';
import { authService } from '../services/auth.service.ts';

interface LoginViewProps {
  onLoginSuccess: (session: UserSession) => void;
  triggerToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export default function LoginView({ onLoginSuccess, triggerToast }: LoginViewProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await authService.login({ email, password });

      if (data.success && data.data) {
        triggerToast(`Welcome back, ${data.data.user.name}!`, 'success');
        onLoginSuccess(data.data);
      } else {
        setError(data.error || 'Invalid credentials');
        triggerToast(data.error || 'Login failed', 'error');
      }
    } catch (err) {
      setError('Network error, please try again.');
      triggerToast('Unable to connect to login service', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main id="login-viewport" className="min-h-screen bg-[#0b0c10] text-slate-100 flex flex-col justify-center items-center p-6 relative overflow-hidden">
      
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-indigo-600/10 rounded-full filter blur-3xl pointer-events-none" />

      <motion.div 
        id="login-card-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-[#12141e] border border-[#1e2233] rounded-2xl p-8 shadow-2xl relative z-10"
      >
        {/* Header branding */}
        <header className="text-center mb-6">
          <div className="flex items-center justify-center space-x-2.5 mb-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Activity className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">SoleFlow</h1>
          </div>
          <p className="text-xs text-slate-400 font-medium">Shoe Stock ERP & Point of Sale</p>
        </header>

        {/* Form area */}
        <form id="login-form" onSubmit={handleSubmit} className="space-y-4 text-xs">
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-xl text-xs font-semibold">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="login-email-input" className="block text-slate-400 font-semibold mb-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input 
                id="login-email-input"
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@fidelpharma.com"
                className="w-full bg-[#181b28] border border-[#262b3f] rounded-xl py-2 pl-9 pr-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-medium"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label htmlFor="login-password-input" className="block text-slate-400 font-semibold mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input 
                id="login-password-input"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#181b28] border border-[#262b3f] rounded-xl py-2 pl-9 pr-10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-medium"
                disabled={loading}
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-2.5 text-slate-500 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-2.5 bg-[#6366f1] hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-md transition-colors cursor-pointer flex items-center justify-center space-x-2 mt-2"
          >
            <LogIn className="w-4 h-4" />
            <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
          </button>
        </form>

      </motion.div>
    </main>
  );
}
