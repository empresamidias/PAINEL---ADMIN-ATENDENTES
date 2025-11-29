import React, { useState } from 'react';
import { Mail, Lock, LayoutDashboard, Moon, Sun, AlertCircle } from 'lucide-react';

interface LoginProps {
  onLogin: (email: string, pass: string) => Promise<void>;
  isDark: boolean;
  toggleTheme: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin, isDark, toggleTheme }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await onLogin(email, password);
    } catch (err: any) {
      setError(err.message || 'Falha na autenticação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900 transition-colors duration-200 px-4">
      <div className="absolute top-6 right-6">
          <button 
            onClick={toggleTheme}
            className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
      </div>

      <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-200 dark:border-slate-700 animate-fade-in">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-blue-600 p-3 rounded-xl shadow-lg shadow-blue-500/30 mb-4">
            <LayoutDashboard className="text-white h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Painel Gestor</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Autenticação Supabase</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-600 dark:text-red-400 text-sm font-medium">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-slate-400" size={18} />
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@exemplo.com"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white placeholder-slate-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-slate-400" size={18} />
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white placeholder-slate-400"
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className={`
              w-full py-3 px-4 rounded-lg text-white font-bold text-sm uppercase tracking-wide
              bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition-all shadow-md
              ${loading ? 'opacity-70 cursor-wait' : ''}
            `}
          >
            {loading ? 'Autenticando...' : 'Acessar Sistema'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Conectado ao Supabase Authentication
          </p>
        </div>
      </div>
    </div>
  );
};