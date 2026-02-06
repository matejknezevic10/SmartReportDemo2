import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { Sparkles, Lock, User as UserIcon, ArrowRight, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { verifyPassword } from '../utils/security';

interface LoginProps {
  users: User[];
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ users, onLogin }) => {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const MAX_ATTEMPTS = 5;
  const isLocked = attempts >= MAX_ATTEMPTS;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (isLocked) {
      setError(`Zu viele Fehlversuche. Bitte warte 30 Sekunden.`);
      return;
    }
    
    if (!selectedUserId) {
      setError('Bitte wähle einen Mitarbeiter aus.');
      return;
    }
    if (!password) {
      setError('Bitte Passwort eingeben.');
      return;
    }

    setIsLoading(true);
    
    // Simulierter Netzwerk-Delay (in Produktion: echter API-Call)
    setTimeout(() => {
      const user = users.find(u => u.id === selectedUserId);
      
      if (user && verifyPassword(password, user.passwordHash)) {
        // Erfolgreicher Login
        setAttempts(0);
        onLogin(user);
      } else {
        // Fehlgeschlagen
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        
        if (newAttempts >= MAX_ATTEMPTS) {
          setError(`Zu viele Fehlversuche (${MAX_ATTEMPTS}). Account temporär gesperrt.`);
          // Auto-Unlock nach 30 Sekunden
          setTimeout(() => setAttempts(0), 30000);
        } else {
          setError(`Passwort nicht korrekt. Noch ${MAX_ATTEMPTS - newAttempts} Versuche.`);
        }
      }
      setIsLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md">
        {/* Logo & Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-4 bg-indigo-600 rounded-[2rem] text-white shadow-2xl shadow-indigo-200 mb-6">
            <Sparkles size={40} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">SmartReport</h1>
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em] mt-2">Business Edition | Login</p>
        </div>

        {/* Login Card */}
        <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100">
          <form onSubmit={handleLogin} className="space-y-6">
            {/* User Selection */}
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-2 tracking-widest">
                Mitarbeiter wählen
              </label>
              <div className="relative">
                <select 
                  className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl p-4 pl-12 font-bold text-slate-700 outline-none focus:border-indigo-600 appearance-none transition-all cursor-pointer disabled:opacity-50"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  disabled={isLocked || isLoading}
                >
                  <option value="">Wählen...</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role === UserRole.MANAGER ? 'Büro' : 'Außendienst'})
                    </option>
                  ))}
                </select>
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-2 tracking-widest">
                Passwort / PIN
              </label>
              <div className="relative">
                <input 
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl p-4 pl-12 pr-12 font-bold text-slate-700 outline-none focus:border-indigo-600 transition-all disabled:opacity-50"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLocked || isLoading}
                  autoComplete="current-password"
                />
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 text-red-500 bg-red-50 p-4 rounded-2xl animate-in fade-in slide-in-from-top-2">
                <AlertCircle size={18} className="shrink-0" />
                <span className="text-xs font-black uppercase tracking-wider">{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button 
              disabled={isLoading || isLocked}
              type="submit" 
              className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="animate-spin" size={24} />
              ) : isLocked ? (
                'Gesperrt'
              ) : (
                <>Anmelden <ArrowRight size={20} /></>
              )}
            </button>
          </form>

          {/* Demo Hint */}
          <div className="mt-6 p-4 bg-amber-50 rounded-2xl border border-amber-100">
            <p className="text-[10px] text-amber-700 font-bold uppercase tracking-widest text-center">
              Demo-Zugänge
            </p>
            <p className="text-xs text-amber-600 text-center mt-2">
              Zentrale: PIN <span className="font-mono font-bold">1234</span> | 
              Techniker: PIN <span className="font-mono font-bold">0000</span>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center mt-8 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
          Saneo Schadenservice GmbH &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
};

export default Login;
